from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.utils.translation import gettext_lazy as _
from django.core.validators import RegexValidator


class UserManager(BaseUserManager):
    """Custom user manager for the TA Management System."""
    
    def create_user(self, email, password=None, **extra_fields):
        """Create and save a User with the given email and password."""
        if not email:
            raise ValueError(_('The Email field must be set'))
        email = self.normalize_email(email)
        
        # Validate Bilkent email domain except for admins or superusers
        is_superuser = extra_fields.get('is_superuser', False)
        is_admin = extra_fields.get('role') == 'ADMIN'
        if not email.endswith('bilkent.edu.tr') and not (is_superuser or is_admin):
            raise ValueError(_('Email must be a valid Bilkent University email address'))
        
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        """Create and save a SuperUser with the given email and password."""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('role', 'ADMIN')
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError(_('Superuser must have is_staff=True.'))
        if extra_fields.get('is_superuser') is not True:
            raise ValueError(_('Superuser must have is_superuser=True.'))
        
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    """Custom User model for the TA Management System."""
    
    # Role choices based on the specified actors
    class Role(models.TextChoices):
        TA = 'TA', _('Teaching Assistant')
        INSTRUCTOR = 'INSTRUCTOR', _('Course Instructor')
        STAFF = 'STAFF', _('Authorized Staff')
        DEAN_OFFICE = 'DEAN_OFFICE', _('Dean Office')
        ADMIN = 'ADMIN', _('Admin')
    
    # Academic level choices for TAs
    class AcademicLevel(models.TextChoices):
        MASTERS = 'MASTERS', _('Masters')
        PHD = 'PHD', _('PhD')
        NOT_APPLICABLE = 'NOT_APPLICABLE', _('Not Applicable')
    
    # Department choices
    class Department(models.TextChoices):
        CS = 'CS', _('Computer Science')
        IE = 'IE', _('Industrial Engineering')
        OTHER = 'OTHER', _('Other')
    
    # Employment type choices for TAs
    class EmploymentType(models.TextChoices):
        FULL_TIME = 'FULL_TIME', _('Full-Time')
        PART_TIME = 'PART_TIME', _('Part-Time')
        NOT_APPLICABLE = 'NOT_APPLICABLE', _('Not Applicable')
    
    # Redefining the username to make it optional
    username = models.CharField(max_length=150, unique=True, null=True, blank=True)
    
    # Required fields
    email = models.EmailField(_('email address'), unique=True)
    first_name = models.CharField(_('first name'), max_length=150)
    last_name = models.CharField(_('last name'), max_length=150)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.TA)
    department = models.CharField(max_length=10, choices=Department.choices, default=Department.OTHER)
    
    # Phone field with validation for Turkish numbers
    phone_regex = RegexValidator(
        regex=r'^\+?90?\d{10}$',
        message=_("Phone number must be entered in the format: '+905xxxxxxxxx' or '05xxxxxxxxx'.")
    )
    phone = models.CharField(validators=[phone_regex], max_length=15)
    
    # Optional fields
    iban = models.CharField(_('IBAN'), max_length=34, blank=True, null=True)
    academic_level = models.CharField(
        max_length=20, 
        choices=AcademicLevel.choices, 
        default=AcademicLevel.NOT_APPLICABLE
    )
    employment_type = models.CharField(
        max_length=20,
        choices=EmploymentType.choices,
        default=EmploymentType.NOT_APPLICABLE,
        help_text=_("Employment type affects workload requirement: Full-time requires twice the workload of part-time")
    )
    
    # Approval and verification fields
    is_approved = models.BooleanField(default=False)
    email_verified = models.BooleanField(default=False)
    
    # Password fields
    temp_password = models.CharField(max_length=128, blank=True, null=True)
    temp_password_expiry = models.DateTimeField(blank=True, null=True)
    
    # Account status fields
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)
    
    # Set login field to email
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name', 'role', 'phone']
    
    # Use custom user manager
    objects = UserManager()
    
    def save(self, *args, **kwargs):
        """Override save method to generate username if not provided."""
        if not self.username:
            # Create a username based on email
            self.username = self.email.split('@')[0]
        
        # Set employment_type to NOT_APPLICABLE for non-TA users
        if self.role != 'TA' and self.employment_type != self.EmploymentType.NOT_APPLICABLE:
            self.employment_type = self.EmploymentType.NOT_APPLICABLE
        
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.get_full_name()} ({self.email})"
    
    @property
    def full_name(self):
        """Return the full name of the user."""
        return f"{self.first_name} {self.last_name}"


