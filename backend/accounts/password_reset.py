from django.core.mail import send_mail
from django.conf import settings
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.decorators import authentication_classes, permission_classes
import random
import string
import logging
from .models import User

logger = logging.getLogger(__name__)

@authentication_classes([])  # Disable authentication completely
@permission_classes([AllowAny])  # Allow any user to access this view
class ForgotPasswordView(APIView):
    """
    View for handling forgot password requests.
    Generates a temporary password, updates the user's password,
    and sends an email with the temporary password.
    """
    permission_classes = [AllowAny]  # Use AllowAny permission properly imported
    authentication_classes = []  # Disable authentication at class level too

    def post(self, request):
        # Log full request details for debugging
        print(f"Received forgot password request: {request.data}")
        print(f"Request headers: {request.headers}")
        
        email = request.data.get('email')
        
        if not email:
            print(f"Email is required but was not provided.")
            return Response(
                {"error": "Email is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Find the user with the provided email
        user = None
        try:
            print(f"Looking for user with email: {email}")
            user = User.objects.get(email=email)
            print(f"User found: {user.email}, id: {user.id}")
        except User.DoesNotExist:
            # We don't want to reveal if a user exists or not for security reasons
            # So we still return 200 OK even if the user doesn't exist
            print(f"User not found with email: {email}")
            logger.info(f"Password reset requested for non-existent email: {email}")
            return Response(
                {"message": "If the email is registered, a temporary password has been sent."},
                status=status.HTTP_200_OK
            )
        
        # Generate a temporary password (10 characters)
        temp_password = ''.join(random.choices(
            string.ascii_letters + string.digits, k=10
        ))
        
        # Update user's password
        user.set_password(temp_password)
        user.save()
        
        # Send email with the temporary password
        subject = 'Bilkent TA Management System - Temporary Password'
        message = f"""
        Hello {user.first_name},
        
        You have requested a password reset for your Bilkent TA Management System account.
        
        Your temporary password is: {temp_password}
        
        Please log in with this temporary password and change it immediately for security reasons.
        
        If you did not request this password reset, please contact the system administrator.
        
        Best regards,
        Bilkent TA Management System Team
        """
        
        try:
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [email],
                fail_silently=False,
            )
            # Add logging to help debug email issues
            print(f"SUCCESS: Sent password reset email to {email} with password {temp_password}")
            logger.info(f"SUCCESS: Sent password reset email to {email} with password {temp_password}")
        except Exception as e:
            print(f"ERROR: Failed to send password reset email: {str(e)}")
            logger.error(f"ERROR: Failed to send password reset email: {str(e)}")
            # Still return success to prevent user enumeration
        
        # Always return success to prevent email enumeration attacks
        return Response(
            {"message": "If the email is registered, a temporary password has been sent."},
            status=status.HTTP_200_OK
        ) 