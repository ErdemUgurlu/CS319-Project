from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'policies', views.WorkloadPolicyViewSet, basename='workload-policy')
router.register(r'workloads', views.TAWorkloadViewSet, basename='ta-workload')
router.register(r'activities', views.WorkloadActivityViewSet, basename='workload-activity')

app_name = 'workload'

urlpatterns = [
    path('', include(router.urls)),
    path('summary/', views.WorkloadSummaryView.as_view(), name='workload-summary'),
    path('summary/<int:department_id>/', views.WorkloadSummaryView.as_view(), name='workload-department-summary'),
    path('policies/', views.WorkloadPolicyListCreateView.as_view(), name='policy_list_create'),
    path('policies/<int:pk>/', views.WorkloadPolicyDetailView.as_view(), name='policy_detail'),
    path('workloads/', views.TAWorkloadListCreateView.as_view(), name='workload_list_create'),
    path('workloads/<int:pk>/', views.TAWorkloadDetailView.as_view(), name='workload_detail'),
    path('activities/', views.WorkloadActivityListCreateView.as_view(), name='activity_list_create'),
    path('activities/<int:pk>/', views.WorkloadActivityDetailView.as_view(), name='activity_detail'),
    path('instructor/ta-workloads/', views.TAWorkloadSummaryView.as_view(), name='instructor_ta_workloads'),
    path('instructor/adjust-workload/', views.ManualWorkloadAdjustmentView.as_view(), name='adjust_workload'),
    path('instructor/adjustment-history/', views.WorkloadAdjustmentHistoryView.as_view(), name='adjustment_history'),
    path('task/update-workload/', views.TaskCompletionWorkloadUpdateView.as_view(), name='task_update_workload'),
] 