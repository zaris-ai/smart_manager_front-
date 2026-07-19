import apiClient from '@/lib/axios';
import type { ApiResponse, PaginationState } from '@/types/project';
import type {
  CreateRepositoryConnectionPayload,
  RepositoryAnalysisRun,
  RepositoryConnection,
  RepositoryConnectionReference,
  RepositoryListParams,
  RepositoryRunListParams,
  RepositoryRunListResponse,
  StartRepositoryAnalysisPayload,
  UpdateRepositoryConnectionPayload,
} from '@/types/repository-analysis';

const defaultPagination: PaginationState = {
  total: 0,
  page: 1,
  limit: 20,
  totalPages: 1,
};

const normalizeId = <T extends { id?: string; _id?: string }>(value: T): T & { id: string } => ({
  ...value,
  id: value.id || value._id || '',
});

const normalizeRepository = (repository: RepositoryConnection): RepositoryConnection => {
  const normalized = normalizeId(repository as RepositoryConnection & { id?: string });

  return {
    ...normalized,
    provider: normalized.provider || 'gitlab',
    defaultBranch: normalized.defaultBranch || '',
    enabled: normalized.enabled !== false,
  };
};


const normalizeRepositoryReference = (
  repository: RepositoryConnectionReference,
): RepositoryConnectionReference => ({
  ...repository,
  id: repository.id || repository._id || '',
  defaultBranch: repository.defaultBranch || '',
  enabled: repository.enabled !== false,
});

const normalizeRun = (run: RepositoryAnalysisRun): RepositoryAnalysisRun => {
  const normalized = normalizeId(run as RepositoryAnalysisRun & { id?: string });

  const repositoryId =
    typeof normalized.repositoryId === 'object' && normalized.repositoryId
      ? normalizeRepositoryReference(normalized.repositoryId)
      : normalized.repositoryId;

  return {
    ...normalized,
    repositoryId,
    requestedRef: normalized.requestedRef || '',
    resolvedRef: normalized.resolvedRef || '',
    commitSha: normalized.commitSha || '',
    currentStage: normalized.currentStage || 'queued',
    progressPercent: Number(normalized.progressPercent || 0),
    packages: Array.isArray(normalized.packages) ? normalized.packages : [],
    frameworks: Array.isArray(normalized.frameworks) ? normalized.frameworks : [],
    architecture: normalized.architecture || null,
    expectations: normalized.expectations || null,
    readinessAssessment: normalized.readinessAssessment || null,
    scalabilityAssessment: normalized.scalabilityAssessment || null,
    codeReviewAssessment: normalized.codeReviewAssessment || null,
    executiveReport: normalized.executiveReport || '',
    technicalReport: normalized.technicalReport || '',
    warnings: Array.isArray(normalized.warnings) ? normalized.warnings : [],
    errorCode: normalized.errorCode || '',
    errorMessage: normalized.errorMessage || '',
    aiEnabled: normalized.aiEnabled !== false,
    aiUsed: Boolean(normalized.aiUsed),
    aiModel: normalized.aiModel || '',
    aiError: normalized.aiError || null,
  };
};

const unwrapData = <T>(responseData: ApiResponse<T> | T): T => {
  if (responseData && typeof responseData === 'object' && 'data' in responseData) {
    return (responseData as ApiResponse<T>).data as T;
  }

  return responseData as T;
};

const silentHeaders = (silent?: boolean) =>
  silent
    ? {
        'X-Skip-Toast': 'true',
      }
    : undefined;

