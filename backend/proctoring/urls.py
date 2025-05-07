from django.urls import path
from . import views

app_name = 'proctoring'

urlpatterns = [
    # Exam related endpoints
    path('exams/<int:pk>/eligible-tas/', views.ExamEligibleTAsView.as_view(), name='exam-eligible-tas'),
    path('exams/<int:pk>/assign-proctors/', views.AssignProctorsToExamView.as_view(), name='assign-proctors-to-exam'),
] 