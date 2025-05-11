import axios from 'axios';

// Configure axios to work with the backend API
axios.defaults.baseURL = 'http://localhost:8000';
axios.defaults.withCredentials = true;  // Important for CORS with credentials
axios.defaults.headers.common['Content-Type'] = 'application/json';
axios.defaults.headers.common['Accept'] = 'application/json';

// Add request interceptor to include authentication token if available
axios.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method.toUpperCase()} request to: ${config.url}`);
    
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add CORS headers directly to requests
    config.headers['Access-Control-Allow-Origin'] = '*';
    config.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
    config.headers['Access-Control-Allow-Headers'] = 'Origin, Content-Type, Accept, Authorization, X-Request-With';
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for better error handling
axios.interceptors.response.use(
  (response) => {
    console.log(`Response from ${response.config.url}:`, response.status);
    return response;
  },
  (error) => {
    if (error.response) {
      console.error(`API error (${error.response.status}):`, error.response.data);
    } else if (error.request) {
      console.error('API error: No response received', error.request);
    } else {
      console.error('API error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default axios; 