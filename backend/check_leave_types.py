from leaves.models import LeaveType

print("Leave Types in DB:")
if LeaveType.objects.exists():
    for lt in LeaveType.objects.all():
        print(f"  ID: {lt.id}, Name: {lt.name}, Requires Doc: {lt.requires_documentation}")
else:
    print("  No leave types found in the database.") 