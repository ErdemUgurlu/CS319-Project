from django.shortcuts import render, get_object_or_404
from rest_framework import status, viewsets, generics, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes, action
from django.db.models import Q
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone

from accounts.models import User, InstructorTAAssignment
from workload.models import WorkloadRecord, WorkloadManualAdjustment
from .models import Task, TaskCompletion, TaskReview
from . import serializers


class IsTaskRelevantUser(permissions.BasePermission):
    """
    Custom permission to only allow users who are assigned to or created a task to view it.
    """
    def has_object_permission(self, request, view, obj):
        # Check if the user is the assignee or creator
        return obj.assignee == request.user or obj.creator == request.user


class MyTasksView(generics.ListCreateAPIView):
    """
    API endpoint for users to view and create their tasks.
    """
    serializer_class = serializers.TaskSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Return tasks where the user is either the assignee or creator
        return Task.objects.filter(
            Q(assignee=self.request.user) | Q(creator=self.request.user)
        ).order_by('-created_at')
        
    def perform_create(self, serializer):
        # Set the current user as the creator of the task
        serializer.save(creator=self.request.user)


class TaskDetailView(generics.RetrieveUpdateAPIView):
    """
    API endpoint for viewing and updating task details.
    """
    serializer_class = serializers.TaskSerializer
    permission_classes = [IsAuthenticated, IsTaskRelevantUser]
    queryset = Task.objects.all()
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # If instructor is updating assignee, check if it's one of their TAs
        if 'assigned_to' in request.data and request.user.role == 'INSTRUCTOR':
            assignee_id = request.data.get('assigned_to')
            if assignee_id:
                # Check if this TA is assigned to this instructor
                assigned_ta_exists = InstructorTAAssignment.objects.filter(
                    instructor=request.user,
                    ta_id=assignee_id
                ).exists()
                
                if not assigned_ta_exists:
                    return Response(
                        {"error": "You can only assign tasks to your own TAs"},
                        status=status.HTTP_403_FORBIDDEN
                    )
        
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        return Response(serializer.data)


class TaskStatusesView(APIView):
    """
    API endpoint to get all possible task statuses.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        statuses = [{'value': status[0], 'label': status[1]} for status in Task.STATUS_CHOICES]
        return Response(statuses)


class CompleteTaskView(APIView):
    """
    API endpoint for TAs to mark tasks as completed.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, task_id):
        # Check if the user is a TA
        if request.user.role != 'TA':
            return Response(
                {"error": "Only TAs can mark tasks as completed."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        task = get_object_or_404(Task, id=task_id, assignee=request.user)
        
        # Check if task is already completed or approved
        if task.status in ['COMPLETED', 'APPROVED', 'REJECTED']:
            return Response(
                {"error": f"Task is already {task.status.lower()}."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get completion data
        completion_note = request.data.get('completion_note', '')
        hours_spent = request.data.get('hours_spent', 0)
        
        # Create task completion record
        completion = TaskCompletion.objects.create(
            task=task,
            completion_note=completion_note,
            hours_spent=hours_spent
        )
        
        # Update task status
        task.status = 'COMPLETED'
        task.save()
        
        # Send email notification to instructor
        try:
            subject = f"Task Completion Notification: {task.title}"
            message = f"""
            Dear {task.creator.full_name},
            
            The task "{task.title}" has been marked as completed by {request.user.full_name}.
            
            Completion Note: {completion_note}
            Hours Spent: {hours_spent}
            
            Please review this task in the TA Management System.
            """
            
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [task.creator.email],
                fail_silently=False,
            )
        except Exception as e:
            # Log the error but don't stop the API response
            print(f"Email notification error: {str(e)}")
        
        return Response({"status": "completed"}, status=status.HTTP_200_OK)


class ReviewTaskView(APIView):
    """
    API endpoint for instructors to review completed tasks.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, task_id):
        # Check if the user is an instructor
        if request.user.role != 'INSTRUCTOR':
            return Response(
                {"error": "Only instructors can review tasks."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        task = get_object_or_404(Task, id=task_id, creator=request.user)
        
        # Check if task is completed
        if task.status != 'COMPLETED':
            return Response(
                {"error": "Only completed tasks can be reviewed."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get review data
        is_approved = request.data.get('is_approved', False)
        feedback = request.data.get('feedback', '')
        
        # Create task review
        review = TaskReview.objects.create(
            task=task,
            reviewer=request.user,
            is_approved=is_approved,
            feedback=feedback
        )
        
        # If approved, update TA's workload
        if is_approved:
            WorkloadRecord.objects.create(
                user=task.assignee,
                task=task,
                hours=task.credit_hours,
                date=timezone.now().date(),
                description=f"Task: {task.title}"
            )
        
        # Send email notification to TA
        try:
            status_text = "approved" if is_approved else "rejected"
            subject = f"Task Review Notification: {task.title} - {status_text.upper()}"
            message = f"""
            Dear {task.assignee.full_name},
            
            Your completion of the task "{task.title}" has been {status_text} by {request.user.full_name}.
            
            Feedback: {feedback}
            
            {"Your workload has been updated accordingly." if is_approved else ""}
            
            Thank you for your work.
            """
            
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [task.assignee.email],
                fail_silently=False,
            )
        except Exception as e:
            # Log the error but don't stop the API response
            print(f"Email notification error: {str(e)}")
        
        return Response({"status": status_text}, status=status.HTTP_200_OK)
