from django.contrib import admin
from .models import WorkloadPolicy, TAWorkload, WorkloadActivity


class WorkloadActivityInline(admin.TabularInline):
    model = WorkloadActivity
    extra = 1
    fields = ('activity_type', 'description', 'hours', 'weighted_hours', 
              'is_recurring', 'recurrence_pattern', 'start_date', 'end_date', 
              'course_code', 'section')
    readonly_fields = ('weighted_hours',)


@admin.register(WorkloadPolicy)
class WorkloadPolicyAdmin(admin.ModelAdmin):
    list_display = ('department', 'academic_term', 'max_hours_phd', 'max_hours_msc', 
                   'max_hours_undergrad', 'is_active')
    list_filter = ('department', 'academic_term', 'is_active')
    search_fields = ('department__name', 'academic_term')
    fieldsets = (
        (None, {
            'fields': ('department', 'academic_term', 'is_active')
        }),
        ('Maximum Hours', {
            'fields': ('max_hours_phd', 'max_hours_msc', 'max_hours_undergrad')
        }),
        ('Activity Weights', {
            'fields': ('lecture_weight', 'lab_weight', 'grading_weight', 'office_hours_weight')
        }),
        ('Special Considerations', {
            'fields': ('exam_period_multiplier',)
        }),
    )


@admin.register(TAWorkload)
class TAWorkloadAdmin(admin.ModelAdmin):
    list_display = ('ta', 'academic_term', 'department', 'current_weekly_hours', 
                   'max_weekly_hours', 'is_overloaded')
    list_filter = ('academic_term', 'department', 'is_overloaded')
    search_fields = ('ta__first_name', 'ta__last_name', 'ta__email')
    readonly_fields = ('current_weekly_hours', 'total_assigned_hours', 'is_overloaded')
    fieldsets = (
        (None, {
            'fields': ('ta', 'academic_term', 'department', 'policy')
        }),
        ('Workload Information', {
            'fields': ('max_weekly_hours', 'current_weekly_hours', 'total_assigned_hours', 'is_overloaded')
        }),
        ('Overload Approval', {
            'fields': ('overload_approved', 'overload_approved_by', 'overload_approved_date')
        }),
        ('Notes', {
            'fields': ('notes',)
        }),
    )
    inlines = [WorkloadActivityInline]


@admin.register(WorkloadActivity)
class WorkloadActivityAdmin(admin.ModelAdmin):
    list_display = ('workload', 'activity_type', 'description', 'hours', 'weighted_hours', 
                   'recurrence_pattern', 'start_date')
    list_filter = ('activity_type', 'recurrence_pattern', 'start_date')
    search_fields = ('description', 'workload__ta__first_name', 'workload__ta__last_name')
    readonly_fields = ('weighted_hours',)
    fieldsets = (
        (None, {
            'fields': ('workload', 'activity_type', 'description')
        }),
        ('Hours', {
            'fields': ('hours', 'weighted_hours')
        }),
        ('Schedule', {
            'fields': ('is_recurring', 'recurrence_pattern', 'start_date', 'end_date')
        }),
        ('Course Info', {
            'fields': ('course_code', 'section')
        }),
    )
