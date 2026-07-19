import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getSession, signOut } from 'next-auth/react';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:4000/api/v1';

let isRedirectingToLogin = false;

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (typeof window === 'undefined') {
      return config;
    }

    const session = await getSession();

    if (session?.accessToken && !session.error) {
      config.headers.Authorization = `Bearer ${session.accessToken}`;
    } else {
      delete config.headers.Authorization;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<any>) => {
    const status = error.response?.status;
    const code = error.response?.data?.code;
    const requestUrl = String(error.config?.url || '');

    const isAuthRequest =
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/refresh') ||
      requestUrl.includes('/auth/logout');

    const shouldLogout =
      typeof window !== 'undefined' &&
      status === 401 &&
      !isAuthRequest &&
      !isRedirectingToLogin &&
      [
        'ACCESS_TOKEN_REQUIRED',
        'ACCESS_TOKEN_EXPIRED',
        'INVALID_ACCESS_TOKEN',
        'INVALID_REFRESH_TOKEN',
        'REFRESH_TOKEN_REQUIRED',
        'UNAUTHORIZED',
      ].includes(String(code || ''));

    if (shouldLogout) {
      isRedirectingToLogin = true;

      await signOut({
        redirect: false,
      });

      window.location.replace('/auth/login?expired=1');
    }

    return Promise.reject(error);
  },
);

export default api;