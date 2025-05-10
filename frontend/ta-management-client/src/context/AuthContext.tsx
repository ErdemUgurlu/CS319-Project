import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import authService, { 
  LoginCredentials, 
  AuthState, 
  TokenPayload 
} from '../services/authService';

// Default auth state
const defaultAuthState: AuthState = {
  isAuthenticated: false,
  user: null,
  loading: true,
  error: null
};

// Create the context with default values
const AuthContext = createContext<{
  authState: AuthState;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}>({
  authState: defaultAuthState,
  login: async () => {},
  logout: () => {},
  clearError: () => {}
});

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>(defaultAuthState);

  // Initialize auth state on component mount
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const user = authService.getCurrentUser();
        setAuthState({
          isAuthenticated: !!user,
          user,
          loading: false,
          error: null
        });
      } catch (error) {
        console.error('Failed to initialize auth state:', error);
        setAuthState({
          isAuthenticated: false,
          user: null,
          loading: false,
          error: 'Failed to initialize authentication'
        });
      }
    };
    
    initializeAuth();
  }, []);

  // Login function
  const login = async (credentials: LoginCredentials) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const user = await authService.login(credentials);
      setAuthState({
        isAuthenticated: true,
        user,
        loading: false,
        error: null
      });
    } catch (error: any) {
      setAuthState({
        isAuthenticated: false,
        user: null,
        loading: false,
        error: error.response?.data?.detail || 'Login failed'
      });
    }
  };

  // Logout function
  const logout = () => {
    authService.logout();
    setAuthState({
      isAuthenticated: false,
      user: null,
      loading: false,
      error: null
    });
  };

  // Clear error function
  const clearError = () => {
    setAuthState(prev => ({ ...prev, error: null }));
  };

  return (
    <AuthContext.Provider value={{ authState, login, logout, clearError }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext; 