from django.urls import path
from . import views

app_name = 'leaves'

urlpatterns = [
    # LeaveType endpoints
    path('types/', views.LeaveTypeListView.as_view(), name='leave-types'),
    
    # TA Leave Request endpoints
    path('my-requests/', views.MyLeaveRequestsView.as_view(), name='my-leave-requests'),
    path('requests/<int:pk>/', views.LeaveRequestDetailView.as_view(), name='leave-request-detail'),
    
    # Instructor Leave Request endpoints
    path('instructor/requests/', views.InstructorLeaveRequestsView.as_view(), name='instructor-leave-requests'),
    path('requests/<int:pk>/review/', views.ReviewLeaveRequestView.as_view(), name='review-leave-request'),
] 