import apiClient from '@/lib/axios';
import type {
  FeedbackFilters,
  FeedbackItem,
  FeedbackListResult,
  FeedbackOptions,
  FeedbackPagination,
  FeedbackPayload,
  FeedbackStatus,
  FeedbackSummary,
} from '@/types/feedback';

const BASE_PATH = '/feedback';

type Envelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  pagination?: FeedbackPagination;
};

const emptyPagination = (limit = 12): FeedbackPagination => ({
  total: 0,
  page: 1,
  limit,
  totalPages: 0,
  hasPrevPage: false,
  hasNextPage: false,
  prevPage: null,
  nextPage: null,
});

const compact = <T extends object>(params: T): Partial<T> =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== '' && value !== null && value !== undefined,
    ),
  ) as Partial<T>;

const required = <T>(value: T | null | undefined, message: string): T => {
  if (value === null || value === undefined) throw new Error(message);
  return value;
};

const feedbackService = {
  async getOptions(): Promise<FeedbackOptions> {
    const response = await apiClient.get<Envelope<FeedbackOptions>>(`${BASE_PATH}/options`, {
      headers: { 'X-Skip-Toast': '1' },
    });
    return required(response.data.data, 'گزینه‌های پیام دریافت نشد.');
  },
  async getSummary(): Promise<FeedbackSummary> {
    const response = await apiClient.get<Envelope<FeedbackSummary>>(`${BASE_PATH}/summary`, {
      headers: { 'X-Skip-Toast': '1' },
    });
    return required(response.data.data, 'خلاصه پیام‌ها دریافت نشد.');
  },
  async listMine(filters: FeedbackFilters = {}): Promise<FeedbackListResult> {
    const response = await apiClient.get<Envelope<FeedbackItem[]>>(`${BASE_PATH}/mine`, {
      params: compact(filters),
      headers: { 'X-Skip-Toast': '1' },
    });
    return {
      items: response.data.data || [],
      pagination: response.data.pagination || emptyPagination(filters.limit || 12),
    };
  },
  async listInbox(filters: FeedbackFilters = {}): Promise<FeedbackListResult> {
    const response = await apiClient.get<Envelope<FeedbackItem[]>>(`${BASE_PATH}/inbox`, {
      params: compact(filters),
      headers: { 'X-Skip-Toast': '1' },
    });
    return {
      items: response.data.data || [],
      pagination: response.data.pagination || emptyPagination(filters.limit || 12),
    };
  },
  async create(payload: FeedbackPayload): Promise<FeedbackItem> {
    const response = await apiClient.post<Envelope<FeedbackItem>>(BASE_PATH, payload, {
      headers: { 'X-Toast-Success-Message': 'پیام شما ثبت شد.' },
    });
    return required(response.data.data, 'پاسخ ثبت پیام معتبر نیست.');
  },
  async update(id: string, payload: FeedbackPayload): Promise<FeedbackItem> {
    const response = await apiClient.patch<Envelope<FeedbackItem>>(`${BASE_PATH}/${id}`, payload, {
      headers: { 'X-Toast-Success-Message': 'پیام ویرایش شد.' },
    });
    return required(response.data.data, 'پاسخ ویرایش پیام معتبر نیست.');
  },
  async withdraw(id: string): Promise<FeedbackItem> {
    const response = await apiClient.post<Envelope<FeedbackItem>>(`${BASE_PATH}/${id}/withdraw`, {}, {
      headers: { 'X-Toast-Success-Message': 'پیام پس گرفته شد.' },
    });
    return required(response.data.data, 'پاسخ پس‌گرفتن پیام معتبر نیست.');
  },
  async review(id: string, status: Extract<FeedbackStatus, 'under_review' | 'responded' | 'closed'>, managerResponse = ''): Promise<FeedbackItem> {
    const response = await apiClient.post<Envelope<FeedbackItem>>(`${BASE_PATH}/${id}/review`, {
      status,
      managerResponse,
    }, {
      headers: { 'X-Toast-Success-Message': 'وضعیت پیام بروزرسانی شد.' },
    });
    return required(response.data.data, 'پاسخ بررسی پیام معتبر نیست.');
  },
};

export default feedbackService;
