from django.db import models
from django.utils.translation import gettext_lazy as _
from accounts.models import User, Section


class DutyType(models.Model):
    """Model for defining types of TA duties."""
    
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    
    def __str__(self):
        return self.name


class TADuty(models.Model):
    """Model for tracking TA duties and hours."""
    
    STATUS_CHOICES = [
        ('PENDING', 'Pending Approval'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]
    
    ta = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='duties',
        limit_choices_to={'role': 'TA'}
    )
    section = models.ForeignKey(
        Section,
        on_delete=models.CASCADE,
        related_name='ta_duties'
    )
    duty_type = models.ForeignKey(
        DutyType,
        on_delete=models.CASCADE,
        related_name='duties'
    )
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    minutes = models.IntegerField()  # Automatically calculated duration in minutes
    description = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Approval information
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_duties',
        limit_choices_to={'role': 'INSTRUCTOR'}
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)
    
    def save(self, *args, **kwargs):
        # Calculate minutes based on start and end time
        if self.start_time and self.end_time:
            start_minutes = self.start_time.hour * 60 + self.start_time.minute
            end_minutes = self.end_time.hour * 60 + self.end_time.minute
            
            # Handle case where duty spans across midnight
            if end_minutes < start_minutes:
                end_minutes += 24 * 60
                
            self.minutes = end_minutes - start_minutes
        
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.ta.full_name} - {self.duty_type.name} - {self.date}"
    
    class Meta:
        verbose_name = "TA Duty"
        verbose_name_plural = "TA Duties"
        ordering = ['-date', '-start_time']


class WorkloadCap(models.Model):
    """Model for defining workload caps for TAs."""
    
    PERIOD_CHOICES = [
        ('SEMESTER', 'Per Semester'),
        ('YEAR', 'Per Academic Year'),
    ]
    
    CAP_TYPE_CHOICES = [
        ('PROCTOR', 'Proctoring Hours'),
        ('DUTY', 'TA Duty Hours'),
        ('TOTAL', 'Total Workload'),
    ]
    
    cap_type = models.CharField(max_length=10, choices=CAP_TYPE_CHOICES)
    academic_level = models.CharField(
        max_length=20,
        choices=User.AcademicLevel.choices,
        null=True,
        blank=True
    )  # Optional, if null applies to all levels
    department_code = models.CharField(max_length=10, null=True, blank=True)  # Optional, if null applies to all departments
    period = models.CharField(max_length=10, choices=PERIOD_CHOICES, default='SEMESTER')
    hours = models.DecimalField(max_digits=6, decimal_places=2)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        scope = f"{self.academic_level} " if self.academic_level else ""
        scope += f"({self.department_code}) " if self.department_code else ""
        return f"{scope}{self.get_cap_type_display()} Cap: {self.hours} hours per {self.get_period_display()}"
    
    class Meta:
        unique_together = ('cap_type', 'academic_level', 'department_code', 'period')


class WorkloadSummary(models.Model):
    """Model for summarizing TA workload for a specific semester."""
    
    ta = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='workload_summaries',
        limit_choices_to={'role': 'TA'}
    )
    semester = models.CharField(max_length=10)
    year = models.IntegerField()
    duty_hours = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    proctor_hours = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    task_hours = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    total_hours = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    last_updated = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.ta.full_name} - {self.semester} {self.year} - Total: {self.total_hours} hours"
    
    class Meta:
        unique_together = ('ta', 'semester', 'year')
        verbose_name = "Workload Summary"
        verbose_name_plural = "Workload Summaries"
