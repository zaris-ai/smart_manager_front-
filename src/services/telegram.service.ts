import apiClient from '@/lib/axios';
import {
  TelegramLinkCode,
  TelegramLinkedUser,
  TelegramOverview,
  TelegramUserListResponse,
} from '@/types/telegram';

type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  pagination?: TelegramUserListResponse['pagination'];
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  const err = error as {
    response?: { data?: { message?: string } };
    message?: string;
  };

  return err.response?.data?.message || err.message || fallback;
};

export const telegramService = {
  async getOverview(): Promise<TelegramOverview> {
    try {
      const response = await apiClient.get<ApiResponse<TelegramOverview>>(
        '/telegram/overview',
      );
      return response.data.data as TelegramOverview;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'خطا در دریافت وضعیت ربات تلگرام'));
    }
  },

  async listUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    linked?: boolean;
  }): Promise<TelegramUserListResponse> {
    try {
      const response = await apiClient.get<ApiResponse<TelegramLinkedUser[]>>(
        '/telegram/users',
        {
          params: {
            page: params?.page || 1,
            limit: params?.limit || 100,
            search: params?.search || undefined,
            linked:
              typeof params?.linked === 'boolean' ? params.linked : undefined,
          },
        },
      );

      return {
        items: response.data.data || [],
        pagination: response.data.pagination || {
          total: 0,
          page: 1,
          limit: params?.limit || 100,
          totalPages: 1,
        },
      };
    } catch (error) {
      throw new Error(getErrorMessage(error, 'خطا در دریافت کاربران تلگرام'));
    }
  },

  async configureWebhook(
    publicUrl?: string,
    dropPendingUpdates = false,
  ): Promise<void> {
    try {
      await apiClient.post('/telegram/webhook/configure', {
        publicUrl: publicUrl || undefined,
        dropPendingUpdates,
      });
    } catch (error) {
      throw new Error(getErrorMessage(error, 'خطا در تنظیم وبهوک تلگرام'));
    }
  },

  async removeWebhook(dropPendingUpdates = false): Promise<void> {
    try {
      await apiClient.delete('/telegram/webhook/configure', {
        data: { dropPendingUpdates },
      });
    } catch (error) {
      throw new Error(getErrorMessage(error, 'خطا در حذف وبهوک تلگرام'));
    }
  },

  async sendTestMessage(payload: {
    userId?: string;
    chatId?: string;
    message?: string;
  }): Promise<void> {
    try {
      await apiClient.post('/telegram/test-message', payload);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'خطا در ارسال پیام آزمایشی'));
    }
  },


  async createLinkCode(userId: string): Promise<TelegramLinkCode> {
    try {
      const response = await apiClient.post<ApiResponse<TelegramLinkCode>>(
        `/telegram/users/${userId}/link-code`,
      );
      return response.data.data as TelegramLinkCode;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'خطا در ساخت کد اتصال تلگرام'));
    }
  },

  async unlinkUser(userId: string): Promise<void> {
    try {
      await apiClient.delete(`/telegram/users/${userId}/link`);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'خطا در حذف اتصال تلگرام کاربر'));
    }
  },
};
