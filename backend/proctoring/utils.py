from django.db import transaction
from django.utils import timezone
from .models import ProctorAssignment, SwapRequest, ProctorConstraint, Exam
from accounts.models import User, AuditLog
from workload.models import TAWorkload, WorkloadActivity
import datetime


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