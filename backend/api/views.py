from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import (
    LeaveRequest, ProctorAssignment, 
    CrossDepartmentAssignmentRequest, Department, UserProfile, Course
)
from .serializers import (
    LeaveRequestSerializer, ProctorAssignmentSerializer,
    CrossDepartmentAssignmentRequestSerializer, DepartmentSerializer, UserProfileSerializer
)
from django.contrib.auth.models import User
from django.core.exceptions import PermissionDenied

class LeaveRequestViewSet(viewsets.ModelViewSet):
    serializer_class = LeaveRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return LeaveRequest.objects.all()
        return LeaveRequest.objects.filter(user=user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        if not request.user.is_staff:
            return Response(
                {'error': 'Only staff members can approve leave requests'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        leave_request = self.get_object()
        leave_request.status = 'approved'
        leave_request.save()
        serializer = self.get_serializer(leave_request)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        if not request.user.is_staff:
            return Response(
                {'error': 'Only staff members can reject leave requests'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        leave_request = self.get_object()
        leave_request.status = 'rejected'
        leave_request.save()
        serializer = self.get_serializer(leave_request)
        return Response(serializer.data)

class ProctorAssignmentViewSet(viewsets.ModelViewSet):
    serializer_class = ProctorAssignmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        user_profile = UserProfile.objects.get(user=user)
        
        if user_profile.is_dean_office:
            return ProctorAssignment.objects.all()
        
        if user_profile.is_authorized_staff:
            return ProctorAssignment.objects.filter(
                Q(target_department=user_profile.department) |
                Q(exam__course__instructor=user)
            )
        
        # For course instructors, show assignments for their courses
        if user_profile.user.taught_courses.exists():
            return ProctorAssignment.objects.filter(
                Q(exam__course__instructor=user) |
                Q(proctor=user)
            )
        
        # For TAs, show their own assignments
        return ProctorAssignment.objects.filter(proctor=user)

    def get_available_tas(self, course):
        """Get all TAs from the same department as the course instructor"""
        instructor_profile = UserProfile.objects.get(user=course.instructor)
        
        # Get all TAs from the department
        department_tas = UserProfile.objects.filter(
            department=instructor_profile.department,
            user__assisted_courses__isnull=False  # Only get users who are TAs
        ).select_related('user')

        # Exclude TAs who are already assigned to this exam
        exam_proctors = ProctorAssignment.objects.filter(
            exam=course.exams.first(),  # Assuming we're looking at the current exam
            status__in=['assigned', 'confirmed']
        ).values_list('proctor_id', flat=True)

        return department_tas.exclude(user__id__in=exam_proctors)

    def get_best_available_tas(self, course, count):
        """Get the best available TAs for automatic assignment based on workload"""
        available_tas = self.get_available_tas(course)
        
        # Get workload for each TA (number of proctor assignments)
        ta_workloads = []
        for ta in available_tas:
            workload = ProctorAssignment.objects.filter(
                proctor=ta.user,
                status__in=['assigned', 'confirmed']
            ).count()
            ta_workloads.append((ta, workload))
        
        # Sort by workload (ascending) and return the required number of TAs
        ta_workloads.sort(key=lambda x: x[1])
        return [ta for ta, _ in ta_workloads[:count]]

    def perform_create(self, serializer):
        course = serializer.validated_data['exam'].course
        user_profile = UserProfile.objects.get(user=self.request.user)
        
        # Check if the user is authorized to create assignments
        if not (user_profile.is_dean_office or 
                user_profile.is_authorized_staff or 
                course.instructor == self.request.user):
            raise PermissionDenied("You are not authorized to create proctor assignments")
        
        serializer.save(assigned_by=self.request.user)

    @action(detail=False, methods=['post'])
    def assign_proctors(self, request):
        """Assign both manual and automatic proctors to an exam"""
        exam_id = request.data.get('exam_id')
        manual_proctor_ids = request.data.get('manual_proctor_ids', [])
        auto_assign_count = request.data.get('auto_assign_count', 0)

        try:
            exam = Exam.objects.get(id=exam_id)
        except Exam.DoesNotExist:
            return Response(
                {'error': 'Exam not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check authorization
        user_profile = UserProfile.objects.get(user=request.user)
        if not (user_profile.is_dean_office or 
                user_profile.is_authorized_staff or 
                exam.course.instructor == request.user):
            return Response(
                {'error': 'You are not authorized to assign proctors'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Validate total number of proctors
        total_proctors = len(manual_proctor_ids) + auto_assign_count
        if total_proctors > exam.required_proctors:
            return Response(
                {'error': f'Total number of proctors ({total_proctors}) exceeds required number ({exam.required_proctors})'},
                status=status.HTTP_400_BAD_REQUEST
            )

        assignments = []

        # Handle manual assignments
        for proctor_id in manual_proctor_ids:
            try:
                proctor = User.objects.get(id=proctor_id)
                assignment = ProctorAssignment.objects.create(
                    exam=exam,
                    proctor=proctor,
                    assigned_by=request.user,
                    status='assigned'
                )
                assignments.append(assignment)
            except User.DoesNotExist:
                return Response(
                    {'error': f'Proctor with ID {proctor_id} not found'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Handle automatic assignments
        if auto_assign_count > 0:
            best_tas = self.get_best_available_tas(exam.course, auto_assign_count)
            for ta in best_tas:
                assignment = ProctorAssignment.objects.create(
                    exam=exam,
                    proctor=ta.user,
                    assigned_by=request.user,
                    status='assigned'
                )
                assignments.append(assignment)

        serializer = self.get_serializer(assignments, many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def available_tas(self, request):
        """Get available TAs for a specific course"""
        course_id = request.query_params.get('course_id')
        if not course_id:
            return Response(
                {'error': 'Course ID is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            course = Course.objects.get(id=course_id)
        except Course.DoesNotExist:
            return Response(
                {'error': 'Course not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check if the user is authorized to view TAs
        user_profile = UserProfile.objects.get(user=request.user)
        if not (user_profile.is_dean_office or 
                user_profile.is_authorized_staff or 
                course.instructor == request.user):
            return Response(
                {'error': 'You are not authorized to view TAs for this course'},
                status=status.HTTP_403_FORBIDDEN
            )

        tas = self.get_available_tas(course)
        serializer = UserProfileSerializer(tas, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def request_cross_department(self, request, pk=None):
        proctor_assignment = self.get_object()
        user_profile = UserProfile.objects.get(user=request.user)
        
        if not user_profile.is_dean_office:
            return Response(
                {'error': 'Only dean office can request cross-department assignments'},
                status=status.HTTP_403_FORBIDDEN
            )

        target_department_id = request.data.get('target_department_id')
        if not target_department_id:
            return Response(
                {'error': 'Target department is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            target_department = Department.objects.get(id=target_department_id)
        except Department.DoesNotExist:
            return Response(
                {'error': 'Invalid target department'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create cross-department request
        cross_request = CrossDepartmentAssignmentRequest.objects.create(
            proctor_assignment=proctor_assignment,
            requesting_department=user_profile.department,
            target_department=target_department,
            created_by=request.user
        )

        # Update proctor assignment status
        proctor_assignment.status = 'pending_cross_department'
        proctor_assignment.target_department = target_department
        proctor_assignment.save()

        return Response(
            CrossDepartmentAssignmentRequestSerializer(cross_request).data,
            status=status.HTTP_201_CREATED
        )

class CrossDepartmentAssignmentRequestViewSet(viewsets.ModelViewSet):
    serializer_class = CrossDepartmentAssignmentRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        user_profile = UserProfile.objects.get(user=user)
        
        if user_profile.is_dean_office:
            return CrossDepartmentAssignmentRequest.objects.all()
        
        if user_profile.is_authorized_staff:
            return CrossDepartmentAssignmentRequest.objects.filter(
                target_department=user_profile.department
            )
        
        return CrossDepartmentAssignmentRequest.objects.none()

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        cross_request = self.get_object()
        user_profile = UserProfile.objects.get(user=request.user)
        
        if not user_profile.is_authorized_staff:
            return Response(
                {'error': 'Only authorized staff can approve cross-department requests'},
                status=status.HTTP_403_FORBIDDEN
            )

        if cross_request.target_department != user_profile.department:
            return Response(
                {'error': 'You can only approve requests for your department'},
                status=status.HTTP_403_FORBIDDEN
            )

        cross_request.status = 'approved'
        cross_request.approved_by = request.user
        cross_request.save()

        # Update proctor assignment status
        proctor_assignment = cross_request.proctor_assignment
        proctor_assignment.status = 'approved_cross_department'
        proctor_assignment.save()

        return Response(
            CrossDepartmentAssignmentRequestSerializer(cross_request).data
        )

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        cross_request = self.get_object()
        user_profile = UserProfile.objects.get(user=request.user)
        
        if not user_profile.is_authorized_staff:
            return Response(
                {'error': 'Only authorized staff can reject cross-department requests'},
                status=status.HTTP_403_FORBIDDEN
            )

        if cross_request.target_department != user_profile.department:
            return Response(
                {'error': 'You can only reject requests for your department'},
                status=status.HTTP_403_FORBIDDEN
            )

        cross_request.status = 'rejected'
        cross_request.approved_by = request.user
        cross_request.save()

        # Update proctor assignment status
        proctor_assignment = cross_request.proctor_assignment
        proctor_assignment.status = 'rejected_cross_department'
        proctor_assignment.save()

        return Response(
            CrossDepartmentAssignmentRequestSerializer(cross_request).data
        ) 