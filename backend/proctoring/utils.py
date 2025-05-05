from django.db import transaction
from django.utils import timezone
from django.db.models import Count, Q, F, Sum, Case, When, Value, IntegerField
from .models import ProctorAssignment, SwapRequest, ProctorConstraint, Exam, ExamRoom
from accounts.models import User, AuditLog, Section
from workload.models import TAWorkload, WorkloadActivity
import datetime
import logging

logger = logging.getLogger(__name__)


def check_ta_eligibility(ta_user, exam, original_assignment=None):
    """
    Check if a TA is eligible to proctor an exam based on constraints.
    
    Args:
        ta_user: The User object of the TA
        exam: The Exam object
        original_assignment: The original ProctorAssignment object (for swap context)
        
    Returns:
        tuple: (is_eligible, details_dict)
    """
    result = {
        'is_eligible': True,
        'constraints': [],
        'workload': {
            'current': 0,
            'after_swap': 0,
            'cap': 0  # This would be set based on department policy
        },
        'is_cross_department': False
    }
    
    # Check if TA is from a different department
    if ta_user.department != exam.section.course.department.code:
        result['is_cross_department'] = True
    
    # Check PhD requirement for graduate courses
    if (exam.section.course.code.startswith('5') or 
        exam.section.course.code.startswith('6') or 
        exam.section.course.code.startswith('7')):
        
        if ta_user.academic_level != 'PHD':
            result['constraints'].append({
                'type': 'PHD_REQUIRED',
                'message': f"PhD TA required for graduate course {exam.section.course.code}"
            })
            result['is_eligible'] = False
    
    # Check if TA is a student in the course
    student_constraint = ProctorConstraint.objects.filter(
        ta=ta_user,
        exam=exam,
        constraint_type='OWN_EXAM'
    ).first()
    
    if student_constraint:
        result['constraints'].append({
            'type': 'OWN_EXAM',
            'message': "TA is registered as a student in this course"
        })
        result['is_eligible'] = False
    
    # Check for leave on exam date
    leave_constraint = ProctorConstraint.objects.filter(
        ta=ta_user,
        constraint_date=exam.date,
        constraint_type='LEAVE_DAY'
    ).first()
    
    if leave_constraint:
        result['constraints'].append({
            'type': 'LEAVE_DAY',
            'message': f"TA has approved leave on {exam.date}"
        })
        result['is_eligible'] = False
    
    # Check for schedule conflicts
    conflict_constraint = ProctorConstraint.objects.filter(
        ta=ta_user,
        exam__date=exam.date,
        constraint_type='SCHEDULE_CONFLICT'
    ).filter(
        exam__start_time__lt=exam.end_time,
        exam__end_time__gt=exam.start_time
    ).first()
    
    if conflict_constraint:
        result['constraints'].append({
            'type': 'SCHEDULE_CONFLICT',
            'message': "TA has a scheduling conflict with another exam"
        })
        result['is_eligible'] = False
    
    # Calculate workload
    current_assignments = ProctorAssignment.objects.filter(
        proctor=ta_user,
        exam__date__gte=timezone.now().date()
    ).exclude(
        id=original_assignment.id if original_assignment else None
    )
    
    workload_minutes = sum(
        a.exam.duration_minutes for a in current_assignments
    )
    
    # Add the potential new assignment
    new_workload = workload_minutes + exam.duration_minutes
    
    # Check workload cap (example value - this should be configured per department)
    workload_cap = 600  # 10 hours in minutes
    
    result['workload']['current'] = workload_minutes
    result['workload']['after_swap'] = new_workload
    result['workload']['cap'] = workload_cap
    
    if new_workload > workload_cap:
        result['constraints'].append({
            'type': 'WORKLOAD_CAP',
            'message': f"Assignment would exceed workload cap of {workload_cap} minutes"
        })
        result['is_eligible'] = False
    
    return result['is_eligible'], result


