# Change to backend directory
cd backend

# Try to get the exam count
Write-Output "Checking if exams exist..."
$examCount = python -c "
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ta_management_system.settings')
django.setup()
from proctoring.models import Exam
print(Exam.objects.all().count())
"

Write-Output "Found $examCount exams"

# If no exams exist, create a sample exam
if ($examCount -eq "0") {
    Write-Output "No exams found. Creating a sample exam for testing..."
    python -c "
import os, django
import datetime
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ta_management_system.settings')
django.setup()
from proctoring.models import Exam
from accounts.models import User, Section
from django.utils import timezone

# Get an instructor
instructor = User.objects.filter(role='INSTRUCTOR').first()
if not instructor:
    print('No instructors found. Please create an instructor first.')
    exit()

# Get a section
section = Section.objects.first()
if not section:
    print('No sections found. Please create a section first.')
    exit()

# Create a sample exam
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
"
}

# Check API endpoint
Write-Output "Checking the API endpoint..."
cd ..
curl http://localhost:8000/proctoring/exams/ -H "Authorization: Bearer YOUR_TOKEN_HERE" | ConvertFrom-Json 