from leaves.models import LeaveType

# Define leave types that match the frontend's hardcoded types
leave_types = [
    {"id": 1, "name": "Sick Leave", "description": "For medical issues", "requires_documentation": True},
    {"id": 2, "name": "Academic Leave", "description": "For academic events", "requires_documentation": True},
    {"id": 3, "name": "Personal Leave", "description": "For personal matters", "requires_documentation": False},
    {"id": 4, "name": "Family Emergency", "description": "For family emergencies", "requires_documentation": True},
    {"id": 5, "name": "Conference Leave", "description": "For conferences", "requires_documentation": True}
]

# Create or update each leave type
for lt_data in leave_types:
    try:
        # Try to get the existing leave type
        lt, created = LeaveType.objects.get_or_create(
            id=lt_data["id"],
            defaults={
                "name": lt_data["name"],
                "description": lt_data["description"],
                "requires_documentation": lt_data["requires_documentation"]
            }
        )
        
        if created:
            print(f"Created: {lt}")
        else:
            # Update fields if it already exists
            lt.name = lt_data["name"]
            lt.description = lt_data["description"]
            lt.requires_documentation = lt_data["requires_documentation"]
            lt.save()
            print(f"Updated: {lt}")
            
    except Exception as e:
        print(f"Error creating/updating {lt_data['name']}: {e}")

# Verify all leave types
print("\nLeave Types after script:")
for lt in LeaveType.objects.all():
    print(f"ID: {lt.id}, Name: {lt.name}, Requires Doc: {lt.requires_documentation}") 