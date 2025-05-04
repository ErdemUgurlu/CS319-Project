import os
import django
import random
from datetime import timedelta

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ta_management_system.settings')
django.setup()

from django.utils import timezone
from accounts.models import User, Department, InstructorTAAssignment

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

if __name__ == '__main__':
    create_test_data()
    print("Test data creation completed!") 