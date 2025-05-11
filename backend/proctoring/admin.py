from django.contrib import admin
from .models import ProctorAssignment, SwapRequest

@admin.register(ProctorAssignment)
class ProctorAssignmentAdmin(admin.ModelAdmin):
    """Admin for the ProctorAssignment model."""
    list_display = ('exam', 'ta', 'assigned_by', 'assigned_at', 'status', 'is_paid', 'swap_depth')
    list_filter = ('status', 'is_paid', 'assigned_at')
    search_fields = ('ta__email', 'ta__first_name', 'ta__last_name', 'exam__course__code')
    date_hierarchy = 'assigned_at'
    readonly_fields = ('assigned_at',)
    # Make 'is_paid' editable. By removing it from readonly_fields and not having explicit
    # fieldsets that exclude it, it should become editable by default.
    # If you want to explicitly control the layout, uncomment and adjust fieldsets:
    fieldsets = (
        (None, {
            'fields': ('exam', 'ta', 'status', 'is_paid', 'notes', 'swap_depth')
        }),
        ('Audit Information', {
            'fields': ('assigned_by', 'assigned_at'),
            'classes': ('collapse',)
        }),
    ) 

@admin.register(SwapRequest)
class SwapRequestAdmin(admin.ModelAdmin):
    """Admin for the SwapRequest model."""
    list_display = (
        'id', 
        'requesting_proctor', 
        'original_assignment', 
        'matched_proctor', 
        'status', 
        'created_at', 
        'department'
    )
    list_filter = ('status', 'created_at')
    search_fields = (
        'requesting_proctor__email', 
        'requesting_proctor__first_name', 
        'requesting_proctor__last_name',
        'matched_proctor__email', 
        'matched_proctor__first_name', 
        'matched_proctor__last_name',
        'original_assignment__exam__course__code'
    )
    date_hierarchy = 'created_at'
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        (None, {
            'fields': ('status', 'reason', 'instructor_comment', 'rejected_reason')
        }),
        ('Assignments', {
            'fields': ('original_assignment', 'requesting_proctor', 'matched_assignment', 'matched_proctor')
        }),
        ('Audit Information', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['approve_swap_requests', 'reject_swap_requests']
    
    def approve_swap_requests(self, request, queryset):
        """Admin action to approve selected swap requests."""
        count = 0
        for swap_request in queryset.filter(status='MATCHED'):
            swap_request.status = SwapRequest.Status.APPROVED
            swap_request.save()
            # Perform the actual swap
            if swap_request.perform_swap():
                count += 1
        
        self.message_user(request, f"{count} swap requests were successfully approved and completed.")
    approve_swap_requests.short_description = "Approve selected swap requests"
    
    def reject_swap_requests(self, request, queryset):
        """Admin action to reject selected swap requests."""
        updated = queryset.filter(status__in=['PENDING', 'MATCHED']).update(
            status=SwapRequest.Status.REJECTED, 
            rejected_reason="Rejected by administrator"
        )
        self.message_user(request, f"{updated} swap requests were rejected.")
    reject_swap_requests.short_description = "Reject selected swap requests" 