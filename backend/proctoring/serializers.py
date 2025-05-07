from rest_framework import serializers
from accounts.models import User, Exam
from .models import ProctorAssignment

class UserBasicSerializer(serializers.ModelSerializer):
    """Simplified serializer for User data in API responses."""
    full_name = serializers.CharField(read_only=True)
    
    class Meta:
        model = User
        fields = ('id', 'email', 'full_name', 'academic_level')

class ProctorAssignmentSerializer(serializers.ModelSerializer):
    """Serializer for ProctorAssignment model."""
    ta = UserBasicSerializer(read_only=True)
    assigned_by = UserBasicSerializer(read_only=True)
    
    class Meta:
        model = ProctorAssignment
        fields = ('id', 'exam', 'ta', 'assigned_by', 'assigned_at', 'status')

class EligibleProctorSerializer(serializers.ModelSerializer):
    """Serializer for eligible proctors."""
    full_name = serializers.CharField(read_only=True)
    is_eligible = serializers.BooleanField(read_only=True)
    details = serializers.JSONField(read_only=True)
    current_workload = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = User
        fields = ('id', 'email', 'full_name', 'academic_level', 'is_eligible', 'details', 'current_workload')

class ProctorAssignmentCreateSerializer(serializers.Serializer):
    """Serializer for creating proctor assignments."""
    assignment_type = serializers.ChoiceField(choices=['MANUAL', 'AUTO'], required=True)
    manual_proctors = serializers.ListField(
        child=serializers.IntegerField(),
        required=False
    )
    replace_existing = serializers.BooleanField(default=False) 