from rest_framework import serializers
from .models import Exam, ExamRoom, ProctorAssignment, SwapRequest, ProctorConstraint
from accounts.models import User, Section, Classroom


class UserMinimalSerializer(serializers.ModelSerializer):
    """Minimal serializer for User model."""
    
    full_name = serializers.CharField(read_only=True)
    
    class Meta:
        model = User
        fields = ('id', 'email', 'full_name', 'academic_level')


class SectionMinimalSerializer(serializers.ModelSerializer):
    """Minimal serializer for Section model."""
    
    course = serializers.SerializerMethodField()
    
    class Meta:
        model = Section
        fields = ('id', 'section_number', 'course')
    
    def get_course(self, obj):
        return {
            'id': obj.course.id,
            'code': obj.course.code,
            'title': obj.course.title
        }


class ExamSerializer(serializers.ModelSerializer):
    """Serializer for Exam model."""
    
    section = SectionMinimalSerializer(read_only=True)
    
    class Meta:
        model = Exam
        fields = ('id', 'title', 'date', 'start_time', 'end_time', 'section')


class ExamRoomSerializer(serializers.ModelSerializer):
    """Serializer for exam rooms."""
    classroom_name = serializers.CharField(source='classroom.name', read_only=True)
    classroom_building = serializers.CharField(source='classroom.building', read_only=True)
    classroom_capacity = serializers.IntegerField(source='classroom.capacity', read_only=True)
    
    class Meta:
        model = ExamRoom
        fields = [
            'id', 'classroom', 'classroom_name', 'classroom_building', 
            'classroom_capacity', 'student_count', 'proctor_count'
        ]


