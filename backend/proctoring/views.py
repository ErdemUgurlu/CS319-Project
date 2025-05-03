from django.shortcuts import render, get_object_or_404
from django.utils import timezone
from django.db import transaction
from django.http import Http404
from rest_framework import status, viewsets, generics, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from accounts.models import User, AuditLog
from .models import Exam, ExamRoom, ProctorAssignment, SwapRequest, ProctorConstraint
from . import serializers
from .utils import process_swap_request, send_swap_notification_emails


class IsTA(permissions.BasePermission):
    """
    Custom permission to only allow TAs to access a view.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'TA'


class IsStaffOrInstructor(permissions.BasePermission):
    """
    Custom permission to only allow staff and instructors to access a view.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['STAFF', 'ADMIN', 'INSTRUCTOR']


class MyProctoringsView(generics.ListAPIView):
    """
    API endpoint for TAs to view their proctor assignments.
    """
    serializer_class = serializers.ProctorAssignmentSerializer
    permission_classes = [IsAuthenticated, IsTA]
    
    def get_queryset(self):
        return ProctorAssignment.objects.filter(
            proctor=self.request.user
        ).select_related(
            'exam', 'exam_room', 'exam_room__classroom'
        ).order_by('exam__date', 'exam__start_time')


class SwapRequestCreateView(generics.CreateAPIView):
    """
    API endpoint for TAs to create swap requests which are processed immediately.
    """
    serializer_class = serializers.SwapRequestCreateSerializer
    permission_classes = [IsAuthenticated, IsTA]
    
    @transaction.atomic
    def perform_create(self, serializer):
        # Save the swap request instance but don't commit to DB yet
        swap_request = serializer.save()
        
        # Set the requesting proctor
        swap_request.requesting_proctor = self.request.user
        swap_request.save()
        
        # Process the swap request
        result = process_swap_request(swap_request)
        
        # Send email notifications
        if result['success']:
            send_swap_notification_emails(swap_request, success=True)
        else:
            send_swap_notification_emails(swap_request, success=False)
        
        # Store the result for the response
        self.swap_result = result
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # Get the result from the swap processing
        result = getattr(self, 'swap_result', {'success': False, 'message': 'Unknown error'})
        
        if result['success']:
            return Response({
                'message': result['message'],
                'swap_request_id': result['swap_request'].id,
                'details': result.get('details', {})
            }, status=status.HTTP_201_CREATED)
        else:
            return Response({
                'error': result['message'],
                'swap_request_id': result['swap_request'].id if 'swap_request' in result else None,
                'details': result.get('details', {})
            }, status=status.HTTP_400_BAD_REQUEST)


class EligibleProctorsView(APIView):
    """
    API endpoint to get a list of eligible TAs to swap with for a specific assignment.
    """
    permission_classes = [IsAuthenticated, IsTA]
    
    def get(self, request, assignment_id):
        try:
            assignment = ProctorAssignment.objects.get(
                id=assignment_id, 
                proctor=request.user
            )
        except ProctorAssignment.DoesNotExist:
            raise Http404("Assignment not found or you don't have permission")
        
        # Check 3-hour rule
        exam_datetime = timezone.make_aware(
            timezone.datetime.combine(assignment.exam.date, assignment.exam.start_time)
        )
        if exam_datetime - timezone.now() < timezone.timedelta(hours=3):
            return Response(
                {"error": "Cannot swap assignments less than 3 hours before the exam"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get all TAs
        tas = User.objects.filter(role='TA', is_active=True).exclude(id=request.user.id)
        
        # Find eligible TAs
        eligible_tas = []
        for ta in tas:
            from .utils import check_ta_eligibility
            is_eligible, details = check_ta_eligibility(ta, assignment.exam, assignment)
            
            # Add eligibility info to serialized data
            ta_data = serializers.UserMinimalSerializer(ta).data
            ta_data['is_eligible'] = is_eligible
            ta_data['details'] = details
            
            eligible_tas.append(ta_data)
        
        return Response(eligible_tas)


class SwapHistoryView(generics.ListAPIView):
    """
    API endpoint to view swap history for a TA.
    """
    serializer_class = serializers.SwapRequestSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'is_auto_swap', 'is_cross_department']
    
    def get_queryset(self):
        user = self.request.user
        
        if user.role == 'TA':
            # TAs can see only their own swap requests
            return SwapRequest.objects.filter(
                requesting_proctor=user
            ).select_related(
                'requesting_proctor',
                'requested_proctor',
                'original_assignment',
                'original_assignment__exam',
                'original_assignment__exam_room'
            ).order_by('-created_at')
        elif user.role in ['STAFF', 'ADMIN', 'INSTRUCTOR']:
            # Staff and instructors can see all swap requests
            return SwapRequest.objects.all().select_related(
                'requesting_proctor',
                'requested_proctor',
                'original_assignment',
                'original_assignment__exam',
                'original_assignment__exam_room'
            ).order_by('-created_at')
        else:
            return SwapRequest.objects.none()
