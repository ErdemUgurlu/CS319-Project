from django.shortcuts import render, get_object_or_404
from django.utils import timezone
from django.db import transaction
from django.http import Http404, HttpResponse
from django.core.files.storage import default_storage
from rest_framework import status, viewsets, generics, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from accounts.models import User, AuditLog, Classroom
from .models import Exam, ExamRoom, ProctorAssignment, SwapRequest, ProctorConstraint
from workload.models import TAWorkload
from . import serializers
from .utils import (
    process_swap_request, 
    send_swap_notification_emails,
    check_ta_eligibility,
    assign_proctors_to_exam,
    find_available_tas_for_exam,
    generate_seating_plan
)


class IsTA(permissions.BasePermission):
    """
    Custom permission to only allow TAs to access a view.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'TA'


class IsStaffOrInstructor(permissions.BasePermission):
    """
    Custom permission to only allow staff and instructors to access a view.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['STAFF', 'ADMIN', 'INSTRUCTOR']


class IsStaffOrInstructorOfCourse(permissions.BasePermission):
    """
    Permission to only allow staff or the instructor of the course to access a view.
    """
    def has_object_permission(self, request, view, obj):
        # Staff and admin can access any exam
        if request.user.role in ['STAFF', 'ADMIN']:
            return True
        
        # Instructors can only access exams they created
        if request.user.role == 'INSTRUCTOR':
            return obj.created_by == request.user or obj.section.course.instructor == request.user
        
        return False


class MyProctoringsView(generics.ListAPIView):
    """
    API endpoint for TAs to view their proctor assignments.
    """
    serializer_class = serializers.ProctorAssignmentSerializer
    permission_classes = [IsAuthenticated, IsTA]
    
    def get_queryset(self):
        return ProctorAssignment.objects.filter(
            proctor=self.request.user
        ).select_related(
            'exam', 'exam_room', 'exam_room__classroom'
        ).order_by('exam__date', 'exam__start_time')


class SwapRequestCreateView(generics.CreateAPIView):
    """
    API endpoint for TAs to create swap requests.
    
    For direct swaps (with a target TA specified), the request is processed immediately.
    For self-initiated swaps (no target), the request is posted as 'available'.
    """
    serializer_class = serializers.SwapRequestCreateSerializer
    permission_classes = [IsAuthenticated, IsTA]
    
    @transaction.atomic
    def perform_create(self, serializer):
        # Save the swap request instance but don't commit to DB yet
        swap_request = serializer.save()
        
        # Set the requesting proctor
        swap_request.requesting_proctor = self.request.user
        
        # Process differently based on whether a target TA is specified
        if swap_request.requested_proctor:
            swap_request.is_auto_swap = True  # Mark as automatic swap
            swap_request.save()
            
            # Process the swap request
            result = process_swap_request(swap_request)
            
            # Send email notifications
            if result['success']:
                send_swap_notification_emails(swap_request, success=True)
            else:
                send_swap_notification_emails(swap_request, success=False)
            
            # Store the result for the response
            self.swap_result = result
        else:
            # This is a self-initiated swap without a target, just save it as available
            swap_request.status = 'AVAILABLE'
            swap_request.save()
            
            # Log the availability posting
            AuditLog.objects.create(
                user=self.request.user,
                action='post_swap_availability',
                object_type='SwapRequest',
                object_id=swap_request.id,
                description=f"TA {self.request.user.email} posted availability to swap {swap_request.original_assignment.exam.title}"
            )
            
            # Store a simple result
            self.swap_result = {
                'success': True,
                'message': 'Swap availability posted successfully',
                'swap_request': swap_request,
                'details': {'status': 'AVAILABLE'}
            }
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # Get the result from the swap processing
        result = getattr(self, 'swap_result', {'success': False, 'message': 'Unknown error'})
        
        if result['success']:
            return Response({
                'message': result['message'],
                'swap_request_id': result['swap_request'].id,
                'details': result.get('details', {})
            }, status=status.HTTP_201_CREATED)
        else:
            return Response({
                'error': result['message'],
                'swap_request_id': result['swap_request'].id,
                'details': result.get('details', {})
            }, status=status.HTTP_400_BAD_REQUEST)


class AvailableSwapsView(generics.ListAPIView):
    """
    API endpoint to view available swaps that TAs can claim.
    """
    serializer_class = serializers.SwapRequestSerializer
    permission_classes = [IsAuthenticated, IsTA]
    
    def get_queryset(self):
        """
        Return all swap requests with status AVAILABLE that are not the current user's.
        """
        return SwapRequest.objects.filter(
            status='AVAILABLE'
        ).exclude(
            requesting_proctor=self.request.user
        ).select_related(
            'requesting_proctor',
            'original_assignment',
            'original_assignment__exam'
        ).order_by('-created_at')


