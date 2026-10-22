import axios from 'axios';
import { auth } from '../firebase/firebase';

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ||
    'https://wastmanagement-bknd-5vth.onrender.com/api',
  timeout: 10000,
});

api.interceptors.request.use(
  async (config) => {
    const isLoginRequest = config.url === '/v1/auth/login';

    // Login requires Firebase ID token
    if (isLoginRequest) {
      const user = auth.currentUser;

      if (user) {
        try {
          const firebaseToken = await user.getIdToken();

          config.headers.Authorization = `Bearer ${firebaseToken}`;
        } catch (error) {
          console.error(
            'Failed to retrieve Firebase ID token:',
            error
          );
        }
      }

      return config;
    }

    // All other APIs use your backend JWT
    const token = localStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export default api;