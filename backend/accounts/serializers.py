from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import (
    User, Student, Department, Course, 
    Section, TAAssignment, Classroom, WeeklySchedule, InstructorTAAssignment, Exam,
    TAProfile, Notification
)
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from proctoring.models import ProctorAssignment
import logging

logger = logging.getLogger(__name__)


class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration.
    """
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        model = User
        fields = ('email', 'password', 'password_confirm', 'first_name', 'last_name', 
                  'role', 'phone', 'department', 'iban', 'academic_level', 'employment_type', 'bilkent_id')
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name': {'required': True},
            'role': {'required': True},
            'phone': {'required': True},
            'department': {'required': True},
            'bilkent_id': {'required': True},
            'iban': {'required': False},
            'academic_level': {'required': False},
            'employment_type': {'required': False},
        }
    
    def validate(self, attrs):
        # Validate that password and password_confirm match
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password_confirm": "Passwords don't match."})
        
        # Validate Bilkent email domain except for admins
        if not attrs['email'].endswith('bilkent.edu.tr') and attrs['role'] != 'ADMIN':
            raise serializers.ValidationError({"email": "Email must be a valid Bilkent University email address."})
        
        # Validate department is either CS or IE
        if attrs['department'] not in ['CS', 'IE']:
            raise serializers.ValidationError({"department": "Department must be either CS or IE."})
        
        # Validate academic_level for TAs
        if attrs['role'] == 'TA' and attrs.get('academic_level') == 'NOT_APPLICABLE':
            raise serializers.ValidationError({"academic_level": "Teaching Assistants must specify their academic level."})
        
        # Validate employment_type for TAs
        if attrs['role'] == 'TA' and ('employment_type' not in attrs or attrs.get('employment_type') == 'NOT_APPLICABLE'):
            raise serializers.ValidationError({"employment_type": "Teaching Assistants must specify their employment type (Full-Time or Part-Time)."})
        
        return attrs
    
    def create(self, validated_data):
        # Remove the password_confirm field from validated_data
        validated_data.pop('password_confirm')
        
        # Get the user-selected password
        password = validated_data.pop('password')
        
        # Create the user with create_user method
        user = User.objects.create_user(
            email=validated_data['email'],
            password=password,  # Use the user-selected password
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            role=validated_data['role'],
            phone=validated_data['phone'],
            department=validated_data['department'],
            bilkent_id=validated_data['bilkent_id'],
            iban=validated_data.get('iban', ''),
            academic_level=validated_data.get('academic_level', User.AcademicLevel.NOT_APPLICABLE),
            employment_type=validated_data.get('employment_type', User.EmploymentType.NOT_APPLICABLE),
            is_active=True,
            is_approved=False,  # Require staff approval
            email_verified=False,  # Require email verification
            temp_password=None,
            temp_password_expiry=None,
        )
        
        return user


class ChangePasswordSerializer(serializers.Serializer):
    """
    Serializer for password change.
    """
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(required=True)
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({"new_password_confirm": "New passwords don't match."})
        return attrs


class UserProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for user profile data.
    """
    full_name = serializers.CharField(read_only=True)
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    academic_level_display = serializers.CharField(source='get_academic_level_display', read_only=True)
    employment_type_display = serializers.CharField(source='get_employment_type_display', read_only=True)
    
    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'full_name', 'role', 'role_display',
                  'phone', 'iban', 'academic_level', 'academic_level_display', 'employment_type',
                  'employment_type_display', 'is_approved', 'email_verified', 'date_joined', 'last_login', 'bilkent_id')
        read_only_fields = ('id', 'email', 'role', 'is_approved', 'email_verified', 
                            'date_joined', 'last_login')


class UserUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating user profile data.
    """
    class Meta:
        model = User
        fields = ('first_name', 'last_name', 'phone', 'iban', 'academic_level', 'employment_type')


class UserListSerializer(serializers.ModelSerializer):
    """
    Serializer for user list view (used by staff).
    """
    full_name = serializers.CharField(read_only=True)
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    
    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'full_name', 'role', 'role_display',
                  'is_approved', 'email_verified', 'date_joined', 'bilkent_id')


class UserDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for detailed user view (used by staff).
    """
    full_name = serializers.CharField(read_only=True)
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    academic_level_display = serializers.CharField(source='get_academic_level_display', read_only=True)
    employment_type_display = serializers.CharField(source='get_employment_type_display', read_only=True)
    
    class Meta:
        model = User
        fields = ('id', 'email', 'username', 'first_name', 'last_name', 'full_name', 
                  'role', 'role_display', 'phone', 'iban', 'academic_level', 
                  'academic_level_display', 'employment_type', 'employment_type_display', 
                  'is_approved', 'email_verified', 'is_active', 'is_staff', 'date_joined', 'last_login', 'bilkent_id')
        read_only_fields = ('id', 'email', 'username', 'date_joined', 'last_login')


