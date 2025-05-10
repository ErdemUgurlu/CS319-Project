from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.utils.translation import gettext_lazy as _
from django.core.validators import RegexValidator
from django.db.models.signals import post_save
from django.dispatch import receiver


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
    bilkent_id = models.IntegerField(_('Bilkent ID'), unique=True, null=True, blank=True)
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
    REQUIRED_FIELDS = ['first_name', 'last_name', 'role', 'phone', 'bilkent_id']
    
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

    def is_student_in_course(self, course):
        """Check if the user is enrolled as a student in a given course."""
        # This should be implemented according to how students are tracked in courses
        # For now, returning False as placeholder
        # In a real implementation, this would check a StudentEnrollment model or similar
        return False


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
    
    class CourseLevel(models.TextChoices):
        UNDERGRADUATE = 'UNDERGRADUATE', 'Undergraduate'
        GRADUATE = 'GRADUATE', 'Graduate'
        PHD = 'PHD', 'PhD'

    level = models.CharField(
        max_length=20,
        choices=CourseLevel.choices,
        default=CourseLevel.UNDERGRADUATE
    )

    class Meta:
        unique_together = ('department', 'code')
    
    def __str__(self):
        return f"{self.department.code}{self.code} - {self.title}"


class Section(models.Model):
    """Section model representing a course offering."""
    
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='sections',)
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
        AWAITING_DEAN_CROSS_APPROVAL = 'AWAITING_DEAN_CROSS_APPROVAL', _('Awaiting Dean Approval for Cross-Departmental')
        AWAITING_CROSS_DEPARTMENT_PROCTORS = 'AWAITING_CROSS_DEPARTMENT_PROCTORS', _('Awaiting Cross-Department Proctors')
        READY = 'READY', _('Ready')
    
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='exams')
    type = models.CharField(max_length=10, choices=ExamType.choices)
    date = models.DateTimeField()
    duration = models.PositiveIntegerField(default=120, help_text="Duration of the exam in minutes")
    classroom = models.ForeignKey(Classroom, on_delete=models.SET_NULL, null=True, blank=True)
    proctor_count = models.PositiveIntegerField(default=1)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_exams')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    status = models.CharField(max_length=50, choices=Status.choices, default=Status.WAITING_FOR_STUDENT_LIST)
    student_count = models.PositiveIntegerField(default=0, help_text="Automatically calculated from the student list file if provided")
    student_list_file = models.FileField(upload_to='exam_student_lists/', null=True, blank=True, 
                                        help_text="Excel file containing the list of students for this exam")
    has_student_list = models.BooleanField(default=False, help_text="Indicates if a student list has been uploaded")
    helping_department_code = models.CharField(max_length=10, null=True, blank=True, help_text="Department code of the department helping with proctors, if cross-departmental request is approved.")
    
    class Meta:
        ordering = ['date']
        verbose_name = 'Exam'
        verbose_name_plural = 'Exams'
    
    def save(self, *args, **kwargs):
        """Override save method to ensure status transitions happen correctly."""
        
        # Check if this is an update and if 'classroom' is one of the fields being updated.
        # Or if it's a new instance and classroom is set.
        is_new = self._state.adding
        original_status = self.status

        # Logic to set to AWAITING_PROCTORS when classroom is assigned.
        # This should only happen if the classroom is being set and the exam isn't already READY.
        if self.classroom and self.status != Exam.Status.READY:
            # If it's a new exam with a classroom, or if the classroom field has changed for an existing exam
            if is_new or (kwargs.get('update_fields') and 'classroom' in kwargs.get('update_fields')) or (not kwargs.get('update_fields') and self.pk and Exam.objects.get(pk=self.pk).classroom != self.classroom):
                # Only revert to AWAITING_PROCTORS if it wasn't already AWAITING_PROCTORS or if it was something earlier
                if self.status in [Exam.Status.WAITING_FOR_STUDENT_LIST, Exam.Status.WAITING_FOR_PLACES]:
                    self.status = Exam.Status.AWAITING_PROCTORS
                # If the classroom is being assigned and the status *was* AWAITING_PROCTORS, keep it there. 
                # If the signal has set it to READY, this part won't execute due to `self.status != Exam.Status.READY`

        # If the signal handler changed the status (e.g., to READY), 
        # and no other part of this save method changed it back, then kwargs['update_fields'] from the signal will be used.
        # If update_fields is not passed from the signal, a full save occurs.

        # Special handling if the call to save() explicitly targets the status field, e.g. from the signal
        if kwargs.get('update_fields') and 'status' in kwargs.get('update_fields') and len(kwargs.get('update_fields')) == 1:
            # This means the save is likely coming from our signal, trying to set the status. 
            # In this case, we trust the status value that has been set on the instance before calling save.
            pass # The status set by the signal will be saved.
        elif self.status == original_status and self.classroom and self.status != Exam.Status.READY: 
             # If status wasn't changed by signal, and classroom exists, and it's not READY, ensure AWAITING_PROCTORS
             # This handles the case where an exam is edited in admin, classroom is present, but status isn't READY.
             self.status = Exam.Status.AWAITING_PROCTORS

        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.course} - {self.get_type_display()} on {self.date.strftime('%Y-%m-%d %H:%M')}"
    
    @property
    def status_display(self):
        return self.get_status_display()

    def update_status_based_on_proctoring(self):
        """
        Updates the exam's status based on the current number of assigned proctors
        and the required proctor_count.
        This method should be called after proctor_count changes or proctor assignments change.
        """
        from proctoring.models import ProctorAssignment # Local import to avoid circular dependency issues
        
        assigned_proctor_count = ProctorAssignment.objects.filter(
            exam=self,
            status=ProctorAssignment.Status.ASSIGNED
        ).count()
        
        original_status = self.status
        new_status = original_status

        if self.proctor_count > 0 and assigned_proctor_count >= self.proctor_count:
            new_status = Exam.Status.READY
        elif self.proctor_count == 0: # If no proctors needed, it's always ready
            new_status = Exam.Status.READY
        else:
            new_status = Exam.Status.AWAITING_PROCTORS
            
        if original_status != new_status:
            self.status = new_status
            self.save(update_fields=['status'])
            print(f"[Exam.update_status_based_on_proctoring] Exam ID {self.id} status updated to: {self.status}")
        else:
            print(f"[Exam.update_status_based_on_proctoring] Exam ID {self.id} status ({self.status}) unchanged.")


