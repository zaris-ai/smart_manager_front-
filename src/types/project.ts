export type UserRole = 'board' | 'manager' | 'expert' | 'admin' | 'employee';

export type ProjectStatus =
  | 'negotiating'
  | 'proposal_drafting'
  | 'contract_signing'
  | 'planning'
  | 'active'
  | 'on_hold'
  | 'completed'
  | 'cancelled';

export type ProjectPriority = 'low' | 'medium' | 'high' | 'critical';

export type ProjectTaskStatus =
  | 'todo'
  | 'in_progress'
  | 'blocked'
  | 'done'
  | 'cancelled';

export type ProjectFileCategory =
  | 'requirements'
  | 'contracts'
  | 'design'
  | 'reports'
  | 'meeting_notes'
  | 'delivery'
  | 'task_attachment'
  | 'other';

export type ProjectFileTranscriptionStatus =
  | 'not_applicable'
  | 'completed'
  | 'failed';

export type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  pagination?: PaginationState;
};

export type PaginationState = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type UserSummary = {
  id?: string;
  _id?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  username?: string;
  email?: string;
  role?: UserRole | string;
  roleLabel?: string;
  isActive?: boolean;
  telegramChatId?: string;
  profile?: {
    jobTitle?: string;
    domain?: string;
    specialtyChapter?: string;
    responsibilityScope?: string;
    bio?: string;
  };
};

export type UserReference = string | UserSummary;

export type ProjectPhaseFinancial = {
  expectedRevenue?: number | null;
  expectedExpense?: number | null;
  realizedRevenue?: number | null;
  realizedExpense?: number | null;
  potentialRevenueAmount?: number | null;
  potentialCostAmount?: number | null;
  realizedRevenueAmount?: number | null;
  realizedCostAmount?: number | null;
  currency?: string;
  note?: string;
  updatedAt?: string | null;
};

export type ProjectPhaseFinancialPayload = {
  expectedRevenue?: number | null;
  expectedExpense?: number | null;
  realizedRevenue?: number | null;
  realizedExpense?: number | null;
  potentialRevenueAmount?: number | null;
  potentialCostAmount?: number | null;
  realizedRevenueAmount?: number | null;
  realizedCostAmount?: number | null;
  currency?: string;
  note?: string;
};

