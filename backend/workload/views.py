from django.shortcuts import render, get_object_or_404
from django.utils import timezone
from django.db.models import Sum, F, Q
from rest_framework import viewsets, generics, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from .models import WorkloadPolicy, TAWorkload, WorkloadActivity, WorkloadRecord, WorkloadManualAdjustment
from .serializers import (
    WorkloadPolicySerializer, 
    TAWorkloadSerializer, 
    WorkloadActivitySerializer,
    TAWorkloadDetailSerializer,
    WorkloadSummarySerializer,
    WorkloadManualAdjustmentSerializer
)
from accounts.models import User, InstructorTAAssignment


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


class InstructorTAWorkloadPermission(permissions.BasePermission):
    """
    Custom permission to only allow instructors to view/edit workloads of their assigned TAs.
    """
    def has_permission(self, request, view):
        # Check if user is authenticated
        if not request.user.is_authenticated:
            return False
        
        # Staff and admin can do anything
        if request.user.is_staff or request.user.role == 'ADMIN':
            return True
            
        # Only instructors can proceed
        if request.user.role != 'INSTRUCTOR':
            return False
        
        # For detail view, check if ta_id is provided
        ta_id = request.query_params.get('ta_id') or request.data.get('ta_id')
        if not ta_id:
            return False
            
        # Check if this TA is assigned to this instructor
        is_assigned = InstructorTAAssignment.objects.filter(
            instructor=request.user,
            ta_id=ta_id
        ).exists()
        
        return is_assigned