export const repositoryAnalysisService = {
  async listRepositories(
    params?: RepositoryListParams,
    options?: { silent?: boolean },
  ): Promise<RepositoryConnection[]> {
    const response = await apiClient.get('/repository-analysis/repositories', {
      params,
      headers: silentHeaders(options?.silent),
    });
    const repositories = unwrapData<RepositoryConnection[]>(response.data) || [];

    return Array.isArray(repositories) ? repositories.map(normalizeRepository) : [];
  },

  async createRepository(
    payload: CreateRepositoryConnectionPayload,
  ): Promise<RepositoryConnection> {
    const response = await apiClient.post('/repository-analysis/repositories', payload, {
      headers: {
        'X-Toast-Success-Message': 'مخزن GitLab با موفقیت متصل شد.',
      },
    });

    return normalizeRepository(unwrapData<RepositoryConnection>(response.data));
  },

  async getRepository(
    repositoryId: string,
    options?: { silent?: boolean },
  ): Promise<RepositoryConnection> {
    const response = await apiClient.get(
      `/repository-analysis/repositories/${repositoryId}`,
      { headers: silentHeaders(options?.silent) },
    );

    return normalizeRepository(unwrapData<RepositoryConnection>(response.data));
  },

  async updateRepository(
    repositoryId: string,
    payload: UpdateRepositoryConnectionPayload,
  ): Promise<RepositoryConnection> {
    const response = await apiClient.patch(
      `/repository-analysis/repositories/${repositoryId}`,
      payload,
      {
        headers: {
          'X-Toast-Success-Message': 'تنظیمات مخزن با موفقیت ذخیره شد.',
        },
      },
    );

    return normalizeRepository(unwrapData<RepositoryConnection>(response.data));
  },

  async deleteRepository(repositoryId: string): Promise<void> {
    await apiClient.delete(`/repository-analysis/repositories/${repositoryId}`, {
      headers: {
        'X-Toast-Success-Message': 'اتصال مخزن با موفقیت حذف شد.',
      },
    });
  },

  async startAnalysis(
    repositoryId: string,
    payload: StartRepositoryAnalysisPayload,
  ): Promise<RepositoryAnalysisRun> {
    const formData = new FormData();
    const appendValue = (key: string, value: unknown) => {
      if (value === undefined || value === null || value === '') return;
      formData.append(key, String(value));
    };

    appendValue('ref', payload.ref);
    appendValue('useAi', payload.useAi ?? true);
    appendValue('expectationsText', payload.expectationsText);
    appendValue('concurrentUsers', payload.concurrentUsers);
    appendValue('requestsPerSecond', payload.requestsPerSecond);
    appendValue('targetLatencyMs', payload.targetLatencyMs);
    appendValue('availabilityPercent', payload.availabilityPercent);
    appendValue('dataVolume', payload.dataVolume);
    appendValue('growthHorizonMonths', payload.growthHorizonMonths);

    if (payload.expectationsFile) {
      formData.append('expectationsFile', payload.expectationsFile);
    }

    const response = await apiClient.post(
      `/repository-analysis/repositories/${repositoryId}/analyze`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          'X-Toast-Success-Message': 'تحلیل مخزن در صف اجرا قرار گرفت.',
        },
      },
    );

    return normalizeRun(unwrapData<RepositoryAnalysisRun>(response.data));
  },

  async listRuns(
    params?: RepositoryRunListParams,
    options?: { silent?: boolean },
  ): Promise<RepositoryRunListResponse> {
    const response = await apiClient.get('/repository-analysis/runs', {
      params,
      headers: silentHeaders(options?.silent),
    });
    const responseData = response.data as ApiResponse<RepositoryAnalysisRun[]>;
    const runs = Array.isArray(responseData?.data)
      ? responseData.data
      : Array.isArray(response.data)
        ? response.data
        : [];

    return {
      items: runs.map(normalizeRun),
      pagination: responseData?.pagination || defaultPagination,
    };
  },

  async getRun(runId: string, options?: { silent?: boolean }): Promise<RepositoryAnalysisRun> {
    const response = await apiClient.get(`/repository-analysis/runs/${runId}`, {
      headers: silentHeaders(options?.silent),
    });

    return normalizeRun(unwrapData<RepositoryAnalysisRun>(response.data));
  },

  // Backward-compatible aliases for the first placeholder implementation.
  async getRuns(): Promise<RepositoryAnalysisRun[]> {
    return (await this.listRuns()).items;
  },

  async getRunById(runId: string): Promise<RepositoryAnalysisRun> {
    return this.getRun(runId);
  },
};

export type {
  RepositoryAnalysisRun,
  RepositoryConnection,
  RepositoryConnectionReference,
  RepositoryRunListResponse,
};