def update_workload_for_swap(old_proctor, new_proctor, exam):
    """
    Update the workload records for both TAs when a swap occurs.
    
    Args:
        old_proctor: The User object of the original proctor
        new_proctor: The User object of the new proctor
        exam: The Exam object being proctored
    """
    exam_hours = exam.duration_minutes / 60.0
    current_term = "Fall 2023"  # This should be dynamically determined
    
    # Get or create workload records for both TAs
    try:
        old_workload = TAWorkload.objects.get(
            ta=old_proctor,
            academic_term=current_term,
            department=exam.section.course.department
        )
    except TAWorkload.DoesNotExist:
        # This is a fallback, but in a real system, workload records would be created
        # when TAs are first assigned to a department
        return
    
    try:
        new_workload = TAWorkload.objects.get(
            ta=new_proctor,
            academic_term=current_term,
            department=exam.section.course.department
        )
    except TAWorkload.DoesNotExist:
        # This is a fallback, but in a real system, workload records would be created
        # when TAs are first assigned to a department
        return
    
    # Create or update activity for the old proctor to remove the hours
    old_activity = WorkloadActivity.objects.filter(
        workload=old_workload,
        activity_type='PROCTORING',
        description=f"Proctoring: {exam.title}",
        start_date=exam.date
    ).first()
    
    if old_activity:
        old_activity.delete()
        old_workload.save()  # This triggers recalculation of total hours
    
    # Create new activity for the new proctor
    WorkloadActivity.objects.create(
        workload=new_workload,
        activity_type='PROCTORING',
        description=f"Proctoring: {exam.title}",
        hours=exam_hours,
        is_recurring=False,
        recurrence_pattern='ONCE',
        start_date=exam.date,
        end_date=exam.date,
        course_code=exam.section.course.code,
        section=exam.section.section_number
    )
    
    # The save method of WorkloadActivity updates the parent workload's totals


@transaction.atomic
def process_swap_request(swap_request):
    """
    Process a swap request by checking eligibility and executing the swap if eligible.
    
    Args:
        swap_request: The SwapRequest object to process
        
    Returns:
        dict: Result information including success status and details
    """
    result = {
        'success': False,
        'message': '',
        'swap_request': swap_request,
        'details': {}
    }
    
    # Acquire a SELECT FOR UPDATE lock on the assignment to prevent concurrent swaps
    try:
        original_assignment = ProctorAssignment.objects.select_for_update().get(
            id=swap_request.original_assignment.id
        )
    except ProctorAssignment.DoesNotExist:
        result['message'] = 'Assignment no longer exists'
        return result
    
    # Check if the assignment has been swapped already
    if original_assignment.proctor.id != swap_request.requesting_proctor.id:
        result['message'] = 'Assignment has already been swapped to another TA'
        return result
    
    # Check eligibility of the requested proctor
    is_eligible, details = check_ta_eligibility(
        swap_request.requested_proctor, 
        original_assignment.exam,
        original_assignment
    )
    
    # Store constraint check results
    swap_request.constraint_check_passed = is_eligible
    swap_request.constraint_check_details = details
    swap_request.is_cross_department = details.get('is_cross_department', False)
    
    if not is_eligible:
        swap_request.status = 'REJECTED'
        swap_request.rejection_reason = "Constraints check failed"
        swap_request.response_date = timezone.now()
        swap_request.save()
        
        result['message'] = 'Target TA does not meet eligibility requirements'
        result['details'] = details
        return result
    
    # Process the swap - store the previous TA
    previous_proctor = original_assignment.proctor
    new_proctor = swap_request.requested_proctor
    
    # Update workload for both TAs
    try:
        # Calculate the exam duration in hours
        exam_duration_hours = original_assignment.exam.duration_minutes / 60.0
        
        # Determine the academic term from the exam date
        exam_date = original_assignment.exam.date
        academic_term = f"{'Fall' if exam_date.month >= 9 else 'Spring'} {exam_date.year}"
        
        # Retrieve or create workload records for both TAs
        old_workload, _ = TAWorkload.objects.get_or_create(
            ta=previous_proctor,
            academic_term=academic_term,
            department=original_assignment.exam.section.course.department,
            defaults={
                'max_weekly_hours': 20 if previous_proctor.academic_level == 'PHD' else 15
            }
        )
        
        new_workload, _ = TAWorkload.objects.get_or_create(
            ta=new_proctor,
            academic_term=academic_term,
            department=original_assignment.exam.section.course.department,
            defaults={
                'max_weekly_hours': 20 if new_proctor.academic_level == 'PHD' else 15
            }
        )
        
        # Find and remove existing workload activity for the old proctor
        old_activities = WorkloadActivity.objects.filter(
            workload=old_workload,
            activity_type='PROCTORING',
            description__contains=f"{original_assignment.exam.title}"
        )
        for activity in old_activities:
            activity.delete()
        
        # Create new workload activity for the new proctor
        if exam_duration_hours > 0:
            WorkloadActivity.objects.create(
                workload=new_workload,
                activity_type='PROCTORING',
                description=f"Proctoring: {original_assignment.exam.title} (swapped in)",
                hours=exam_duration_hours,
                is_recurring=False,
                recurrence_pattern='ONCE',
                start_date=exam_date,
                end_date=exam_date,
                course_code=original_assignment.exam.section.course.code,
                section=original_assignment.exam.section.section_number
            )
        
        # Recalculate the workload totals
        old_workload.save()
        new_workload.save()
    except ImportError:
        # If workload module is not available, log this but continue with the swap
        print("Workload module not available - skipping workload adjustment")
    except Exception as e:
        # If there's any other error, log it but continue with the swap
        print(f"Error adjusting workload: {str(e)}")
    
    # Update the assignment
    original_assignment.previous_proctor = previous_proctor
    original_assignment.proctor = swap_request.requested_proctor
    original_assignment.swap_timestamp = timezone.now()
    original_assignment.swap_reason = swap_request.reason
    original_assignment.swap_by = previous_proctor
    original_assignment.swap_depth += 1
    original_assignment.status = 'ASSIGNED'  # Reset status to assigned
    original_assignment.save()
    
    # Update the swap request
    swap_request.status = 'AUTO_SWAP'
    swap_request.response_date = timezone.now()
    swap_request.save()
    
    # Log the swap
    action_type = 'swap_cross_dept_auto' if details.get('is_cross_department') else 'swap_auto'
    
    AuditLog.objects.create(
        user=previous_proctor,
        action=action_type,
        object_type='ProctorAssignment',
        object_id=original_assignment.id,
        description=f"Proctor assignment swapped from {previous_proctor.email} to {swap_request.requested_proctor.email}",
    )
    
    result['success'] = True
    result['message'] = 'Swap completed successfully'
    return result