class TAWorkloadSummaryView(APIView):
    """
    API endpoint for instructors to view workload summary for their TAs.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        if request.user.role != 'INSTRUCTOR':
            return Response(
                {"error": "Only instructors can view TA workloads."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get all TAs assigned to this instructor
        assigned_tas = InstructorTAAssignment.objects.filter(
            instructor=request.user
        ).values_list('ta_id', flat=True)
        
        # Get workload info for each TA
        workloads = []
        for ta_id in assigned_tas:
            try:
                ta = User.objects.get(id=ta_id)
                
                # Get the current workload
                try:
                    workload = TAWorkload.objects.get(
                        ta=ta,
                        academic_term='Spring 2024'  # Should be dynamic or from settings
                    )
                    
                    # Get the manual adjustments
                    manual_adjustments = WorkloadManualAdjustment.objects.filter(
                        ta=ta
                    ).aggregate(total=Sum('hours'))['total'] or 0
                    
                    # Get completed tasks
                    task_hours = WorkloadRecord.objects.filter(
                        user=ta
                    ).aggregate(total=Sum('hours'))['total'] or 0
                    
                    workloads.append({
                        'ta_id': ta.id,
                        'ta_name': ta.full_name,
                        'email': ta.email,
                        'employment_type': ta.employment_type,
                        'current_weekly_hours': workload.current_weekly_hours,
                        'max_weekly_hours': workload.max_weekly_hours,
                        'is_overloaded': workload.is_overloaded,
                        'total_assigned_hours': workload.total_assigned_hours,
                        'manual_adjustments': manual_adjustments,
                        'completed_task_hours': task_hours,
                        'academic_level': ta.academic_level
                    })
                except TAWorkload.DoesNotExist:
                    # No workload record exists
                    workloads.append({
                        'ta_id': ta.id,
                        'ta_name': ta.full_name,
                        'email': ta.email,
                        'employment_type': ta.employment_type,
                        'current_weekly_hours': 0,
                        'max_weekly_hours': 20,  # Default
                        'is_overloaded': False,
                        'total_assigned_hours': 0,
                        'manual_adjustments': 0,
                        'completed_task_hours': 0,
                        'academic_level': ta.academic_level
                    })
            except User.DoesNotExist:
                pass
        
        return Response(workloads)


class ManualWorkloadAdjustmentView(APIView):
    """
    API endpoint for instructors to manually adjust TA workloads.
    """
    permission_classes = [IsAuthenticated, InstructorTAWorkloadPermission]
    
    def post(self, request):
        ta_id = request.data.get('ta_id')
        hours = request.data.get('hours')
        reason = request.data.get('reason')
        
        if not ta_id or hours is None or not reason:
            return Response(
                {"error": "TA ID, hours, and reason are required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            hours = float(hours)
        except ValueError:
            return Response(
                {"error": "Hours must be a numeric value."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            ta = User.objects.get(id=ta_id, role='TA')
        except User.DoesNotExist:
            return Response(
                {"error": "TA not found."},
                status=status.HTTP_404_NOT_FOUND
            )
            
        # Create the adjustment record
        adjustment = WorkloadManualAdjustment.objects.create(
            ta=ta,
            instructor=request.user,
            hours=hours,
            reason=reason,
            date=timezone.now().date()
        )
        
        # Update the TA's workload if it exists
        try:
            workload = TAWorkload.objects.get(
                ta=ta,
                academic_term='Spring 2024'  # Should be dynamic or from settings
            )
            workload.total_assigned_hours += hours
            workload.save()
        except TAWorkload.DoesNotExist:
            pass
            
        return Response({
            'id': adjustment.id,
            'ta': ta.full_name,
            'hours': hours,
            'reason': reason,
            'date': adjustment.date
        }, status=status.HTTP_201_CREATED)
        
        
class WorkloadAdjustmentHistoryView(APIView):
    """
    API endpoint for viewing workload adjustment history for a TA.
    """
    permission_classes = [IsAuthenticated, InstructorTAWorkloadPermission]
    
    def get(self, request):
        ta_id = request.query_params.get('ta_id')
        
        if not ta_id:
            return Response(
                {"error": "TA ID is required."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        adjustments = WorkloadManualAdjustment.objects.filter(
            ta_id=ta_id
        ).order_by('-created_at')
        
        result = []
        for adj in adjustments:
            result.append({
                'id': adj.id,
                'instructor': adj.instructor.full_name,
                'hours': adj.hours,
                'reason': adj.reason,
                'date': adj.date,
                'created_at': adj.created_at
            })
            
        return Response(result)


class WorkloadPolicyListCreateView(generics.ListCreateAPIView):
    """API endpoint for listing and creating workload policies."""
    queryset = WorkloadPolicy.objects.all()
    serializer_class = WorkloadPolicySerializer
    permission_classes = [IsAuthenticated]


class WorkloadPolicyDetailView(generics.RetrieveUpdateDestroyAPIView):
    """API endpoint for retrieving, updating and deleting workload policies."""
    queryset = WorkloadPolicy.objects.all()
    serializer_class = WorkloadPolicySerializer
    permission_classes = [IsAuthenticated]


class TAWorkloadListCreateView(generics.ListCreateAPIView):
    """API endpoint for listing and creating TA workloads."""
    queryset = TAWorkload.objects.all()
    serializer_class = TAWorkloadSerializer
    permission_classes = [IsAuthenticated]


class TAWorkloadDetailView(generics.RetrieveUpdateDestroyAPIView):
    """API endpoint for retrieving, updating and deleting TA workloads."""
    queryset = TAWorkload.objects.all()
    serializer_class = TAWorkloadSerializer
    permission_classes = [IsAuthenticated]


class WorkloadActivityListCreateView(generics.ListCreateAPIView):
    """API endpoint for listing and creating workload activities."""
    queryset = WorkloadActivity.objects.all()
    serializer_class = WorkloadActivitySerializer
    permission_classes = [IsAuthenticated]


class WorkloadActivityDetailView(generics.RetrieveUpdateDestroyAPIView):
    """API endpoint for retrieving, updating and deleting workload activities."""
    queryset = WorkloadActivity.objects.all()
    serializer_class = WorkloadActivitySerializer
    permission_classes = [IsAuthenticated]
