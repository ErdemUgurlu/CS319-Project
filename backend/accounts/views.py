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
    Section, TAAssignment, Classroom, WeeklySchedule, AuditLog, InstructorTAAssignment, Exam,
    TAProfile
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
    UserRegistrationSerializer, ChangePasswordSerializer, UserProfileSerializer, 
    UserUpdateSerializer, UserListSerializer, UserDetailSerializer, WeeklyScheduleSerializer,
    DepartmentSerializer, CourseSerializer, SectionSerializer, TAAssignmentSerializer,
    ClassroomSerializer, CustomTokenObtainPairSerializer, AdminCreateStaffSerializer,
    InstructorTAAssignmentSerializer, TADetailSerializer, ExamSerializer, TAProfileSerializer
)
import random
from datetime import timedelta
import re
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from decimal import Decimal
import os
from .utils import process_student_list_file
from django.http import Http404

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
    
    def list(self, request, *args, **kwargs):
        """Override list method to add debugging"""
        # Check if departments exist, if not create sample ones
        dept_count = Department.objects.count()
        print(f"Total department count: {dept_count}")
        
        # Create sample departments if none exist
        if dept_count == 0:
            print("No departments found. Creating sample departments...")
            departments_to_create = [
                {"code": "CS", "name": "Computer Science", "faculty": "Engineering"},
                {"code": "IE", "name": "Industrial Engineering", "faculty": "Engineering"},
                {"code": "EE", "name": "Electrical Engineering", "faculty": "Engineering"},
                {"code": "ME", "name": "Mechanical Engineering", "faculty": "Engineering"},
                {"code": "MATH", "name": "Mathematics", "faculty": "Science"},
            ]
            
            for dept_data in departments_to_create:
                Department.objects.create(**dept_data)
                print(f"Created department: {dept_data['code']}")
        
        queryset = self.filter_queryset(self.get_queryset())
        
        # Log the queryset details
        print(f"Department queryset count after possible creation: {queryset.count()}")
        
        serializer = self.get_serializer(queryset, many=True)
        
        # Return an array directly rather than wrapping in an object
        return Response(serializer.data)


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
    
    def get_queryset(self):
        """Override get_queryset to filter by instructor_id if provided"""
        queryset = super().get_queryset()
        instructor_id = self.request.query_params.get('instructor_id')
        
        if instructor_id:
            try:
                # Convert to integer and filter courses where the instructor 
                # is assigned to at least one section of the course
                instructor_id = int(instructor_id)
                queryset = queryset.filter(section__instructor_id=instructor_id).distinct()
                print(f"Filtering courses for instructor_id={instructor_id}, found {queryset.count()} courses")
            except (ValueError, TypeError):
                print(f"Invalid instructor_id parameter: {instructor_id}")
        
        return queryset
    
    def list(self, request, *args, **kwargs):
        """Override list method to add debugging"""
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        
        # Log the queryset details
        print(f"Course queryset count: {queryset.count()}")
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        
        # Return an array directly rather than wrapping in an object
        return Response(serializer.data)


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
    filterset_fields = ['course__department__code', 'course__code', 'instructor']
    search_fields = ['course__code', 'section_number']
    
    def get_queryset(self):
        """Override get_queryset to filter by instructor_id if provided"""
        queryset = super().get_queryset()
        instructor_id = self.request.query_params.get('instructor_id')
        
        if instructor_id:
            try:
                # Convert to integer and filter
                instructor_id = int(instructor_id)
                queryset = queryset.filter(instructor_id=instructor_id)
                print(f"Filtering sections for instructor_id={instructor_id}, found {queryset.count()} sections")
            except (ValueError, TypeError):
                print(f"Invalid instructor_id parameter: {instructor_id}")
        
        return queryset


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
    filterset_fields = ['section__course__department__code', 'section__course__code']
    
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
    serializer_class = serializers.InstructorTAAssignmentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.role != 'INSTRUCTOR':
            return InstructorTAAssignment.objects.none()
        
        return InstructorTAAssignment.objects.filter(instructor=user)


class AvailableTAsListView(generics.ListAPIView):
    """API endpoint for instructors to view unassigned TAs in their department."""
    serializer_class = serializers.TADetailSerializer
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
            
            serializer = serializers.InstructorTAAssignmentSerializer(assignment)
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
    serializer_class = serializers.TADetailSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Only return active and approved TAs with role='TA'
        queryset = User.objects.filter(
                role='TA',
            is_active=True,
            is_approved=True
        )
        
        # Optional department filter
        department = self.request.query_params.get('department', None)
        if department:
            queryset = queryset.filter(department=department)
        
        # Optional academic_level filter
        academic_level = self.request.query_params.get('academic_level', None)
        if academic_level:
            queryset = queryset.filter(academic_level=academic_level)
        
        # Optional employment_type filter
        employment_type = self.request.query_params.get('employment_type', None)
        if employment_type:
            queryset = queryset.filter(employment_type=employment_type)
        
        return queryset
    
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        
        # Log the action
        AuditLog.objects.create(
            user=request.user,
            action='READ',
            object_type='TA List',
            description=f"User viewed list of all TAs",
            ip_address=request.META.get('REMOTE_ADDR'),
        )
        
        return Response(serializer.data)


