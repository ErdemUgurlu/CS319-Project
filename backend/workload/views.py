from django.shortcuts import render, get_object_or_404
from django.utils import timezone
from django.db.models import Sum, F, Q
from rest_framework import viewsets, generics, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from .models import WorkloadPolicy, TAWorkload, WorkloadActivity
from .serializers import (
    WorkloadPolicySerializer, 
    TAWorkloadSerializer, 
    WorkloadActivitySerializer,
    TAWorkloadDetailSerializer,
    WorkloadSummarySerializer
)
from accounts.models import User


class IsStaffOrInstructor(permissions.BasePermission):
    """
    Custom permission to only allow staff and instructors to access a view.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['STAFF', 'ADMIN', 'INSTRUCTOR']


class IsOwnerTAOrStaff(permissions.BasePermission):
    """
    Custom permission to only allow the TA owner, staff, or instructors to access.
    """
    def has_object_permission(self, request, view, obj):
        # Allow staff and instructors
        if request.user.role in ['STAFF', 'ADMIN', 'INSTRUCTOR']:
            return True
            
        # Allow if the user is the TA
        if hasattr(obj, 'ta'):  # For TAWorkload
            return obj.ta == request.user
        elif hasattr(obj, 'workload'):  # For WorkloadActivity
            return obj.workload.ta == request.user
            
        return False


class WorkloadPolicyViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing department workload policies.
    Only staff can create/update/delete policies.
    """
    queryset = WorkloadPolicy.objects.all()
    serializer_class = WorkloadPolicySerializer
    permission_classes = [IsAuthenticated, IsStaffOrInstructor]
    filterset_fields = ['department', 'academic_term', 'is_active']
    
    @action(detail=False, methods=['get'])
    def current(self, request):
        """Get currently active policies."""
        current_policies = WorkloadPolicy.objects.filter(is_active=True)
        serializer = self.get_serializer(current_policies, many=True)
        return Response(serializer.data)


class TAWorkloadViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing TA workloads.
    Staff can see all workloads, TAs can only see their own.
    """
    serializer_class = TAWorkloadSerializer
    permission_classes = [IsAuthenticated, IsOwnerTAOrStaff]
    filterset_fields = ['academic_term', 'department', 'is_overloaded']
    
    def get_queryset(self):
        user = self.request.user
        
        if user.role in ['STAFF', 'ADMIN', 'INSTRUCTOR']:
            # Staff can see all workloads
            return TAWorkload.objects.all()
        elif user.role == 'TA':
            # TAs can only see their own workloads
            return TAWorkload.objects.filter(ta=user)
        else:
            return TAWorkload.objects.none()
    
    def get_serializer_class(self):
        if self.action == 'retrieve' or self.action == 'my_workload':
            return TAWorkloadDetailSerializer
        return super().get_serializer_class()
    
    @action(detail=False, methods=['get'])
    def my_workload(self, request):
        """Get the current TA's workload for the current term."""
        if request.user.role != 'TA':
            return Response(
                {"error": "Only TAs can access their workload"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get current term (this could be improved with a proper term management system)
        current_term = "Spring 2025"  # Example - should come from a settings or term management
        
        workload = TAWorkload.objects.filter(
            ta=request.user, 
            academic_term=current_term
        ).first()
        
        if not workload:
            return Response(
                {"error": "No workload record found for current term"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = TAWorkloadDetailSerializer(workload)
        return Response(serializer.data)


class WorkloadActivityViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing workload activities.
    """
    serializer_class = WorkloadActivitySerializer
    permission_classes = [IsAuthenticated, IsOwnerTAOrStaff]
    
    def get_queryset(self):
        user = self.request.user
        
        if user.role in ['STAFF', 'ADMIN', 'INSTRUCTOR']:
            # Staff can see all activities
            return WorkloadActivity.objects.all()
        elif user.role == 'TA':
            # TAs can only see their own activities
            return WorkloadActivity.objects.filter(workload__ta=user)
        else:
            return WorkloadActivity.objects.none()


class WorkloadSummaryView(APIView):
    """
    API endpoint to get a summary of workloads for a department.
    Only accessible by staff.
    """
    permission_classes = [IsAuthenticated, IsStaffOrInstructor]
    
    def get(self, request, department_id=None, format=None):
        # Filter by department if provided
        queryset = TAWorkload.objects.all()
        
        if department_id:
            queryset = queryset.filter(department_id=department_id)
            
        # Get query parameters
        academic_term = request.query_params.get('term')
        if academic_term:
            queryset = queryset.filter(academic_term=academic_term)
            
        # Get summary stats
        total_tas = queryset.count()
        overloaded_tas = queryset.filter(is_overloaded=True).count()
        
        # Group by academic level
        phd_workloads = queryset.filter(ta__academic_level='PHD')
        msc_workloads = queryset.filter(ta__academic_level='MSC')
        undergrad_workloads = queryset.filter(ta__academic_level='UNDERGRAD')
        
        # Average hours by academic level
        avg_phd_hours = phd_workloads.aggregate(avg=Sum('current_weekly_hours') / (phd_workloads.count() or 1))['avg'] or 0
        avg_msc_hours = msc_workloads.aggregate(avg=Sum('current_weekly_hours') / (msc_workloads.count() or 1))['avg'] or 0
        avg_undergrad_hours = undergrad_workloads.aggregate(avg=Sum('current_weekly_hours') / (undergrad_workloads.count() or 1))['avg'] or 0
        
        # Activity distribution
        activities = WorkloadActivity.objects.filter(workload__in=queryset)
        activity_hours = {}
        
        for activity_type, _ in WorkloadActivity.ACTIVITY_TYPES:
            total = activities.filter(activity_type=activity_type).aggregate(
                total=Sum('weighted_hours')
            )['total'] or 0
            activity_hours[activity_type] = total
        
        summary = {
            'total_tas': total_tas,
            'overloaded_tas': overloaded_tas,
            'overload_percentage': (overloaded_tas / total_tas * 100) if total_tas > 0 else 0,
            'academic_levels': {
                'phd': {
                    'count': phd_workloads.count(),
                    'avg_hours': avg_phd_hours,
                },
                'msc': {
                    'count': msc_workloads.count(),
                    'avg_hours': avg_msc_hours,
                },
                'undergrad': {
                    'count': undergrad_workloads.count(),
                    'avg_hours': avg_undergrad_hours,
                }
            },
            'activity_distribution': activity_hours
        }
        
        serializer = WorkloadSummarySerializer(summary)
        return Response(serializer.data)
