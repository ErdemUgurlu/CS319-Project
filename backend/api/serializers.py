from rest_framework import serializers
from django.contrib.auth.models import User
from .models import LeaveRequest

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name']

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