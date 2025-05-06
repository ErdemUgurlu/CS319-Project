from django.shortcuts import render, get_object_or_404
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from rest_framework import status, generics, permissions, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django_filters.rest_framework import DjangoFilterBackend
import uuid
import logging
from . import serializers
from .models import (
    User, Student, Department, Course, 
    Section, TAAssignment, WeeklySchedule, AuditLog, InstructorTAAssignment
)
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q
from rest_framework.decorators import action
from rest_framework_simplejwt.tokens import RefreshToken
import secrets
import string
import datetime
from .permissions import IsEmailVerifiedOrExempt
from .serializers import (
    UserProfileSerializer, UserListSerializer, UserDetailSerializer,
    ChangePasswordSerializer, UserRegistrationSerializer, UserUpdateSerializer,
    WeeklyScheduleSerializer, StudentSerializer, DepartmentSerializer, CourseSerializer,
    SectionSerializer, TAAssignmentSerializer, ClassroomSerializer,
    CustomTokenObtainPairSerializer, InstructorTAAssignmentSerializer, TADetailSerializer
)
import random
from datetime import timedelta
import re

logger = logging.getLogger(__name__)


class IsStaffUser(permissions.BasePermission):
    """
    Custom permission to only allow staff and admin users.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.role in ['STAFF', 'ADMIN', 'DEAN_OFFICE'] or 
            request.user.is_staff
        )


class IsAdminOrStaff(permissions.BasePermission):
    """
    Custom permission to only allow admin or staff users.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.role in ['STAFF', 'ADMIN'] or 
            request.user.is_staff or
            request.user.is_superuser
        )


