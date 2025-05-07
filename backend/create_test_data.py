import os
import django
import random
from datetime import timedelta
import datetime

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ta_management_system.settings')
django.setup()

from django.utils import timezone
from accounts.models import User, Department, InstructorTAAssignment, Course, Section
# from proctoring.models import Exam  # Removed proctoring import

def create_test_data():
    # Create departments if they don't exist
    cs_dept, _ = Department.objects.get_or_create(
        code='CS',
        defaults={
            'name': 'Computer Science',
            'faculty': 'Engineering'
        }
    )
    
    ie_dept, _ = Department.objects.get_or_create(
        code='IE',
        defaults={
            'name': 'Industrial Engineering',
            'faculty': 'Engineering'
        }
    )
    
    # Create TAs if they don't exist
    ta_data = [
        {
            'email': 'phd.ta1@bilkent.edu.tr',
            'first_name': 'PhD',
            'last_name': 'Student1',
            'role': 'TA',
            'department': 'CS',
            'phone': '+905551234001',
            'academic_level': 'PHD',
            'employment_type': 'FULL_TIME',
        },
        {
            'email': 'phd.ta2@bilkent.edu.tr',
            'first_name': 'PhD',
            'last_name': 'Student2',
            'role': 'TA',
            'department': 'CS',
            'phone': '+905551234002',
            'academic_level': 'PHD',
            'employment_type': 'PART_TIME',
        },
        {
            'email': 'masters.ta1@bilkent.edu.tr',
            'first_name': 'Masters',
            'last_name': 'Student1',
            'role': 'TA',
            'department': 'CS',
            'phone': '+905551234003',
            'academic_level': 'MASTERS',
            'employment_type': 'FULL_TIME',
        },
        {
            'email': 'masters.ta2@bilkent.edu.tr',
            'first_name': 'Masters',
            'last_name': 'Student2',
            'role': 'TA',
            'department': 'CS',
            'phone': '+905551234004',
            'academic_level': 'MASTERS',
            'employment_type': 'PART_TIME',
        },
        {
            'email': 'ie.ta1@bilkent.edu.tr',
            'first_name': 'IE',
            'last_name': 'Student1',
            'role': 'TA',
            'department': 'IE',
            'phone': '+905551234005',
            'academic_level': 'PHD',
            'employment_type': 'FULL_TIME',
        },
    ]
    
    tas = []
    for data in ta_data:
        ta, created = User.objects.get_or_create(
            email=data['email'],
            defaults={
                'first_name': data['first_name'],
                'last_name': data['last_name'],
                'role': data['role'],
                'department': data['department'],
                'phone': data['phone'],
                'academic_level': data['academic_level'],
                'employment_type': data['employment_type'],
                'is_approved': True,
                'email_verified': True,
                'is_active': True,
            }
        )
        
        if created:
            ta.set_password('testpassword')
            ta.save()
            print(f"Created TA: {ta.email}")
        else:
            print(f"TA already exists: {ta.email}")
        
        tas.append(ta)
    
    # Create an instructor if it doesn't exist
    instructor, created = User.objects.get_or_create(
        email='instructor1@bilkent.edu.tr',
        defaults={
            'first_name': 'Test',
            'last_name': 'Instructor',
            'role': 'INSTRUCTOR',
            'department': 'CS',
            'phone': '+905559876543',
            'is_approved': True,
            'email_verified': True,
            'is_active': True,
        }
    )
    
    if created:
        instructor.set_password('testpassword')
        instructor.save()
        print(f"Created instructor: {instructor.email}")
    else:
        print(f"Instructor already exists: {instructor.email}")
    
    # Assign some TAs to the instructor
    for ta in tas[:2]:  # Assign first two TAs to the instructor
        if ta.department == instructor.department:
            assignment, created = InstructorTAAssignment.objects.get_or_create(
                instructor=instructor,
                ta=ta,
                defaults={
                    'department': Department.objects.get(code=instructor.department),
                    'assigned_at': timezone.now() - timedelta(days=random.randint(1, 30))
                }
            )
            
            if created:
                print(f"Assigned TA {ta.email} to instructor {instructor.email}")
            else:
                print(f"TA {ta.email} already assigned to instructor {instructor.email}")

def create_test_instructor_and_exam():
    print("Creating test instructor and exam data...")

    # Create department if needed
    department, created = Department.objects.get_or_create(
        code='CS',
        defaults={
            'name': 'Computer Science',
            'faculty': 'Engineering'
        }
    )
    print(f"Department: {'Created' if created else 'Already exists'}")

    # Create instructor if needed
    instructor_email = 'instructor1@bilkent.edu.tr'
    try:
        instructor = User.objects.get(email=instructor_email)
        print(f"Instructor already exists: {instructor.full_name}")
    except User.DoesNotExist:
        instructor = User.objects.create_user(
            email=instructor_email,
            password='password123',
            first_name='Test',
            last_name='Instructor',
            role='INSTRUCTOR',
            department=department.code,
            phone='+905551234567',
            is_approved=True,
            email_verified=True
        )
        print(f"Created instructor: {instructor.full_name}")

    # Create course if needed
    course, created = Course.objects.get_or_create(
        department=department,
        code='CS101',
        defaults={
            'title': 'Introduction to Computer Science',
            'credit': 3.0
        }
    )
    print(f"Course: {'Created' if created else 'Already exists'}")

    # Create section if needed
    section, created = Section.objects.get_or_create(
        course=course,
        section_number='1',
        semester='FALL',
        year=2023,
        defaults={
            'instructor': instructor
        }
    )
    if not created and not section.instructor:
        section.instructor = instructor
        section.save()
    print(f"Section: {'Created' if created else 'Already exists'}")

    # Exam creation removed since proctoring module has been removed
    print("Note: Exam creation skipped as proctoring module has been removed.")
    
    print("Test data creation complete")

if __name__ == '__main__':
    create_test_data()
    print("Test data creation completed!")
    create_test_instructor_and_exam() 