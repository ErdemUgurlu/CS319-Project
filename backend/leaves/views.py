from django.shortcuts import render, get_object_or_404
from rest_framework import status, generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.db.models import Q, F

from .models import LeaveType, LeaveRequest, LeaveImpact, DateUnavailability
from .serializers import (
    LeaveTypeSerializer, 
    LeaveRequestListSerializer, 
    LeaveRequestDetailSerializer,
    LeaveRequestCreateSerializer,
    LeaveRequestUpdateSerializer,
    LeaveRequestReviewSerializer,
    LeaveImpactSerializer,
    DateUnavailabilitySerializer
)
from accounts.models import User, InstructorTAAssignment


class LeaveTypeListView(generics.ListAPIView):
    """API endpoint to list all leave types."""
    queryset = LeaveType.objects.all()
    serializer_class = LeaveTypeSerializer
    permission_classes = [IsAuthenticated]


class MyLeaveRequestsView(generics.ListCreateAPIView):
    """API endpoint for TAs to view their leave requests and create new ones."""
    serializer_class = LeaveRequestListSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Return leave requests for the authenticated user."""
        if self.request.user.role != 'TA':
            return LeaveRequest.objects.none()
        
        return LeaveRequest.objects.filter(ta=self.request.user)
    
    def get_serializer_class(self):
        """Use different serializers for list and create actions."""
        if self.request.method == 'POST':
            return LeaveRequestCreateSerializer
        return LeaveRequestListSerializer
    
    def perform_create(self, serializer):
        """Set the authenticated user as the TA for the leave request."""
        # Check if user is a TA
        if self.request.user.role != 'TA':
            return Response(
                {"error": "Only TAs can create leave requests."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Save the leave request
        leave_request = serializer.save(
            ta=self.request.user,
            status='PENDING'
        )
        
        # Find all instructors who have this TA assigned
        instructors = User.objects.filter(
            assigned_tas__ta=self.request.user,
            role='INSTRUCTOR'
        )
        
        # Send email notification to all associated instructors
        for instructor in instructors:
            self.send_leave_request_notification(leave_request, instructor)
    
    def send_leave_request_notification(self, leave_request, instructor):
        """Send email notification about the leave request to an instructor."""
        try:
            subject = f"New Leave Request: {leave_request.ta.full_name}"
            context = {
                'instructor': instructor,
                'leave_request': leave_request,
                'ta_name': leave_request.ta.full_name,
                'leave_type': leave_request.leave_type.name,
                'start_date': leave_request.start_date,
                'end_date': leave_request.end_date,
                'reason': leave_request.reason,
                'app_url': settings.FRONTEND_URL,
            }
            html_message = render_to_string('email/leave_request_notification.html', context)
            plain_message = strip_tags(html_message)
            
            send_mail(
                subject,
                plain_message,
                settings.DEFAULT_FROM_EMAIL,
                [instructor.email],
                html_message=html_message,
                fail_silently=True,
            )
        except Exception as e:
            print(f"Error sending leave request notification: {str(e)}")


class LeaveRequestDetailView(generics.RetrieveUpdateDestroyAPIView):
    """API endpoint to view, update, or delete a specific leave request."""
    serializer_class = LeaveRequestDetailSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Return leave requests that the user has access to."""
        user = self.request.user
        
        if user.role == 'TA':
            # TAs can only see their own leave requests
            return LeaveRequest.objects.filter(ta=user)
        elif user.role == 'INSTRUCTOR':
            # Instructors can see leave requests for TAs assigned to them
            assigned_tas = User.objects.filter(
                assigned_to_instructor__instructor=user
            )
            return LeaveRequest.objects.filter(ta__in=assigned_tas)
        elif user.role in ['STAFF', 'ADMIN']:
            # Staff and admins can see all leave requests
            return LeaveRequest.objects.all()
        else:
            return LeaveRequest.objects.none()
    
    def get_serializer_class(self):
        """Use different serializers for different HTTP methods."""
        if self.request.method in ['PUT', 'PATCH']:
            return LeaveRequestUpdateSerializer
        return LeaveRequestDetailSerializer
    
    def perform_update(self, serializer):
        """Only allow users to update their own pending leave requests."""
        leave_request = self.get_object()
        
        # Check if the user is the TA who created this request
        if leave_request.ta != self.request.user:
            return Response(
                {"error": "You can only update your own leave requests."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if the leave request is in a status that can be updated
        if leave_request.status not in ['PENDING', 'CANCELLED']:
            return Response(
                {"error": "Only pending or cancelled leave requests can be updated."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer.save()
    
    def perform_destroy(self, instance):
        """Only allow TAs to cancel their own pending leave requests."""
        # Check if the user is the TA who created this request
        if instance.ta != self.request.user or self.request.user.role != 'TA':
            return Response(
                {"error": "You can only cancel your own leave requests."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if the leave request is pending
        if instance.status != 'PENDING':
            return Response(
                {"error": "Only pending leave requests can be cancelled."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Set status to CANCELLED instead of actually deleting
        instance.status = 'CANCELLED'
        instance.save()


class ReviewLeaveRequestView(APIView):
    """API endpoint for instructors to approve or reject leave requests."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, pk):
        """Handle POST request to review a leave request."""
        # Check if the user is an instructor
        if request.user.role != 'INSTRUCTOR':
            return Response(
                {"error": "Only instructors can review leave requests."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get the leave request
        leave_request = get_object_or_404(LeaveRequest, pk=pk)
        
        # Check if the TA is assigned to this instructor
        if not InstructorTAAssignment.objects.filter(
            instructor=request.user, 
            ta=leave_request.ta
        ).exists():
            return Response(
                {"error": "You can only review leave requests for TAs assigned to you."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if the leave request is pending
        if leave_request.status != 'PENDING':
            return Response(
                {"error": "Only pending leave requests can be reviewed."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate and process the review
        serializer = LeaveRequestReviewSerializer(data=request.data)
        if serializer.is_valid():
            # Update leave request with review data
            leave_request.status = serializer.validated_data['status']
            leave_request.reviewed_by = request.user
            leave_request.reviewed_at = timezone.now()
            
            # Add rejection reason if applicable
            if leave_request.status == 'REJECTED':
                leave_request.rejection_reason = serializer.validated_data.get('rejection_reason', '')
            
            leave_request.save()
            
            # If approved, create date unavailability records
            if leave_request.status == 'APPROVED':
                self.create_date_unavailability_records(leave_request)
            
            # Send notification to the TA
            self.send_review_notification(leave_request)
            
            return Response({
                "message": f"Leave request {leave_request.status.lower()}",
                "status": leave_request.status
            })
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def create_date_unavailability_records(self, leave_request):
        """Create date unavailability records for the approved leave request."""
        # Calculate all dates between start_date and end_date (inclusive)
        from datetime import timedelta
        
        current_date = leave_request.start_date
        end_date = leave_request.end_date
        
        while current_date <= end_date:
            # Create or update date unavailability record
            DateUnavailability.objects.update_or_create(
                ta=leave_request.ta,
                date=current_date,
                defaults={
                    'reason': f"{leave_request.leave_type.name} Leave",
                    'leave_request': leave_request
                }
            )
            
            current_date += timedelta(days=1)
    
    def send_review_notification(self, leave_request):
        """Send email notification to the TA about their leave request review."""
        try:
            if leave_request.status == 'APPROVED':
                subject = f"Leave Request Approved: {leave_request.start_date} to {leave_request.end_date}"
                template = 'email/leave_request_approved.html'
            else:
                subject = f"Leave Request Rejected: {leave_request.start_date} to {leave_request.end_date}"
                template = 'email/leave_request_rejected.html'
            
            context = {
                'ta': leave_request.ta,
                'leave_request': leave_request,
                'reviewer': leave_request.reviewed_by.full_name,
                'leave_type': leave_request.leave_type.name,
                'start_date': leave_request.start_date,
                'end_date': leave_request.end_date,
                'rejection_reason': leave_request.rejection_reason,
                'app_url': settings.FRONTEND_URL,
            }
            
            html_message = render_to_string(template, context)
            plain_message = strip_tags(html_message)
            
            send_mail(
                subject,
                plain_message,
                settings.DEFAULT_FROM_EMAIL,
                [leave_request.ta.email],
                html_message=html_message,
                fail_silently=True,
            )
        except Exception as e:
            print(f"Error sending leave request review notification: {str(e)}")


class InstructorLeaveRequestsView(generics.ListAPIView):
    """API endpoint for instructors to view leave requests for TAs assigned to them."""
    serializer_class = LeaveRequestListSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Return leave requests for TAs assigned to the authenticated instructor."""
        if self.request.user.role != 'INSTRUCTOR':
            return LeaveRequest.objects.none()
        
        # Get all TAs assigned to this instructor
        assigned_tas = User.objects.filter(
            assigned_to_instructor__instructor=self.request.user
        )
        
        # Filter leave requests to only show those from assigned TAs
        return LeaveRequest.objects.filter(ta__in=assigned_tas)