class UserRegistrationView(generics.CreateAPIView):
    """
    API endpoint that allows users to register.
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = serializers.UserRegistrationSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            
            # Generate verification token
            token = str(uuid.uuid4())
            # In a real application, store this token in the database
            # with an expiration date
            
            # Send verification email
            subject = 'Verify Your Email Address'
            from_email = settings.DEFAULT_FROM_EMAIL
            to_email = user.email
            
            # Generate email content
            context = {
                'user': user,
                'verification_url': f"{settings.FRONTEND_URL}/verify-email/{token}?email={user.email}",
                'department': user.get_department_display(),
                'now': timezone.now(),
            }
            html_message = render_to_string('email/temp_password_email.html', context)
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
            
            # Find department staff to notify about the new user
            staff_users = User.objects.filter(
                role='STAFF',
                department=user.department,
                is_approved=True,
                is_active=True
            )
            
            # Notify staff users
            if staff_users.exists():
                staff_subject = f'New User Registration: {user.full_name}'
                staff_context = {
                    'new_user': user,
                    'approval_url': f"{settings.FRONTEND_URL}/admin/approve-user/{user.id}",
                }
                staff_html_message = render_to_string('email/new_user_notification.html', staff_context)
                staff_plain_message = strip_tags(staff_html_message)
                
                for staff_user in staff_users:
                    send_mail(
                        staff_subject,
                        staff_plain_message,
                        from_email,
                        [staff_user.email],
                        html_message=staff_html_message,
                        fail_silently=False,
                    )
            
            return Response(
                {
                    'message': 'Registration successful. Please check your email for your verification link. Your account is pending approval by department staff.'
                },
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class VerifyEmailView(APIView):
    """
    API endpoint to verify user email with token.
    """
    permission_classes = [permissions.AllowAny]
    
    def get(self, request, token):
        try:
            # In a real application, retrieve the token from the database
            # For now, we'll use a simpler approach and just mark the user as verified
            # based on the token in the URL
            
            # Extract email from the token
            # In a real implementation, you'd store the token with the user in the database
            # and look up the user by token
            email = request.GET.get('email')
            
            if not email:
                return Response(
                    {'error': 'Email parameter is required.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            user = User.objects.get(email=email)
            
            # Mark email as verified
            user.email_verified = True
            user.save()
            
            # Log the email verification
            AuditLog.objects.create(
                user=user,
                action='UPDATE',
                object_type='User',
                object_id=user.id,
                description="Email verified",
                ip_address=request.META.get('REMOTE_ADDR'),
            )
            
            return Response(
                {'message': 'Email verified successfully. Your account is now pending approval by department staff.'},
                status=status.HTTP_200_OK
            )
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'An error occurred: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class RequestPasswordResetView(APIView):
    """
    API endpoint to request a password reset.
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        email = request.data.get('email')
        
        if not email:
            return Response(
                {'error': 'Email is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(email=email)
            
            # Ensure user is approved and email verified regardless of current status
            if not user.is_approved or not user.email_verified:
                user.is_approved = True
                user.email_verified = True
                user.save()
            
            # Generate password reset token
            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            
            # Generate a temporary password directly
            temp_password = ''.join(random.choice(string.ascii_letters + string.digits) for _ in range(12))
            user.temp_password = temp_password
            user.temp_password_expiry = timezone.now() + timedelta(days=7)
            user.save()
            
            # Send password reset email
            subject = 'Reset Your Password'
            from_email = settings.DEFAULT_FROM_EMAIL
            to_email = user.email
            
            # Generate email content with temporary password
            context = {
                'user': user,
                'reset_url': f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}/",
                'temp_password': temp_password,
                'login_url': f"{settings.FRONTEND_URL}/login/",
                'expiry_date': user.temp_password_expiry.strftime('%Y-%m-%d %H:%M'),
            }
            html_message = render_to_string('email/password_email_template.html', context)
            plain_message = f"""
            Hello {user.first_name} {user.last_name},
            
            Your temporary password for the Bilkent TA Management System is: {temp_password}
            
            This password is valid until {user.temp_password_expiry.strftime('%Y-%m-%d %H:%M')}.
            Please log in to {settings.FRONTEND_URL}/login and change your password as soon as possible.
            
            Alternatively, you can reset your password using this link: {settings.FRONTEND_URL}/reset-password/{uid}/{token}/
            
            Best regards,
            Bilkent TA Management System
            """
            
            # Send email with debugging information
            try:
                send_mail(
                    subject,
                    plain_message,
                    from_email,
                    [to_email],
                    html_message=html_message,
                    fail_silently=False,
                )
                logger.info(f"Password reset email sent to {to_email}")
            except Exception as e:
                logger.error(f"Failed to send password reset email to {to_email}: {str(e)}")
                return Response(
                    {'error': f'Failed to send email: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            return Response(
                {
                    'message': 'Password reset email sent.',
                    'debug_info': {
                        'email': to_email,
                        'temp_password': temp_password,  # Include in response for debugging
                        'email_settings': {
                            'EMAIL_HOST': settings.EMAIL_HOST,
                            'EMAIL_PORT': settings.EMAIL_PORT,
                            'EMAIL_USE_TLS': settings.EMAIL_USE_TLS,
                            'DEFAULT_FROM_EMAIL': settings.DEFAULT_FROM_EMAIL,
                        }
                    }
                },
                status=status.HTTP_200_OK
            )
        except User.DoesNotExist:
            # Don't reveal that the user doesn't exist for security reasons
            return Response(
                {'message': 'If an account with this email exists, a password reset email has been sent.'},
                status=status.HTTP_200_OK
            )


class ResetPasswordView(APIView):
    """
    API endpoint to reset password using token.
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request, token):
        try:
            # Parse the uid and token
            uid = urlsafe_base64_decode(token.split('/')[0]).decode()
            token = token.split('/')[1]
            
            # Get the user
            user = User.objects.get(pk=uid)
            
            # Verify the token
            if not default_token_generator.check_token(user, token):
                return Response(
                    {'error': 'Invalid or expired token.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Set the new password
            password = request.data.get('password')
            if not password:
                return Response(
                    {'error': 'Password is required.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            user.set_password(password)
            user.save()
            
            return Response(
                {'message': 'Password reset successful.'},
                status=status.HTTP_200_OK
            )
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response(
                {'error': 'Invalid reset link.'},
                status=status.HTTP_400_BAD_REQUEST
            )


class ChangePasswordView(APIView):
    """
    API endpoint for changing password while logged in.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = serializers.ChangePasswordSerializer(data=request.data)
        
        if serializer.is_valid():
            user = request.user
            old_password = serializer.validated_data.get('old_password')
            new_password = serializer.validated_data.get('new_password')
            
            # Check if the old password is correct
            if not user.check_password(old_password):
                return Response(
                    {'error': 'Current password is incorrect.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Set the new password
            user.set_password(new_password)
            user.save()
            
            # Log the password change
            AuditLog.objects.create(
                user=user,
                action='UPDATE',
                object_type='User',
                object_id=user.id,
                description="User password changed",
                ip_address=request.META.get('REMOTE_ADDR'),
            )
            
            # Send email notification about password change
            try:
                subject = 'Your Password Has Been Changed'
                from_email = settings.DEFAULT_FROM_EMAIL
                to_email = user.email
                
                # Generate email content
                context = {
                    'user': user,
                    'timestamp': timezone.now().strftime('%Y-%m-%d %H:%M:%S'),
                    'login_url': f"{settings.FRONTEND_URL}/login/",
                }
                html_message = render_to_string('email/password_changed_notification.html', context)
                plain_message = f"""
                Hello {user.first_name} {user.last_name},
                
                This is a confirmation that your password for the Bilkent TA Management System has been changed successfully on {context['timestamp']}.
                
                If you did not make this change, please contact the system administrator immediately.
                
                Best regards,
                Bilkent TA Management System
                """
                
                # Send email
                send_mail(
                    subject,
                    plain_message,
                    from_email,
                    [to_email],
                    html_message=html_message,
                    fail_silently=True,  # Don't fail if email cannot be sent
                )
                email_sent = True
            except Exception as e:
                logger.error(f"Failed to send password change notification to {user.email}: {str(e)}")
                email_sent = False
            
            return Response(
                {
                    'message': 'Password changed successfully.',
                    'email_notification_sent': email_sent
                },
                status=status.HTTP_200_OK
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserProfileView(generics.RetrieveAPIView):
    """
    API endpoint that allows users to view their profile.
    Requires authentication only.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = serializers.UserProfileSerializer
    
    def get_object(self):
        return self.request.user


class UpdateUserProfileView(generics.UpdateAPIView):
    """
    API endpoint that allows users to update their profile.
    Requires email verification for TA and INSTRUCTOR roles.
    """
    permission_classes = [IsAuthenticated, IsEmailVerifiedOrExempt]
    serializer_class = serializers.UserUpdateSerializer
    
    def get_object(self):
        return self.request.user
    
    def perform_update(self, serializer):
        serializer.save()
        
        # Log the profile update
        AuditLog.objects.create(
            user=self.request.user,
            action='UPDATE',
            object_type='User',
            object_id=self.request.user.id,
            description="User profile updated",
            ip_address=self.request.META.get('REMOTE_ADDR'),
        )


class UserListView(generics.ListAPIView):
    """
    API endpoint that allows staff to list all users.
    """
    permission_classes = [IsStaffUser]
    queryset = User.objects.all()
    serializer_class = serializers.UserListSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['role', 'is_approved', 'email_verified', 'academic_level', 'is_active', 'department']
    search_fields = ['email', 'first_name', 'last_name', 'phone']
    ordering_fields = ['date_joined', 'email', 'first_name', 'last_name', 'role']
    ordering = ['-date_joined']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Only admins can see all users
        if self.request.user.role != 'ADMIN' and not self.request.user.is_superuser:
            # Staff can only see users from their own department
            queryset = queryset.filter(department=self.request.user.department)
        
        return queryset


class UserDetailView(generics.RetrieveUpdateAPIView):
    """
    API endpoint that allows staff to view and update user details.
    """
    permission_classes = [IsStaffUser]
    queryset = User.objects.all()
    serializer_class = serializers.UserDetailSerializer
    
    def perform_update(self, serializer):
        serializer.save()
        
        # Log the user update by staff
        AuditLog.objects.create(
            user=self.request.user,
            action='UPDATE',
            object_type='User',
            object_id=self.kwargs['pk'],
            description=f"User (ID: {self.kwargs['pk']}) updated by staff",
            ip_address=self.request.META.get('REMOTE_ADDR'),
        )


class ApproveUserView(APIView):
    """
    API endpoint that allows staff to approve a user.
    """
    permission_classes = [IsStaffUser]
    
    def post(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        
        # Check if the staff member is from the same department as the user
        if request.user.department != user.department and request.user.role != 'ADMIN':
            return Response(
                {'error': 'You can only approve users from your own department.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if user.is_approved:
            return Response(
                {'error': 'User is already approved.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.is_approved = True
        user.save()
        
        # Log the user approval
        AuditLog.objects.create(
            user=request.user,
            action='APPROVE',
            object_type='User',
            object_id=user.id,
            description=f"User {user.email} approved by staff",
            ip_address=request.META.get('REMOTE_ADDR'),
        )
        
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
        
        return Response(
            {'message': f'User {user.email} has been approved. An email has been sent with instructions to set a permanent password.'},
            status=status.HTTP_200_OK
        )


class WeeklyScheduleListCreateView(generics.ListCreateAPIView):
    """
    API endpoint that allows TAs to list and create their weekly class schedule.
    These entries indicate times when the TA is in class and cannot be assigned to proctoring duties.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = serializers.WeeklyScheduleSerializer
    
    def get_queryset(self):
        # Log user information for debugging purposes
        print(f"User accessing weekly schedule: {self.request.user.email}, role: {self.request.user.role}")
        
        # For TAs: Return only their own schedule
        # For all other roles (ADMIN, STAFF, INSTRUCTOR): Return all schedules or their own schedules
        if self.request.user.role == 'TA':
            return WeeklySchedule.objects.filter(ta=self.request.user)
        elif self.request.user.role in ['ADMIN', 'STAFF', 'INSTRUCTOR']:
            # Staff, Instructors, and Admins can see all weekly schedules
            return WeeklySchedule.objects.all()
        else:
            # Default case - every authenticated user can at least see their own schedule
            # This ensures users with undefined roles can still access their data
            return WeeklySchedule.objects.filter(ta=self.request.user)
    
    def list(self, request, *args, **kwargs):
        """Override list to ensure we always return a list even when no data exists."""
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    def perform_create(self, serializer):
        serializer.save(ta=self.request.user)
        
        # Log the weekly schedule creation
        AuditLog.objects.create(
            user=self.request.user,
            action='CREATE',
            object_type='WeeklySchedule',
            object_id=serializer.instance.id,
            description=f"Weekly schedule created for {serializer.instance.get_day_display()}",
            ip_address=self.request.META.get('REMOTE_ADDR'),
        )


class WeeklyScheduleDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    API endpoint that allows TAs to view, update and delete their weekly class schedule entries.
    These entries indicate times when the TA is in class and cannot be assigned to proctoring duties.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = serializers.WeeklyScheduleSerializer
    
    def get_queryset(self):
        # Log user information for debugging purposes
        print(f"User accessing weekly schedule detail: {self.request.user.email}, role: {self.request.user.role}")
        
        # For TAs: Return only their own schedule
        # For all other roles (ADMIN, STAFF, INSTRUCTOR): Return all schedules or their own schedules
        if self.request.user.role == 'TA':
            return WeeklySchedule.objects.filter(ta=self.request.user)
        elif self.request.user.role in ['ADMIN', 'STAFF', 'INSTRUCTOR']:
            # Staff, Instructors, and Admins can see all weekly schedules
            return WeeklySchedule.objects.all()
        else:
            # Default case - every authenticated user can at least see their own schedule
            # This ensures users with undefined roles can still access their data
            return WeeklySchedule.objects.filter(ta=self.request.user)
    
    def perform_update(self, serializer):
        serializer.save()
        
        # Log the weekly schedule update
        AuditLog.objects.create(
            user=self.request.user,
            action='UPDATE',
            object_type='WeeklySchedule',
            object_id=self.kwargs['pk'],
            description=f"Weekly schedule updated for {serializer.instance.get_day_display()}",
            ip_address=self.request.META.get('REMOTE_ADDR'),
        )
    
    def perform_destroy(self, instance):
        # Log the weekly schedule deletion
        AuditLog.objects.create(
            user=self.request.user,
            action='DELETE',
            object_type='WeeklySchedule',
            object_id=instance.id,
            description=f"Weekly schedule deleted for {instance.day}",
            ip_address=self.request.META.get('REMOTE_ADDR'),
        )
        
        instance.delete()


# Department, Course, Section, and TAAssignment views

class DepartmentListView(generics.ListAPIView):
    """
    API endpoint that allows users to list departments.
    """
    queryset = Department.objects.all()
    serializer_class = serializers.DepartmentSerializer
    permission_classes = [IsAuthenticated]


class DepartmentDetailView(generics.RetrieveAPIView):
    """
    API endpoint that allows users to view a department.
    """
    queryset = Department.objects.all()
    serializer_class = serializers.DepartmentSerializer
    permission_classes = [IsAuthenticated]


class CourseListView(generics.ListAPIView):
    """
    API endpoint that allows users to list courses.
    """
    queryset = Course.objects.all()
    serializer_class = serializers.CourseSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['department__code']
    search_fields = ['code', 'title']


class CourseDetailView(generics.RetrieveAPIView):
    """
    API endpoint that allows users to view a course.
    """
    queryset = Course.objects.all()
    serializer_class = serializers.CourseSerializer
    permission_classes = [IsAuthenticated]


class SectionListView(generics.ListAPIView):
    """
    API endpoint that allows users to list sections.
    """
    queryset = Section.objects.all()
    serializer_class = serializers.SectionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['course__department__code', 'course__code', 'semester', 'year', 'instructor']
    search_fields = ['course__code', 'section_number']


class SectionDetailView(generics.RetrieveAPIView):
    """
    API endpoint that allows users to view a section.
    """
    queryset = Section.objects.all()
    serializer_class = serializers.SectionSerializer
    permission_classes = [IsAuthenticated]


class TAAssignmentListCreateView(generics.ListCreateAPIView):
    """
    API endpoint that allows instructors and staff to list and create TA assignments.
    """
    serializer_class = serializers.TAAssignmentSerializer
    permission_classes = [IsStaffUser]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['section__course__department__code', 'section__course__code', 'section__semester', 'section__year']
    
    def get_queryset(self):
        user = self.request.user
        
        if user.role == 'INSTRUCTOR':
            # Instructors can only see TA assignments for their sections
            return TAAssignment.objects.filter(section__instructor=user)
        else:
            # Staff, Dean's Office, and Admins can see all TA assignments
            return TAAssignment.objects.all()
    
    def perform_create(self, serializer):
        serializer.save()
        
        # Log the TA assignment creation
        AuditLog.objects.create(
            user=self.request.user,
            action='CREATE',
            object_type='TAAssignment',
            object_id=serializer.instance.id,
            description=f"TA {serializer.instance.ta.email} assigned to {serializer.instance.section}",
            ip_address=self.request.META.get('REMOTE_ADDR'),
        )


class TAAssignmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    API endpoint that allows instructors and staff to view, update, and delete TA assignments.
    """
    serializer_class = serializers.TAAssignmentSerializer
    permission_classes = [IsStaffUser]
    
    def get_queryset(self):
        user = self.request.user
        
        if user.role == 'INSTRUCTOR':
            # Instructors can only see TA assignments for their sections
            return TAAssignment.objects.filter(section__instructor=user)
        else:
            # Staff, Dean's Office, and Admins can see all TA assignments
            return TAAssignment.objects.all()
    
    def perform_update(self, serializer):
        serializer.save()
        
        # Log the TA assignment update
        AuditLog.objects.create(
            user=self.request.user,
            action='UPDATE',
            object_type='TAAssignment',
            object_id=self.kwargs['pk'],
            description=f"TA assignment updated",
            ip_address=self.request.META.get('REMOTE_ADDR'),
        )
    
    def perform_destroy(self, instance):
        # Log the TA assignment deletion
        AuditLog.objects.create(
            user=self.request.user,
            action='DELETE',
            object_type='TAAssignment',
            object_id=instance.id,
            description=f"TA {instance.ta.email} unassigned from {instance.section}",
            ip_address=self.request.META.get('REMOTE_ADDR'),
        )
        
        instance.delete()


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Custom token view that uses our custom serializer.
    """
    serializer_class = serializers.CustomTokenObtainPairSerializer


class SetPasswordAfterApprovalView(APIView):
    """
    API endpoint to set a permanent password after account approval.
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        uid = request.data.get('uid')
        token = request.data.get('token')
        new_password = request.data.get('password')
        password_confirm = request.data.get('password_confirm')
        
        if not uid or not token or not new_password or not password_confirm:
            return Response(
                {'error': 'Missing required fields.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if new_password != password_confirm:
            return Response(
                {'error': 'Passwords do not match.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Validate password complexity
            validate_password(new_password)
            
            # Decode the user ID
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id)
            
            # Verify the token
            if not default_token_generator.check_token(user, token):
                return Response(
                    {'error': 'Invalid or expired token.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if the user is approved
            if not user.is_approved:
                return Response(
                    {'error': 'Your account is not yet approved.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Set the new password
            user.set_password(new_password)
            user.temp_password = None  # Clear the temporary password
            user.temp_password_expiry = None
            user.email_verified = True  # Mark email as verified
            user.save()
            
            # Log the password set
            AuditLog.objects.create(
                user=user,
                action='UPDATE',
                object_type='User',
                object_id=user.id,
                description="Permanent password set after approval",
                ip_address=request.META.get('REMOTE_ADDR'),
            )
            
            return Response(
                {'message': 'Password set successfully. You can now log in with your new password.'},
                status=status.HTTP_200_OK
            )
            
        except User.DoesNotExist:
            return Response(
                {'error': 'Invalid user ID.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except ValidationError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': 'An error occurred. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class IsAdminUser(permissions.BasePermission):
    """
    Custom permission to only allow admin users.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.role == 'ADMIN' or request.user.is_superuser
        )


class AdminCreateStaffView(generics.CreateAPIView):
    """
    API endpoint that allows administrators to create staff users directly.
    """
    permission_classes = [IsAdminUser]
    serializer_class = serializers.AdminCreateStaffSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            
            # Log the staff creation
            AuditLog.objects.create(
                user=request.user,
                action='CREATE',
                object_type='User',
                object_id=user.id,
                description=f"Staff user {user.email} created by admin",
                ip_address=request.META.get('REMOTE_ADDR'),
            )
            
            # Send notification email to the new staff user
            subject = 'Your Staff Account Has Been Created'
            from_email = settings.DEFAULT_FROM_EMAIL
            to_email = user.email
            
            # Generate email content
            context = {
                'user': user,
                'created_by': request.user,
                'login_url': f"{settings.FRONTEND_URL}/login/",
                'password': request.data.get('password'),  # Include the password in the email
            }
            html_message = render_to_string('email/staff_account_created.html', context)
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
            
            return Response(
                {
                    'message': f'Staff user {user.email} created successfully. An email with credentials has been sent to the user.',
                    'user_id': user.id,
                    'email': user.email
                },
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminDeleteUserView(APIView):
    """
    API endpoint that allows administrators to delete users.
    """
    permission_classes = [IsAdminUser]
    
    def delete(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
            
            # Store user info for logging
            email = user.email
            full_name = user.full_name
            role = user.get_role_display()
            
            # Log the deletion before actually deleting
            AuditLog.objects.create(
                user=request.user,
                action='DELETE',
                object_type='User',
                object_id=pk,
                description=f"User {email} ({full_name}, {role}) deleted by admin {request.user.email}",
                ip_address=request.META.get('REMOTE_ADDR'),
            )
            
            # Delete the user
            user.delete()
            
            return Response(
                {'message': f'User {email} deleted successfully.'},
                status=status.HTTP_200_OK
            )
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'An error occurred: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class DeactivateUserView(APIView):
    """
    API endpoint that allows administrators to deactivate users without deleting them.
    This is often a preferred approach for maintaining data integrity.
    """
    permission_classes = [IsAdminUser]
    
    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
            
            if not user.is_active:
                return Response(
                    {'error': 'User is already deactivated.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Deactivate the user
            user.is_active = False
            user.save()
            
            # Log the deactivation
            AuditLog.objects.create(
                user=request.user,
                action='UPDATE',
                object_type='User',
                object_id=pk,
                description=f"User {user.email} ({user.full_name}) deactivated by admin {request.user.email}",
                ip_address=request.META.get('REMOTE_ADDR'),
            )
            
            return Response(
                {'message': f'User {user.email} has been deactivated.'},
                status=status.HTTP_200_OK
            )
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'An error occurred: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ReactivateUserView(APIView):
    """
    API endpoint that allows administrators to reactivate previously deactivated users.
    """
    permission_classes = [IsAdminUser]
    
    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
            
            if user.is_active:
                return Response(
                    {'error': 'User is already active.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Reactivate the user
            user.is_active = True
            user.save()
            
            # Log the reactivation
            AuditLog.objects.create(
                user=request.user,
                action='UPDATE',
                object_type='User',
                object_id=pk,
                description=f"User {user.email} ({user.full_name}) reactivated by admin {request.user.email}",
                ip_address=request.META.get('REMOTE_ADDR'),
            )
            
            return Response(
                {'message': f'User {user.email} has been reactivated.'},
                status=status.HTTP_200_OK
            )
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'An error occurred: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class MyTAsListView(generics.ListAPIView):
    """API endpoint for instructors to view their assigned TAs."""
    serializer_class = InstructorTAAssignmentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.role != 'INSTRUCTOR':
            return InstructorTAAssignment.objects.none()
        
        return InstructorTAAssignment.objects.filter(instructor=user)


class AvailableTAsListView(generics.ListAPIView):
    """API endpoint for instructors to view unassigned TAs in their department."""
    serializer_class = TADetailSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        # Debug log to check user role
        logger.debug(f"User requesting available TAs: {user.email}, role: {user.role}")
        
        # Change back to 'INSTRUCTOR' role 
        if user.role != 'INSTRUCTOR':
            logger.debug(f"User {user.email} is not an instructor, returning empty queryset")
            return User.objects.none()
        
        # Get IDs of assigned TAs
        assigned_ta_ids = InstructorTAAssignment.objects.values_list('ta_id', flat=True)
        logger.debug(f"Assigned TA IDs: {list(assigned_ta_ids)}")
        
        # Return only TAs from the same department as the instructor
        available_tas = User.objects.filter(
            role='TA',
            department=user.department,  # Re-add department filter to only show TAs from same department
            is_approved=True,
            is_active=True
        ).exclude(id__in=assigned_ta_ids)
        
        logger.debug(f"Available TAs count: {available_tas.count()}")
        # Log available TAs for debugging
        for ta in available_tas:
            logger.debug(f"Available TA: {ta.email}, department: {ta.department}")
        
        return available_tas
    
    def list(self, request, *args, **kwargs):
        """Override list method to add debug info in response"""
        queryset = self.filter_queryset(self.get_queryset())
        
        # Get debug information
        user = request.user
        assigned_tas = InstructorTAAssignment.objects.filter(instructor=user)
        assigned_ta_ids = assigned_tas.values_list('ta_id', flat=True)
        all_tas = User.objects.filter(role='TA', is_approved=True, is_active=True)
        
        # Add debug info
        debug_info = {
            "request_user": user.email,
            "request_user_role": user.role,
            "assigned_ta_count": assigned_tas.count(),
            "all_active_tas_count": all_tas.count(),
            "available_tas_count": queryset.count(),
            "all_tas": [{"id": ta.id, "email": ta.email} for ta in all_tas],
            "assigned_tas": [{"id": ta.ta.id, "email": ta.ta.email} for ta in assigned_tas]
        }
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            "results": serializer.data,
            "debug_info": debug_info
        })


class AssignTAView(APIView):
    """API endpoint for instructors to assign a TA to themselves."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        if request.user.role != 'INSTRUCTOR':
            return Response(
                {"error": "Only instructors can assign TAs."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        ta_id = request.data.get('ta_id')
        if not ta_id:
            return Response(
                {"error": "TA ID is required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            ta = User.objects.get(id=ta_id, role='TA')
        except User.DoesNotExist:
            return Response(
                {"error": "TA not found."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Re-add department check to enforce only same department assignments
        if ta.department != request.user.department:
            return Response(
                {"error": "You can only assign TAs from your own department."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if TA is already assigned to another instructor
        if InstructorTAAssignment.objects.filter(ta=ta).exists():
            return Response(
                {"error": "This TA is already assigned to an instructor."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Get the Department object instead of using the code string
            instructor_department = Department.objects.get(code=request.user.department)
            
            # Create the assignment with the Department object
            assignment = InstructorTAAssignment.objects.create(
                instructor=request.user,
                ta=ta,
                department=instructor_department
            )
            
            serializer = InstructorTAAssignmentSerializer(assignment)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Department.DoesNotExist:
            return Response(
                {"error": f"Department with code '{request.user.department}' not found."},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error assigning TA: {str(e)}")
            return Response(
                {"error": f"Failed to assign TA: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class RemoveTAView(APIView):
    """API endpoint for instructors to remove a TA assignment."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        if request.user.role != 'INSTRUCTOR':
            return Response(
                {"error": "Only instructors can remove TA assignments."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        assignment_id = request.data.get('assignment_id')
        if not assignment_id:
            return Response(
                {"error": "Assignment ID is required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            assignment = InstructorTAAssignment.objects.get(
                id=assignment_id,
                instructor=request.user
            )
        except InstructorTAAssignment.DoesNotExist:
            return Response(
                {"error": "Assignment not found or you don't have permission to remove it."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Delete the assignment
        assignment.delete()
        
        return Response(
            {"message": "TA assignment removed successfully."},
            status=status.HTTP_200_OK
        )


class AllTAsListView(generics.ListAPIView):
    """API endpoint for getting all active and approved TAs (for task assignment)."""
    serializer_class = TADetailSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        # Debug log to check user role
        logger.debug(f"User requesting all TAs: {user.email}, role: {user.role}")
        
        # Check if user has permission to view TAs
        if user.role not in ['INSTRUCTOR', 'STAFF', 'ADMIN']:
            logger.debug(f"User {user.email} does not have permission to view all TAs")
            return User.objects.none()
        
        # Get TAs based on user role
        if user.role == 'INSTRUCTOR':
            # Instructors can only see TAs from their own department
            all_tas = User.objects.filter(
                role='TA',
                department=user.department,
                is_approved=True,
                is_active=True
            )
        else:
            # Admin and Staff can see all TAs
                    all_tas = User.objects.filter(
                        role='TA',
                        is_approved=True,
                        is_active=True
                    )
        
        logger.debug(f"All TAs count: {all_tas.count()}")
        
        # Add instructor's assigned TAs information
        if user.role == 'INSTRUCTOR':
            assigned_tas = InstructorTAAssignment.objects.filter(instructor=user).values_list('ta_id', flat=True)
            logger.debug(f"Instructor {user.email} has {len(assigned_tas)} assigned TAs")
        
        return all_tas
    
    def list(self, request, *args, **kwargs):
        """Override list method to add debug info in response"""
        queryset = self.filter_queryset(self.get_queryset())
        
        # Get debug information
        user = request.user
        
        # Add debug info
        debug_info = {
            "request_user": user.email,
            "request_user_role": user.role,
            "all_tas_count": queryset.count(),
        }
        
        # Add instructor specific debug info
        if user.role == 'INSTRUCTOR':
            instructor_tas = InstructorTAAssignment.objects.filter(instructor=user)
            debug_info["assigned_ta_count"] = instructor_tas.count()
            debug_info["assigned_tas"] = [{"id": ta.ta.id, "email": ta.ta.email} for ta in instructor_tas]
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            "results": serializer.data,
            "debug_info": debug_info
        })


class PendingApprovalUsersView(generics.ListAPIView):
    """API endpoint for staff to view users pending approval in their department."""
    serializer_class = UserListSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        # Only staff and instructors can view pending approval users
        if user.role not in ['STAFF', 'ADMIN', 'INSTRUCTOR']:
            return User.objects.none()
        
        # Admins can see all pending users
        if user.role == 'ADMIN':
            return User.objects.filter(is_approved=False)
        
        # Staff and instructors can only see pending users from their department
        return User.objects.filter(
            is_approved=False,
            department=user.department
        )


class InstructorTAAssignmentView(APIView):
    """API endpoint for managing TA assignments to instructors"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get all TA assignments for the current instructor"""
        if request.user.role != 'INSTRUCTOR' and request.user.role != 'ADMIN':
            return Response({"error": "Only instructors can view their TA assignments"}, 
                          status=status.HTTP_403_FORBIDDEN)
        
        if request.user.role == 'INSTRUCTOR':
            # Instructors can only see their own assignments
            assignments = InstructorTAAssignment.objects.filter(instructor=request.user)
        else:
            # Admins can see all assignments
            assignments = InstructorTAAssignment.objects.all()
            
        serializer = InstructorTAAssignmentSerializer(assignments, many=True)
        return Response(serializer.data)
    
    def post(self, request):
        """Create a new TA assignment to the current instructor"""
        if request.user.role != 'INSTRUCTOR' and request.user.role != 'ADMIN':
            return Response({"error": "Only instructors can assign TAs"}, 
                          status=status.HTTP_403_FORBIDDEN)
        
        data = request.data.copy()
        
        # If instructor is making the request, use their ID
        if request.user.role == 'INSTRUCTOR':
            data['instructor'] = request.user.id
            
            # Also set the department to the instructor's department
            data['department'] = request.user.department.id
            
            # Verify that the TA is from the same department as the instructor
            ta_id = data.get('ta')
            if ta_id:
                try:
                    ta = User.objects.get(id=ta_id, role='TA')
                    if ta.department != request.user.department:
                        return Response(
                            {"error": "You can only assign TAs from your own department"},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    
                    # Check if the TA is already assigned to another instructor
                    if InstructorTAAssignment.objects.filter(ta=ta).exists():
                        return Response(
                            {"error": "This TA is already assigned to another instructor"},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                except User.DoesNotExist:
                    return Response(
                        {"error": "TA not found"},
                        status=status.HTTP_404_NOT_FOUND
                    )
        
        serializer = InstructorTAAssignmentSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self, request):
        """Remove a TA assignment"""
        if request.user.role != 'INSTRUCTOR' and request.user.role != 'ADMIN':
            return Response({"error": "Only instructors can remove TA assignments"}, 
                          status=status.HTTP_403_FORBIDDEN)
        
        ta_id = request.data.get('ta')
        if not ta_id:
            return Response({"error": "TA ID is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        # For security, instructors can only remove their own TA assignments
        if request.user.role == 'INSTRUCTOR':
            try:
                assignment = InstructorTAAssignment.objects.get(instructor=request.user, ta_id=ta_id)
                assignment.delete()
                return Response(status=status.HTTP_204_NO_CONTENT)
            except InstructorTAAssignment.DoesNotExist:
                return Response({"error": "Assignment not found"}, status=status.HTTP_404_NOT_FOUND)
        else:
            # Admins can remove any assignment
            instructor_id = request.data.get('instructor')
            if not instructor_id:
                return Response({"error": "Instructor ID is required for admin deletions"}, 
                              status=status.HTTP_400_BAD_REQUEST)
            
            try:
                assignment = InstructorTAAssignment.objects.get(instructor_id=instructor_id, ta_id=ta_id)
                assignment.delete()
                return Response(status=status.HTTP_204_NO_CONTENT)
            except InstructorTAAssignment.DoesNotExist:
                return Response({"error": "Assignment not found"}, status=status.HTTP_404_NOT_FOUND)


class RegisterTAsFromExcelView(APIView):
    """
    View for registering TAs from Excel data.
    Staff/Admin users can create multiple TA accounts by providing data in a specific format.
    """
    permission_classes = [permissions.IsAuthenticated, IsAdminOrStaff]
    
    def generate_password(self, length=12):
        """Generate a secure random password."""
        chars = string.ascii_letters + string.digits + string.punctuation
        # Ensure password has at least one of each type of character
        password = random.choice(string.ascii_lowercase)
        password += random.choice(string.ascii_uppercase)
        password += random.choice(string.digits)
        password += random.choice('!@#$%^&*()_+-=[]{}|;:,.<>?')
        # Fill the rest randomly
        password += ''.join(random.choice(chars) for _ in range(length - 4))
        # Shuffle the password
        password_list = list(password)
        random.shuffle(password_list)
        return ''.join(password_list)
    
    @transaction.atomic
    def post(self, request, *args, **kwargs):
        """Process TA data from Excel and create accounts."""
        tas_data = request.data.get('tas_data', [])
        
        if not tas_data:
            return Response(
                {"detail": "No TA data provided"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # First, set all existing users as approved and email-verified
        User.objects.all().update(is_approved=True, email_verified=True)
        
        created_users = []
        errors = []
        
        for index, ta_data in enumerate(tas_data):
            try:
                # Extract required fields
                email = ta_data.get('email')
                first_name = ta_data.get('first_name')
                last_name = ta_data.get('last_name')
                
                # Validate required fields
                if not email or not first_name or not last_name:
                    errors.append({
                        "index": index,
                        "error": "Missing required field(s): email, first_name, last_name",
                        "data": ta_data
                    })
                    continue
                
                # Check if user already exists
                if User.objects.filter(email=email).exists():
                    # Update existing user to ensure they are approved and verified
                    existing_user = User.objects.get(email=email)
                    existing_user.is_approved = True
                    existing_user.email_verified = True
                    existing_user.save()
                    
                    errors.append({
                        "index": index,
                        "error": f"User with email {email} already exists and has been approved",
                        "data": ta_data
                    })
                    continue
                
                # Extract optional fields with defaults
                phone = ta_data.get('phone', '')
                iban = ta_data.get('iban', '')
                department = ta_data.get('department', 'CS')
                academic_level = ta_data.get('academic_level', 'MASTERS')
                employment_type = ta_data.get('employment_type', 'FULL_TIME')
                
                # Generate a password
                password = self.generate_password()
                
                # Create the user
                user = User.objects.create_user(
                    email=email,
                    password=password,
                    first_name=first_name,
                    last_name=last_name,
                    role='TA',
                    department=department,
                    phone=phone,
                    iban=iban,
                    academic_level=academic_level,
                    employment_type=employment_type,
                    is_approved=True,  # Auto-approve TAs created by staff/admin
                    email_verified=True,  # Auto-verify emails for TAs created by staff/admin
                )
                
                # Store temporary password for password reset
                user.temp_password = password
                user.temp_password_expiry = timezone.now() + timedelta(days=7)  # Valid for 7 days
                user.save()
                
                # Directly send email with password rather than requiring a separate step
                try:
                    subject = 'Your Bilkent TA Management System Temporary Password'
                    context = {
                        'user': user,
                        'temp_password': password,
                        'expiry_date': user.temp_password_expiry.strftime('%Y-%m-%d %H:%M'),
                        'login_url': f"{settings.FRONTEND_URL}/login"
                    }
                    
                    html_message = render_to_string('email/password_email_template.html', context)
                    plain_message = f"""
                    Hello {user.first_name} {user.last_name},
                    
                    Your temporary password for the Bilkent TA Management System is: {password}
                    
                    This password is valid until {user.temp_password_expiry.strftime('%Y-%m-%d %H:%M')}.
                    Please log in to {settings.FRONTEND_URL}/login and change your password as soon as possible.
                    
                    Best regards,
                    Bilkent TA Management System
                    """
                    
                    send_mail(
                        subject=subject,
                        message=plain_message,
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[user.email],
                        html_message=html_message,
                        fail_silently=False,
                    )
                except Exception as email_error:
                    logger.error(f"Failed to send email to {user.email}: {str(email_error)}")
                
                created_users.append({
                    "id": user.id,
                    "email": user.email,
                    "name": f"{user.first_name} {user.last_name}",
                    "temp_password": password  # Include the temp password in the response
                })
                
            except Exception as e:
                errors.append({
                    "index": index,
                    "error": str(e),
                    "data": ta_data
                })
        
        return Response({
            "created_users": created_users,
            "errors": errors,
            "total_created": len(created_users),
            "total_errors": len(errors)
        }, status=status.HTTP_201_CREATED if created_users else status.HTTP_400_BAD_REQUEST)


class SendPasswordEmailsView(APIView):
    """
    View for sending password emails to TAs.
    This endpoint accepts a list of email addresses and sends password reset instructions.
    """
    permission_classes = [permissions.IsAuthenticated, IsAdminOrStaff]
    
    def post(self, request, *args, **kwargs):
        """Send password emails to specified users."""
        emails = request.data.get('emails', [])
        
        if not emails:
            return Response(
                {"detail": "No email addresses provided"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update all users to ensure they're approved and verified
        User.objects.filter(email__in=emails).update(is_approved=True, email_verified=True)
        
        success = []
        errors = []
        debug_info = []
        
        # Check if using console backend
        is_console_backend = 'console' in settings.EMAIL_BACKEND
        logger.info(f"Using email backend: {settings.EMAIL_BACKEND}")
        
        for email in emails:
            try:
                # Find the user
                user = User.objects.get(email=email)
                
                # Ensure user is approved and verified
                if not user.is_approved or not user.email_verified:
                    user.is_approved = True
                    user.email_verified = True
                    user.save()
                
                # Generate a new temporary password
                temp_password = ''.join(random.choice(string.ascii_letters + string.digits) for _ in range(12))
                user.temp_password = temp_password
                user.temp_password_expiry = timezone.now() + timedelta(days=7)
                user.save()
                
                # Send email with temporary password
                subject = 'Your Bilkent TA Management System Temporary Password'
                context = {
                    'user': user,
                    'temp_password': temp_password,
                    'expiry_date': user.temp_password_expiry.strftime('%Y-%m-%d %H:%M'),
                    'login_url': f"{settings.FRONTEND_URL}/login"
                }
                
                html_message = render_to_string('email/password_email_template.html', context)
                plain_message = f"""
                Hello {user.first_name} {user.last_name},
                
                Your temporary password for the Bilkent TA Management System is: {temp_password}
                
                This password is valid until {user.temp_password_expiry.strftime('%Y-%m-%d %H:%M')}.
                Please log in to {settings.FRONTEND_URL}/login and change your password as soon as possible.
                
                Best regards,
                Bilkent TA Management System
                """
                
                # Log details before sending
                logger.info(f"Attempting to send email to {user.email} with subject: '{subject}'")
                
                try:
                    send_mail(
                        subject=subject,
                        message=plain_message,
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[user.email],
                        html_message=html_message,
                        fail_silently=False,
                    )
                    log_msg = f"Password email sent to {user.email}"
                    if is_console_backend:
                        log_msg += " (Using console backend - check your server logs)"
                    logger.info(log_msg)
                    success.append(email)
                    
                    # Add debug info for successful email
                    debug_info.append({
                        "email": email,
                        "temp_password": temp_password,
                        "status": "sent",
                        "timestamp": timezone.now().isoformat()
                    })
                except Exception as email_error:
                    error_msg = f"Email sending failed: {str(email_error)}"
                    detailed_error = f"Error type: {type(email_error).__name__}, Details: {str(email_error)}"
                    logger.error(f"Failed to send email to {user.email}: {detailed_error}")
                    errors.append({
                        "email": email,
                        "error": error_msg,
                        "detailed_error": detailed_error
                    })
                
            except User.DoesNotExist:
                errors.append({
                    "email": email,
                    "error": "User not found"
                })
            except Exception as e:
                detailed_error = f"Error type: {type(e).__name__}, Details: {str(e)}"
                logger.error(f"Error processing {email}: {detailed_error}")
                errors.append({
                    "email": email,
                    "error": str(e),
                    "detailed_error": detailed_error
                })
        
        return Response({
            "success": success,
            "errors": errors,
            "total_success": len(success),
            "total_errors": len(errors),
            "debug_info": {
                "email_settings": {
                    "EMAIL_HOST": settings.EMAIL_HOST,
                    "EMAIL_PORT": settings.EMAIL_PORT,
                    "EMAIL_USE_TLS": settings.EMAIL_USE_TLS,
                    "DEFAULT_FROM_EMAIL": settings.DEFAULT_FROM_EMAIL,
                    "EMAIL_BACKEND": settings.EMAIL_BACKEND,
                    "using_console_backend": is_console_backend
                },
                "sent_emails": debug_info
            }
        }, status=status.HTTP_200_OK)


class FixAllUsersView(APIView):
    """
    API endpoint to fix all users by setting them as approved and email-verified.
    This is a utility endpoint to help recover from issues with user status.
    """
    permission_classes = [permissions.IsAuthenticated, IsAdminOrStaff]
    
    def post(self, request):
        """Set all users as approved and email verified."""
        try:
            # Get count before update
            total_users = User.objects.count()
            unapproved_count = User.objects.filter(is_approved=False).count()
            unverified_count = User.objects.filter(email_verified=False).count()
            
            # Update all users
            User.objects.all().update(is_approved=True, email_verified=True)
            
            # Log the action
            logger.info(f"All users set to approved and email verified by {request.user.email}")
            
            return Response({
                "message": "All users have been marked as approved and email verified.",
                "details": {
                    "total_users": total_users,
                    "previously_unapproved": unapproved_count,
                    "previously_unverified": unverified_count
                }
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error in FixAllUsersView: {str(e)}")
            return Response({
                "error": f"An error occurred: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CheckEmailExistsView(APIView):
    """
    API endpoint to check if an email exists in the system.
    For security reasons, this endpoint always returns a 200 response
    to avoid email enumeration attacks.
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request, *args, **kwargs):
        email = request.data.get('email')
        
        if not email:
            return Response(
                {'error': 'Email is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if the email exists in the system
        exists = User.objects.filter(email=email).exists()
        
        # For staff/admin users, we can return the actual result
        # For anonymous requests, we always return success to avoid email enumeration
        is_privileged = request.user.is_authenticated and (
            request.user.role in ['STAFF', 'ADMIN'] or 
            request.user.is_staff or
            request.user.is_superuser
        )
        
        if is_privileged:
            return Response({'exists': exists}, status=status.HTTP_200_OK)
        else:
            # Always return a success message, but include the true value for debugging in dev
            return Response({
                'message': 'Request processed successfully',
                'exists': exists if settings.DEBUG else None
            }, status=status.HTTP_200_OK)


class CreateTAFromEmailView(APIView):
    """
    API endpoint to create a TA account from an email address.
    This will look up the email in existing Excel import data or create a minimal account.
    """
    permission_classes = [permissions.AllowAny]
    
    def _extract_domain_info(self, email):
        """Extract department information from email domain"""
        if '@ug.bilkent.edu.tr' in email:
            # Extract department code from university email
            # Example: john.doe@cs.ug.bilkent.edu.tr -> CS department
            try:
                parts = email.split('@')
                if len(parts) == 2:
                    domain_parts = parts[1].split('.')
                    if len(domain_parts) > 3:  # Has department subdomain
                        dept_code = domain_parts[0].upper()
                        # Check if it's a valid department code
                        if Department.objects.filter(code=dept_code).exists():
                            return {
                                'department': dept_code,
                                'academic_level': 'MASTERS',  # Default
                                'employment_type': 'PART_TIME'  # Default
                            }
            except Exception as e:
                logger.error(f"Error extracting domain info: {str(e)}")
                
        # Default to CS department if we can't extract
        return {
            'department': 'CS',
            'academic_level': 'MASTERS',
            'employment_type': 'PART_TIME'
        }
    
    def _extract_name_from_email(self, email):
        """Extract first and last name from email address"""
        try:
            # Remove domain part
            username = email.split('@')[0]
            
            # Common formats: firstname.lastname, firstname_lastname, first.m.last
            name_parts = re.split(r'[._]', username)
            
            if len(name_parts) >= 2:
                first_name = name_parts[0].capitalize()
                last_name = name_parts[-1].capitalize()
                
                # If last part is a single character, use the part before it as last name
                if len(last_name) == 1 and len(name_parts) > 2:
                    last_name = name_parts[-2].capitalize()
                
                return {
                    'first_name': first_name,
                    'last_name': last_name
                }
        except Exception as e:
            logger.error(f"Error extracting name from email: {str(e)}")
        
        # Default: use email as first name and "User" as last name
        return {
            'first_name': email.split('@')[0],
            'last_name': 'User'
        }
    
    def generate_password(self, length=12):
        """Generate a secure random password."""
        chars = string.ascii_letters + string.digits + string.punctuation
        # Ensure password has at least one of each type of character
        password = random.choice(string.ascii_lowercase)
        password += random.choice(string.ascii_uppercase)
        password += random.choice(string.digits)
        password += random.choice('!@#$%^&*()_+-=[]{}|;:,.<>?')
        # Fill the rest randomly
        password += ''.join(random.choice(chars) for _ in range(length - 4))
        # Shuffle the password
        password_list = list(password)
        random.shuffle(password_list)
        return ''.join(password_list)
    
    def post(self, request, *args, **kwargs):
        email = request.data.get('email')
        
        if not email:
            return Response(
                {'error': 'Email is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if user already exists
        if User.objects.filter(email=email).exists():
            return Response({
                'exists': True,
                'created': False,
                'message': 'User with this email already exists'
            }, status=status.HTTP_200_OK)
        
        try:
            with transaction.atomic():
                # Extract basic info from email
                domain_info = self._extract_domain_info(email)
                name_info = self._extract_name_from_email(email)
                
                # Generate password
                password = self.generate_password()
                
                # Create the user
                user = User.objects.create_user(
                    email=email,
                    password=password,
                    first_name=name_info['first_name'],
                    last_name=name_info['last_name'],
                    role='TA',
                    department=domain_info['department'],
                    academic_level=domain_info['academic_level'],
                    employment_type=domain_info['employment_type'],
                    is_approved=True,  # Auto-approve TAs
                    email_verified=True,  # Auto-verify emails
                )
                
                # Store temporary password
                user.temp_password = password
                user.temp_password_expiry = timezone.now() + timedelta(days=7)  # Valid for 7 days
                user.save()
                
                # Send email with temporary password
                subject = 'Your Bilkent TA Management System Account'
                context = {
                    'user': user,
                    'temp_password': password,
                    'expiry_date': user.temp_password_expiry.strftime('%Y-%m-%d %H:%M'),
                    'login_url': f"{settings.FRONTEND_URL}/login"
                }
                
                html_message = render_to_string('email/password_email_template.html', context)
                plain_message = f"""
                Hello {user.first_name} {user.last_name},
                
                Your account has been created in the Bilkent TA Management System.
                Your temporary password is: {password}
                
                This password is valid until {user.temp_password_expiry.strftime('%Y-%m-%d %H:%M')}.
                Please log in to {settings.FRONTEND_URL}/login and change your password as soon as possible.
                
                Best regards,
                Bilkent TA Management System
                """
                
                try:
                    send_mail(
                        subject=subject,
                        message=plain_message,
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[user.email],
                        html_message=html_message,
                        fail_silently=False,
                    )
                    email_sent = True
                except Exception as e:
                    logger.error(f"Failed to send email to {user.email}: {str(e)}")
                    email_sent = False
                
                return Response({
                    'exists': False,
                    'created': True,
                    'message': 'User created successfully',
                    'email_sent': email_sent,
                    'user_info': {
                        'id': user.id,
                        'email': user.email,
                        'name': f"{user.first_name} {user.last_name}",
                        'temp_password': password if settings.DEBUG else None  # Only include password in debug mode
                    }
                }, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            logger.error(f"Error creating user from email: {str(e)}")
            return Response({
                'exists': False,
                'created': False,
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
