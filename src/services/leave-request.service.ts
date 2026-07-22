import apiClient from '@/lib/axios';
import type {
  LeaveRequest,
  LeaveRequestFilters,
  LeaveRequestListResult,
  LeaveRequestOptions,
  LeaveRequestPayload,
  LeaveRequestSummary,
  LeavePagination,
} from '@/types/leave-request';
import type { AppUser } from '@/types/user';

const BASE_PATH = '/leave-requests';

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  pagination?: LeavePagination;
};

const emptyPagination = (limit = 12): LeavePagination => ({
  total: 0,
  page: 1,
  limit,
  totalPages: 0,
  hasPrevPage: false,
  hasNextPage: false,
  prevPage: null,
  nextPage: null,
});

const compactParams = <T extends object>(params: T): Partial<T> =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) =>
      value !== undefined && value !== null && value !== '',
    ),
  ) as Partial<T>;

const requireData = <T>(value: T | undefined, message: string): T => {
  if (value === undefined || value === null) throw new Error(message);
  return value;
};

export const leaveRequestService = {
  async getOptions(): Promise<LeaveRequestOptions> {
    const response = await apiClient.get<ApiEnvelope<LeaveRequestOptions>>(
      `${BASE_PATH}/options`,
      { headers: { 'X-Skip-Toast': '1' } },
    );
    return requireData(response.data.data, 'گزینه‌های مرخصی دریافت نشد.');
  },

  async getSummary(): Promise<LeaveRequestSummary> {
    const response = await apiClient.get<ApiEnvelope<LeaveRequestSummary>>(
      `${BASE_PATH}/summary`,
      { headers: { 'X-Skip-Toast': '1' } },
    );
    return requireData(response.data.data, 'خلاصه درخواست‌های مرخصی دریافت نشد.');
  },

  async listMine(filters: LeaveRequestFilters = {}): Promise<LeaveRequestListResult> {
    const response = await apiClient.get<ApiEnvelope<LeaveRequest[]>>(
      `${BASE_PATH}/mine`,
      {
        params: compactParams(filters),
        headers: { 'X-Skip-Toast': '1' },
      },
    );
    return {
      items: response.data.data || [],
      pagination: response.data.pagination || emptyPagination(filters.limit || 12),
    };
  },

  async listReviewQueue(
    filters: LeaveRequestFilters = {},
  ): Promise<LeaveRequestListResult> {
    const response = await apiClient.get<ApiEnvelope<LeaveRequest[]>>(
      `${BASE_PATH}/review-queue`,
      {
        params: compactParams(filters),
        headers: { 'X-Skip-Toast': '1' },
      },
    );
    return {
      items: response.data.data || [],
      pagination: response.data.pagination || emptyPagination(filters.limit || 12),
    };
  },

  async listRequesters(): Promise<AppUser[]> {
    const response = await apiClient.get<ApiEnvelope<AppUser[]>>(
      `${BASE_PATH}/requesters`,
      { headers: { 'X-Skip-Toast': '1' } },
    );
    return response.data.data || [];
  },

  async getById(id: string): Promise<LeaveRequest> {
    const response = await apiClient.get<ApiEnvelope<LeaveRequest>>(
      `${BASE_PATH}/${id}`,
      { headers: { 'X-Skip-Toast': '1' } },
    );
    return requireData(response.data.data, 'جزئیات درخواست مرخصی دریافت نشد.');
  },

  async create(payload: LeaveRequestPayload): Promise<LeaveRequest> {
    const response = await apiClient.post<ApiEnvelope<LeaveRequest>>(
      BASE_PATH,
      payload,
      { headers: { 'X-Toast-Success-Message': 'درخواست مرخصی ثبت شد.' } },
    );
    return requireData(response.data.data, 'پاسخ ثبت درخواست معتبر نیست.');
  },

  async update(id: string, payload: LeaveRequestPayload): Promise<LeaveRequest> {
    const response = await apiClient.patch<ApiEnvelope<LeaveRequest>>(
      `${BASE_PATH}/${id}`,
      payload,
      { headers: { 'X-Toast-Success-Message': 'درخواست مرخصی ویرایش شد.' } },
    );
    return requireData(response.data.data, 'پاسخ ویرایش درخواست معتبر نیست.');
  },

  async cancel(id: string): Promise<LeaveRequest> {
    const response = await apiClient.post<ApiEnvelope<LeaveRequest>>(
      `${BASE_PATH}/${id}/cancel`,
      {},
      { headers: { 'X-Toast-Success-Message': 'درخواست مرخصی لغو شد.' } },
    );
    return requireData(response.data.data, 'پاسخ لغو درخواست معتبر نیست.');
  },

  async approve(id: string, reviewNote = ''): Promise<LeaveRequest> {
    const response = await apiClient.post<ApiEnvelope<LeaveRequest>>(
      `${BASE_PATH}/${id}/approve`,
      { reviewNote },
      { headers: { 'X-Toast-Success-Message': 'درخواست مرخصی تأیید شد.' } },
    );
    return requireData(response.data.data, 'پاسخ تأیید درخواست معتبر نیست.');
  },

  async reject(id: string, reviewNote: string): Promise<LeaveRequest> {
    const response = await apiClient.post<ApiEnvelope<LeaveRequest>>(
      `${BASE_PATH}/${id}/reject`,
      { reviewNote },
      { headers: { 'X-Toast-Success-Message': 'درخواست مرخصی رد شد.' } },
    );
    return requireData(response.data.data, 'پاسخ رد درخواست معتبر نیست.');
  },
};

export default leaveRequestService;
