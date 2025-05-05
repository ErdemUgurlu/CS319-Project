from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from .models import (
    User, Student, Department, Course, 
    Section, TAAssignment, Classroom, WeeklySchedule, AuditLog, InstructorTAAssignment
)


def approve_users(modeladmin, request, queryset):
    """
    Action to approve selected users and send them notification emails.
    """
    for user in queryset:
        if not user.is_approved:
            user.is_approved = True
            user.save()
            
            # Generate a password reset token for setting permanent password
            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            password_set_url = f"{settings.FRONTEND_URL}/set-password/{uid}/{token}/"
            
            # Send approval email to user with password set link
            subject = 'Your Account Has Been Approved'
            from_email = settings.DEFAULT_FROM_EMAIL
            to_email = user.email
            
            # Generate email content
            context = {
                'user': user,
                'login_url': f"{settings.FRONTEND_URL}/login/",
                'temp_password': user.temp_password,
                'password_set_url': password_set_url,
            }
            html_message = render_to_string('email/account_approved_email.html', context)
            plain_message = strip_tags(html_message)
            
            # Send email
            send_mail(
                subject,
                plain_message,
                from_email,
                [to_email],
                html_message=html_message,
                fail_silently=False,
            )
            
            # Log the action
            AuditLog.objects.create(
                user=request.user,
                action='APPROVE',
                object_type='User',
                object_id=user.id,
                description=f"User {user.email} approved by admin through admin panel",
                ip_address=request.META.get('REMOTE_ADDR'),
            )
    
    modeladmin.message_user(request, f"{queryset.count()} users have been approved and notified by email.")
approve_users.short_description = "Approve selected users"


def verify_emails(modeladmin, request, queryset):
    """
    Action to mark selected users' emails as verified.
    """
    queryset.update(email_verified=True)
    
    for user in queryset:
        # Log the action
        AuditLog.objects.create(
            user=request.user,
            action='UPDATE',
            object_type='User',
            object_id=user.id,
            description=f"User {user.email} email verified by admin through admin panel",
            ip_address=request.META.get('REMOTE_ADDR'),
        )
    
    modeladmin.message_user(request, f"{queryset.count()} users have had their emails verified.")
verify_emails.short_description = "Mark selected users' emails as verified"


def activate_users(modeladmin, request, queryset):
    """
    Action to activate selected users.
    """
    queryset.update(is_active=True)
    
    for user in queryset:
        # Log the action
        AuditLog.objects.create(
            user=request.user,
            action='UPDATE',
            object_type='User',
            object_id=user.id,
            description=f"User {user.email} activated by admin through admin panel",
            ip_address=request.META.get('REMOTE_ADDR'),
        )
    
    modeladmin.message_user(request, f"{queryset.count()} users have been activated.")
activate_users.short_description = "Activate selected users"


def deactivate_users(modeladmin, request, queryset):
    """
    Action to deactivate selected users.
    """
    queryset.update(is_active=False)
    
    for user in queryset:
        # Log the action
        AuditLog.objects.create(
            user=request.user,
            action='UPDATE',
            object_type='User',
            object_id=user.id,
            description=f"User {user.email} deactivated by admin through admin panel",
            ip_address=request.META.get('REMOTE_ADDR'),
        )
    
    modeladmin.message_user(request, f"{queryset.count()} users have been deactivated.")