class TAProfileView(generics.RetrieveUpdateAPIView):
    """API endpoint for retrieving and updating TA profiles."""
    serializer_class = serializers.TAProfileSerializer
    permission_classes = [IsAuthenticated]
    
    def get_object(self):
        ta_id = self.kwargs.get('ta_id')
        try:
            user = User.objects.get(id=ta_id, role='TA')
            profile, created = TAProfile.objects.get_or_create(user=user)
            return profile
        except User.DoesNotExist:
            raise Http404("TA not found")
    
    def perform_update(self, serializer):
        # Only allow certain fields to be updated
        instance = serializer.instance
        
        # Ensure that workload_number remains immutable once set
        if instance.workload_number and 'workload_number' in serializer.validated_data:
            serializer.validated_data.pop('workload_number')
        
        serializer.save()
        
        # Log the action
        AuditLog.objects.create(
            user=self.request.user,
            action='UPDATE',
            object_type='TAProfile',
            object_id=instance.id,
            description=f"User updated TA profile for {instance.user.full_name}",
            ip_address=self.request.META.get('REMOTE_ADDR'),
        )


class PendingApprovalUsersView(generics.ListAPIView):
    """API endpoint for staff to view users pending approval in their department."""
    serializer_class = serializers.UserListSerializer
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
            
        serializer = serializers.InstructorTAAssignmentSerializer(assignments, many=True)
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
        
        serializer = serializers.InstructorTAAssignmentSerializer(data=data)
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
                
                # Extract TA profile specific fields
                undergrad_university = ta_data.get('undergrad_university', '')
                workload_number = ta_data.get('workload_number', None)
                supervisor_email = ta_data.get('supervisor_email', None)
                
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
                
                # Create/update TA profile with additional fields
                profile, _ = TAProfile.objects.get_or_create(user=user)
                profile.undergrad_university = undergrad_university
                
                # Set workload number if provided
                if workload_number and not profile.workload_number:  # Only set if not already set (immutable)
                    profile.workload_number = workload_number
                
                # Set supervisor if provided
                if supervisor_email:
                    try:
                        supervisor = User.objects.get(email=supervisor_email, role='INSTRUCTOR')
                        profile.supervisor = supervisor
                    except User.DoesNotExist:
                        # Log but don't fail if supervisor not found
                        logger.warning(f"Supervisor with email {supervisor_email} not found for TA {email}")
                
                profile.save()
                
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