class Student(models.Model):
    """Student model representing a student who may also be a TA."""
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='student_profile')
    student_id = models.CharField(max_length=20, unique=True)
    department_name = models.CharField(max_length=100)
    is_ta = models.BooleanField(default=False)
    
    def __str__(self):
        return f"{self.student_id} - {self.user.full_name}"


class Department(models.Model):
    """Department model for organizing courses and staff."""
    
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=10, unique=True)
    faculty = models.CharField(max_length=100)
    
    def __str__(self):
        return f"{self.code} - {self.name}"


class Course(models.Model):
    """Course model representing a university course."""
    
    department = models.ForeignKey(Department, on_delete=models.CASCADE)
    code = models.CharField(max_length=10)
    title = models.CharField(max_length=200)
    credit = models.DecimalField(max_digits=3, decimal_places=1)
    
    class Meta:
        unique_together = ('department', 'code')
    
    def __str__(self):
        return f"{self.department.code}{self.code} - {self.title}"


class Section(models.Model):
    """Section model representing a course offering."""
    
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    section_number = models.CharField(max_length=3)
    instructor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, 
                                  limit_choices_to={'role': 'INSTRUCTOR'})
    student_count = models.PositiveIntegerField(default=0)
    
    class Meta:
        unique_together = ('course', 'section_number')
    
    def __str__(self):
        return f"{self.course.department.code}{self.course.code}-{self.section_number}"


class TAAssignment(models.Model):
    """Model representing a TA assignment to a course section."""
    
    ta = models.ForeignKey(User, on_delete=models.CASCADE, limit_choices_to={'role': 'TA'})
    section = models.ForeignKey(Section, on_delete=models.CASCADE)
    assigned_date = models.DateField(auto_now_add=True)
    
    class Meta:
        unique_together = ('ta', 'section')
    
    def __str__(self):
        return f"{self.ta.full_name} - {self.section}"


class Classroom(models.Model):
    """Classroom model for exam scheduling."""
    
    building = models.CharField(max_length=50)
    room_number = models.CharField(max_length=10)
    capacity = models.PositiveIntegerField()
    
    class Meta:
        unique_together = ('building', 'room_number')
    
    def __str__(self):
        return f"{self.building}-{self.room_number} (Capacity: {self.capacity})"


class WeeklySchedule(models.Model):
    """Weekly schedule for TAs, showing when they have classes (to prevent proctoring assignments during these times)."""
    
    DAY_CHOICES = [
        ('MON', 'Monday'),
        ('TUE', 'Tuesday'),
        ('WED', 'Wednesday'),
        ('THU', 'Thursday'),
        ('FRI', 'Friday'),
        ('SAT', 'Saturday'),
        ('SUN', 'Sunday'),
    ]
    
    ta = models.ForeignKey(User, on_delete=models.CASCADE, limit_choices_to={'role': 'TA'})
    day = models.CharField(max_length=3, choices=DAY_CHOICES)
    start_time = models.TimeField()
    end_time = models.TimeField()
    description = models.CharField(max_length=200, blank=True, help_text="Course name or other details about this class hour")
    
    def __str__(self):
        return f"{self.ta.full_name} - {self.get_day_display()} {self.start_time} to {self.end_time}"


