import apiClient from '@/lib/axios';
import type {
  ExpertLeaderboard,
  ExpertLeaderboardFilters,
  ExpertWorkReportDetails,
  ExpertWorkReportFilters,
  ExpertWorkReportOverview,
} from '@/types/expert-work-report';
import type { PaginationState } from '@/types/project';

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  pagination?: PaginationState;
};

const compactParams = <T extends object>(params: T): Partial<T> =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    ),
  ) as Partial<T>;

const defaultPagination = (limit: number): PaginationState => ({
  total: 0,
  page: 1,
  limit,
  totalPages: 0,
});

export const expertWorkReportService = {

  async getLeaderboard(filters: ExpertLeaderboardFilters = {}): Promise<ExpertLeaderboard> {
    const response = await apiClient.get<ApiEnvelope<ExpertLeaderboard>>(
      '/expert-work-reports/leaderboard',
      {
        params: compactParams(filters),
        headers: { 'X-Skip-Toast': '1' },
      },
    );

    const data = response.data.data;
    if (!data) throw new Error('جدول رتبه‌بندی کارشناسان دریافت نشد.');
    return data;
  },

  async getExpertCompetitionLeaderboard(
    filters: ExpertLeaderboardFilters = {},
  ): Promise<ExpertLeaderboard> {
    const response = await apiClient.get<ApiEnvelope<ExpertLeaderboard>>(
      '/expert-work-logs/leaderboard',
      {
        params: compactParams(filters),
        headers: { 'X-Skip-Toast': '1' },
      },
    );

    const data = response.data.data;
    if (!data) throw new Error('جدول رقابت کارشناسان دریافت نشد.');
    return data;
  },

  async getOverview(filters: ExpertWorkReportFilters = {}): Promise<ExpertWorkReportOverview> {
    const response = await apiClient.get<ApiEnvelope<Omit<ExpertWorkReportOverview, 'pagination'>>>(
      '/expert-work-reports',
      {
        params: compactParams(filters),
        headers: { 'X-Skip-Toast': '1' },
      },
    );

    const data = response.data.data;
    if (!data) throw new Error('گزارش عملکرد کارشناسان دریافت نشد.');

    return {
      ...data,
      pagination: response.data.pagination || defaultPagination(filters.limit || 12),
    };
  },

  async getDetails(
    expertId: string,
    filters: Omit<ExpertWorkReportFilters, 'expertId'> = {},
  ): Promise<ExpertWorkReportDetails> {
    const response = await apiClient.get<ApiEnvelope<Omit<ExpertWorkReportDetails, 'pagination'>>>(
      `/expert-work-reports/experts/${expertId}`,
      {
        params: compactParams(filters),
        headers: { 'X-Skip-Toast': '1' },
      },
    );

    const data = response.data.data;
    if (!data) throw new Error('جزئیات عملکرد کارشناس دریافت نشد.');

    return {
      ...data,
      pagination: response.data.pagination || defaultPagination(filters.limit || 20),
    };
  },
};

export default expertWorkReportService;
