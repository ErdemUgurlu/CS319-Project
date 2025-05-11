from rest_framework import serializers
from .models import WorkloadSummary
from accounts.models import TAProfile
from accounts.serializers import TASerializer

class WorkloadSummarySerializer(serializers.ModelSerializer):
    ta_details = TASerializer(source='ta', read_only=True)

    class Meta:
        model = WorkloadSummary
        fields = [
            'id', 
            'ta', # Keep ta_id for potential direct use if needed
            'ta_details',
            'semester', 
            'year', 
            'duty_hours', 
            'proctor_hours', 
            'task_hours', 
            'total_hours', 
            'last_updated'
            # Consider adding fields related to caps or overload status if they are derived here or stored on the model
        ]
        # Example of making ta_id writeable if needed, but for 'my_workload' it's read-only context
        # read_only_fields = ['ta_details'] 

class MyWorkloadCreditSerializer(serializers.ModelSerializer):
    """Serializer for displaying TA's workload_credits and basic details."""
    # Assuming TASerializer from accounts.serializers provides email, full_name, etc.
    # We get these from ta_profile.user
    email = serializers.EmailField(source='user.email', read_only=True)
    full_name = serializers.CharField(source='user.full_name', read_only=True)
    academic_level = serializers.CharField(source='user.academic_level', read_only=True)
    employment_type = serializers.CharField(source='user.employment_type', read_only=True)
    department_code = serializers.CharField(source='user.department', read_only=True) # Assuming user.department holds the code like 'CS'
    # department_name could be added if needed, requiring a lookup or User model enhancement

    class Meta:
        model = TAProfile
        fields = [
            'workload_credits',
            'email',
            'full_name',
            'academic_level',
            'employment_type',
            'department_code'
            # Add other fields from TAProfile or User if needed by the frontend
        ] 