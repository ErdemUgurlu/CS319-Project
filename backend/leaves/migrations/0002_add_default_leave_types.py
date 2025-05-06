from django.db import migrations

def create_default_leave_types(apps, schema_editor):
    LeaveType = apps.get_model('leaves', 'LeaveType')
    
    # Sick Leave
    LeaveType.objects.create(
        name='Sick Leave',
        description='Leave due to illness or medical appointments',
        requires_documentation=True,
        max_days_per_semester=10
    )
    
    # Personal Leave
    LeaveType.objects.create(
        name='Personal Leave',
        description='Leave for personal reasons',
        requires_documentation=False,
        max_days_per_semester=5
    )
    
    # Academic Leave
    LeaveType.objects.create(
        name='Academic Leave',
        description='Leave for academic events, conferences, or exams',
        requires_documentation=True,
        max_days_per_semester=3
    )
    
    # Emergency Leave
    LeaveType.objects.create(
        name='Emergency Leave',
        description='Leave for emergency situations',
        requires_documentation=True,
        max_days_per_semester=5
    )

def remove_default_leave_types(apps, schema_editor):
    LeaveType = apps.get_model('leaves', 'LeaveType')
    LeaveType.objects.filter(name__in=[
        'Sick Leave', 
        'Personal Leave', 
        'Academic Leave', 
        'Emergency Leave'
    ]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('leaves', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(create_default_leave_types, remove_default_leave_types),
    ] 