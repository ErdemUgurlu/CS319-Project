from django.contrib import admin
from .models import ProctorAssignment

@admin.register(ProctorAssignment)
class ProctorAssignmentAdmin(admin.ModelAdmin):
    """Admin for the ProctorAssignment model."""
    list_display = ('exam', 'ta', 'assigned_by', 'assigned_at', 'status', 'is_paid')
    list_filter = ('status', 'is_paid', 'assigned_at')
    search_fields = ('ta__email', 'ta__first_name', 'ta__last_name', 'exam__course__code')
    date_hierarchy = 'assigned_at'
    readonly_fields = ('assigned_at',)
    # Make 'is_paid' editable. By removing it from readonly_fields and not having explicit
    # fieldsets that exclude it, it should become editable by default.
    # If you want to explicitly control the layout, uncomment and adjust fieldsets:
    fieldsets = (
        (None, {
            'fields': ('exam', 'ta', 'status', 'is_paid', 'notes')
        }),
        ('Audit Information', {
            'fields': ('assigned_by', 'assigned_at'),
            'classes': ('collapse',)
        }),
    ) 