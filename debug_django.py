
# Put this file in your backend directory and run it with:
# python manage.py shell < debug_django.py

from accounts.models import Exam, Classroom
from django.db import transaction
import sys

print("\nExam status counts:")
for status in Exam.Status.choices:
    count = Exam.objects.filter(status=status[0]).count()
    print(f"- {status[1]}: {count} exams")

print("\nChecking a few exams waiting for places:")
exams = Exam.objects.filter(status=Exam.Status.WAITING_FOR_PLACES)[:5]
for exam in exams:
    print(f"Exam {exam.id}: {exam.course}, Student count: {exam.student_count}, Has student list: {exam.has_student_list}")
    
# Test function to simulate import for a single exam
def test_assign_classroom(exam_id):
    try:
        with transaction.atomic():
            exam = Exam.objects.get(id=exam_id)
            print(f"Found exam {exam_id}: {exam.course}, Status: {exam.get_status_display()}")
            
            if not exam.has_student_list:
                print(f"ERROR: Exam {exam_id} does not have a student list uploaded")
                return False
                
            # Create a test classroom if needed
            classroom, created = Classroom.objects.get_or_create(
                building="TEST",
                room_number="101",
                defaults={"capacity": 100}
            )
            
            # Assign classroom to exam
            exam.classroom = classroom
            exam.status = Exam.Status.AWAITING_PROCTORS
            exam.save()
            
            print(f"Successfully assigned classroom {classroom.building}-{classroom.room_number} to exam {exam_id}")
            print(f"New status: {exam.get_status_display()}")
            return True
    except Exception as e:
        print(f"Error assigning classroom: {e}")
        return False

# If we have exams waiting for places, test with the first one
if exams:
    print("\nTesting classroom assignment for the first exam:")
    test_exam = exams[0]
    test_assign_classroom(test_exam.id)
else:
    print("\nNo exams are waiting for places. Check if all exams already have classrooms assigned.")
