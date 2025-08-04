import axios from 'axios';

// Base API configuration
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'your-production-api-url' 
  : 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include cookies for session auth
});

// Helper functions
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('token', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
  }
};

export const getAuthToken = () => {
  return localStorage.getItem('token');
};

export const isAuthenticated = () => {
  const token = getAuthToken();
  if (!token) return false;
  
  try {
    // Simple check - in production you might want to verify expiration
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch (error) {
    return false;
  }
};

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only handle 401 errors for specific conditions
    if (error.response?.status === 401 && 
        !originalRequest.url?.includes('/refresh-token') &&
        !originalRequest.url?.includes('/register') &&
        !originalRequest.url?.includes('/login') &&
        !originalRequest.url?.includes('/logout')) {
      
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Use full URL for refresh to avoid interceptor confusion
        const refreshResponse = await axios.post(`${API_BASE_URL}/api/auth/refresh-token`, {}, {
          withCredentials: true
        });
        
        if (refreshResponse.data?.token) {
          const newToken = refreshResponse.data.token;
          setAuthToken(newToken);
          processQueue(null, newToken);
          
          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        } else {
          throw new Error('No token in refresh response');
        }
      } catch (refreshError) {
        // Refresh failed, clear token and redirect
        processQueue(refreshError, null);
        setAuthToken(null);
        
        // Only redirect if not already on auth pages
        if (!window.location.pathname.includes('/login') && 
            !window.location.pathname.includes('/register')) {
          window.location.href = '/login';
        }
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Authentication API services
export const authAPI = {
  register: (userData) => api.post('/api/auth/register', userData),
  login: (credentials) => api.post('/api/auth/login', credentials),
  logout: () => api.post('/api/auth/logout'),
  getCurrentUser: () => api.get('/api/auth/me'),
  refreshToken: () => api.post('/api/auth/refresh-token'),
  forgotPassword: (email) => api.post('/api/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/api/auth/reset-password', data),
  checkAuthStatus: () => api.get('/api/auth/status'),
  
  // OAuth disconnect
  disconnectGoogle: () => api.delete('/api/auth/google/disconnect'),
  disconnectFacebook: () => api.delete('/api/auth/facebook/disconnect'),
};

// User API services
export const userAPI = {
  getProfile: () => api.get('/api/users/profile'),
  updateProfile: (profileData) => api.put('/api/users/profile', profileData),
  uploadProfilePicture: (formData) => api.post('/api/uploads/upload-profile-picture', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  getCurrentlyReading: () => api.get('/api/users/currently-reading'),
  addToCurrentlyReading: (bookId) => api.post('/api/users/currently-reading', { bookId }),
  removeFromCurrentlyReading: (bookId) => api.delete(`/api/users/currently-reading/${bookId}`),
};

// Book API services
export const bookAPI = {
  getBookshelf: () => api.get('/api/books'),
  addBook: (bookData) => api.post('/api/books', bookData),
  updateBook: (bookId, bookData) => api.put(`/api/books/${bookId}`, bookData),
  deleteBook: (bookId) => api.delete(`/api/books/${bookId}`),
};

// Health check
export const healthCheck = () => api.get('/api/health');

export default api;
