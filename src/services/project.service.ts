import apiClient from '@/lib/axios';
import type { ExpertWorkLog } from '@/types/expert-work-log';
import {
  ApiResponse,
  CalendarEvent,
  CreateProjectNotePayload,
  ExpertProjectCompletion,
  getTaskId,
  PaginationState,
  Project,
  ProjectFile,
  ProjectImportResult,
  ProjectListResponse,
  ProjectPayload,
  ProjectPhase,
  ProjectPhaseFinancialPayload,
  ProjectPhasePayload,
  ProjectProgressNote,
  ProjectTask,
  ProjectTaskPayload,
  ProjectWorkHistoryResponse,
} from '@/types/project';

type QueryParams = Record<string, string | number | boolean | undefined | null>;

export type ProjectRole = {
  id: string;
  _id?: string;
  title: string;
  name?: string;
  description?: string;
  isActive: boolean;
  sortOrder?: number;
  displayOrder?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type ProjectRolePayload = {
  title: string;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
};

export type ProjectMemberPayload = {
  userId: string;
  roleId?: string | null;
  roleInProject?: string;
  startedAt?: string | null;
  expectedFinishedAt?: string | null;
};

export type ProjectMemberUpdatePayload = {
  roleId?: string | null;
  roleInProject?: string;
  startedAt?: string | null;
  expectedFinishedAt?: string | null;
};

export type ProjectOverviewSummary = {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  cancelledProjects: number;
  overdueProjects: number;
  dueSoonProjects: number;
  totalTasks: number;
  overdueTasks: number;
  blockedTasks: number;
  doneTasks: number;
  totalRoles: number;
  totalExperts: number;
  reportFilesCount: number;
  reportFilesSizeBytes: number;
};

export type ProjectOverviewStatusChartItem = {
  key: string;
  label: string;
  count: number;
  overdue?: number;
};

export type ProjectOverviewPriorityChartItem = {
  key: string;
  label: string;
  count: number;
};

export type ProjectOverviewRoleWorkload = {
  id: string;
  title: string;
  totalProjects: number;
  activeProjects: number;
  overdueProjects: number;
};

export type ProjectOverviewExpertWorkload = {
  id: string;
  name: string;
  totalProjects: number;
  activeProjects: number;
  overdueProjects: number;
  roles: string[];
};

export type ProjectOverviewReportVolume = {
  projectId: string;
  projectTitle: string;
  reportFilesCount: number;
  reportFilesSizeBytes: number;
};

export type ProjectOverviewOverdueProject = {
  id: string;
  title: string;
  status: string;
  statusLabel: string;
  priority: string;
  priorityLabel: string;
  dueDate: string | null;
  daysOverdue: number;
  ownerId: string;
  ownerName: string;
};

export type ProjectOverviewData = {
  generatedAt: string;
  summary: ProjectOverviewSummary;
  charts: {
    projectsByStatus: ProjectOverviewStatusChartItem[];
    projectsByPriority: ProjectOverviewPriorityChartItem[];
    tasksByStatus: ProjectOverviewStatusChartItem[];
    overdueByRole: ProjectOverviewRoleWorkload[];
    overdueByExpert: ProjectOverviewExpertWorkload[];
    reportVolumeByProject: ProjectOverviewReportVolume[];
  };
  tables: {
    overdueProjects: ProjectOverviewOverdueProject[];
    roleWorkload: ProjectOverviewRoleWorkload[];
    expertWorkload: ProjectOverviewExpertWorkload[];
  };
};

type ProjectRequestPayload = ProjectPayload & {
  projectMembers?: ProjectMemberPayload[];
  members?: ProjectMemberPayload[];
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


type UnknownRecord = Record<string, unknown>;
type ProjectWorkHistoryItem = ProjectWorkHistoryResponse['items'][number];

const asRecord = (value: unknown): UnknownRecord | null => {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
};

const firstString = (...values: unknown[]): string => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }

  return '';
};

const firstNumber = (...values: unknown[]): number | null => {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;

    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return null;
};

const getReferenceValueId = (value: unknown): string => {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value).trim();
  }

  const record = asRecord(value);
  return record ? firstString(record.id, record._id) : '';
};

const getReferenceValueIds = (value: unknown): string[] => {
  const values = Array.isArray(value) ? value : [value];

  return values
    .map(getReferenceValueId)
    .filter((item): item is string => Boolean(item));
};

