import os
import django
import datetime
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ta_management_system.settings')
django.setup()

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
    
    # Exam checks removed since proctoring app has been removed
    print("\nProctoring module has been removed from the project.")
    print("Exam-related functionality is no longer available.")
    
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
            
            # Exam creation removed since proctoring app has been removed
            print("Note: Exam creation skipped as proctoring module has been removed.")
        else:
            print(f"Test instructor already has {instructor_sections.count()} sections.")
            # Exam checks removed since proctoring app has been removed
    
    print("\n=== DATA CHECK COMPLETE ===")

if __name__ == "__main__":
    check_data() 