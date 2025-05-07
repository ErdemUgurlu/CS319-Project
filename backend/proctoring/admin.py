from django.contrib import admin
from .models import ProctorAssignment

@admin.register(ProctorAssignment)
class ProctorAssignmentAdmin(admin.ModelAdmin):
    """Admin for the ProctorAssignment model."""
    list_display = ('exam', 'ta', 'assigned_by', 'assigned_at', 'status')
    list_filter = ('status', 'assigned_at')
    search_fields = ('ta__email', 'ta__first_name', 'ta__last_name', 'exam__course__code')
    date_hierarchy = 'assigned_at'
    readonly_fields = ('assigned_at',) 