class WeeklyScheduleSerializer(serializers.ModelSerializer):
    """
    Serializer for weekly schedule entries representing TA class hours.
    """
    day_display = serializers.CharField(source='get_day_display', read_only=True)
    
    class Meta:
        model = WeeklySchedule
        fields = ('id', 'day', 'day_display', 'start_time', 'end_time', 'description')
        extra_kwargs = {
            'description': {'help_text': 'Course name or other details about this class hour'},
        }
        
    def validate(self, attrs):
        # Validate that start_time is before end_time
        if attrs.get('start_time') and attrs.get('end_time') and attrs['start_time'] >= attrs['end_time']:
            raise serializers.ValidationError({"end_time": "End time must be after start time."})
        
        # Check for overlapping schedules on the same day
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            day = attrs.get('day')
            start_time = attrs.get('start_time')
            end_time = attrs.get('end_time')
            
            # Get existing schedules for this TA on the same day
            from .models import WeeklySchedule
            existing_schedules = WeeklySchedule.objects.filter(
                ta=request.user,
                day=day
            )
            
            # If updating, exclude the current instance
            instance = getattr(self, 'instance', None)
            if instance:
                existing_schedules = existing_schedules.exclude(pk=instance.pk)
            
            # Check for any overlapping time slots
            for schedule in existing_schedules:
                # Check if the new time slot overlaps with any existing slot
                if (
                    (start_time <= schedule.start_time and end_time > schedule.start_time) or  # New slot starts before and ends during/after existing slot
                    (start_time >= schedule.start_time and start_time < schedule.end_time) or  # New slot starts during existing slot
                    (start_time <= schedule.start_time and end_time >= schedule.end_time)  # New slot completely covers existing slot
                ):
                    raise serializers.ValidationError({
                        "non_field_errors": [
                            f"This time slot overlaps with an existing schedule on {schedule.get_day_display()} from {schedule.start_time} to {schedule.end_time}."
                        ]
                    })
        
        return attrs


class StudentSerializer(serializers.ModelSerializer):
    """
    Serializer for student data.
    """
    user = UserListSerializer(read_only=True)
    
    class Meta:
        model = Student
        fields = ('id', 'user', 'student_id', 'department', 'is_ta')


class DepartmentSerializer(serializers.ModelSerializer):
    """
    Serializer for department data.
    """
    class Meta:
        model = Department
        fields = ('id', 'name', 'code', 'faculty')


class CourseSerializer(serializers.ModelSerializer):
    """
    Serializer for course data.
    """
    department = DepartmentSerializer(read_only=True)
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(),
        source='department',
        write_only=True
    )
    level_display = serializers.CharField(source='get_level_display', read_only=True)
    
    class Meta:
        model = Course
        fields = ('id', 'department', 'department_id', 'code', 'title', 'credit', 'level', 'level_display')


class InstructorSerializer(serializers.ModelSerializer):
    """
    Serializer for displaying instructor information.
    """
    full_name = serializers.CharField(read_only=True)
    
    class Meta:
        model = User
        fields = ('id', 'email', 'full_name')


class SectionSerializer(serializers.ModelSerializer):
    """
    Serializer for section data.
    """
    course = CourseSerializer(read_only=True)
    course_id = serializers.PrimaryKeyRelatedField(
        queryset=Course.objects.all(),
        source='course',
        write_only=True
    )
    instructor = InstructorSerializer(read_only=True)
    instructor_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role='INSTRUCTOR'),
        source='instructor',
        write_only=True,
        required=False
    )
    
    class Meta:
        model = Section
        fields = ('id', 'course', 'course_id', 'section_number', 'instructor', 'instructor_id', 'student_count')


class TASerializer(serializers.ModelSerializer):
    """
    Serializer for displaying TA information.
    """
    full_name = serializers.CharField(read_only=True)
    academic_level_display = serializers.CharField(source='get_academic_level_display', read_only=True)
    
    class Meta:
        model = User
        fields = ('id', 'email', 'full_name', 'academic_level', 'academic_level_display')