class AuditLog(models.Model):
    """Audit log for tracking system activities."""
    
    ACTION_CHOICES = [
        ('LOGIN', 'Login'),
        ('LOGOUT', 'Logout'),
        ('CREATE', 'Create'),
        ('UPDATE', 'Update'),
        ('DELETE', 'Delete'),
        ('APPROVE', 'Approve'),
        ('REJECT', 'Reject'),
        ('ASSIGN', 'Assign'),
        ('SWAP', 'Swap'),
        ('OVERRIDE', 'Override'),
        ('IMPORT', 'Import'),
    ]
    
    timestamp = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=10, choices=ACTION_CHOICES)
    object_type = models.CharField(max_length=50)
    object_id = models.IntegerField(null=True)
    description = models.TextField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    override_flag = models.BooleanField(default=False)
    
    def __str__(self):
        return f"{self.timestamp} - {self.user} - {self.action} - {self.object_type}"


class Exam(models.Model):
    """Model for course exams."""
    
    class ExamType(models.TextChoices):
        MIDTERM = 'MIDTERM', _('Midterm')
        FINAL = 'FINAL', _('Final')
        QUIZ = 'QUIZ', _('Quiz')
    
    class Status(models.TextChoices):
        WAITING_FOR_STUDENT_LIST = 'WAITING_FOR_STUDENT_LIST', _('Waiting for Student List')
        WAITING_FOR_PLACES = 'WAITING_FOR_PLACES', _('Waiting for Places')
        AWAITING_PROCTORS = 'AWAITING_PROCTORS', _('Awaiting Proctors')
        READY = 'READY', _('Ready')
    
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='exams')
    type = models.CharField(max_length=10, choices=ExamType.choices)
    date = models.DateTimeField()
    classroom = models.ForeignKey(Classroom, on_delete=models.SET_NULL, null=True, blank=True)
    proctor_count = models.PositiveIntegerField(default=1)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_exams')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    status = models.CharField(max_length=25, choices=Status.choices, default=Status.WAITING_FOR_STUDENT_LIST)
    student_count = models.PositiveIntegerField(default=0, help_text="Automatically calculated from the student list file if provided")
    student_list_file = models.FileField(upload_to='exam_student_lists/', null=True, blank=True, 
                                        help_text="Excel file containing the list of students for this exam")
    has_student_list = models.BooleanField(default=False, help_text="Indicates if a student list has been uploaded")
    
    class Meta:
        ordering = ['date']
        verbose_name = 'Exam'
        verbose_name_plural = 'Exams'
    
    def save(self, *args, **kwargs):
        """Override save method to ensure status transitions happen correctly."""
        
        status_changed_by_this_method = False
        # Update status to AWAITING_PROCTORS if a classroom is assigned, regardless of current status
        if self.classroom:
            # Instead of checking just WAITING_FOR_PLACES, allow any status to update when classroom is assigned
            # if self.status == self.Status.WAITING_FOR_PLACES: 
            old_status = self.status
            self.status = self.Status.AWAITING_PROCTORS
            
            # Only mark as changed if status actually changed
            if old_status != self.status:
                status_changed_by_this_method = True
            
        if status_changed_by_this_method:
            update_fields = kwargs.get('update_fields')
            if update_fields is not None:
                # Ensure 'status' is in update_fields if it was changed here
                # and the caller specified update_fields.
                update_fields = set(update_fields)
                update_fields.add('status')
                kwargs['update_fields'] = list(update_fields)
            # If update_fields is None, super().save() will do a full save,
            # which will include the status change.
            
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.course} - {self.get_type_display()} on {self.date.strftime('%Y-%m-%d %H:%M')}"
    
    @property
    def status_display(self):
        return self.get_status_display()


# TA-Instructor relation model
class InstructorTAAssignment(models.Model):
    """Model for tracking which TAs are assigned to which instructors."""
    instructor = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='assigned_tas',
        limit_choices_to={'role': 'INSTRUCTOR'}
    )
    ta = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='assigned_to_instructor',
        limit_choices_to={'role': 'TA'}
    )
    assigned_at = models.DateTimeField(auto_now_add=True)
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name='instructor_ta_assignments'
    )
    
    class Meta:
        unique_together = ('instructor', 'ta')
        verbose_name = "Instructor-TA Assignment"
        verbose_name_plural = "Instructor-TA Assignments"
    
    def __str__(self):
        return f"{self.instructor.full_name} -> {self.ta.full_name}"