export type ProjectPhase = {
  id?: string;
  _id?: string;
  title: string;
  description?: string;
  assignedUserIds: UserReference[];
  startDate: string;
  endDate: string;
  financial?: ProjectPhaseFinancial;
  financialSummary?: {
    expectedProfit?: number | null;
    realizedProfit?: number | null;
    revenueAchievementPercent?: number | null;
    expenseUsagePercent?: number | null;
  };
  createdBy?: UserReference | null;
  updatedBy?: UserReference | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ProjectPhasePayload = {
  id?: string;
  _id?: string;
  title: string;
  description?: string;
  assignedUserIds: string[];
  startDate: string;
  endDate: string;
  financial?: ProjectPhaseFinancialPayload;
};

export type ProjectPhaseSummary = {
  phaseCount?: number;
  totalPhases?: number;
  totalExpectedRevenue?: number;
  totalExpectedExpense?: number;
  totalRealizedRevenue?: number;
  totalRealizedExpense?: number;
  expectedBalance?: number;
  realizedBalance?: number;
  totalPotentialRevenue?: number;
  totalPotentialCost?: number;
  totalRealizedCost?: number;
  potentialBalance?: number;
};

export type Project = {
  id?: string;
  _id?: string;
  title: string;
  description?: string;
  status: ProjectStatus;
  statusLabel?: string;
  priority: ProjectPriority;
  priorityLabel?: string;
  startDate: string;
  dueDate?: string | null;
  ownerId?: UserReference | null;
  assignedUserIds: UserReference[];
  phases?: ProjectPhase[];
  phaseSummary?: ProjectPhaseSummary;
  language?: 'fa';
  direction?: 'rtl';
  createdBy?: UserReference | null;
  updatedBy?: UserReference | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectTask = {
  id?: string;
  _id?: string;
  projectId: string;
  title: string;
  description?: string;
  assignedUserIds: UserReference[];
  status: ProjectTaskStatus;
  statusLabel?: string;
  priority: ProjectPriority;
  priorityLabel?: string;
  startDate?: string | null;
  dueDate?: string | null;
  completedAt?: string | null;
  files?: ProjectFile[];
  attachmentCount?: number;
  createdBy?: UserReference | null;
  updatedBy?: UserReference | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectProgressNote = {
  id?: string;
  _id?: string;
  projectId: string;
  authorId?: UserReference | null;
  registeredById?: UserReference | null;
  note: string;
  progressPercent?: number | null;
  statusSnapshot?: ProjectStatus | string;
  source?: 'web' | 'telegram_bot';
  telegramChatId?: string;
  telegramMessageId?: number | null;
  files?: ProjectFile[];
  attachmentCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type ProjectFile = {
  id?: string;
  _id?: string;
  projectId: string;
  progressNoteId?: string | ProjectProgressNote | null;
  taskId?: string | ProjectTask | null;
  uploadedBy?: UserReference | null;
  fileName: string;
  originalName: string;
  fileUrl: string;
  fileType?: string;
  fileSize?: number;
  category: ProjectFileCategory;
  categoryLabel?: string;
  transcriptionStatus?: ProjectFileTranscriptionStatus;
  transcriptionText?: string;
  transcriptionError?: string;
  transcriptionModel?: string;
  transcriptionLanguage?: string;
  transcribedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CalendarEvent = {
  id: string;
  title: string;
  type:
    | 'project_start'
    | 'project_due'
    | 'phase_start'
    | 'phase_end'
    | 'task_start'
    | 'task_due'
    | 'task_completed';
  projectId: string;
  taskId?: string;
  phaseId?: string;
  start: string;
  end?: string;
  status: ProjectStatus | ProjectTaskStatus | string;
  priority: ProjectPriority;
  assignedUserIds: UserReference[];
};

export type ProjectPayload = {
  title: string;
  description?: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  startDate: string;
  dueDate?: string | null;
  ownerId: string;
  assignedUserIds: string[];
  phases?: ProjectPhasePayload[];
};

export type ProjectTaskPayload = {
  title: string;
  description?: string;
  assignedUserIds: string[];
  status: ProjectTaskStatus;
  priority: ProjectPriority;
  startDate?: string | null;
  dueDate?: string | null;
  files?: File[];
};

export type CreateProjectNotePayload = {
  authorId?: string;
  note?: string;
  progressPercent?: number | null;
  statusSnapshot?: string;
  file?: File | null;
};

export type ProjectListResponse = {
  items: Project[];
  pagination: PaginationState;
};

export type ProjectImportError = {
  sheet?: 'Projects' | 'Phases';
  rowNumber: number;
  title?: string;
  message: string;
};

export type ProjectImportCreatedItem = {
  rowNumber: number;
  id: string;
  title: string;
  phaseCount?: number;
  staffingRequired?: boolean;
};

export type ProjectImportResult = {
  staffingMode?: 'post_import' | string;
  totalProjectRows?: number;
  totalPhaseRows?: number;
  totalRows?: number;
  createdCount: number;
  createdPhaseCount?: number;
  skippedCount: number;
  failedCount: number;
  created: ProjectImportCreatedItem[];
  errors: ProjectImportError[];
};

export const projectStatusLabels: Record<ProjectStatus, string> = {
  negotiating: 'در حال مذاکره',
  proposal_drafting: 'تدوین پروپوزال',
  contract_signing: 'عقد قرارداد',
  planning: 'برنامه‌ریزی',
  active: 'فعال',
  on_hold: 'متوقف موقت',
  completed: 'تکمیل‌شده',
  cancelled: 'لغوشده',
};

export const projectPriorityLabels: Record<ProjectPriority, string> = {
  low: 'کم',
  medium: 'متوسط',
  high: 'زیاد',
  critical: 'بحرانی',
};

export const projectTaskStatusLabels: Record<ProjectTaskStatus, string> = {
  todo: 'برای انجام',
  in_progress: 'در حال انجام',
  blocked: 'مسدود',
  done: 'انجام‌شده',
  cancelled: 'لغوشده',
};

export const projectFileCategoryLabels: Record<ProjectFileCategory, string> = {
  requirements: 'نیازمندی‌ها',
  contracts: 'قراردادها',
  design: 'طراحی',
  reports: 'گزارش‌ها',
  meeting_notes: 'صورت‌جلسه',
  delivery: 'تحویل',
  task_attachment: 'پیوست وظیفه',
  other: 'سایر',
};

export const getReferenceId = (value?: UserReference | null): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;

  return value.id || value._id || '';
};

export const getUserDisplayName = (user?: UserReference | null): string => {
  if (!user) return 'کاربر نامشخص';
  if (typeof user === 'string') return user;

  return (
    user.fullName ||
    [user.firstName, user.lastName].filter(Boolean).join(' ') ||
    user.username ||
    user.email ||
    user.id ||
    user._id ||
    'کاربر نامشخص'
  );
};

export const getProjectId = (project: Project): string => {
  return project.id || project._id || '';
};

export const getPhaseId = (phase: ProjectPhase): string => {
  return phase.id || phase._id || '';
};

export const getTaskId = (task: ProjectTask): string => {
  return task.id || task._id || '';
};

export const getFileId = (file: ProjectFile): string => {
  return file.id || file._id || '';
};

export const getNoteId = (note: ProjectProgressNote): string => {
  return note.id || note._id || '';
};

export const isManagerUser = (user?: UserSummary | null): boolean => {
  if (!user?.role) return false;

  const role = String(user.role).toLowerCase();

  return role === 'manager' || role === 'admin';
};

export const isEmployeeUser = (user?: UserSummary | null): boolean => {
  if (!user?.role) return false;

  const role = String(user.role).toLowerCase();

  return role === 'employee' || role === 'expert';
};
