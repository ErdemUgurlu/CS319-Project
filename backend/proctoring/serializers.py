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
        fields = ('id', 'exam', 'ta', 'assigned_by', 'assigned_at', 'status', 'is_paid')

class EligibleProctorSerializer(serializers.ModelSerializer):
    """Serializer for eligible proctors."""
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    is_eligible = serializers.SerializerMethodField()
    details = serializers.JSONField(read_only=True)
    current_workload = serializers.IntegerField(read_only=True)
    is_assigned_to_current_exam = serializers.SerializerMethodField()
    is_teaching_course_sections = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = (
            'id', 'email', 'full_name', 'academic_level',
            'is_eligible', 'details', 'current_workload',
            'is_assigned_to_current_exam', 'is_teaching_course_sections'
        )

    def get_is_eligible(self, obj):
        # Logic to determine eligibility (currently always true in view as per log)
        return True

    def get_is_assigned_to_current_exam(self, obj):
        # 'obj' is the TA User instance
        exam = self.context.get('exam')
        currently_assigned_ta_ids = self.context.get('currently_assigned_ta_ids_for_this_exam', set())
        if not exam:
            return False
        return obj.id in currently_assigned_ta_ids

    def get_is_teaching_course_sections(self, obj):
        # 'obj' is the TA User instance
        exam_course = self.context.get('exam_course')
        ta_ids_teaching_this_course = self.context.get('ta_ids_teaching_this_course', set())
        if not exam_course:
            return False
        return obj.id in ta_ids_teaching_this_course

class ProctorAssignmentCreateSerializer(serializers.Serializer):
    """Serializer for creating proctor assignments."""
    assignment_type = serializers.ChoiceField(choices=['MANUAL', 'AUTO'], required=True)
    manual_proctors = serializers.ListField(
        child=serializers.IntegerField(),
        required=False
    )
    replace_existing = serializers.BooleanField(default=False)
    is_paid = serializers.BooleanField(default=False, required=False) 