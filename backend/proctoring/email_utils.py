from django.conf import settings
from django.core.mail import send_mail, EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.utils import timezone


def send_proctor_swap_confirmation_email(swap_request):
    """
    Send a confirmation email to the original TA who initiated the swap.
    
    Args:
        swap_request (SwapRequest): The swap request that was completed
    """
    original_assignment = swap_request.original_assignment
    exam = original_assignment.exam
    new_proctor = swap_request.requested_proctor
    original_proctor = swap_request.requesting_proctor
    
    subject = f'Proctor Assignment Swapped: {exam.title}'
    from_email = settings.DEFAULT_FROM_EMAIL
    to_email = original_proctor.email
    
    # Context for email template
    context = {
        'original_proctor': original_proctor,
        'new_proctor': new_proctor,
        'exam': exam,
        'exam_room': original_assignment.exam_room,
        'swap_request': swap_request,
        'timestamp': timezone.now(),
    }
    
    # Load HTML content from template
    html_content = render_to_string('email/proctor_swap_confirmation.html', context)
    text_content = strip_tags(html_content)
    
    # Create and send email
    msg = EmailMultiAlternatives(subject, text_content, from_email, [to_email])
    msg.attach_alternative(html_content, "text/html")
    msg.send()


def send_proctor_swap_notification_email(swap_request):
    """
    Send a notification email to the new TA who received the swap.
    
    Args:
        swap_request (SwapRequest): The swap request that was completed
    """
    original_assignment = swap_request.original_assignment
    exam = original_assignment.exam
    new_proctor = swap_request.requested_proctor
    original_proctor = swap_request.requesting_proctor
    
    subject = f'New Proctor Assignment: {exam.title}'
    from_email = settings.DEFAULT_FROM_EMAIL
    to_email = new_proctor.email
    
    # Context for email template
    context = {
        'original_proctor': original_proctor,
        'new_proctor': new_proctor,
        'exam': exam,
        'exam_room': original_assignment.exam_room,
        'swap_request': swap_request,
        'timestamp': timezone.now(),
    }
    
    # Load HTML content from template
    html_content = render_to_string('email/proctor_swap_notification.html', context)
    text_content = strip_tags(html_content)
    
    # Create and send email
    msg = EmailMultiAlternatives(subject, text_content, from_email, [to_email])
    msg.attach_alternative(html_content, "text/html")
    msg.send()


def send_instructor_swap_notification_email(swap_request):
    """
    Send a notification email to the course instructor about the swap.
    
    Args:
        swap_request (SwapRequest): The swap request that was completed
    """
    original_assignment = swap_request.original_assignment
    exam = original_assignment.exam
    instructor = exam.section.instructor
    new_proctor = swap_request.requested_proctor
    original_proctor = swap_request.requesting_proctor
    
    if not instructor:
        return  # No instructor assigned to the section
    
    subject = f'Proctor Swap Notification: {exam.title}'
    from_email = settings.DEFAULT_FROM_EMAIL
    to_email = instructor.email
    
    # Context for email template
    context = {
        'instructor': instructor,
        'original_proctor': original_proctor,
        'new_proctor': new_proctor,
        'exam': exam,
        'exam_room': original_assignment.exam_room,
        'swap_request': swap_request,
        'timestamp': timezone.now(),
    }
    
    # Load HTML content from template
    html_content = render_to_string('email/instructor_swap_notification.html', context)
    text_content = strip_tags(html_content)
    
    # Create and send email
    msg = EmailMultiAlternatives(subject, text_content, from_email, [to_email])
    msg.attach_alternative(html_content, "text/html")
    msg.send() 