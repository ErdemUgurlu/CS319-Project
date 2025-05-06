from django.db import models
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from accounts.models import User, Section


class Task(models.Model):
    """Task model for assignments given by instructors to TAs."""
    
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('IN_PROGRESS', 'In Progress'),
        ('WAITING_FOR_APPROVAL', 'Waiting for Approval'),
        ('COMPLETED', 'Completed'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]
    
    PRIORITY_CHOICES = [
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('URGENT', 'Urgent'),
    ]
    
    title = models.CharField(max_length=200)
    description = models.TextField()
    creator = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='created_tasks',
        limit_choices_to={'role': 'INSTRUCTOR'},
        null=True,
        blank=True
    )
    assignee = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='assigned_tasks',
        limit_choices_to={'role': 'TA'},
        null=True,
        blank=True
    )
    section = models.ForeignKey(
        Section,
        on_delete=models.CASCADE,
        related_name='tasks',
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    due_date = models.DateTimeField(default=timezone.now)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='MEDIUM')
    credit_hours = models.DecimalField(max_digits=4, decimal_places=2, default=0)
    
    def __str__(self):
        if self.assignee:
            return f"{self.title} - {self.section} - {self.assignee.full_name}"
        return f"{self.title} - {self.section} - Unassigned"
    
    class Meta:
        ordering = ['-due_date']


class TaskCompletion(models.Model):
    """TaskCompletion model to track completion of tasks by TAs."""
    
    task = models.OneToOneField(Task, on_delete=models.CASCADE, related_name='completion')
    completed_at = models.DateTimeField(auto_now_add=True)
    completion_note = models.TextField(blank=True)
    files = models.FileField(upload_to='task_submissions/', blank=True, null=True)
    hours_spent = models.DecimalField(max_digits=4, decimal_places=2, default=0)
    
    def __str__(self):
        return f"Completion of {self.task.title} by {self.task.assignee.full_name}"


class TaskReview(models.Model):
    """TaskReview model for instructor reviews of completed tasks."""
    
    task = models.OneToOneField(Task, on_delete=models.CASCADE, related_name='review')
    reviewer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='task_reviews',
        limit_choices_to={'role': 'INSTRUCTOR'}
    )
    review_date = models.DateTimeField(auto_now_add=True)
    is_approved = models.BooleanField(default=False)
    feedback = models.TextField(blank=True)
    
    def __str__(self):
        return f"Review of {self.task.title} by {self.reviewer.full_name}"
    
    def save(self, *args, **kwargs):
        # Update task status based on approval
        self.task.status = 'APPROVED' if self.is_approved else 'REJECTED'
        self.task.save()
        super().save(*args, **kwargs)


class TaskAttachment(models.Model):
    """TaskAttachment model for files attached to tasks."""
    
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(upload_to='task_attachments/')
    filename = models.CharField(max_length=255)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE)
    
    def __str__(self):
        return f"{self.filename} - {self.task.title}"
