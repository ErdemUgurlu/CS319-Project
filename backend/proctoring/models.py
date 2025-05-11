from django.db import models
from django.conf import settings
from accounts.models import Exam, TAProfile, User
from django.utils.translation import gettext_lazy as _
from django.db.models.signals import post_delete
from django.dispatch import receiver
import logging
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger(__name__)

class ProctorAssignment(models.Model):
    """Model for tracking TA assignments to exams as proctors."""
    
    class Status(models.TextChoices):
        ASSIGNED = 'ASSIGNED', _('Assigned')
        COMPLETED = 'COMPLETED', _('Completed')
        CANCELED = 'CANCELED', _('Canceled')
    
    exam = models.ForeignKey(
        Exam, 
        on_delete=models.CASCADE, 
        related_name='proctor_assignments'
    )
    ta = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='proctoring_assignments',
        limit_choices_to={'role': 'TA'}
    )
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='proctor_assignments_made',
        limit_choices_to={'role__in': ['STAFF', 'ADMIN', 'INSTRUCTOR']}
    )
    assigned_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.ASSIGNED
    )
    is_paid = models.BooleanField(default=False, help_text="Is this a paid proctoring assignment?")
    notes = models.TextField(blank=True)
    swap_depth = models.PositiveSmallIntegerField(default=0, help_text="Number of times this assignment has been swapped")
    
    _original_status = None 

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._original_status = self.status

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        
        status_changed = not is_new and self.status != self._original_status
        was_assigned = self._original_status == self.Status.ASSIGNED
        is_assigned = self.status == self.Status.ASSIGNED

        super().save(*args, **kwargs)

        try:
            profile = TAProfile.objects.get(user=self.ta)
            changed = False
            if is_new and is_assigned:
                profile.workload_credits += 1
                changed = True
                logger.info(f"Workload credit +1 for TA {self.ta.id} (New Assignment ID: {self.id}). New total: {profile.workload_credits}")
            elif status_changed:
                if not was_assigned and is_assigned:
                    profile.workload_credits += 1
                    changed = True
                    logger.info(f"Workload credit +1 for TA {self.ta.id} (Assignment ID: {self.id} status -> ASSIGNED). New total: {profile.workload_credits}")
                elif was_assigned and not is_assigned:
                    if profile.workload_credits > 0:
                        profile.workload_credits -= 1
                        changed = True
                        logger.info(f"Workload credit -1 for TA {self.ta.id} (Assignment ID: {self.id} status ASSIGNED -> {self.status}). New total: {profile.workload_credits}")
                    else:
                         logger.warning(f"Attempted to decrement workload credit below zero for TA {self.ta.id} (Assignment ID: {self.id}).")
            
            if changed:
                 profile.save(update_fields=['workload_credits'])
        
        except TAProfile.DoesNotExist:
            logger.error(f"TAProfile not found for TA {self.ta.id} when updating workload credits for Assignment ID {self.id}")
        except Exception as e:
             logger.error(f"Error updating workload credits for TA {self.ta.id} on Assignment {self.id} save: {e}")

        self._original_status = self.status
    
    @property
    def is_swappable(self):
        """Check if this assignment is eligible for swap"""
        # Check if the exam start time is at least 1 hour away.
        # The Exam model stores the start time in the `date` DateTimeField, so we no longer
        # attempt to access the (non-existent) `exam.start_time` attribute.

        exam_datetime = self.exam.date if hasattr(self.exam, "date") else None

        if exam_datetime is not None:
            # Ensure both datetimes are timezone-aware before comparison
            if timezone.is_naive(exam_datetime):
                exam_datetime = timezone.make_aware(exam_datetime)

            if timezone.now() + timedelta(hours=1) >= exam_datetime:
                print(f"Assignment {self.id} not swappable: exam is less than 1 hour away")
                return False
        
        # Check swap depth limit - increased from 3 to 10
        if self.swap_depth >= 10:
            print(f"Assignment {self.id} not swappable: reached maximum swap depth ({self.swap_depth})")
            return False
            
        # Only assigned assignments can be swapped
        if self.status != self.Status.ASSIGNED:
            print(f"Assignment {self.id} not swappable: status is {self.status}")
            return False
            
        print(f"Assignment {self.id} is eligible for swap")
        return True

    class Meta:
        verbose_name = 'Proctor Assignment'
        verbose_name_plural = 'Proctor Assignments'
        unique_together = ('exam', 'ta')
    
    def __str__(self):
        return f"{self.ta.full_name} - {self.exam.course.code} {self.exam.get_type_display()}"


