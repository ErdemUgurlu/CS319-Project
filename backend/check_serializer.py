import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ta_management_system.settings')
django.setup()

from proctoring.models import Exam
from proctoring.serializers import ExamDetailSerializer, ExamListSerializer
from accounts.models import User
import json

def check_serializer():
    print("=== CHECKING SERIALIZER ===")
    
    # Get all exams
    exams = Exam.objects.all()
    print(f"Found {exams.count()} exams in the database")
    
    if exams.count() == 0:
        print("No exams found. Cannot test serializer.")
        return
    
    try:
        # Try to serialize one exam with ExamListSerializer
        exam = exams.first()
        print(f"Testing ExamListSerializer with exam: {exam.title} (ID: {exam.id})")
        
        list_serializer = ExamListSerializer(exam)
        list_data = list_serializer.data
        print("ExamListSerializer successful!")
        print("List serialized data:")
        for key, value in list_data.items():
            print(f"  {key}: {value}")
        
        # Try to serialize with ExamDetailSerializer
        print("\nTesting ExamDetailSerializer with exam: {exam.title} (ID: {exam.id})")
        detail_serializer = ExamDetailSerializer(exam)
        detail_data = detail_serializer.data
        print("ExamDetailSerializer successful!")
        print("Detail serialized data:")
        
        # Save complete data to a file for debugging
        with open('exam_serializer_debug.json', 'w') as f:
            json.dump(detail_data, f, indent=2)
        print(f"Full serialized data written to exam_serializer_debug.json")
        
        # Print key sections for review
        print("\nKey sections of serialized data:")
        print(f"  section_display: {detail_data.get('section_display')}")
        print(f"  course_code: {detail_data.get('course_code')}")
        
        # Check the section data structure
        if 'section' in detail_data:
            print("\nSection data:")
            if isinstance(detail_data['section'], dict):
                for key, value in detail_data['section'].items():
                    print(f"  section.{key}: {value}")
                if 'course' in detail_data['section']:
                    print("\nCourse data:")
                    course = detail_data['section']['course']
                    if isinstance(course, dict):
                        for key, value in course.items():
                            print(f"  section.course.{key}: {value}")
            else:
                print(f"  section: {detail_data['section']} (not a dictionary)")
    except Exception as e:
        print(f"Error during serialization: {e}")
        import traceback
        traceback.print_exc()
    
    print("=== SERIALIZER CHECK COMPLETE ===")

if __name__ == "__main__":
    check_serializer() 