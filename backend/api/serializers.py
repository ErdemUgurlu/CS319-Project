from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    LeaveRequest, Department, UserProfile, 
    ProctorAssignment, CrossDepartmentAssignmentRequest
)

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ['id', 'name', 'code']

class UserProfileSerializer(serializers.ModelSerializer):
    department = DepartmentSerializer(read_only=True)
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(),
        source='department',
        write_only=True
    )

    class Meta:
        model = UserProfile
        fields = ['id', 'user', 'department', 'department_id', 'is_authorized_staff', 'is_dean_office']
        read_only_fields = ['user']

class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'profile']

class ProctorAssignmentSerializer(serializers.ModelSerializer):
    proctor = UserSerializer(read_only=True)
    proctor_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='proctor',
        write_only=True,
        required=False
    )
    target_department = DepartmentSerializer(read_only=True)
    target_department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(),
        source='target_department',
        write_only=True,
        required=False
    )

    class Meta:
        model = ProctorAssignment
        fields = [
            'id', 'exam', 'proctor', 'proctor_id', 'status', 
            'assigned_by', 'target_department', 'target_department_id',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['assigned_by', 'created_at', 'updated_at']

class CrossDepartmentAssignmentRequestSerializer(serializers.ModelSerializer):
    requesting_department = DepartmentSerializer(read_only=True)
    target_department = DepartmentSerializer(read_only=True)
    requesting_department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(),
        source='requesting_department',
        write_only=True
    )
    target_department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(),
        source='target_department',
        write_only=True
    )

    class Meta:
        model = CrossDepartmentAssignmentRequest
        fields = [
            'id', 'proctor_assignment', 'requesting_department', 
            'requesting_department_id', 'target_department', 
            'target_department_id', 'status', 'created_by', 
            'approved_by', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_by', 'approved_by', 'created_at', 'updated_at']

class LeaveRequestSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_name = serializers.SerializerMethodField()
    
    class Meta:
        model = LeaveRequest
        fields = ['id', 'user', 'user_name', 'course', 'leave_type', 'start_date', 'end_date', 
                 'reason', 'status', 'created_at', 'updated_at']
        read_only_fields = ['user', 'status', 'created_at', 'updated_at']

    def get_user_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}" if obj.user.first_name else obj.user.username 