from django.db import models
from django.contrib.auth.models import User

class Course(models.Model):
    code = models.CharField(max_length=10)  # Örn: CS319
    name = models.CharField(max_length=100)
    instructor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='taught_courses')
    teaching_assistants = models.ManyToManyField(User, related_name='assisted_courses', through='TAAssignment')

    def __str__(self):
        return f"{self.code} - {self.name}"

class TAAssignment(models.Model):
    ta = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ta_assignments')
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    hours_per_week = models.IntegerField()
    start_date = models.DateField()
    end_date = models.DateField()

    def __str__(self):
        return f"{self.ta.username} - {self.course.code}"

class LeaveRequest(models.Model):
    LEAVE_TYPES = [
        ('sick', 'Sick Leave'),
        ('vacation', 'Vacation Leave'),
        ('personal', 'Personal Leave'),
        ('other', 'Other')
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected')
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='leave_requests')
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    leave_type = models.CharField(max_length=20, choices=LEAVE_TYPES)
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='approved_leaves')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username}'s {self.leave_type} request for {self.course.code}"

class Exam(models.Model):
    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled')
    ]

    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    date = models.DateField()
    start_time = models.TimeField()
    duration = models.DurationField()
    location = models.CharField(max_length=100)
    required_proctors = models.IntegerField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_exams')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.course.code} Exam on {self.date}"

class ProctorAssignment(models.Model):
    STATUS_CHOICES = [
        ('assigned', 'Assigned'),
        ('confirmed', 'Confirmed'),
        ('declined', 'Declined'),
        ('swapped', 'Swapped')
    ]

    exam = models.ForeignKey(Exam, on_delete=models.CASCADE)
    proctor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='proctor_assignments')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='assigned')
    assigned_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='assigned_proctors')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.proctor.username} - {self.exam}"

class SwapRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected')
    ]

    requester_assignment = models.ForeignKey(ProctorAssignment, on_delete=models.CASCADE, related_name='swap_requests_made')
    target_assignment = models.ForeignKey(ProctorAssignment, on_delete=models.CASCADE, related_name='swap_requests_received')
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Swap request: {self.requester_assignment.proctor.username} ↔ {self.target_assignment.proctor.username}" 