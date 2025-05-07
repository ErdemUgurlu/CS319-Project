import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ta_management_system.settings')
django.setup()

# Removed proctoring imports
# from proctoring.models import Exam
# from proctoring.serializers import ExamDetailSerializer, ExamListSerializer
from accounts.models import User
import json

def check_serializer():
    print("=== CHECKING SERIALIZER ===")
    
    # Proctoring functionality removed
    print("Proctoring module has been removed from the project.")
    print("This utility script needs to be updated to work with other models.")
    
    print("=== SERIALIZER CHECK COMPLETE ===")

if __name__ == "__main__":
    check_serializer() 