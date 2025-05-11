from django.shortcuts import render, get_object_or_404
from django.db.models import Count, Q, F
from django.utils import timezone
from datetime import timedelta, datetime
from rest_framework import generics, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from accounts.models import User, Exam, Course, WeeklySchedule, TAAssignment
from accounts.permissions import IsStaffOrInstructor
from .models import ProctorAssignment, SwapRequest
from .serializers import (
    ProctorAssignmentSerializer,
    EligibleProctorSerializer,
    ProctorAssignmentCreateSerializer,
    SwapRequestCreateSerializer,
    SwapRequestMatchSerializer,
    SwapRequestDetailSerializer,
    SwapRequestApproveSerializer
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

        if exam_course_level == Course.CourseLevel.UNDERGRADUATE.upper():
            # For UNDERGRADUATE courses, MASTERS and PHD TAs are always eligible
            further_filterable_tas = further_filterable_tas.filter(
                academic_level__in=[User.AcademicLevel.MASTERS, User.AcademicLevel.PHD]
            )
        elif exam_course_level in [Course.CourseLevel.GRADUATE.upper(), Course.CourseLevel.PHD.upper()]:
            if override_academic_level_param:
                # For GRADUATE or PHD courses with override, MASTERS and PHD TAs are eligible
                further_filterable_tas = further_filterable_tas.filter(
                    academic_level__in=[User.AcademicLevel.MASTERS, User.AcademicLevel.PHD]
                )
            else:
                # Default for GRADUATE or PHD courses (no override): only PHD TAs
                further_filterable_tas = further_filterable_tas.filter(
                    academic_level=User.AcademicLevel.PHD
                )
        
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
        
        elif assignment_type == 'AUTOMATIC':
            # Automatic assignment using the proctor_ids from the validated data
            proctor_ids = validated_data.get('proctor_ids', [])
            if not proctor_ids:
                return Response({"error": "No proctors selected for automatic assignment."}, status=status.HTTP_400_BAD_REQUEST)
            
            existing_assignments = ProctorAssignment.objects.filter(exam=exam, status=ProctorAssignment.Status.ASSIGNED)
            current_assigned_count = existing_assignments.count()

            if replace_existing:
                # If replacing, the number of new proctors cannot exceed the required count.
                if len(proctor_ids) > exam.proctor_count:
                    return Response(
                        {"error": f"The number of selected proctors ({len(proctor_ids)}) exceeds the required count ({exam.proctor_count}) for this exam."},
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
                if current_assigned_count + len(proctor_ids) > exam.proctor_count:
                    return Response(
                        {"error": f"Assigning {len(proctor_ids)} new proctor(s) would exceed the required {exam.proctor_count} proctors. Exam currently has {current_assigned_count}. Please select at most {exam.proctor_count - current_assigned_count} more."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                if not proctor_ids: # No new TAs selected to add
                     return Response({"error": "No new proctors selected to assign."}, status=status.HTTP_400_BAD_REQUEST)

            # Proceed with creating assignments
            assigned_tas_in_this_operation = []
            successfully_created_count = 0

            for ta_id in proctor_ids:
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
                "message": f"Proctor assignments auto-processed. Exam has {final_assigned_proctor_count}/{exam.proctor_count} proctors. Status: {exam.get_status_display()}",
                "assignments": ProctorAssignmentSerializer(all_current_assignments, many=True).data
            }, status=status.HTTP_200_OK)
        
        else:
            return Response({"error": f"Unsupported assignment type: {assignment_type}"}, status=status.HTTP_400_BAD_REQUEST)

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
        
        try:
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
        except Exception as e:
            import traceback
            print(f"Error in MyProctoringsView.get: {str(e)}")
            print(traceback.format_exc())
            return Response(
                {"error": f"An error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

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

class SwapRequestsView(APIView):
    """
    API endpoint for listing and creating swap requests.
    GET: List swap requests relevant to the current user
    POST: Create a new swap request
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get swap requests relevant to the current user based on their role."""
        user = request.user
        
        try:
            if user.role == 'TA':
                # TAs see requests from their department
                # Include their own requests and pending requests from other TAs in their department
                
                # Instead of using department directly in the filter, we'll use a simpler approach
                # Just get requests that are mine, that match me, or that are pending
                ta_swap_requests = SwapRequest.objects.filter(
                    Q(requesting_proctor=user) |  # Their own requests (any status)
                    Q(matched_proctor=user)    |  # Requests they've been matched with
                    Q(status='PENDING')           # All pending requests (to be filtered further)
                ).select_related(
                    'original_assignment',
                    'original_assignment__exam',
                    'original_assignment__exam__course',
                    'original_assignment__exam__course__department',
                    'matched_assignment',
                    'requesting_proctor',
                    'matched_proctor'
                ).distinct()
                
                # For pending requests, filter to only include those from the same department
                # This is safer than trying to filter in the database query
                user_department = user.department
                if isinstance(user_department, str):
                    # Filter in Python instead of in the database query
                    swap_requests = [
                        sr for sr in ta_swap_requests if 
                        sr.requesting_proctor == user or 
                        sr.matched_proctor == user or 
                        (sr.status == 'PENDING' and 
                         hasattr(sr.original_assignment.exam.course, 'department') and
                         (
                             # Compare with department code string
                             (hasattr(sr.original_assignment.exam.course.department, 'code') and
                              sr.original_assignment.exam.course.department.code == user_department) or
                             # Or directly compare if departments are already strings
                             (isinstance(sr.original_assignment.exam.course.department, str) and
                              sr.original_assignment.exam.course.department == user_department)
                         )
                        )
                    ]
                else:
                    # Filter in Python for safety
                    swap_requests = [
                        sr for sr in ta_swap_requests if 
                        sr.requesting_proctor == user or 
                        sr.matched_proctor == user or 
                        (sr.status == 'PENDING' and 
                         hasattr(sr.original_assignment.exam.course, 'department') and
                         sr.original_assignment.exam.course.department == user_department)
                    ]
            
            elif user.role == 'STAFF':
                # Staff see requests from their department
                user_department = user.department
                
                # Get all requests, then filter by department 
                all_requests = SwapRequest.objects.all().select_related(
                    'original_assignment',
                    'original_assignment__exam',
                    'original_assignment__exam__course',
                    'original_assignment__exam__course__department',
                    'matched_assignment',
                    'requesting_proctor',
                    'matched_proctor'
                )
                
                # Filter requests that belong to the staff's department
                if isinstance(user_department, str):
                    swap_requests = [
                        sr for sr in all_requests if 
                        hasattr(sr.original_assignment.exam.course, 'department') and
                        (
                            # Compare with department code string
                            (hasattr(sr.original_assignment.exam.course.department, 'code') and
                             sr.original_assignment.exam.course.department.code == user_department) or
                            # Or directly compare if departments are already strings
                            (isinstance(sr.original_assignment.exam.course.department, str) and
                             sr.original_assignment.exam.course.department == user_department)
                        )
                    ]
                else:
                    swap_requests = [
                        sr for sr in all_requests if 
                        hasattr(sr.original_assignment.exam.course, 'department') and
                        sr.original_assignment.exam.course.department == user_department
                    ]
            
            elif user.role == 'ADMIN':
                # Admin see all requests
                swap_requests = SwapRequest.objects.all().select_related(
                    'original_assignment',
                    'original_assignment__exam',
                    'original_assignment__exam__course',
                    'matched_assignment',
                    'requesting_proctor',
                    'matched_proctor'
                )
            
            else:
                # Unauthorized role (including INSTRUCTOR who no longer can approve)
                return Response(
                    {"error": "You do not have permission to view swap requests."},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            serializer = SwapRequestDetailSerializer(swap_requests, many=True)
            return Response(serializer.data)
        except Exception as e:
            import traceback
            print(f"Error in SwapRequestsView.get: {str(e)}")
            print(traceback.format_exc())
            return Response(
                {"error": f"An error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def post(self, request):
        """Create a new swap request."""
        print(f"POST request to create swap request. Raw Data: {request.data}")
        print(f"Content-Type: {request.content_type}")
        print(f"User: {request.user.id} - {request.user.email}")
        
        # Print all request headers for debugging
        print("Headers:")
        for key, value in request.META.items():
            if key.startswith('HTTP_'):
                print(f"  {key}: {value}")
        
        if request.user.role != 'TA':
            return Response(
                {"error": "Only TAs can create swap requests."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = SwapRequestCreateSerializer(
            data=request.data, 
            context={'request': request}
        )
        
        print(f"Serializer initial data: {serializer.initial_data}")
        
        if serializer.is_valid():
            print("Serializer is valid, saving...")
            swap_request = serializer.save()
            response_serializer = SwapRequestDetailSerializer(swap_request)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        
        print(f"Serializer errors: {serializer.errors}")
        # Enhance error response by returning both 'detail' and the specific validation errors
        error_detail = {"detail": "Invalid request data", "errors": serializer.errors}
        return Response(error_detail, status=status.HTTP_400_BAD_REQUEST)

class SwapRequestDetailView(APIView):
    """
    API endpoint for retrieving, updating, or deleting a specific swap request.
    GET: Retrieve details of a swap request
    DELETE: Cancel a swap request (if it's the requester)
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self, pk):
        """Get the swap request object with proper permissions checking."""
        swap_request = get_object_or_404(SwapRequest, pk=pk)
        user = self.request.user
        
        # Check permissions based on role
        if user.role == 'TA':
            # TAs can only access their own requests or pending requests from their department
            if not (
                swap_request.requesting_proctor == user or 
                (swap_request.status == 'PENDING' and 
                 swap_request.original_assignment.exam.course.department == user.department) or
                swap_request.matched_proctor == user
            ):
                self.permission_denied(self.request)
        
        elif user.role == 'STAFF':
            # Staff can only access requests for their department
            user_department = user.department
            request_department = None
            
            # Get department of the swap request
            if hasattr(swap_request, 'original_assignment') and swap_request.original_assignment:
                if hasattr(swap_request.original_assignment, 'exam') and swap_request.original_assignment.exam:
                    if hasattr(swap_request.original_assignment.exam, 'course') and swap_request.original_assignment.exam.course:
                        if hasattr(swap_request.original_assignment.exam.course, 'department'):
                            request_department = swap_request.original_assignment.exam.course.department
                            if hasattr(request_department, 'code'):
                                request_department = request_department.code
            
            # Check if staff is from the same department
            if not (
                (isinstance(user_department, str) and isinstance(request_department, str) and user_department == request_department) or
                (not isinstance(user_department, str) and not isinstance(request_department, str) and user_department == request_department)
            ):
                self.permission_denied(self.request)
        
        # Admins have full access, no additional checks needed
        elif user.role != 'ADMIN':
            # Any other roles don't have access
            self.permission_denied(self.request)
        
        return swap_request
    
    def get(self, request, pk):
        """Get details of a specific swap request."""
        swap_request = self.get_object(pk)
        serializer = SwapRequestDetailSerializer(swap_request)
        return Response(serializer.data)
    
    def delete(self, request, pk):
        """Cancel a swap request. Only the requester can cancel their own pending requests."""
        swap_request = self.get_object(pk)
        
        # Only the requester can cancel
        if request.user != swap_request.requesting_proctor:
            return Response(
                {"error": "You can only cancel your own swap requests."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Only pending requests can be cancelled
        if swap_request.status != 'PENDING':
            return Response(
                {"error": f"Cannot cancel a swap request with status '{swap_request.get_status_display()}'."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        swap_request.status = 'CANCELLED'
        swap_request.save()
        
        return Response(status=status.HTTP_204_NO_CONTENT)

class SwapRequestMatchView(APIView):
    """
    API endpoint for TAs to match with an existing swap request.
    POST: Match the TA's assignment with the specified swap request
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        """Match the current TA's assignment with the specified swap request."""
        try:
            # Ensure user is a TA
            if request.user.role != 'TA':
                return Response(
                    {"error": "Only TAs can match with swap requests."},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Get the swap request
            swap_request = get_object_or_404(SwapRequest, pk=pk)
            print(f"Found swap request: {swap_request.id}, status: {swap_request.status}")
            
            # Check if the request is in pending status
            if swap_request.status != 'PENDING':
                return Response(
                    {"error": f"Cannot match with a request in '{swap_request.get_status_display()}' status."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if the TA is not the requester
            if request.user == swap_request.requesting_proctor:
                return Response(
                    {"error": "You cannot match with your own swap request."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate the match assignment from the request data
            serializer = SwapRequestMatchSerializer(
                data=request.data,
                context={'request': request, 'swap_request': swap_request}
            )
            
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            # Get the matched assignment
            assignment_id = serializer.validated_data['proctor_assignment_id']
            matched_assignment = get_object_or_404(
                ProctorAssignment, 
                id=assignment_id, 
                ta=request.user
            )
            print(f"Found matched assignment: {matched_assignment.id}")
            
            # Update the swap request
            swap_request.matched_proctor = request.user
            swap_request.matched_assignment = matched_assignment
            swap_request.status = 'MATCHED'
            swap_request.save()
            
            # Get instructor emails for notification
            course = swap_request.original_assignment.exam.course
            print(f"Course for notification: {course.code}")
            
            try:
                # Do not attempt to filter on relationship fields
                instructors = User.objects.filter(role='INSTRUCTOR')
                
                # Print instructor count for debugging
                print(f"Found {instructors.count()} instructors total")
                
                # Just list all instructors for now (temporary solution)
                instructor_emails = list(instructors.values_list('email', flat=True))
                print(f"Using all instructor emails for notification: {instructor_emails}")
                
                # TODO: Implement proper course-instructor relationship query when data model is fixed
            except Exception as e:
                import traceback
                print(f"Error finding instructors: {str(e)}")
                print(traceback.format_exc())
                instructor_emails = []
            
            # TODO: Send email notification to instructors here
            
            # Return the updated swap request
            response_serializer = SwapRequestDetailSerializer(swap_request)
            return Response(response_serializer.data)
            
        except Exception as e:
            import traceback
            print(f"Error in SwapRequestMatchView.post: {str(e)}")
            print(traceback.format_exc())
            return Response(
                {"error": f"An error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class SwapRequestApproveView(APIView):
    """
    API endpoint for instructors to approve swap requests.
    POST: Approve a matched swap request
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        """Approve a matched swap request."""
        try:
            swap_request = get_object_or_404(SwapRequest, pk=pk)
            print(f"Found swap request to approve: {swap_request.id}, status: {swap_request.status}")
            print(f"Original assignment: {swap_request.original_assignment.id}, TA: {swap_request.original_assignment.ta.email}")
            if swap_request.matched_assignment:
                print(f"Matched assignment: {swap_request.matched_assignment.id}, TA: {swap_request.matched_assignment.ta.email}")
            else:
                print(f"No matched assignment found")
            
            # Get the user's role
            user = request.user
            print(f"User approving: {user.id} - {user.email}, role: {user.role}")
            
            # Check if the request is in MATCHED status
            if swap_request.status != 'MATCHED':
                print(f"Cannot approve: wrong status: {swap_request.status}")
                return Response(
                    {"error": f"Cannot approve a request in '{swap_request.get_status_display()}' status."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate that the user has permission to approve this swap
            print(f"Validating approver permissions...")
            serializer = SwapRequestApproveSerializer(
                data=request.data,
                context={'request': request, 'swap_request': swap_request}
            )
            
            if not serializer.is_valid():
                print(f"Validation failed: {serializer.errors}")
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            print(f"Validation successful!")
            
            # Process the approval - set status but don't save yet
            # Store comments if provided
            if 'comment' in serializer.validated_data:
                swap_request.instructor_comment = serializer.validated_data['comment']
                print(f"Added instructor comment: {serializer.validated_data['comment']}")
            
            # Set status to APPROVED - required for perform_swap to work
            swap_request.status = 'APPROVED'
            print(f"Set status to APPROVED")
            
            # Perform the actual swap first
            print(f"Performing swap for swap_request {swap_request.id}")
            try:
                # Use the proper perform_swap method instead of duplicating logic
                swap_result = swap_request.perform_swap()
                print(f"perform_swap returned: {swap_result}")
                
                if not swap_result:
                    print(f"Swap failed: perform_swap returned False")
                    return Response(
                        {"error": "Failed to perform the swap. Check server logs for details."},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
                print(f"Swap completed successfully!")
                success = True
            except Exception as e:
                import traceback
                print(f"Error during swap: {str(e)}")
                print(traceback.format_exc())
                return Response(
                    {"error": f"Failed to perform the swap: {str(e)}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Get updated swap request with COMPLETED status after perform_swap()
            print(f"Fetching updated swap request...")
            swap_request = SwapRequest.objects.get(pk=pk)
            print(f"Updated status: {swap_request.status}")
            response_serializer = SwapRequestDetailSerializer(swap_request)
            return Response(response_serializer.data)
            
        except Exception as e:
            import traceback
            print(f"Error in SwapRequestApproveView.post: {str(e)}")
            print(traceback.format_exc())
            return Response(
                {"error": f"An error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class SwapRequestRejectView(APIView):
    """
    API endpoint for instructors to reject swap requests.
    POST: Reject a matched swap request
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        """Reject a matched swap request."""
        try:
            swap_request = get_object_or_404(SwapRequest, pk=pk)
            print(f"Found swap request to reject: {swap_request.id}, status: {swap_request.status}")
            
            # Get the user's role
            user = request.user
            
            # Check if the request is in MATCHED status
            if swap_request.status != 'MATCHED':
                return Response(
                    {"error": f"Cannot reject a request in '{swap_request.get_status_display()}' status."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate that the user has permission to reject this swap
            serializer = SwapRequestApproveSerializer(
                data=request.data,
                context={'request': request, 'swap_request': swap_request}
            )
            
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            # Process the rejection
            swap_request.status = 'REJECTED'
            if 'comment' in serializer.validated_data:
                swap_request.rejected_reason = serializer.validated_data['comment']
            swap_request.save()
            print(f"Swap request {swap_request.id} rejected successfully")
            
            # Return the updated swap request
            response_serializer = SwapRequestDetailSerializer(swap_request)
            return Response(response_serializer.data)
            
        except Exception as e:
            import traceback
            print(f"Error in SwapRequestRejectView.post: {str(e)}")
            print(traceback.format_exc())
            return Response(
                {"error": f"An error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

# Register this in your urls.py:
# path('exams/<int:pk>/eligible-tas/', ExamEligibleTAsView.as_view(), name='exam-eligible-tas'),
# path('exams/<int:pk>/assign-proctors/', AssignProctorsToExamView.as_view(), name='assign-proctors-to-exam'),
