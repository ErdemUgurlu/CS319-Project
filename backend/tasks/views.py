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
    pagination_class = None  # Disable pagination for this view
    
    def get_queryset(self):
        # Return tasks where the user is either the assignee or creator
        return Task.objects.filter(
            Q(assignee=self.request.user) | Q(creator=self.request.user)
        ).order_by('-created_at')
        
    def perform_create(self, serializer):
        # Set the current user as the creator of the task
        print(f"MyTasksView.perform_create - user: {self.request.user}")
        print(f"MyTasksView.perform_create - request data: {self.request.data}")
        print(f"MyTasksView.perform_create - assigned_to in request: {self.request.data.get('assigned_to')}")
        serializer.save(creator=self.request.user)
        
        # Log the created task data
        task = serializer.instance
        print(f"MyTasksView.perform_create - created task: {task.id}, title: {task.title}")
        print(f"MyTasksView.perform_create - assignee: {task.assignee}, creator: {task.creator}")
        
        # If task is assigned to a TA, send notification email
        if task.assignee and task.assignee.role == 'TA':
            try:
                # Check if email is valid
                ta_email = task.assignee.email
                if ta_email and '@' in ta_email and '.' in ta_email:
                    # Send task assignment notification to TA
                    print(f"MyTasksView.perform_create - sending notification to TA: {ta_email}")
                    
                    subject = f"New Task Assignment: {task.title}"
                    message = f"""
                    Dear {task.assignee.full_name},
                    
                    You have been assigned a new task by {self.request.user.full_name}:
                    
                    Title: {task.title}
                    Description: {task.description}
                    Due Date: {task.due_date.strftime('%d-%m-%Y') if task.due_date else 'Not set'}
                    Status: {task.status}
                    Credit Hours: {task.credit_hours or 'Not specified'}
                    
                    Please log in to the TA Management System to view details and update this task.
                    """
                    
                    send_mail(
                        subject,
                        message,
                        settings.DEFAULT_FROM_EMAIL,
                        [ta_email],
                        fail_silently=True,
                    )
                    
                    print(f"MyTasksView.perform_create - notification email sent to {ta_email}")
                else:
                    print(f"MyTasksView.perform_create - Invalid TA email: {ta_email}, skipping notification")
            except Exception as e:
                # Log the error but don't stop the API response
                print(f"MyTasksView.perform_create - Email notification error: {str(e)}")


class TaskDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    API endpoint for viewing, updating, and deleting task details.
    """
    serializer_class = serializers.TaskSerializer
    permission_classes = [IsAuthenticated, IsTaskRelevantUser]
    queryset = Task.objects.all()
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        print(f"TaskDetailView.update - request data: {request.data}")
        print(f"TaskDetailView.update - assigned_to in request: {request.data.get('assigned_to')}")
        print(f"TaskDetailView.update - current assignee: {instance.assignee}")
        
        # Store old assignee for later check
        old_assignee = instance.assignee
        old_assignee_id = old_assignee.id if old_assignee else None
        
        # If instructor is updating assignee, check if it's one of their TAs
        if 'assigned_to' in request.data and request.user.role == 'INSTRUCTOR':
            assignee_id = request.data.get('assigned_to')
            print(f"TaskDetailView.update - checking assignee_id: {assignee_id}")
            
            if assignee_id:
                # Check if the TA is from the same department as the instructor
                try:
                    ta = User.objects.get(id=assignee_id, role='TA')
                    if ta.department != request.user.department:
                        return Response(
                            {"error": "You can only assign tasks to TAs from your own department"},
                            status=status.HTTP_403_FORBIDDEN
                        )
                except User.DoesNotExist:
                    return Response(
                        {"error": "TA not found"},
                        status=status.HTTP_404_NOT_FOUND
                    )
                    
                # Check if this TA is assigned to this instructor
                assigned_ta_exists = InstructorTAAssignment.objects.filter(
                    instructor=request.user,
                    ta_id=assignee_id
                ).exists()
                
                print(f"TaskDetailView.update - TA assigned to instructor: {assigned_ta_exists}")
                
                if not assigned_ta_exists:
                    return Response(
                        {"error": "You can only assign tasks to your own TAs"},
                        status=status.HTTP_403_FORBIDDEN
                    )
        
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        updated_instance = self.get_object()
        print(f"TaskDetailView.update - updated task: {updated_instance.id}")
        print(f"TaskDetailView.update - new assignee: {updated_instance.assignee}")
        
        # Check if assignee has changed and send notification email
        new_assignee = updated_instance.assignee
        new_assignee_id = new_assignee.id if new_assignee else None
        
        # If assignee changed and there is a new assignee
        if new_assignee_id and new_assignee_id != old_assignee_id:
            try:
                # Check if email is valid
                ta_email = new_assignee.email
                if ta_email and '@' in ta_email and '.' in ta_email:
                    # Send task assignment notification to TA
                    print(f"TaskDetailView.update - sending notification to TA: {ta_email}")
                    
                    subject = f"New Task Assignment: {updated_instance.title}"
                    message = f"""
                    Dear {new_assignee.full_name},
                    
                    You have been assigned a new task by {request.user.full_name}:
                    
                    Title: {updated_instance.title}
                    Description: {updated_instance.description}
                    Due Date: {updated_instance.due_date.strftime('%d-%m-%Y') if updated_instance.due_date else 'Not set'}
                    Status: {updated_instance.status}
                    Credit Hours: {updated_instance.credit_hours or 'Not specified'}
                    
                    Please log in to the TA Management System to view details and update this task.
                    """
                    
                    send_mail(
                        subject,
                        message,
                        settings.DEFAULT_FROM_EMAIL,
                        [ta_email],
                        fail_silently=True,
                    )
                    
                    print(f"TaskDetailView.update - notification email sent to {ta_email}")
                else:
                    print(f"TaskDetailView.update - Invalid TA email: {ta_email}, skipping notification")
            except Exception as e:
                # Log the error but don't stop the API response
                print(f"TaskDetailView.update - Email notification error: {str(e)}")
        
        return Response(serializer.data)
    
    def perform_destroy(self, instance):
        """
        Override perform_destroy to handle task deletion.
        """
        print(f"TaskDetailView.perform_destroy - Deleting task: {instance.id}, title: {instance.title}")
        print(f"TaskDetailView.perform_destroy - Requested by user: {self.request.user}")
        
        # If the task is assigned to a TA, log this info
        if instance.assignee:
            print(f"TaskDetailView.perform_destroy - Task was assigned to: {instance.assignee}")
        
        # Proceed with deletion
        instance.delete()
        print(f"TaskDetailView.perform_destroy - Task {instance.id} deleted successfully")


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
        
        # Get the task or return 404
        task = get_object_or_404(Task, id=task_id)
        
        # Check if the task is assigned to the current user
        if task.assignee != request.user:
            return Response(
                {"error": "You can only complete tasks assigned to you."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if task is in the right state to be marked as completed
        if task.status not in ['IN_PROGRESS', 'PENDING']:
            return Response(
                {"error": f"Task cannot be marked as completed because its status is {task.status}."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get the completion note and hours spent
        completion_note = request.data.get('completion_note', '').strip()
        if not completion_note:
            return Response(
                {"error": "Completion note is required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            hours_spent = float(request.data.get('hours_spent', 0))
            if hours_spent <= 0:
                return Response(
                    {"error": "Hours spent must be greater than zero."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except (TypeError, ValueError):
            return Response(
                {"error": "Hours spent must be a valid number."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create or update the task completion
        TaskCompletion.objects.update_or_create(
            task=task,
            defaults={
                'completion_note': completion_note,
                'hours_spent': hours_spent
            }
        )
        
        # Update task status to WAITING_FOR_APPROVAL
        task.status = 'WAITING_FOR_APPROVAL'
        task.save()
        
        # Send email notification to instructor
        try:
            # First check if the email is valid (simple validation)
            instructor_email = task.creator.email
            if instructor_email and '@' in instructor_email and '.' in instructor_email:
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
                    [instructor_email],
                    fail_silently=True,  # Change to True to prevent errors from failing the request
                )
            else:
                print(f"Invalid instructor email: {instructor_email}, skipping notification")
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
        
        # Check if task is waiting for approval
        if task.status != 'WAITING_FOR_APPROVAL':
            return Response(
                {"error": "Only tasks waiting for approval can be reviewed."},
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
        
        # Update task status based on review decision
        task.status = 'APPROVED' if is_approved else 'REJECTED'
        task.save()
        
        # If approved, update TA's workload
        if is_approved:
            # Get the task completion to see hours spent by TA
            try:
                task_completion = TaskCompletion.objects.get(task=task)
                hours_spent = task_completion.hours_spent
                print(f"Task approved - TA reported hours_spent: {hours_spent}, Task credit_hours: {task.credit_hours}")
                
                # Create workload record with the task's credit hours (this affects the TA's total workload)
                workload_record = WorkloadRecord.objects.create(
                    user=task.assignee,
                    task=task,
                    hours=task.credit_hours,  # Using credit_hours for official workload
                    date=timezone.now().date(),
                    description=f"Task: {task.title} (Credit hours: {task.credit_hours}, Hours spent: {hours_spent})"
                )
                
                print(f"Workload record created: {workload_record.id} - Added {task.credit_hours} hours to {task.assignee.full_name}'s workload")
                
                # If needed, you could use hours_spent instead:
                # workload_record = WorkloadRecord.objects.create(
                #     user=task.assignee,
                #     task=task,
                #     hours=hours_spent,  # Using TA's reported hours
                #     date=timezone.now().date(),
                #     description=f"Task: {task.title}"
                # )
                
            except TaskCompletion.DoesNotExist:
                print(f"Warning: Task completion not found for task {task.id}. Using only credit hours.")
                
                workload_record = WorkloadRecord.objects.create(
                    user=task.assignee,
                    task=task,
                    hours=task.credit_hours,
                    date=timezone.now().date(),
                    description=f"Task: {task.title} (Credit hours only)"
                )
                
                print(f"Workload record created: {workload_record.id} - Added {task.credit_hours} hours to {task.assignee.full_name}'s workload")
        
        # Send email notification to TA
        status_text = "approved" if is_approved else "rejected"
        try:
            # First check if the email is valid
            ta_email = task.assignee.email
            if ta_email and '@' in ta_email and '.' in ta_email:
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
                    [ta_email],
                    fail_silently=True,  # Change to True to prevent errors
                )
            else:
                print(f"Invalid TA email: {ta_email}, skipping notification")
        except Exception as e:
            # Log the error but don't stop the API response
            print(f"Email notification error: {str(e)}")
        
        return Response({"status": status_text}, status=status.HTTP_200_OK)
