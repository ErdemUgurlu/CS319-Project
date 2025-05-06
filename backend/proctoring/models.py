from django.db import models
from django.utils.translation import gettext_lazy as _

# Proctoring models removed for future reimplementation
# This file intentionally left with minimal placeholder models

class Exam(models.Model):
    """Model for exams that need proctors."""
    
    title = models.CharField(max_length=200, default="Placeholder")
    
    def __str__(self):
        return "Disabled - Pending Reimplementation"


class ExamRoom(models.Model):
    """Model for tracking which classrooms are used for an exam."""
    
    def __str__(self):
        return "Disabled - Pending Reimplementation"


class ProctorAssignment(models.Model):
    """Model for assigning TAs as proctors to exams."""
    
    def __str__(self):
        return "Disabled - Pending Reimplementation"


class SwapRequest(models.Model):
    """Model for handling proctor swap requests."""
    
    def __str__(self):
        return "Disabled - Pending Reimplementation"


class ProctorConstraint(models.Model):
    """Model for defining constraints that prevent certain TAs from being assigned to certain exams."""
    
    def __str__(self):
        return "Disabled - Pending Reimplementation"
