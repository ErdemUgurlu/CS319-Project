from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TAViewSet, TaskViewSet, ExamViewSet

router = DefaultRouter()
router.register(r'tas', TAViewSet)
router.register(r'tasks', TaskViewSet)
router.register(r'exams', ExamViewSet)

urlpatterns = [
    path('', include(router.urls)),
] 