class TAAssignmentSerializer(serializers.ModelSerializer):
    """
    Serializer for TA assignment data.
    """
    ta = TASerializer(read_only=True)
    ta_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role='TA'),
        source='ta',
        write_only=True
    )
    section = SectionSerializer(read_only=True)
    section_id = serializers.PrimaryKeyRelatedField(
        queryset=Section.objects.all(),
        source='section',
        write_only=True
    )
    
    class Meta:
        model = TAAssignment
        fields = ('id', 'ta', 'ta_id', 'section', 'section_id', 'assigned_date')
        read_only_fields = ('assigned_date',)

    def validate(self, data):
        """
        Check that the TA and the Section's course are from the same department.
        """
        ta = data.get('ta') # This will be a User instance because source='ta'
        section = data.get('section') # This will be a Section instance

        # The ta and section fields are populated from ta_id and section_id respectively
        # during the PrimaryKeyRelatedField's to_internal_value method.
        # So, by the time validate() is called, 'ta' and 'section' should be model instances.

        if not ta:
            # This case should ideally be caught by 'ta_id' being required,
            # but as a safeguard if ta_id was valid but user fetching failed.
            raise serializers.ValidationError({"ta_id": "TA not found."})

        if not section:
            # Similar safeguard for section.
            raise serializers.ValidationError({"section_id": "Section not found."})

        # User.department is a CharField (e.g., 'CS', 'IE')
        # Section.course.department is a ForeignKey to Department model, which has a 'code' attribute.
        if ta.department != section.course.department.code:
            raise serializers.ValidationError(
                {"non_field_errors": f"TA ({ta.email}, Dept: {ta.department}) and Course ({section.course.code}, Dept: {section.course.department.code}) must be in the same department."}
            )
        
        # Check for existing assignment to prevent duplicates (already handled by unique_together in model)
        # However, explicit check here can give a friendlier message if needed,
        # but usually not necessary if unique_together is set.
        # if TAAssignment.objects.filter(ta=ta, section=section).exists():
        #     # If instance is present, we are updating, so allow same ta-section
        #     if not self.instance or (self.instance.ta != ta or self.instance.section != section) :
        #         raise serializers.ValidationError(
        #             {"non_field_errors": "This TA is already assigned to this section."}
        #         )

        return data


class ClassroomSerializer(serializers.ModelSerializer):
    """
    Serializer for classroom data.
    """
    class Meta:
        model = Classroom
        fields = ('id', 'building', 'room_number', 'capacity')


