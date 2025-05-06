from django.shortcuts import render
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

# All proctoring views have been disabled for future reimplementation
# Placeholder views that return empty responses 

class DisabledProctoringView(APIView):
    """Base view for all disabled proctoring functionality."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, *args, **kwargs):
        return Response({
            "message": "Proctoring functionality is currently disabled and pending reimplementation."
        }, status=status.HTTP_501_NOT_IMPLEMENTED)
        
    def post(self, request, *args, **kwargs):
        return Response({
            "message": "Proctoring functionality is currently disabled and pending reimplementation."
        }, status=status.HTTP_501_NOT_IMPLEMENTED)
    
    def put(self, request, *args, **kwargs):
        return Response({
            "message": "Proctoring functionality is currently disabled and pending reimplementation."
        }, status=status.HTTP_501_NOT_IMPLEMENTED)
    
    def delete(self, request, *args, **kwargs):
                return Response({
            "message": "Proctoring functionality is currently disabled and pending reimplementation."
        }, status=status.HTTP_501_NOT_IMPLEMENTED)


# Define placeholder classes for all proctoring views
class MyProctoringsView(DisabledProctoringView):
    pass

class SwapRequestCreateView(DisabledProctoringView):
    pass

class AvailableSwapsView(DisabledProctoringView):
    pass

class ClaimSwapView(DisabledProctoringView):
    pass

class AcceptExistingSwapView(DisabledProctoringView):
    pass

class EligibleProctorsView(DisabledProctoringView):
    pass

class ConfirmAssignmentView(DisabledProctoringView):
    pass

class SwapHistoryView(DisabledProctoringView):
    pass

class ExamCreateView(DisabledProctoringView):
    pass

class ExamDetailView(DisabledProctoringView):
    pass

class ExamRoomUpdateView(DisabledProctoringView):
    pass

class ProctorAssignmentView(DisabledProctoringView):
    pass

class EligibleProctorsForExamView(DisabledProctoringView):
    pass

class SeatingPlanView(DisabledProctoringView):
    pass

class CrossDepartmentRequestView(DisabledProctoringView):
    pass
