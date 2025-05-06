from django.contrib import admin
from .models import LeaveType, LeaveRequest, LeaveImpact, DateUnavailability

# Register models with the admin site
@admin.register(LeaveType)
class LeaveTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'requires_documentation', 'max_days_per_semester')
    search_fields = ('name', 'description')
    list_filter = ('requires_documentation',)

@admin.register(LeaveRequest)
class LeaveRequestAdmin(admin.ModelAdmin):
    list_display = ('ta', 'leave_type', 'start_date', 'end_date', 'status', 'duration_days')
    list_filter = ('status', 'leave_type', 'start_date')
    search_fields = ('ta__first_name', 'ta__last_name', 'ta__email', 'reason')
    readonly_fields = ('created_at', 'updated_at')
    date_hierarchy = 'start_date'

@admin.register(LeaveImpact)
class LeaveImpactAdmin(admin.ModelAdmin):
    list_display = ('leave_request', 'ta_assignment', 'instructor_notified')
    list_filter = ('instructor_notified',)
    search_fields = ('leave_request__ta__first_name', 'leave_request__ta__last_name')

@admin.register(DateUnavailability)
class DateUnavailabilityAdmin(admin.ModelAdmin):
    list_display = ('ta', 'date', 'reason')
    list_filter = ('date',)
    search_fields = ('ta__first_name', 'ta__last_name', 'reason')
    date_hierarchy = 'date'
