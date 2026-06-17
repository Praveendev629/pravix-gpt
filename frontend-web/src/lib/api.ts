import axios from 'axios';

// Fallback to the deployed backend if env var is not set
const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://pravix-gpt-backend.vercel.app';

const api = axios.create({
  baseURL: BASE_URL,
  // ⚠️ withCredentials removed — backend uses JWT Bearer tokens, not cookies.
  // Keeping withCredentials:true on a cross-origin request forces the browser
  // to require Access-Control-Allow-Origin to match exactly (no wildcard, no
  // trailing slash), which was causing all requests to be blocked by CORS.
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('pravix_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('pravix_token');
      localStorage.removeItem('pravix_user');
      window.location.href = '/auth/login';
    }
    return Promise.reject(err);
  }
);

export default api;