def send_swap_notification_emails(swap_request, success=True):
    """
    Send email notifications about the swap to all relevant parties.
    
    Args:
        swap_request: The SwapRequest object
        success: Whether the swap was successful
    """
    if not success:
        # For unsuccessful swaps, just log the failure
        from logging import getLogger
        logger = getLogger(__name__)
        logger.info(
            f"Swap request {swap_request.id} failed: "
            f"from {swap_request.requesting_proctor.email} to {swap_request.requested_proctor.email}"
        )
        return
    
    # Import the email utility functions
    from .email_utils import (
        send_proctor_swap_confirmation_email,
        send_proctor_swap_notification_email,
        send_instructor_swap_notification_email
    )
    
    try:
        # Send confirmation to original proctor
        send_proctor_swap_confirmation_email(swap_request)
        
        # Send notification to new proctor
        send_proctor_swap_notification_email(swap_request)
        
        # Send notification to instructor
        send_instructor_swap_notification_email(swap_request)
        
    except Exception as e:
        # Log any email sending errors
        from logging import getLogger
        logger = getLogger(__name__)
        logger.error(
            f"Error sending swap notification emails for swap request {swap_request.id}: {str(e)}"
        )
        
        # In a production system, you might want to add the failed notifications
        # to a queue for retry later
        # record_failed_notification(swap_request.id, str(e)) 


