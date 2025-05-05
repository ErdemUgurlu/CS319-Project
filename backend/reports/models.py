from django.db import models
from django.utils.translation import gettext_lazy as _
from accounts.models import User, Department


class Report(models.Model):
    """Model for storing generated reports."""
    
    REPORT_TYPE_CHOICES = [
        ('TA_WORKLOAD', 'TA Workload Summary'),
        ('COURSE_DUTY', 'Course TA Duty Totals'),
        ('DEPT_UTIL', 'Department Utilization'),
        ('PROCTOR_STATS', 'Proctoring Statistics'),
        ('AUDIT_LOG', 'Audit Log Report'),
        ('CUSTOM', 'Custom Report'),
    ]
    
    FORMAT_CHOICES = [
        ('PDF', 'PDF'),
        ('CSV', 'CSV'),
        ('XLSX', 'Excel'),
    ]
    
    title = models.CharField(max_length=255)
    report_type = models.CharField(max_length=15, choices=REPORT_TYPE_CHOICES)
    format = models.CharField(max_length=4, choices=FORMAT_CHOICES)
    parameters = models.JSONField(null=True, blank=True)
    file = models.FileField(upload_to='reports/')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True)
    semester = models.CharField(max_length=10, blank=True)
    year = models.IntegerField(null=True, blank=True)
    
    def __str__(self):
        return f"{self.title} ({self.get_report_type_display()}) - {self.created_at.strftime('%Y-%m-%d')}"
    
    class Meta:
        ordering = ['-created_at']


class SystemParameter(models.Model):
    """Model for system-wide parameters that can be configured by admins."""
    
    PARAMETER_TYPE_CHOICES = [
        ('TEXT', 'Text'),
        ('NUMBER', 'Number'),
        ('BOOLEAN', 'Boolean'),
        ('JSON', 'JSON'),
        ('DATE', 'Date'),
    ]
    
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField()
    parameter_type = models.CharField(max_length=10, choices=PARAMETER_TYPE_CHOICES)
    value_text = models.TextField(blank=True, null=True)
    value_number = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    value_boolean = models.BooleanField(blank=True, null=True)
    value_json = models.JSONField(blank=True, null=True)
    value_date = models.DateField(blank=True, null=True)
    last_updated = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        limit_choices_to={'role': 'ADMIN'}
    )
    
    def __str__(self):
        return f"{self.name}"
    
    @property
    def value(self):
        """Return the value based on parameter type."""
        if self.parameter_type == 'TEXT':
            return self.value_text
        elif self.parameter_type == 'NUMBER':
            return self.value_number
        elif self.parameter_type == 'BOOLEAN':
            return self.value_boolean
        elif self.parameter_type == 'JSON':
            return self.value_json
        elif self.parameter_type == 'DATE':
            return self.value_date
        return None


class CurrentSemester(models.Model):
    """Model for tracking the current semester for the system."""
    
    SEMESTER_CHOICES = [
        ('FALL', 'Fall'),
        ('SPRING', 'Spring'),
        ('SUMMER', 'Summer'),
    ]
    
    semester = models.CharField(max_length=10, choices=SEMESTER_CHOICES)
    year = models.IntegerField()
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def save(self, *args, **kwargs):
        """Override save to ensure only one active semester."""
        if self.is_active:
            # Set all other semesters as inactive
            CurrentSemester.objects.exclude(pk=self.pk).update(is_active=False)
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.get_semester_display()} {self.year}"
    
    class Meta:
        ordering = ['-year', 'semester']
        verbose_name = "Current Semester"
        verbose_name_plural = "Current Semesters"


class ImportLog(models.Model):
    """Model for tracking data imports."""
    
    IMPORT_TYPE_CHOICES = [
        ('COURSE', 'Course Offerings'),
        ('STUDENT', 'Student Registrations'),
        ('USER', 'User Data'),
        ('TA_ASSIGNMENT', 'TA Assignments'),
        ('OTHER', 'Other Import'),
    ]
    
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
        ('PARTIAL', 'Partially Completed'),
    ]
    
    import_type = models.CharField(max_length=15, choices=IMPORT_TYPE_CHOICES)
    file = models.FileField(upload_to='imports/')
    imported_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    start_time = models.DateTimeField(auto_now_add=True)
    end_time = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='PENDING')
    record_count = models.IntegerField(default=0)
    success_count = models.IntegerField(default=0)
    error_count = models.IntegerField(default=0)
    error_log = models.TextField(blank=True)
    
    def __str__(self):
        return f"{self.get_import_type_display()} - {self.start_time.strftime('%Y-%m-%d %H:%M')}"
    
    class Meta:
        ordering = ['-start_time']
