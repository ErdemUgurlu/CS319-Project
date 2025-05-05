from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.exceptions import ValidationError
from accounts.models import User, Section, TAAssignment
from datetime import datetime


class LeaveType(models.Model):
    """Model for defining types of leaves."""
    
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    requires_documentation = models.BooleanField(default=False)
    max_days_per_semester = models.PositiveIntegerField(default=0)  # 0 means no limit
    
    def __str__(self):
        return self.name


class LeaveRequest(models.Model):
    """Model for handling TA leave requests."""
    
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
        ('CANCELLED', 'Cancelled'),
    ]
    
    ta = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='leave_requests',
        limit_choices_to={'role': 'TA'}
    )
    leave_type = models.ForeignKey(
        LeaveType,
        on_delete=models.CASCADE,
        related_name='leave_requests'
    )
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.TextField()
    documentation = models.FileField(upload_to='leave_documents/', blank=True, null=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Approval information
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_leaves'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)
    
    def clean(self):
        """Validate leave request dates."""
        if self.start_date and self.end_date and self.start_date > self.end_date:
            raise ValidationError({'end_date': _('End date must be after start date.')})
        
        # Check if required documentation is uploaded
        if self.leave_type and self.leave_type.requires_documentation and not self.documentation:
            raise ValidationError({'documentation': _(f'Documentation is required for {self.leave_type.name} leave.')})
    
    def __str__(self):
        return f"{self.ta.full_name} - {self.leave_type.name} ({self.start_date} to {self.end_date})"
    
    @property
    def duration_days(self):
        """Calculate the duration of leave in days."""
        if self.start_date and self.end_date:
            # Add 1 to include both start and end dates
            return (self.end_date - self.start_date).days + 1
        return 0
    
    class Meta:
        ordering = ['-start_date', '-created_at']


class LeaveImpact(models.Model):
    """Model for tracking how leave requests impact TA assignments."""
    
    leave_request = models.ForeignKey(
        LeaveRequest,
        on_delete=models.CASCADE,
        related_name='impacts'
    )
    ta_assignment = models.ForeignKey(
        TAAssignment,
        on_delete=models.CASCADE,
        related_name='leave_impacts'
    )
    instructor_notified = models.BooleanField(default=False)
    notification_date = models.DateTimeField(null=True, blank=True)
    instructor_comments = models.TextField(blank=True)
    
    def __str__(self):
        return f"Impact of {self.leave_request} on {self.ta_assignment.section}"
    
    class Meta:
        unique_together = ('leave_request', 'ta_assignment')


class DateUnavailability(models.Model):
    """Model for tracking dates when TAs are unavailable due to approved leaves."""
    
    ta = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='unavailable_dates',
        limit_choices_to={'role': 'TA'}
    )
    date = models.DateField()
    reason = models.CharField(max_length=255)
    leave_request = models.ForeignKey(
        LeaveRequest,
        on_delete=models.CASCADE,
        related_name='unavailable_dates',
        null=True,
        blank=True
    )
    
    def __str__(self):
        return f"{self.ta.full_name} unavailable on {self.date}"
    
    class Meta:
        unique_together = ('ta', 'date')
        verbose_name = "Date Unavailability"
        verbose_name_plural = "Date Unavailabilities"
