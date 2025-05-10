import pandas as pd
import os
import subprocess
import sys

# First, check if the system is running
print("Checking if the system is running...")
print("If the system is not running, please start it with 'npm run dev'")

# Manually check the backend logs
print("\nPlease use the following steps to diagnose the issue:")
print("1. Make sure your system is running (npm run dev)")
print("2. Upload the exam_placement_template.xlsx file (with real Exam IDs) through the UI")
print("3. Check the terminal where the backend is running for errors")
print("4. If you see any errors, please share them")

# Check existing exam_place_rooms.xlsx file
print("\nExamining your current Excel file...")
try:
    df = pd.read_excel('exam_place_rooms.xlsx')
    print("Your current Excel file has these columns:", list(df.columns))
    print("First few rows:")
    print(df.head().to_string())
    
    if 'Exam ID' in df.columns:
        unique_ids = df['Exam ID'].unique()
        print(f"\nThe file has {len(unique_ids)} unique Exam IDs: {unique_ids}")
        
        # Check if all IDs are the same placeholder value
        if len(unique_ids) == 1 and (unique_ids[0] == 1 or unique_ids[0] == '1' or unique_ids[0] == ''):
            print("WARNING: All exam IDs are the same placeholder value. You need to use real exam IDs.")
    else:
        print("ERROR: Your Excel file is missing the 'Exam ID' column!")
except Exception as e:
    print(f"Error reading file: {e}")

# Create a debugging script for direct inspection of Django issue
print("\nCreating a Django debug script...")
with open('debug_django.py', 'w') as f:
    f.write("""
# Put this file in your backend directory and run it with:
# python manage.py shell < debug_django.py

from accounts.models import Exam, Classroom
from django.db import transaction
import sys

print("\\nExam status counts:")
for status in Exam.Status.choices:
    count = Exam.objects.filter(status=status[0]).count()
    print(f"- {status[1]}: {count} exams")

print("\\nChecking a few exams waiting for places:")
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
    print("\\nTesting classroom assignment for the first exam:")
    test_exam = exams[0]
    test_assign_classroom(test_exam.id)
else:
    print("\\nNo exams are waiting for places. Check if all exams already have classrooms assigned.")
""")

print("\nCreated debug_django.py - Copy this file to your backend directory")
print("and run it with: python manage.py shell < debug_django.py")

# Provide a comprehensive guide
print("\n======= COMPLETE GUIDE TO FIX THE ISSUE =======")
print("1. FIND EXAM IDs:")
print("   - Start your system with 'npm run dev'")
print("   - Log in to the Dean's Office account")
print("   - Go to the Exam Management page")
print("   - Look for exams with 'Waiting for Places' status")
print("   - Note their IDs (should be visible in the URL or UI)")

print("\n2. PREPARE THE EXCEL FILE:")
print("   - Open exam_placement_template.xlsx in Excel")
print("   - For each exam, fill in the correct Exam ID in the 'Exam ID' column")
print("   - Make sure each Exam ID corresponds to an actual exam in the system")
print("   - Save the file")

print("\n3. UPLOAD THE FILE:")
print("   - Log in to the Dean's Office account")
print("   - Go to the Exam Management page")
print("   - Click on 'Import Placements'")
print("   - Upload your fixed Excel file")

print("\n4. TROUBLESHOOTING:")
print("   - Watch the backend terminal for errors")
print("   - Copy debug_django.py to your backend directory")
print("   - Run it to directly check and assign a classroom to an exam")
print("   - If this works but the import doesn't, there's likely an issue with the import process")

print("\n5. MANUAL WORKAROUND:")
print("   - If the import doesn't work, try assigning classrooms manually through the UI")
print("   - For each exam, click on 'Assign Places' and select classrooms")
print("\n=================================================") 