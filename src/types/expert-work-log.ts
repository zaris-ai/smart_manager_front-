import type {
  PaginationState,
  ProjectPriority,
  ProjectStatus,
  ProjectTaskStatus,
  UserSummary,
} from './project';

export type EntityReference<T> = string | T;

export type ExpertWorkLogProject = {
  id?: string;
  _id?: string;
  title: string;
  description?: string;
  status?: ProjectStatus | string;
  statusLabel?: string;
  priority?: ProjectPriority | string;
  priorityLabel?: string;
  startDate?: string | null;
  dueDate?: string | null;
  phaseCount?: number;
  taskCount?: number;
  expertWorkLogSummary?: {
    count: number;
    totalDurationMinutes: number;
    lastWorkDate?: string | null;
  };
  permissions?: {
    canCreateWorkLog?: boolean;
  };
};

export type ExpertWorkLogPhase = {
  id?: string;
  _id?: string;
  title: string;
  description?: string;
  order?: number;
  startDate?: string | null;
  endDate?: string | null;
  assignedUserIds?: Array<EntityReference<UserSummary>>;
};

export type ExpertWorkLogTask = {
  id?: string;
  _id?: string;
  title: string;
  description?: string;
  status?: ProjectTaskStatus | string;
  statusLabel?: string;
  priority?: ProjectPriority | string;
  priorityLabel?: string;
  startDate?: string | null;
  dueDate?: string | null;
  completedAt?: string | null;
  assignedUserIds?: Array<EntityReference<UserSummary>>;
};

export type ExpertWorkLogProjectContext = {
  project: ExpertWorkLogProject;
  phases: ExpertWorkLogPhase[];
  tasks: ExpertWorkLogTask[];
  experts: UserSummary[];
  currentUser: {
    id: string;
    role: string;
    canCreateWorkLog: boolean;
  };
};

export type ExpertWorkLog = {
  id?: string;
  _id?: string;
  projectId: EntityReference<ExpertWorkLogProject>;
  expertId: EntityReference<UserSummary>;
  phaseId?: EntityReference<ExpertWorkLogPhase> | null;
  taskId?: EntityReference<ExpertWorkLogTask> | null;
  workDate: string;
  title: string;
  description: string;
  durationMinutes?: number | null;
  progressPercent?: number | null;
  deliverables?: string;
  blockers?: string;
  nextSteps?: string;
  revision?: number;
  isDeleted?: boolean;
  createdAt: string;
  updatedAt: string;
  permissions?: {
    canEdit?: boolean;
    canDelete?: boolean;
  };
};

export type ExpertWorkLogPayload = {
  projectId: string;
  phaseId?: string | null;
  taskId?: string | null;
  workDate: string;
  title: string;
  description: string;
  durationMinutes?: number | null;
  progressPercent?: number | null;
  deliverables?: string;
  blockers?: string;
  nextSteps?: string;
};

export type ExpertWorkLogFilters = {
  projectId?: string;
  expertId?: string;
  phaseId?: string;
  taskId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
};

export type ExpertWorkLogSummary = {
  totalEntries: number;
  totalDurationMinutes: number;
  expertCount: number;
  projectCount: number;
};

export type ExpertWorkLogListResult = {
  items: ExpertWorkLog[];
  summary: ExpertWorkLogSummary;
  pagination: PaginationState;
};

export type ExpertWorkLogProjectListResult = {
  items: ExpertWorkLogProject[];
  pagination: PaginationState;
};

export const getEntityId = (value?: { id?: string; _id?: string } | string | null): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.id || value._id || '';
};

export const getEntityLabel = (
  value?: { title?: string; fullName?: string; firstName?: string; lastName?: string; username?: string } | string | null,
  fallback = 'نامشخص',
): string => {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  return (
    value.title ||
    value.fullName ||
    [value.firstName, value.lastName].filter(Boolean).join(' ') ||
    value.username ||
    fallback
  );
};
