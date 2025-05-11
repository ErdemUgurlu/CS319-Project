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
import logging

from accounts.models import User, InstructorTAAssignment
from .models import Task, TaskCompletion, TaskReview
from .serializers import TaskSerializer

logger = logging.getLogger(__name__)


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
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None  # Disable pagination for this view
    
    def get_queryset(self):
        # Return tasks where the user is either the assignee or creator
        return Task.objects.filter(
            Q(assignee=self.request.user) | Q(creator=self.request.user)
        ).order_by('-created_at')
    
    def create(self, request, *args, **kwargs):
        # Check if assignee ID is provided and belongs to instructor's TAs
        if request.user.role == 'INSTRUCTOR' and 'assigned_to' in request.data and request.data['assigned_to']:
            assignee_id = request.data['assigned_to']
            try:
                # Check if the TA exists and has the TA role
                ta = User.objects.get(id=assignee_id, role='TA')
                
                # Check if this TA is assigned to this instructor
                assigned_ta_exists = InstructorTAAssignment.objects.filter(
                    instructor=request.user,
                    ta_id=assignee_id
                ).exists()
                
                print(f"MyTasksView.create - TA assigned to instructor: {assigned_ta_exists}")
                
                if not assigned_ta_exists:
                    return Response(
                        {"error": "You can only assign tasks to your own TAs"},
                        status=status.HTTP_403_FORBIDDEN
                    )
            except User.DoesNotExist:
                return Response(
                    {"error": "TA not found"},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        # Proceed with the normal create flow
        return super().create(request, *args, **kwargs)
        
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
    serializer_class = TaskSerializer
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
                # Check if the TA exists and has the TA role
                try:
                    ta = User.objects.get(id=assignee_id, role='TA')
                    
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
                except User.DoesNotExist:
                    return Response(
                        {"error": "TA not found"},
                        status=status.HTTP_404_NOT_FOUND
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
        if task.status != 'IN_PROGRESS':
            return Response(
                {"error": f"Task cannot be marked as completed because its status is {task.status}. Tasks must be in 'IN_PROGRESS' status to be completed. Please accept the task first."},
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
        
        # If approved, update TA workload
        if is_approved and task.assignee and task.assignee.role == 'TA' and task.credit_hours > 0:
            try:
                # Ensure assignee is a TA and has a ta_profile
                ta_profile = task.assignee.ta_profile  # Use ta_profile
                current_workload = ta_profile.workload_credits if ta_profile.workload_credits is not None else 0
                
                # Log before update
                print(f"ReviewTaskView - Task approved - Updating TA workload for {task.assignee.full_name}")
                print(f"ReviewTaskView - Current workload: {current_workload} credits")
                print(f"ReviewTaskView - Adding {task.credit_hours} credits from task: {task.title} (ID: {task.id})")
                
                # Update workload credits
                ta_profile.workload_credits = current_workload + task.credit_hours
                ta_profile.save()
                
                # Log after update
                print(f"ReviewTaskView - Workload updated successfully - New workload: {ta_profile.workload_credits} credits")
                logger.info(f"TA {task.assignee.username}'s workload_credits updated from {current_workload} to {ta_profile.workload_credits} by adding {task.credit_hours} credits from task {task.id}.")
            except User.ta_profile.RelatedObjectDoesNotExist:  # Correct exception for OneToOneField
                error_msg = f"TAProfile not found for TA {task.assignee.username} with ID {task.assignee.id}. Cannot update workload."
                print(f"ReviewTaskView ERROR - {error_msg}")
                logger.error(error_msg)
            except AttributeError: # If task.assignee doesn't have ta_profile (e.g. not a TA or profile missing)
                error_msg = f"User {task.assignee.username} (ID: {task.assignee.id}) is not a TA or has no TAProfile. Cannot update workload."
                print(f"ReviewTaskView ERROR - {error_msg}")
                logger.error(error_msg)
            except Exception as e:
                error_msg = f"Error updating workload for TA {task.assignee.username} (ID: {task.assignee.id}): {str(e)}"
                print(f"ReviewTaskView ERROR - {error_msg}")
                logger.error(error_msg)
        elif is_approved and task.assignee and task.credit_hours <= 0:
            print(f"ReviewTaskView - Task approved but no credits to add: task.credit_hours = {task.credit_hours}")
            logger.info(f"Task {task.id} approved for TA {task.assignee.username} but credit_hours is {task.credit_hours}, so no workload update needed.")
        elif not is_approved:
            print(f"ReviewTaskView - Task rejected, no workload update needed.")
        
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


class AcceptTaskView(APIView):
    """
    API endpoint for TAs to accept a task, changing its status to IN_PROGRESS.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, task_id):
        # Check if the user is a TA
        if request.user.role != 'TA':
            return Response(
                {"error": "Only TAs can accept tasks."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        task = get_object_or_404(Task, id=task_id)

        # Check if the task is assigned to the current user
        if task.assignee != request.user:
            return Response(
                {"error": "You can only accept tasks assigned to you."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Check if task is in PENDING state
        if task.status != 'PENDING':
            return Response(
                {"error": f"Task cannot be accepted. Its status is currently '{task.get_status_display()}'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update task status to IN_PROGRESS
        task.status = 'IN_PROGRESS'
        task.save()
        logger.info(f"Task {task.id} ('{task.title}') accepted by TA {request.user.email}. Status changed to IN_PROGRESS.")

        # Send email notification to TA (confirmation)
        try:
            ta_email = request.user.email
            if ta_email and '@' in ta_email and '.' in ta_email:
                subject_ta = f"Task Accepted: {task.title}"
                message_ta = f"""
                Dear {request.user.full_name},

                You have successfully accepted the task: "{task.title}".
                Its status is now IN PROGRESS.

                You can view and update this task in the TA Management System.
                """
                send_mail(
                    subject_ta,
                    message_ta,
                    settings.DEFAULT_FROM_EMAIL,
                    [ta_email],
                    fail_silently=True,
                )
                logger.info(f"AcceptTaskView: Confirmation email sent to TA {ta_email} for task {task.id}")
        except Exception as e:
            logger.error(f"AcceptTaskView: Error sending acceptance confirmation email to TA {request.user.email} for task {task.id}: {str(e)}")

        # Send email notification to Instructor
        if task.creator:
            try:
                instructor_email = task.creator.email
                if instructor_email and '@' in instructor_email and '.' in instructor_email:
                    subject_instructor = f"Task Started: {task.title} by {request.user.full_name}"
                    message_instructor = f"""
                    Dear {task.creator.full_name},

                    The TA {request.user.full_name} has accepted and started working on the task:
                    Task Title: {task.title}
                    Assigned TA: {request.user.full_name}
                    Status: IN PROGRESS

                    You can monitor this task in the TA Management System.
                    """
                    send_mail(
                        subject_instructor,
                        message_instructor,
                        settings.DEFAULT_FROM_EMAIL,
                        [instructor_email],
                        fail_silently=True,
                    )
                    logger.info(f"AcceptTaskView: Notification email sent to Instructor {instructor_email} for task {task.id}")
            except Exception as e:
                logger.error(f"AcceptTaskView: Error sending start notification email to Instructor {task.creator.email} for task {task.id}: {str(e)}")

        return Response({"status": "IN_PROGRESS", "message": "Task accepted successfully and status updated to IN PROGRESS."}, status=status.HTTP_200_OK)


# Commented out TaskComment view as the model/serializer may not exist
# class TaskCommentListCreateView(generics.ListCreateAPIView):
#     serializer_class = TaskSerializer # Corrected from TaskCommentSerializer
#     permission_classes = [permissions.IsAuthenticated, IsTaskRelevantUser]

#     def get_queryset(self):
#         task_id = self.kwargs.get('task_id')
#         task = get_object_or_404(Task, id=task_id)
#         self.check_object_permissions(self.request, task)
#         return TaskComment.objects.filter(task=task).order_by('created_at')

#     def perform_create(self, serializer):
#         task_id = self.kwargs.get('task_id')
#         task = get_object_or_404(Task, id=task_id)
#         self.check_object_permissions(self.request, task)
#         serializer.save(task=task, author=self.request.user)


class CreateTaskView(generics.CreateAPIView):
    """
    API endpoint özellikle yeni görev oluşturmak için.
    """
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]
    
    def create(self, request, *args, **kwargs):
        # Check if assignee ID is provided and belongs to instructor's TAs
        if request.user.role == 'INSTRUCTOR' and 'assigned_to' in request.data and request.data['assigned_to']:
            assignee_id = request.data.get('assigned_to')
            try:
                # Check if the TA exists and has the TA role
                ta = User.objects.get(id=assignee_id, role='TA')
                
                # Check if this TA is assigned to this instructor
                assigned_ta_exists = InstructorTAAssignment.objects.filter(
                    instructor=request.user,
                    ta_id=assignee_id
                ).exists()
                
                print(f"CreateTaskView.create - TA assigned to instructor: {assigned_ta_exists}")
                
                if not assigned_ta_exists:
                    return Response(
                        {"error": "You can only assign tasks to your own TAs"},
                        status=status.HTTP_403_FORBIDDEN
                    )
            except User.DoesNotExist:
                return Response(
                    {"error": "TA not found"},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        # Proceed with the normal create flow
        return super().create(request, *args, **kwargs)
    
    def perform_create(self, serializer):
        # Set the current user as the creator of the task
        print(f"CreateTaskView.perform_create - user: {self.request.user}")
        print(f"CreateTaskView.perform_create - request data: {self.request.data}")
        print(f"CreateTaskView.perform_create - assigned_to in request: {self.request.data.get('assigned_to')}")
        serializer.save(creator=self.request.user)
        
        # Log the created task data
        task = serializer.instance
        print(f"CreateTaskView.perform_create - created task: {task.id}, title: {task.title}")
        print(f"CreateTaskView.perform_create - assignee: {task.assignee}, creator: {task.creator}")
        
        # If task is assigned to a TA, send notification email
        if task.assignee and task.assignee.role == 'TA':
            try:
                # Check if email is valid
                ta_email = task.assignee.email
                if ta_email and '@' in ta_email and '.' in ta_email:
                    # Send task assignment notification to TA
                    print(f"CreateTaskView.perform_create - sending notification to TA: {ta_email}")
                    
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
                    
                    print(f"CreateTaskView.perform_create - notification email sent to {ta_email}")
                else:
                    print(f"CreateTaskView.perform_create - Invalid TA email: {ta_email}, skipping notification")
            except Exception as e:
                # Log the error but don't stop the API response
                print(f"CreateTaskView.perform_create - Email notification error: {str(e)}")