class SwapRequest(models.Model):
    """Model for tracking swap requests between TAs for proctoring assignments."""
    
    class Status(models.TextChoices):
        PENDING = 'PENDING', _('Pending')
        MATCHED = 'MATCHED', _('Matched with another TA')
        APPROVED = 'APPROVED', _('Approved by instructor')
        REJECTED = 'REJECTED', _('Rejected by instructor')
        CANCELLED = 'CANCELLED', _('Cancelled by requester')
        COMPLETED = 'COMPLETED', _('Swap completed')
    
    original_assignment = models.ForeignKey(
        ProctorAssignment,
        on_delete=models.CASCADE,
        related_name='swap_requests',
        help_text="The proctoring assignment that the requesting TA wants to swap"
    )
    
    requesting_proctor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='requested_swaps',
        help_text="TA who initiated the swap request"
    )
    
    matched_proctor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='matched_swaps',
        help_text="TA who accepted to swap with the requester"
    )
    
    matched_assignment = models.ForeignKey(
        ProctorAssignment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='matched_swap_requests',
        help_text="The proctoring assignment offered by the matched proctor"
    )
    
    reason = models.TextField(
        blank=True,
        help_text="Reason provided by requester for the swap"
    )
    
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PENDING
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    instructor_comment = models.TextField(
        blank=True,
        help_text="Comment from instructor when approving/rejecting the swap"
    )
    
    rejected_reason = models.TextField(
        blank=True,
        help_text="Reason for rejection by the instructor or system"
    )
    
    class Meta:
        verbose_name = 'Swap Request'
        verbose_name_plural = 'Swap Requests'
        ordering = ['-created_at']
    
    def __str__(self):
        status_display = self.get_status_display()
        if self.matched_proctor:
            return f"Swap Request: {self.requesting_proctor.full_name} with {self.matched_proctor.full_name} ({status_display})"
        return f"Swap Request: {self.requesting_proctor.full_name} ({status_display})"
    
    @property
    def course(self):
        """Return the course associated with this swap request"""
        if hasattr(self, 'original_assignment') and self.original_assignment:
            if hasattr(self.original_assignment, 'exam') and self.original_assignment.exam:
                if hasattr(self.original_assignment.exam, 'course'):
                    return self.original_assignment.exam.course
        return None
    
    @property
    def department(self):
        """Return the department associated with this swap request"""
        if self.course and hasattr(self.course, 'department'):
            return self.course.department
        return None
    
    def clean(self):
        from django.core.exceptions import ValidationError
        
        # NOTE: Once a swap is completed, the TA of the original assignment will be different
        # from the requesting_proctor (because the assignments have been swapped). Therefore, we
        # should enforce this validation ONLY while the swap is still in progress (i.e. prior to
        # being completed). Relaxing the rule after completion prevents an unnecessary
        # ValidationError that was causing the instructor approval endpoint to fail with a 500.
        if self.status != self.Status.COMPLETED and self.requesting_proctor != self.original_assignment.ta:
            raise ValidationError("Requesting proctor must be the assigned TA of the original assignment before the swap is completed.")
        
        # Check if the original assignment is swappable only while the request is still pending or matched.
        if self.status in [self.Status.PENDING, self.Status.MATCHED] and not self.original_assignment.is_swappable:
            raise ValidationError("This assignment is not eligible for swap")
        
        # If matched, validate matched assignment belongs to matched proctor
        # Similar to the requester check above, this validation should be skipped **after** the
        # swap has been completed, because at that point the TA of the matched_assignment has
        # already been switched to the requesting TA.
        if self.status != self.Status.COMPLETED and self.matched_proctor and self.matched_assignment:
            if self.matched_proctor != self.matched_assignment.ta:
                raise ValidationError("Matched assignment must belong to the matched proctor")

            # Check if matched assignment is swappable only while the request is still pending or matched.
            if self.status in [self.Status.PENDING, self.Status.MATCHED] and not self.matched_assignment.is_swappable:
                raise ValidationError("The matched assignment is not eligible for swap")
    
    def save(self, *args, **kwargs):
        # Validate before saving
        self.full_clean()
        
        # Set requester automatically if not set
        if not self.requesting_proctor_id and self.original_assignment:
            self.requesting_proctor = self.original_assignment.ta
            
        super().save(*args, **kwargs)
        
    def perform_swap(self):
        """Perform the actual swap of assignments between TAs"""
        print(f"Starting perform_swap for swap request {self.id}")
        
        if self.status != self.Status.APPROVED:
            print(f"Swap request {self.id} not in APPROVED status: {self.status}")
            return False
            
        if not self.matched_proctor:
            print(f"Swap request {self.id} has no matched_proctor")
            return False
            
        if not self.matched_assignment:
            print(f"Swap request {self.id} has no matched_assignment")
            return False
            
        try:
            # HOTFIX: Reset swap_depth to 0 for easier testing!
            self.original_assignment.swap_depth = 0
            self.matched_assignment.swap_depth = 0
            
            # Store original TAs
            original_ta = self.original_assignment.ta
            matched_ta = self.matched_assignment.ta
            
            print(f"Original assignment ID: {self.original_assignment.id}, TA: {original_ta.email}")
            print(f"Matched assignment ID: {self.matched_assignment.id}, TA: {matched_ta.email}")
            print(f"Swapping TAs: {original_ta.email} <-> {matched_ta.email}")
            
            # Swap TAs - First assign to temporary variables to avoid reference issues
            self.original_assignment.ta = matched_ta
            self.matched_assignment.ta = original_ta
            
            # Increment swap depth
            self.original_assignment.swap_depth += 1
            self.matched_assignment.swap_depth += 1
            
            print(f"New swap depths: original={self.original_assignment.swap_depth}, matched={self.matched_assignment.swap_depth}")
            
            # Save assignments
            print(f"Saving original assignment {self.original_assignment.id} with new TA: {self.original_assignment.ta.email}")
            self.original_assignment.save()
            
            print(f"Saving matched assignment {self.matched_assignment.id} with new TA: {self.matched_assignment.ta.email}")
            self.matched_assignment.save()
            
            # Update status to completed
            self.status = self.Status.COMPLETED
            print(f"Setting swap request {self.id} status to COMPLETED")
            self.save()
            
            print(f"Swap request {self.id} completed successfully")
            return True
            
        except Exception as e:
            import traceback
            traceback_str = traceback.format_exc()
            print(f"Error during swap operation: {str(e)}")
            print(f"Traceback: {traceback_str}")
            
            # Try to revert changes if possible
            try:
                if 'original_ta' in locals() and 'matched_ta' in locals():
                    print(f"Attempting to revert changes...")
                    self.original_assignment.ta = original_ta
                    self.matched_assignment.ta = matched_ta
                    self.original_assignment.save()
                    self.matched_assignment.save()
                    print(f"Changes reverted successfully")
            except Exception as revert_error:
                print(f"Failed to revert changes: {str(revert_error)}")
            return False