class ImportCoursesFromExcelView(APIView):
    """
    View for importing courses from Excel file.
    Staff users can upload an Excel file with course data to create or update courses and sections.
    """
    permission_classes = [permissions.IsAuthenticated, IsAdminOrStaff]
    parser_classes = [MultiPartParser, FormParser]
    
    @transaction.atomic
    def post(self, request, *args, **kwargs):
        """Process course data from Excel and create courses and sections."""
        # Check if file is provided
        if 'file' not in request.FILES:
            return Response(
                {"detail": "No file provided"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        excel_file = request.FILES['file']
        
        # Validate file is Excel
        if not excel_file.name.endswith(('.xls', '.xlsx')):
            return Response(
                {"detail": "File must be an Excel file (.xls or .xlsx)"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Read Excel file using pandas
            import pandas as pd
            df = pd.read_excel(excel_file)
            
            # Expected columns: Department, Course Code, Course Title, Credits, Section Count, Student Count
            expected_columns = ['Department', 'Course Code', 'Course Title', 'Credits', 'Section Count', 'Student Count']
            
            # Validate all required columns exist
            missing_columns = [col for col in expected_columns if col not in df.columns]
            if missing_columns:
                return Response(
                    {"detail": f"Missing required columns: {', '.join(missing_columns)}"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Process each row
            created_courses = []
            created_sections = []
            errors = []
            
            for index, row in df.iterrows():
                try:
                    dept_code = row['Department']
                    course_code = row['Course Code']
                    course_title = row['Course Title']
                    credits = row['Credits']
                    section_count = int(row['Section Count'])
                    student_count = int(row['Student Count'])
                    
                    # Validate numeric fields
                    if section_count < 1:
                        errors.append({
                            "row": index + 2,  # +2 because Excel rows start at 1 and we have a header
                            "error": "Section Count must be at least 1",
                            "data": row.to_dict()
                        })
                        continue
                    
                    if student_count < 0:
                        errors.append({
                            "row": index + 2,
                            "error": "Student Count cannot be negative",
                            "data": row.to_dict()
                        })
                        continue
                    
                    # Check if the department exists, create if not
                    try:
                        department = Department.objects.get(code=dept_code)
                    except Department.DoesNotExist:
                        # Create a new department
                        department = Department.objects.create(
                            code=dept_code,
                            name=f"{dept_code} Department",  # Generic name
                            faculty="Unknown"  # Default faculty
                        )
                    
                    # Create or update the course
                    course, created = Course.objects.update_or_create(
                        department=department,
                        code=course_code,
                        defaults={
                            'title': course_title,
                            'credit': Decimal(str(credits))
                        }
                    )
                    
                    if created:
                        created_courses.append({
                            "id": course.id,
                            "code": f"{dept_code}{course_code}",
                            "title": course_title
                        })
                    
                    # Create sections for the course
                    for i in range(1, section_count + 1):
                        section_number = str(i)
                        
                        # Check if section already exists
                        section, section_created = Section.objects.update_or_create(
                            course=course,
                            section_number=section_number,
                            defaults={
                                'student_count': student_count
                            }
                        )
                        
                        if section_created:
                            created_sections.append({
                                "id": section.id,
                                "course": f"{dept_code}{course_code}",
                                "section": section_number,
                                "student_count": student_count
                            })
                    
                except Exception as e:
                    errors.append({
                        "row": index + 2,
                        "error": str(e),
                        "data": row.to_dict() if hasattr(row, 'to_dict') else str(row)
                    })
            
            # Log the import action
            AuditLog.objects.create(
                user=request.user,
                action='IMPORT',
                object_type='Course',
                object_id=None,
                description=f"Imported {len(created_courses)} courses and {len(created_sections)} sections from Excel",
                ip_address=request.META.get('REMOTE_ADDR'),
            )
            
            return Response({
                "created_courses": created_courses,
                "created_sections": created_sections,
                "errors": errors,
                "total_courses_created": len(created_courses),
                "total_sections_created": len(created_sections),
                "total_errors": len(errors)
            }, status=status.HTTP_201_CREATED if created_courses or created_sections else status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            import traceback
            return Response({
                "detail": f"Error processing Excel file: {str(e)}",
                "traceback": traceback.format_exc()
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CourseCreateView(generics.CreateAPIView):
    """
    API endpoint that allows staff to create courses.
    """
    serializer_class = serializers.CourseSerializer
    permission_classes = [IsStaffUser]
    
    def perform_create(self, serializer):
        course = serializer.save()
        
        # Log the course creation
        AuditLog.objects.create(
            user=self.request.user,
            action='CREATE',
            object_type='Course',
            object_id=course.id,
            description=f"Course {course.department.code}{course.code} created",
            ip_address=self.request.META.get('REMOTE_ADDR'),
        )


class CourseUpdateView(generics.UpdateAPIView):
    """
    API endpoint that allows staff to update courses.
    """
    queryset = Course.objects.all()
    serializer_class = serializers.CourseSerializer
    permission_classes = [IsStaffUser]
    
    def perform_update(self, serializer):
        course = serializer.save()
        
        # Log the course update
        AuditLog.objects.create(
            user=self.request.user,
            action='UPDATE',
            object_type='Course',
            object_id=course.id,
            description=f"Course {course.department.code}{course.code} updated",
            ip_address=self.request.META.get('REMOTE_ADDR'),
        )


class SectionCreateView(generics.CreateAPIView):
    """
    API endpoint that allows staff to create sections.
    """
    serializer_class = serializers.SectionSerializer
    permission_classes = [IsStaffUser]
    
    def perform_create(self, serializer):
        section = serializer.save()
        
        # Log the section creation
        AuditLog.objects.create(
            user=self.request.user,
            action='CREATE',
            object_type='Section',
            object_id=section.id,
            description=f"Section {section} created",
            ip_address=self.request.META.get('REMOTE_ADDR'),
        )


class SectionUpdateView(generics.UpdateAPIView):
    """
    API endpoint that allows staff to update sections.
    """
    queryset = Section.objects.all()
    serializer_class = serializers.SectionSerializer
    permission_classes = [IsStaffUser]
    
    def perform_update(self, serializer):
        section = serializer.save()
        
        # Log the section update
        AuditLog.objects.create(
            user=self.request.user,
            action='UPDATE',
            object_type='Section',
            object_id=section.id,
            description=f"Section {section} updated",
            ip_address=self.request.META.get('REMOTE_ADDR'),
        )


class SectionDeleteView(generics.DestroyAPIView):
    """
    API endpoint that allows staff to delete sections.
    """
    queryset = Section.objects.all()
    permission_classes = [IsStaffUser]
    
    def perform_destroy(self, instance):
        # Log the section deletion
        AuditLog.objects.create(
            user=self.request.user,
            action='DELETE',
            object_type='Section',
            object_id=instance.id,
            description=f"Section {instance.course.department.code}{instance.course.code}-{instance.section_number} deleted by staff",
            ip_address=self.request.META.get('REMOTE_ADDR'),
        )
        
        instance.delete()
        
    def destroy(self, request, *args, **kwargs):
        try:
            # Check if section has TA assignments
            instance = self.get_object()
            assignments = TAAssignment.objects.filter(section=instance)
            
            if assignments.exists():
                return Response(
                    {"detail": f"Cannot delete section with {assignments.count()} TA assignments. Please remove the assignments first."},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            self.perform_destroy(instance)
            return Response({"detail": "Section deleted successfully"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"detail": f"Error deleting section: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)


class CourseDeleteView(generics.DestroyAPIView):
    """
    API endpoint that allows staff to delete courses.
    """
    queryset = Course.objects.all()
    permission_classes = [IsStaffUser]
    
    def perform_destroy(self, instance):
        # Log the course deletion
        AuditLog.objects.create(
            user=self.request.user,
            action='DELETE',
            object_type='Course',
            object_id=instance.id,
            description=f"Course {instance.department.code}{instance.code} deleted by staff",
            ip_address=self.request.META.get('REMOTE_ADDR'),
        )
        
        instance.delete()
        
    def destroy(self, request, *args, **kwargs):
        try:
            # Check if course has sections
            instance = self.get_object()
            sections = Section.objects.filter(course=instance)
            
            if sections.exists():
                return Response(
                    {"detail": f"Cannot delete course with {sections.count()} sections. Please delete the sections first."},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            self.perform_destroy(instance)
            return Response({"detail": "Course deleted successfully"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"detail": f"Error deleting course: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)


# Exam Management Views

class IsInstructorForCourse(permissions.BasePermission):
    """
    Custom permission to only allow instructors to manage exams for courses they teach.
    Dean's Office can view all exams.
    """
    def has_permission(self, request, view):
        # Staff, admin, and dean's office can do anything
        if request.user.role in ['STAFF', 'ADMIN', 'DEAN_OFFICE']:
            return True
        
        # If it's an instructor, check if they're trying to access their own courses
        if request.user.role == 'INSTRUCTOR':
            # For list and create views, check request parameters
            course_id = request.query_params.get('course_id') or request.data.get('course_id')
            
            if not course_id:
                # If no course_id specified, only allow for staff
                return request.user.role in ['STAFF', 'ADMIN', 'DEAN_OFFICE']
                
            # Check if instructor teaches this course
            return Section.objects.filter(
                course_id=course_id,
                instructor=request.user
            ).exists()
        
        return False
    
    def has_object_permission(self, request, view, obj):
        # Staff, admin, and dean's office can do anything
        if request.user.role in ['STAFF', 'ADMIN', 'DEAN_OFFICE']:
            return True
        
        # If it's an instructor, check if the exam belongs to a course they teach
        if request.user.role == 'INSTRUCTOR':
            return Section.objects.filter(
                course=obj.course,
                instructor=request.user
            ).exists()
        
        return False


class ExamListView(generics.ListAPIView):
    """
    API endpoint that allows users to list exams.
    Instructors can only see exams for courses they teach.
    """
    serializer_class = serializers.ExamSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['course', 'type', 'status']
    search_fields = ['course__code', 'course__title']
    
    def get_queryset(self):
        """Override get_queryset to filter by instructor access"""
        user = self.request.user
        
        # For staff, admin, and dean's office, show all exams
        if user.role in ['STAFF', 'ADMIN', 'DEAN_OFFICE']:
            # Allow filtering by status parameter if provided
            status = self.request.query_params.get('status')
            if status:
                return Exam.objects.filter(status=status)
            return Exam.objects.all()
            
        # For instructors, show only exams for courses they teach
        if user.role == 'INSTRUCTOR':
            # Get all courses where the user is an instructor
            instructor_courses = Course.objects.filter(
                section__instructor=user
            ).distinct()
            
            return Exam.objects.filter(course__in=instructor_courses)
            
        # For other roles, return empty queryset
        return Exam.objects.none()


class ExamDetailView(generics.RetrieveAPIView):
    """
    API endpoint that allows users to view an exam.
    Instructors can only view exams for courses they teach.
    """
    queryset = Exam.objects.all()
    serializer_class = serializers.ExamSerializer
    permission_classes = [IsAuthenticated, IsInstructorForCourse]


class ExamCreateView(generics.CreateAPIView):
    """
    API endpoint that allows users to create exams.
    Instructors can only create exams for courses they teach.
    """
    serializer_class = serializers.ExamSerializer
    permission_classes = [IsAuthenticated, IsInstructorForCourse]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def perform_create(self, serializer):
        exam = serializer.save()
        
        # Process student list file if provided
        if exam.student_list_file:
            file_path = os.path.join(settings.MEDIA_ROOT, exam.student_list_file.name)
            result = process_student_list_file(file_path)
            
            if result.get('error'):
                # Log the error but don't fail the exam creation
                logger.error(f"Error processing student list for exam {exam.id}: {result['error']}")
            else:
                # Update student count and status
                exam.student_count = result['student_count']
                exam.status = Exam.Status.WAITING_FOR_PLACES
                exam.save(update_fields=['student_count', 'status'])
        
        # Log the exam creation
        AuditLog.objects.create(
            user=self.request.user,
            action='CREATE',
            object_type='Exam',
            object_id=exam.id,
            description=f"Exam created for {exam.course} ({exam.get_type_display()})",
            ip_address=self.request.META.get('REMOTE_ADDR'),
        )


class ExamUpdateView(generics.UpdateAPIView):
    """
    API endpoint that allows users to update exams.
    Instructors can only update exams for courses they teach.
    """
    queryset = Exam.objects.all()
    serializer_class = serializers.ExamSerializer
    permission_classes = [IsAuthenticated, IsInstructorForCourse]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def perform_update(self, serializer):
        exam = serializer.save()
        
        # Process student list file if provided
        if 'student_list_file' in self.request.FILES:
            file_path = os.path.join(settings.MEDIA_ROOT, exam.student_list_file.name)
            result = process_student_list_file(file_path)
            
            if result.get('error'):
                # Log the error but don't fail the exam update
                logger.error(f"Error processing student list for exam {exam.id}: {result['error']}")
            else:
                # Update student count and status
                exam.student_count = result['student_count']
                exam.status = Exam.Status.WAITING_FOR_PLACES
                exam.save(update_fields=['student_count', 'status'])
        
        # Log the exam update
        AuditLog.objects.create(
            user=self.request.user,
            action='UPDATE',
            object_type='Exam',
            object_id=exam.id,
            description=f"Exam updated for {exam.course} ({exam.get_type_display()})",
            ip_address=self.request.META.get('REMOTE_ADDR'),
        )


class ExamDeleteView(generics.DestroyAPIView):
    """
    API endpoint that allows users to delete exams.
    Instructors can only delete exams for courses they teach.
    """
    queryset = Exam.objects.all()
    serializer_class = serializers.ExamSerializer
    permission_classes = [IsAuthenticated, IsInstructorForCourse]
    
    def perform_destroy(self, instance):
        # Log the exam deletion
        AuditLog.objects.create(
            user=self.request.user,
            action='DELETE',
            object_type='Exam',
            object_id=instance.id,
            description=f"Exam deleted for {instance.course} ({instance.get_type_display()})",
            ip_address=self.request.META.get('REMOTE_ADDR'),
        )
        
        instance.delete()
        
    def destroy(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            self.perform_destroy(instance)
            return Response({"detail": "Exam deleted successfully"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"detail": f"Error deleting exam: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)


class IsDeanOffice(permissions.BasePermission):
    """
    Custom permission to only allow the Dean's Office to assign classrooms to exams.
    """
    def has_permission(self, request, view):
        # Only Dean's Office, Staff and Admin can assign classrooms
        return request.user.role in ['DEAN_OFFICE', 'STAFF', 'ADMIN']


class ExamAssignClassroomView(generics.UpdateAPIView):
    """
    API endpoint that allows the Dean's Office to assign classrooms to exams.
    """
    queryset = Exam.objects.all()
    serializer_class = serializers.ExamSerializer
    permission_classes = [IsAuthenticated, IsDeanOffice]
    
    def update(self, request, *args, **kwargs):
        try:
            # Get the exam instance
            instance = self.get_object()
            
            # Remove the student list requirement check
            # Check if student list is provided
            # if not instance.has_student_list or instance.status == Exam.Status.WAITING_FOR_STUDENT_LIST:
            #     return Response(
            #         {"detail": "Student list must be uploaded before assigning classrooms"}, 
            #         status=status.HTTP_400_BAD_REQUEST
            #     )
            
            # We still want to limit the status to waiting for places, but remove the strict check
            # Ensure the exam is in the correct status
            # if instance.status != Exam.Status.WAITING_FOR_PLACES:
            #     return Response(
            #         {"detail": f"Exam is in {instance.get_status_display()} status and cannot be assigned classrooms"}, 
            #         status=status.HTTP_400_BAD_REQUEST
            #     )
            
            # Extract classroom IDs from request data
            classroom_ids = request.data.get('classrooms', [])
            if not classroom_ids:
                return Response({"detail": "No classrooms provided"}, status=status.HTTP_400_BAD_REQUEST)
            
            # Convert to list if it's a single value
            if not isinstance(classroom_ids, list):
                classroom_ids = [classroom_ids]
            
            # Ensure all classrooms exist
            classrooms = Classroom.objects.filter(id__in=classroom_ids)
            if len(classrooms) != len(classroom_ids):
                return Response({"detail": "One or more classrooms do not exist"}, status=status.HTTP_400_BAD_REQUEST)
            
            # Assign the first classroom directly to the exam (to maintain backward compatibility)
            instance.classroom = classrooms.first()
            
            # Update the status to AWAITING_PROCTORS - Logic moved to Exam.save()
            # if instance.status == Exam.Status.WAITING_FOR_PLACES:
            #     instance.status = Exam.Status.AWAITING_PROCTORS
            
            instance.save()
            
            # Log the classroom assignment
            AuditLog.objects.create(
                user=request.user,
                action='UPDATE',
                object_type='Exam',
                object_id=instance.id,
                description=f"Classrooms assigned to {instance.course} ({instance.get_type_display()}) by {request.user.full_name}",
                ip_address=request.META.get('REMOTE_ADDR'),
            )
            
            return Response({
                "detail": "Classrooms assigned successfully",
                "classrooms": [{"id": c.id, "building": c.building, "room_number": c.room_number, "capacity": c.capacity} for c in classrooms],
                "status": instance.status,
                "status_display": instance.status_display
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"detail": f"Error assigning classrooms: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)


class ClassroomListView(generics.ListAPIView):
    """
    API endpoint that allows users to view available classrooms.
    """
    queryset = Classroom.objects.all().order_by('building', 'room_number')
    serializer_class = serializers.ClassroomSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['building', 'room_number']
    filterset_fields = ['building']


class ExamSetProctorsView(generics.UpdateAPIView):
    """
    API endpoint that allows instructors or staff to set the proctor count for an exam.
    """
    queryset = Exam.objects.all()
    serializer_class = serializers.ExamSerializer
    permission_classes = [IsAuthenticated, IsInstructorForCourse]
    
    def update(self, request, *args, **kwargs):
        try:
            # Get the exam instance
            instance = self.get_object()
            
            # Extract proctor count from request data
            proctor_count = request.data.get('proctor_count')
            if proctor_count is None:
                return Response({"detail": "No proctor count provided"}, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                proctor_count = int(proctor_count)
                # Allow proctor count to be 0
                if proctor_count < 0:
                    return Response({"detail": "Proctor count cannot be negative"}, status=status.HTTP_400_BAD_REQUEST)
            except (ValueError, TypeError):
                return Response({"detail": "Invalid proctor count"}, status=status.HTTP_400_BAD_REQUEST)
            
            # Update the proctor count
            instance.proctor_count = proctor_count
            
            # --- REMOVED: Don't automatically set status to READY --- 
            # instance.status = Exam.Status.READY 
            
            # Save the updated proctor count
            instance.save(update_fields=['proctor_count'])
            
            # --- ADDED: Re-evaluate status based on new proctor count --- 
            print(f"[ExamSetProctorsView] Calling update_status_based_on_proctoring for Exam ID {instance.id} after setting proctor_count to {proctor_count}")
            instance.update_status_based_on_proctoring()
            # Refresh instance from db to get the potentially updated status
            instance.refresh_from_db(fields=['status'])
            
            # Log the proctor count update
            AuditLog.objects.create(
                user=request.user,
                action='UPDATE',
                object_type='Exam',
                object_id=instance.id,
                description=f"Proctor count set to {proctor_count} for {instance.course} ({instance.get_type_display()}) by {request.user.full_name}",
                ip_address=request.META.get('REMOTE_ADDR'),
            )
            
            return Response({
                "detail": "Proctor count set successfully",
                "proctor_count": instance.proctor_count,
                "status": instance.status, # Return the potentially updated status
                "status_display": instance.get_status_display() # Use the method to get display
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"detail": f"Error setting proctor count: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)


class ExamStudentListUploadView(generics.UpdateAPIView):
    """
    API endpoint that allows instructors to upload a student list for an existing exam.
    """
    queryset = Exam.objects.all()
    serializer_class = serializers.ExamSerializer
    permission_classes = [IsAuthenticated, IsInstructorForCourse]
    parser_classes = [MultiPartParser, FormParser]
    
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # Check if the student list file is provided
        if 'student_list_file' not in request.FILES:
            return Response(
                {"detail": "Student list file is required."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update the instance with the new file
        instance.student_list_file = request.FILES['student_list_file']
        instance.has_student_list = True
        instance.save()
        
        # Process the file
        file_path = os.path.join(settings.MEDIA_ROOT, instance.student_list_file.name)
        result = process_student_list_file(file_path)
        
        if result.get('error'):
            return Response(
                {"detail": f"Error processing student list: {result['error']}"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update student count and status
        instance.student_count = result['student_count']
        instance.status = Exam.Status.WAITING_FOR_PLACES
        instance.save(update_fields=['student_count', 'status'])
        
        # Log the student list upload
        AuditLog.objects.create(
            user=request.user,
            action='UPDATE',
            object_type='Exam',
            object_id=instance.id,
            description=f"Student list uploaded for {instance.course} ({instance.get_type_display()}) with {result['student_count']} students",
            ip_address=request.META.get('REMOTE_ADDR'),
        )
        
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class ExamPlacementImportView(APIView):
    """
    API endpoint for importing exam classroom assignments from an Excel file.
    Only Dean's Office, Staff, and Admin users can import exam placements.
    """
    permission_classes = [IsAuthenticated, IsDeanOffice]
    parser_classes = [MultiPartParser, FormParser]
    
    def post(self, request, *args, **kwargs):
        logger.info(f"ExamPlacementImportView: Received file import request from user {request.user.email}")
        # Check if file is provided
        if 'file' not in request.FILES:
            logger.warning("ExamPlacementImportView: No file provided in request.")
            return Response(
                {"detail": "No file provided"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        excel_file = request.FILES['file']
        
        # Validate file is Excel
        if not excel_file.name.endswith(('.xls', '.xlsx')):
            logger.warning(f"ExamPlacementImportView: Invalid file type: {excel_file.name}")
            return Response(
                {"detail": "File must be an Excel file (.xls or .xlsx)"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            import pandas as pd
            df = pd.read_excel(excel_file)
            logger.info(f"ExamPlacementImportView: Successfully read Excel file. Shape: {df.shape}")
            
            # Fix NaN values that can cause JSON serialization issues
            df = df.replace({pd.NA: None, float('nan'): None})
            
            required_columns = ['Exam ID', 'Building', 'Room Number']
            missing_columns = [col for col in required_columns if col not in df.columns]
            if missing_columns:
                logger.warning(f"ExamPlacementImportView: Missing required columns: {missing_columns}")
                return Response(
                    {"detail": f"Missing required columns: {', '.join(missing_columns)}"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            assignments = []
            errors = []
            
            with transaction.atomic():
                logger.info("ExamPlacementImportView: Starting transaction to process exam placements.")
                for index, row in df.iterrows():
                    row_num_for_logging = index + 2  # For user-friendly row numbers (1-indexed + header)
                    exam_id_from_excel = None
                    try:
                        exam_id_from_excel = row.get('Exam ID')
                        if pd.isna(exam_id_from_excel): # Handle empty/NaN Exam ID
                            logger.warning(f"ExamPlacementImportView: Row {row_num_for_logging}: Skipping due to missing 'Exam ID'.")
                            errors.append({
                                "row": row_num_for_logging,
                                "error": "Missing 'Exam ID' in this row.",
                                "data": row.replace({pd.NA: None, float('nan'): None}).to_dict()
                            })
                            continue
                        exam_id = int(exam_id_from_excel)
                        
                        building = str(row.get('Building', '')).strip()
                        room_number = str(row.get('Room Number', '')).strip()

                        if not building or not room_number:
                            logger.warning(f"ExamPlacementImportView: Row {row_num_for_logging}, Exam ID {exam_id}: Skipping due to missing 'Building' or 'Room Number'.")
                            errors.append({
                                "row": row_num_for_logging,
                                "error": "Missing 'Building' or 'Room Number' in this row.",
                                "exam_id": exam_id,
                                "data": row.replace({pd.NA: None, float('nan'): None}).to_dict()
                            })
                            continue

                        logger.info(f"ExamPlacementImportView: Row {row_num_for_logging}: Processing Exam ID {exam_id}, Classroom {building}-{room_number}")

                        # Get or create the classroom
                        classroom_capacity = row.get('Capacity')
                        if pd.isna(classroom_capacity) or classroom_capacity <= 0:
                            classroom_capacity = 50 # Default capacity
                        else:
                            classroom_capacity = int(classroom_capacity)

                        classroom, created = Classroom.objects.get_or_create(
                            building=building,
                            room_number=room_number,
                            defaults={'capacity': classroom_capacity }
                        )
                        if created:
                            logger.info(f"ExamPlacementImportView: Row {row_num_for_logging}: Created new classroom {classroom} with capacity {classroom_capacity}")
                        else:
                            logger.info(f"ExamPlacementImportView: Row {row_num_for_logging}: Found existing classroom {classroom}")
                        
                        # Get the exam
                        exam = Exam.objects.get(id=exam_id)
                        logger.info(f"ExamPlacementImportView: Row {row_num_for_logging}: Found Exam {exam.id} ({exam.course}) with current status '{exam.status_display}' and classroom '{exam.classroom}'")
                        
                        # Capture status before potential modification by exam.save()
                        status_before_save_display = exam.get_status_display()
                        
                        if exam.classroom and exam.classroom != classroom:
                            logger.warning(f"ExamPlacementImportView: Row {row_num_for_logging}, Exam ID {exam.id}: Already has classroom {exam.classroom}. It will be overwritten with {classroom}.")
                            errors.append({ # This is a warning, not a critical error preventing assignment
                                "row": row_num_for_logging,
                                "warning": f"Exam {exam.id} already had classroom {exam.classroom}. Overwriting with {classroom}.",
                                "exam_id": exam.id,
                                "data": row.replace({pd.NA: None, float('nan'): None}).to_dict()
                            })
                        
                        # Assign classroom to exam
                        exam.classroom = classroom
                        logger.info(f"ExamPlacementImportView: Row {row_num_for_logging}, Exam ID {exam.id}: Classroom object {classroom} assigned to exam.classroom field. Status before save: '{status_before_save_display}'")
                        
                        # The Exam.save() method will handle the status transition
                        exam.save() 
                        logger.info(f"ExamPlacementImportView: Row {row_num_for_logging}, Exam ID {exam.id}: Exam saved. New status: '{exam.status_display}', New classroom: '{exam.classroom}'")
                        
                        assignments.append({
                            "row": row_num_for_logging,
                            "exam_id": exam.id,
                            "course": f"{exam.course.department.code}{exam.course.code}",
                            "classroom": f"{classroom.building}-{classroom.room_number}",
                            "capacity": classroom.capacity,
                            "student_count": exam.student_count,
                            "previous_status": status_before_save_display, # Use the captured display status
                            "new_status": exam.status, 
                            "status_display": exam.status_display 
                        })
                        
                    except Exam.DoesNotExist:
                        logger.warning(f"ExamPlacementImportView: Row {row_num_for_logging}: Exam with ID '{exam_id_from_excel}' not found.")
                        errors.append({
                            "row": row_num_for_logging,
                            "error": f"Exam with ID '{exam_id_from_excel}' not found.",
                            "data": row.replace({pd.NA: None, float('nan'): None}).to_dict()
                        })
                        continue # Skip to the next row
                    except ValueError as ve: # Catches int(exam_id_from_excel) error if 'Exam ID' is not a number
                        logger.error(f"ExamPlacementImportView: Row {row_num_for_logging}: Invalid 'Exam ID' format: '{exam_id_from_excel}'. Error: {ve}")
                        errors.append({
                            "row": row_num_for_logging,
                            "error": f"Invalid 'Exam ID' format: '{exam_id_from_excel}'. Must be a number.",
                            "data": row.replace({pd.NA: None, float('nan'): None}).to_dict()
                        })
                        continue
                    except Exception as e:
                        logger.error(f"ExamPlacementImportView: Row {row_num_for_logging}, Exam ID '{exam_id_from_excel}': An unexpected error occurred: {type(e).__name__} - {str(e)}", exc_info=True)
                        errors.append({
                            "row": row_num_for_logging,
                            "error": f"An unexpected error occurred: {str(e)}",
                            "exam_id": exam_id_from_excel,
                            "data": row.replace({pd.NA: None, float('nan'): None}).to_dict()
                        })
                        # Decide if you want to continue or re-raise to rollback transaction for unexpected errors
                        # For now, we'll continue processing other rows.
                        continue
            
            logger.info(f"ExamPlacementImportView: Transaction finished. Total assignments processed: {len(assignments)}, Total errors/warnings: {len(errors)}")
            
            if not assignments and errors:
                 logger.warning("ExamPlacementImportView: No classrooms were assigned, and there were errors. Check the errors list.")
            elif not assignments and not errors:
                 logger.info("ExamPlacementImportView: No classrooms were assigned (e.g. empty Excel or all rows skipped for valid reasons like missing student lists), and no critical errors occurred during processing.")


            # Log the import action
            AuditLog.objects.create(
                user=request.user,
                action='IMPORT',
                object_type='ExamPlacement', # Consider changing if it's more of an "attempt"
                description=f"Attempted import of {df.shape[0]} exam classroom assignments. Successfully assigned: {len(assignments)}. Errors/Skipped: {len(errors)}.",
                ip_address=request.META.get('REMOTE_ADDR')
            )
            
            return Response({
                "detail": f"Processed {df.shape[0]} rows. Successfully assigned classrooms to {len(assignments)} exams. Encountered {len(errors)} issues (errors or skipped rows).",
                "assignments": assignments,
                "errors": errors # This list is crucial for the user to understand what happened
            }, status=status.HTTP_200_OK)
            
        except pd.errors.EmptyDataError:
            logger.error("ExamPlacementImportView: Uploaded Excel file is empty.")
            return Response({"detail": "The uploaded Excel file is empty."}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"ExamPlacementImportView: A critical error occurred while processing the Excel file: {type(e).__name__} - {str(e)}", exc_info=True)
            return Response({
                "detail": f"Error processing Excel file: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