def find_available_tas_for_exam(exam, required_count=None):
    """
    Find TAs that are available to proctor an exam based on constraints and priorities.
    
    Args:
        exam: The Exam object
        required_count: Number of proctors needed (defaults to exam.proctor_count_needed)
        
    Returns:
        tuple: (available_tas, constraints_relaxed, details)
    """
    if required_count is None:
        required_count = exam.proctor_count_needed
    
    # Get all TAs
    all_tas = User.objects.filter(role='TA').order_by('id')
    
    # Check eligibility for each TA
    eligible_tas = []
    ineligible_tas = []
    
    for ta in all_tas:
        is_eligible, details = check_ta_eligibility(ta, exam)
        
        if is_eligible:
            # Attach workload info to the TA object
            ta.workload_details = details.get('workload', {})
            ta.is_from_course = is_ta_from_course(ta, exam.section.course)
            ta.is_from_department = is_ta_from_department(ta, exam.section.course.department.code)
            ta.has_consecutive_exams = has_consecutive_exam_duties(ta, exam.date)
            eligible_tas.append(ta)
        else:
            # Store the constraint details with the TA
            ta.constraint_details = details
            ineligible_tas.append(ta)
    
    # Check if we have enough TAs
    constraints_relaxed = False
    details = {}
    
    if len(eligible_tas) < required_count:
        # Not enough TAs, try relaxing constraints
        details['initial_eligible_count'] = len(eligible_tas)
        
        # Try removing the consecutive days constraint
        consecutive_day_tas = [
            ta for ta in ineligible_tas 
            if any(c.get('type') == 'CONSECUTIVE_DAYS' for c in ta.constraint_details.get('constraints', []))
        ]
        
        if consecutive_day_tas:
            eligible_tas.extend(consecutive_day_tas)
            constraints_relaxed = True
            details['relaxed_consecutive_days'] = True
        
        # If still not enough, try relaxing PhD requirement for non-core graduate courses
        if len(eligible_tas) < required_count:
            phd_constraint_tas = [
                ta for ta in ineligible_tas 
                if any(c.get('type') == 'PHD_REQUIRED' for c in ta.constraint_details.get('constraints', []))
                and ta not in consecutive_day_tas
            ]
            
            if phd_constraint_tas and not exam.section.course.code.startswith('6'):  # Allow MS TAs for 5xx courses
                eligible_tas.extend(phd_constraint_tas)
                constraints_relaxed = True
                details['relaxed_phd_requirement'] = True
    
    # Sort TAs by priority
    sorted_tas = sort_tas_by_priority(eligible_tas, exam)
    
    # Take the required number
    selected_tas = sorted_tas[:required_count]
    
    # Check if we have enough TAs after all relaxations
    if len(selected_tas) < required_count:
        details['final_eligible_count'] = len(selected_tas)
        details['needs_cross_department'] = True
    
    return selected_tas, constraints_relaxed, details


def sort_tas_by_priority(eligible_tas, exam):
    """
    Sort TAs by priority for proctor assignment:
    1. TAs already attached to the course
    2. TAs from the same department
    3. TAs with no consecutive exams
    4. TAs with lowest workload
    
    Args:
        eligible_tas: List of eligible TA User objects
        exam: The Exam object
        
    Returns:
        list: Sorted list of TAs
    """
    # Calculate current workload for each TA and add as attribute
    for ta in eligible_tas:
        # Get workload if it was not already added
        if not hasattr(ta, 'workload_details'):
            ta.current_workload = get_ta_current_workload(ta)
        else:
            ta.current_workload = ta.workload_details.get('current', 0)
    
    # Sort TAs using all priority criteria
    # 1. First, TAs from the course
    # 2. Then, TAs from the same department
    # 3. Then, TAs without consecutive exams
    # 4. Finally, by lowest workload
    sorted_tas = sorted(
        eligible_tas,
        key=lambda ta: (
            not getattr(ta, 'is_from_course', False),  # Course TAs first
            not getattr(ta, 'is_from_department', False),  # Department TAs next
            getattr(ta, 'has_consecutive_exams', False),  # TAs without consecutive exams next
            getattr(ta, 'current_workload', 0)  # Lowest workload last
        )
    )
    
    return sorted_tas


def is_ta_from_course(ta, course):
    """Check if TA is assigned to the course."""
    # This would check if the TA is assigned to the specific course
    # For now, we'll use a simple approach
    return TAWorkload.objects.filter(
        ta=ta,
        activities__course_code=course.code
    ).exists()


def is_ta_from_department(ta, department_code):
    """Check if TA is from the specified department."""
    return ta.department == department_code


def get_ta_current_workload(ta):
    """Get the current UNPAID workload for a TA in minutes."""
    # Get all incomplete proctoring assignments
    assignments = ProctorAssignment.objects.filter(
        proctor=ta,
        status__in=['ASSIGNED', 'CONFIRMED'],
        exam__date__gte=timezone.now().date()
    )
    
    # Sum up the minutes
    total_minutes = sum(assignment.exam.duration_minutes for assignment in assignments)
    
    return total_minutes


def has_consecutive_exam_duties(ta, exam_date):
    """Check if TA has exam duties on days immediately before or after."""
    day_before = exam_date - datetime.timedelta(days=1)
    day_after = exam_date + datetime.timedelta(days=1)
    
    return ProctorAssignment.objects.filter(
        proctor=ta,
        exam__date__in=[day_before, day_after],
        status__in=['ASSIGNED', 'CONFIRMED']
    ).exists()


