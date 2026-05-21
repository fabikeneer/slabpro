import axios from 'axios';
import { API_BASE } from './apiBase';

const api = axios.create({
  baseURL: API_BASE || undefined,
  withCredentials: true,
});

// Interceptor: ya no es necesario inyectar el token en headers si usamos cookies
api.interceptors.request.use((config) => {
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
