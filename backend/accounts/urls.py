from django.urls import path, include
from . import views

app_name = 'accounts'

urlpatterns = [
    # Authentication endpoints
    path('register/', views.UserRegistrationView.as_view(), name='register'),
    path('verify-email/<str:token>/', views.VerifyEmailView.as_view(), name='verify_email'),
    path('request-password-reset/', views.RequestPasswordResetView.as_view(), name='request_password_reset'),
    path('reset-password/<str:token>/', views.ResetPasswordView.as_view(), name='reset_password'),
    path('change-password/', views.ChangePasswordView.as_view(), name='change_password'),
    path('set-password-after-approval/', views.SetPasswordAfterApprovalView.as_view(), name='set_password_after_approval'),
    
    # New endpoints for TA bulk registration from Excel
    path('register-tas-from-excel/', views.RegisterTAsFromExcelView.as_view(), name='register_tas_from_excel'),
    path('send-password-emails/', views.SendPasswordEmailsView.as_view(), name='send_password_emails'),
    
    # First-time login endpoints
    path('check-email-exists/', views.CheckEmailExistsView.as_view(), name='check_email_exists'),
    path('create-ta-from-email/', views.CreateTAFromEmailView.as_view(), name='create_ta_from_email'),
    
    # Utility endpoint to fix user approval status
    path('fix-all-users/', views.FixAllUsersView.as_view(), name='fix_all_users'),
    
    # User profile endpoints
    path('profile/', views.UserProfileView.as_view(), name='user_profile'),
    path('profile/update/', views.UpdateUserProfileView.as_view(), name='update_profile'),
    
    # Admin/Staff only endpoints
    path('users/', views.UserListView.as_view(), name='user_list'),
    path('users/<int:pk>/', views.UserDetailView.as_view(), name='user_detail'),
    path('users/<int:pk>/approve/', views.ApproveUserView.as_view(), name='approve_user'),
    path('admin/create-staff/', views.AdminCreateStaffView.as_view(), name='admin_create_staff'),
    path('admin/delete-user/<int:pk>/', views.AdminDeleteUserView.as_view(), name='admin_delete_user'),
    path('admin/deactivate-user/<int:pk>/', views.DeactivateUserView.as_view(), name='admin_deactivate_user'),
    path('admin/reactivate-user/<int:pk>/', views.ReactivateUserView.as_view(), name='admin_reactivate_user'),
    
    # TA specific endpoints
    path('weekly-schedule/', views.WeeklyScheduleListCreateView.as_view(), name='weekly_schedule_list_create'),
    path('weekly-schedule/<int:pk>/', views.WeeklyScheduleDetailView.as_view(), name='weekly_schedule_detail'),
    
    # Department, Course, Section, etc.
    path('departments/', views.DepartmentListView.as_view(), name='department_list'),
    path('departments/<int:pk>/', views.DepartmentDetailView.as_view(), name='department_detail'),
    
    # Course endpoints
    path('courses/', views.CourseListView.as_view(), name='course_list'),
    path('courses/<int:pk>/', views.CourseDetailView.as_view(), name='course_detail'),
    path('courses/create/', views.CourseCreateView.as_view(), name='course_create'),
    path('courses/<int:pk>/update/', views.CourseUpdateView.as_view(), name='course_update'),
    path('courses/<int:pk>/delete/', views.CourseDeleteView.as_view(), name='course_delete'),
    path('courses/import-excel/', views.ImportCoursesFromExcelView.as_view(), name='import_courses_excel'),
    
    # Section endpoints
    path('sections/', views.SectionListView.as_view(), name='section_list'),
    path('sections/<int:pk>/', views.SectionDetailView.as_view(), name='section_detail'),
    path('sections/create/', views.SectionCreateView.as_view(), name='section_create'),
    path('sections/<int:pk>/update/', views.SectionUpdateView.as_view(), name='section_update'),
    path('sections/<int:pk>/delete/', views.SectionDeleteView.as_view(), name='section_delete'),
    
    # Exam endpoints
    path('exams/', views.ExamListView.as_view(), name='exam_list'),
    path('exams/<int:pk>/', views.ExamDetailView.as_view(), name='exam_detail'),
    path('exams/create/', views.ExamCreateView.as_view(), name='exam_create'),
    path('exams/<int:pk>/update/', views.ExamUpdateView.as_view(), name='exam_update'),
    path('exams/<int:pk>/delete/', views.ExamDeleteView.as_view(), name='exam_delete'),
    path('exams/<int:pk>/assign-places/', views.ExamAssignClassroomView.as_view(), name='exam_assign_places'),
    path('exams/<int:pk>/set-proctors/', views.ExamSetProctorsView.as_view(), name='exam_set_proctors'),
    path('exams/<int:pk>/upload-student-list/', views.ExamStudentListUploadView.as_view(), name='exam_upload_student_list'),
    path('exams/import-placements/', views.ExamPlacementImportView.as_view(), name='exam_import_placements'),
    
    # Classroom endpoints
    path('classrooms/', views.ClassroomListView.as_view(), name='classroom_list'),
    
    path('ta-assignments/', views.TAAssignmentListCreateView.as_view(), name='ta_assignment_list_create'),
    path('ta-assignments/<int:pk>/', views.TAAssignmentDetailView.as_view(), name='ta_assignment_detail'),
    
    # User approve list - for staff to approve users from their department
    path('users/pending/', views.PendingApprovalUsersView.as_view(), name='pending_approval_users'),
    
    # Instructor TA management
    path('instructor/tas/', views.MyTAsListView.as_view(), name='my_tas'),
    path('instructor/available-tas/', views.AvailableTAsListView.as_view(), name='available_tas'),
    path('instructor/assign-ta/', views.AssignTAView.as_view(), name='assign_ta'),
    path('instructor/remove-ta/', views.RemoveTAView.as_view(), name='remove_ta'),
    path('instructor/tas/', views.InstructorTAAssignmentView.as_view(), name='instructor-tas'),
    
    # New endpoints for Task component and TA profiles
    path('tas/', views.AllTAsListView.as_view(), name='all_tas'),
    path('tas/<int:ta_id>/profile/', views.TAProfileView.as_view(), name='ta_profile'),
] 