class ProctorAssignmentSerializer(serializers.ModelSerializer):
    """Serializer for proctor assignments with exam details."""
    exam_title = serializers.CharField(source='exam.title', read_only=True)
    exam_date = serializers.DateField(source='exam.date', read_only=True)
    exam_start_time = serializers.TimeField(source='exam.start_time', read_only=True)
    exam_end_time = serializers.TimeField(source='exam.end_time', read_only=True)
    exam_type = serializers.CharField(source='exam.get_exam_type_display', read_only=True)
    course_code = serializers.CharField(source='exam.section.course.code', read_only=True)
    section_number = serializers.CharField(source='exam.section.section_number', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = ProctorAssignment
        fields = [
            'id', 'exam', 'exam_title', 'exam_date', 'exam_start_time', 'exam_end_time',
            'exam_type', 'course_code', 'section_number', 'status', 'status_display',
            'confirmation_date', 'assigned_at'
        ]
        read_only_fields = fields


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
    requested_proctor_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    
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
        
        # Handle optional requested_proctor_id
        requested_proctor = None
        if 'requested_proctor_id' in attrs and attrs['requested_proctor_id']:
            try:
                requested_proctor = User.objects.get(id=attrs['requested_proctor_id'], role='TA')
            except User.DoesNotExist:
                raise serializers.ValidationError({"requested_proctor_id": "Requested TA does not exist"})
        
        # Check if exam is within 3 hours - skip this check for self-initiated swaps
        if requested_proctor:
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
        if 'requested_proctor_id' in validated_data:
            validated_data.pop('requested_proctor_id')
        
        # Determine if this is a self-initiated swap or targeted swap
        is_auto_swap = requested_proctor is not None
        
        # Create the swap request
        swap_request = SwapRequest(
            original_assignment=original_assignment,
            requesting_proctor=requesting_proctor,
            requested_proctor=requested_proctor,
            is_auto_swap=is_auto_swap,
            **validated_data
        )
        
        # Further processing will happen in the view
        return swap_request


class ExamCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a new exam."""
    section_id = serializers.PrimaryKeyRelatedField(
        queryset=Section.objects.all(),
        source='section',
        write_only=True
    )
    rooms = ExamRoomSerializer(many=True, read_only=True)
    
    class Meta:
        model = Exam
        fields = [
            'id', 'title', 'section_id', 'exam_type', 'date', 'start_time', 
            'end_time', 'duration_minutes', 'student_count', 'proctor_count_needed',
            'room_count', 'student_list_file', 'status', 'notes', 'rooms'
        ]
        read_only_fields = ['id', 'status', 'duration_minutes', 'rooms']
    
    def validate(self, data):
        """Validate exam times and check for conflicts."""
        # Make sure end time is after start time
        if data.get('start_time') and data.get('end_time'):
            if data['end_time'] <= data['start_time']:
                raise serializers.ValidationError({
                    'end_time': 'End time must be after start time'
                })
        
        return data


class ExamDetailSerializer(serializers.ModelSerializer):
    """Serializer for retrieving and updating an exam."""
    rooms = ExamRoomSerializer(many=True, read_only=True)
    section_code = serializers.CharField(source='section.code', read_only=True)
    course_code = serializers.CharField(source='section.course.code', read_only=True)
    course_title = serializers.CharField(source='section.course.title', read_only=True)
    exam_type_display = serializers.CharField(source='get_exam_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    proctors = serializers.SerializerMethodField()
    
    class Meta:
        model = Exam
        fields = [
            'id', 'title', 'section', 'section_code', 'course_code', 'course_title',
            'exam_type', 'exam_type_display', 'date', 'start_time', 'end_time',
            'duration_minutes', 'student_count', 'proctor_count_needed', 'room_count',
            'student_list_file', 'status', 'status_display', 'notes', 'created_by',
            'created_by_name', 'created_at', 'updated_at', 'rooms', 'proctors',
            'is_cross_department', 'requested_from_department', 'dean_office_request',
            'dean_office_comments'
        ]
        read_only_fields = [
            'id', 'created_by', 'created_by_name', 'created_at', 'updated_at',
            'duration_minutes', 'rooms', 'proctors', 'section_code', 'course_code',
            'course_title', 'exam_type_display', 'status_display'
        ]
    
    def get_proctors(self, obj):
        """Get all proctors assigned to this exam."""
        assignments = ProctorAssignment.objects.filter(exam=obj)
        return ProctorAssignmentSimpleSerializer(assignments, many=True).data


class ProctorAssignmentSimpleSerializer(serializers.ModelSerializer):
    """Simplified serializer for proctor assignments within an exam."""
    proctor_name = serializers.CharField(source='proctor.full_name', read_only=True)
    proctor_email = serializers.EmailField(source='proctor.email', read_only=True)
    proctor_academic_level = serializers.CharField(source='proctor.academic_level', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    room_name = serializers.SerializerMethodField()
    
    class Meta:
        model = ProctorAssignment
        fields = [
            'id', 'proctor', 'proctor_name', 'proctor_email', 'proctor_academic_level',
            'status', 'status_display', 'assigned_at', 'confirmation_date',
            'room_name', 'override_flag', 'override_reason'
        ]
    
    def get_room_name(self, obj):
        """Get the room name if assigned to a specific room."""
        if obj.exam_room:
            return obj.exam_room.classroom.name
        return None


class ProctorAssignmentRequestSerializer(serializers.Serializer):
    """Serializer for proctor assignment request."""
    assignment_type = serializers.ChoiceField(
        choices=['MANUAL', 'AUTO', 'HYBRID'],
        required=True
    )
    manual_proctors = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        default=[]
    )
    replace_existing = serializers.BooleanField(default=False)
    
    def validate(self, data):
        """Validate that manual proctors are provided for MANUAL or HYBRID types."""
        assignment_type = data.get('assignment_type')
        manual_proctors = data.get('manual_proctors', [])
        
        if assignment_type == 'MANUAL' and not manual_proctors:
            raise serializers.ValidationError({
                'manual_proctors': 'Manual proctors must be provided for MANUAL assignment type'
            })
        
        return data


class CrossDepartmentRequestSerializer(serializers.Serializer):
    """Serializer for cross-department proctoring request."""
    department = serializers.CharField(required=True)
    ta_count = serializers.IntegerField(required=True, min_value=1)
    note = serializers.CharField(required=False, allow_blank=True)
    
    def validate_department(self, value):
        """Validate department code."""
        # This would validate against a list of valid department codes
        valid_departments = ['CS', 'EE', 'IE', 'ME', 'MATH']  # Example
        
        if value not in valid_departments:
            raise serializers.ValidationError(f"Invalid department code. Must be one of: {', '.join(valid_departments)}")
        
        return value