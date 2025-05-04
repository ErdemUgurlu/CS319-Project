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
        swap_request.is_auto_swap = True  # Mark as automatic swap
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
                'swap_request_id': result['swap_request'].id,
                'details': result.get('details', {})
            }, status=status.HTTP_400_BAD_REQUEST)


class AcceptExistingSwapView(APIView):
    """
    API endpoint for TAs to accept an existing swap request.
    """
    permission_classes = [IsAuthenticated, IsTA]
    
    @transaction.atomic
    def post(self, request, swap_request_id):
        try:
            # Get the swap request
            swap_request = SwapRequest.objects.get(id=swap_request_id)
            
            # Check if the request is already processed
            if swap_request.status != 'PENDING':
                return Response({
                    'error': 'This swap request has already been processed'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if the current user is the requested proctor
            if swap_request.requested_proctor.id != request.user.id:
                return Response({
                    'error': 'You are not the requested proctor for this swap'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Process the swap request
            result = process_swap_request(swap_request)
            
            # Send email notifications
            if result['success']:
                send_swap_notification_emails(swap_request, success=True)
            else:
                send_swap_notification_emails(swap_request, success=False)
            
            if result['success']:
                return Response({
                    'message': result['message'],
                    'swap_request_id': swap_request.id,
                    'details': result.get('details', {})
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'error': result['message'],
                    'swap_request_id': swap_request.id,
                    'details': result.get('details', {})
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except SwapRequest.DoesNotExist:
            return Response({
                'error': 'Swap request not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class EligibleProctorsView(APIView):
    """
    API endpoint to get a list of eligible TAs for a proctor swap.
    """
    permission_classes = [IsAuthenticated, IsTA]
    
    def get(self, request, assignment_id):
        try:
            # Get the assignment
            assignment = ProctorAssignment.objects.get(id=assignment_id)
            
            # Check if the current user is the assigned proctor
            if assignment.proctor.id != request.user.id:
                return Response({
                    'error': 'You can only view eligible TAs for your own assignments'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Get all TAs
            tas = User.objects.filter(role='TA')
            
            # Check eligibility for each TA
            eligible_tas = []
            
            for ta in tas:
                # Skip the current proctor
                if ta.id == request.user.id:
                    continue
                
                is_eligible, details = check_ta_eligibility(ta, assignment.exam, assignment)
                
                eligible_tas.append({
                    'id': ta.id,
                    'email': ta.email,
                    'full_name': ta.full_name,
                    'academic_level': ta.academic_level,
                    'is_eligible': is_eligible,
                    'details': details
                })
            
            return Response(eligible_tas)
            
        except ProctorAssignment.DoesNotExist:
            return Response({
                'error': 'Assignment not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ConfirmAssignmentView(APIView):
    """
    API endpoint for TAs to confirm their proctoring assignments.
    """
    permission_classes = [IsAuthenticated, IsTA]
    
    def post(self, request, assignment_id):
        try:
            # Get the assignment
            assignment = ProctorAssignment.objects.get(id=assignment_id)
            
            # Check if the current user is the assigned proctor
            if assignment.proctor.id != request.user.id:
                return Response({
                    'error': 'You can only confirm your own assignments'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Check if the assignment is already confirmed
            if assignment.status != 'ASSIGNED':
                return Response({
                    'error': f'This assignment is already in {assignment.get_status_display()} status'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Update the assignment
            assignment.status = 'CONFIRMED'
            assignment.confirmation_date = timezone.now()
            assignment.save()
            
            # Log the confirmation
            AuditLog.objects.create(
                user=request.user,
                action='confirm_proctoring',
                object_type='ProctorAssignment',
                object_id=assignment.id,
                description=f"Proctor {request.user.email} confirmed assignment for {assignment.exam.title}"
            )
            
            return Response({
                'message': 'Assignment confirmed successfully',
                'assignment_id': assignment.id,
                'status': assignment.status
            }, status=status.HTTP_200_OK)
                
        except ProctorAssignment.DoesNotExist:
            return Response({
                'error': 'Assignment not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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
