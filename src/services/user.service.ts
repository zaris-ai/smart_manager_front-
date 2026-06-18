import apiClient from '@/lib/axios';
import {
  AppUser,
  UserListResponse,
  UserPayload,
  getUserRoleLabel,
  getUserStatusLabel,
  normalizeUserRole,
  normalizeUserStatus,
} from '@/types/user';

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

const normalizeAppUser = (user: AppUser): AppUser => {
  const normalizedRole = normalizeUserRole(user.role);
  const normalizedStatus = normalizeUserStatus(user.status);

  return {
    ...user,
    id: user.id || user._id,
    role: normalizedRole,
    roleLabel: user.roleLabel || getUserRoleLabel(normalizedRole),
    status: normalizedStatus,
    statusLabel: user.statusLabel || getUserStatusLabel(normalizedStatus),
    profile: user.profile || {},
    isActive:
      typeof user.isActive === 'boolean'
        ? user.isActive
        : normalizedStatus === 'active',
  };
};

const normalizePayload = (payload: UserPayload | Partial<UserPayload>) => {
  const normalizedRole = payload.role
    ? normalizeUserRole(payload.role)
    : undefined;

  const normalizedStatus = payload.status
    ? normalizeUserStatus(payload.status)
    : undefined;

  const normalizedPayload: Record<string, unknown> = {
    ...payload,
  };

  if (normalizedRole) {
    normalizedPayload.role = normalizedRole;

    if (normalizedRole !== 'expert') {
      normalizedPayload.managerId = null;
    } else if ('managerId' in payload) {
      normalizedPayload.managerId = payload.managerId || null;
    }
  } else if ('managerId' in payload) {
    normalizedPayload.managerId = payload.managerId || null;
  } else {
    delete normalizedPayload.managerId;
  }

  if (normalizedStatus) {
    normalizedPayload.status = normalizedStatus;
  }

  if ('telegramUsername' in payload) {
    normalizedPayload.telegramUsername =
      typeof payload.telegramUsername === 'string'
        ? payload.telegramUsername.trim().replace(/^@/, '').toLowerCase()
        : payload.telegramUsername;
  }

  return normalizedPayload;
};

const normalizeListResponse = (
  responseData: ApiResponse<AppUser[]> | AppUser[],
): UserListResponse => {
  if (Array.isArray(responseData)) {
    return {
      items: responseData.map(normalizeAppUser),
      pagination: {
        ...defaultPagination,
        total: responseData.length,
        limit: responseData.length || defaultPagination.limit,
        totalPages: 1,
      },
    };
  }

  return {
    items: Array.isArray(responseData.data)
      ? responseData.data.map(normalizeAppUser)
      : [],
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
          role: params?.role ? normalizeUserRole(params.role) : undefined,
          status: params?.status
            ? normalizeUserStatus(params.status)
            : undefined,
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
          role: params?.role ? normalizeUserRole(params.role) : undefined,
          status: params?.status
            ? normalizeUserStatus(params.status)
            : undefined,
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

      return normalizeAppUser(unwrapData<AppUser>(response.data));
    } catch (error) {
      throw new Error(getErrorMessage(error, 'خطا در دریافت اطلاعات کاربر جاری'));
    }
  },

  async getUser(userId: string): Promise<AppUser> {
    try {
      const response = await apiClient.get(`/users/${userId}`);

      return normalizeAppUser(unwrapData<AppUser>(response.data));
    } catch (error) {
      throw new Error(getErrorMessage(error, 'خطا در دریافت اطلاعات کاربر'));
    }
  },

  async createUser(payload: UserPayload): Promise<AppUser> {
    try {
      const response = await apiClient.post('/users', normalizePayload(payload));

      return normalizeAppUser(unwrapData<AppUser>(response.data));
    } catch (error) {
      throw new Error(getErrorMessage(error, 'خطا در ایجاد کاربر'));
    }
  },

  async updateUser(
    userId: string,
    payload: Partial<UserPayload>,
  ): Promise<AppUser> {
    try {
      const response = await apiClient.patch(
        `/users/${userId}`,
        normalizePayload(payload),
      );

      return normalizeAppUser(unwrapData<AppUser>(response.data));
    } catch (error) {
      throw new Error(getErrorMessage(error, 'خطا در ویرایش کاربر'));
    }
  },

  async activateUser(userId: string): Promise<AppUser> {
    try {
      const response = await apiClient.patch(`/users/${userId}`, {
        status: 'active',
      });

      return normalizeAppUser(unwrapData<AppUser>(response.data));
    } catch (error) {
      throw new Error(getErrorMessage(error, 'خطا در فعال‌سازی کاربر'));
    }
  },

  async deactivateUser(userId: string): Promise<AppUser> {
    try {
      const response = await apiClient.delete(`/users/${userId}`);

      return normalizeAppUser(unwrapData<AppUser>(response.data));
    } catch (error) {
      throw new Error(getErrorMessage(error, 'خطا در غیرفعال‌سازی کاربر'));
    }
  },

  async deleteUser(userId: string): Promise<AppUser> {
    return this.deactivateUser(userId);
  },
};