@transaction.atomic
def assign_proctors_to_exam(exam, manual_proctors=None, auto_assign=False, assigned_by=None):
    """
    Assign proctors to an exam using either manual, automatic, or hybrid mode.
    
    Args:
        exam: The Exam object
        manual_proctors: List of TA user IDs for manual assignment (can be None or partial)
        auto_assign: Whether to automatically assign remaining needed proctors
        assigned_by: User who is making the assignment
        
    Returns:
        tuple: (success, assigned_proctors, details)
    """
    if not assigned_by:
        raise ValueError("Assignment creator must be specified")
    
    # Determine how many proctors we need
    total_needed = exam.proctor_count_needed
    manual_count = len(manual_proctors) if manual_proctors else 0
    auto_count = total_needed - manual_count if auto_assign else 0
    
    # Validate that we have the right number of proctors
    if manual_count + auto_count != total_needed:
        return False, [], {
            'error': 'Invalid proctor count', 
            'manual': manual_count,
            'auto': auto_count,
            'needed': total_needed
        }
    
    assigned_proctors = []
    details = {
        'manual_assignments': [],
        'auto_assignments': [],
        'constraints_relaxed': False
    }
    
    # Assign manual proctors first
    if manual_proctors:
        for ta_id in manual_proctors:
            try:
                ta = User.objects.get(id=ta_id, role='TA')
                
                # Check constraints for manual assignments
                is_eligible, constraint_details = check_ta_eligibility(ta, exam)
                
                if not is_eligible:
                    # Record the constraint violation for manual assignment
                    details['manual_assignments'].append({
                        'ta_id': ta.id,
                        'ta_name': ta.full_name,
                        'status': 'rejected',
                        'constraints': constraint_details.get('constraints', [])
                    })
                    continue
                
                # Create the assignment
                assignment = ProctorAssignment.objects.create(
                    exam=exam,
                    proctor=ta,
                    status='ASSIGNED',
                    assigned_by=assigned_by
                )
                
                # Add to assigned list
                assigned_proctors.append(ta)
                
                # Record in details
                details['manual_assignments'].append({
                    'ta_id': ta.id,
                    'ta_name': ta.full_name,
                    'status': 'assigned',
                    'assignment_id': assignment.id
                })
                
                # Log the manual assignment
                AuditLog.objects.create(
                    user=assigned_by,
                    action='assign_proctor_manual',
                    object_type='ProctorAssignment',
                    object_id=assignment.id,
                    description=f"Manual proctor assignment: {ta.full_name} to {exam.title}"
                )
                
            except User.DoesNotExist:
                details['manual_assignments'].append({
                    'ta_id': ta_id,
                    'status': 'not_found',
                    'error': f'TA with ID {ta_id} not found'
                })
    
    # Automatic assignment for remaining slots
    if auto_assign and auto_count > 0:
        # Find available TAs
        available_tas, constraints_relaxed, auto_details = find_available_tas_for_exam(
            exam, 
            required_count=auto_count
        )
        
        # Update details
        details['auto_details'] = auto_details
        details['constraints_relaxed'] = constraints_relaxed
        
        if len(available_tas) < auto_count:
            # Not enough TAs, record the issue
            details['auto_assignments'].append({
                'status': 'insufficient_tas',
                'needed': auto_count,
                'available': len(available_tas),
                'cross_department_needed': True
            })
            
            # Mark exam as needing cross-department assistance
            exam.is_cross_department = True
            exam.dean_office_request = True
            exam.dean_office_comments = f"Automatic assignment failed: {auto_count} TAs needed, only {len(available_tas)} available."
            exam.save()
            
            # Log the insufficient TAs issue
            AuditLog.objects.create(
                user=assigned_by,
                action='insufficient_tas',
                object_type='Exam',
                object_id=exam.id,
                description=f"Insufficient TAs for {exam.title}: {auto_count} needed, {len(available_tas)} available"
            )
        else:
            # Assign the automatically selected TAs
            for ta in available_tas[:auto_count]:
                # Create the assignment
                assignment = ProctorAssignment.objects.create(
                    exam=exam,
                    proctor=ta,
                    status='ASSIGNED',
                    assigned_by=assigned_by,
                    override_flag=constraints_relaxed,
                    override_reason="Constraints relaxed due to insufficient TAs" if constraints_relaxed else ""
                )
                
                # Add to assigned list
                assigned_proctors.append(ta)
                
                # Record in details
                details['auto_assignments'].append({
                    'ta_id': ta.id,
                    'ta_name': ta.full_name,
                    'status': 'assigned',
                    'assignment_id': assignment.id,
                    'workload': getattr(ta, 'current_workload', 0),
                    'from_course': getattr(ta, 'is_from_course', False),
                    'from_department': getattr(ta, 'is_from_department', False),
                    'has_consecutive_exams': getattr(ta, 'has_consecutive_exams', False)
                })
                
                # Log the automatic assignment
                log_action = 'assign_proctor_auto'
                if constraints_relaxed:
                    log_action = 'assign_proctor_auto_relaxed'
                
                AuditLog.objects.create(
                    user=assigned_by,
                    action=log_action,
                    object_type='ProctorAssignment',
                    object_id=assignment.id,
                    description=f"Automatic proctor assignment: {ta.full_name} to {exam.title}"
                )
    
    # Update exam status if we assigned all needed proctors
    if len(assigned_proctors) == total_needed:
        exam.status = 'SCHEDULED'
        exam.save()
        
        # Log the scheduling
        AuditLog.objects.create(
            user=assigned_by,
            action='exam_scheduled',
            object_type='Exam',
            object_id=exam.id,
            description=f"Exam {exam.title} scheduled with {len(assigned_proctors)} proctors"
        )
        
        return True, assigned_proctors, details
    else:
        # Not all slots filled
        return False, assigned_proctors, details


