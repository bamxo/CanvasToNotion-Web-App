import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import axios from 'axios'
import { AUTH_ENDPOINTS } from './utils/api'
import { secureGetToken, secureStoreToken, secureRemoveToken } from './utils/encryption'

// Configure axios to always send credentials with requests
axios.interceptors.request.use((config) => {
  config.withCredentials = true;
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

const refreshAuthToken = async (): Promise<string | null> => {
  const refreshToken = secureGetToken('refreshToken');
  if (!refreshToken) return null;

  try {
    const response = await axios.post(
      AUTH_ENDPOINTS.REFRESH,
      { refreshToken },
      { withCredentials: true }
    );

    if (!response.data?.idToken) return null;

    secureStoreToken('authToken', response.data.idToken);
    if (response.data.refreshToken) {
      secureStoreToken('refreshToken', response.data.refreshToken);
    }
    return response.data.idToken;
  } catch {
    secureRemoveToken('authToken');
    secureRemoveToken('refreshToken');
    return null;
  }
};

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthEndpoint =
      originalRequest?.url?.includes('/auth/refresh') ||
      originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/signup') ||
      originalRequest?.url?.includes('/auth/google');

    if (error.response?.status !== 401 || !originalRequest || originalRequest._retriedAfterRefresh || isAuthEndpoint) {
      return Promise.reject(error);
    }

    originalRequest._retriedAfterRefresh = true;

    if (!refreshPromise) {
      refreshPromise = refreshAuthToken().finally(() => {
        refreshPromise = null;
      });
    }

    const newIdToken = await refreshPromise;
    if (!newIdToken) {
      return Promise.reject(error);
    }

    if (originalRequest.headers?.Authorization) {
      originalRequest.headers.Authorization = `Bearer ${newIdToken}`;
    }
    return axios(originalRequest);
  }
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
