from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import (
    User, Student, Department, Course, 
    Section, TAAssignment, Classroom, WeeklySchedule, InstructorTAAssignment
)
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView


class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration.
    """
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        model = User
        fields = ('email', 'password', 'password_confirm', 'first_name', 'last_name', 
                  'role', 'phone', 'department', 'iban', 'academic_level', 'employment_type')
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name': {'required': True},
            'role': {'required': True},
            'phone': {'required': True},
            'department': {'required': True},
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
                  'employment_type_display', 'is_approved', 'email_verified', 'date_joined', 'last_login')
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
                  'is_approved', 'email_verified', 'date_joined')


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
                  'is_approved', 'email_verified', 'is_active', 'is_staff', 'date_joined', 'last_login')
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
    
    class Meta:
        model = Course
        fields = ('id', 'department', 'department_id', 'code', 'title', 'credit')


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
        fields = ('id', 'course', 'course_id', 'section_number', 'semester', 'year', 'instructor', 'instructor_id')


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


class ClassroomSerializer(serializers.ModelSerializer):
    """
    Serializer for classroom data.
    """
    class Meta:
        model = Classroom
        fields = ('id', 'building', 'room_number', 'capacity')


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
    
    class Meta:
        model = InstructorTAAssignment
        fields = ('id', 'instructor', 'ta', 'assigned_at', 'department',
                  'instructor_name', 'ta_name', 'department_name')
        read_only_fields = ('assigned_at',)
    
    def get_instructor_name(self, obj):
        return obj.instructor.full_name if obj.instructor else None
    
    def get_ta_name(self, obj):
        return obj.ta.full_name if obj.ta else None
    
    def get_department_name(self, obj):
        return obj.department.name if obj.department else None
    
    def validate(self, data):
        # Ensure the instructor is actually an instructor
        if data.get('instructor') and data['instructor'].role != 'INSTRUCTOR':
            raise serializers.ValidationError({"instructor": "Selected user is not an instructor"})
        
        # Ensure the TA is actually a TA
        if data.get('ta') and data['ta'].role != 'TA':
            raise serializers.ValidationError({"ta": "Selected user is not a TA"})
        
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
    full_name = serializers.CharField(read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    
    class Meta:
        model = User
        fields = ('id', 'email', 'full_name', 'department', 'department_name', 'academic_level', 'employment_type') 