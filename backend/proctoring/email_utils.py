from django.conf import settings
from django.core.mail import send_mail, EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.utils import timezone
from datetime import datetime, timedelta


def format_time_range(start_time, end_time):
    """Format a time range string for display in emails."""
    start = datetime.strptime(start_time.strftime('%H:%M'), '%H:%M')
    end = datetime.strptime(end_time.strftime('%H:%M'), '%H:%M')
    return f"{start.strftime('%H:%M')} - {end.strftime('%H:%M')}"


def send_proctor_swap_confirmation_email(swap_request):
    """
    Send a confirmation email to the TA who requested the swap.
    
    Args:
        swap_request: The SwapRequest instance
    """
    assignment = swap_request.original_assignment
    exam = assignment.exam
    
    subject = f"Proctor Swap Confirmation: {exam.title}"
    
    # Context for the email template
    context = {
        'requesting_ta': swap_request.requesting_proctor.full_name,
        'new_ta': swap_request.requested_proctor.full_name,
        'exam_title': exam.title,
        'course_code': exam.section.course.code,
        'section_number': exam.section.section_number,
        'exam_date': exam.date.strftime('%A, %B %d, %Y'),
        'exam_time': format_time_range(exam.start_time, exam.end_time),
        'exam_location': f"{assignment.exam_room.classroom.building} - Room {assignment.exam_room.classroom.room_number}" if assignment.exam_room else "TBD",
        'swap_reason': swap_request.reason,
        'swap_timestamp': swap_request.response_date.strftime('%Y-%m-%d %H:%M')
    }
    
    # HTML version of the email
    html_content = render_to_string('proctoring/email/swap_confirmation.html', context)
    
    # Plain text version of the email
    text_content = strip_tags(html_content)
    
    # Create and send the email
    email = EmailMultiAlternatives(
        subject=subject,
        body=text_content,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[swap_request.requesting_proctor.email]
    )
    
    email.attach_alternative(html_content, "text/html")
    email.send()


def send_proctor_swap_notification_email(swap_request):
    """
    Send a notification email to the new proctor who is taking over the assignment.
    
    Args:
        swap_request: The SwapRequest instance
    """
    assignment = swap_request.original_assignment
    exam = assignment.exam
    
    subject = f"New Proctoring Assignment: {exam.title}"
    
    # Context for the email template
    context = {
        'new_ta': swap_request.requested_proctor.full_name,
        'original_ta': swap_request.requesting_proctor.full_name,
        'exam_title': exam.title,
        'course_code': exam.section.course.code,
        'section_number': exam.section.section_number,
        'exam_date': exam.date.strftime('%A, %B %d, %Y'),
        'exam_time': format_time_range(exam.start_time, exam.end_time),
        'exam_location': f"{assignment.exam_room.classroom.building} - Room {assignment.exam_room.classroom.room_number}" if assignment.exam_room else "TBD",
        'swap_reason': swap_request.reason,
        'swap_timestamp': swap_request.response_date.strftime('%Y-%m-%d %H:%M'),
        # Add upcoming assignments for the new TA
        'upcoming_assignments': get_upcoming_assignments_for_ta(swap_request.requested_proctor)
    }
    
    # HTML version of the email
    html_content = render_to_string('proctoring/email/new_assignment.html', context)
    
    # Plain text version of the email
    text_content = strip_tags(html_content)
    
    # Create and send the email
    email = EmailMultiAlternatives(
        subject=subject,
        body=text_content,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[swap_request.requested_proctor.email]
    )
    
    email.attach_alternative(html_content, "text/html")
    email.send()


def send_instructor_swap_notification_email(swap_request):
    """
    Send a notification email to the course instructor about the swap.
    
    Args:
        swap_request: The SwapRequest instance
    """
    assignment = swap_request.original_assignment
    exam = assignment.exam
    
    # Find the instructor(s) for this course
    instructors = exam.section.instructors.all()
    if not instructors:
        # If no instructors found, don't send the email
        return
    
    instructor_emails = [instructor.email for instructor in instructors]
    
    subject = f"Proctor Assignment Change: {exam.title}"
    
    # Context for the email template
    context = {
        'course_code': exam.section.course.code,
        'section_number': exam.section.section_number,
        'exam_title': exam.title,
        'exam_date': exam.date.strftime('%A, %B %d, %Y'),
        'exam_time': format_time_range(exam.start_time, exam.end_time),
        'exam_location': f"{assignment.exam_room.classroom.building} - Room {assignment.exam_room.classroom.room_number}" if assignment.exam_room else "TBD",
        'original_ta': swap_request.requesting_proctor.full_name,
        'new_ta': swap_request.requested_proctor.full_name,
        'swap_reason': swap_request.reason,
        'swap_timestamp': swap_request.response_date.strftime('%Y-%m-%d %H:%M')
    }
    
    # HTML version of the email
    html_content = render_to_string('proctoring/email/instructor_notification.html', context)
    
    # Plain text version of the email
    text_content = strip_tags(html_content)
    
    # Create and send the email
    email = EmailMultiAlternatives(
        subject=subject,
        body=text_content,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=instructor_emails
    )
    
    email.attach_alternative(html_content, "text/html")
    email.send()


def get_upcoming_assignments_for_ta(ta_user):
    """
    Get a list of upcoming proctoring assignments for a TA.
    
    Args:
        ta_user: The User object for the TA
        
    Returns:
        list: A list of dictionaries with assignment details
    """
    from .models import ProctorAssignment
    from django.utils import timezone
    
    # Get assignments that are scheduled for today or in the future
    assignments = ProctorAssignment.objects.filter(
        proctor=ta_user,
        exam__date__gte=timezone.now().date()
    ).select_related(
        'exam', 'exam__section', 'exam__section__course', 'exam_room', 'exam_room__classroom'
    ).order_by('exam__date', 'exam__start_time')
    
    result = []
    for assignment in assignments:
        exam = assignment.exam
        result.append({
            'title': exam.title,
            'course': exam.section.course.code,
            'section': exam.section.section_number,
            'date': exam.date.strftime('%A, %B %d, %Y'),
            'time': format_time_range(exam.start_time, exam.end_time),
            'location': f"{assignment.exam_room.classroom.building} - Room {assignment.exam_room.classroom.room_number}" if assignment.exam_room else "TBD",
            'status': assignment.get_status_display()
        })
    
    return result 