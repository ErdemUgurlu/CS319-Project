from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count
from django.utils import timezone
from .models import TA, Exam, Task
from .serializers import TASerializer, ExamSerializer, TaskSerializer
from django.core.exceptions import ValidationError

# Create your views here.

class TAViewSet(viewsets.ModelViewSet):
    queryset = TA.objects.all()
    serializer_class = TASerializer

    @action(detail=True, methods=['get'])
    def workload(self, request, pk=None):
        ta = self.get_object()
        tasks_count = ta.assigned_tasks.count()
        proctoring_count = ta.proctored_exams.count()
        
        return Response({
            'tasks_count': tasks_count,
            'proctoring_count': proctoring_count,
            'total_workload': ta.workload,
            'tasks': TASerializer(ta.assigned_tasks.all(), many=True).data,
            'proctoring': ExamSerializer(ta.proctored_exams.all(), many=True).data,
        })

    @action(detail=True, methods=['get'])
    def tasks(self, request, pk=None):
        ta = self.get_object()
        tasks = Task.objects.filter(assigned_to=ta)
        serializer = TaskSerializer(tasks, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def exams(self, request, pk=None):
        ta = self.get_object()
        exams = Exam.objects.filter(proctor=ta)
        serializer = ExamSerializer(exams, many=True)
        return Response(serializer.data)

    def perform_create(self, serializer):
        ta = serializer.save()
        # Send notification to the TA about account creation
        # This is where you would implement notification logic

    def perform_update(self, serializer):
        ta = serializer.save()
        # Send notification about updates if necessary
        # This is where you would implement notification logic

    def perform_destroy(self, instance):
        # Check if TA can be deleted (no active tasks or proctoring duties)
        if instance.assigned_tasks.filter(status__in=['pending', 'in_progress']).exists():
            raise ValidationError("Cannot delete TA with active tasks")
        if instance.proctored_exams.filter(date__gte=timezone.now().date()).exists():
            raise ValidationError("Cannot delete TA with upcoming proctoring duties")
        instance.delete()

class ExamViewSet(viewsets.ModelViewSet):
    queryset = Exam.objects.all()
    serializer_class = ExamSerializer

    def perform_create(self, serializer):
        exam = serializer.save()
        if exam.assignment_type == 'automatic':
            self._assign_proctors_automatically(exam)

    def perform_update(self, serializer):
        exam = serializer.save()
        if exam.assignment_type == 'automatic':
            self._assign_proctors_automatically(exam)

    def _assign_proctors_automatically(self, exam):
        # Get TAs with the least workload
        tas = TA.objects.annotate(
            exam_count=Count('proctored_exams')
        ).order_by('exam_count', 'workload')[:exam.number_of_proctors]
        
        exam.proctors.set(tas)
        exam.status = 'Assigned'
        exam.save()

    @action(detail=True, methods=['post'])
    def assign_proctor(self, request, pk=None):
        exam = self.get_object()
        ta_id = request.data.get('ta_id')
        
        try:
            ta = TA.objects.get(id=ta_id)
            exam.proctor = ta
            exam.save()
            serializer = self.get_serializer(exam)
            return Response(serializer.data)
        except TA.DoesNotExist:
            return Response(
                {'error': 'TA not found'},
                status=status.HTTP_404_NOT_FOUND
            )

class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer

    def get_queryset(self):
        queryset = Task.objects.all()
        
        # Filter by TA
        ta_id = self.request.query_params.get('ta', None)
        if ta_id:
            queryset = queryset.filter(assigned_to_id=ta_id)
        
        # Filter by course instructor
        instructor = self.request.query_params.get('instructor', None)
        if instructor:
            queryset = queryset.filter(assigned_by=instructor)
        
        # Filter by status
        status = self.request.query_params.get('status', None)
        if status:
            queryset = queryset.filter(status=status)
            
        # Filter by course
        course = self.request.query_params.get('course', None)
        if course:
            queryset = queryset.filter(course=course)
        
        return queryset

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        task = self.get_object()
        completion_notes = request.data.get('completion_notes', '')
        
        task.status = 'completed'
        task.completion_notes = completion_notes
        task.completed_at = timezone.now()
        task.save()
        
        serializer = self.get_serializer(task)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def overdue(self, request):
        tasks = Task.objects.filter(
            status__in=['pending', 'in_progress'],
            due_date__lt=timezone.now()
        )
        serializer = self.get_serializer(tasks, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        task = self.get_object()
        new_status = request.data.get('status', None)
        
        if not new_status or new_status not in dict(Task.STATUS_CHOICES):
            return Response(
                {'error': 'Invalid status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        task.status = new_status
        task.save()
        
        return Response(TaskSerializer(task).data)
