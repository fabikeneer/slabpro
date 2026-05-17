import axios from 'axios';
import { API_BASE } from './apiBase';

const api = axios.create({
  baseURL: API_BASE || undefined,
});

// Interceptor: adjunta el JWT a cada petición automáticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('slabpro_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor de respuesta: si el token expiró, redirige al login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('slabpro_token');
      localStorage.removeItem('slabpro_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
