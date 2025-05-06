from django.contrib import admin
from .models import Exam, ExamRoom, ProctorAssignment, SwapRequest, ProctorConstraint

# Simple admin registrations for placeholder models
admin.site.register(Exam)
admin.site.register(ExamRoom)
admin.site.register(ProctorAssignment)
admin.site.register(SwapRequest)
admin.site.register(ProctorConstraint)
