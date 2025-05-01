from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    LeaveRequestViewSet, ProctorAssignmentViewSet,
    CrossDepartmentAssignmentRequestViewSet
)

router = DefaultRouter()
router.register('leave-requests', LeaveRequestViewSet, basename='leave-request')
router.register('proctor-assignments', ProctorAssignmentViewSet, basename='proctor-assignment')
router.register('cross-department-requests', CrossDepartmentAssignmentRequestViewSet, basename='cross-department-request')

urlpatterns = [
    path('', include(router.urls)),
] 