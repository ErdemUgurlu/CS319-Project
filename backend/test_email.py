"""
A simple script to test email sending functionality.
Run with: python test_email.py
"""

import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ta_management_system.settings')
django.setup()

from django.core.mail import send_mail
from django.conf import settings

def test_email():
    subject = 'Test Email from Bilkent TA Management System'
    message = """
    This is a test email from the Bilkent TA Management System.
    
    If you received this, email sending is working correctly.
    
    Best regards,
    Bilkent TA Management System Team
    """
    recipient_email = "erdemcs319@gmail.com"  # Use the same email as the sender for testing
    
    print(f"Sending test email to {recipient_email}")
    print(f"Email settings: HOST={settings.EMAIL_HOST}, PORT={settings.EMAIL_PORT}")
    print(f"FROM={settings.DEFAULT_FROM_EMAIL}, TLS={settings.EMAIL_USE_TLS}")
    
    try:
        result = send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [recipient_email],
            fail_silently=False,
        )
        print(f"Email sent successfully! Result: {result}")
    except Exception as e:
        print(f"Failed to send email: {str(e)}")
        print(f"Exception type: {type(e).__name__}")
        if hasattr(e, 'smtp_code'):
            print(f"SMTP code: {e.smtp_code}")
        if hasattr(e, 'smtp_error'):
            print(f"SMTP error: {e.smtp_error}")

# Run the test function
if __name__ == "__main__":
    test_email()
    print("Test email script completed.") 