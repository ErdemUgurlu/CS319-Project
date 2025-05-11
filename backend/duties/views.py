from django.shortcuts import render
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
# from .models import WorkloadSummary # No longer primary model for this view
from accounts.models import User, TAProfile # Import TAProfile
from .serializers import MyWorkloadCreditSerializer # Changed serializer

class MyWorkloadView(APIView):
    """
    API endpoint for a TA to retrieve their own workload credits from TAProfile.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role != User.Role.TA:
            return Response(
                {"error": "Only TAs can access their workload data."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            ta_profile = get_object_or_404(TAProfile, user=user)
        except TAProfile.DoesNotExist:
            # This case should ideally not happen if TAProfile is created automatically for TAs.
            # But if it does, it means the TA exists but their specific TAProfile is missing.
            return Response(
                {"error": "TA Profile not found. Workload credits cannot be retrieved."},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = MyWorkloadCreditSerializer(ta_profile)
        return Response(serializer.data)
