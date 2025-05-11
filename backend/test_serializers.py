#!/usr/bin/env python
"""
This script tests the serialization of ProctorAssignment and SwapRequest objects
to diagnose any serialization issues.
"""
import os
import sys
import django
import json
import traceback

# Setup Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "ta_management_system.settings")
django.setup()

# Import models and serializers
from proctoring.models import ProctorAssignment, SwapRequest
from proctoring.serializers import (
    ProctorAssignmentSerializer,
    SwapRequestDetailSerializer
)
from accounts.models import User
from rest_framework.renderers import JSONRenderer

print("\n===== Testing Serializers =====\n")

# Test ProctorAssignmentSerializer
print("Testing ProctorAssignmentSerializer...")
try:
    assignments = ProctorAssignment.objects.all()
    print(f"Found {assignments.count()} ProctorAssignment objects")
    
    for i, assignment in enumerate(assignments[:3]):  # Test first 3 assignments
        try:
            serializer = ProctorAssignmentSerializer(assignment)
            data = serializer.data
            json_data = JSONRenderer().render(data)
            print(f"\nAssignment {i+1} (ID: {assignment.id}):")
            print("✓ Successfully serialized")
            print(f"  TA: {assignment.ta.full_name if hasattr(assignment, 'ta') and assignment.ta else 'No TA'}")
            print(f"  Exam: {assignment.exam.id if hasattr(assignment, 'exam') and assignment.exam else 'No exam'}")
            print(f"  Course: {assignment.exam.course.code if hasattr(assignment, 'exam') and assignment.exam and hasattr(assignment.exam, 'course') and assignment.exam.course else 'No course'}")
        except Exception as e:
            print(f"\nAssignment {i+1} (ID: {assignment.id}):")
            print(f"✗ Serialization error: {str(e)}")
            print(traceback.format_exc())
except Exception as e:
    print(f"Error testing ProctorAssignmentSerializer: {str(e)}")
    print(traceback.format_exc())

print("\n-------------------------------------\n")

# Test SwapRequestDetailSerializer
print("Testing SwapRequestDetailSerializer...")
try:
    swap_requests = SwapRequest.objects.all()
    print(f"Found {swap_requests.count()} SwapRequest objects")
    
    for i, swap_request in enumerate(swap_requests[:3]):  # Test first 3 swap requests
        try:
            serializer = SwapRequestDetailSerializer(swap_request)
            data = serializer.data
            json_data = JSONRenderer().render(data)
            print(f"\nSwapRequest {i+1} (ID: {swap_request.id}):")
            print("✓ Successfully serialized")
            print(f"  Status: {swap_request.status}")
            print(f"  Original Assignment: {swap_request.original_assignment.id if hasattr(swap_request, 'original_assignment') and swap_request.original_assignment else 'No assignment'}")
            print(f"  Requesting Proctor: {swap_request.requesting_proctor.full_name if hasattr(swap_request, 'requesting_proctor') and swap_request.requesting_proctor else 'No proctor'}")
            if hasattr(swap_request, 'matched_assignment') and swap_request.matched_assignment:
                print(f"  Matched Assignment: {swap_request.matched_assignment.id}")
            if hasattr(swap_request, 'matched_proctor') and swap_request.matched_proctor:
                print(f"  Matched Proctor: {swap_request.matched_proctor.full_name}")
        except Exception as e:
            print(f"\nSwapRequest {i+1} (ID: {swap_request.id}):")
            print(f"✗ Serialization error: {str(e)}")
            print(traceback.format_exc())
except Exception as e:
    print(f"Error testing SwapRequestDetailSerializer: {str(e)}")
    print(traceback.format_exc())

print("\n===== End of Testing =====\n")

print("Testing direct SQL access to proctoring_swaprequest table...")
from django.db import connection
with connection.cursor() as cursor:
    try:
        cursor.execute("SELECT COUNT(*) FROM proctoring_swaprequest")
        count = cursor.fetchone()[0]
        print(f"Direct SQL query shows {count} rows in proctoring_swaprequest table")
        
        cursor.execute("PRAGMA table_info(proctoring_swaprequest)")
        columns = cursor.fetchall()
        print(f"Table has {len(columns)} columns:")
        for col in columns:
            print(f"  - {col[1]} ({col[2]})")
    except Exception as e:
        print(f"Error with direct SQL access: {str(e)}")
        print(traceback.format_exc())

print("\nDone.") 