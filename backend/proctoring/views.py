from django.shortcuts import render, get_object_or_404
from django.db.models import Count, Q, F
from django.utils import timezone
from datetime import timedelta
from rest_framework import generics, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from accounts.models import User, Exam, Course
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
        exam_department_code = exam.course.department.code # Get the department code (e.g., 'CS')
        
        # First, get all TAs from the same department as the exam's course
        tas = User.objects.filter(
            role='TA', 
            is_active=True,
            department=exam_department_code  # Filter by the exam's course department code
        )
        
        # Filter by academic level based on the exam's course level
        exam_course_level = exam.course.level.upper() # Ensure comparison is case-insensitive (e.g., 'UNDERGRADUATE')

        if exam_course_level == Course.CourseLevel.UNDERGRADUATE.upper():
            tas = tas.filter(academic_level__in=[User.AcademicLevel.MASTERS, User.AcademicLevel.PHD])
        elif exam_course_level in [Course.CourseLevel.GRADUATE.upper(), Course.CourseLevel.PHD.upper()]:
            tas = tas.filter(academic_level=User.AcademicLevel.PHD)
        # If exam_course_level is something else, no further academic level filtering is applied by default.
        # This assumes Course.level will always be one of the defined choices.
        
        # Calculate current proctor workload for each TA
        tas = tas.annotate(
            current_workload=Count('proctoring_assignments', 
                                  filter=Q(proctoring_assignments__status__in=['ASSIGNED', 'COMPLETED']))
        ).order_by('current_workload')  # Order by workload (ascending)
        
        result = []
        for ta in tas:
            # Initialize details
            details = {
                'constraints': [], # No constraints will be added
                'is_cross_department': False, # Default value
                'workload': {
                    'current': ta.current_workload,
                }
            }
            
            is_eligible = True # All TAs are considered eligible
            
            # Append this TA to result
            serializer = EligibleProctorSerializer(ta)
            data = serializer.data
            data['is_eligible'] = is_eligible
            data['details'] = details
            data['current_workload'] = ta.current_workload
            result.append(data)
        
        # Return sorted by workload (ascending)
        # Since all are eligible, secondary sort by eligibility is not strictly needed but harmless
        result = sorted(result, key=lambda x: (not x['is_eligible'], x['current_workload']))
        
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

        # Initial exam status validation
        # Allow changes if AWAITING_PROCTORS, or if READY and we are replacing assignments.
        if not (exam.status == Exam.Status.AWAITING_PROCTORS or 
                (exam.status == Exam.Status.READY and replace_existing)):
            return Response(
                {"error": f"Exam is currently '{exam.get_status_display()}'. Proctors can only be assigned if status is 'Awaiting Proctors', or 'Ready' if replacing existing assignments."},
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
                            'status': ProctorAssignment.Status.ASSIGNED
                        }
                    )
                    if created:
                        successfully_created_count += 1
                        assigned_tas_in_this_operation.append(assignment)
                    elif replace_existing: # If replacing and it was re-created (it was deleted before)
                        successfully_created_count += 1
                        assigned_tas_in_this_operation.append(assignment)
                    # If not created and not replacing, it means it was already there, skip (no error needed here as it's not over limit due to prior checks)

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

# Register this in your urls.py:
# path('exams/<int:pk>/eligible-tas/', ExamEligibleTAsView.as_view(), name='exam-eligible-tas'),
# path('exams/<int:pk>/assign-proctors/', AssignProctorsToExamView.as_view(), name='assign-proctors-to-exam'),
