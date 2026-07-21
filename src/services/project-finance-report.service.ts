import apiClient from '@/lib/axios';
import type {
  ProjectFinanceReportFilters,
  ProjectFinanceReportResult,
} from '@/types/project-finance-report';
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

export const projectFinanceReportService = {
  async list(filters: ProjectFinanceReportFilters = {}): Promise<ProjectFinanceReportResult> {
    const response = await apiClient.get<ApiEnvelope<Omit<ProjectFinanceReportResult, 'pagination'>>>(
      '/project-finance-reports',
      {
        params: compactParams(filters),
        headers: { 'X-Skip-Toast': '1' },
      },
    );

    if (!response.data.data) throw new Error('گزارش مالی پروژه‌ها دریافت نشد.');

    return {
      ...response.data.data,
      pagination: response.data.pagination || {
        total: 0,
        page: 1,
        limit: filters.limit || 12,
        totalPages: 0,
      },
    };
  },
};

export default projectFinanceReportService;
