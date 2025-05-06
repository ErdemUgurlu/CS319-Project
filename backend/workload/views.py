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
from accounts.models import User, InstructorTAAssignment, Department


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
        
        # Get current term dynamically based on current date
        current_date = timezone.now().date()
        current_month = current_date.month
        current_year = current_date.year
        
        # Determine academic term based on month (this is a simple approach)
        # Jan-May: Spring, Jun-Aug: Summer, Sep-Dec: Fall
        if 1 <= current_month <= 5:
            term_name = "Spring"
        elif 6 <= current_month <= 8:
            term_name = "Summer"
        else:
            term_name = "Fall"
            
        current_term = f"{term_name} {current_year}"
        
        # Try to get existing workload record
        workload = TAWorkload.objects.filter(
            ta=request.user, 
            academic_term=current_term
        ).first()
        
        # If no workload exists, create a default one
        if not workload:
            try:
                # Get the TA's department (which is a department code string)
                department_code = request.user.department
                
                # Get the Department model instance
                try:
                    department = Department.objects.get(code=department_code)
                except Department.DoesNotExist:
                    # Create a default department if not found
                    department = Department.objects.create(
                        name=f"{department_code} Department",
                        code=department_code,
                        faculty="Default Faculty"
                    )
                
                # Get active policy for the department, if any
                policy = WorkloadPolicy.objects.filter(
                    department=department, 
                    is_active=True
                ).first()
                
                # Create new workload record
                workload = TAWorkload.objects.create(
                    ta=request.user,
                    academic_term=current_term,
                    department=department,
                    policy=policy
                )
                
                print(f"Created new workload record for TA {request.user.id} ({request.user.email}) - Term: {current_term}")
            except Exception as e:
                # Log error but return a user-friendly message
                print(f"Error creating workload record: {str(e)}")
                return Response(
                    {
                        "error": "No workload record found for current term",
                        "message": "Please contact your department administrator to setup your workload.",
                        "current_term": current_term
                    },
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
        
        # Get current term dynamically based on current date
        current_date = timezone.now().date()
        current_month = current_date.month
        current_year = current_date.year
        
        # Determine academic term based on month
        if 1 <= current_month <= 5:
            term_name = "Spring"
        elif 6 <= current_month <= 8:
            term_name = "Summer"
        else:
            term_name = "Fall"
            
        current_term = f"{term_name} {current_year}"
        
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
                        academic_term=current_term
                    )
                    
                    # Get the manual adjustments
                    manual_adjustments = WorkloadManualAdjustment.objects.filter(
                        ta=ta
                    ).aggregate(total=Sum('hours'))['total'] or 0
                    
                    # Get completed tasks
                    task_hours = WorkloadRecord.objects.filter(
                        user=ta
                    ).aggregate(total=Sum('hours'))['total'] or 0
                    
                    # Calculate total current workload
                    current_workload = workload.current_weekly_hours + task_hours + manual_adjustments
                    
                    # Calculate workload percentage
                    workload_cap = workload.max_weekly_hours
                    workload_percentage = current_workload / workload_cap if workload_cap > 0 else 0
                    
                    workloads.append({
                        'ta_id': ta.id,
                        'ta_name': ta.full_name,
                        'email': ta.email,
                        'employment_type': ta.employment_type,
                        'academic_level': ta.academic_level,
                        'current_workload': current_workload,
                        'workload_cap': workload_cap,
                        'workload_percentage': workload_percentage,
                        'current_weekly_hours': workload.current_weekly_hours,
                        'max_weekly_hours': workload.max_weekly_hours,
                        'is_overloaded': workload.is_overloaded,
                        'total_assigned_hours': workload.total_assigned_hours,
                        'manual_adjustments': manual_adjustments,
                        'completed_task_hours': task_hours,
                        'first_name': ta.first_name,
                        'last_name': ta.last_name,
                        'department': ta.get_department_display(),
                        'current_term': current_term
                    })
                except TAWorkload.DoesNotExist:
                    # No workload record exists
                    # Set default workload cap based on employment type
                    workload_cap = 20 if ta.employment_type == 'FULL_TIME' else 10
                    
                    workloads.append({
                        'ta_id': ta.id,
                        'ta_name': ta.full_name,
                        'email': ta.email,
                        'employment_type': ta.employment_type,
                        'academic_level': ta.academic_level,
                        'current_workload': 0,
                        'workload_cap': workload_cap,
                        'workload_percentage': 0,
                        'current_weekly_hours': 0,
                        'max_weekly_hours': workload_cap,
                        'is_overloaded': False,
                        'total_assigned_hours': 0,
                        'manual_adjustments': 0,
                        'completed_task_hours': 0,
                        'first_name': ta.first_name,
                        'last_name': ta.last_name,
                        'department': ta.get_department_display(),
                        'current_term': current_term
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


# Helper function to update workload when a task is approved
def update_workload_on_task_approval(task_id, ta_id, hours, approved=True):
    """
    Update a TA's workload when a task is approved or rejected.
    
    Args:
        task_id (int): The ID of the task being approved/rejected
        ta_id (int): The ID of the TA who completed the task
        hours (float): The number of hours spent on the task
        approved (bool): Whether the task was approved (True) or rejected (False)
    
    Returns:
        bool: True if the workload was updated successfully, False otherwise
    """
    try:
        # Only update workload if task is approved
        if not approved:
            return True
            
        # Get the TA user
        ta = User.objects.get(id=ta_id, role='TA')
        
        # Get the TA's department (which is a department code string)
        department_code = ta.department
        
        # Get the Department model instance
        try:
            department = Department.objects.get(code=department_code)
        except Department.DoesNotExist:
            # Create a default department if not found
            department = Department.objects.create(
                name=f"{department_code} Department",
                code=department_code,
                faculty="Default Faculty"
            )
        
        # Get current term dynamically based on current date
        current_date = timezone.now().date()
        current_month = current_date.month
        current_year = current_date.year
        
        # Determine academic term based on month (this is a simple approach)
        # Jan-May: Spring, Jun-Aug: Summer, Sep-Dec: Fall
        if 1 <= current_month <= 5:
            term_name = "Spring"
        elif 6 <= current_month <= 8:
            term_name = "Summer"
        else:
            term_name = "Fall"
            
        current_term = f"{term_name} {current_year}"
        
        print(f"Updating workload for TA {ta.full_name} for term: {current_term}")
        
        # Get or create a workload record for the TA
        workload, created = TAWorkload.objects.get_or_create(
            ta=ta,
            academic_term=current_term,
            defaults={
                'department': department,
                'max_weekly_hours': 20 if ta.employment_type == 'FULL_TIME' else 10,
                'current_weekly_hours': 0
            }
        )
        
        # Create a workload record
        record = WorkloadRecord.objects.create(
            user=ta,
            task_id=task_id,
            hours=hours,
            date=timezone.now().date(),
            description=f"Task {task_id} completion approved"
        )
        
        # Log the workload update process
        print(f"Before update: TA {ta.full_name}, current_weekly_hours: {workload.current_weekly_hours}, total_assigned_hours: {workload.total_assigned_hours}, adding: {hours}")
        
        # Update the workload - hours count towards both weekly and total term workload
        workload.current_weekly_hours += hours
        workload.total_assigned_hours += hours  # This is important for term workload tracking
        
        # Check if TA is now overloaded
        if workload.current_weekly_hours > workload.max_weekly_hours:
            workload.is_overloaded = True
            
        workload.save()
        
        print(f"After update: TA {ta.full_name}, current_weekly_hours: {workload.current_weekly_hours}, total_assigned_hours: {workload.total_assigned_hours}, is_overloaded: {workload.is_overloaded}")
        
        return True
    except Exception as e:
        print(f"Error updating workload for task {task_id}, TA {ta_id}: {str(e)}")
        return False
        

class TaskCompletionWorkloadUpdateView(APIView):
    """
    API endpoint for updating TA workload when a task is completed and approved.
    This is called from the tasks app when a task is approved.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        task_id = request.data.get('task_id')
        ta_id = request.data.get('ta_id')
        hours = request.data.get('hours')
        approved = request.data.get('approved', True)
        
        if not task_id or not ta_id or hours is None:
            return Response(
                {"error": "Task ID, TA ID, and hours are required."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            hours = float(hours)
        except ValueError:
            return Response(
                {"error": "Hours must be a numeric value."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        success = update_workload_on_task_approval(task_id, ta_id, hours, approved)
        
        if success:
            return Response(
                {"message": f"Workload updated successfully for TA {ta_id}"},
                status=status.HTTP_200_OK
            )
        else:
            return Response(
                {"error": "Failed to update workload."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
