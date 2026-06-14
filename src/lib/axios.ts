import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getSession, signOut } from 'next-auth/react';
import { toast } from 'sonner';

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1';
console.log(apiBaseUrl)
type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  _skipToast?: boolean;
  _toastSuccessMessage?: string;
  _toastErrorMessage?: string;
};

type BackendErrorResponse = {
  success?: boolean;
  message?: string;
  code?: string;
};

type BackendSuccessResponse = {
  success?: boolean;
  message?: string;
};

const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

const isAuthEndpoint = (url?: string): boolean => {
  if (!url) return false;

  return (
    url.includes('/auth/login') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/logout')
  );
};

const isMutationMethod = (method?: string): boolean => {
  return ['post', 'put', 'patch', 'delete'].includes(
    String(method || '').toLowerCase(),
  );
};

const readConfigHeader = (
  config: InternalAxiosRequestConfig,
  headerName: string,
): string | undefined => {
  const headers = config.headers as any;

  if (!headers) return undefined;

  if (typeof headers.get === 'function') {
    return headers.get(headerName) || headers.get(headerName.toLowerCase());
  }

  return headers[headerName] || headers[headerName.toLowerCase()];
};

const deleteConfigHeader = (
  config: InternalAxiosRequestConfig,
  headerName: string,
): void => {
  const headers = config.headers as any;

  if (!headers) return;

  if (typeof headers.delete === 'function') {
    headers.delete(headerName);
    headers.delete(headerName.toLowerCase());
    return;
  }

  delete headers[headerName];
  delete headers[headerName.toLowerCase()];
};

const isTruthyHeader = (value?: string): boolean => {
  return ['1', 'true', 'yes'].includes(String(value || '').toLowerCase());
};

const getBackendSuccessMessage = (data: unknown): string => {
  const response = data as BackendSuccessResponse | undefined;

  return response?.message || '';
};

const getBackendErrorMessage = (
  error: AxiosError<BackendErrorResponse>,
): string => {
  return (
    error.response?.data?.message ||
    error.message ||
    'خطای غیرمنتظره‌ای رخ داده است.'
  );
};

const getActionSuccessMessage = (
  method?: string,
  url?: string,
  responseData?: unknown,
  customMessage?: string,
): string => {
  if (customMessage) return customMessage;

  const backendMessage = getBackendSuccessMessage(responseData);

  if (backendMessage) return backendMessage;

  const normalizedMethod = String(method || '').toLowerCase();
  const normalizedUrl = String(url || '').toLowerCase();

  if (normalizedMethod === 'post' && normalizedUrl.includes('/files')) {
    return 'فایل با موفقیت آپلود شد.';
  }

  if (normalizedMethod === 'post' && normalizedUrl.includes('/notes')) {
    return 'گزارش کار با موفقیت ثبت شد.';
  }

  if (normalizedMethod === 'post' && normalizedUrl.includes('/tasks')) {
    return 'وظیفه با موفقیت ایجاد شد.';
  }

  if (normalizedMethod === 'patch' && normalizedUrl.includes('/tasks')) {
    return 'وظیفه با موفقیت بروزرسانی شد.';
  }

  if (normalizedMethod === 'post' && normalizedUrl.includes('/projects')) {
    return 'پروژه با موفقیت ایجاد شد.';
  }

  if (normalizedMethod === 'patch' && normalizedUrl.includes('/projects')) {
    return 'پروژه با موفقیت بروزرسانی شد.';
  }

  if (normalizedMethod === 'post' && normalizedUrl.includes('/users')) {
    return 'کاربر با موفقیت ایجاد شد.';
  }

  if (normalizedMethod === 'patch' && normalizedUrl.includes('/users')) {
    return 'کاربر با موفقیت بروزرسانی شد.';
  }

  if (normalizedMethod === 'delete' && normalizedUrl.includes('/users')) {
    return 'کاربر با موفقیت غیرفعال شد.';
  }

  if (normalizedMethod === 'delete') {
    return 'حذف با موفقیت انجام شد.';
  }

  if (normalizedMethod === 'patch' || normalizedMethod === 'put') {
    return 'تغییرات با موفقیت ذخیره شد.';
  }

  return 'عملیات با موفقیت انجام شد.';
};

apiClient.interceptors.request.use(async (config) => {
  const toastableConfig = config as RetryableRequestConfig;

  toastableConfig._skipToast = isTruthyHeader(
    readConfigHeader(config, 'X-Skip-Toast'),
  );

  toastableConfig._toastSuccessMessage = readConfigHeader(
    config,
    'X-Toast-Success-Message',
  );

  toastableConfig._toastErrorMessage = readConfigHeader(
    config,
    'X-Toast-Error-Message',
  );

  deleteConfigHeader(config, 'X-Skip-Toast');
  deleteConfigHeader(config, 'X-Toast-Success-Message');
  deleteConfigHeader(config, 'X-Toast-Error-Message');

  const session = await getSession();

  if (session?.error === 'RefreshAccessTokenError') {
    toast.error('نشست شما منقضی شده است. دوباره وارد شوید.');

    await signOut({
      callbackUrl: '/auth/login',
      redirect: true,
    });

    return config;
  }

  if (session?.accessToken) {
    config.headers.Authorization = `Bearer ${session.accessToken}`;
  } else {
    delete config.headers.Authorization;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    const config = response.config as RetryableRequestConfig;

    if (
      !config._skipToast &&
      !isAuthEndpoint(config.url) &&
      isMutationMethod(config.method)
    ) {
      toast.success(
        getActionSuccessMessage(
          config.method,
          config.url,
          response.data,
          config._toastSuccessMessage,
        ),
      );
    }

    return response;
  },
  async (error: AxiosError<BackendErrorResponse>) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;

    const status = error.response?.status;
    const code = error.response?.data?.code;

    const isAccessTokenError =
      status === 401 &&
      ['INVALID_ACCESS_TOKEN', 'ACCESS_TOKEN_REQUIRED'].includes(code || '');

    const shouldShowErrorToast =
      originalRequest &&
      !originalRequest._skipToast &&
      !isAuthEndpoint(originalRequest.url);

    if (!originalRequest || isAuthEndpoint(originalRequest.url)) {
      return Promise.reject(error);
    }

    if (!isAccessTokenError) {
      if (shouldShowErrorToast) {
        toast.error(
          originalRequest._toastErrorMessage || getBackendErrorMessage(error),
        );
      }

      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      toast.error('نشست شما منقضی شده است. دوباره وارد شوید.');

      await signOut({
        callbackUrl: '/auth/login',
        redirect: true,
      });

      return Promise.reject(error);
    }

    originalRequest._retry = true;

    const session = await getSession();

    if (!session?.accessToken || session.error === 'RefreshAccessTokenError') {
      toast.error('نشست شما منقضی شده است. دوباره وارد شوید.');

      await signOut({
        callbackUrl: '/auth/login',
        redirect: true,
      });

      return Promise.reject(error);
    }

    originalRequest.headers.Authorization = `Bearer ${session.accessToken}`;

    return apiClient(originalRequest);
  },
);

export default apiClient;