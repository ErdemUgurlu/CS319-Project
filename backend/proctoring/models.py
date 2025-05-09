from django.db import models
from django.conf import settings
from accounts.models import Exam, TAProfile, User
from django.utils.translation import gettext_lazy as _
from django.db.models.signals import post_delete
from django.dispatch import receiver
import logging

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

    class Meta:
        verbose_name = 'Proctor Assignment'
        verbose_name_plural = 'Proctor Assignments'
        unique_together = ('exam', 'ta')
    
    def __str__(self):
        return f"{self.ta.full_name} - {self.exam.course.code} {self.exam.get_type_display()}"

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
