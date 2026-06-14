import apiClient from '@/lib/axios';
import { AppUser, UserListResponse, UserPayload } from '@/types/user';

type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  pagination?: UserListResponse['pagination'];
};

type ListUsersParams = {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
  isActive?: boolean;
  managerId?: string;
};

const defaultPagination = {
  total: 0,
  page: 1,
  limit: 20,
  totalPages: 1,
};

const unwrapData = <T>(responseData: ApiResponse<T> | T): T => {
  if (
    responseData &&
    typeof responseData === 'object' &&
    'data' in responseData
  ) {
    return (responseData as ApiResponse<T>).data as T;
  }

  return responseData as T;
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  const err = error as {
    response?: {
      data?: {
        message?: string;
      };
    };
    message?: string;
  };

  return err.response?.data?.message || err.message || fallback;
};

const normalizeListResponse = (
  responseData: ApiResponse<AppUser[]> | AppUser[],
): UserListResponse => {
  if (Array.isArray(responseData)) {
    return {
      items: responseData,
      pagination: defaultPagination,
    };
  }

  return {
    items: Array.isArray(responseData.data) ? responseData.data : [],
    pagination: responseData.pagination || defaultPagination,
  };
};

export const userService = {
  async listUsers(params?: ListUsersParams): Promise<AppUser[]> {
    try {
      const response = await apiClient.get('/users', {
        params: {
          page: 1,
          limit: 100,
          ...params,
        },
      });

      const normalized = normalizeListResponse(response.data);

      return normalized.items;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'خطا در دریافت کاربران'));
    }
  },

  async listUsersPaginated(params?: ListUsersParams): Promise<UserListResponse> {
    try {
      const response = await apiClient.get('/users', {
        params: {
          page: 1,
          limit: 20,
          ...params,
        },
      });

      return normalizeListResponse(response.data);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'خطا در دریافت کاربران'));
    }
  },

  async getCurrentUser(): Promise<AppUser> {
    try {
      const response = await apiClient.get('/users/me');

      return unwrapData<AppUser>(response.data);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'خطا در دریافت اطلاعات کاربر جاری'));
    }
  },

  async getUser(userId: string): Promise<AppUser> {
    try {
      const response = await apiClient.get(`/users/${userId}`);

      return unwrapData<AppUser>(response.data);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'خطا در دریافت اطلاعات کاربر'));
    }
  },

  async createUser(payload: UserPayload): Promise<AppUser> {
    try {
      const response = await apiClient.post('/users', payload);

      return unwrapData<AppUser>(response.data);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'خطا در ایجاد کاربر'));
    }
  },

  async updateUser(
    userId: string,
    payload: Partial<UserPayload>,
  ): Promise<AppUser> {
    try {
      const response = await apiClient.patch(`/users/${userId}`, payload);

      return unwrapData<AppUser>(response.data);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'خطا در ویرایش کاربر'));
    }
  },

  async deleteUser(userId: string): Promise<AppUser> {
    try {
      const response = await apiClient.delete(`/users/${userId}`);

      return unwrapData<AppUser>(response.data);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'خطا در غیرفعال‌سازی کاربر'));
    }
  },
};