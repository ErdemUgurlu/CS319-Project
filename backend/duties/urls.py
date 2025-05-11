from django.urls import path
from . import views

app_name = 'duties'

urlpatterns = [
    path('my_workload/', views.MyWorkloadView.as_view(), name='my-workload'),
    # Add other URL patterns for the duties app here if any
] 