const normalizeWorkHistoryKind = (
  value: unknown,
  item?: UnknownRecord | null,
): ProjectWorkHistoryItem['kind'] => {
  const normalized = firstString(value).toLowerCase();

  if (['expert_work_log', 'expert-work-log', 'work_log', 'work-log'].includes(normalized)) {
    return 'expert_work_log';
  }

  if (['expert_completion', 'expert-completion', 'completion'].includes(normalized)) {
    return 'expert_completion';
  }

  if (['completed_task', 'completed-task', 'task', 'done_task'].includes(normalized)) {
    return 'completed_task';
  }

  if (!item) return 'project_note';

  // The expert-work-log endpoint returns raw documents without a `kind` field.
  // Infer the record type from its domain-specific fields instead of treating
  // every untyped record as a generic project note.
  const status = firstString(item.status).toLowerCase();
  const hasExpertReference = Boolean(item.expertId ?? item.expert);
  const hasWorkLogFields = Boolean(
    item.workDate ??
      item.durationMinutes ??
      item.progressPercent ??
      item.blockers ??
      item.nextSteps ??
      item.phaseId ??
      item.taskId,
  );
  const hasCompletionFields = Boolean(
    item.completionDate ?? item.reviewedAt ?? item.reviewerId ?? item.managerNote,
  );
  const hasTaskFields =
    Array.isArray(item.assignedUserIds) ||
    ['done', 'completed'].includes(status) ||
    Boolean(item.completedAt);

  if (hasExpertReference && hasCompletionFields) return 'expert_completion';
  if (hasExpertReference && hasWorkLogFields) return 'expert_work_log';
  if (hasTaskFields) return 'completed_task';

  return 'project_note';
};

const normalizeWorkHistorySource = (
  value: unknown,
): ProjectWorkHistoryItem['source'] => {
  const normalized = firstString(value).toLowerCase();

  return ['telegram', 'telegram_bot', 'telegram-bot', 'bot'].includes(normalized)
    ? 'telegram_bot'
    : 'panel';
};

const normalizeProjectWorkHistoryItem = (
  value: unknown,
  index: number,
): ProjectWorkHistoryItem | null => {
  const item = asRecord(value);
  if (!item) return null;

  const actor =
    asRecord(item.actor) ||
    asRecord(item.expert) ||
    asRecord(item.expertId) ||
    asRecord(item.user);
  const registeredBy = asRecord(item.registeredBy) || asRecord(item.createdBy);
  const reviewer = asRecord(item.reviewer) || asRecord(item.reviewerId);
  const files = Array.isArray(item.files) ? item.files : [];
  const occurredAt = firstString(
    item.occurredAt,
    item.workDate,
    item.completionDate,
    item.completedAt,
    item.updatedAt,
    item.createdAt,
  );
  const createdAt = firstString(item.createdAt, occurredAt);
  const kind = normalizeWorkHistoryKind(
    item.kind ?? item.type ?? item.recordType,
    item,
  );
  const title = firstString(item.title, item.taskLabel, item.subject, 'فعالیت ثبت‌شده');
  const description = firstString(
    item.description,
    item.summary,
    item.note,
    item.details,
    'برای این فعالیت توضیحی ثبت نشده است.',
  );

  return {
    id: firstString(item.id, item._id, `${kind}-${occurredAt || index}`),
    kind,
    source: normalizeWorkHistorySource(item.source ?? item.channel ?? item.origin),
    occurredAt: occurredAt || createdAt || new Date(0).toISOString(),
    createdAt: createdAt || occurredAt || new Date(0).toISOString(),
    title,
    description,
    actorLabel: firstString(
      item.actorLabel,
      item.expertName,
      item.userName,
      actor?.fullName,
      actor?.name,
      actor?.username,
      'کارشناس نامشخص',
    ),
    actorIds: Array.from(
      new Set([
        ...getReferenceValueIds(item.actorIds),
        ...getReferenceValueIds(item.actorId),
        ...getReferenceValueIds(item.expertId),
        ...getReferenceValueIds(item.expert),
        ...getReferenceValueIds(item.assignedUserIds),
        ...getReferenceValueIds(item.assigneeId),
      ]),
    ),
    registeredByLabel: firstString(
      item.registeredByLabel,
      registeredBy?.fullName,
      registeredBy?.name,
      registeredBy?.username,
    ) || undefined,
    reviewerLabel: firstString(
      item.reviewerLabel,
      reviewer?.fullName,
      reviewer?.name,
      reviewer?.username,
    ) || undefined,
    managerNote: firstString(item.managerNote, item.reviewNote) || undefined,
    phaseLabel:
      firstString(
        item.phaseLabel,
        item.phaseTitle,
        asRecord(item.phaseId)?.title,
        asRecord(item.phase)?.title,
      ) || undefined,
    taskLabel:
      firstString(
        item.taskLabel,
        item.taskTitle,
        asRecord(item.taskId)?.title,
        asRecord(item.task)?.title,
      ) || undefined,
    durationMinutes: firstNumber(item.durationMinutes, item.duration),
    progressPercent: firstNumber(item.progressPercent, item.progress),
    deliverables: firstString(item.deliverables, item.outputs) || undefined,
    blockers: firstString(item.blockers, item.obstacles) || undefined,
    nextSteps: firstString(item.nextSteps, item.next_actions) || undefined,
    status: firstString(item.status) as ProjectWorkHistoryItem['status'],
    statusLabel: firstString(item.statusLabel) || undefined,
    files: files as ProjectWorkHistoryItem['files'],
  };
};

