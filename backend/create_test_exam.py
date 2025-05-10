import os, django, datetime
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ta_management_system.settings')
django.setup()

# Proctoring module has been removed
# from proctoring.models import Exam
from accounts.models import User, Section
from django.utils import timezone

def create_sample_exam():
    print("The proctoring module has been removed from the project.")
    print("This script is no longer functional and should be updated or removed.")
    print("Exam-related functionality is no longer available.")

if __name__ == "__main__":
    create_sample_exam() 