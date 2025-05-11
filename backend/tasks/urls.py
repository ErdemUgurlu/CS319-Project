from django.urls import path
from . import views

app_name = 'tasks'

urlpatterns = [
    # Task management endpoints
    path('my-tasks/', views.MyTasksView.as_view(), name='my_tasks'),
    path('task/<int:pk>/', views.TaskDetailView.as_view(), name='task_detail'),
    path('task-statuses/', views.TaskStatusesView.as_view(), name='task_statuses'),
    # New endpoints for task workflow
    path('task/<int:task_id>/complete/', views.CompleteTaskView.as_view(), name='complete_task'),
    path('task/<int:task_id>/review/', views.ReviewTaskView.as_view(), name='review_task'),
    path('task/<int:task_id>/accept/', views.AcceptTaskView.as_view(), name='accept_task'),
    # Add a specific endpoint for creating tasks
    path('create-task/', views.CreateTaskView.as_view(), name='create_task'),
]