from rest_framework import serializers
from accounts.models import User, Exam, Course, Section
from .models import ProctorAssignment
from datetime import timedelta

class UserBasicSerializer(serializers.ModelSerializer):
    """Simplified serializer for User data in API responses."""
    full_name = serializers.CharField(read_only=True)
    
    class Meta:
        model = User
        fields = ('id', 'email', 'full_name', 'academic_level')

class CourseSerializer(serializers.ModelSerializer):
    """Serializer for Course model."""
    class Meta:
        model = Course
        fields = ('id', 'code', 'title')

class SectionSerializer(serializers.ModelSerializer):
    """Serializer for Section model."""
    course = CourseSerializer()
    
    class Meta:
        model = Section
        fields = ('id', 'course', 'section_number')

class ExamDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for Exam model used in ProctorAssignment."""
    section = serializers.SerializerMethodField()
    title = serializers.SerializerMethodField()
    date = serializers.SerializerMethodField(method_name='get_formatted_date')
    start_time = serializers.SerializerMethodField()
    end_time = serializers.SerializerMethodField()
    
    class Meta:
        model = Exam
        fields = ('id', 'title', 'date', 'start_time', 'end_time', 'section')

    def get_title(self, obj: Exam):
        if obj.course:
            return f"{obj.course.code} - {obj.get_type_display()}"
        return obj.get_type_display() or "Exam"

    def get_formatted_date(self, obj: Exam):
        if obj.date:
            return obj.date.strftime('%Y-%m-%d')
        return None

    def get_start_time(self, obj: Exam):
        if obj.date:
            return obj.date.strftime('%H:%M:%S')
        return None

    def get_end_time(self, obj: Exam):
        if obj.date and obj.duration is not None:
            end_datetime = obj.date + timedelta(minutes=obj.duration)
            return end_datetime.strftime('%H:%M:%S')
        return None

    def get_section(self, obj: Exam):
        course_obj = obj.course
        if course_obj:
            first_section_instance = None
            if hasattr(course_obj, 'sections') and course_obj.sections.exists():
                first_section_instance = course_obj.sections.first()
            elif hasattr(course_obj, 'section_set') and course_obj.section_set.exists():
                first_section_instance = course_obj.section_set.first()
            
            if first_section_instance:
                return SectionSerializer(first_section_instance).data
        
        return None

class ExamRoomSerializer(serializers.ModelSerializer):
    """Serializer for classroom/room information."""
    classroom_name = serializers.CharField(source='classroom.building')
    room_number = serializers.CharField(source='classroom.room_number')
    
    class Meta:
        model = Exam
        fields = ('classroom_name', 'room_number')

class ProctorAssignmentSerializer(serializers.ModelSerializer):
    """Serializer for ProctorAssignment model."""
    ta = UserBasicSerializer(read_only=True)
    assigned_by = UserBasicSerializer(read_only=True)
    exam = ExamDetailSerializer(read_only=True)
    exam_room = serializers.SerializerMethodField()
    swap_depth = serializers.SerializerMethodField()
    
    class Meta:
        model = ProctorAssignment
        fields = ('id', 'exam', 'ta', 'assigned_by', 'assigned_at', 'status', 'is_paid', 'exam_room', 'swap_depth')
    
    def get_exam_room(self, obj):
        if obj.exam.classroom:
            return {
                'classroom_name': obj.exam.classroom.building,
                'room_number': obj.exam.classroom.room_number
            }
        return None
    
    def get_swap_depth(self, obj):
        return 0

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
            'id', 'email', 'full_name', 'academic_level', 'employment_type',
            'is_eligible', 'details', 'current_workload',
            'is_assigned_to_current_exam', 'is_teaching_course_sections'
        )

    def get_is_eligible(self, obj):
        return True

    def get_is_assigned_to_current_exam(self, obj):
        exam = self.context.get('exam')
        currently_assigned_ta_ids = self.context.get('currently_assigned_ta_ids_for_this_exam', set())
        if not exam:
            return False
        return obj.id in currently_assigned_ta_ids

    def get_is_teaching_course_sections(self, obj):
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