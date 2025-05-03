from rest_framework import serializers
from .models import Exam, ExamRoom, ProctorAssignment, SwapRequest, ProctorConstraint
from accounts.models import User


class UserMinimalSerializer(serializers.ModelSerializer):
    """Minimal serializer for User model."""
    
    full_name = serializers.CharField(read_only=True)
    
    class Meta:
        model = User
        fields = ('id', 'email', 'full_name', 'academic_level')


class ExamRoomSerializer(serializers.ModelSerializer):
    """Serializer for ExamRoom model."""
    
    classroom_name = serializers.CharField(source='classroom.building', read_only=True)
    room_number = serializers.CharField(source='classroom.room_number', read_only=True)
    
    class Meta:
        model = ExamRoom
        fields = ('id', 'classroom_name', 'room_number', 'student_count', 'proctor_count')


class ProctorAssignmentSerializer(serializers.ModelSerializer):
    """Serializer for ProctorAssignment model."""
    
    proctor = UserMinimalSerializer(read_only=True)
    previous_proctor = UserMinimalSerializer(read_only=True)
    exam_room = ExamRoomSerializer(read_only=True)
    
    class Meta:
        model = ProctorAssignment
        fields = ('id', 'exam', 'exam_room', 'proctor', 'status', 'assigned_at', 
                  'confirmation_date', 'previous_proctor', 'swap_timestamp', 
                  'swap_reason', 'swap_depth')


class SwapRequestSerializer(serializers.ModelSerializer):
    """Serializer for SwapRequest model."""
    
    requesting_proctor = UserMinimalSerializer(read_only=True)
    requested_proctor = UserMinimalSerializer(read_only=True)
    original_assignment = ProctorAssignmentSerializer(read_only=True)
    
    class Meta:
        model = SwapRequest
        fields = ('id', 'original_assignment', 'requesting_proctor', 'requested_proctor',
                  'reason', 'status', 'created_at', 'updated_at', 'is_auto_swap',
                  'is_cross_department', 'constraint_check_passed', 'constraint_check_details')
        read_only_fields = ('created_at', 'updated_at', 'status', 'constraint_check_passed')


class SwapRequestCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating SwapRequest."""
    
    original_assignment_id = serializers.IntegerField(write_only=True)
    requested_proctor_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = SwapRequest
        fields = ('id', 'original_assignment_id', 'requested_proctor_id', 'reason')
    
    def validate(self, attrs):
        """
        Validate that the swap request meets basic requirements.
        """
        try:
            original_assignment = ProctorAssignment.objects.get(id=attrs['original_assignment_id'])
        except ProctorAssignment.DoesNotExist:
            raise serializers.ValidationError({"original_assignment_id": "Assignment does not exist"})
        
        try:
            requested_proctor = User.objects.get(id=attrs['requested_proctor_id'], role='TA')
        except User.DoesNotExist:
            raise serializers.ValidationError({"requested_proctor_id": "Requested TA does not exist"})
        
        # Check if exam is within 3 hours
        import datetime
        from django.utils import timezone
        
        exam_datetime = datetime.datetime.combine(
            original_assignment.exam.date,
            original_assignment.exam.start_time
        )
        
        if timezone.make_aware(exam_datetime) - timezone.now() < datetime.timedelta(hours=3):
            raise serializers.ValidationError(
                "Cannot swap assignments less than 3 hours before the exam"
            )
        
        # Check if assignment has already been swapped 3 times
        if original_assignment.swap_depth >= 3:
            raise serializers.ValidationError(
                "This assignment has already been swapped the maximum number of times"
            )
        
        # Store objects for create method
        attrs['original_assignment'] = original_assignment
        attrs['requested_proctor'] = requested_proctor
        
        return attrs
    
    def create(self, validated_data):
        """
        Create the swap request and process it automatically.
        """
        original_assignment = validated_data.pop('original_assignment')
        requested_proctor = validated_data.pop('requested_proctor')
        
        # Set the requesting proctor as the current proctor of the assignment
        requesting_proctor = original_assignment.proctor
        
        # Remove the temporary IDs used for validation
        validated_data.pop('original_assignment_id')
        validated_data.pop('requested_proctor_id')
        
        # Create the swap request
        swap_request = SwapRequest(
            original_assignment=original_assignment,
            requesting_proctor=requesting_proctor,
            requested_proctor=requested_proctor,
            is_auto_swap=True,
            **validated_data
        )
        
        # Further processing will happen in the view
        return swap_request 