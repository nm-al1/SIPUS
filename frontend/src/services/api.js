import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.PROD
    ? '/api'
    : import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
});
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token) config.headers.Authorization = 'Bearer ' + token;
  return config;
});
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401 && error.config?.url !== '/login') {
      sessionStorage.removeItem('token');
      if (location.pathname !== '/login') location.assign('/login');
    }
    return Promise.reject(
      new Error(
        error.response?.data?.message ||
          'Server tidak dapat dihubungi. Periksa koneksi, lalu coba lagi.',
      ),
    );
  },
);
export default api;
