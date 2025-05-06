from rest_framework import serializers
from .models import LeaveType, LeaveRequest, LeaveImpact, DateUnavailability
from accounts.models import User, TAAssignment


class LeaveTypeSerializer(serializers.ModelSerializer):
    """Serializer for the LeaveType model."""
    
    class Meta:
        model = LeaveType
        fields = ('id', 'name', 'description', 'requires_documentation', 'max_days_per_semester')


class LeaveRequestListSerializer(serializers.ModelSerializer):
    """Serializer for listing leave requests."""
    
    ta_name = serializers.CharField(source='ta.full_name', read_only=True)
    leave_type_name = serializers.CharField(source='leave_type.name', read_only=True)
    status_display = serializers.SerializerMethodField()
    duration_days = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = LeaveRequest
        fields = ('id', 'ta', 'ta_name', 'leave_type', 'leave_type_name', 'start_date', 
                  'end_date', 'status', 'status_display', 'created_at', 'duration_days')
    
    def get_status_display(self, obj):
        return dict(LeaveRequest.STATUS_CHOICES).get(obj.status, obj.status)


class LeaveRequestDetailSerializer(serializers.ModelSerializer):
    """Serializer for detailed leave request information."""
    
    ta_name = serializers.CharField(source='ta.full_name', read_only=True)
    leave_type_name = serializers.CharField(source='leave_type.name', read_only=True)
    status_display = serializers.SerializerMethodField()
    duration_days = serializers.IntegerField(read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.full_name', read_only=True)
    
    class Meta:
        model = LeaveRequest
        fields = ('id', 'ta', 'ta_name', 'leave_type', 'leave_type_name', 'start_date', 
                  'end_date', 'reason', 'documentation', 'status', 'status_display', 
                  'created_at', 'updated_at', 'duration_days', 'reviewed_by', 
                  'reviewed_by_name', 'reviewed_at', 'rejection_reason')
        read_only_fields = ('created_at', 'updated_at', 'reviewed_by', 'reviewed_at')
    
    def get_status_display(self, obj):
        return dict(LeaveRequest.STATUS_CHOICES).get(obj.status, obj.status)


class LeaveRequestCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a leave request."""
    
    class Meta:
        model = LeaveRequest
        fields = ('leave_type', 'start_date', 'end_date', 'reason', 'documentation')
    
    def validate(self, attrs):
        # Ensure end_date is not before start_date
        if attrs.get('start_date') and attrs.get('end_date') and attrs['start_date'] > attrs['end_date']:
            raise serializers.ValidationError({"end_date": "End date must be after start date."})
        
        # Documentation is now recommended but not required
        # leave_type = attrs.get('leave_type')
        # if leave_type and leave_type.requires_documentation and not attrs.get('documentation'):
        #     raise serializers.ValidationError(
        #         {"documentation": f"Documentation is required for {leave_type.name} leave."}
        #     )
        
        # Add more validations as needed
        return attrs
    
    def create(self, validated_data):
        # The TA (user) creating the request will be added in the view
        return LeaveRequest.objects.create(**validated_data)


class LeaveRequestUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating a leave request."""
    
    class Meta:
        model = LeaveRequest
        fields = ('leave_type', 'start_date', 'end_date', 'reason', 'documentation')
    
    def validate(self, attrs):
        # Get the instance
        instance = self.instance
        
        # Ensure end_date is not before start_date
        start_date = attrs.get('start_date', instance.start_date)
        end_date = attrs.get('end_date', instance.end_date)
        if start_date > end_date:
            raise serializers.ValidationError({"end_date": "End date must be after start date."})
        
        # Documentation is now recommended but not required
        # leave_type = attrs.get('leave_type', instance.leave_type)
        # documentation = attrs.get('documentation', instance.documentation)
        # if leave_type.requires_documentation and not documentation:
        #     raise serializers.ValidationError(
        #         {"documentation": f"Documentation is required for {leave_type.name} leave."}
        #     )
        
        # Can only update if the request is in PENDING or CANCELLED status
        if instance.status not in ['PENDING', 'CANCELLED']:
            raise serializers.ValidationError(
                {"non_field_errors": "Only pending or cancelled leave requests can be updated."}
            )
        
        return attrs


class LeaveRequestReviewSerializer(serializers.ModelSerializer):
    """Serializer for reviewing (approving/rejecting) a leave request."""
    
    class Meta:
        model = LeaveRequest
        fields = ('status', 'rejection_reason')
    
    def validate(self, attrs):
        # Ensure status is either APPROVED or REJECTED
        status = attrs.get('status')
        if status not in ['APPROVED', 'REJECTED']:
            raise serializers.ValidationError({"status": "Status must be either APPROVED or REJECTED."})
        
        # Ensure rejection reason is provided if status is REJECTED
        if status == 'REJECTED' and not attrs.get('rejection_reason'):
            raise serializers.ValidationError({"rejection_reason": "Rejection reason is required."})
        
        return attrs


class LeaveImpactSerializer(serializers.ModelSerializer):
    """Serializer for the LeaveImpact model."""
    
    leave_request_details = LeaveRequestListSerializer(source='leave_request', read_only=True)
    ta_assignment_details = serializers.SerializerMethodField()
    
    class Meta:
        model = LeaveImpact
        fields = ('id', 'leave_request', 'leave_request_details', 'ta_assignment', 
                  'ta_assignment_details', 'instructor_notified', 'notification_date', 
                  'instructor_comments')
    
    def get_ta_assignment_details(self, obj):
        return {
            'ta_name': obj.ta_assignment.ta.full_name,
            'section': str(obj.ta_assignment.section),
            'instructor': obj.ta_assignment.section.instructor.full_name if obj.ta_assignment.section.instructor else None,
        }


class DateUnavailabilitySerializer(serializers.ModelSerializer):
    """Serializer for the DateUnavailability model."""
    
    ta_name = serializers.CharField(source='ta.full_name', read_only=True)
    
    class Meta:
        model = DateUnavailability
        fields = ('id', 'ta', 'ta_name', 'date', 'reason', 'leave_request') 