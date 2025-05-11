from django.shortcuts import render, get_object_or_404
from django.db.models import Count, Q, F
from django.utils import timezone
from datetime import timedelta, datetime
from rest_framework import generics, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from accounts.models import User, Exam, Course, WeeklySchedule, TAAssignment
from accounts.permissions import IsStaffOrInstructor
from .models import ProctorAssignment
from .serializers import (
    ProctorAssignmentSerializer,
    EligibleProctorSerializer,
    ProctorAssignmentCreateSerializer
)

class ExamEligibleTAsView(APIView):
    """
    API endpoint to get all eligible TAs for an exam.
    """
    permission_classes = [permissions.IsAuthenticated, IsStaffOrInstructor]
    
    def get(self, request, pk=None):
        exam = get_object_or_404(Exam, pk=pk)
        exam_department_code = exam.course.department.code
        exam_course = exam.course

        # Get IDs of TAs currently assigned to THIS specific exam
        currently_assigned_ta_ids_for_this_exam = set(
            ProctorAssignment.objects.filter(exam=exam, status=ProctorAssignment.Status.ASSIGNED)
                                    .values_list('ta_id', flat=True)
        )

        # Phase 1: Get TAs ALREADY ASSIGNED to this exam. These should always be included in the initial list for consideration.
        # We fetch them without department constraints initially, as they are already linked.
        always_include_tas_queryset = User.objects.filter(id__in=list(currently_assigned_ta_ids_for_this_exam), role='TA', is_active=True)

        # Phase 2: Determine the pool for finding ADDITIONAL TAs based on exam status and department rules.
        department_codes_to_consider = set()
        if exam.status == Exam.Status.AWAITING_CROSS_DEPARTMENT_PROCTOR:
            assisting_department_codes = list(exam.assisting_departments.all().values_list('code', flat=True))
            department_codes_to_consider.update(assisting_department_codes)
            department_codes_to_consider.add(exam_department_code) # Also include exam's own department
        else:
            department_codes_to_consider.add(exam_department_code) # Default: only exam's own department

        # Build the pool for TAs who are NOT YET assigned to this exam.
        potential_additional_tas_queryset = User.objects.filter(
            role='TA',
            is_active=True,
            department__in=list(department_codes_to_consider)
        ).exclude(id__in=list(currently_assigned_ta_ids_for_this_exam)) # Exclude those already assigned

        # Get IDs of TAs teaching sections of this specific course (used for sorting/preference later)
        ta_ids_teaching_this_course = set(
            TAAssignment.objects.filter(section__course=exam_course)
                                .values_list('ta_id', flat=True)
        )
        
        # Convert exam datetimes to current (local) timezone
        # This assumes WeeklySchedule times are entered in the project's current timezone (settings.TIME_ZONE)
        # and USE_TZ is True, so exam.date is timezone-aware (likely UTC).
        exam_dt_start_utc = exam.date
        exam_dt_end_utc = exam.date + timedelta(minutes=exam.duration)

        # Use timezone.get_current_timezone() if you want to be dynamic based on activation,
        # or parse settings.TIME_ZONE for a fixed project timezone.
        # For simplicity, timezone.localtime() without a specific tz will use current active timezone if one is set,
        # or settings.TIME_ZONE if USE_TZ=True and no active timezone.
        exam_dt_start_local = timezone.localtime(exam_dt_start_utc)
        exam_dt_end_local = timezone.localtime(exam_dt_end_utc)
        
        # Determine exam day of week and time range from local times
        exam_day_of_week_num = exam_dt_start_local.weekday() # Monday is 0 and Sunday is 6
        day_mapping = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
        exam_day_short_code = day_mapping[exam_day_of_week_num]
        
        exam_start_time_local = exam_dt_start_local.time()
        exam_end_time_local = exam_dt_end_local.time()

        # Apply Fundamental Exclusions to the `potential_additional_tas_queryset`
        # Exclusion 1: TAs enrolled in the exam's course
        potential_additional_tas_queryset = potential_additional_tas_queryset.exclude(ta_profile__enrolled_courses=exam.course)

        # Exclusion 2: TAs with WeeklySchedule conflicts with THIS exam
        conflicting_schedule_ta_ids_set = set()
        if exam_dt_start_local.date() == exam_dt_end_local.date():
            qs = WeeklySchedule.objects.filter(
                day=exam_day_short_code,
                start_time__lt=exam_end_time_local,
                end_time__gt=exam_start_time_local
            )
            conflicting_schedule_ta_ids_set.update(qs.values_list('ta_id', flat=True))
        else:
            qs_part1 = WeeklySchedule.objects.filter(
                day=exam_day_short_code,
                start_time__lt=datetime.time(23, 59, 59, 999999),
                end_time__gt=exam_start_time_local
            )
            conflicting_schedule_ta_ids_set.update(qs_part1.values_list('ta_id', flat=True))
            exam_day_end_local_code = day_mapping[exam_dt_end_local.weekday()]
            exam_time_end_on_end_day = exam_dt_end_local.time()
            qs_part2 = WeeklySchedule.objects.filter(
                day=exam_day_end_local_code,
                start_time__lt=exam_time_end_on_end_day,
                end_time__gt=datetime.time(0, 0, 0)
            )
            conflicting_schedule_ta_ids_set.update(qs_part2.values_list('ta_id', flat=True))
        
        # Apply schedule conflict exclusion to the potential_additional_tas_queryset
        potential_additional_tas_queryset = potential_additional_tas_queryset.exclude(id__in=list(conflicting_schedule_ta_ids_set))

        # At this point, `always_include_tas_queryset` contains TAs already assigned (and active).
        # `potential_additional_tas_queryset` contains other TAs from relevant departments, with fundamental exclusions applied.
        # Now, apply stricter filters ONLY to `potential_additional_tas_queryset`.

        further_filterable_tas = potential_additional_tas_queryset # Rename for clarity in subsequent logic

        # Stricter Filter 1: Conflicting existing Proctoring Duties (One Day Before/After)
        # This filter applies ONLY to `further_filterable_tas`
        override_consecutive_proctoring_param = request.GET.get('override_consecutive_proctoring', 'false').lower() == 'true'
        ta_ids_with_conflicting_proctor_duties = set()

        potential_ids_for_consecutive_check = list(further_filterable_tas.values_list('id', flat=True))
        if potential_ids_for_consecutive_check:
            existing_proctor_assignments = ProctorAssignment.objects.filter(
                ta_id__in=potential_ids_for_consecutive_check,
                status=ProctorAssignment.Status.ASSIGNED
            ).exclude(exam=exam).select_related('exam')

            target_exam_date_local = exam_dt_start_local.date()
            day_before_target = target_exam_date_local - timedelta(days=1)
            day_after_target = target_exam_date_local + timedelta(days=1)

            for assignment in existing_proctor_assignments:
                assigned_exam = assignment.exam
                assigned_exam_start_utc = assigned_exam.date
                duration_minutes = assigned_exam.duration if assigned_exam.duration is not None else 0
                assigned_exam_end_utc = assigned_exam_start_utc + timedelta(minutes=duration_minutes)
                assigned_exam_start_local = timezone.localtime(assigned_exam_start_utc)
                assigned_exam_end_local = timezone.localtime(assigned_exam_end_utc)
                assigned_exam_date_local = assigned_exam_start_local.date()
                is_conflict = False

                if not override_consecutive_proctoring_param:
                    if assigned_exam_date_local == day_before_target:
                        is_conflict = True
                    elif assigned_exam_date_local == day_after_target:
                        is_conflict = True
                
                if not is_conflict and assigned_exam_date_local == target_exam_date_local: # Always check same-day overlap
                    if (assigned_exam_start_local < exam_dt_end_local and
                            assigned_exam_end_local > exam_dt_start_local):
                        is_conflict = True
                
                if is_conflict:
                    ta_ids_with_conflicting_proctor_duties.add(assignment.ta_id)
            
            if ta_ids_with_conflicting_proctor_duties:
                further_filterable_tas = further_filterable_tas.exclude(id__in=list(ta_ids_with_conflicting_proctor_duties))

        # Stricter Filter 2: Academic level based on the exam's course level
        # This filter also applies ONLY to `further_filterable_tas`
        exam_course_level = exam.course.level.upper()
        override_academic_level_param = request.GET.get('override_academic_level', 'false').lower() == 'true'

        if override_academic_level_param and exam_course_level == Course.CourseLevel.PHD.upper():
            further_filterable_tas = further_filterable_tas.filter(academic_level__in=[User.AcademicLevel.PHD, User.AcademicLevel.MASTERS])
        elif exam_course_level == Course.CourseLevel.UNDERGRADUATE.upper():
            further_filterable_tas = further_filterable_tas.filter(academic_level__in=[User.AcademicLevel.MASTERS, User.AcademicLevel.PHD])
        elif exam_course_level in [Course.CourseLevel.GRADUATE.upper(), Course.CourseLevel.PHD.upper()]:
            further_filterable_tas = further_filterable_tas.filter(academic_level=User.AcademicLevel.PHD)
        
        # Combine the `always_include_tas_queryset` with the fully filtered `further_filterable_tas`
        # Convert to lists of IDs then combine into a set to ensure uniqueness, then filter by ID list.
        final_ta_ids = set(always_include_tas_queryset.values_list('id', flat=True)) | set(further_filterable_tas.values_list('id', flat=True))
        tas = User.objects.filter(id__in=list(final_ta_ids))
        
        # Calculate current proctor workload for each TA in the final list
        tas = tas.annotate(
            current_workload=Count('proctoring_assignments', 
                                  filter=Q(proctoring_assignments__status__in=['ASSIGNED', 'COMPLETED']))
        ).order_by('current_workload')  # Order by workload (ascending)
        
        result = []
        # Prepare context for the serializer
        serializer_context = {
            'request': request,
            'exam': exam,
            'currently_assigned_ta_ids_for_this_exam': currently_assigned_ta_ids_for_this_exam,
            'exam_course': exam_course,
            'ta_ids_teaching_this_course': ta_ids_teaching_this_course
        }

        for ta in tas:
            # Initialize details (as it was before, can be refactored if details are also sourced from serializer)
            # For now, keeping this logic here as it was.
            # The serializer methods for is_eligible, is_assigned_to_current_exam, is_teaching_course_sections
            # will use the context. The direct field access like ta.current_workload remains.
            
            serializer = EligibleProctorSerializer(ta, context=serializer_context)
            data = serializer.data # This will now include is_teaching_course_sections
            
            # The original manual overrides/additions for is_eligible, details, current_workload,
            # and is_assigned_to_current_exam in the view can be removed if the serializer handles them fully
            # or if the serializer's output is directly used.
            # Given the serializer already defines methods for is_eligible and is_assigned_to_current_exam,
            # and fields for details and current_workload, we can simplify this loop.

            # Simpler approach: directly use serializer.data which should be complete
            # Ensure 'details' and 'current_workload' are correctly sourced by the serializer
            # For now, let's assume EligibleProctorSerializer is updated or correctly sources these.
            # The provided EligibleProctorSerializer already has fields for details and current_workload (read_only=True),
            # meaning they are expected to be on the 'ta' instance or annotated.
            # 'is_eligible' and 'is_assigned_to_current_exam' are SerializerMethodFields.
            
            # Current_workload is annotated on 'ta' object. Details seems to be static in the view.
            # Let's keep the manual addition of 'details' for now if it's not meant to come from the TA model directly.
            # The problem asks for sorting based on 'is_teaching_course_sections', which is now in serializer.data

            current_ta_details = { # This was the previous static detail structure
                'constraints': [], 
                'is_cross_department': False, 
                'workload': {
                    'current': ta.current_workload,
                }
            }
            data['details'] = current_ta_details # Override if serializer doesn't provide this structure or it's static.
            data['current_workload'] = ta.current_workload # Ensure this is from the annotation
            # 'is_eligible' and 'is_assigned_to_current_exam' and 'is_teaching_course_sections' come from serializer context methods.
            
            result.append(data)
        
        # The sorting in the view was:
        # result = sorted(result, key=lambda x: (not x['is_eligible'], x['current_workload']))
        # The frontend will now handle the primary sort by 'is_teaching_course_sections'.
        # The backend can still apply a default sort, e.g., by workload.
        # The .order_by('current_workload') on the 'tas' queryset already handles initial sorting.
        # The final sort in the view for 'is_eligible' might be redundant if all are eligible.
        # Let's rely on the queryset order and frontend sort for now.
        
        return Response(result)

