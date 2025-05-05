from django.contrib import admin
from .models import Exam, ExamRoom, ProctorAssignment, SwapRequest, ProctorConstraint
from accounts.models import User

# Register your models here.
@admin.register(Exam)
class ExamAdmin(admin.ModelAdmin):
    list_display = ('title', 'section', 'date', 'start_time', 'end_time', 'status', 'proctor_count_needed')
    list_filter = ('status', 'date', 'exam_type')
    search_fields = ('title', 'section__course__code', 'section__section_number')
    date_hierarchy = 'date'

@admin.register(ExamRoom)
class ExamRoomAdmin(admin.ModelAdmin):
    list_display = ('exam', 'classroom', 'student_count', 'proctor_count')
    list_filter = ('exam__date',)
    search_fields = ('exam__title', 'classroom__name')

@admin.register(ProctorAssignment)
class ProctorAssignmentAdmin(admin.ModelAdmin):
    list_display = ('exam', 'proctor', 'status', 'assigned_at', 'confirmation_date')
    list_filter = ('status', 'exam__date')
    search_fields = ('exam__title', 'proctor__email', 'proctor__full_name')
    date_hierarchy = 'assigned_at'

@admin.register(SwapRequest)
class SwapRequestAdmin(admin.ModelAdmin):
    list_display = ('get_request_type', 'requesting_proctor', 'requested_proctor', 'status', 'created_at')
    list_filter = ('status', 'is_auto_swap', 'force_swap', 'created_at')
    search_fields = ('requesting_proctor__email', 'requested_proctor__email', 'original_assignment__exam__title')
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('original_assignment', 'requesting_proctor', 'requested_proctor', 'reason', 'status')
        }),
        ('Staff Actions', {
            'fields': ('force_swap', 'force_swap_by', 'force_swap_reason'),
            'classes': ('collapse',),
            'description': 'Fields used when staff forces a swap'
        }),
        ('Swap Details', {
            'fields': ('is_auto_swap', 'is_cross_department', 'response_date', 'rejection_reason'),
            'classes': ('collapse',),
        }),
        ('Constraint Check', {
            'fields': ('constraint_check_passed', 'constraint_check_details'),
            'classes': ('collapse',),
        }),
    )
    
    def get_request_type(self, obj):
        """Display the type of swap request."""
        if obj.status == 'AVAILABLE':
            return 'Self-initiated (General)'
        elif obj.force_swap:
            return 'Staff Forced'
        elif obj.is_auto_swap and obj.requested_proctor:
            return 'Direct Swap'
        else:
            return 'Regular Swap'
    get_request_type.short_description = 'Request Type'
    
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        """Customize the form fields for better user experience in admin."""
        if db_field.name == 'requesting_proctor':
            kwargs['queryset'] = User.objects.filter(role='TA')
        if db_field.name == 'requested_proctor':
            kwargs['queryset'] = User.objects.filter(role='TA')
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

@admin.register(ProctorConstraint)
class ProctorConstraintAdmin(admin.ModelAdmin):
    list_display = ('ta', 'constraint_type', 'exam', 'constraint_date')
    list_filter = ('constraint_type', 'constraint_date')
    search_fields = ('ta__email', 'description')