const normalizeProjectWorkHistoryResponse = (
  payload: unknown,
): ProjectWorkHistoryResponse => {
  let current: unknown = payload;
  let summaryCandidate: UnknownRecord | null = null;

  for (let depth = 0; depth < 5; depth += 1) {
    if (Array.isArray(current)) {
      const items = current
        .map(normalizeProjectWorkHistoryItem)
        .filter((item): item is ProjectWorkHistoryItem => Boolean(item));

      return {
        items,
        summary: {
          total: items.length,
          panel: items.filter((item) => item.source === 'panel').length,
          telegram: items.filter((item) => item.source === 'telegram_bot').length,
          expertEntries: items.filter((item) => item.kind !== 'project_note').length,
        },
      };
    }

    const record = asRecord(current);
    if (!record) break;

    const candidateItems = [
      record.items,
      record.history,
      record.records,
      record.workHistory,
      record.activities,
    ].find(Array.isArray);

    if (Array.isArray(candidateItems)) {
      const items = candidateItems
        .map(normalizeProjectWorkHistoryItem)
        .filter((item): item is ProjectWorkHistoryItem => Boolean(item));
      summaryCandidate = asRecord(record.summary) || summaryCandidate;

      return {
        items,
        summary: {
          total: Number(summaryCandidate?.total ?? items.length) || items.length,
          panel:
            Number(summaryCandidate?.panel) ||
            items.filter((item) => item.source === 'panel').length,
          telegram:
            Number(summaryCandidate?.telegram ?? summaryCandidate?.telegram_bot) ||
            items.filter((item) => item.source === 'telegram_bot').length,
          expertEntries:
            Number(summaryCandidate?.expertEntries ?? summaryCandidate?.expert_entries) ||
            items.filter((item) => item.kind !== 'project_note').length,
        },
      };
    }

    summaryCandidate = asRecord(record.summary) || summaryCandidate;
    current = record.data ?? record.result ?? record.payload ?? record.response;
  }

  return {
    items: [],
    summary: { total: 0, panel: 0, telegram: 0, expertEntries: 0 },
  };
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
  responseData: ApiResponse<Project[]> | Project[] | ProjectListResponse,
): ProjectListResponse => {
  if (Array.isArray(responseData)) {
    return {
      items: responseData,
      pagination: defaultPagination,
    };
  }

  if ('items' in responseData && Array.isArray(responseData.items)) {
    return responseData as ProjectListResponse;
  }

  const apiResponse = responseData as ApiResponse<Project[]>;

  return {
    items: Array.isArray(apiResponse.data) ? apiResponse.data : [],
    pagination: apiResponse.pagination || defaultPagination,
  };
};

const normalizeAmount = (value?: number | string | null): number => {
  const amount = Number(value || 0);

  if (!Number.isFinite(amount) || amount < 0) return 0;

  return Math.round(amount);
};

