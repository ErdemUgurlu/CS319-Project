import os
import django
import datetime
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ta_management_system.settings')
django.setup()

from proctoring.models import Exam
from accounts.models import User, Section, Course
from django.utils import timezone

def check_data():
    print("=== CHECKING DATABASE DATA ===")
    
    # Check users
    instructors = User.objects.filter(role='INSTRUCTOR')
    print(f"Total instructors: {instructors.count()}")
    for instructor in instructors:
        print(f"  - {instructor.email} (ID: {instructor.id})")
    
    # Check sections
    sections = Section.objects.all()
    print(f"\nTotal sections: {sections.count()}")
    for section in sections:
        instructor_email = section.instructor.email if section.instructor else "None"
        print(f"  - {section.course.department.code}{section.course.code}-{section.section_number}")
        print(f"    Instructor: {instructor_email}")
    
    # Check exams
    exams = Exam.objects.all()
    print(f"\nTotal exams: {exams.count()}")
    for exam in exams:
        print(f"  - {exam.title} (ID: {exam.id})")
        print(f"    Section: {exam.section}")
        print(f"    Created by: {exam.created_by.email}")
        print(f"    Status: {exam.status}")
    
    # Create test data for the testinstructor@gmail.com user if needed
    test_instructor = User.objects.filter(email='testinstructor@gmail.com').first()
    if test_instructor:
        # Check if this instructor has sections
        instructor_sections = Section.objects.filter(instructor=test_instructor)
        if instructor_sections.count() == 0:
            print("\nCreating test section for testinstructor@gmail.com...")
            
            # Create department if needed
            from accounts.models import Department
            department, _ = Department.objects.get_or_create(
                code='CS',
                defaults={
                    'name': 'Computer Science',
                    'faculty': 'Engineering'
                }
            )
            
            # Create course if needed
            course, _ = Course.objects.get_or_create(
                department=department,
                code='CS102',
                defaults={
                    'title': 'Advanced Programming',
                    'credit': 3.0
                }
            )
            
            # Create section
            section = Section.objects.create(
                course=course,
                section_number='1',
                semester='FALL',
                year=2023,
                instructor=test_instructor
            )
            print(f"Created section: {section}")
            
            # Create exam for this section
            exam = Exam.objects.create(
                title='Final Exam',
                section=section,
                exam_type='FINAL',
                date=timezone.now().date() + datetime.timedelta(days=14),
                start_time=timezone.now().time(),
                end_time=(timezone.now() + datetime.timedelta(hours=3)).time(),
                duration_minutes=180,
                student_count=75,
                proctor_count_needed=3,
                room_count=2,
                status='PENDING',
                created_by=test_instructor,
                notes='This is a test final exam created for demo purposes.'
            )
            print(f"Created exam: {exam.title} for {exam.section}")
        else:
            # Check if this instructor has exams
            instructor_exams = Exam.objects.filter(section__in=instructor_sections)
            if instructor_exams.count() == 0:
                print("\nCreating test exam for testinstructor@gmail.com...")
                section = instructor_sections.first()
                
                # Create exam for this section
                exam = Exam.objects.create(
                    title='Final Exam',
                    section=section,
                    exam_type='FINAL',
                    date=timezone.now().date() + datetime.timedelta(days=14),
                    start_time=timezone.now().time(),
                    end_time=(timezone.now() + datetime.timedelta(hours=3)).time(),
                    duration_minutes=180,
                    student_count=75,
                    proctor_count_needed=3,
                    room_count=2,
                    status='PENDING',
                    created_by=test_instructor,
                    notes='This is a test final exam created for demo purposes.'
                )
                print(f"Created exam: {exam.title} for {exam.section}")
    
    print("\n=== DATA CHECK COMPLETE ===")

if __name__ == "__main__":
    check_data() 