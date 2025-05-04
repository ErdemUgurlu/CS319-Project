from rest_framework import serializers
from accounts.models import User
from .models import Task, TaskCompletion, TaskReview


class UserMinimalSerializer(serializers.ModelSerializer):
    """Minimal serializer for User model."""
    
    full_name = serializers.CharField(read_only=True)
    
    class Meta:
        model = User
        fields = ('id', 'email', 'full_name')


class TaskCompletionSerializer(serializers.ModelSerializer):
    """Serializer for TaskCompletion model."""
    
    class Meta:
        model = TaskCompletion
        fields = ('id', 'completed_at', 'completion_note', 'files', 'hours_spent')


class TaskReviewSerializer(serializers.ModelSerializer):
    """Serializer for TaskReview model."""
    
    reviewer = UserMinimalSerializer(read_only=True)
    
    class Meta:
        model = TaskReview
        fields = ('id', 'reviewer', 'review_date', 'is_approved', 'feedback')


class TaskSerializer(serializers.ModelSerializer):
    """Serializer for Task model."""
    
    assignee = UserMinimalSerializer(read_only=True)
    creator = UserMinimalSerializer(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    completion = TaskCompletionSerializer(read_only=True)
    review = TaskReviewSerializer(read_only=True)
    assigned_to = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    
    class Meta:
        model = Task
        fields = (
            'id', 'title', 'description', 'status', 'status_display',
            'priority', 'priority_display', 'due_date', 'created_at',
            'updated_at', 'assignee', 'creator', 'credit_hours',
            'completion', 'review', 'assigned_to'
        )
    
    def create(self, validated_data):
        """
        Create task instance, handling the assigned_to field
        """
        assigned_to = validated_data.pop('assigned_to', None)
        
        if assigned_to:
            try:
                assignee = User.objects.get(id=assigned_to)
                validated_data['assignee'] = assignee
            except User.DoesNotExist:
                pass
                
        return super().create(validated_data)
        
    def update(self, instance, validated_data):
        """
        Update task instance, handling the status changes and related objects.
        Instructors can assign tasks or update all fields.
        TAs can only update status to IN_PROGRESS or COMPLETED.
        """
        user = self.context['request'].user
        
        # Handle assigned_to field
        if 'assigned_to' in validated_data:
            assigned_to = validated_data.pop('assigned_to')
            if assigned_to:
                try:
                    assignee = User.objects.get(id=assigned_to)
                    validated_data['assignee'] = assignee
                except User.DoesNotExist:
                    pass
            else:
                validated_data['assignee'] = None
        
        if user.role == 'TA':
            # TAs can only update status
            if 'status' in validated_data:
                new_status = validated_data['status']
                # TAs can only set status to IN_PROGRESS or keep as is
                if new_status == 'IN_PROGRESS':
                    instance.status = new_status
                elif new_status != instance.status:
                    raise serializers.ValidationError({"status": "TAs can only set tasks to IN_PROGRESS"})
                
            # Remove all other fields for TA updates
            for field in list(validated_data.keys()):
                if field != 'status':
                    validated_data.pop(field)
        
        return super().update(instance, validated_data) 