const buildPhaseFinancialPayload = (
  payload?: ProjectPhaseFinancialPayload,
): ProjectPhaseFinancialPayload => {
  const expectedRevenue = normalizeAmount(
    payload?.expectedRevenue ?? payload?.potentialRevenueAmount,
  );
  const expectedExpense = normalizeAmount(
    payload?.expectedExpense ?? payload?.potentialCostAmount,
  );
  const realizedRevenue = normalizeAmount(
    payload?.realizedRevenue ?? payload?.realizedRevenueAmount,
  );
  const realizedExpense = normalizeAmount(
    payload?.realizedExpense ?? payload?.realizedCostAmount,
  );

  return {
    expectedRevenue,
    expectedExpense,
    realizedRevenue,
    realizedExpense,
    potentialRevenueAmount: expectedRevenue,
    potentialCostAmount: expectedExpense,
    realizedRevenueAmount: realizedRevenue,
    realizedCostAmount: realizedExpense,
    currency: payload?.currency || 'IRR',
    note: payload?.note || '',
  };
};

const buildPhaseRequestPayload = (
  phase: Partial<ProjectPhasePayload>,
): Record<string, unknown> => ({
  id: phase.id || undefined,
  _id: phase._id || undefined,
  title: phase.title || '',
  description: phase.description || '',
  assignedUserIds: phase.assignedUserIds || [],
  startDate: phase.startDate || '',
  endDate: phase.endDate || '',
  financial: buildPhaseFinancialPayload(phase.financial),
});

const normalizePhasesResponse = (responseData: unknown): ProjectPhase[] => {
  const data = unwrapData<any>(responseData as any);

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.phases)) return data.phases;
  if (Array.isArray(data?.project?.phases)) return data.project.phases;

  return [];
};

const getFileTaskId = (file: ProjectFile): string => {
  const taskRef = file.taskId as unknown;

  if (!taskRef) return '';
  if (typeof taskRef === 'string') return taskRef;

  const taskObject = taskRef as {
    id?: string;
    _id?: string;
  };

  return taskObject.id || taskObject._id || '';
};

const attachFilesToTasks = (
  tasks: ProjectTask[],
  files: ProjectFile[],
): ProjectTask[] => {
  const filesByTaskId = files.reduce<Record<string, ProjectFile[]>>(
    (acc, file) => {
      const taskId = getFileTaskId(file);

      if (!taskId) return acc;
      if (!acc[taskId]) acc[taskId] = [];

      acc[taskId].push(file);

      return acc;
    },
    {},
  );

  return tasks.map((task) => {
    const taskId = getTaskId(task);
    const currentFiles = Array.isArray(task.files) ? task.files : [];
    const attachedFiles = filesByTaskId[taskId] || [];
    const mergedFilesMap = new Map<string, ProjectFile>();

    [...currentFiles, ...attachedFiles].forEach((file) => {
      const fileKey = file.id || file._id || file.fileUrl || file.fileName;

      if (fileKey) {
        mergedFilesMap.set(fileKey, file);
      }
    });

    const mergedFiles = Array.from(mergedFilesMap.values());

    return {
      ...task,
      files: mergedFiles,
      attachmentCount: mergedFiles.length,
    };
  });
};

const fetchProjectFiles = async (projectId: string): Promise<ProjectFile[]> => {
  const response = await apiClient.get(`/projects/${projectId}/files`, {
    params: {
      standaloneOnly: false,
    },
  });

  return unwrapData<ProjectFile[]>(response.data) || [];
};

const attachProjectFilesToTask = async (
  projectId: string,
  task: ProjectTask,
): Promise<ProjectTask> => {
  const files = await fetchProjectFiles(projectId);
  const [taskWithFiles] = attachFilesToTasks([task], files);

  return taskWithFiles || task;
};

const uploadTaskFilesRequest = async (
  projectId: string,
  taskId: string,
  files: File[],
): Promise<ProjectTask> => {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append('files', file);
  });

  const response = await apiClient.post(
    `/projects/${projectId}/tasks/${taskId}/files`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );

  const task = unwrapData<ProjectTask>(response.data);

  return attachProjectFilesToTask(projectId, task);
};

export const getProjectRoleId = (
  role: string | ProjectRole | null | undefined,
): string => {
  if (!role) return '';
  if (typeof role === 'string') return role;

  return String(role.id || role._id || '');
};

