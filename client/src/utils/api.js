import axios from 'axios';
import { API_BASE } from './apiBase';
import { getToken } from './authStorage';

const api = axios.create({
  baseURL: API_BASE || undefined,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      const isAuthCheck = url.includes('/api/auth/settings/me');
      const isLogin = url.includes('/api/auth/login');
      if (!isAuthCheck && !isLogin && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
