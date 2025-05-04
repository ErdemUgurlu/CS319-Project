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
    
    # Confirmation endpoint
    path('confirm-assignment/<int:assignment_id>/', views.ConfirmAssignmentView.as_view(), name='confirm_assignment'),
] 