export const getProjectRoleTitle = (
  role: string | ProjectRole | null | undefined,
): string => {
  if (!role) return '';
  if (typeof role === 'string') return role;

  return String(role.title || role.name || '');
};

const normalizeProjectRole = (role: any): ProjectRole => ({
  ...role,
  id: String(role.id || role._id || ''),
  title: String(role.title || role.name || ''),
  description: role.description || '',
  isActive: role.isActive !== false,
  sortOrder: Number(role.sortOrder ?? role.displayOrder ?? 0),
  displayOrder: Number(role.displayOrder ?? role.sortOrder ?? 0),
});

const buildProjectRequestPayload = (
  payload: Partial<ProjectRequestPayload>,
): Record<string, unknown> => {
  const requestPayload: Record<string, unknown> = {
    ...payload,
  };

  if ('dueDate' in requestPayload) {
    requestPayload.dueDate = requestPayload.dueDate || null;
  }

  if ('assignedUserIds' in requestPayload) {
    requestPayload.assignedUserIds = requestPayload.assignedUserIds || [];
  }

  if ('phases' in requestPayload && Array.isArray(payload.phases)) {
    requestPayload.phases = payload.phases.map(buildPhaseRequestPayload);
  }

  if ('projectMembers' in requestPayload && Array.isArray(payload.projectMembers)) {
    requestPayload.projectMembers = payload.projectMembers.map((member) => ({
      userId: member.userId,
      roleId: member.roleId || null,
      roleInProject: member.roleInProject || '',
      startedAt: member.startedAt || null,
      expectedFinishedAt: member.expectedFinishedAt || null,
    }));
  }

  return requestPayload;
};

const buildTaskRequestPayload = (payload: Partial<ProjectTaskPayload>) => {
  const requestPayload: Record<string, unknown> = {};

  if (payload.title !== undefined) requestPayload.title = payload.title;
  if (payload.description !== undefined) requestPayload.description = payload.description || '';
  if (payload.assignedUserIds !== undefined) requestPayload.assignedUserIds = payload.assignedUserIds || [];
  if (payload.status !== undefined) requestPayload.status = payload.status;
  if (payload.priority !== undefined) requestPayload.priority = payload.priority;
  if (payload.startDate !== undefined) requestPayload.startDate = payload.startDate || null;
  if (payload.dueDate !== undefined) requestPayload.dueDate = payload.dueDate || null;

  return requestPayload;
};

