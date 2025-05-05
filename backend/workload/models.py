from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator, MaxValueValidator
from accounts.models import User, Department
from django.utils import timezone


class WorkloadPolicy(models.Model):
    """
    Model for defining department-specific workload policies.
    """
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name='workload_policies'
    )
    academic_term = models.CharField(max_length=20, help_text="e.g. Fall 2023")
    
    # Maximum hours per week based on employment type and academic level
    max_hours_phd_full_time = models.PositiveIntegerField(
        default=20,
        help_text="Maximum weekly hours for Full-Time PhD TAs"
    )
    max_hours_phd_part_time = models.PositiveIntegerField(
        default=10,
        help_text="Maximum weekly hours for Part-Time PhD TAs"
    )
    max_hours_msc_full_time = models.PositiveIntegerField(
        default=15,
        help_text="Maximum weekly hours for Full-Time MSc TAs"
    )
    max_hours_msc_part_time = models.PositiveIntegerField(
        default=7,
        help_text="Maximum weekly hours for Part-Time MSc TAs"
    )
    max_hours_undergrad = models.PositiveIntegerField(
        default=10,
        help_text="Maximum weekly hours for Undergraduate TAs"
    )
    
    # Weights for different activities (hours multiplier)
    lecture_weight = models.FloatField(
        default=1.0,
        validators=[MinValueValidator(0.5), MaxValueValidator(2.0)],
        help_text="Weight multiplier for lecture hours"
    )
    lab_weight = models.FloatField(
        default=1.0,
        validators=[MinValueValidator(0.5), MaxValueValidator(2.0)],
        help_text="Weight multiplier for lab hours"
    )
    grading_weight = models.FloatField(
        default=1.0,
        validators=[MinValueValidator(0.5), MaxValueValidator(2.0)],
        help_text="Weight multiplier for grading hours"
    )
    office_hours_weight = models.FloatField(
        default=1.0,
        validators=[MinValueValidator(0.5), MaxValueValidator(2.0)],
        help_text="Weight multiplier for office hours"
    )
    
    # Special consideration for exam periods
    exam_period_multiplier = models.FloatField(
        default=1.5,
        validators=[MinValueValidator(1.0), MaxValueValidator(3.0)],
        help_text="Multiplier for workload during exam periods"
    )
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.department} - {self.academic_term}"
    
    class Meta:
        unique_together = ('department', 'academic_term')
    
    def get_max_hours_for_ta(self, ta):
        """
        Returns the appropriate maximum hours based on TA's academic level and employment type.
        """
        if ta.academic_level == 'PHD':
            if ta.employment_type == 'FULL_TIME':
                return self.max_hours_phd_full_time
            else:  # PART_TIME
                return self.max_hours_phd_part_time
        elif ta.academic_level == 'MASTERS':
            if ta.employment_type == 'FULL_TIME':
                return self.max_hours_msc_full_time
            else:  # PART_TIME
                return self.max_hours_msc_part_time
        else:  # Undergraduate or other
            return self.max_hours_undergrad


class TAWorkload(models.Model):
    """
    Model for tracking a TA's workload for a specific academic term.
    """
    ta = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='workloads',
        limit_choices_to={'role': 'TA'}
    )
    academic_term = models.CharField(max_length=20, help_text="e.g. Fall 2023")
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name='ta_workloads'
    )
    policy = models.ForeignKey(
        WorkloadPolicy,
        on_delete=models.SET_NULL,
        null=True,
        related_name='ta_workloads'
    )
    
    # Base hours allocation
    max_weekly_hours = models.PositiveIntegerField(
        default=20,
        help_text="Maximum allowed weekly hours for this TA"
    )
    
    # Required workload to complete (depends on employment type)
    required_workload_hours = models.FloatField(
        default=0.0,
        help_text="Total hours required to complete based on employment type"
    )
    
    # Tracking fields
    total_assigned_hours = models.FloatField(
        default=0.0,
        help_text="Total hours assigned across all activities"
    )
    current_weekly_hours = models.FloatField(
        default=0.0,
        help_text="Current weekly hours based on active assignments"
    )
    
    # Status fields
    is_overloaded = models.BooleanField(default=False)
    overload_approved = models.BooleanField(default=False)
    overload_approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_overloads'
    )
    overload_approved_date = models.DateTimeField(null=True, blank=True)
    
    # Notes
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.ta.full_name} - {self.academic_term} ({self.current_weekly_hours}/{self.max_weekly_hours} hrs)"
    
    def save(self, *args, **kwargs):
        # Set max_weekly_hours based on policy if available
        if self.policy:
            self.max_weekly_hours = self.policy.get_max_hours_for_ta(self.ta)
        
        # Set required_workload_hours based on employment type
        # Full-time TAs are required to complete twice the workload of part-time TAs
        standard_workload = 160  # Example: 160 hours per semester for part-time
        
        if self.ta.employment_type == 'FULL_TIME':
            self.required_workload_hours = standard_workload * 2
        else:  # PART_TIME or anything else
            self.required_workload_hours = standard_workload
        
        # Calculate if overloaded
        self.is_overloaded = self.current_weekly_hours > self.max_weekly_hours
        super().save(*args, **kwargs)
    
    class Meta:
        unique_together = ('ta', 'academic_term', 'department')


