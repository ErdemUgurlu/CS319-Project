from rest_framework import permissions

class IsEmailVerifiedOrExempt(permissions.BasePermission):
    """
    Permission to allow only users with verified emails, except admins and authorized staff
    """
    
    def has_permission(self, request, view):
        user = request.user
        
        # If user is not authenticated, deny access
        if not user or not user.is_authenticated:
            return False
            
        # Admin, staff ve dean's office için email doğrulama zorunlu değil
        if user.role in ['ADMIN', 'STAFF', 'DEAN_OFFICE']:
            return True
            
        # Diğer kullanıcılar (TA, INSTRUCTOR) için email doğrulama gerekli
        return user.email_verified

class IsStaffOrInstructor(permissions.BasePermission):
    """
    Custom permission to only allow staff and instructors to access a view.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['STAFF', 'ADMIN', 'INSTRUCTOR'] 