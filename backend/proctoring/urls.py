from django.urls import path
from . import views

app_name = 'proctoring'

urlpatterns = [
    # TA proctor assignment endpoints
    path('my-proctorings/', views.MyProctoringsView.as_view(), name='my_proctorings'),
    
    # Swap related endpoints
    path('swap-request/', views.SwapRequestCreateView.as_view(), name='create_swap_request'),
    path('accept-swap/<int:swap_request_id>/', views.AcceptExistingSwapView.as_view(), name='accept_swap'),
    path('eligible-proctors/<int:assignment_id>/', views.EligibleProctorsView.as_view(), name='eligible_proctors'),
    path('swap-history/', views.SwapHistoryView.as_view(), name='swap_history'),
    path('available-swaps/', views.AvailableSwapsView.as_view(), name='available_swaps'),
    path('claim-swap/<int:swap_request_id>/', views.ClaimSwapView.as_view(), name='claim_swap'),
    
    # Confirmation endpoint
    path('confirm-assignment/<int:assignment_id>/', views.ConfirmAssignmentView.as_view(), name='confirm_assignment'),
    
    # Exam management endpoints
    path('exams/', views.ExamCreateView.as_view(), name='create_exam'),
    path('exams/<int:pk>/', views.ExamDetailView.as_view(), name='exam_detail'),
    path('exams/<int:exam_id>/rooms/', views.ExamRoomUpdateView.as_view(), name='update_exam_rooms'),
    
    # Proctor assignment endpoints
    path('exams/<int:exam_id>/assign-proctors/', views.ProctorAssignmentView.as_view(), name='assign_proctors'),
    path('exams/<int:exam_id>/eligible-tas/', views.EligibleProctorsForExamView.as_view(), name='exam_eligible_tas'),
    
    # Seating plan endpoints
    path('exams/<int:exam_id>/seating-plan/', views.SeatingPlanView.as_view(), name='seating_plan'),
    
    # Cross-department requests
    path('exams/<int:exam_id>/cross-department/', views.CrossDepartmentRequestView.as_view(), name='cross_department_request'),
] 