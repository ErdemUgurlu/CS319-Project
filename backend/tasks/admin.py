from django.contrib import admin
from .models import Task, TaskCompletion, TaskReview

@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ('title', 'creator', 'assignee', 'status', 'due_date', 'priority')
    list_filter = ('status', 'priority', 'created_at')
    search_fields = ('title', 'description', 'creator__email', 'assignee__email')
    date_hierarchy = 'due_date'

@admin.register(TaskCompletion)
class TaskCompletionAdmin(admin.ModelAdmin):
    list_display = ('task', 'completed_at', 'hours_spent')
    search_fields = ('task__title', 'completion_note')
    date_hierarchy = 'completed_at'

@admin.register(TaskReview)
class TaskReviewAdmin(admin.ModelAdmin):
    list_display = ('task', 'reviewer', 'review_date', 'is_approved')
    list_filter = ('is_approved', 'review_date')
    search_fields = ('task__title', 'feedback', 'reviewer__email')
    date_hierarchy = 'review_date'