def generate_seating_plan(exam, randomize=False):
    """
    Generate a seating plan from the uploaded student list.
    
    Args:
        exam: The Exam object
        randomize: Whether to randomize the seating (otherwise alphabetical)
        
    Returns:
        dict: Seating plan data with classroom allocations
    """
    # This would parse the uploaded Excel file and create a seating arrangement
    # For now, we'll return a placeholder
    import pandas as pd
    import random
    
    seating_plan = {
        'exam_id': exam.id,
        'exam_title': exam.title,
        'date': exam.date.strftime('%Y-%m-%d'),
        'start_time': exam.start_time.strftime('%H:%M'),
        'classrooms': []
    }
    
    # Check if student list file exists
    if not exam.student_list_file:
        return {
            'error': 'No student list file available',
            'exam_id': exam.id
        }
    
    try:
        # Read the Excel file
        df = pd.read_excel(exam.student_list_file.path)
        
        # Expected columns: student_id, first_name, last_name
        required_columns = ['student_id', 'first_name', 'last_name']
        
        # Verify required columns exist
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            return {
                'error': f'Missing required columns: {", ".join(missing_columns)}',
                'exam_id': exam.id
            }
        
        # Create student list
        students = df[required_columns].to_dict('records')
        
        # Randomize if requested
        if randomize:
            random.shuffle(students)
        else:
            # Sort alphabetically by last name, then first name
            students = sorted(students, key=lambda s: (s['last_name'], s['first_name']))
        
        # Get exam rooms
        exam_rooms = list(ExamRoom.objects.filter(exam=exam))
        
        # Distribute students among rooms
        students_per_room = len(students) // len(exam_rooms)
        extra_students = len(students) % len(exam_rooms)
        
        start_idx = 0
        
        for i, room in enumerate(exam_rooms):
            # Calculate how many students go in this room
            room_student_count = students_per_room + (1 if i < extra_students else 0)
            end_idx = start_idx + room_student_count
            
            # Assign students to this room
            room_students = students[start_idx:end_idx]
            start_idx = end_idx
            
            # Add to seating plan
            seating_plan['classrooms'].append({
                'room_id': room.id,
                'room_name': room.classroom.name,
                'capacity': room.classroom.capacity,
                'students': room_students,
                'proctor_count': room.proctor_count,
                'proctors': list(
                    ProctorAssignment.objects.filter(
                        exam=exam, 
                        exam_room=room
                    ).values('id', 'proctor__full_name')
                )
            })
        
        return seating_plan
        
    except Exception as e:
        logger.error(f"Error generating seating plan for exam {exam.id}: {str(e)}")
        return {
            'error': f'Error processing student list: {str(e)}',
            'exam_id': exam.id
        } 