deactivate_users.short_description = "Deactivate selected users"


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Custom admin for the User model."""
    
    def assigned_to_instructor(self, obj):
        """Returns the instructor that the TA is assigned to, or 'Not Assigned' for unassigned TAs."""
        if obj.role != 'TA':
            return 'Not Applicable'
        
        try:
            assignment = obj.assigned_to_instructor.first()
            if assignment:
                return assignment.instructor.full_name
            return 'Not Assigned'
        except:
            return 'Not Assigned'
    
    assigned_to_instructor.short_description = 'Assigned To'
    
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        (_('Personal info'), {'fields': ('first_name', 'last_name', 'phone', 'role', 'department', 'academic_level', 'employment_type', 'iban')}),
        (_('Permissions'), {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'is_approved', 'email_verified',
                       'groups', 'user_permissions'),
        }),
        (_('Password management'), {'fields': ('temp_password', 'temp_password_expiry')}),
        (_('Important dates'), {'fields': ('last_login', 'date_joined')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2', 'first_name', 'last_name', 'role', 'department', 'phone'),
        }),
    )
    list_display = ('email', 'first_name', 'last_name', 'role', 'department', 'employment_type', 'assigned_to_instructor', 'is_approved', 'email_verified', 'is_staff', 'is_active')
    list_filter = ('is_staff', 'is_superuser', 'is_active', 'is_approved', 'email_verified', 'role', 'department', 'academic_level', 'employment_type')
    search_fields = ('email', 'first_name', 'last_name', 'phone')
    ordering = ('email',)
    actions = [approve_users, verify_emails, activate_users, deactivate_users]


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    """Admin for the Student model."""
    
    list_display = ('student_id', 'user', 'department_name', 'is_ta')
    list_filter = ('is_ta', 'department_name')
    search_fields = ('student_id', 'user__email', 'user__first_name', 'user__last_name')


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    """Admin for the Department model."""
    
    list_display = ('code', 'name', 'faculty')
    search_fields = ('code', 'name', 'faculty')


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    """Admin for the Course model."""
    
    list_display = ('department', 'code', 'title', 'credit')
    list_filter = ('department',)
    search_fields = ('code', 'title', 'department__code')


@admin.register(Section)
class SectionAdmin(admin.ModelAdmin):
    """Admin for the Section model."""
    
    list_display = ('__str__', 'instructor', 'semester', 'year')
    list_filter = ('semester', 'year', 'course__department')
    search_fields = ('course__code', 'section_number', 'instructor__email')


@admin.register(TAAssignment)
class TAAssignmentAdmin(admin.ModelAdmin):
    """Admin for the TAAssignment model."""
    
    list_display = ('ta', 'section', 'assigned_date')
    list_filter = ('section__semester', 'section__year', 'assigned_date')
    search_fields = ('ta__email', 'ta__first_name', 'ta__last_name', 'section__course__code')
    date_hierarchy = 'assigned_date'


@admin.register(Classroom)
class ClassroomAdmin(admin.ModelAdmin):
    """Admin for the Classroom model."""
    
    list_display = ('building', 'room_number', 'capacity')
    search_fields = ('building', 'room_number')
    list_filter = ('building',)


@admin.register(WeeklySchedule)
class WeeklyScheduleAdmin(admin.ModelAdmin):
    """Admin for the WeeklySchedule model."""
    
    list_display = ('ta', 'day', 'start_time', 'end_time', 'description')
    list_filter = ('day',)
    search_fields = ('ta__email', 'ta__first_name', 'ta__last_name', 'description')


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    """Admin for the AuditLog model."""
    
    list_display = ('timestamp', 'user', 'action', 'object_type', 'object_id', 'override_flag')
    list_filter = ('action', 'override_flag', 'timestamp')
    search_fields = ('user__email', 'description', 'object_type')
    readonly_fields = ('timestamp', 'user', 'action', 'object_type', 'object_id', 
                       'description', 'ip_address', 'override_flag')
    date_hierarchy = 'timestamp'


@admin.register(InstructorTAAssignment)
class InstructorTAAssignmentAdmin(admin.ModelAdmin):
    """Admin for the InstructorTAAssignment model."""
    
    list_display = ('instructor', 'ta', 'assigned_at', 'department')
    list_filter = ('department', 'assigned_at')
    search_fields = ('instructor__email', 'instructor__first_name', 'instructor__last_name', 
                    'ta__email', 'ta__first_name', 'ta__last_name')
    date_hierarchy = 'assigned_at'
