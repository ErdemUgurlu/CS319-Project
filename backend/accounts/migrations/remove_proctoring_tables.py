from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [
        ('accounts', '0011_alter_exam_status'),
    ]

    operations = [
        migrations.RunSQL(
            # Forward SQL (apply migration)
            """
            DROP TABLE IF EXISTS proctoring_proctorconstraint;
            DROP TABLE IF EXISTS proctoring_proctorcriteria;
            DROP TABLE IF EXISTS proctoring_proctorpreference;
            DROP TABLE IF EXISTS proctoring_proctorschedule;
            DROP TABLE IF EXISTS proctoring_proctorqualification;
            DROP TABLE IF EXISTS proctoring_proctorassignment;
            DROP TABLE IF EXISTS proctoring_swaprequest;
            DROP TABLE IF EXISTS proctoring_examroom;
            """,
            # Reverse SQL (for rollback) - no action since tables can't be restored
            "SELECT 1;"
        ),
    ] 