class AssignProctorsToExamView(APIView):
    """
    API endpoint to assign proctors to an exam.
    """
    permission_classes = [permissions.IsAuthenticated, IsStaffOrInstructor]
    
    def post(self, request, pk=None):
        exam = get_object_or_404(Exam, pk=pk)
        
        serializer = ProctorAssignmentCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        validated_data = serializer.validated_data
        assignment_type = validated_data.get('assignment_type') # Currently only 'MANUAL' is handled
        manual_proctor_ids = validated_data.get('manual_proctors', [])
        replace_existing = validated_data.get('replace_existing', False)
        is_paid_assignment = validated_data.get('is_paid', False) # Get is_paid, default to False

        # Allow changes if AWAITING_PROCTORS, AWAITING_CROSS_DEPARTMENT_PROCTOR or READY.
        allowed_statuses_for_assignment = [
            Exam.Status.AWAITING_PROCTORS,
            Exam.Status.AWAITING_CROSS_DEPARTMENT_PROCTOR,
            Exam.Status.READY
        ]
        if exam.status not in allowed_statuses_for_assignment:
            return Response(
                {"error": f"Exam is currently '{exam.get_status_display()}'. Proctors can only be modified if status is 'Awaiting Proctors', 'Awaiting Cross-Department Proctor', or 'Ready'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if assignment_type == 'MANUAL':
            existing_assignments = ProctorAssignment.objects.filter(exam=exam, status=ProctorAssignment.Status.ASSIGNED)
            current_assigned_count = existing_assignments.count()

            if replace_existing:
                # If replacing, the number of new proctors cannot exceed the required count.
                if len(manual_proctor_ids) > exam.proctor_count:
                    return Response(
                        {"error": f"The number of selected proctors ({len(manual_proctor_ids)}) exceeds the required count ({exam.proctor_count}) for this exam."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                # Delete existing assignments before adding new ones
                existing_assignments.delete()
                current_assigned_count = 0 # Reset after deletion
            else:
                # If not replacing, check if exam already has enough proctors.
                if current_assigned_count >= exam.proctor_count:
                    return Response(
                        {"error": f"Exam already has {current_assigned_count}/{exam.proctor_count} proctors. No more can be assigned without replacing existing ones."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                # Check if adding these proctors would exceed the limit.
                if current_assigned_count + len(manual_proctor_ids) > exam.proctor_count:
                    return Response(
                        {"error": f"Assigning {len(manual_proctor_ids)} new proctor(s) would exceed the required {exam.proctor_count} proctors. Exam currently has {current_assigned_count}. Please select at most {exam.proctor_count - current_assigned_count} more."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                if not manual_proctor_ids: # No new TAs selected to add
                     return Response({"error": "No new proctors selected to assign."}, status=status.HTTP_400_BAD_REQUEST)

            # Proceed with creating assignments
            assigned_tas_in_this_operation = []
            successfully_created_count = 0

            for ta_id in manual_proctor_ids:
                try:
                    ta_user = User.objects.get(id=ta_id, role='TA')
                    # If not replacing, ensure TA is not already assigned (get_or_create handles this by not creating)
                    # If replacing, all existing were deleted, so create will always make a new one here.
                    assignment, created = ProctorAssignment.objects.get_or_create(
                        exam=exam,
                        ta=ta_user,
                        defaults={
                            'assigned_by': request.user,
                            'status': ProctorAssignment.Status.ASSIGNED,
                            'is_paid': is_paid_assignment # Set is_paid status
                        }
                    )
                    if created:
                        successfully_created_count += 1
                        assigned_tas_in_this_operation.append(assignment)
                    elif replace_existing:
                        # If it wasn't "created" but we are replacing, it means an old record with same exam+ta existed.
                        # We should ensure its is_paid status is updated to the current request's value.
                        if assignment.is_paid != is_paid_assignment:
                            assignment.is_paid = is_paid_assignment
                            assignment.save(update_fields=['is_paid'])
                        successfully_created_count += 1 # Count it as part of this operation
                        assigned_tas_in_this_operation.append(assignment)
                    # If not created and not replacing, it means it was already there, skip.
                    # If we wanted to update is_paid for existing (non-replaced) assignments, 
                    # that would be a different logic branch, typically not done via get_or_create.

                except User.DoesNotExist:
                    # Log this or add to a list of errors if partial success is allowed
                    # For now, we'll let it skip and the final count will reflect reality
                    pass 
            
            # Recalculate final assigned count from DB for accuracy
            final_assigned_proctor_count = ProctorAssignment.objects.filter(exam=exam, status=ProctorAssignment.Status.ASSIGNED).count()

            # Update exam status based on the final count of assigned proctors
            if final_assigned_proctor_count >= exam.proctor_count and exam.proctor_count > 0:
                exam.status = Exam.Status.READY
            elif exam.proctor_count == 0: # If 0 proctors are needed, it's always ready.
                exam.status = Exam.Status.READY
            else:
                exam.status = Exam.Status.AWAITING_PROCTORS
            exam.save(update_fields=['status'])
            
            # Fetch all current assignments for the response
            all_current_assignments = ProctorAssignment.objects.filter(exam=exam)

            return Response({
                "message": f"Proctor assignments processed. Exam has {final_assigned_proctor_count}/{exam.proctor_count} proctors. Status: {exam.get_status_display()}",
                "assignments": ProctorAssignmentSerializer(all_current_assignments, many=True).data
            }, status=status.HTTP_200_OK)
        
        else:  # AUTO assignment (Not implemented)
            return Response(
                {"error": "Automatic assignment is not yet implemented"},
                status=status.HTTP_501_NOT_IMPLEMENTED
            )

class MyProctoringsView(APIView):
    """
    API endpoint for TAs to view their own proctoring assignments.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        # Check if the user is a TA
        if request.user.role != 'TA':
            return Response(
                {"error": "Only TAs can access their proctoring assignments"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get the TA's proctor assignments
        assignments = ProctorAssignment.objects.filter(
            ta=request.user
        ).select_related(
            'exam', 
            'exam__course', 
            'exam__classroom',
            'assigned_by'
        )
        
        # Serialize and return the data
        serializer = ProctorAssignmentSerializer(assignments, many=True)
        return Response(serializer.data)

class ConfirmAssignmentView(APIView):
    """
    API endpoint for TAs to confirm their proctoring assignments.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        # Check if the user is a TA
        if request.user.role != 'TA':
            return Response(
                {"error": "Only TAs can confirm their proctoring assignments"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            # Get the assignment
            assignment = ProctorAssignment.objects.get(id=pk, ta=request.user)
            
            # Check if the assignment is in ASSIGNED status
            if assignment.status != ProctorAssignment.Status.ASSIGNED:
                return Response(
                    {"error": "Only assignments with 'Assigned' status can be confirmed"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Update the assignment status to CONFIRMED
            assignment.status = ProctorAssignment.Status.CONFIRMED
            assignment.save()
            
            # Return the updated assignment
            serializer = ProctorAssignmentSerializer(assignment)
            return Response(serializer.data)
            
        except ProctorAssignment.DoesNotExist:
            return Response(
                {"error": "Assignment not found or you don't have permission to confirm it"},
                status=status.HTTP_404_NOT_FOUND
            )

class RejectAssignmentView(APIView):
    """
    API endpoint for TAs to reject (delete) their proctoring assignments.
    """
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk=None):
        # Ensure the user is a TA
        if request.user.role != 'TA':
            return Response(
                {"error": "Only TAs can reject assignments."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get the specific assignment, ensuring it belongs to the requesting TA
        assignment = get_object_or_404(ProctorAssignment, pk=pk, ta=request.user)
        exam = assignment.exam # Get the associated exam before deleting the assignment
        
        # Optional: Check if the assignment can be rejected based on its current status
        # For example, only allow rejection if status is 'ASSIGNED'
        if assignment.status != ProctorAssignment.Status.ASSIGNED:
            return Response(
                {"error": f"Assignment in status '{assignment.get_status_display()}' cannot be rejected."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        assignment.delete()

        # After deletion, re-evaluate the exam status
        remaining_assignments_count = ProctorAssignment.objects.filter(exam=exam, status=ProctorAssignment.Status.ASSIGNED).count()
        
        if exam.proctor_count == 0: # If 0 proctors are needed, it's always ready.
            exam.status = Exam.Status.READY
        elif remaining_assignments_count >= exam.proctor_count:
            exam.status = Exam.Status.READY
        else:
            exam.status = Exam.Status.AWAITING_PROCTORS
        exam.save(update_fields=['status'])
        
        return Response(status=status.HTTP_204_NO_CONTENT)

# Register this in your urls.py:
# path('exams/<int:pk>/eligible-tas/', ExamEligibleTAsView.as_view(), name='exam-eligible-tas'),
# path('exams/<int:pk>/assign-proctors/', AssignProctorsToExamView.as_view(), name='assign-proctors-to-exam'),