class WorkloadActivity(models.Model):
    """
    Model for recording specific workload activities for a TA.
    """
    ACTIVITY_TYPES = [
        ('LECTURE', 'Lecture Assistance'),
        ('LAB', 'Laboratory Session'),
        ('OFFICE_HOURS', 'Office Hours'),
        ('GRADING', 'Grading/Assessment'),
        ('PROCTORING', 'Exam Proctoring'),
        ('PREP', 'Course Preparation'),
        ('MEETING', 'Staff Meeting'),
        ('OTHER', 'Other Activity')
    ]
    
    RECURRING_PATTERNS = [
        ('ONCE', 'One-time'),
        ('DAILY', 'Daily'),
        ('WEEKLY', 'Weekly'),
        ('BIWEEKLY', 'Bi-weekly'),
        ('MONTHLY', 'Monthly'),
    ]
    
    workload = models.ForeignKey(
        TAWorkload,
        on_delete=models.CASCADE,
        related_name='activities'
    )
    
    activity_type = models.CharField(max_length=20, choices=ACTIVITY_TYPES)
    description = models.CharField(max_length=255)
    
    # Time tracking
    hours = models.FloatField(
        validators=[MinValueValidator(0.25)],
        help_text="Hours per occurrence"
    )
    weighted_hours = models.FloatField(
        help_text="Hours after applying policy weights"
    )
    
    # Recurrence
    is_recurring = models.BooleanField(default=False)
    recurrence_pattern = models.CharField(
        max_length=10,
        choices=RECURRING_PATTERNS,
        default='ONCE'
    )
    
    # Date range
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    
    # Course reference (optional)
    course_code = models.CharField(max_length=20, blank=True)
    section = models.CharField(max_length=10, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def save(self, *args, **kwargs):
        # Apply weight based on activity type and policy
        policy = self.workload.policy
        if policy:
            if self.activity_type == 'LECTURE':
                weight = policy.lecture_weight
            elif self.activity_type == 'LAB':
                weight = policy.lab_weight
            elif self.activity_type == 'GRADING':
                weight = policy.grading_weight
            elif self.activity_type == 'OFFICE_HOURS':
                weight = policy.office_hours_weight
            else:
                weight = 1.0
                
            # Check if within exam period and apply multiplier if needed
            # This would need a more sophisticated implementation to detect exam periods
            
            self.weighted_hours = self.hours * weight
        else:
            self.weighted_hours = self.hours
            
        super().save(*args, **kwargs)
        
        # Update the parent workload totals
        self.update_workload_totals()
    
    def update_workload_totals(self):
        """Update the total workload hours for the TA."""
        workload = self.workload
        
        # Calculate weekly hours based on recurring pattern
        activities = WorkloadActivity.objects.filter(workload=workload)
        weekly_hours = 0
        
        for activity in activities:
            # Convert to weekly equivalent based on recurrence pattern
            if activity.recurrence_pattern == 'WEEKLY':
                weekly_hours += activity.weighted_hours
            elif activity.recurrence_pattern == 'DAILY':
                weekly_hours += activity.weighted_hours * 5  # Assuming 5-day work week
            elif activity.recurrence_pattern == 'BIWEEKLY':
                weekly_hours += activity.weighted_hours / 2
            elif activity.recurrence_pattern == 'MONTHLY':
                weekly_hours += activity.weighted_hours / 4
            elif activity.recurrence_pattern == 'ONCE':
                # Distributed across term (assumed to be 16 weeks)
                if activity.start_date and activity.end_date:
                    weekly_hours += activity.weighted_hours / 16
                else:
                    weekly_hours += activity.weighted_hours / 16
                    
        # Update workload with calculated hours
        workload.current_weekly_hours = weekly_hours
        workload.total_assigned_hours = sum(a.weighted_hours for a in activities)
        workload.save()
    
    def __str__(self):
        return f"{self.description} - {self.hours} hrs ({self.activity_type})"


class WorkloadRecord(models.Model):
    """
    Model for recording individual workload entries for tasks.
    Used to track completed and approved task hours for TAs.
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='workload_records'
    )
    task = models.ForeignKey(
        'tasks.Task',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='workload_records'
    )
    hours = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(0.0)]
    )
    date = models.DateField()
    description = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.user.full_name} - {self.description} ({self.hours} hrs)"


class WorkloadManualAdjustment(models.Model):
    """
    Model for recording manual adjustments to TA workloads by instructors.
    """
    ta = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='workload_adjustments',
        limit_choices_to={'role': 'TA'}
    )
    instructor = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='ta_workload_adjustments',
        limit_choices_to={'role': 'INSTRUCTOR'}
    )
    hours = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        help_text="Positive for addition, negative for reduction"
    )
    reason = models.TextField()
    date = models.DateField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        adjustment_type = "increased" if self.hours >= 0 else "decreased"
        return f"{self.ta.full_name}'s workload {adjustment_type} by {abs(self.hours)} hrs by {self.instructor.full_name}"
