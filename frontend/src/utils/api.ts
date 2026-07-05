import axios from 'axios';

// Ensure a persistent device fingerprint ID exists
const getOrCreateDeviceId = (): string => {
  let deviceId = localStorage.getItem('agflix_device_id');
  if (!deviceId) {
    // Generate a random secure device token if missing
    deviceId = 'dev_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('agflix_device_id', deviceId);
  }
  return deviceId;
};

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Send secure cookies (JWT refresh tokens)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject client fingerprint and auth tokens on requests
api.interceptors.request.use((config) => {
  const deviceId = getOrCreateDeviceId();
  config.headers['x-device-id'] = deviceId;

  const token = localStorage.getItem('agflix_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Inject current profile if active
  const profileId = localStorage.getItem('agflix_active_profile_id');
  if (profileId) {
    config.headers['x-profile-id'] = profileId;
  }

  return config;
});

// Interceptor to automatically refresh access token on 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const deviceId = getOrCreateDeviceId();
        // Request token refresh
        const res = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          {
            withCredentials: true,
            headers: {
              'x-device-id': deviceId,
            },
          }
        );

        if (res.data && res.data.accessToken) {
          localStorage.setItem('agflix_access_token', res.data.accessToken);
          originalRequest.headers.Authorization = `Bearer ${res.data.accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh token expired or invalid, purge auth and redirect
        localStorage.removeItem('agflix_access_token');
        localStorage.removeItem('agflix_active_profile_id');
        // If on app screen, force reload to land back on login page
        if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);
export default api;
