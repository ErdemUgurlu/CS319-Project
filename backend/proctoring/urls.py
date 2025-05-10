from django.urls import path
from . import views

app_name = 'proctoring'

urlpatterns = [
    # Exam related endpoints
    path('exams/<int:pk>/eligible-tas/', views.ExamEligibleTAsView.as_view(), name='exam-eligible-tas'),
    path('exams/<int:pk>/assign-proctors/', views.AssignProctorsToExamView.as_view(), name='assign-proctors-to-exam'),
    path('exams/<int:pk>/request-cross-departmental/', views.RequestCrossDepartmentalProctorsView.as_view(), name='request-cross-departmental-proctors'),
    path('exams/<int:pk>/dean-cross-departmental-approval/', views.DeanCrossDepartmentalApprovalView.as_view(), name='dean-cross-departmental-approval'),
    # Swap related endpoints
] 