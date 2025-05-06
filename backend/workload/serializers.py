from rest_framework import serializers
from .models import WorkloadPolicy, TAWorkload, WorkloadActivity, WorkloadManualAdjustment
from accounts.models import User, Department


class UserMinimalSerializer(serializers.ModelSerializer):
    """Minimal serializer for User model."""
    
    full_name = serializers.CharField(read_only=True)
    
    class Meta:
        model = User
        fields = ('id', 'email', 'full_name', 'academic_level', 'employment_type')


class DepartmentSerializer(serializers.ModelSerializer):
    """Serializer for Department model."""
    
    class Meta:
        model = Department
        fields = ('id', 'code', 'name')


class WorkloadPolicySerializer(serializers.ModelSerializer):
    """Serializer for WorkloadPolicy model."""
    
    department_details = DepartmentSerializer(source='department', read_only=True)
    
    class Meta:
        model = WorkloadPolicy
        fields = ('id', 'department', 'department_details', 'academic_term', 
                 'max_hours_phd_full_time', 'max_hours_phd_part_time',
                 'max_hours_msc_full_time', 'max_hours_msc_part_time',
                 'max_hours_undergrad',
                 'lecture_weight', 'lab_weight', 'grading_weight', 'office_hours_weight',
                 'exam_period_multiplier', 'is_active', 'created_at', 'updated_at')
                 
    def validate(self, attrs):
        """Validate unique constraint for department and academic term."""
        department = attrs.get('department')
        academic_term = attrs.get('academic_term')
        
        # Check for updates vs. creates
        instance = getattr(self, 'instance', None)
        
        if department and academic_term:
            # If updating, exclude the current instance
            existing = WorkloadPolicy.objects.filter(
                department=department, 
                academic_term=academic_term
            )
            
            if instance:
                existing = existing.exclude(pk=instance.pk)
            
            if existing.exists():
                raise serializers.ValidationError({
                    'non_field_errors': ['A policy already exists for this department and academic term.']
                })
                
        return attrs


class WorkloadActivitySerializer(serializers.ModelSerializer):
    """Serializer for WorkloadActivity model."""
    
    class Meta:
        model = WorkloadActivity
        fields = ('id', 'workload', 'activity_type', 'description', 'hours', 
                 'weighted_hours', 'is_recurring', 'recurrence_pattern',
                 'start_date', 'end_date', 'course_code', 'section',
                 'created_at', 'updated_at')
        read_only_fields = ('weighted_hours',)
        
    def validate(self, attrs):
        """Validate activity data."""
        start_date = attrs.get('start_date')
        end_date = attrs.get('end_date')
        
        if start_date and end_date and end_date < start_date:
            raise serializers.ValidationError({
                'end_date': ['End date cannot be before start date.']
            })
            
        return attrs


class TAWorkloadSerializer(serializers.ModelSerializer):
    """Basic serializer for TAWorkload model."""
    
    ta_details = UserMinimalSerializer(source='ta', read_only=True)
    department_details = DepartmentSerializer(source='department', read_only=True)
    
    class Meta:
        model = TAWorkload
        fields = ('id', 'ta', 'ta_details', 'academic_term', 'department', 'department_details',
                 'policy', 'max_weekly_hours', 'required_workload_hours', 'current_weekly_hours', 
                 'total_assigned_hours', 'is_overloaded', 'overload_approved', 'notes', 
                 'created_at', 'updated_at')
        read_only_fields = ('current_weekly_hours', 'total_assigned_hours', 'is_overloaded', 'required_workload_hours')


class TAWorkloadDetailSerializer(TAWorkloadSerializer):
    """Detailed serializer for TAWorkload model that includes activities."""
    
    activities = WorkloadActivitySerializer(many=True, read_only=True)
    policy_details = WorkloadPolicySerializer(source='policy', read_only=True)
    total_workload_hours = serializers.SerializerMethodField()
    completed_task_hours = serializers.SerializerMethodField()
    manual_adjustment_hours = serializers.SerializerMethodField()
    total_term_workload = serializers.SerializerMethodField()
    
    class Meta(TAWorkloadSerializer.Meta):
        fields = TAWorkloadSerializer.Meta.fields + ('activities', 'policy_details', 'total_workload_hours', 'completed_task_hours', 'manual_adjustment_hours', 'total_term_workload')
    
    def get_completed_task_hours(self, obj):
        from django.db.models import Sum
        from .models import WorkloadRecord
        
        task_hours = WorkloadRecord.objects.filter(
            user=obj.ta
        ).aggregate(total=Sum('hours'))['total'] or 0
        
        return float(task_hours)
    
    def get_manual_adjustment_hours(self, obj):
        from django.db.models import Sum
        from .models import WorkloadManualAdjustment
        
        adjustments = WorkloadManualAdjustment.objects.filter(
            ta=obj.ta
        ).aggregate(total=Sum('hours'))['total'] or 0
        
        return float(adjustments)
    
    def get_total_workload_hours(self, obj):
        # Get the task hours and manual adjustments
        task_hours = self.get_completed_task_hours(obj)
        adjustments = self.get_manual_adjustment_hours(obj)
        
        # Calculate total hours as current_weekly_hours + task_hours + adjustments
        total_hours = obj.current_weekly_hours + task_hours + adjustments
        
        return float(total_hours)
        
    def get_total_term_workload(self, obj):
        # Get the task hours and manual adjustments
        task_hours = self.get_completed_task_hours(obj)
        adjustments = self.get_manual_adjustment_hours(obj)
        
        # Calculate total term workload as total_assigned_hours + task_hours + adjustments
        total_term = obj.total_assigned_hours + task_hours + adjustments
        
        return float(total_term)


class WorkloadSummarySerializer(serializers.Serializer):
    """Serializer for department workload summary statistics."""
    
    total_tas = serializers.IntegerField()
    overloaded_tas = serializers.IntegerField()
    overload_percentage = serializers.FloatField()
    academic_levels = serializers.DictField()
    employment_types = serializers.DictField()
    activity_distribution = serializers.DictField()


class WorkloadManualAdjustmentSerializer(serializers.ModelSerializer):
    """Serializer for manual workload adjustments."""
    
    instructor_name = serializers.CharField(source='instructor.full_name', read_only=True)
    ta_name = serializers.CharField(source='ta.full_name', read_only=True)
    
    class Meta:
        model = WorkloadManualAdjustment
        fields = ('id', 'ta', 'ta_name', 'instructor', 'instructor_name', 
                  'hours', 'reason', 'date', 'created_at')
        read_only_fields = ('created_at',) 