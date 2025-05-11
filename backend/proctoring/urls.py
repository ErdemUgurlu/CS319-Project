from django.urls import path
from . import views

app_name = 'proctoring'

urlpatterns = [
    # Exam related endpoints
    path('exams/<int:pk>/eligible-tas/', views.ExamEligibleTAsView.as_view(), name='exam-eligible-tas'),
    path('exams/<int:pk>/assign-proctors/', views.AssignProctorsToExamView.as_view(), name='assign-proctors-to-exam'),
    # TA proctor assignments endpoint
    path('my-proctorings/', views.MyProctoringsView.as_view(), name='my-proctorings'),
    path('confirm-assignment/<int:pk>/', views.ConfirmAssignmentView.as_view(), name='confirm-assignment'),
    path('reject-assignment/<int:pk>/', views.RejectAssignmentView.as_view(), name='reject-assignment'),
    
    # Swap Request endpoints
    path('swap-requests/', views.SwapRequestsView.as_view(), name='swap-requests'),
    path('swap-requests/<int:pk>/', views.SwapRequestDetailView.as_view(), name='swap-request-detail'),
    path('swap-requests/<int:pk>/match/', views.SwapRequestMatchView.as_view(), name='swap-request-match'),
    path('swap-requests/<int:pk>/approve/', views.SwapRequestApproveView.as_view(), name='swap-request-approve'),
    path('swap-requests/<int:pk>/reject/', views.SwapRequestRejectView.as_view(), name='swap-request-reject'),
] 