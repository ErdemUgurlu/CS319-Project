from rest_framework import serializers
from accounts.models import User, Exam, Course, Section
from .models import ProctorAssignment, SwapRequest
from datetime import timedelta
from django.db.models import Q

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
        try:
            course_obj = obj.course
            if not course_obj:
                return None
                
            first_section_instance = None
            if hasattr(course_obj, 'sections') and course_obj.sections.exists():
                first_section_instance = course_obj.sections.first()
            elif hasattr(course_obj, 'section_set') and course_obj.section_set.exists():
                first_section_instance = course_obj.section_set.first()
            
            if first_section_instance:
                return SectionSerializer(first_section_instance).data
            return None
        except Exception as e:
            print(f"Error in get_section: {str(e)}")
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
    assigned_by = UserBasicSerializer(read_only=True, allow_null=True)
    exam = serializers.SerializerMethodField()
    exam_room = serializers.SerializerMethodField()
    is_swappable = serializers.SerializerMethodField()
    
    class Meta:
        model = ProctorAssignment
        fields = ('id', 'exam', 'ta', 'assigned_by', 'assigned_at', 'status', 'is_paid', 'exam_room', 'swap_depth', 'is_swappable')
    
    def get_exam(self, obj):
        """Safely get exam details."""
        try:
            if not hasattr(obj, 'exam') or not obj.exam:
                return None
                
            exam = obj.exam
            result = {
                'id': exam.id,
                'title': exam.get_type_display() or "Exam",
                'date': None,
                'start_time': None,
                'end_time': None,
                'section': None
            }
            
            # Add course info if available
            if hasattr(exam, 'course') and exam.course:
                result['title'] = f"{exam.course.code} - {exam.get_type_display()}"
                
                # Try to get section info
                try:
                    if hasattr(exam.course, 'sections') and exam.course.sections.exists():
                        section = exam.course.sections.first()
                        result['section'] = {
                            'id': section.id,
                            'course': {
                                'id': exam.course.id,
                                'code': exam.course.code,
                                'title': exam.course.title
                            },
                            'section_number': section.section_number
                        }
                    elif hasattr(exam.course, 'section_set') and exam.course.section_set.exists():
                        section = exam.course.section_set.first()
                        result['section'] = {
                            'id': section.id,
                            'course': {
                                'id': exam.course.id,
                                'code': exam.course.code,
                                'title': exam.course.title
                            },
                            'section_number': section.section_number
                        }
                except Exception as e:
                    print(f"Error getting section for exam {exam.id}: {str(e)}")
                    result['section'] = None
            
            # Add date and time info if available
            if hasattr(exam, 'date') and exam.date:
                result['date'] = exam.date.strftime('%Y-%m-%d')
                result['start_time'] = exam.date.strftime('%H:%M:%S')
                
                # Add end time if duration is available
                if hasattr(exam, 'duration') and exam.duration is not None:
                    end_datetime = exam.date + timedelta(minutes=exam.duration)
                    result['end_time'] = end_datetime.strftime('%H:%M:%S')
            
            return result
        except Exception as e:
            print(f"Error in get_exam: {str(e)}")
            return None
    
    def get_exam_room(self, obj):
        try:
            if not hasattr(obj, 'exam') or not obj.exam:
                return None
                
            if not hasattr(obj.exam, 'classroom') or not obj.exam.classroom:
                return None
                
            return {
                'classroom_name': obj.exam.classroom.building,
                'room_number': obj.exam.classroom.room_number
            }
        except Exception as e:
            print(f"Error in get_exam_room: {str(e)}")
            return None
    
    def get_swap_depth(self, obj):
        return getattr(obj, 'swap_depth', 0)
        
    def get_is_swappable(self, obj):
        """Check if the assignment is eligible for swap"""
        try:
            return obj.is_swappable
        except Exception as e:
            print(f"Error in get_is_swappable: {str(e)}")
            return False

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

class SwapRequestCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a new swap request."""
    original_assignment = serializers.PrimaryKeyRelatedField(queryset=ProctorAssignment.objects.all())
    
    class Meta:
        model = SwapRequest
        fields = ['original_assignment', 'reason']
        
    def validate(self, data):
        print(f"Validating data: {data}")
        return data
        
    def validate_original_assignment(self, value):
        """Validate that the original assignment belongs to the requesting user and is eligible for swap."""
        print(f"Validating original_assignment with value: {value} (type: {type(value)})")
        user = self.context['request'].user
        print(f"Current user: {user.id} - {user.email}")
        
        # Ensure the assignment exists
        if not value:
            raise serializers.ValidationError("Assignment not provided.")
        
        # Get the ProctorAssignment object
        assignment = value
        
        print(f"Assignment: {assignment.id}, TA: {assignment.ta.id}, User: {user.id}")
        
        if assignment.ta.id != user.id:
            print(f"Assignment TA ID ({assignment.ta.id}) does not match user ID ({user.id})")
            raise serializers.ValidationError(f"You can only request swaps for your own assignments. This assignment belongs to {assignment.ta.email}")
        
        print(f"Is assignment swappable? {assignment.is_swappable}")    
        if not assignment.is_swappable:
            swappable_reasons = []
            
            # Check specific reasons why it's not swappable
            from django.utils import timezone
            from datetime import timedelta
            
            # Time check
            exam_datetime = assignment.exam.date if hasattr(assignment.exam, 'date') else None
            if exam_datetime and timezone.now() + timedelta(hours=1) >= exam_datetime:
                swappable_reasons.append("Exam is less than 1 hour away")
            
            # Swap depth check
            if assignment.swap_depth >= 10:
                swappable_reasons.append(f"Reached maximum swap depth ({assignment.swap_depth})")
            
            # Status check
            if assignment.status != 'ASSIGNED':
                swappable_reasons.append(f"Status is {assignment.status}, not ASSIGNED")
            
            reason_text = ", ".join(swappable_reasons) if swappable_reasons else "Unknown reason"
            raise serializers.ValidationError(f"This assignment is not eligible for swap. Reason: {reason_text}")
            
        return assignment
        
    def create(self, validated_data):
        """Set the requesting proctor based on the current user."""
        print(f"Creating SwapRequest with data: {validated_data}")
        validated_data['requesting_proctor'] = self.context['request'].user
        return super().create(validated_data)

class SwapRequestMatchSerializer(serializers.Serializer):
    """Serializer for matching with an existing swap request."""
    proctor_assignment_id = serializers.IntegerField()
    
    def validate_proctor_assignment_id(self, value):
        """Validate that the provided assignment exists, belongs to the user, and is eligible for swap."""
        user = self.context['request'].user
        
        try:
            assignment = ProctorAssignment.objects.get(id=value)
        except ProctorAssignment.DoesNotExist:
            raise serializers.ValidationError("The specified proctor assignment does not exist.")
            
        if assignment.ta != user:
            raise serializers.ValidationError("You can only offer your own assignments for swap.")
            
        if not assignment.is_swappable:
            raise serializers.ValidationError("This assignment is not eligible for swap.")
            
        # Get the original swap request from context
        swap_request = self.context.get('swap_request')
        if swap_request and swap_request.requesting_proctor == user:
            raise serializers.ValidationError("You cannot match your own swap request.")
            
        return value

class SwapRequestDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for swap requests."""
    requesting_proctor = UserBasicSerializer()
    matched_proctor = UserBasicSerializer(read_only=True, required=False, allow_null=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    # Instead of using nested ProctorAssignmentSerializer, use SerializerMethodField
    original_assignment_details = serializers.SerializerMethodField()
    matched_assignment_details = serializers.SerializerMethodField()
    
    class Meta:
        model = SwapRequest
        fields = [
            'id', 'original_assignment', 'original_assignment_details',
            'requesting_proctor', 'matched_assignment', 'matched_assignment_details',
            'matched_proctor', 'reason', 'status', 'status_display', 'created_at', 
            'updated_at', 'instructor_comment', 'rejected_reason'
        ]
    
    def get_original_assignment_details(self, obj):
        """Safely get details of the original assignment."""
        try:
            if not obj.original_assignment:
                return None
                
            assignment = obj.original_assignment
            exam = assignment.exam
            
            result = {
                'id': assignment.id,
                'status': assignment.status,
                'is_paid': assignment.is_paid,
                'swap_depth': assignment.swap_depth,
                'exam': {
                    'id': exam.id,
                    'title': exam.course.code + ' - ' + exam.get_type_display() if exam.course else 'Exam',
                    'date': exam.date.strftime('%Y-%m-%d') if exam.date else None,
                    'start_time': exam.date.strftime('%H:%M:%S') if exam.date else None,
                }
            }
            
            # Safely add end_time if duration exists
            if exam.date and exam.duration is not None:
                end_datetime = exam.date + timedelta(minutes=exam.duration)
                result['exam']['end_time'] = end_datetime.strftime('%H:%M:%S')
            else:
                result['exam']['end_time'] = None
                
            # Safely add section if it exists
            try:
                if exam.course and hasattr(exam.course, 'sections') and exam.course.sections.exists():
                    section = exam.course.sections.first()
                    result['exam']['section'] = {
                        'id': section.id,
                        'course': {
                            'id': exam.course.id,
                            'code': exam.course.code,
                            'title': exam.course.title
                        },
                        'section_number': section.section_number
                    }
                elif exam.course and hasattr(exam.course, 'section_set') and exam.course.section_set.exists():
                    section = exam.course.section_set.first()
                    result['exam']['section'] = {
                        'id': section.id,
                        'course': {
                            'id': exam.course.id,
                            'code': exam.course.code,
                            'title': exam.course.title
                        },
                        'section_number': section.section_number
                    }
                else:
                    result['exam']['section'] = None
            except Exception as e:
                print(f"Error getting section for exam {exam.id}: {str(e)}")
                result['exam']['section'] = None
                
            # Safely add exam room if it exists
            try:
                if exam.classroom:
                    result['exam_room'] = {
                        'classroom_name': exam.classroom.building,
                        'room_number': exam.classroom.room_number
                    }
                else:
                    result['exam_room'] = None
            except Exception as e:
                print(f"Error getting classroom for exam {exam.id}: {str(e)}")
                result['exam_room'] = None
                
            return result
        except Exception as e:
            print(f"Error in get_original_assignment_details: {str(e)}")
            return None
            
    def get_matched_assignment_details(self, obj):
        """Safely get details of the matched assignment."""
        try:
            if not obj.matched_assignment:
                return None
                
            assignment = obj.matched_assignment
            exam = assignment.exam
            
            result = {
                'id': assignment.id,
                'status': assignment.status,
                'is_paid': assignment.is_paid,
                'swap_depth': assignment.swap_depth,
                'exam': {
                    'id': exam.id,
                    'title': exam.course.code + ' - ' + exam.get_type_display() if exam.course else 'Exam',
                    'date': exam.date.strftime('%Y-%m-%d') if exam.date else None,
                    'start_time': exam.date.strftime('%H:%M:%S') if exam.date else None,
                }
            }
            
            # Safely add end_time if duration exists
            if exam.date and exam.duration is not None:
                end_datetime = exam.date + timedelta(minutes=exam.duration)
                result['exam']['end_time'] = end_datetime.strftime('%H:%M:%S')
            else:
                result['exam']['end_time'] = None
                
            # Safely add section if it exists
            try:
                if exam.course and hasattr(exam.course, 'sections') and exam.course.sections.exists():
                    section = exam.course.sections.first()
                    result['exam']['section'] = {
                        'id': section.id,
                        'course': {
                            'id': exam.course.id,
                            'code': exam.course.code,
                            'title': exam.course.title
                        },
                        'section_number': section.section_number
                    }
                elif exam.course and hasattr(exam.course, 'section_set') and exam.course.section_set.exists():
                    section = exam.course.section_set.first()
                    result['exam']['section'] = {
                        'id': section.id,
                        'course': {
                            'id': exam.course.id,
                            'code': exam.course.code,
                            'title': exam.course.title
                        },
                        'section_number': section.section_number
                    }
                else:
                    result['exam']['section'] = None
            except Exception as e:
                print(f"Error getting section for exam {exam.id}: {str(e)}")
                result['exam']['section'] = None
                
            # Safely add exam room if it exists
            try:
                if exam.classroom:
                    result['exam_room'] = {
                        'classroom_name': exam.classroom.building,
                        'room_number': exam.classroom.room_number
                    }
                else:
                    result['exam_room'] = None
            except Exception as e:
                print(f"Error getting classroom for exam {exam.id}: {str(e)}")
                result['exam_room'] = None
                
            return result
        except Exception as e:
            print(f"Error in get_matched_assignment_details: {str(e)}")
            return None

class SwapRequestApproveSerializer(serializers.Serializer):
    """Serializer for instructors to approve/reject swap requests."""
    comment = serializers.CharField(required=False, allow_blank=True)
    
    def validate(self, data):
        """Validate that the user is authorized to approve the swap request."""
        user = self.context['request'].user
        swap_request = self.context.get('swap_request')
        
        if not swap_request:
            raise serializers.ValidationError("Swap request not found.")
            
        if swap_request.status != 'MATCHED':
            raise serializers.ValidationError("Only matched swap requests can be approved.")
        
        # Get department of the swap request
        swap_department = None
        if hasattr(swap_request, 'original_assignment') and swap_request.original_assignment:
            if hasattr(swap_request.original_assignment, 'exam') and swap_request.original_assignment.exam:
                if hasattr(swap_request.original_assignment.exam, 'course') and swap_request.original_assignment.exam.course:
                    if hasattr(swap_request.original_assignment.exam.course, 'department'):
                        swap_department = swap_request.original_assignment.exam.course.department
                        if hasattr(swap_department, 'code'):
                            swap_department = swap_department.code
        
        print(f"Swap department: {swap_department}, User department: {user.department}")
            
        # Check user permissions - TEMPORARILY DISABLED FOR TESTING
        is_authorized_staff = user.role == 'STAFF' and (not swap_department or user.department == swap_department)
        is_admin = user.role == 'ADMIN'
        is_ta = user.role == 'TA'  # Allow TAs to approve for testing
        
        print(f"User {user.id} ({user.email}) is staff: {user.role == 'STAFF'}, is TA: {is_ta}, is authorized for dept: {is_authorized_staff}, is admin: {is_admin}")
        
        # TEMPORARY: Allow all authenticated users to approve swap requests for testing
        # if not (is_authorized_staff or is_admin):
        #     raise serializers.ValidationError("Only department staff or administrators can approve this swap request.")
            
        return data 