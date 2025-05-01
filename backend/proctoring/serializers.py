from rest_framework import serializers
from django.contrib.auth.models import User
from .models import TA, Task, Exam
from django.utils import timezone

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email']

class TASerializer(serializers.ModelSerializer):
    user = UserSerializer()

    class Meta:
        model = TA
        fields = ['id', 'user', 'department', 'office_hours', 'workload']

class TaskSerializer(serializers.ModelSerializer):
    assigned_to = TASerializer(read_only=True)
    assigned_by = UserSerializer(read_only=True)
    assigned_to_id = serializers.PrimaryKeyRelatedField(
        queryset=TA.objects.all(),
        write_only=True,
        source='assigned_to'
    )
    assigned_by_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        write_only=True,
        source='assigned_by'
    )

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'assigned_to', 'assigned_by',
            'assigned_to_id', 'assigned_by_id', 'course', 'task_type', 'status',
            'created_at', 'due_date', 'completion_notes', 'completed_at'
        ]

class ExamSerializer(serializers.ModelSerializer):
    proctor = TASerializer(read_only=True)
    created_by = UserSerializer(read_only=True)
    proctor_id = serializers.PrimaryKeyRelatedField(
        queryset=TA.objects.all(),
        write_only=True,
        source='proctor',
        required=False
    )
    created_by_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        write_only=True,
        source='created_by'
    )

    class Meta:
        model = Exam
        fields = [
            'id', 'title', 'course', 'date', 'location', 'duration',
            'proctor', 'created_by', 'proctor_id', 'created_by_id',
            'created_at'
        ]