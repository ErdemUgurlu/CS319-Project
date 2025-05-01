from django.db import models
from django.utils import timezone
from django.contrib.auth.models import User

# Create your models here.

class TA(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    department = models.CharField(max_length=100)
    office_hours = models.TextField(blank=True)
    workload = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.user.get_full_name()} - {self.department}"

    def calculate_workload(self):
        task_workload = sum(task.estimated_hours for task in self.assigned_tasks.all())
        proctoring_workload = sum(3 for _ in self.proctored_exams.all())  # Assuming 3 hours per exam
        self.workload = task_workload + proctoring_workload
        self.save()
        return self.workload

    def is_available(self, date, time):
        # Check if TA is available at given date and time
        return not self.proctored_exams.filter(
            date=date,
            time=time
        ).exists()

    def get_upcoming_duties(self):
        return {
            'tasks': self.assigned_tasks.filter(
                status__in=['pending', 'in_progress'],
                due_date__gte=timezone.now().date()
            ),
            'proctoring': self.proctored_exams.filter(
                date__gte=timezone.now().date()
            )
        }

    class Meta:
        ordering = ['user__first_name']

class Task(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('overdue', 'Overdue'),
    ]

    TASK_TYPES = [
        ('grading', 'Assignment Grading'),
        ('lab_assistance', 'Lab Assistance'),
        ('tutorial', 'Tutorial Session'),
        ('office_hours', 'Office Hours'),
        ('other', 'Other'),
    ]

    title = models.CharField(max_length=200)
    description = models.TextField()
    assigned_to = models.ForeignKey(TA, on_delete=models.CASCADE, related_name='assigned_tasks')
    assigned_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_tasks')
    course = models.CharField(max_length=100)
    task_type = models.CharField(max_length=20, choices=TASK_TYPES, default='other')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    due_date = models.DateTimeField()
    completion_notes = models.TextField(blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.title} - {self.assigned_to.user.get_full_name()}"

    def save(self, *args, **kwargs):
        if self.status != 'completed':
            if self.due_date < timezone.now():
                self.status = 'overdue'
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        # Update workload when task is deleted
        if self.status != 'completed':
            self.assigned_to.workload -= self.estimated_hours
            self.assigned_to.save()
        super().delete(*args, **kwargs)

    class Meta:
        ordering = ['-created_at']

class Exam(models.Model):
    title = models.CharField(max_length=200)
    course = models.CharField(max_length=100)
    date = models.DateTimeField()
    location = models.CharField(max_length=200)
    duration = models.DurationField()
    proctor = models.ForeignKey(TA, on_delete=models.SET_NULL, null=True, related_name='proctored_exams')
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, null=True)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.title} - {self.course}"

    class Meta:
        ordering = ['date']