export const projectService = {
  async getProjectOverview(): Promise<ProjectOverviewData> {
    try {
      const response = await apiClient.get('/project-overview');

      return unwrapData<ProjectOverviewData>(response.data);
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در دریافت نمای کلان پروژه‌ها'));
    }
  },

  async listProjects(params?: QueryParams): Promise<ProjectListResponse> {
    try {
      const response = await apiClient.get('/projects', { params });

      return normalizeListResponse(response.data);
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در دریافت پروژه‌ها'));
    }
  },

  async createProject(payload: ProjectRequestPayload): Promise<Project> {
    try {
      const response = await apiClient.post(
        '/projects',
        buildProjectRequestPayload(payload),
      );

      return unwrapData<Project>(response.data);
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در ایجاد پروژه'));
    }
  },

  async importProjectsFromExcel(file: File): Promise<ProjectImportResult> {
    try {
      const formData = new FormData();

      formData.append('file', file);

      const response = await apiClient.post('/projects/import/excel', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return unwrapData<ProjectImportResult>(response.data);
    } catch (error) {
      const importError = error as {
        response?: {
          data?: {
            data?: ProjectImportResult;
          };
        };
      };
      const validationResult = importError.response?.data?.data;

      if (validationResult && Array.isArray(validationResult.errors)) {
        return validationResult;
      }

      throw new Error(unwrapMessage(error, 'خطا در ورود پروژه‌ها از اکسل'));
    }
  },

  async getProject(projectId: string): Promise<Project> {
    try {
      const response = await apiClient.get(`/projects/${projectId}`);

      return unwrapData<Project>(response.data);
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در دریافت پروژه'));
    }
  },

  async updateProject(
    projectId: string,
    payload: Partial<ProjectRequestPayload>,
  ): Promise<Project> {
    try {
      await apiClient.patch(
        `/projects/${projectId}`,
        buildProjectRequestPayload(payload),
      );

      // Always read the canonical saved document after a mutation. Project phases
      // live in a separate backend collection, so returning only the Project
      // document can make the UI appear unchanged or temporarily drop phase data.
      const refreshedResponse = await apiClient.get(`/projects/${projectId}`, {
        params: {
          _updatedAt: Date.now(),
        },
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      });

      return unwrapData<Project>(refreshedResponse.data);
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در ویرایش پروژه'));
    }
  },

  async deleteProject(projectId: string): Promise<void> {
    try {
      await apiClient.delete(`/projects/${projectId}`);
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در حذف پروژه'));
    }
  },

  async listProjectPhases(projectId: string): Promise<ProjectPhase[]> {
    try {
      const response = await apiClient.get(`/projects/${projectId}/phases`);

      return normalizePhasesResponse(response.data);
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در دریافت فازهای پروژه'));
    }
  },

  async createProjectPhase(
    projectId: string,
    payload: ProjectPhasePayload,
  ): Promise<Project> {
    try {
      const response = await apiClient.post(
        `/projects/${projectId}/phases`,
        buildPhaseRequestPayload(payload),
      );

      return unwrapData<Project>(response.data);
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در ایجاد فاز پروژه'));
    }
  },

  async getProjectPhase(
    projectId: string,
    phaseId: string,
  ): Promise<ProjectPhase> {
    try {
      const response = await apiClient.get(`/projects/${projectId}/phases/${phaseId}`);

      return unwrapData<ProjectPhase>(response.data);
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در دریافت فاز پروژه'));
    }
  },

  async updateProjectPhase(
    projectId: string,
    phaseId: string,
    payload: Partial<ProjectPhasePayload>,
  ): Promise<Project> {
    try {
      const response = await apiClient.patch(
        `/projects/${projectId}/phases/${phaseId}`,
        buildPhaseRequestPayload({
          title: payload.title || '',
          description: payload.description || '',
          assignedUserIds: payload.assignedUserIds || [],
          startDate: payload.startDate || '',
          endDate: payload.endDate || '',
          financial: payload.financial,
        }),
      );

      return unwrapData<Project>(response.data);
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در ویرایش فاز پروژه'));
    }
  },

  async updateProjectPhaseFinancial(
    projectId: string,
    phaseId: string,
    payload: ProjectPhaseFinancialPayload,
  ): Promise<ProjectPhase> {
    try {
      const response = await apiClient.patch(
        `/projects/${projectId}/phases/${phaseId}/financial`,
        buildPhaseFinancialPayload(payload),
      );

      return unwrapData<ProjectPhase>(response.data);
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در ثبت مالی فاز پروژه'));
    }
  },

  async deleteProjectPhase(projectId: string, phaseId: string): Promise<Project> {
    try {
      const response = await apiClient.delete(`/projects/${projectId}/phases/${phaseId}`);

      return unwrapData<Project>(response.data);
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در حذف فاز پروژه'));
    }
  },

  async assignUsers(projectId: string, userIds: string[]): Promise<Project> {
    try {
      const response = await apiClient.post(`/projects/${projectId}/users`, {
        userIds,
      });

      return unwrapData<Project>(response.data);
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در تخصیص کاربران به پروژه'));
    }
  },

  async removeUser(projectId: string, userId: string): Promise<Project> {
    try {
      const response = await apiClient.delete(
        `/projects/${projectId}/users/${userId}`,
      );

      return unwrapData<Project>(response.data);
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در حذف کاربر از پروژه'));
    }
  },

  async updateProjectMember(
    projectId: string,
    userId: string,
    payload: ProjectMemberUpdatePayload,
  ): Promise<Project> {
    try {
      const response = await apiClient.patch(
        `/projects/${projectId}/users/${userId}`,
        {
          roleId: payload.roleId || null,
          roleInProject: payload.roleInProject || '',
          startedAt: payload.startedAt || null,
          expectedFinishedAt: payload.expectedFinishedAt || null,
        },
      );

      return unwrapData<Project>(response.data);
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در ویرایش نقش عضو پروژه'));
    }
  },

  async listProjectRoles(includeInactive = false): Promise<ProjectRole[]> {
    try {
      const response = await apiClient.get('/project-roles', {
        params: {
          includeInactive: includeInactive || undefined,
        },
      });

      const roles = unwrapData<ProjectRole[]>(response.data) || [];

      return Array.isArray(roles) ? roles.map(normalizeProjectRole) : [];
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در دریافت نقش‌های پروژه'));
    }
  },

  async createProjectRole(payload: ProjectRolePayload): Promise<ProjectRole> {
    try {
      const response = await apiClient.post('/project-roles', {
        title: payload.title,
        description: payload.description || '',
        isActive: payload.isActive !== false,
        sortOrder: payload.sortOrder ?? 0,
      });

      return normalizeProjectRole(unwrapData<ProjectRole>(response.data));
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در ایجاد نقش پروژه'));
    }
  },

  async updateProjectRole(
    roleId: string,
    payload: Partial<ProjectRolePayload>,
  ): Promise<ProjectRole> {
    try {
      const response = await apiClient.patch(`/project-roles/${roleId}`, {
        ...payload,
        description: payload.description ?? undefined,
        sortOrder: payload.sortOrder ?? undefined,
      });

      return normalizeProjectRole(unwrapData<ProjectRole>(response.data));
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در ویرایش نقش پروژه'));
    }
  },

  async archiveProjectRole(roleId: string): Promise<void> {
    try {
      await apiClient.delete(`/project-roles/${roleId}`);
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در غیرفعال‌سازی نقش پروژه'));
    }
  },

  async deleteProjectRole(roleId: string): Promise<void> {
    try {
      await apiClient.delete(`/project-roles/${roleId}`);
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در غیرفعال‌سازی نقش پروژه'));
    }
  },

  async listExpertProjectCompletions(
    projectId: string,
  ): Promise<ExpertProjectCompletion[]> {
    try {
      const response = await apiClient.get(
        `/projects/${projectId}/expert-completions`,
      );

      return unwrapData<ExpertProjectCompletion[]>(response.data) || [];
    } catch (error) {
      throw new Error(
        unwrapMessage(error, 'خطا در دریافت کارهای تکمیل‌شده کارشناسان'),
      );
    }
  },

  async listProjectWorkHistory(
    projectId: string,
  ): Promise<ProjectWorkHistoryResponse> {
    try {
      const response = await apiClient.get(
        `/projects/${projectId}/work-history`,
        { headers: { 'X-Skip-Toast': '1' } },
      );

      return normalizeProjectWorkHistoryResponse(response.data);
    } catch (error) {
      throw new Error(
        unwrapMessage(error, 'خطا در دریافت سوابق کامل کار پروژه'),
      );
    }
  },

  async listProjectExpertWorkLogs(projectId: string): Promise<ExpertWorkLog[]> {
    try {
      const response = await apiClient.get(
        `/projects/${projectId}/expert-work-logs`,
      );

      return unwrapData<ExpertWorkLog[]>(response.data) || [];
    } catch (error) {
      throw new Error(
        unwrapMessage(error, 'خطا در دریافت گزارش‌های کار کارشناسان'),
      );
    }
  },

  async listTasks(projectId: string): Promise<ProjectTask[]> {
    try {
      const [tasksResponse, files] = await Promise.all([
        apiClient.get(`/projects/${projectId}/tasks`),
        fetchProjectFiles(projectId).catch(() => []),
      ]);

      const tasks = unwrapData<ProjectTask[]>(tasksResponse.data) || [];

      return attachFilesToTasks(tasks, files);
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در دریافت وظایف پروژه'));
    }
  },

  async createTask(
    projectId: string,
    payload: ProjectTaskPayload,
  ): Promise<ProjectTask> {
    try {
      const response = await apiClient.post(
        `/projects/${projectId}/tasks`,
        buildTaskRequestPayload(payload),
      );

      const createdTask = unwrapData<ProjectTask>(response.data);
      const createdTaskId = getTaskId(createdTask);

      if (payload.files?.length && createdTaskId) {
        return await uploadTaskFilesRequest(projectId, createdTaskId, payload.files);
      }

      return await attachProjectFilesToTask(projectId, createdTask);
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در ایجاد وظیفه'));
    }
  },

  async updateTask(
    projectId: string,
    taskId: string,
    payload: Partial<ProjectTaskPayload>,
  ): Promise<ProjectTask> {
    try {
      const response = await apiClient.patch(
        `/projects/${projectId}/tasks/${taskId}`,
        buildTaskRequestPayload(payload),
      );

      const updatedTask = unwrapData<ProjectTask>(response.data);

      if (payload.files?.length) {
        return await uploadTaskFilesRequest(projectId, taskId, payload.files);
      }

      return await attachProjectFilesToTask(projectId, updatedTask);
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در ویرایش وظیفه'));
    }
  },

  async closeTask(projectId: string, taskId: string): Promise<ProjectTask> {
    try {
      const response = await apiClient.patch(
        `/projects/${projectId}/tasks/${taskId}`,
        {
          status: 'done',
        },
        {
          headers: {
            'X-Toast-Success-Message': 'کار با موفقیت بسته شد.',
          },
        },
      );

      const task = unwrapData<ProjectTask>(response.data);

      return await attachProjectFilesToTask(projectId, task);
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در بستن کار'));
    }
  },

  async uploadTaskFiles(
    projectId: string,
    taskId: string,
    files: File[],
  ): Promise<ProjectTask> {
    try {
      return await uploadTaskFilesRequest(projectId, taskId, files);
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در ارسال فایل برای وظیفه'));
    }
  },

  async deleteTask(projectId: string, taskId: string): Promise<void> {
    try {
      await apiClient.delete(`/projects/${projectId}/tasks/${taskId}`);
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در حذف وظیفه'));
    }
  },

  async listNotes(projectId: string): Promise<ProjectProgressNote[]> {
    try {
      const response = await apiClient.get(`/projects/${projectId}/notes`);

      return unwrapData<ProjectProgressNote[]>(response.data) || [];
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در دریافت یادداشت‌های پروژه'));
    }
  },

  async createNote(
    projectId: string,
    payload: CreateProjectNotePayload,
  ): Promise<ProjectProgressNote> {
    try {
      if (payload.file) {
        const formData = new FormData();

        formData.append('note', payload.note || '');

        if (payload.authorId) formData.append('authorId', payload.authorId);

        if (
          payload.progressPercent !== undefined &&
          payload.progressPercent !== null
        ) {
          formData.append('progressPercent', String(payload.progressPercent));
        }

        if (payload.statusSnapshot) formData.append('statusSnapshot', payload.statusSnapshot);

        formData.append('file', payload.file);

        const response = await apiClient.post(
          `/projects/${projectId}/notes`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          },
        );

        return unwrapData<ProjectProgressNote>(response.data);
      }

      const response = await apiClient.post(`/projects/${projectId}/notes`, {
        authorId: payload.authorId,
        note: payload.note || '',
        progressPercent: payload.progressPercent,
        statusSnapshot: payload.statusSnapshot,
      });

      return unwrapData<ProjectProgressNote>(response.data);
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در ثبت گزارش کار'));
    }
  },

  async listFiles(
    projectId: string,
    params?: { standaloneOnly?: boolean },
  ): Promise<ProjectFile[]> {
    try {
      const response = await apiClient.get(`/projects/${projectId}/files`, {
        params,
      });

      return unwrapData<ProjectFile[]>(response.data) || [];
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در دریافت فایل‌های پروژه'));
    }
  },

  async uploadFile(
    projectId: string,
    payload: {
      file: File;
      category: string;
      progressNoteId?: string | null;
      taskId?: string | null;
    },
  ): Promise<ProjectFile> {
    try {
      const formData = new FormData();

      formData.append('file', payload.file);
      formData.append('category', payload.category || 'other');

      if (payload.progressNoteId) formData.append('progressNoteId', payload.progressNoteId);
      if (payload.taskId) formData.append('taskId', payload.taskId);

      const response = await apiClient.post(
        `/projects/${projectId}/files`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );

      return unwrapData<ProjectFile>(response.data);
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در آپلود فایل پروژه'));
    }
  },

  async deleteFile(projectId: string, fileId: string): Promise<void> {
    try {
      await apiClient.delete(`/projects/${projectId}/files/${fileId}`);
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در حذف فایل پروژه'));
    }
  },

  async listCalendarEvents(params?: QueryParams): Promise<CalendarEvent[]> {
    try {
      const response = await apiClient.get('/projects/calendar/events', {
        params,
      });

      return unwrapData<CalendarEvent[]>(response.data) || [];
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در دریافت تقویم پروژه‌ها'));
    }
  },
};