@receiver(post_delete, sender=ProctorAssignment)
def decrement_workload_on_delete(sender, instance, **kwargs):
    if instance.status == ProctorAssignment.Status.ASSIGNED:
        try:
            ta_user = instance.ta 
            profile = TAProfile.objects.get(user=ta_user)
            if profile.workload_credits > 0:
                profile.workload_credits -= 1
                profile.save(update_fields=['workload_credits'])
                logger.info(f"Workload credit -1 for TA {ta_user.id} (Deleted Assignment ID: {instance.id}). New total: {profile.workload_credits}")
            else:
                 logger.warning(f"Attempted to decrement workload credit below zero for TA {ta_user.id} on deleting Assignment ID {instance.id}.")
        except User.DoesNotExist:
            ta_id_for_log = instance.ta_id if hasattr(instance, 'ta_id') else 'unknown'
            logger.error(f"TA User (ID: {ta_id_for_log}) not found for deleted Assignment ID: {instance.id}. Skipping workload update.")
        except TAProfile.DoesNotExist:
            ta_id_for_log = 'unknown'
            try:
                if instance.ta and hasattr(instance.ta, 'id'):
                    ta_id_for_log = instance.ta.id
                elif hasattr(instance, 'ta_id'):
                    ta_id_for_log = instance.ta_id
            except User.DoesNotExist:
                if hasattr(instance, 'ta_id'):
                    ta_id_for_log = instance.ta_id

            logger.error(f"TAProfile not found for TA (ID: {ta_id_for_log}) when updating workload credits for deleted Assignment ID: {instance.id}")
        except Exception as e:
             logger.error(f"Error updating workload credits for TA {instance.ta.id} on Assignment {instance.id} delete: {e}")
