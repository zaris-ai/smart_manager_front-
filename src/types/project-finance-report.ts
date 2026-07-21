import type { PaginationState, ProjectPhase, ProjectPriority, ProjectStatus, UserReference } from './project';

export type ProjectFinanceReportSummary = {
  expectedRevenue: number;
  expectedExpense: number;
  realizedRevenue: number;
  realizedExpense: number;
  expectedBalance: number;
  realizedBalance: number;
  phaseCount: number;
  financialNoteCount: number;
  phaseDescriptionCount?: number;
  revenueAchievementPercent?: number | null;
  expenseUsagePercent?: number | null;
};

export type ProjectFinanceReportItem = {
  id: string;
  _id?: string;
  title: string;
  description?: string;
  status: ProjectStatus | string;
  statusLabel?: string;
  priority: ProjectPriority | string;
  priorityLabel?: string;
  startDate?: string | null;
  dueDate?: string | null;
  ownerId?: UserReference | null;
  phases: ProjectPhase[];
  summary: ProjectFinanceReportSummary;
};

export type ProjectFinanceReportFilters = {
  search?: string;
  status?: string;
  priority?: string;
  page?: number;
  limit?: number;
};

export type ProjectFinanceReportResult = {
  items: ProjectFinanceReportItem[];
  summary: ProjectFinanceReportSummary;
  pagination: PaginationState;
};
