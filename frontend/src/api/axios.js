import axios from 'axios';

const rawApiUrl = import.meta.env.VITE_API_URL;
const normalizedApiUrl = rawApiUrl
  ? `${rawApiUrl.replace(/\/+$|\/api$/g, '').replace(/\/$/, '')}/api`
  : 'http://localhost:5000/api';

const api = axios.create({
  baseURL: normalizedApiUrl,
  withCredentials: true,
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('dw_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally - auto logout
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('dw_token');
      localStorage.removeItem('dw_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
