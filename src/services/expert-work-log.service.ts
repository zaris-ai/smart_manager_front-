import apiClient from '@/lib/axios';
import type {
  ExpertWorkLog,
  ExpertWorkLogFilters,
  ExpertWorkLogListResult,
  ExpertWorkLogPayload,
  ExpertWorkLogProject,
  ExpertWorkLogProjectContext,
  ExpertWorkLogProjectListResult,
  ExpertWorkLogSummary,
} from '@/types/expert-work-log';
import type { PaginationState } from '@/types/project';

const BASE_PATH = '/expert-work-logs';

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  pagination?: PaginationState;
  summary?: ExpertWorkLogSummary;
};

const emptyPagination = (limit = 20): PaginationState => ({
  total: 0,
  page: 1,
  limit,
  totalPages: 0,
});

const compactParams = <T extends object>(params: T): Partial<T> => {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => {
      return value !== undefined && value !== null && value !== '';
    }),
  ) as Partial<T>;
};

export const expertWorkLogService = {
  async listProjects(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  } = {}): Promise<ExpertWorkLogProjectListResult> {
    const response = await apiClient.get<ApiEnvelope<ExpertWorkLogProject[]>>(
      `${BASE_PATH}/projects`,
      {
        params: compactParams(params),
        headers: { 'X-Skip-Toast': '1' },
      },
    );

    return {
      items: response.data.data || [],
      pagination: response.data.pagination || emptyPagination(params.limit || 30),
    };
  },

  async getProjectContext(projectId: string): Promise<ExpertWorkLogProjectContext> {
    const response = await apiClient.get<ApiEnvelope<ExpertWorkLogProjectContext>>(
      `${BASE_PATH}/projects/${projectId}/context`,
      { headers: { 'X-Skip-Toast': '1' } },
    );

    if (!response.data.data) {
      throw new Error('اطلاعات پروژه برای ثبت گزارش دریافت نشد.');
    }

    return response.data.data;
  },

  async list(filters: ExpertWorkLogFilters = {}): Promise<ExpertWorkLogListResult> {
    const response = await apiClient.get<ApiEnvelope<ExpertWorkLog[]>>(BASE_PATH, {
      params: compactParams(filters),
      headers: { 'X-Skip-Toast': '1' },
    });

    return {
      items: response.data.data || [],
      summary: response.data.summary || {
        totalEntries: 0,
        totalDurationMinutes: 0,
        expertCount: 0,
        projectCount: 0,
      },
      pagination: response.data.pagination || emptyPagination(filters.limit || 20),
    };
  },

  async getById(id: string): Promise<ExpertWorkLog> {
    const response = await apiClient.get<ApiEnvelope<ExpertWorkLog>>(
      `${BASE_PATH}/${id}`,
      { headers: { 'X-Skip-Toast': '1' } },
    );

    if (!response.data.data) {
      throw new Error('گزارش کار پیدا نشد.');
    }

    return response.data.data;
  },

  async create(payload: ExpertWorkLogPayload): Promise<ExpertWorkLog> {
    const response = await apiClient.post<ApiEnvelope<ExpertWorkLog>>(
      BASE_PATH,
      payload,
      {
        headers: {
          'X-Toast-Success-Message': 'گزارش کار با موفقیت ثبت شد.',
        },
      },
    );

    if (!response.data.data) {
      throw new Error('پاسخ ثبت گزارش کار معتبر نیست.');
    }

    return response.data.data;
  },

  async update(id: string, payload: ExpertWorkLogPayload): Promise<ExpertWorkLog> {
    const response = await apiClient.patch<ApiEnvelope<ExpertWorkLog>>(
      `${BASE_PATH}/${id}`,
      payload,
      {
        headers: {
          'X-Toast-Success-Message': 'گزارش کار با موفقیت ویرایش شد.',
        },
      },
    );

    if (!response.data.data) {
      throw new Error('پاسخ ویرایش گزارش کار معتبر نیست.');
    }

    return response.data.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`${BASE_PATH}/${id}`, {
      headers: {
        'X-Toast-Success-Message': 'گزارش کار حذف شد.',
      },
    });
  },
};

export default expertWorkLogService;
