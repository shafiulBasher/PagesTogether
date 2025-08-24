import axios from 'axios';

// Simple localhost dev base and production fallback
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? (process.env.REACT_APP_API_URL || (typeof window !== 'undefined' ? window.location.origin : ''))
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
        // Use explicit base URL (localhost in dev) for refresh
        const currentToken = getAuthToken();
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/api/auth/refresh-token`,
          {},
          {
            withCredentials: true,
            headers: currentToken ? { Authorization: `Bearer ${currentToken}` } : {}
          }
        );
        
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

// Group API services
export const groupAPI = {
  getAllGroups: () => api.get('/api/groups'),
  getGroup: (groupId) => api.get(`/api/groups/${groupId}`),
  createGroup: (groupData) => api.post('/api/groups', groupData),
  updateGroup: (groupId, groupData) => api.put(`/api/groups/${groupId}`, groupData),
  deleteGroup: (groupId) => api.delete(`/api/groups/${groupId}`),
  joinGroup: (groupId) => api.post(`/api/groups/${groupId}/join`),
  leaveGroup: (groupId) => api.post(`/api/groups/${groupId}/leave`),
  getGroupPosts: (groupId) => api.get(`/api/groups/${groupId}/posts`),
  createGroupPost: (groupId, postData) => api.post(`/api/groups/${groupId}/posts`, postData),
  updateGroupPost: (groupId, postId, postData) => api.put(`/api/groups/${groupId}/posts/${postId}`, postData),
  deleteGroupPost: (groupId, postId) => api.delete(`/api/groups/${groupId}/posts/${postId}`),
  uploadGroupImage: (groupId, formData) => api.post(`/api/groups/${groupId}/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  // Invitations
  inviteMembers: (groupId, recipients) => api.post(`/api/groups/${groupId}/invite`, { recipients }),
  acceptInvite: (groupId, notificationId) => api.post(`/api/groups/${groupId}/invitations/accept`, { notificationId }),
  declineInvite: (groupId, notificationId) => api.post(`/api/groups/${groupId}/invitations/decline`, { notificationId }),
};

// Convenience exports for group functions to match Community.js imports
export const getGroup = (groupId) => groupAPI.getGroup(groupId);
export const joinGroup = (groupId) => groupAPI.joinGroup(groupId);
export const leaveGroup = (groupId) => groupAPI.leaveGroup(groupId);
export const getGroupPosts = (groupId) => groupAPI.getGroupPosts(groupId);
export const createGroupPost = (groupId, postData) => groupAPI.createGroupPost(groupId, postData);
export const deleteGroupPost = (groupId, postId) => groupAPI.deleteGroupPost(groupId, postId);
export const uploadGroupImage = (groupId, formData) => groupAPI.uploadGroupImage(groupId, formData);

// Health check
export const healthCheck = () => api.get('/api/health');

// Social API services
export const socialAPI = {
  // Friend Requests
  sendFriendRequest: (userId, message) => api.post('/api/social/friend-request', { userId, message }),
  getFriendRequests: () => api.get('/api/social/friend-requests'),
  respondToFriendRequest: (requestId, action) => api.post(`/api/social/friend-request/${requestId}/respond`, { action }),
  
  // Friends
  getFriends: (userId = null) => api.get(userId ? `/api/social/friends/${userId}` : '/api/social/friends'),
  removeFriend: (friendId) => api.delete(`/api/social/friend/${friendId}`),
  
  // Following
  followUser: (userId) => api.post(`/api/social/follow/${userId}`),
  unfollowUser: (userId) => api.post(`/api/social/unfollow/${userId}`),
  getFollowing: (userId = null) => api.get(userId ? `/api/social/following/${userId}` : '/api/social/following'),
  getFollowers: (userId = null) => api.get(userId ? `/api/social/followers/${userId}` : '/api/social/followers'),
  
  // Search & Discovery
  searchUsers: (query) => api.get(`/api/social/search?q=${encodeURIComponent(query)}`),
  getUserProfile: (userId) => api.get(`/api/social/profile/${userId}`)
};

// Notification API
export const notificationAPI = {
  // Get notifications
  getNotifications: () => api.get('/api/notifications'),
  getUnreadCount: () => api.get('/api/notifications/count'),
  
  // Mark as read
  markAsRead: (notificationId) => api.patch(`/api/notifications/${notificationId}/read`),
  markAllAsRead: () => api.patch('/api/notifications/read-all')
};

export default api;
