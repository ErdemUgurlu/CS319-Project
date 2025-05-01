from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import LeaveRequest
from .serializers import LeaveRequestSerializer
from django.contrib.auth.models import User

class LeaveRequestViewSet(viewsets.ModelViewSet):
    serializer_class = LeaveRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return LeaveRequest.objects.all()
        return LeaveRequest.objects.filter(user=user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        if not request.user.is_staff:
            return Response(
                {'error': 'Only staff members can approve leave requests'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        leave_request = self.get_object()
        leave_request.status = 'approved'
        leave_request.save()
        serializer = self.get_serializer(leave_request)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        if not request.user.is_staff:
            return Response(
                {'error': 'Only staff members can reject leave requests'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        leave_request = self.get_object()
        leave_request.status = 'rejected'
        leave_request.save()
        serializer = self.get_serializer(leave_request)
        return Response(serializer.data) 