class ClaimSwapView(APIView):
    """
    API endpoint for TAs to claim a posted swap request.
    """
    permission_classes = [IsAuthenticated, IsTA]
    
    @transaction.atomic
    def post(self, request, swap_request_id):
        try:
            # Get the swap request
            swap_request = SwapRequest.objects.get(id=swap_request_id, status='AVAILABLE')
            
            # Update the swap request with the claiming TA
            swap_request.requested_proctor = request.user
            swap_request.status = 'PENDING'  # Change to PENDING while we process
            swap_request.save()
            
            # Process the swap
            result = process_swap_request(swap_request)
            
            # Send email notifications
            if result['success']:
                send_swap_notification_emails(swap_request, success=True)
                
                # Log the claim
                AuditLog.objects.create(
                    user=request.user,
                    action='claim_swap',
                    object_type='SwapRequest',
                    object_id=swap_request.id,
                    description=f"TA {request.user.email} claimed swap for {swap_request.original_assignment.exam.title}"
                )
                
                return Response({
                    'message': 'Swap claimed and processed successfully',
                    'swap_request_id': swap_request.id,
                    'details': result.get('details', {})
                }, status=status.HTTP_200_OK)
            else:
                # If processing failed, reset to AVAILABLE
                swap_request.requested_proctor = None
                swap_request.status = 'AVAILABLE'
                swap_request.save()
                
                return Response({
                    'error': result['message'],
                    'swap_request_id': swap_request.id,
                    'details': result.get('details', {})
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except SwapRequest.DoesNotExist:
            return Response({
                'error': 'Available swap request not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AcceptExistingSwapView(APIView):
    """
    API endpoint for TAs to accept an existing swap request.
    """
    permission_classes = [IsAuthenticated, IsTA]
    
    @transaction.atomic
    def post(self, request, swap_request_id):
        try:
            # Get the swap request
            swap_request = SwapRequest.objects.get(id=swap_request_id)
            
            # Check if the request is already processed
            if swap_request.status != 'PENDING':
                return Response({
                    'error': 'This swap request has already been processed'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if the current user is the requested proctor
            if swap_request.requested_proctor.id != request.user.id:
                return Response({
                    'error': 'You are not the requested proctor for this swap'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Process the swap request
            result = process_swap_request(swap_request)
            
            # Send email notifications
            if result['success']:
                send_swap_notification_emails(swap_request, success=True)
            else:
                send_swap_notification_emails(swap_request, success=False)
            
            if result['success']:
                return Response({
                    'message': result['message'],
                    'swap_request_id': swap_request.id,
                    'details': result.get('details', {})
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'error': result['message'],
                    'swap_request_id': swap_request.id,
                    'details': result.get('details', {})
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except SwapRequest.DoesNotExist:
            return Response({
                'error': 'Swap request not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class EligibleProctorsView(APIView):
    """
    API endpoint to get a list of eligible TAs for a proctor swap.
    """
    permission_classes = [IsAuthenticated, IsTA]
    
    def get(self, request, assignment_id):
        try:
            # Get the assignment
            assignment = ProctorAssignment.objects.get(id=assignment_id)
            
            # Check if the current user is the assigned proctor
            if assignment.proctor.id != request.user.id:
                return Response({
                    'error': 'You can only view eligible TAs for your own assignments'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Get all TAs
            tas = User.objects.filter(role='TA')
            
            # Check eligibility for each TA
            eligible_tas = []
            
            for ta in tas:
                # Skip the current proctor
                if ta.id == request.user.id:
                    continue
                
                is_eligible, details = check_ta_eligibility(ta, assignment.exam, assignment)
                
                eligible_tas.append({
                    'id': ta.id,
                    'email': ta.email,
                    'full_name': ta.full_name,
                    'academic_level': ta.academic_level,
                    'is_eligible': is_eligible,
                    'details': details
                })
            
            return Response(eligible_tas)
            
        except ProctorAssignment.DoesNotExist:
            return Response({
                'error': 'Assignment not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ConfirmAssignmentView(APIView):
    """
    API endpoint for TAs to confirm their proctoring assignments.
    """
    permission_classes = [IsAuthenticated, IsTA]
    
    def post(self, request, assignment_id):
        try:
            # Get the assignment
            assignment = ProctorAssignment.objects.get(id=assignment_id)
            
            # Check if the current user is the assigned proctor
            if assignment.proctor.id != request.user.id:
                return Response({
                    'error': 'You can only confirm your own assignments'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Check if the assignment is already confirmed
            if assignment.status != 'ASSIGNED':
                return Response({
                    'error': f'This assignment is already in {assignment.get_status_display()} status'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Update the assignment
            assignment.status = 'CONFIRMED'
            assignment.confirmation_date = timezone.now()
            assignment.save()
            
            # Log the confirmation
            AuditLog.objects.create(
                user=request.user,
                action='confirm_proctoring',
                object_type='ProctorAssignment',
                object_id=assignment.id,
                description=f"Proctor {request.user.email} confirmed assignment for {assignment.exam.title}"
            )
            
            return Response({
                'message': 'Assignment confirmed successfully',
                'assignment_id': assignment.id,
                'status': assignment.status
            }, status=status.HTTP_200_OK)
                
        except ProctorAssignment.DoesNotExist:
            return Response({
                'error': 'Assignment not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SwapHistoryView(generics.ListAPIView):
    """
    API endpoint to view swap history for a TA.
    """
    serializer_class = serializers.SwapRequestSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'is_auto_swap', 'is_cross_department']
    
    def get_queryset(self):
        user = self.request.user
        
        if user.role == 'TA':
            # TAs can see only their own swap requests
            return SwapRequest.objects.filter(
                requesting_proctor=user
            ).select_related(
                'requesting_proctor',
                'requested_proctor',
                'original_assignment',
                'original_assignment__exam',
                'original_assignment__exam_room'
            ).order_by('-created_at')
        elif user.role in ['STAFF', 'ADMIN', 'INSTRUCTOR']:
            # Staff and instructors can see all swap requests
            return SwapRequest.objects.all().select_related(
                'requesting_proctor',
                'requested_proctor',
                'original_assignment',
                'original_assignment__exam',
                'original_assignment__exam_room'
            ).order_by('-created_at')
        else:
            return SwapRequest.objects.none()


class ExamCreateView(generics.CreateAPIView):
    """
    API endpoint for creating new exams.
    """
    serializer_class = serializers.ExamCreateSerializer
    permission_classes = [IsAuthenticated, IsStaffOrInstructor]
    
    def perform_create(self, serializer):
        exam = serializer.save(created_by=self.request.user, status='DRAFT')
        
        # Create exam rooms if specified
        if 'rooms' in self.request.data:
            rooms_data = self.request.data.get('rooms', [])
            
            for room_data in rooms_data:
                try:
                    classroom = Classroom.objects.get(id=room_data.get('classroom_id'))
                    ExamRoom.objects.create(
                        exam=exam,
                        classroom=classroom,
                        student_count=room_data.get('student_count', 0),
                        proctor_count=room_data.get('proctor_count', 1)
                    )
                except Classroom.DoesNotExist:
                    pass  # Skip invalid classrooms
        
        # Log exam creation
        AuditLog.objects.create(
            user=self.request.user,
            action='create_exam',
            object_type='Exam',
            object_id=exam.id,
            description=f"Exam created: {exam.title} for {exam.section}"
        )
        
        return exam


class ExamDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    API endpoint for retrieving, updating, or deleting an exam.
    """
    queryset = Exam.objects.all()
    serializer_class = serializers.ExamDetailSerializer
    permission_classes = [IsAuthenticated, IsStaffOrInstructorOfCourse]
    
    def perform_update(self, serializer):
        exam = serializer.save()
        
        # Log exam update
        AuditLog.objects.create(
            user=self.request.user,
            action='update_exam',
            object_type='Exam',
            object_id=exam.id,
            description=f"Exam updated: {exam.title}"
        )
    
    def perform_destroy(self, instance):
        # Log exam deletion before deletion
        AuditLog.objects.create(
            user=self.request.user,
            action='delete_exam',
            object_type='Exam',
            object_id=instance.id,
            description=f"Exam deleted: {instance.title}"
        )
        
        instance.delete()


class ExamRoomUpdateView(APIView):
    """
    API endpoint for updating exam rooms.
    """
    permission_classes = [IsAuthenticated, IsStaffOrInstructor]
    
    def post(self, request, exam_id):
        try:
            exam = Exam.objects.get(id=exam_id)
            
            # Check permission
            if request.user.role not in ['STAFF', 'ADMIN'] and exam.created_by != request.user:
                return Response({
                    'error': 'You do not have permission to update rooms for this exam'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Get rooms data
            rooms_data = request.data.get('rooms', [])
            
            # Clear existing rooms
            ExamRoom.objects.filter(exam=exam).delete()
            
            # Create new rooms
            for room_data in rooms_data:
                try:
                    classroom = Classroom.objects.get(id=room_data.get('classroom_id'))
                    ExamRoom.objects.create(
                        exam=exam,
                        classroom=classroom,
                        student_count=room_data.get('student_count', 0),
                        proctor_count=room_data.get('proctor_count', 1)
                    )
                except Classroom.DoesNotExist:
                    pass  # Skip invalid classrooms
            
            # Log room update
            AuditLog.objects.create(
                user=request.user,
                action='update_exam_rooms',
                object_type='Exam',
                object_id=exam.id,
                description=f"Exam rooms updated for {exam.title}"
            )
            
            return Response({
                'success': True,
                'message': 'Rooms updated successfully',
                'exam_id': exam.id
            })
            
        except Exam.DoesNotExist:
            return Response({
                'error': 'Exam not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)


class ProctorAssignmentView(APIView):
    """
    API endpoint for assigning proctors to an exam (manual, automatic, or hybrid).
    """
    permission_classes = [IsAuthenticated, IsStaffOrInstructor]
    
    @transaction.atomic
    def post(self, request, exam_id):
        try:
            exam = Exam.objects.get(id=exam_id)
            
            # Check permission
            if request.user.role not in ['STAFF', 'ADMIN'] and exam.created_by != request.user:
                return Response({
                    'error': 'You do not have permission to assign proctors for this exam'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Get assignment data
            assignment_type = request.data.get('assignment_type', 'MANUAL')  # MANUAL, AUTO, HYBRID
            manual_proctors = request.data.get('manual_proctors', [])
            auto_assign = assignment_type in ['AUTO', 'HYBRID']
            
            # Check if there are existing assignments
            if ProctorAssignment.objects.filter(exam=exam).exists():
                # Delete existing assignments if requested
                if request.data.get('replace_existing', False):
                    ProctorAssignment.objects.filter(exam=exam).delete()
                    
                    # Log deletion
                    AuditLog.objects.create(
                        user=request.user,
                        action='delete_proctor_assignments',
                        object_type='Exam',
                        object_id=exam.id,
                        description=f"All proctor assignments deleted for {exam.title}"
                    )
                else:
                    return Response({
                        'error': 'Exam already has proctor assignments',
                        'detail': 'Set replace_existing=true to replace them'
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            # Assign proctors
            success, assigned_proctors, details = assign_proctors_to_exam(
                exam=exam,
                manual_proctors=manual_proctors,
                auto_assign=auto_assign,
                assigned_by=request.user
            )
            
            if success:
                return Response({
                    'success': True,
                    'message': 'Proctors assigned successfully',
                    'exam_id': exam.id,
                    'assignment_details': details,
                    'assigned_count': len(assigned_proctors)
                })
            else:
                return Response({
                    'success': False,
                    'message': 'Not all required proctors could be assigned',
                    'exam_id': exam.id,
                    'assignment_details': details,
                    'assigned_count': len(assigned_proctors)
                }, status=status.HTTP_400_BAD_REQUEST)
            
        except Exam.DoesNotExist:
            return Response({
                'error': 'Exam not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)


class EligibleProctorsForExamView(APIView):
    """
    API endpoint to get a list of eligible TAs for an exam.
    """
    permission_classes = [IsAuthenticated, IsStaffOrInstructor]
    
    def get(self, request, exam_id):
        try:
            exam = Exam.objects.get(id=exam_id)
            
            # Check permission
            if request.user.role not in ['STAFF', 'ADMIN'] and exam.created_by != request.user:
                return Response({
                    'error': 'You do not have permission to view eligible proctors for this exam'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Get all TAs
            all_tas = User.objects.filter(role='TA')
            
            # Check eligibility for each TA
            eligible_tas = []
            
            for ta in all_tas:
                is_eligible, details = check_ta_eligibility(ta, exam)
                
                eligible_tas.append({
                    'id': ta.id,
                    'email': ta.email,
                    'full_name': ta.full_name,
                    'academic_level': ta.academic_level,
                    'department': ta.department,
                    'is_eligible': is_eligible,
                    'is_from_course': TAWorkload.objects.filter(
                        ta=ta, 
                        activities__course_code=exam.section.course.code
                    ).exists(),
                    'is_from_department': ta.department == exam.section.course.department.code,
                    'current_workload': details.get('workload', {}).get('current', 0),
                    'constraints': details.get('constraints', [])
                })
            
            return Response(eligible_tas)
            
        except Exam.DoesNotExist:
            return Response({
                'error': 'Exam not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SeatingPlanView(APIView):
    """
    API endpoint to generate and download a seating plan for an exam.
    """
    permission_classes = [IsAuthenticated, IsStaffOrInstructor]
    
    def get(self, request, exam_id):
        try:
            exam = Exam.objects.get(id=exam_id)
            
            # Check permission
            if request.user.role not in ['STAFF', 'ADMIN'] and exam.created_by != request.user:
                return Response({
                    'error': 'You do not have permission to generate seating plan for this exam'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Check if randomize is requested
            randomize = request.query_params.get('randomize', 'false').lower() == 'true'
            
            # Generate seating plan
            seating_plan = generate_seating_plan(exam, randomize=randomize)
            
            if 'error' in seating_plan:
                return Response(seating_plan, status=status.HTTP_400_BAD_REQUEST)
            
            # Log seating plan generation
            AuditLog.objects.create(
                user=request.user,
                action='generate_seating_plan',
                object_type='Exam',
                object_id=exam.id,
                description=f"Seating plan generated for {exam.title} ({'randomized' if randomize else 'alphabetical'})"
            )
            
            # Check if download is requested
            if request.query_params.get('download', 'false').lower() == 'true':
                # Generate a printable seating plan (in a real system, this would create a PDF or Excel file)
                import pandas as pd
                import io
                
                # Create a DataFrame from the seating plan
                all_students = []
                
                for classroom in seating_plan['classrooms']:
                    for student in classroom['students']:
                        student_entry = {
                            'Student ID': student['student_id'],
                            'First Name': student['first_name'],
                            'Last Name': student['last_name'],
                            'Classroom': classroom['room_name']
                        }
                        all_students.append(student_entry)
                
                df = pd.DataFrame(all_students)
                
                # Create an Excel file
                output = io.BytesIO()
                with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
                    df.to_excel(writer, sheet_name='Seating Plan', index=False)
                    
                    # Access the workbook and the worksheet
                    workbook = writer.book
                    worksheet = writer.sheets['Seating Plan']
                    
                    # Add a header with exam information
                    header_format = workbook.add_format({
                        'bold': True,
                        'font_size': 14,
                        'align': 'center',
                        'valign': 'vcenter'
                    })
                    
                    # Merge cells for the header
                    worksheet.merge_range('A1:D1', f"Seating Plan: {exam.title}", header_format)
                    worksheet.merge_range('A2:D2', f"Date: {exam.date.strftime('%Y-%m-%d')}, Time: {exam.start_time.strftime('%H:%M')}", header_format)
                
                # Set up the response for file download
                output.seek(0)
                response = HttpResponse(
                    output.read(),
                    content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                )
                response['Content-Disposition'] = f'attachment; filename="seating_plan_{exam.id}.xlsx"'
                return response
            
            # Otherwise return the seating plan as JSON
            return Response(seating_plan)
            
        except Exam.DoesNotExist:
            return Response({
                'error': 'Exam not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CrossDepartmentRequestView(APIView):
    """
    API endpoint for handling cross-department proctoring requests.
    """
    permission_classes = [IsAuthenticated, IsStaffOrInstructor]
    
    def post(self, request, exam_id):
        try:
            exam = Exam.objects.get(id=exam_id)
            
            # Check permission
            if request.user.role not in ['STAFF', 'ADMIN'] and exam.created_by != request.user:
                return Response({
                    'error': 'You do not have permission to request cross-department proctoring'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Get request details
            target_department = request.data.get('department')
            ta_count = request.data.get('ta_count', 1)
            request_note = request.data.get('note', '')
            
            # Update exam with cross-department request
            exam.is_cross_department = True
            exam.requested_from_department = target_department
            exam.dean_office_request = True
            exam.dean_office_comments = request_note
            exam.save()
            
            # Log the cross-department request
            AuditLog.objects.create(
                user=request.user,
                action='cross_department_request',
                object_type='Exam',
                object_id=exam.id,
                description=f"Cross-department proctoring requested for {exam.title} from {target_department}: {ta_count} TAs"
            )
            
            return Response({
                'success': True,
                'message': 'Cross-department proctoring request submitted',
                'exam_id': exam.id
            })
            
        except Exam.DoesNotExist:
            return Response({
                'error': 'Exam not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
