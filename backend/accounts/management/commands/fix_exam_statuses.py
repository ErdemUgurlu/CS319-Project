from django.core.management.base import BaseCommand
from accounts.models import Exam, AuditLog
from django.db import transaction


class Command(BaseCommand):
    help = "Fix exam statuses - updates exams with classrooms assigned but still in WAITING_FOR_PLACES status"
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be updated without actually making changes',
        )
    
    @transaction.atomic
    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        
        if dry_run:
            self.stdout.write(self.style.WARNING("Running in dry-run mode - no changes will be made"))
        
        # Find exams with classrooms assigned but still in WAITING_FOR_PLACES status
        incorrect_exams = Exam.objects.filter(
            classroom__isnull=False,
            status=Exam.Status.WAITING_FOR_PLACES
        )
        
        self.stdout.write(f"Found {incorrect_exams.count()} exams with classrooms assigned but in WAITING_FOR_PLACES status")
        
        # If in dry-run mode, just list the exams without making changes
        if dry_run:
            for exam in incorrect_exams:
                self.stdout.write(f"Would update: Exam {exam.id}: {exam.course} {exam.get_type_display()} on {exam.date.strftime('%Y-%m-%d %H:%M')}")
            return
        
        # Otherwise, update the exams
        updated_count = 0
        for exam in incorrect_exams:
            # Save the old status for logging
            old_status = exam.status
            
            # Update status to AWAITING_PROCTORS
            exam.status = Exam.Status.AWAITING_PROCTORS
            exam.save(update_fields=['status'])
            updated_count += 1
            
            # Log the change
            AuditLog.objects.create(
                user=None,  # System action - no user
                action='UPDATE',
                object_type='Exam',
                object_id=exam.id,
                description=f"System update: Exam status changed from {old_status} to {exam.status} by fix_exam_statuses command",
            )
            
            self.stdout.write(self.style.SUCCESS(f"Updated: Exam {exam.id}: {exam.course} {exam.get_type_display()} - Status changed from {old_status} to {exam.status}"))
        
        self.stdout.write(self.style.SUCCESS(f"Successfully updated {updated_count} exam statuses")) 