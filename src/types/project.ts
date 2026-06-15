export type UserRole = 'manager' | 'employee';

export type ProjectStatus =
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
};

export type UserReference = string | UserSummary;

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
  createdAt: string;
  updatedAt: string;
};

export type CalendarEvent = {
  id: string;
  title: string;
  type:
    | 'project_start'
    | 'project_due'
    | 'task_start'
    | 'task_due'
    | 'task_completed';
  projectId: string;
  taskId?: string;
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
  note: string;
  progressPercent?: number | null;
  statusSnapshot?: string;
  file?: File | null;
};

export type ProjectListResponse = {
  items: Project[];
  pagination: PaginationState;
};

export type ProjectImportError = {
  rowNumber: number;
  title?: string;
  message: string;
};

export type ProjectImportCreatedItem = {
  rowNumber: number;
  id: string;
  title: string;
};

export type ProjectImportResult = {
  totalRows: number;
  createdCount: number;
  skippedCount: number;
  failedCount: number;
  created: ProjectImportCreatedItem[];
  errors: ProjectImportError[];
};

export const projectStatusLabels: Record<ProjectStatus, string> = {
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

  return String(user.role).toLowerCase() === 'employee';
};