class Leave(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='leaves')
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.TextField(blank=True, null=True)
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    requested_at = models.DateTimeField(auto_now_add=True)
    # Consider who approves leaves. If it's another User (e.g., admin/staff):
    # approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_user_leaves') 
    # Using a different related_name for approved_by to avoid conflict if approved_by can also take leave.

    def __str__(self):
        return f"{self.user.full_name} - {self.start_date} to {self.end_date} ({self.get_status_display()})"

    class Meta:
        verbose_name = "Leave Request"
        verbose_name_plural = "Leave Requests"
        ordering = ['-requested_at']


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
        related_name='ta_assignments'
    )
    
    class Meta:
        unique_together = ('instructor', 'ta')
        verbose_name = "Instructor-TA Assignment"
        verbose_name_plural = "Instructor-TA Assignments"
    
    def __str__(self):
        return f"{self.ta.full_name} assigned to {self.instructor.full_name}"


class TAProfile(models.Model):
    """
    Extended profile for users with TA role.
    Contains additional fields specific to TAs.
    """
    user = models.OneToOneField(
        User, 
        on_delete=models.CASCADE, 
        related_name='ta_profile',
        limit_choices_to={'role': 'TA'}
    )
    enrolled_courses = models.ManyToManyField(
        Course, # Direct reference to Course model
        blank=True,
        related_name='enrolled_tas_profiles', # Changed related_name to avoid conflict if Course has enrolled_tas
        help_text="Courses this TA is currently enrolled in as a student."
    )
    
    # Additional TA-specific fields
    undergrad_university = models.CharField(
        max_length=100, 
        blank=True, 
        null=True,
        help_text="University where TA completed undergraduate studies"
    )
    
    supervisor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='supervised_tas',
        limit_choices_to={'role': 'INSTRUCTOR'},
        help_text="Academic supervisor for this TA"
    )
    
    workload_number = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Workload category/type for the TA (e.g., 1 or 2, immutable once set)"
    )
    
    workload_credits = models.PositiveIntegerField(
        default=0,
        help_text="Accumulated workload credits from assigned proctoring duties"
    )
    
    # JSON field to store weekly schedule if not using the WeeklySchedule model
    schedule_json = models.JSONField(
        null=True, 
        blank=True,
        help_text="JSON representation of TA's weekly schedule if not using the WeeklySchedule model"
    )
    
    class Meta:
        verbose_name = "TA Profile"
        verbose_name_plural = "TA Profiles"
    
    def __str__(self):
        return f"TA Profile: {self.user.full_name}"
    
    def save(self, *args, **kwargs):
        # Ensure the workload_number is immutable once set
        if self.pk:
            original = TAProfile.objects.get(pk=self.pk)
            if original.workload_number is not None and self.workload_number != original.workload_number:
                 # If trying to change an already set workload_number, prevent it or log a warning
                 # Reverting to original value to enforce immutability
                 self.workload_number = original.workload_number
                 # Optionally, raise an error or log a warning here
                 print(f"Warning: Attempted to change immutable workload_number for TAProfile {self.pk}. Reverted to {self.workload_number}.")
            elif original.workload_number is None and self.workload_number is not None:
                 # If setting it for the first time, allow it.
                 pass 

        super().save(*args, **kwargs)


@receiver(post_save, sender=User)
def create_ta_profile(sender, instance, created, **kwargs):
    """Create a TAProfile when a User with role 'TA' is created."""
    if created and instance.role == 'TA':
        TAProfile.objects.create(user=instance)

@receiver(post_save, sender=User)
def update_ta_profile(sender, instance, created, **kwargs):
    """Update TAProfile when a User's role changes to or from 'TA'."""
    if not created:
        # If role changed to TA, create profile if it doesn't exist
        if instance.role == 'TA':
            TAProfile.objects.get_or_create(user=instance)
        # If role changed from TA, we could handle that here, but we'll leave profiles in place
        # to preserve workload history
