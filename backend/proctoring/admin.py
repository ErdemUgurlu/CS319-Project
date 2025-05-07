from django.contrib import admin
from .models import ProctorAssignment, SwapRequest, ProctorConstraint

# Simple admin registrations for placeholder models
# Removed redundant Exam admin registration since the canonical model is in accounts app
# Removed ExamRoom admin registration as requested
admin.site.register(ProctorAssignment)
admin.site.register(SwapRequest)
admin.site.register(ProctorConstraint)
