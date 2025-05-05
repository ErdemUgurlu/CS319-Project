import os, django, datetime
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ta_management_system.settings')
django.setup()

from proctoring.models import Exam
from accounts.models import User, Section
from django.utils import timezone

def create_sample_exam():
    # Check if exams exist
    exam_count = Exam.objects.all().count()
    print(f"Found {exam_count} exams")
    
    if exam_count == 0:
        print("No exams found. Creating a sample exam...")
        
        # Get an instructor
        instructor = User.objects.filter(role='INSTRUCTOR').first()
        if not instructor:
            print('No instructors found. Please create an instructor first.')
            return
        
        # Get a section
        section = Section.objects.first()
        if not section:
            print('No sections found. Please create a section first.')
            return
        
        # Create a sample exam
        try:
            exam = Exam.objects.create(
                title='Sample Midterm Exam',
                section=section,
                exam_type='MIDTERM',
                date=timezone.now().date() + datetime.timedelta(days=7),
                start_time=timezone.now().time(),
                end_time=(timezone.now() + datetime.timedelta(hours=2)).time(),
                duration_minutes=120,
                student_count=50,
                proctor_count_needed=2,
                room_count=1,
                status='PENDING',
                created_by=instructor,
                notes='This is a sample exam created for testing purposes.'
            )
            print(f'Created sample exam: {exam.title} for {exam.section}')
        except Exception as e:
            print(f"Error creating exam: {str(e)}")
    else:
        print("Exams already exist. No need to create a sample.")

if __name__ == "__main__":
    create_sample_exam() 