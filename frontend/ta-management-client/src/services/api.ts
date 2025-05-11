import axios from 'axios';

// Create a base axios instance with configurations
const rawApiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
const API_URL = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to attach the JWT token to every request
api.interceptors.request.use(
  (config) => {
    // Always get the latest token from localStorage
    const token = localStorage.getItem('access_token');
    
    // Log the auth status (in development only)
    if (process.env.NODE_ENV !== 'production') {
      console.log(`API Request to ${config.url} - Auth token present: ${!!token}`);
    }
    
    if (token) {
      // Ensure the headers object exists
      config.headers = config.headers || {};
      // Set the Authorization header with the token
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Log the full URL being called for debugging
    // const originalUrl = config.url; // This line will be removed
    
    // Fix for double 'api/' in the URL - apply to ALL urls
    if (config.url && config.url.startsWith('api/')) {
      config.url = config.url.replace('api/', '');
      console.log('URL fixed to avoid double api/ prefix:', config.url);
    }
    
    // Print the final URL for debugging
    // console.log('Final request URL:', `${API_URL}${config.url ? ('/' + config.url) : ''}`);
    let actualRequestUrlDisplay = API_URL;
    if (config.url) {
      // Our API_URL (baseURL) has no trailing slash.
      // config.url (the path) has a leading slash.
      // Axios concatenates these: API_URL + config.url
      actualRequestUrlDisplay = API_URL + config.url;
    }
    console.log('Axios effective request URL (for logging):', actualRequestUrlDisplay);
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Ensure error.response exists
    if (!error.response) {
      console.error('Network error or server not responding');
      return Promise.reject(error);
    }
    
    // If the error is 401 (Unauthorized) and we haven't retried yet
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Get the refresh token from local storage
        const refreshToken = localStorage.getItem('refresh_token');
        
        if (!refreshToken) {
          // No refresh token available, user must login again
          console.log('No refresh token available, redirecting to login');
          localStorage.removeItem('access_token');
          window.location.href = '/login';
          return Promise.reject(error);
        }
        
        // Attempt to refresh the token
        console.log('Attempting to refresh token');
        const response = await axios.post(`${API_URL}/token/refresh/`, {
          refresh: refreshToken,
        });
        
        // If successful, save the new tokens
        const { access } = response.data;
        localStorage.setItem('access_token', access);
        console.log('Token refreshed successfully');
        
        // Retry the original request with the new token
        originalRequest.headers['Authorization'] = `Bearer ${access}`;
        return axios(originalRequest);
      } catch (refreshError) {
        // If refresh fails, redirect to login
        console.error('Failed to refresh token:', refreshError);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    // If not a 401 or we've already retried, reject as normal
    return Promise.reject(error);
  }
);

export default api; 