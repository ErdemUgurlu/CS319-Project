from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'policies', views.WorkloadPolicyViewSet, basename='workload-policy')
router.register(r'workloads', views.TAWorkloadViewSet, basename='ta-workload')
router.register(r'activities', views.WorkloadActivityViewSet, basename='workload-activity')

urlpatterns = [
    path('', include(router.urls)),
    path('summary/', views.WorkloadSummaryView.as_view(), name='workload-summary'),
    path('summary/<int:department_id>/', views.WorkloadSummaryView.as_view(), name='workload-department-summary'),
] 