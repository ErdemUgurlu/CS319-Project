from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.exceptions import ValidationError
from accounts.models import User, Classroom, Section, Department


class Exam(models.Model):
    """Model for exams that need proctors."""
    
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('PENDING', 'Pending'),
        ('SCHEDULED', 'Scheduled'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    ]
    
    EXAM_TYPE_CHOICES = [
        ('MIDTERM', 'Midterm'),
        ('FINAL', 'Final'),
        ('QUIZ', 'Quiz'),
        ('MAKEUP', 'Makeup'),
        ('OTHER', 'Other'),
    ]
    
    title = models.CharField(max_length=200)
    section = models.ForeignKey(
        Section,
        on_delete=models.CASCADE,
        related_name='exams'
    )
    exam_type = models.CharField(max_length=10, choices=EXAM_TYPE_CHOICES)
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    duration_minutes = models.IntegerField()  # Auto-calculated
    student_count = models.PositiveIntegerField()
    proctor_count_needed = models.PositiveIntegerField()
    room_count = models.PositiveIntegerField(default=1)
    student_list_file = models.FileField(upload_to='exam_student_lists/', blank=True, null=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='DRAFT')
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='created_exams'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    notes = models.TextField(blank=True)
    
    # Cross-department request fields
    is_cross_department = models.BooleanField(default=False)
    requested_from_department = models.ForeignKey(
        Department, 
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='requested_proctorings'
    )
    dean_office_request = models.BooleanField(default=False)
    dean_office_comments = models.TextField(blank=True)
    
    def save(self, *args, **kwargs):
        # Calculate duration in minutes
        if self.start_time and self.end_time:
            start_minutes = self.start_time.hour * 60 + self.start_time.minute
            end_minutes = self.end_time.hour * 60 + self.end_time.minute
            
            # Handle case where exam spans across midnight
            if end_minutes < start_minutes:
                end_minutes += 24 * 60
                
            self.duration_minutes = end_minutes - start_minutes
        
        super().save(*args, **kwargs)
    
    def clean(self):
        """Validate exam times."""
        if self.start_time and self.end_time:
            start_minutes = self.start_time.hour * 60 + self.start_time.minute
            end_minutes = self.end_time.hour * 60 + self.end_time.minute
            
            # Handle case where exam spans across midnight
            if end_minutes < start_minutes:
                end_minutes += 24 * 60
            
            if end_minutes <= start_minutes:
                raise ValidationError({'end_time': _('End time must be after start time.')})
    
    def __str__(self):
        return f"{self.section} - {self.title} ({self.date})"
    
    class Meta:
        ordering = ['date', 'start_time']


class ExamRoom(models.Model):
    """Model for tracking which classrooms are used for an exam."""
    
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='rooms')
    classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE)
    student_count = models.PositiveIntegerField()
    proctor_count = models.PositiveIntegerField(default=1)
    
    def __str__(self):
        return f"{self.exam.title} - {self.classroom}"
    
    class Meta:
        unique_together = ('exam', 'classroom')


class ProctorAssignment(models.Model):
    """Model for assigning TAs as proctors to exams."""
    
    STATUS_CHOICES = [
        ('ASSIGNED', 'Assigned'),
        ('CONFIRMED', 'Confirmed'),
        ('COMPLETED', 'Completed'),
        ('SWAPPED', 'Swapped'),
        ('DECLINED', 'Declined'),
    ]
    
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='proctor_assignments')
    exam_room = models.ForeignKey(
        ExamRoom,
        on_delete=models.CASCADE,
        related_name='proctor_assignments',
        null=True,
        blank=True
    )
    proctor = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='proctor_assignments',
        limit_choices_to={'role': 'TA'}
    )
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='ASSIGNED')
    assigned_at = models.DateTimeField(auto_now_add=True)
    assigned_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='assigned_proctorings'
    )
    confirmation_date = models.DateTimeField(null=True, blank=True)
    completion_notes = models.TextField(blank=True)
    
    # Flags for assignment constraints
    override_flag = models.BooleanField(default=False)
    override_reason = models.CharField(max_length=255, blank=True)
    
    # Swap related fields
    previous_proctor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='previous_proctor_assignments',
        limit_choices_to={'role': 'TA'}
    )
    swap_timestamp = models.DateTimeField(null=True, blank=True)
    swap_reason = models.CharField(max_length=255, blank=True)
    swap_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='initiated_swaps'
    )
    swap_depth = models.PositiveSmallIntegerField(default=0, help_text="Number of times this assignment has been swapped")
    
    def __str__(self):
        room_info = f" ({self.exam_room.classroom})" if self.exam_room else ""
        return f"{self.proctor.full_name} proctoring {self.exam.title}{room_info}"
    
    class Meta:
        unique_together = ('exam', 'proctor')


class SwapRequest(models.Model):
    """Model for handling proctor swap requests."""
    
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('ACCEPTED', 'Accepted'),
        ('REJECTED', 'Rejected'),
        ('CANCELLED', 'Cancelled'),
        ('FORCE_SWAP', 'Force Swap'),  # Used when staff initiates swap
        ('AUTO_SWAP', 'Automatic Swap'),  # Used for immediate swaps
    ]
    
    original_assignment = models.ForeignKey(
        ProctorAssignment,
        on_delete=models.CASCADE,
        related_name='swap_requests_as_original'
    )
    requested_proctor = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='swap_requests_as_target',
        limit_choices_to={'role': 'TA'}
    )
    requesting_proctor = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='swap_requests_as_requester'
    )
    reason = models.TextField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Staff initiated swap fields
    force_swap = models.BooleanField(default=False)
    force_swap_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='force_swaps',
        limit_choices_to={'role__in': ['STAFF', 'ADMIN']}
    )
    force_swap_reason = models.TextField(blank=True)
    
    # Auto swap fields
    is_auto_swap = models.BooleanField(default=False)
    is_cross_department = models.BooleanField(default=False)
    
    # Response fields
    response_date = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)
    
    # Constraint check results
    constraint_check_passed = models.BooleanField(null=True)
    constraint_check_details = models.JSONField(default=dict, blank=True)
    
    def __str__(self):
        return f"Swap: {self.requesting_proctor.full_name} → {self.requested_proctor.full_name} for {self.original_assignment.exam.title}"


class ProctorConstraint(models.Model):
    """Model for defining constraints that prevent certain TAs from being assigned to certain exams."""
    
    CONSTRAINT_TYPE_CHOICES = [
        ('PHD_REQUIRED', 'PhD Required for Grad Courses'),
        ('OWN_EXAM', 'Student in Course'),
        ('SCHEDULE_CONFLICT', 'Schedule Conflict'),
        ('LEAVE_DAY', 'Approved Leave'),
        ('OTHER', 'Other Constraint'),
    ]
    
    ta = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='proctor_constraints',
        limit_choices_to={'role': 'TA'}
    )
    exam = models.ForeignKey(
        Exam,
        on_delete=models.CASCADE,
        related_name='proctor_constraints',
        null=True,
        blank=True
    )  # If null, applies to all exams on the date
    constraint_date = models.DateField(null=True, blank=True)  # Used for date-specific constraints
    constraint_type = models.CharField(max_length=20, choices=CONSTRAINT_TYPE_CHOICES)
    description = models.TextField()
    can_override = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_constraints'
    )
    
    def __str__(self):
        exam_info = f" for {self.exam.title}" if self.exam else f" on {self.constraint_date}"
        return f"{self.get_constraint_type_display()} - {self.ta.full_name}{exam_info}"
    
    class Meta:
        unique_together = ('ta', 'exam', 'constraint_type')
