import api from './api';
import jwtDecode from "jwt-decode";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegistrationData {
  email: string;
  password: string;
  password_confirm: string;
  first_name: string;
  last_name: string;
  role: string;
  phone: string;
  iban?: string;
  academic_level?: string;
  employment_type?: string;
}

export interface TokenPayload {
  user_id: number;
  email: string;
  role: string;
  exp: number;
  first_name: string;
  last_name: string;
  is_approved: boolean;
  email_verified: boolean;
  department: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: TokenPayload | null;
  loading: boolean;
  error: string | null;
}

class AuthService {
  async login(credentials: LoginCredentials) {
    console.log('Attempting login with credentials:', { email: credentials.email, passwordLength: credentials.password.length });
    
    try {
      console.log('Making API request to /token/');
      const response = await api.post('/token/', credentials);
      console.log('Login API response:', response.data);
      
      const { access, refresh } = response.data;
      
      // Store tokens in localStorage
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      
      console.log('Tokens stored in localStorage, getting current user');
      const user = this.getCurrentUser();
      console.log('Current user after login:', user);
      
      return user;
    } catch (error: any) {
      console.error('Login error details:', { 
        message: error.message,
        response: error.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        } : 'No response',
        request: error.request ? 'Request was made but no response received' : 'Request setup error'
      });
      throw error;
    }
  }
  
  async register(userData: RegistrationData) {
    return await api.post('/accounts/register/', userData);
  }
  
  async verifyEmail(token: string) {
    return await api.get(`/accounts/verify-email/${token}/`);
  }
  
  async requestPasswordReset(email: string) {
    return await api.post('/accounts/request-password-reset/', { email });
  }
  
  async resetPassword(token: string, password: string) {
    return await api.post(`/accounts/reset-password/${token}/`, { password });
  }
  
  async checkEmailExists(email: string) {
    return await api.post('/accounts/check-email-exists/', { email });
  }
  
  async createTAFromEmail(email: string) {
    return await api.post('/accounts/create-ta-from-email/', { email });
  }
  
  async changePassword(oldPassword: string, newPassword: string) {
    return await api.post('/accounts/change-password/', {
      old_password: oldPassword,
      new_password: newPassword,
      new_password_confirm: newPassword,
    });
  }
  
  getCurrentUser() {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return null;
      
      // Decode the token to get user information
      const decoded = jwtDecode<any>(token);
      console.log('Full token payload:', decoded);
      
      // Check if token is expired
      const currentTime = Date.now() / 1000;
      if (decoded.exp < currentTime) {
        this.logout();
        return null;
      }
      
      // Create a standard user object from the token payload
      // Looking for the role in different possible locations
      const userPayload: TokenPayload = {
        user_id: decoded.user_id || decoded.id || decoded.sub || 0,
        email: decoded.email || '',
        role: decoded.role || (decoded.user_data && decoded.user_data.role) || 'ADMIN', // Default to ADMIN if role not found
        exp: decoded.exp || 0,
        first_name: decoded.first_name || (decoded.user_data && decoded.user_data.first_name) || '',
        last_name: decoded.last_name || (decoded.user_data && decoded.user_data.last_name) || '',
        is_approved: decoded.is_approved || false,
        email_verified: decoded.email_verified || false,
        department: decoded.department || '',
      };
      
      console.log('Processed user payload:', userPayload);
      return userPayload;
    } catch (error) {
      console.error('Error decoding token:', error);
      this.logout();
      return null;
    }
  }
  
  isAuthenticated() {
    return !!this.getCurrentUser();
  }
  
  getToken() {
    return localStorage.getItem('access_token');
  }
  
  logout() {
    console.log('Logging out user and clearing local storage');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_info');
    
    // Clear any other app data that should be reset on logout
    localStorage.removeItem('debug_schedule');
    
    // Optionally, you can also notify the server about the logout 
    // to invalidate the token on server side if your backend supports this
    // This would be an async call, but we don't need to wait for it
    try {
      api.post('/logout/').catch(() => {
        // Ignore errors on logout - the important part is clearing local data
      });
    } catch (e) {
      // Ignore any errors during logout
    }
  }
  
  getUserRole() {
    const user = this.getCurrentUser();
    return user ? user.role : null;
  }
}

export default new AuthService(); 