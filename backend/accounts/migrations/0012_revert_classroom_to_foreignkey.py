import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0011_alter_exam_status'),  # Latest migration in the main Exam model evolution
        ('accounts', '0007_remove_exam_classroom_exam_classrooms'), # The migration whose effects we are countering
    ]

    operations = [
        # Add the ForeignKey 'classroom' back.
        # This definition matches the one in 0008_exam.py and the current model.
        # No explicit related_name, so it defaults to 'exam_set' on Classroom.
        migrations.AddField(
            model_name='exam',
            name='classroom',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                to='accounts.classroom'
            ),
        ),
        # Remove the ManyToManyField 'classrooms' that was added by 0007_remove_exam_classroom_exam_classrooms.
        migrations.RemoveField(
            model_name='exam',
            name='classrooms',
        ),
        # It's possible the original ForeignKey was also named 'classroom'
        # If the AddField above fails due to the related_name on 'accounts.classroom' already being 'exams'
        # from the M2M field, we might need to rename the related_name on the ForeignKey after the M2M is dropped.
        # However, Django might handle this gracefully if the M2M's related_name was 'exams' and
        # the ForeignKey's original related_name on Classroom was also 'exams'.
        # For now, let's assume this is enough. If not, we'll add a SeparateDatabaseAndState operation
        # or an AlterField to correct the related_name of the new 'classroom' field to its original if needed.
        # The original related_name for the FK was 'exams' as per model definition:
        # course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='exams') <-- this is for Course, not Classroom
        # classroom = models.ForeignKey(Classroom, on_delete=models.SET_NULL, null=True, blank=True) <-- No explicit related_name here, so it defaults to `exam_set`
        # The M2M related_name was 'exams'.
        # The FK in 0008_exam.py had no explicit related_name either.
        # So, the AddField for 'classroom' should ideally not have a related_name, or one that won't conflict.
        # Let's remove related_name from AddField for 'classroom' for now, allowing default.
        # If we need to set data from the old 'classrooms' M2M to the new 'classroom' FK,
        # that would require a RunPython operation, which is more complex.
        # The current goal is to fix the schema mismatch.
    ] 