class ExamSerializer(serializers.ModelSerializer):
    """
    Serializer for exam data.
    """
    course = CourseSerializer(read_only=True)
    course_id = serializers.PrimaryKeyRelatedField(
        queryset=Course.objects.all(),
        source='course',
        write_only=True
    )
    classroom = ClassroomSerializer(read_only=True, allow_null=True)
    classroom_id = serializers.PrimaryKeyRelatedField(
        queryset=Classroom.objects.all(),
        source='classroom',
        write_only=True,
        required=False,
        allow_null=True,
        many=False
    )
    created_by_name = serializers.SerializerMethodField()
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    status = serializers.CharField(required=False, allow_null=True)
    status_display = serializers.CharField(read_only=True, required=False, allow_null=True)
    student_list_file = serializers.FileField(required=False, allow_null=True)
    has_student_list = serializers.BooleanField(read_only=True)
    assigned_proctor_count = serializers.SerializerMethodField()
    assisting_departments = DepartmentSerializer(many=True, read_only=True)
    cross_approved_department_codes = serializers.ListField(
        child=serializers.CharField(max_length=10),
        write_only=True,
        required=False
    )
    
    class Meta:
        model = Exam
        fields = (
            'id', 'course', 'course_id', 'type', 'type_display', 
            'date', 'duration', 'classroom', 'classroom_id', 'proctor_count',
            'created_by', 'created_by_name', 'created_at', 'updated_at',
            'status', 'status_display', 'student_count', 'student_list_file',
            'has_student_list', 'assigned_proctor_count', 'assisting_departments',
            'cross_approved_department_codes'
        )
        read_only_fields = ('created_by', 'created_at', 'updated_at', 'has_student_list', 'status_display', 'type_display', 'assigned_proctor_count', 'assisting_departments')
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}"
        return None
    
    def get_assigned_proctor_count(self, obj):
        """Returns the count of currently ASSIGNED proctors for this exam."""
        return ProctorAssignment.objects.filter(exam=obj, status=ProctorAssignment.Status.ASSIGNED).count()
    
    def create(self, validated_data):
        # Set the created_by field from the request user
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
            
        # Handle student list file
        student_list_file = validated_data.get('student_list_file')
        if student_list_file:
            validated_data['has_student_list'] = True
            # Student count will be calculated in a view or signal
            
        return super().create(validated_data)
        
    def update(self, instance, validated_data):
        # Handle student list file
        student_list_file = validated_data.get('student_list_file')
        if student_list_file:
            validated_data['has_student_list'] = True
            # Student count will be calculated in a view or signal
            
        # Handle assisting departments
        cross_approved_codes = validated_data.pop('cross_approved_department_codes', None)

        # Call super().update() first to save other fields
        instance = super().update(instance, validated_data)

        if cross_approved_codes is not None: # Allow empty list to clear selection
            departments = []
            for code in cross_approved_codes:
                try:
                    department = Department.objects.get(code=code)
                    departments.append(department)
                except Department.DoesNotExist:
                    # Optionally, raise an error or log if a department code is invalid
                    # For now, we'll just skip invalid codes
                    logger.warning(f"Department with code '{code}' not found while updating exam {instance.id}")
                    pass # Or raise serializers.ValidationError(f"Department with code '{code}' not found.")
            instance.assisting_departments.set(departments)
            
        return instance


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom token serializer that adds user role and other information to the token payload.
    """
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Add custom claims
        token['role'] = user.role
        token['first_name'] = user.first_name
        token['last_name'] = user.last_name
        token['email'] = user.email
        token['is_approved'] = user.is_approved
        token['email_verified'] = user.email_verified
        token['department'] = user.department  # Add department info to token

        return token


class AdminCreateStaffSerializer(serializers.ModelSerializer):
    """
    Serializer for administrators to create staff users directly.
    """
    password = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        model = User
        fields = ('email', 'password', 'first_name', 'last_name', 
                  'phone', 'department', 'iban')
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name': {'required': True},
            'phone': {'required': True},
            'department': {'required': True},
            'iban': {'required': False},
        }
    
    def validate(self, attrs):
        # Validate Bilkent email domain
        if not attrs['email'].endswith('bilkent.edu.tr'):
            raise serializers.ValidationError({"email": "Staff email must be a valid Bilkent University email address."})
        
        # Validate department is either CS or IE
        if attrs['department'] not in ['CS', 'IE']:
            raise serializers.ValidationError({"department": "Department must be either CS or IE."})
        
        return attrs
    
    def create(self, validated_data):
        # Create the user with create_user method with staff role
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            role='STAFF',  # Set role to STAFF
            phone=validated_data['phone'],
            department=validated_data['department'],
            iban=validated_data.get('iban', ''),
            is_active=True,
            is_approved=True,  # Auto-approve staff
            email_verified=True,  # Auto-verify staff
        )
        
        return user 


class InstructorTAAssignmentSerializer(serializers.ModelSerializer):
    """Serializer for the InstructorTAAssignment model."""
    
    instructor_name = serializers.SerializerMethodField()
    ta_name = serializers.SerializerMethodField()
    department_name = serializers.SerializerMethodField()
    ta_email = serializers.SerializerMethodField()
    ta_academic_level = serializers.SerializerMethodField()
    ta_employment_type = serializers.SerializerMethodField()
    
    class Meta:
        model = InstructorTAAssignment
        fields = ('id', 'instructor', 'ta', 'assigned_at', 'department',
                  'instructor_name', 'ta_name', 'department_name',
                  'ta_email', 'ta_academic_level', 'ta_employment_type')
        read_only_fields = ('assigned_at',)
    
    def get_instructor_name(self, obj):
        return obj.instructor.full_name if obj.instructor else None
    
    def get_ta_name(self, obj):
        return obj.ta.full_name if obj.ta else None
    
    def get_department_name(self, obj):
        return obj.department.name if obj.department else None
        
    def get_ta_email(self, obj):
        return obj.ta.email if obj.ta else None
        
    def get_ta_academic_level(self, obj):
        return obj.ta.academic_level if obj.ta else None
        
    def get_ta_employment_type(self, obj):
        return obj.ta.employment_type if obj.ta else None
    
    def validate(self, data):
        # Ensure the instructor is actually an instructor
        if data.get('instructor') and data['instructor'].role != 'INSTRUCTOR':
            raise serializers.ValidationError({"instructor": "Selected user is not an instructor"})
        
        # Ensure the TA is actually a TA
        if data.get('ta') and data['ta'].role != 'TA':
            raise serializers.ValidationError({"ta": "Selected user is not a TA"})
        
        # Check that the TA and instructor are from the same department
        instructor = data.get('instructor')
        ta = data.get('ta')
        
        if instructor and ta and instructor.department != ta.department:
            raise serializers.ValidationError({
                "non_field_errors": "Instructor and TA must be from the same department"
            })

        # Check if the TA is already assigned to another instructor
        if ta:
            existing_assignments = InstructorTAAssignment.objects.filter(ta=ta)
            if existing_assignments.exists() and not existing_assignments.filter(instructor=instructor).exists():
                raise serializers.ValidationError({
                    "non_field_errors": "This TA is already assigned to another instructor"
                })
        
        # Check for existing assignment to prevent duplicates
        if InstructorTAAssignment.objects.filter(
            instructor=data.get('instructor'),
            ta=data.get('ta')
        ).exists():
            raise serializers.ValidationError(
                {"non_field_errors": "This TA is already assigned to this instructor"}
            )
        
        return data


class TADetailSerializer(serializers.ModelSerializer):
    """
    Enhanced serializer for TA details including profile information.
    """
    full_name = serializers.CharField(read_only=True)
    department_name = serializers.SerializerMethodField()
    academic_level_display = serializers.CharField(source='get_academic_level_display', read_only=True)
    employment_type_display = serializers.CharField(source='get_employment_type_display', read_only=True)
    profile = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = (
            'id', 'email', 'first_name', 'last_name', 'full_name', 
            'department', 'department_name', 'academic_level', 'academic_level_display',
            'employment_type', 'employment_type_display', 'profile'
        )
    
    def get_department_name(self, obj):
        if obj.department:
            try:
                dept = Department.objects.get(code=obj.department)
                return dept.name
            except Department.DoesNotExist:
                return None
        return None
    
    def get_profile(self, obj):
        try:
            profile = TAProfile.objects.get(user=obj)
            return {
                'undergrad_university': profile.undergrad_university,
                'supervisor': profile.supervisor.id if profile.supervisor else None,
                'supervisor_name': profile.supervisor.full_name if profile.supervisor else None,
                'workload_number': profile.workload_number,
                'workload_credits': profile.workload_credits
            }
        except TAProfile.DoesNotExist:
            return None


class TAProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for TA profile data.
    """
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    full_name = serializers.CharField(source='user.full_name', read_only=True)
    department = serializers.CharField(source='user.department', read_only=True)
    academic_level = serializers.CharField(source='user.academic_level', read_only=True)
    academic_level_display = serializers.CharField(source='user.get_academic_level_display', read_only=True)
    employment_type = serializers.CharField(source='user.employment_type', read_only=True)
    employment_type_display = serializers.CharField(source='user.get_employment_type_display', read_only=True)
    enrolled_courses_details = CourseSerializer(source='enrolled_courses', many=True, read_only=True)
    supervisor_email = serializers.EmailField(source='supervisor.email', allow_null=True, read_only=True)
    
    class Meta:
        model = TAProfile
        fields = (
            'id', 'user_id', 'email', 'first_name', 'last_name', 'full_name',
            'department', 'academic_level', 'academic_level_display',
            'employment_type', 'employment_type_display',
            'undergrad_university', 'supervisor', 'workload_number', 'workload_credits', 'schedule_json',
            'enrolled_courses_details', 'supervisor_email'
        )
        read_only_fields = ('id', 'user_id', 'workload_number')

    def update(self, instance, validated_data):
        # Workload number is immutable once set
        if instance.workload_number is not None and 'workload_number' in validated_data:
            validated_data.pop('workload_number')
        return super().update(instance, validated_data)


class NotificationSerializer(serializers.ModelSerializer):
    """
    Serializer for the Notification model.
    """
    user_email = serializers.EmailField(source='user.email', read_only=True)
    # To display exam details more meaningfully, you could use a nested serializer
    # or add more source fields from the related_exam.
    related_exam_info = serializers.StringRelatedField(source='related_exam', read_only=True)

    class Meta:
        model = Notification
        fields = [
            'id',
            'user',
            'user_email',
            'message',
            'notification_type',
            'created_at',
            'is_read',
            'read_at',
            'related_exam',
            'related_exam_info',
            'link'
        ]
        read_only_fields = ('id', 'user', 'user_email', 'created_at', 'read_at', 'related_exam_info')

    # If you need to allow creating notifications via this serializer (e.g., for admin purposes),
    # you might need to adjust read_only_fields and handle user assignment.
    # For now, it's primarily for displaying notifications. 