#!/usr/bin/env python
"""
Diagnostic script to check the database for issues with SwapRequest and ProctorAssignment models.
Run with: python manage.py shell < check_database.py
"""

import os
import sys
import django
from django.db.models import Q

# Import models
from proctoring.models import SwapRequest, ProctorAssignment
from accounts.models import Exam, User

print("\n===== Database Integrity Check =====\n")

# Check ProctorAssignments
print("Checking ProctorAssignments...")
try:
    all_assignments = ProctorAssignment.objects.all()
    print(f"Total ProctorAssignments: {all_assignments.count()}")
    
    # Check for assignments with missing exams
    missing_exam = all_assignments.filter(Q(exam__isnull=True))
    if missing_exam.exists():
        print(f"WARNING: Found {missing_exam.count()} assignments with missing exams:")
        for a in missing_exam:
            print(f"  - Assignment ID: {a.id}, TA: {a.ta.full_name if hasattr(a, 'ta') else 'No TA'}")
    else:
        print("✓ All assignments have valid exams")
    
    # Check for assignments with missing TAs
    missing_ta = all_assignments.filter(Q(ta__isnull=True))
    if missing_ta.exists():
        print(f"WARNING: Found {missing_ta.count()} assignments with missing TAs:")
        for a in missing_ta:
            print(f"  - Assignment ID: {a.id}, Exam: {a.exam.id if hasattr(a, 'exam') else 'No exam'}")
    else:
        print("✓ All assignments have valid TAs")
        
    # Check for incomplete exam data (missing course, section, etc.)
    incomplete_exams = []
    for assignment in all_assignments:
        try:
            exam = assignment.exam
            if not exam.course:
                incomplete_exams.append((assignment.id, exam.id, "Missing course"))
            elif not hasattr(exam.course, 'sections') and not hasattr(exam.course, 'section_set'):
                incomplete_exams.append((assignment.id, exam.id, "Course has no sections attribute"))
            elif hasattr(exam.course, 'sections') and not exam.course.sections.exists() and \
                 hasattr(exam.course, 'section_set') and not exam.course.section_set.exists():
                incomplete_exams.append((assignment.id, exam.id, "Course has no sections"))
        except Exception as e:
            incomplete_exams.append((assignment.id, getattr(assignment, 'exam_id', 'Unknown'), f"Error: {str(e)}"))
    
    if incomplete_exams:
        print(f"WARNING: Found {len(incomplete_exams)} assignments with incomplete exam data:")
        for a_id, e_id, reason in incomplete_exams:
            print(f"  - Assignment ID: {a_id}, Exam ID: {e_id}, Reason: {reason}")
    else:
        print("✓ All assignments have complete exam data")
    
except Exception as e:
    print(f"ERROR checking ProctorAssignments: {str(e)}")

print("\n-------------------------------------\n")

# Check SwapRequests
print("Checking SwapRequests...")
try:
    all_requests = SwapRequest.objects.all()
    print(f"Total SwapRequests: {all_requests.count()}")
    
    # Check for requests with missing original assignments
    missing_orig_assignment = all_requests.filter(Q(original_assignment__isnull=True))
    if missing_orig_assignment.exists():
        print(f"WARNING: Found {missing_orig_assignment.count()} requests with missing original assignments:")
        for sr in missing_orig_assignment:
            print(f"  - Request ID: {sr.id}, Status: {sr.status}")
    else:
        print("✓ All requests have valid original assignments")
    
    # Check for requests with missing requesting proctors
    missing_req_proctor = all_requests.filter(Q(requesting_proctor__isnull=True))
    if missing_req_proctor.exists():
        print(f"WARNING: Found {missing_req_proctor.count()} requests with missing requesting proctors:")
        for sr in missing_req_proctor:
            print(f"  - Request ID: {sr.id}, Status: {sr.status}")
    else:
        print("✓ All requests have valid requesting proctors")
    
    # Check for matched requests with missing matched assignments or proctors
    inconsistent_matched = all_requests.filter(
        Q(status__in=['MATCHED', 'APPROVED', 'COMPLETED']) & 
        (Q(matched_assignment__isnull=True) | Q(matched_proctor__isnull=True))
    )
    if inconsistent_matched.exists():
        print(f"WARNING: Found {inconsistent_matched.count()} matched/approved/completed requests with missing matched data:")
        for sr in inconsistent_matched:
            print(f"  - Request ID: {sr.id}, Status: {sr.status}, " +
                  f"Matched Proctor: {'Missing' if sr.matched_proctor is None else 'Present'}, " +
                  f"Matched Assignment: {'Missing' if sr.matched_assignment is None else 'Present'}")
    else:
        print("✓ All matched/approved/completed requests have valid matched data")
    
    # Check for invalid relationship between matched proctor and matched assignment
    inconsistent_relationships = []
    for sr in all_requests.filter(status__in=['MATCHED', 'APPROVED', 'COMPLETED']):
        try:
            if sr.matched_assignment and sr.matched_proctor and sr.matched_assignment.ta != sr.matched_proctor:
                inconsistent_relationships.append((sr.id, sr.status, sr.matched_proctor.id, sr.matched_assignment.ta.id))
        except Exception as e:
            inconsistent_relationships.append((sr.id, sr.status, "Error checking relationship: " + str(e)))
    
    if inconsistent_relationships:
        print(f"WARNING: Found {len(inconsistent_relationships)} requests with inconsistent matched proctor/assignment:")
        for data in inconsistent_relationships:
            if len(data) == 4:
                sr_id, status, matched_proctor_id, assignment_ta_id = data
                print(f"  - Request ID: {sr_id}, Status: {status}, " +
                      f"Matched Proctor ID: {matched_proctor_id}, Assignment's TA ID: {assignment_ta_id}")
            else:
                sr_id, status, error = data
                print(f"  - Request ID: {sr_id}, Status: {status}, Error: {error}")
    else:
        print("✓ All matched relationships are consistent")
    
except Exception as e:
    print(f"ERROR checking SwapRequests: {str(e)}")

print("\n===== End of Integrity Check =====\n")

# Print a sample of each problematic table for manual inspection
try:
    print("\nSample of SwapRequests for manual inspection:")
    for sr in SwapRequest.objects.all()[:5]:
        print(f"ID: {sr.id}, Status: {sr.status}, " +
              f"Original Assignment ID: {sr.original_assignment_id}, " +
              f"Requesting Proctor ID: {sr.requesting_proctor_id}, " +
              f"Matched Assignment ID: {sr.matched_assignment_id if sr.matched_assignment_id else 'None'}, " +
              f"Matched Proctor ID: {sr.matched_proctor_id if sr.matched_proctor_id else 'None'}")
except Exception as e:
    print(f"Error printing sample: {str(e)}")

print("\nDone.") 