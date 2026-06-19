import apiClient from '@/lib/axios';
import { ApiResponse, PaginationState } from '@/types/project';
import {
  ProjectFinanceAttachment,
  ProjectFinanceCashflowItem,
  ProjectFinanceFilters,
  ProjectFinanceForecastReportItem,
  ProjectFinanceFullReport,
  ProjectFinanceInvoiceReportItem,
  ProjectFinanceListResponse,
  ProjectFinancePeopleReportItem,
  ProjectFinanceRecord,
  ProjectFinanceRecordPayload,
  ProjectFinanceRejectPayload,
  ProjectFinanceSettlePayload,
  ProjectFinanceSummary,
} from '@/types/project-finance';

type FinanceApiListResponse<T> = ApiResponse<T[]> & {
  items?: T[];
  total?: number;
};

const defaultPagination: PaginationState = {
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

const unwrapItems = <T>(responseData: FinanceApiListResponse<T> | T[]): T[] => {
  if (Array.isArray(responseData)) return responseData;

  if (Array.isArray(responseData.items)) return responseData.items;

  if (Array.isArray(responseData.data)) return responseData.data;

  return [];
};

const unwrapMessage = (error: unknown, fallback: string): string => {
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
  responseData:
    | ProjectFinanceRecord[]
    | ApiResponse<ProjectFinanceRecord[]>
    | ProjectFinanceListResponse,
): ProjectFinanceListResponse => {
  if (Array.isArray(responseData)) {
    return {
      items: responseData,
      pagination: defaultPagination,
    };
  }

  if ('items' in responseData && Array.isArray(responseData.items)) {
    return {
      items: responseData.items,
      pagination: responseData.pagination || {
        ...defaultPagination,
        total: responseData.items.length,
      },
    };
  }

  const apiResponse = responseData as ApiResponse<ProjectFinanceRecord[]>;

  return {
    items: Array.isArray(apiResponse.data) ? apiResponse.data : [],
    pagination: apiResponse.pagination || defaultPagination,
  };
};

const cleanPayload = (
  payload: Partial<ProjectFinanceRecordPayload>,
): Record<string, unknown> => {
  const requestPayload: Record<string, unknown> = {
    ...payload,
    amount: Number(payload.amount || 0),
    taxAmount: Number(payload.taxAmount || 0),
    discountAmount: Number(payload.discountAmount || 0),
    currency: payload.currency || 'IRR',
    forecastDate: payload.forecastDate || null,
    dueDate: payload.dueDate || null,
    actualDate: payload.actualDate || null,
    invoiceDate: payload.invoiceDate || null,
    linkedForecastId: payload.linkedForecastId || null,
    linkedInvoiceId: payload.linkedInvoiceId || null,
    counterparty: {
      name: payload.counterparty?.name || payload.counterpartyName || '',
      phone: payload.counterparty?.phone || payload.counterpartyPhone || '',
      nationalIdOrEconomicCode:
        payload.counterparty?.nationalIdOrEconomicCode ||
        payload.counterpartyNationalIdOrEconomicCode ||
        '',
      address: payload.counterparty?.address || payload.address || '',
    },
  };

  delete requestPayload.counterpartyName;
  delete requestPayload.counterpartyPhone;
  delete requestPayload.counterpartyNationalIdOrEconomicCode;
  delete requestPayload.address;

  return requestPayload;
};

export const projectFinanceService = {
  async listRecords(
    projectId: string,
    filters?: ProjectFinanceFilters,
  ): Promise<ProjectFinanceListResponse> {
    try {
      const response = await apiClient.get(`/projects/${projectId}/finance`, {
        params: filters,
      });

      return normalizeListResponse(response.data);
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در دریافت رکوردهای مالی پروژه'));
    }
  },

  async getRecord(
    projectId: string,
    financeId: string,
  ): Promise<ProjectFinanceRecord> {
    try {
      const response = await apiClient.get(
        `/projects/${projectId}/finance/${financeId}`,
      );

      return unwrapData<ProjectFinanceRecord>(response.data);
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در دریافت رکورد مالی'));
    }
  },

  async createRecord(
    projectId: string,
    payload: ProjectFinanceRecordPayload,
  ): Promise<ProjectFinanceRecord> {
    try {
      const response = await apiClient.post(
        `/projects/${projectId}/finance`,
        cleanPayload(payload),
      );

      return unwrapData<ProjectFinanceRecord>(response.data);
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در ثبت رکورد مالی'));
    }
  },

  async updateRecord(
    projectId: string,
    financeId: string,
    payload: Partial<ProjectFinanceRecordPayload>,
  ): Promise<ProjectFinanceRecord> {
    try {
      const response = await apiClient.patch(
        `/projects/${projectId}/finance/${financeId}`,
        cleanPayload(payload),
      );

      return unwrapData<ProjectFinanceRecord>(response.data);
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در بروزرسانی رکورد مالی'));
    }
  },

  async cancelRecord(projectId: string, financeId: string): Promise<void> {
    try {
      await apiClient.delete(`/projects/${projectId}/finance/${financeId}`);
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در لغو رکورد مالی'));
    }
  },

  async approveRecord(
    projectId: string,
    financeId: string,
  ): Promise<ProjectFinanceRecord> {
    try {
      const response = await apiClient.post(
        `/projects/${projectId}/finance/${financeId}/approve`,
        {},
      );

      return unwrapData<ProjectFinanceRecord>(response.data);
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در تأیید رکورد مالی'));
    }
  },

  async rejectRecord(
    projectId: string,
    financeId: string,
    payload: ProjectFinanceRejectPayload,
  ): Promise<ProjectFinanceRecord> {
    try {
      const response = await apiClient.post(
        `/projects/${projectId}/finance/${financeId}/reject`,
        payload,
      );

      return unwrapData<ProjectFinanceRecord>(response.data);
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در رد رکورد مالی'));
    }
  },

  async settleRecord(
    projectId: string,
    financeId: string,
    payload: ProjectFinanceSettlePayload,
  ): Promise<ProjectFinanceRecord> {
    try {
      const response = await apiClient.post(
        `/projects/${projectId}/finance/${financeId}/settle`,
        {
          ...payload,
          amount: Number(payload.amount || 0),
          actualDate: payload.actualDate || null,
        },
      );

      return unwrapData<ProjectFinanceRecord>(response.data);
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در ثبت تحقق مالی'));
    }
  },

  async uploadAttachment(
    projectId: string,
    financeId: string,
    payload: { file: File; description?: string },
  ): Promise<ProjectFinanceRecord> {
    try {
      const formData = new FormData();

      formData.append('file', payload.file);

      if (payload.description) {
        formData.append('description', payload.description);
      }

      const response = await apiClient.post(
        `/projects/${projectId}/finance/${financeId}/files`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );

      return unwrapData<ProjectFinanceRecord>(response.data);
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در آپلود پیوست مالی'));
    }
  },

  async deleteAttachment(
    projectId: string,
    financeId: string,
    attachmentId: string,
  ): Promise<void> {
    try {
      await apiClient.delete(
        `/projects/${projectId}/finance/${financeId}/files/${attachmentId}`,
      );
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در حذف پیوست مالی'));
    }
  },

  async getSummary(projectId: string): Promise<ProjectFinanceSummary> {
    try {
      const response = await apiClient.get(`/projects/${projectId}/finance/summary`);

      return unwrapData<ProjectFinanceSummary>(response.data);
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در دریافت خلاصه مالی پروژه'));
    }
  },

  async getFullReport(projectId: string): Promise<ProjectFinanceFullReport> {
    try {
      const response = await apiClient.get(`/projects/${projectId}/finance/report`);

      return unwrapData<ProjectFinanceFullReport>(response.data);
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در دریافت گزارش کامل مالی پروژه'));
    }
  },

  async getInvoiceReport(
    projectId: string,
  ): Promise<ProjectFinanceInvoiceReportItem[]> {
    try {
      const response = await apiClient.get(
        `/projects/${projectId}/finance/invoices/report`,
      );

      return unwrapItems<ProjectFinanceInvoiceReportItem>(response.data);
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در دریافت گزارش فاکتورها'));
    }
  },

  async getForecastReport(
    projectId: string,
  ): Promise<ProjectFinanceForecastReportItem[]> {
    try {
      const response = await apiClient.get(
        `/projects/${projectId}/finance/forecasts/report`,
      );

      return unwrapItems<ProjectFinanceForecastReportItem>(response.data);
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در دریافت گزارش پیش‌بینی‌ها'));
    }
  },

  async getCashflowReport(
    projectId: string,
  ): Promise<ProjectFinanceCashflowItem[]> {
    try {
      const response = await apiClient.get(
        `/projects/${projectId}/finance/cashflow`,
      );

      return unwrapItems<ProjectFinanceCashflowItem>(response.data);
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در دریافت گزارش جریان نقدی'));
    }
  },

  async getPeopleReport(
    projectId: string,
  ): Promise<ProjectFinancePeopleReportItem[]> {
    try {
      const response = await apiClient.get(
        `/projects/${projectId}/finance/people/report`,
      );

      return unwrapItems<ProjectFinancePeopleReportItem>(response.data);
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در دریافت گزارش عملکرد مالی افراد'));
    }
  },
};
