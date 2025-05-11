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
        print(f"TaskSerializer.create - received data: {validated_data}")
        assigned_to = validated_data.pop('assigned_to', None)
        print(f"TaskSerializer.create - assigned_to value: {assigned_to}")
        
        if assigned_to:
            try:
                print(f"TaskSerializer.create - looking up User with id={assigned_to}")
                assignee = User.objects.get(id=assigned_to)
                print(f"TaskSerializer.create - found assignee: {assignee}")
                validated_data['assignee'] = assignee
            except User.DoesNotExist:
                print(f"TaskSerializer.create - User with id={assigned_to} not found")
                pass
                
        task = super().create(validated_data)
        print(f"TaskSerializer.create - created task: {task.id}, assignee: {task.assignee}")
        return task
        
    def update(self, instance, validated_data):
        """
        Update task instance, handling the status changes and related objects.
        Status is not updatable through this general method by any role;
        it is managed by specific actions (complete, review) or defaults.
        """
        user = self.context['request'].user
        print(f"TaskSerializer.update - user: {user}, role: {user.role}")
        print(f"TaskSerializer.update - received data (before status pop): {validated_data}")

        # Status should not be updated via general edit by any role.
        # It's handled by specific views (CompleteTaskView, ReviewTaskView) or default on creation.
        if 'status' in validated_data:
            original_sent_status = validated_data.pop('status')
            print(f"TaskSerializer.update - Popped 'status: {original_sent_status}' from validated_data. It will not be updated here.")

        # Handle assigned_to field
        if 'assigned_to' in validated_data:
            assigned_to = validated_data.pop('assigned_to')
            print(f"TaskSerializer.update - assigned_to value: {assigned_to}")
            
            if assigned_to:
                try:
                    print(f"TaskSerializer.update - looking up User with id={assigned_to}")
                    assignee = User.objects.get(id=assigned_to)
                    print(f"TaskSerializer.update - found assignee: {assignee}")
                    validated_data['assignee'] = assignee
                except User.DoesNotExist:
                    print(f"TaskSerializer.update - User with id={assigned_to} not found")
                    pass
            else:
                validated_data['assignee'] = None
                print("TaskSerializer.update - setting assignee to None")
        
        # If TA is making the request, ensure they can only update specific, allowed fields (if any).
        # For now, TAs primarily interact via CompleteTaskView, not general edit for core fields.
        if user.role == 'TA':
            # Example: If TAs were allowed to update, say, only their own notes field via general edit:
            # allowed_ta_fields = ['ta_notes'] 
            # for field in list(validated_data.keys()):
            #    if field not in allowed_ta_fields and field != 'assignee': # assignee might be part of other logic
            #        validated_data.pop(field)
            # For now, assume TAs don't change data via this generic update, so we can clear most fields
            # or be very restrictive. Let's prevent TA from changing core details here.
            
            # Preserve assignee if it was part of a TA-specific update logic (though TAs shouldn't change assignee)
            current_assignee_id = validated_data.pop('assignee', instance.assignee_id if instance.assignee else None)
            
            # Clear other fields to prevent accidental updates by TA through general edit
            # (This is a placeholder for more granular field permission if TAs could edit some parts)
            fields_to_clear_for_ta = [key for key in validated_data.keys() if key not in ['assignee']] # Keep assignee if it was handled
            for key in fields_to_clear_for_ta:
                validated_data.pop(key)
            if current_assignee_id is not None and 'assignee' not in validated_data:
                 # This part ensures if assignee was handled by prior logic (like assigned_to pop), it's kept.
                 # However, the `assigned_to` logic above already converts it to an assignee object.
                 # This specific TA section may need refinement if TAs are meant to update any fields here.
                 # Given the goal (status not manually updatable), and TAs complete tasks via specific view,
                 # this part mostly ensures they don't accidentally update other fields if they hit this endpoint.
                 pass # The `assignee` object is already in validated_data if `assigned_to` was present

        print(f"TaskSerializer.update - data before super().update: {validated_data}")
        updated_task = super().update(instance, validated_data)
        print(f"TaskSerializer.update - updated task: {updated_task.id}, assignee: {updated_task.assignee}, status: {updated_task.status}")
        return updated_task 