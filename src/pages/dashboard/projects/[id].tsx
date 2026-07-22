import ShamsiDateInput from '@/components/common/ShamsiDateInput';
import { DashboardLayout } from '@/components/layouts';
import {
  ProjectTimelineFlow,
  TimelineFlowItem,
} from '@/components/projects/ProjectTimelineFlow';
import {
  getProjectRoleId,
  ProjectRole,
  projectService,
} from '@/services/project.service';
import { expertWorkLogService } from '@/services/expert-work-log.service';
import { userService } from '@/services/user.service';
import {
  ExpertProjectCompletion,
  getFileId,
  getNoteId,
  getPhaseId,
  getProjectId,
  getReferenceId,
  getTaskId,
  getUserDisplayName,
  isManagerUser,
  Project,
  ProjectPhase,
  projectFileCategoryLabels,
  ProjectFile,
  ProjectFileCategory,
  projectPriorityLabels,
  ProjectPriority,
  ProjectProgressNote,
  ProjectTask,
  projectTaskStatusLabels,
  ProjectTaskStatus,
  ProjectWorkHistoryItem,
} from '@/types/project';
import type { ExpertWorkLog } from '@/types/expert-work-log';
import { AppUser, normalizeUserRole } from '@/types/user';
import { withAuth } from '@/utils';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentArrowUpIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  FlagIcon,
  MicrophoneIcon,
  PaperClipIcon,
  PencilSquareIcon,
  PlusIcon,
  SpeakerWaveIcon,
  StopCircleIcon,
  UserGroupIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ElementType, FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from 'react';

type TimelineItem = TimelineFlowItem;

type TaskFormState = {
  title: string;
  description: string;
  assigneeId: string;
  startDate: string;
  dueDate: string;
  priority: ProjectPriority;
  status: ProjectTaskStatus;
  files: File[];
};

type ProjectMemberReference = {
  userId?: any;
  roleId?: ProjectRole | string | null;
  roleInProject?: string | null;
  startedAt?: string | null;
  expectedFinishedAt?: string | null;
};

type ProjectMemberFormState = {
  roleId: string;
  roleInProject: string;
  startedAt: string;
  expectedFinishedAt: string;
};

type ProjectWithMembers = Project & {
  projectMembers?: ProjectMemberReference[];
  members?: ProjectMemberReference[];
};

type ProjectWorkEntryKind = ProjectWorkHistoryItem['kind'];

type ProjectWorkEntry = Omit<ProjectWorkHistoryItem, 'id'> & {
  id?: string;
  key: string;
};

const priorityOptions: ProjectPriority[] = ['low', 'medium', 'high', 'critical'];

const fileCategoryOptions = Object.keys(
  projectFileCategoryLabels,
) as ProjectFileCategory[];


type ProjectDetailTab =
  | 'summary'
  | 'phases'
  | 'members'
  | 'tasks'
  | 'reports'
  | 'expert_activity'
  | 'expert_completions'
  | 'files'
  | 'charts';

type ProjectDetailAudience = 'general' | 'manager' | 'expert';

type ProjectDetailTabConfig = {
  key: ProjectDetailTab;
  label: string;
  hint: string;
  icon: ElementType;
  audience: ProjectDetailAudience;
};

const projectDetailTabs: ProjectDetailTabConfig[] = [
  { key: 'summary', label: 'نمای کلی پروژه', hint: 'وضعیت و اطلاعات اصلی', icon: ChartBarIcon, audience: 'general' },
  { key: 'phases', label: 'فازها', hint: 'زمان‌بندی و مالی ساده', icon: FlagIcon, audience: 'general' },
  { key: 'members', label: 'اعضای پروژه', hint: 'نقش و مسئولیت', icon: UserGroupIcon, audience: 'general' },
  { key: 'files', label: 'فایل‌های پروژه', hint: 'پیوست‌ها و مستندات', icon: PaperClipIcon, audience: 'general' },
  { key: 'charts', label: 'نمودارهای پروژه', hint: 'تحلیل و روندها', icon: ChartBarIcon, audience: 'general' },
  { key: 'tasks', label: 'وظایف مدیریتی', hint: 'تعریف، پیگیری و بستن وظایف', icon: CheckCircleIcon, audience: 'manager' },
  { key: 'reports', label: 'گزارش‌های مدیران', hint: 'کارهای ثبت‌شده توسط مدیران', icon: DocumentTextIcon, audience: 'manager' },
  { key: 'expert_completions', label: 'بررسی تکمیل کارشناسان', hint: 'تأیید یا رد اعلام تکمیل', icon: CheckCircleIcon, audience: 'manager' },
  { key: 'expert_activity', label: 'فعالیت کارشناسان', hint: 'ثبت‌های پنل و تلگرام کارشناسان', icon: UserGroupIcon, audience: 'expert' },
];

const projectDetailTabGroups: Array<{
  audience: ProjectDetailAudience;
  title: string;
  description: string;
  badgeClass: string;
  panelClass: string;
}> = [
  {
    audience: 'general',
    title: 'اطلاعات مشترک پروژه',
    description: 'اطلاعات پایه‌ای که مدیران و کارشناسان برای درک پروژه نیاز دارند.',
    badgeClass: 'badge-neutral',
    panelClass: 'border-base-300 bg-base-100',
  },
  {
    audience: 'manager',
    title: 'فضای کاری مدیران',
    description: 'تعریف وظیفه، گزارش مدیریتی و بررسی خروجی کارشناسان.',
    badgeClass: 'badge-primary',
    panelClass: 'border-primary/25 bg-primary/5',
  },
  {
    audience: 'expert',
    title: 'فضای کاری کارشناسان',
    description: 'فعالیت‌ها، خروجی‌ها و ثبت‌های انجام‌شده در پنل یا تلگرام.',
    badgeClass: 'badge-info',
    panelClass: 'border-info/25 bg-info/5',
  },
];

const createEmptyTaskForm = (): TaskFormState => ({
  title: '',
  description: '',
  assigneeId: '',
  startDate: '',
  dueDate: '',
  priority: 'medium',
  status: 'todo',
  files: [],
});

const getProjectMembers = (project?: Project | null): ProjectMemberReference[] => {
  if (!project) return [];

  const projectWithMembers = project as ProjectWithMembers;

  if (projectWithMembers.projectMembers?.length) {
    return projectWithMembers.projectMembers;
  }

  if (projectWithMembers.members?.length) {
    return projectWithMembers.members;
  }

  return (project.assignedUserIds || []).map((user) => ({
    userId: user,
    roleInProject:
      getReferenceId(user) === getReferenceId(project.ownerId)
        ? 'مسئول پروژه'
        : 'عضو پروژه',
    startedAt: project.startDate || null,
    expectedFinishedAt: project.dueDate || null,
  }));
};

const formatDate = (value?: string | null): string => {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
};

const toDateInput = (value?: string | null): string => {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  return date.toISOString().slice(0, 10);
};

const toDateKey = (value?: string | null): string => {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  return date.toISOString().slice(0, 10);
};

const isUserAssignedToTask = (task: ProjectTask, userId?: string): boolean => {
  if (!userId) return false;

  return Boolean(
    task.assignedUserIds?.some((user) => {
      return getReferenceId(user) === userId;
    }),
  );
};

const getBackendOrigin = (): string => {
  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1';

  return apiBaseUrl.replace(/\/api(?:\/v\d+)?\/?$/, '').replace(/\/$/, '');
};

const resolveFileUrl = (fileUrl: string): string => {
  if (!fileUrl) return '#';
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl;

  return `${getBackendOrigin()}${
    fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`
  }`;
};

const formatFileSize = (value?: number): string => {
  if (!value) return 'حجم نامشخص';

  if (value < 1024 * 1024) {
    return `${Math.ceil(value / 1024)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

const isAudioProjectFile = (file?: ProjectFile | null): boolean => {
  if (!file) return false;

  const fileType = String(file.fileType || '').toLowerCase();
  const fileName = String(file.originalName || file.fileName || '').toLowerCase();

  return (
    fileType.startsWith('audio/') ||
    fileType === 'video/webm' ||
    fileType === 'video/mp4' ||
    /\.(flac|mp3|mp4|mpeg|mpga|m4a|ogg|wav|webm)$/.test(fileName)
  );
};

const isAudioBrowserFile = (file?: File | null): boolean => {
  if (!file) return false;

  return (
    file.type.startsWith('audio/') ||
    file.type === 'video/webm' ||
    file.type === 'video/mp4' ||
    /\.(flac|mp3|mp4|mpeg|mpga|m4a|ogg|wav|webm)$/i.test(file.name)
  );
};

const getSupportedAudioMimeType = (): string => {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    return '';
  }

  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/mp4',
  ];

  return candidates.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) || '';
};

const getRecordedAudioExtension = (mimeType: string): string => {
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('mp4')) return 'm4a';

  return 'webm';
};

const buildRecordedAudioFile = (blob: Blob, prefix: string): File => {
  const mimeType = blob.type || 'audio/webm';
  const extension = getRecordedAudioExtension(mimeType);

  return new File([blob], `${prefix}-${Date.now()}.${extension}`, {
    type: mimeType,
  });
};

const renderFiles = (
  attachedFiles?: ProjectFile[],
  title = 'فایل‌های پیوست',
) => {
  if (!attachedFiles?.length) return null;

  return (
    <div className="mt-3 rounded-lg border border-primary/10 bg-primary/5 p-3">
      <div className="mb-2 text-xs font-bold text-primary">{title}</div>

      <div className="space-y-3">
        {attachedFiles.map((file) => {
          const fileUrl = resolveFileUrl(file.fileUrl);
          const isAudio = isAudioProjectFile(file);

          return (
            <div
              key={getFileId(file)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-900"
            >
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-3 transition hover:text-primary"
              >
                <span className="min-w-0 truncate font-medium text-gray-800 dark:text-gray-100">
                  {file.originalName}
                </span>

                <span className="shrink-0 text-gray-500">
                  {file.categoryLabel || projectFileCategoryLabels[file.category]} ·{' '}
                  {formatFileSize(file.fileSize)}
                </span>
              </a>

              {isAudio ? (
                <audio controls preload="none" src={fileUrl} className="mt-3 w-full" />
              ) : null}

              {file.transcriptionText ? (
                <div className="mt-3 rounded-lg bg-base-200/70 p-3 leading-6 text-base-content/75">
                  <div className="mb-1 flex items-center gap-1 font-bold text-primary">
                    <SpeakerWaveIcon className="h-4 w-4" />
                    متن تبدیل‌شده از صوت
                  </div>
                  {file.transcriptionText}
                </div>
              ) : file.transcriptionStatus === 'failed' ? (
                <div className="mt-3 rounded-lg bg-error/10 p-3 leading-6 text-error">
                  تبدیل صوت به متن انجام نشد: {file.transcriptionError || 'خطای نامشخص'}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const PROJECT_DETAIL_CHART_COLORS = [
  '#2563eb',
  '#7c3aed',
  '#16a34a',
  '#f59e0b',
  '#e11d48',
  '#64748b',
];

const PROJECT_DETAIL_GRID_STROKE = 'var(--app-border-soft)';

const projectDetailAxisTick = {
  fill: 'var(--app-base-content)',
  fontSize: 12,
  fontWeight: 800,
};

type ProjectDetailChartCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

const ProjectDetailChartCard = ({
  title,
  description,
  children,
}: ProjectDetailChartCardProps) => {
  return (
    <section className="avid-glass-surface rounded-2xl p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-base-content">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-xs leading-6 text-base-content/60">
              {description}
            </p>
          ) : null}
        </div>
        <div className="rounded-xl bg-primary/10 p-2 text-primary">
          <ChartBarIcon className="h-5 w-5" />
        </div>
      </div>
      <div className="text-base-content [&_.recharts-cartesian-axis-tick-value]:fill-[var(--app-base-content)] [&_.recharts-pie-label-text]:fill-[var(--app-base-content)] [&_.recharts-text]:font-bold">
        {children}
      </div>
    </section>
  );
};

const ProjectDetailEmptyChart = ({
  text = 'داده‌ای برای نمایش وجود ندارد.',
}: {
  text?: string;
}) => {
  return (
    <div className="flex h-[260px] items-center justify-center rounded-2xl border border-dashed border-base-300 text-sm text-base-content/55">
      {text}
    </div>
  );
};

type ProjectDetailTooltipProps = {
  active?: boolean;
  payload?: any[];
  label?: string;
  formatter?: (value: number) => string;
};

const ProjectDetailTooltip = ({
  active,
  payload,
  label,
  formatter = formatNumber,
}: ProjectDetailTooltipProps) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-right shadow-xl dark:border-gray-700 dark:bg-gray-900">
      {label ? (
        <div className="mb-2 text-sm font-bold text-gray-900 dark:text-gray-100">
          {label}
        </div>
      ) : null}
      <div className="space-y-1">
        {payload.map((entry) => (
          <div
            key={`${entry.name}-${entry.dataKey}`}
            className="flex min-w-[140px] items-center justify-between gap-4 text-xs"
          >
            <span className="text-gray-500">{entry.name}</span>
            <strong className="text-gray-900 dark:text-gray-100">
              {formatter(Number(entry.value || 0))}
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
};

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('fa-IR').format(value || 0);
};

const formatPercent = (value: number): string => {
  return `${formatNumber(value)}٪`;
};

type ChartLabelValue = string | number | boolean | null | undefined;

const formatTaskPercentLabel = (value: ChartLabelValue): string => {
  if (typeof value !== 'string' && typeof value !== 'number') return '';

  const percent = Number(value);

  if (!Number.isFinite(percent) || percent < 8) return '';

  return formatPercent(percent);
};

const formatAmount = (value: number): string => {
  return `${formatNumber(value)} ریال`;
};

const normalizeAmount = (value?: number | string | null): number => {
  const amount = Number(value || 0);

  if (!Number.isFinite(amount) || amount < 0) return 0;

  return Math.round(amount);
};

const getPhaseFinancial = (phase: ProjectPhase) => {
  const financial = phase.financial || {};

  return {
    potentialRevenue: normalizeAmount(
      financial.potentialRevenueAmount ?? financial.expectedRevenue,
    ),
    potentialCost: normalizeAmount(
      financial.potentialCostAmount ?? financial.expectedExpense,
    ),
    realizedRevenue: normalizeAmount(
      financial.realizedRevenueAmount ?? financial.realizedRevenue,
    ),
    realizedCost: normalizeAmount(
      financial.realizedCostAmount ?? financial.realizedExpense,
    ),
  };
};

const getDaysBetween = (start?: string | null, end?: string | null): number => {
  if (!start || !end) return 0;

  const startDate = new Date(start);
  const endDate = new Date(end);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return 0;
  }

  return Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000));
};

const getPhaseStatusLabel = (phase: ProjectPhase): string => {
  const now = new Date();
  const startDate = new Date(phase.startDate);
  const endDate = new Date(phase.endDate);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return 'نامشخص';
  }

  if (now < startDate) return 'شروع‌نشده';
  if (now > endDate) return 'پایان‌یافته';

  return 'در جریان';
};

const getReferenceTitle = (value: unknown): string => {
  if (!value || typeof value === 'string') return '';

  const reference = value as { title?: string };
  return reference.title || '';
};

const normalizeProjectWorkSource = (
  source?: string | null,
): 'panel' | 'telegram_bot' => {
  return source === 'telegram_bot' ? 'telegram_bot' : 'panel';
};

const projectWorkKindLabels: Record<ProjectWorkEntryKind, string> = {
  project_note: 'گزارش ثبت‌شده در پنل',
  expert_work_log: 'گزارش کار کارشناس',
  expert_completion: 'اعلام تکمیل کارشناس',
  completed_task: 'وظیفه تکمیل‌شده',
};

const getProjectWorkKindClass = (kind: ProjectWorkEntryKind): string => {
  if (kind === 'completed_task') return 'badge-success';
  if (kind === 'expert_completion') return 'badge-primary';
  if (kind === 'expert_work_log') return 'badge-info';

  return 'badge-neutral';
};

const expertCompletionStatusLabels: Record<
  ExpertProjectCompletion['status'],
  string
> = {
  pending: 'در انتظار تأیید',
  approved: 'تأییدشده',
  rejected: 'ردشده',
  cancelled: 'لغوشده',
};

const getExpertCompletionStatusClass = (
  status: ExpertProjectCompletion['status'],
): string => {
  if (status === 'approved') return 'badge-success';
  if (status === 'rejected') return 'badge-error';
  if (status === 'cancelled') return 'badge-ghost';

  return 'badge-warning';
};

const formatCompletionDuration = (minutes?: number | null): string => {
  if (!minutes || minutes < 1) return 'ثبت نشده';

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (!hours) return `${formatNumber(remainingMinutes)} دقیقه`;
  if (!remainingMinutes) return `${formatNumber(hours)} ساعت`;

  return `${formatNumber(hours)} ساعت و ${formatNumber(remainingMinutes)} دقیقه`;
};

const DashboardProjectDetailsPage = () => {
  const router = useRouter();
  const { data: session } = useSession();

  const projectId = typeof router.query.id === 'string' ? router.query.id : '';
  const currentUserId = session?.user?.id || '';
  const currentRole = normalizeUserRole(String(session?.user?.role || ''));
  const canManageProject = currentRole === 'manager';
  const canViewManagerWorkspace =
    currentRole === 'manager' || currentRole === 'board';
  const canViewExpertWorkspace =
    currentRole === 'manager' || currentRole === 'board' || currentRole === 'expert';
  const canViewProjectWorkHistory = canViewManagerWorkspace;

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [notes, setNotes] = useState<ProjectProgressNote[]>([]);
  const [expertCompletions, setExpertCompletions] = useState<ExpertProjectCompletion[]>([]);
  const [expertWorkLogs, setExpertWorkLogs] = useState<ExpertWorkLog[]>([]);
  const [projectWorkHistory, setProjectWorkHistory] = useState<ProjectWorkEntry[]>([]);
  const [projectWorkHistoryError, setProjectWorkHistoryError] = useState('');
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [managerUsers, setManagerUsers] = useState<AppUser[]>([]);
  const [projectRoles, setProjectRoles] = useState<ProjectRole[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [savingWorkLog, setSavingWorkLog] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  const [workNote, setWorkNote] = useState('');
  const [workAuthorId, setWorkAuthorId] = useState('');
  const [progressPercent, setProgressPercent] = useState('');
  const [workLogFile, setWorkLogFile] = useState<File | null>(null);

  const [editingTaskId, setEditingTaskId] = useState('');
  const [taskForm, setTaskForm] = useState<TaskFormState>(
    createEmptyTaskForm(),
  );

  const [editingMemberId, setEditingMemberId] = useState('');
  const [savingMember, setSavingMember] = useState(false);
  const [memberForm, setMemberForm] = useState<ProjectMemberFormState>({
    roleId: '',
    roleInProject: '',
    startedAt: '',
    expectedFinishedAt: '',
  });

  const [fileCategory, setFileCategory] = useState<ProjectFileCategory>('other');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeProjectTab, setActiveProjectTab] = useState<ProjectDetailTab>('summary');

  const taskRecorderRef = useRef<MediaRecorder | null>(null);
  const workLogRecorderRef = useRef<MediaRecorder | null>(null);
  const [recordingTaskAudio, setRecordingTaskAudio] = useState(false);
  const [recordingWorkLogAudio, setRecordingWorkLogAudio] = useState(false);

  const visibleTasks = useMemo(() => {
    return tasks.filter((task) => task.status !== 'done');
  }, [tasks]);

  const openTasks = useMemo(() => {
    return visibleTasks.filter((task) => task.status !== 'cancelled');
  }, [visibleTasks]);

  const todayTasks = useMemo(() => {
    const today = toDateKey(new Date().toISOString());

    return visibleTasks.filter((task) => toDateKey(task.dueDate) === today);
  }, [visibleTasks]);

  const projectMembers = useMemo(() => getProjectMembers(project), [project]);

  const projectPhases = useMemo(() => {
    return Array.isArray(project?.phases) ? project.phases : [];
  }, [project]);

  const unassignedPhaseCount = useMemo(() => {
    return projectPhases.filter((phase) => !phase.assignedUserIds?.length).length;
  }, [projectPhases]);

  const projectStaffingPending = useMemo(() => {
    if (!project) return false;

    return (
      !getReferenceId(project.ownerId) ||
      projectMembers.length === 0 ||
      unassignedPhaseCount > 0
    );
  }, [project, projectMembers.length, unassignedPhaseCount]);

  const phaseFinancialTotals = useMemo(() => {
    return projectPhases.reduce(
      (acc, phase) => {
        const financial = getPhaseFinancial(phase);

        acc.potentialRevenue += financial.potentialRevenue;
        acc.potentialCost += financial.potentialCost;
        acc.realizedRevenue += financial.realizedRevenue;
        acc.realizedCost += financial.realizedCost;

        return acc;
      },
      {
        potentialRevenue: 0,
        potentialCost: 0,
        realizedRevenue: 0,
        realizedCost: 0,
      },
    );
  }, [projectPhases]);

  const completedTasks = useMemo(() => {
    return tasks.filter((task) => task.status === 'done');
  }, [tasks]);

  const completedTasksCount = completedTasks.length;

  const blockedTasksCount = useMemo(() => {
    return tasks.filter((task) => task.status === 'blocked').length;
  }, [tasks]);

  const overdueTasksCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return visibleTasks.filter((task) => {
      if (!task.dueDate || task.status === 'done' || task.status === 'cancelled') return false;

      const dueDate = new Date(task.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      return !Number.isNaN(dueDate.getTime()) && dueDate < today;
    }).length;
  }, [visibleTasks]);

  const taskCompletionRate = useMemo(() => {
    if (!tasks.length) return 0;

    return Math.round((completedTasksCount / tasks.length) * 100);
  }, [completedTasksCount, tasks.length]);

  const daysRemaining = useMemo(() => {
    if (!project?.dueDate) return null;

    const dueDate = new Date(project.dueDate);
    const today = new Date();

    if (Number.isNaN(dueDate.getTime())) return null;

    dueDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    return Math.ceil((dueDate.getTime() - today.getTime()) / 86400000);
  }, [project?.dueDate]);

  const projectHealthSnapshot = useMemo(() => {
    if (!project) {
      return {
        label: 'نامشخص',
        toneClass: 'alert-info',
        description: 'اطلاعات پروژه هنوز بارگذاری نشده است.',
      };
    }

    if (project.status === 'completed') {
      return {
        label: 'تکمیل‌شده',
        toneClass: 'alert-success',
        description: 'پروژه در وضعیت بسته و تکمیل‌شده قرار دارد.',
      };
    }

    if (overdueTasksCount > 0 || (daysRemaining !== null && daysRemaining < 0)) {
      return {
        label: 'نیازمند اقدام فوری',
        toneClass: 'alert-error',
        description: `${formatNumber(overdueTasksCount)} وظیفه عقب‌افتاده و ${formatNumber(Math.abs(daysRemaining || 0))} روز اختلاف زمانی ثبت شده است.`,
      };
    }

    if (blockedTasksCount > 0 || (daysRemaining !== null && daysRemaining <= 7)) {
      return {
        label: 'در معرض ریسک',
        toneClass: 'alert-warning',
        description: blockedTasksCount > 0
          ? `${formatNumber(blockedTasksCount)} وظیفه مسدود شده است.`
          : `کمتر از ${formatNumber(7)} روز تا سررسید پروژه باقی مانده است.`,
      };
    }

    return {
      label: 'قابل کنترل',
      toneClass: 'alert-success',
      description: 'پروژه از نظر زمان و وظایف باز در وضعیت قابل کنترل است.',
    };
  }, [blockedTasksCount, daysRemaining, overdueTasksCount, project]);



  const managerNextAction = useMemo(() => {
    if (overdueTasksCount > 0 || (daysRemaining !== null && daysRemaining < 0)) {
      return {
        title: 'اولویت امروز: کنترل عقب‌افتادگی',
        description: 'ابتدا وظایف عقب‌افتاده و تاریخ تحویل پروژه را بازبینی کنید؛ این پروژه از حالت عادی خارج شده است.',
        toneClass: 'border-error/35 bg-error/10 text-error',
      };
    }

    if (blockedTasksCount > 0) {
      return {
        title: 'اولویت امروز: رفع مانع',
        description: 'وظایف مسدودشده باعث توقف جریان کار می‌شوند. مسئول هر کار باید مانع را ثبت یا رفع کند.',
        toneClass: 'border-warning/35 bg-warning/10 text-warning',
      };
    }

    if (projectStaffingPending) {
      return {
        title: 'اولویت امروز: تکمیل افراد و مسئولیت‌ها',
        description: `مسئول پروژه، اعضا یا مسئولان ${formatNumber(unassignedPhaseCount)} فاز هنوز کامل نشده‌اند. تخصیص‌ها را در صفحه ویرایش پروژه ثبت کنید.`,
        toneClass: 'border-warning/35 bg-warning/10 text-warning',
      };
    }

    if (!projectPhases.length) {
      return {
        title: 'اولویت امروز: تکمیل ساختار فازها',
        description: 'برای مدیریت دقیق زمان و مالی، پروژه باید حداقل یک فاز زمان‌بندی‌شده داشته باشد.',
        toneClass: 'border-info/35 bg-info/10 text-info',
      };
    }

    if (!notes.length) {
      return {
        title: 'اولویت امروز: ثبت اولین گزارش کار',
        description: 'برای اینکه وضعیت پروژه قابل ردیابی باشد، حداقل یک گزارش پیشرفت باید ثبت شود.',
        toneClass: 'border-primary/35 bg-primary/10 text-primary',
      };
    }

    return {
      title: 'اولویت امروز: پایش منظم',
      description: 'پروژه فعلاً قابل کنترل است. روند پیشرفت، فازهای فعال و گزارش‌های کاری را به‌روزرسانی نگه دارید.',
      toneClass: 'border-success/35 bg-success/10 text-success',
    };
  }, [
    blockedTasksCount,
    daysRemaining,
    notes.length,
    overdueTasksCount,
    projectPhases.length,
    projectStaffingPending,
    unassignedPhaseCount,
  ]);

  const projectTaskStatusChartData = useMemo(() => {
    const totalTasks = tasks.length;

    return Object.entries(projectTaskStatusLabels)
      .map(([status, label]) => {
        const count = tasks.filter((task) => task.status === status).length;

        return {
          status,
          label,
          count,
          percent: totalTasks ? Math.round((count / totalTasks) * 100) : 0,
        };
      })
      .filter((item) => item.count > 0);
  }, [tasks]);

  const projectTaskPriorityChartData = useMemo(() => {
    return priorityOptions
      .map((priority) => ({
        priority,
        label: projectPriorityLabels[priority],
        count: tasks.filter((task) => task.priority === priority).length,
      }))
      .filter((item) => item.count > 0);
  }, [tasks]);

  const projectPhaseDurationChartData = useMemo(() => {
    return projectPhases.map((phase, index) => ({
      name: `فاز ${index + 1}`,
      title: phase.title,
      days: getDaysBetween(phase.startDate, phase.endDate),
      status: getPhaseStatusLabel(phase),
    }));
  }, [projectPhases]);

  const projectProgressTrendChartData = useMemo(() => {
    return notes
      .filter((note) => note.progressPercent !== null && note.progressPercent !== undefined)
      .slice()
      .sort((first, second) => {
        return new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime();
      })
      .map((note, index) => ({
        label: `گزارش ${index + 1}`,
        progress: Number(note.progressPercent || 0),
      }));
  }, [notes]);

  const projectFileCategoryChartData = useMemo(() => {
    const allFiles = [
      ...files,
      ...tasks.flatMap((task) => task.files || []),
      ...notes.flatMap((note) => note.files || []),
    ];

    return fileCategoryOptions
      .map((category) => ({
        category,
        label: projectFileCategoryLabels[category],
        count: allFiles.filter((file) => file.category === category).length,
      }))
      .filter((item) => item.count > 0);
  }, [files, notes, tasks]);

  const expertCompletionSummary = useMemo(() => {
    return expertCompletions.reduce(
      (summary, completion) => {
        summary.total += 1;
        summary[completion.status] += 1;
        return summary;
      },
      {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        cancelled: 0,
      },
    );
  }, [expertCompletions]);

  const projectWorkEntries = useMemo<ProjectWorkEntry[]>(() => {
    const entries: ProjectWorkEntry[] = [...projectWorkHistory];

    notes.forEach((note) => {
      const noteId = getNoteId(note);

      entries.push({
        id: noteId,
        key: `project-note-${noteId}`,
        kind: 'project_note',
        source: normalizeProjectWorkSource(note.source),
        occurredAt: note.createdAt,
        createdAt: note.createdAt,
        title: 'گزارش کار پروژه',
        description: note.note,
        actorLabel: getUserDisplayName(note.authorId),
        actorIds: [getReferenceId(note.authorId)].filter(Boolean),
        registeredByLabel: note.registeredById
          ? getUserDisplayName(note.registeredById)
          : undefined,
        progressPercent: note.progressPercent,
        files: note.files || [],
      });
    });

    expertWorkLogs.forEach((workLog) => {
      const workLogId = workLog.id || workLog._id || workLog.createdAt;

      entries.push({
        id: workLogId,
        key: `expert-work-log-${workLogId}`,
        kind: 'expert_work_log',
        source: normalizeProjectWorkSource(workLog.source),
        occurredAt: workLog.workDate || workLog.createdAt,
        createdAt: workLog.createdAt,
        title: workLog.title,
        description: workLog.description,
        actorLabel: getUserDisplayName(workLog.expertId),
        actorIds: [getReferenceId(workLog.expertId)].filter(Boolean),
        phaseLabel: getReferenceTitle(workLog.phaseId),
        taskLabel: getReferenceTitle(workLog.taskId),
        durationMinutes: workLog.durationMinutes,
        progressPercent: workLog.progressPercent,
        deliverables: workLog.deliverables,
        blockers: workLog.blockers,
        nextSteps: workLog.nextSteps,
      });
    });

    expertCompletions.forEach((completion) => {
      const completionId = completion.id || completion._id || completion.createdAt;

      entries.push({
        id: completionId,
        key: `expert-completion-${completionId}`,
        kind: 'expert_completion',
        source: normalizeProjectWorkSource(completion.source),
        occurredAt: completion.completionDate || completion.createdAt,
        createdAt: completion.createdAt,
        title: completion.title,
        description: completion.summary,
        actorLabel: getUserDisplayName(completion.expertId),
        actorIds: [getReferenceId(completion.expertId)].filter(Boolean),
        durationMinutes: completion.durationMinutes,
        deliverables: completion.deliverables,
        status: completion.status,
        statusLabel:
          completion.statusLabel || expertCompletionStatusLabels[completion.status],
      });
    });

    completedTasks.forEach((task) => {
      const taskId = getTaskId(task);
      const assigneeNames = (task.assignedUserIds || [])
        .map((user) => getUserDisplayName(user))
        .filter(Boolean);

      entries.push({
        id: taskId,
        key: `completed-task-${taskId}`,
        kind: 'completed_task',
        source: normalizeProjectWorkSource(task.source),
        occurredAt: task.completedAt || task.updatedAt || task.createdAt,
        createdAt: task.createdAt,
        title: task.title,
        description: task.description || 'برای این وظیفه توضیحی ثبت نشده است.',
        actorLabel: assigneeNames.length
          ? assigneeNames.join('، ')
          : 'بدون مسئول مشخص',
        actorIds: (task.assignedUserIds || [])
          .map((user) => getReferenceId(user))
          .filter(Boolean),
        taskLabel: task.title,
        status: 'done',
        statusLabel: task.statusLabel || projectTaskStatusLabels.done,
        files: task.files || [],
      });
    });

    const uniqueEntries = Array.from(
      new Map(
        entries.map((entry) => [
          `${entry.kind}:${entry.id || entry.key}`,
          entry,
        ]),
      ).values(),
    );

    return uniqueEntries.sort((left, right) => {
      const leftTime = new Date(left.occurredAt || left.createdAt).getTime();
      const rightTime = new Date(right.occurredAt || right.createdAt).getTime();

      return rightTime - leftTime;
    });
  }, [completedTasks, expertCompletions, expertWorkLogs, notes, projectWorkHistory]);

  const expertTaskActivityEntries = useMemo(() => {
    return projectWorkEntries.filter((entry) =>
      ['expert_work_log', 'expert_completion', 'completed_task'].includes(
        entry.kind,
      ),
    );
  }, [projectWorkEntries]);

  const visibleExpertTaskActivityEntries = useMemo(() => {
    if (currentRole !== 'expert') return expertTaskActivityEntries;

    return expertTaskActivityEntries.filter((entry) =>
      (entry.actorIds || []).includes(currentUserId),
    );
  }, [currentRole, currentUserId, expertTaskActivityEntries]);

  const managerReportEntries = useMemo(() => {
    return projectWorkEntries.filter((entry) => entry.kind === 'project_note');
  }, [projectWorkEntries]);

  const managerReportSummary = useMemo(() => {
    return managerReportEntries.reduce(
      (summary, entry) => {
        summary.total += 1;
        summary[entry.source] += 1;
        return summary;
      },
      { total: 0, panel: 0, telegram_bot: 0 },
    );
  }, [managerReportEntries]);

  const showProjectWorkHistory =
    canViewProjectWorkHistory ||
    projectWorkEntries.length > 0 ||
    Boolean(projectWorkHistoryError);

  const recentExpertActivityEntries = useMemo(() => {
    return visibleExpertTaskActivityEntries.slice(0, 4);
  }, [visibleExpertTaskActivityEntries]);

  const visibleProjectDetailTabs = useMemo(() => {
    return projectDetailTabs.filter((tab) => {
      if (tab.audience === 'manager') return canViewManagerWorkspace;
      if (tab.audience === 'expert') return canViewExpertWorkspace;
      return true;
    });
  }, [canViewExpertWorkspace, canViewManagerWorkspace]);

  const visibleProjectDetailTabGroups = useMemo(() => {
    return projectDetailTabGroups
      .map((group) => ({
        ...group,
        tabs: visibleProjectDetailTabs.filter(
          (tab) => tab.audience === group.audience,
        ),
      }))
      .filter((group) => group.tabs.length > 0);
  }, [visibleProjectDetailTabs]);

  useEffect(() => {
    if (!visibleProjectDetailTabs.some((tab) => tab.key === activeProjectTab)) {
      setActiveProjectTab('summary');
    }
  }, [activeProjectTab, visibleProjectDetailTabs]);

  const projectTabBadges = useMemo<Record<ProjectDetailTab, string>>(() => {
    const allProjectFilesCount = files.length + tasks.reduce((sum, task) => sum + Number(task.files?.length || task.attachmentCount || 0), 0) + notes.reduce((sum, note) => sum + Number(note.files?.length || 0), 0);

    return {
      summary: projectHealthSnapshot.label,
      phases: formatNumber(projectPhases.length),
      members: formatNumber(projectMembers.length),
      tasks: `${formatNumber(openTasks.length)} باز · ${formatNumber(completedTasksCount)} تکمیل`,
      reports: formatNumber(managerReportSummary.total),
      expert_activity: formatNumber(visibleExpertTaskActivityEntries.length),
      expert_completions: formatNumber(expertCompletionSummary.total),
      files: formatNumber(allProjectFilesCount),
      charts: formatNumber(projectTaskStatusChartData.length + projectPhaseDurationChartData.length + projectProgressTrendChartData.length),
    };
  }, [completedTasksCount, expertCompletionSummary.total, files.length, managerReportSummary.total, openTasks.length, projectHealthSnapshot.label, projectMembers.length, projectPhases.length, projectPhaseDurationChartData.length, projectProgressTrendChartData.length, projectTaskStatusChartData.length, tasks, visibleExpertTaskActivityEntries.length]);

  const activeProjectTabConfig = useMemo(() => {
    return visibleProjectDetailTabs.find((tab) => tab.key === activeProjectTab) || visibleProjectDetailTabs[0] || projectDetailTabs[0];
  }, [activeProjectTab, visibleProjectDetailTabs]);


  const activeProjectRoles = useMemo(() => {
    return projectRoles.filter((role) => role.isActive !== false);
  }, [projectRoles]);

  const projectRoleMap = useMemo(() => {
    return new Map(activeProjectRoles.map((role) => [getProjectRoleId(role), role]));
  }, [activeProjectRoles]);

  const loadProjectWorkspace = async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      setError('');
      setProjectWorkHistoryError('');

      const [
        projectResponse,
        tasksResponse,
        notesResponse,
        filesResponse,
        managersResponse,
        projectRolesResponse,
        expertCompletionsResponse,
        expertWorkLogsResponse,
        projectWorkHistoryResponse,
      ] = await Promise.all([
        projectService.getProject(projectId),
        projectService.listTasks(projectId),
        projectService.listNotes(projectId),
        projectService.listFiles(projectId, { standaloneOnly: true }),
        userService.listUsers({ role: 'manager', isActive: true, limit: 100 }),
        projectService.listProjectRoles(false),
        canViewManagerWorkspace
          ? projectService.listExpertProjectCompletions(projectId).catch(() => [])
          : Promise.resolve([]),
        currentRole === 'expert'
          ? expertWorkLogService
              .list({
                projectId,
                expertId: currentUserId,
                page: 1,
                limit: 500,
              })
              .then((result) => result.items)
              .catch(() => [])
          : canViewManagerWorkspace
            ? projectService.listProjectExpertWorkLogs(projectId).catch(() => [])
            : Promise.resolve([]),
        canViewManagerWorkspace
          ? projectService.listProjectWorkHistory(projectId).catch((historyError) => {
              setProjectWorkHistoryError(
                historyError instanceof Error
                  ? historyError.message
                  : 'خطا در دریافت سوابق کار پروژه',
              );

              return {
                items: [],
                summary: { total: 0, panel: 0, telegram: 0, expertEntries: 0 },
              };
            })
          : Promise.resolve({
              items: [],
              summary: { total: 0, panel: 0, telegram: 0, expertEntries: 0 },
            }),
      ]);

      setProject(projectResponse);
      setTasks(tasksResponse || []);
      setNotes(notesResponse || []);
      setFiles(filesResponse || []);
      setManagerUsers(managersResponse || []);
      setProjectRoles(projectRolesResponse || []);
      setExpertCompletions(expertCompletionsResponse || []);
      setExpertWorkLogs(expertWorkLogsResponse || []);
      setProjectWorkHistory(
        (projectWorkHistoryResponse?.items || []).map((item) => ({
          ...item,
          key: `${item.kind}-${item.id}`,
        })),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'خطا در دریافت اطلاعات پروژه',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!router.isReady) return;

    loadProjectWorkspace();
  }, [router.isReady, projectId, canViewManagerWorkspace, currentRole, currentUserId]);

  const projectManagerOptions = useMemo(() => {
    if (managerUsers.length) return managerUsers;

    if (!project) return [];

    const projectUsers = [
      project.ownerId,
      ...(project.assignedUserIds || []),
    ].filter(Boolean);

    const uniqueManagers = new Map<string, any>();

    projectUsers.forEach((user) => {
      if (typeof user === 'string' || !isManagerUser(user)) return;

      const userId = getReferenceId(user);

      if (userId) {
        uniqueManagers.set(userId, user);
      }
    });

    return Array.from(uniqueManagers.values());
  }, [project, managerUsers]);

  useEffect(() => {
    if (!projectManagerOptions.length) return;

    const currentManager = projectManagerOptions.find((manager) => {
      return getReferenceId(manager) === currentUserId;
    });

    const defaultManagerId = getReferenceId(
      currentManager || projectManagerOptions[0],
    );

    if (!workAuthorId) {
      setWorkAuthorId(defaultManagerId);
    }

    if (!taskForm.assigneeId) {
      setTaskForm((previous) => ({
        ...previous,
        assigneeId: defaultManagerId,
      }));
    }
  }, [currentUserId, projectManagerOptions, taskForm.assigneeId, workAuthorId]);

  const timelineItems = useMemo<TimelineItem[]>(() => {
    if (!project) return [];

    const items: TimelineItem[] = [
      {
        id: `project-start-${getProjectId(project)}`,
        date: project.startDate,
        title: 'شروع پروژه',
        description: project.description || project.title,
        type: 'project_start',
        meta: [
          {
            label: 'عنوان پروژه',
            value: project.title,
          },
          {
            label: 'وضعیت پروژه',
            value: project.statusLabel || project.status || '—',
          },
          {
            label: 'اولویت پروژه',
            value:
              projectPriorityLabels[project.priority] || project.priority || '—',
          },
          {
            label: 'تاریخ شروع',
            value: formatDate(project.startDate),
          },
          {
            label: 'موعد تحویل',
            value: formatDate(project.dueDate),
          },
        ],
      },
    ];

    if (project.dueDate) {
      items.push({
        id: `project-due-${getProjectId(project)}`,
        date: project.dueDate,
        title: 'موعد تحویل پروژه',
        description: project.description || project.title,
        type: 'project_due',
        meta: [
          {
            label: 'عنوان پروژه',
            value: project.title,
          },
          {
            label: 'وضعیت پروژه',
            value: project.statusLabel || project.status || '—',
          },
          {
            label: 'اولویت پروژه',
            value:
              projectPriorityLabels[project.priority] || project.priority || '—',
          },
          {
            label: 'تاریخ شروع',
            value: formatDate(project.startDate),
          },
          {
            label: 'موعد تحویل',
            value: formatDate(project.dueDate),
          },
        ],
      });
    }

    tasks.forEach((task) => {
      const taskMeta = [
        {
          label: 'عنوان وظیفه',
          value: task.title,
        },
        {
          label: 'مسئول',
          value: task.assignedUserIds?.length
            ? task.assignedUserIds
                .map((user) => getUserDisplayName(user))
                .join('، ')
            : 'بدون مسئول مشخص',
        },
        {
          label: 'وضعیت',
          value: projectTaskStatusLabels[task.status] || task.status || '—',
        },
        {
          label: 'اولویت',
          value: projectPriorityLabels[task.priority] || task.priority || '—',
        },
        {
          label: 'تاریخ شروع',
          value: formatDate(task.startDate),
        },
        {
          label: 'موعد انجام',
          value: formatDate(task.dueDate),
        },
        {
          label: 'تعداد فایل',
          value: `${task.files?.length || task.attachmentCount || 0}`,
        },
      ];

      if (task.status !== 'done' && task.startDate) {
        items.push({
          id: `task-start-${getTaskId(task)}`,
          date: task.startDate,
          title: `شروع وظیفه: ${task.title}`,
          description: task.description || 'برای این وظیفه توضیحی ثبت نشده است.',
          type: 'task_start',
          statusLabel: projectTaskStatusLabels[task.status] || task.status,
          priorityLabel: projectPriorityLabels[task.priority] || task.priority,
          files: task.files || [],
          meta: taskMeta,
        });
      }

      if (task.status !== 'done' && task.dueDate) {
        items.push({
          id: `task-due-${getTaskId(task)}`,
          date: task.dueDate,
          title: `موعد وظیفه: ${task.title}`,
          description: task.description || 'برای این وظیفه توضیحی ثبت نشده است.',
          type: 'task_due',
          statusLabel: projectTaskStatusLabels[task.status] || task.status,
          priorityLabel: projectPriorityLabels[task.priority] || task.priority,
          files: task.files || [],
          meta: taskMeta,
        });
      }

      if (task.status === 'done' && task.completedAt) {
        items.push({
          id: `task-completed-${getTaskId(task)}`,
          date: task.completedAt,
          title: `تکمیل وظیفه: ${task.title}`,
          description:
            task.description ||
            'این وظیفه از پنل یا بات تلگرام تکمیل شده است.',
          type: 'task_completed',
          statusLabel: projectTaskStatusLabels[task.status] || task.status,
          priorityLabel: projectPriorityLabels[task.priority] || task.priority,
          files: task.files || [],
          meta: [
            ...taskMeta,
            {
              label: 'زمان تکمیل',
              value: formatDate(task.completedAt),
            },
          ],
        });
      }
    });

    notes.forEach((note) => {
      items.push({
        id: `note-${getNoteId(note)}`,
        date: note.createdAt,
        title: `کار انجام‌شده توسط ${getUserDisplayName(note.authorId)}`,
        description: note.note,
        type: 'work_report',
        progressPercent: note.progressPercent,
        files: note.files || [],
        meta: [
          {
            label: 'مدیر انجام‌دهنده',
            value: getUserDisplayName(note.authorId),
          },
          {
            label: 'ثبت‌شده توسط',
            value: getUserDisplayName(note.registeredById || note.authorId),
          },
          {
            label: 'تاریخ ثبت',
            value: formatDate(note.createdAt),
          },
          {
            label: 'درصد پیشرفت',
            value:
              note.progressPercent !== null && note.progressPercent !== undefined
                ? `${note.progressPercent}%`
                : 'ثبت نشده',
          },
          {
            label: 'تعداد فایل پیوست',
            value: `${note.files?.length || 0}`,
          },
          {
            label: 'منبع ثبت',
            value: note.source === 'telegram_bot' ? 'بات تلگرام' : 'پنل',
          },
        ],
      });
    });

    return items.sort((first, second) => {
      return new Date(first.date).getTime() - new Date(second.date).getTime();
    });
  }, [project, tasks, notes]);

  const startEditProjectMember = (member: ProjectMemberReference) => {
    const userId = getReferenceId(member.userId);

    if (!userId) return;

    setEditingMemberId(userId);
    setMemberForm({
      roleId:
        typeof member.roleId === 'string'
          ? member.roleId
          : getProjectRoleId(member.roleId),
      roleInProject: member.roleInProject || '',
      startedAt: toDateInput(member.startedAt),
      expectedFinishedAt: toDateInput(member.expectedFinishedAt),
    });
  };

  const cancelEditProjectMember = () => {
    setEditingMemberId('');
    setMemberForm({
      roleId: '',
      roleInProject: '',
      startedAt: '',
      expectedFinishedAt: '',
    });
  };

  const saveProjectMember = async (member: ProjectMemberReference) => {
    if (!project || !projectId) return;

    const memberUserId = getReferenceId(member.userId);

    if (!memberUserId) return;

    if (!memberForm.roleId) {
      setError('برای عضو پروژه باید یک نقش از صفحه نقش‌ها انتخاب شود.');
      return;
    }

    if (
      memberForm.startedAt &&
      memberForm.expectedFinishedAt &&
      new Date(memberForm.expectedFinishedAt) < new Date(memberForm.startedAt)
    ) {
      setError('تاریخ پایان احتمالی عضو پروژه نمی‌تواند قبل از تاریخ شروع او باشد.');
      return;
    }

    try {
      setSavingMember(true);
      setError('');

      const nextMembers = projectMembers.map((item) => {
        const itemUserId = getReferenceId(item.userId);

        if (itemUserId !== memberUserId) {
          return {
            userId: itemUserId,
            roleId:
              typeof item.roleId === 'string'
                ? item.roleId
                : getProjectRoleId(item.roleId) || null,
            roleInProject: item.roleInProject || 'عضو پروژه',
            startedAt: item.startedAt || project.startDate || null,
            expectedFinishedAt: item.expectedFinishedAt || project.dueDate || null,
          };
        }

        const selectedRole = projectRoleMap.get(memberForm.roleId);

        return {
          userId: itemUserId,
          roleId: memberForm.roleId,
          roleInProject: selectedRole?.title || memberForm.roleInProject.trim() || 'عضو پروژه',
          startedAt: memberForm.startedAt || null,
          expectedFinishedAt: memberForm.expectedFinishedAt || null,
        };
      });

      const updatedProject = await projectService.updateProject(projectId, {
        assignedUserIds: nextMembers.map((item) => item.userId).filter(Boolean),
        projectMembers: nextMembers,
      } as any);

      setProject(updatedProject);
      cancelEditProjectMember();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ویرایش عضو پروژه');
    } finally {
      setSavingMember(false);
    }
  };

  const resetTaskForm = () => {
    const currentAssigneeId = taskForm.assigneeId;

    setEditingTaskId('');
    setTaskForm({
      ...createEmptyTaskForm(),
      assigneeId: currentAssigneeId,
    });
  };

  const startEditTask = (task: ProjectTask) => {
    setEditingTaskId(getTaskId(task));
    setTaskForm({
      title: task.title || '',
      description: task.description || '',
      assigneeId: getReferenceId(task.assignedUserIds?.[0]),
      startDate: toDateInput(task.startDate),
      dueDate: toDateInput(task.dueDate),
      priority: task.priority || 'medium',
      status: task.status || 'todo',
      files: [],
    });
  };

  const startAudioRecording = async (target: 'task' | 'workLog') => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('مرورگر شما امکان ضبط صدا را پشتیبانی نمی‌کند.');
      return;
    }

    if (typeof MediaRecorder === 'undefined') {
      setError('مرورگر شما MediaRecorder را پشتیبانی نمی‌کند.');
      return;
    }

    try {
      setError('');

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: BlobPart[] = [];
      const mimeType = getSupportedAudioMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());

        const blob = new Blob(chunks, {
          type: recorder.mimeType || mimeType || 'audio/webm',
        });

        const audioFile = buildRecordedAudioFile(
          blob,
          target === 'task' ? 'task-audio' : 'project-report-audio',
        );

        if (target === 'task') {
          setTaskForm((previous) => ({
            ...previous,
            files: [...previous.files, audioFile],
          }));
        } else {
          setWorkLogFile(audioFile);
        }
      };

      if (target === 'task') {
        taskRecorderRef.current = recorder;
        setRecordingTaskAudio(true);
      } else {
        workLogRecorderRef.current = recorder;
        setRecordingWorkLogAudio(true);
      }

      recorder.start();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'اجازه دسترسی به میکروفون داده نشد یا ضبط صدا شروع نشد.',
      );
    }
  };

  const stopAudioRecording = (target: 'task' | 'workLog') => {
    const recorder =
      target === 'task' ? taskRecorderRef.current : workLogRecorderRef.current;

    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }

    if (target === 'task') {
      taskRecorderRef.current = null;
      setRecordingTaskAudio(false);
    } else {
      workLogRecorderRef.current = null;
      setRecordingWorkLogAudio(false);
    }
  };

  const handleSubmitTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!projectId || !taskForm.title.trim()) return;

    if (!taskForm.assigneeId) {
      setError('برای تعریف وظیفه، انتخاب مدیر مسئول الزامی است.');
      return;
    }

    try {
      setSavingTask(true);
      setError('');

      const payload = {
        title: taskForm.title.trim(),
        description: taskForm.description.trim(),
        assignedUserIds: [taskForm.assigneeId],
        status: taskForm.status,
        priority: taskForm.priority,
        startDate: taskForm.startDate || null,
        dueDate: taskForm.dueDate || null,
        files: taskForm.files,
      };

      if (editingTaskId) {
        await projectService.updateTask(projectId, editingTaskId, payload);
      } else {
        await projectService.createTask(projectId, payload);
      }

      resetTaskForm();

      await loadProjectWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ذخیره وظیفه');
    } finally {
      setSavingTask(false);
    }
  };

  const handleCreateWorkLog = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;

    const workLogHasAudio = isAudioBrowserFile(workLogFile);

    if (!projectId) return;

    if (!workNote.trim() && !workLogHasAudio) {
      setError('برای ثبت گزارش، متن گزارش یا فایل صوتی ضبط‌شده الزامی است.');
      return;
    }

    if (!workAuthorId) {
      setError('برای ثبت کار انجام‌شده، انتخاب مدیر انجام‌دهنده الزامی است.');
      return;
    }

    try {
      setSavingWorkLog(true);
      setError('');

      await projectService.createNote(projectId, {
        authorId: workAuthorId,
        note: workNote.trim(),
        progressPercent: progressPercent ? Number(progressPercent) : null,
        statusSnapshot: project?.status,
        file: workLogFile,
      });

      setWorkNote('');
      setProgressPercent('');
      setWorkLogFile(null);
      form.reset();

      await loadProjectWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ثبت گزارش کار');
    } finally {
      setSavingWorkLog(false);
    }
  };

  const handleUploadFile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;

    if (!projectId || !selectedFile) return;

    try {
      setUploadingFile(true);
      setError('');

      await projectService.uploadFile(projectId, {
        file: selectedFile,
        category: fileCategory,
      });

      setSelectedFile(null);
      setFileCategory('other');
      form.reset();

      await loadProjectWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در آپلود فایل');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleUpdateTaskStatus = async (
    task: ProjectTask,
    status: ProjectTaskStatus,
  ) => {
    if (!projectId) return;

    try {
      setError('');

      if (status === 'done') {
        await projectService.closeTask(projectId, getTaskId(task));
      } else {
        await projectService.updateTask(projectId, getTaskId(task), {
          title: task.title,
          description: task.description || '',
          assignedUserIds: task.assignedUserIds
            .map((user) => getReferenceId(user))
            .filter(Boolean),
          priority: task.priority,
          status,
          startDate: task.startDate,
          dueDate: task.dueDate,
        });
      }

      await loadProjectWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در تغییر وضعیت وظیفه');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-24" dir="rtl">
          <span className="loading loading-spinner loading-lg" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6" dir="rtl">
        <div className="avid-glass-surface rounded-3xl p-5">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <Link
                href="/dashboard/projects"
                className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-base-content/55 hover:text-primary"
              >
                <ArrowLeftIcon className="h-4 w-4" />
                بازگشت به پروژه‌ها
              </Link>

              <h1 className="text-2xl font-black text-base-content lg:text-3xl">
                {project?.title || 'پروژه'}
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-7 text-base-content/60">
                {project?.description || 'برای این پروژه توضیحی ثبت نشده است.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link href="/dashboard/calendar" className="btn btn-outline">
                <CalendarDaysIcon className="h-5 w-5" />
                مشاهده در تقویم
              </Link>

              <button className="btn btn-ghost" onClick={loadProjectWorkspace} type="button">
                <ArrowPathIcon className="h-5 w-5" />
                بروزرسانی
              </button>
            </div>
          </div>
        </div>

        {error ? (
          <div className="alert alert-error">
            <span>{error}</span>
          </div>
        ) : null}

        {project && projectStaffingPending ? (
          <div className="alert alert-warning items-start">
            <UserGroupIcon className="h-6 w-6 shrink-0" />
            <div className="flex-1">
              <h2 className="font-black">تخصیص افراد و مسئولیت‌ها کامل نیست</h2>
              <p className="mt-1 text-sm leading-7">
                این پروژه بدون اطلاعات پرسنلی از اکسل وارد شده یا بخشی از تخصیص‌ها ناقص است.
                مسئول پروژه، اعضا و مسئولان فازها را از داخل سامانه انتخاب کنید.
              </p>
              {canManageProject ? (
                <Link
                  href={`/dashboard/projects/${projectId}/edit`}
                  className="btn btn-warning btn-sm mt-3"
                >
                  <PencilSquareIcon className="h-4 w-4" />
                  تکمیل افراد و مسئولیت‌ها
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}

        {project ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="avid-glass-surface rounded-3xl p-5">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <ClockIcon className="h-5 w-5" />
                  شروع پروژه
                </div>

                <div className="mt-2 text-lg font-bold text-gray-900 dark:text-gray-100">
                  {formatDate(project.startDate)}
                </div>
              </div>

              <div className="avid-glass-surface rounded-3xl p-5">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CalendarDaysIcon className="h-5 w-5" />
                  موعد تحویل
                </div>

                <div className="mt-2 text-lg font-bold text-gray-900 dark:text-gray-100">
                  {formatDate(project.dueDate)}
                </div>
              </div>

              <div className="avid-glass-surface rounded-3xl p-5">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <FlagIcon className="h-5 w-5" />
                  وظایف باز
                </div>

                <div className="mt-2 text-3xl font-bold text-primary">
                  {openTasks.length}
                </div>
              </div>

              <div className="avid-glass-surface rounded-3xl p-5">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CheckCircleIcon className="h-5 w-5" />
                  وظایف امروز
                </div>

                <div className="mt-2 text-3xl font-bold text-success">
                  {todayTasks.length}
                </div>
              </div>
            </div>

            <div className="avid-glass-surface rounded-3xl p-4">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-black text-primary">فضای کاری پروژه</p>
                  <h2 className="mt-1 text-base font-black text-base-content">
                    بخش فعال: {activeProjectTabConfig.label}
                  </h2>
                  <p className="mt-1 text-xs font-bold text-base-content/55">
                    تب‌ها بر اساس مخاطب تفکیک شده‌اند تا عملیات مدیران با فعالیت کارشناسان مخلوط نشود.
                  </p>
                </div>
                <span className="badge badge-primary badge-outline rounded-xl px-3 py-3 text-xs font-black">
                  {currentRole === 'expert'
                    ? 'نمای کارشناس'
                    : currentRole === 'board'
                      ? 'نمای هیئت‌مدیره'
                      : 'نمای مدیر'}
                </span>
              </div>

              <div className="grid gap-3 xl:grid-cols-3">
                {visibleProjectDetailTabGroups.map((group) => {
                  const isExpertGroup = group.audience === 'expert';
                  const groupTitle =
                    isExpertGroup && currentRole === 'expert'
                      ? 'فضای کاری من'
                      : group.title;

                  return (
                    <section
                      key={group.audience}
                      className={`rounded-2xl border p-3 ${group.panelClass}`}
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-black text-base-content">{groupTitle}</h3>
                            <span className={`badge badge-sm ${group.badgeClass}`}>
                              {group.audience === 'general'
                                ? 'مشترک'
                                : group.audience === 'manager'
                                  ? 'مدیران'
                                  : 'کارشناسان'}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] font-bold leading-5 text-base-content/55">
                            {group.description}
                          </p>
                        </div>
                      </div>

                      <div
                        role="tablist"
                        className="grid gap-2"
                        aria-label={groupTitle}
                      >
                        {group.tabs.map((tab) => {
                          const Icon = tab.icon;
                          const isActiveTab = activeProjectTab === tab.key;
                          const tabLabel =
                            tab.key === 'expert_activity' && currentRole === 'expert'
                              ? 'فعالیت‌های من'
                              : tab.label;

                          return (
                            <button
                              key={tab.key}
                              type="button"
                              role="tab"
                              className={`avid-tab-button w-full justify-between ${
                                isActiveTab ? 'avid-tab-button-active' : ''
                              }`}
                              aria-selected={isActiveTab}
                              onClick={() => setActiveProjectTab(tab.key)}
                            >
                              <span className="flex min-w-0 items-center gap-3 text-right">
                                <span className="avid-tab-icon shrink-0">
                                  <Icon className="h-4 w-4" />
                                </span>
                                <span className="flex min-w-0 flex-col items-start gap-0.5">
                                  <span className="text-sm font-black">{tabLabel}</span>
                                  <span className="max-w-full truncate text-[10px] font-bold opacity-75">
                                    {tab.hint}
                                  </span>
                                </span>
                              </span>
                              <span
                                className={`badge badge-sm shrink-0 rounded-lg border-0 ${
                                  isActiveTab
                                    ? 'bg-white/20 text-current'
                                    : 'bg-base-200 text-base-content/60'
                                }`}
                              >
                                {projectTabBadges[tab.key]}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>

            {activeProjectTab === 'summary' ? (
              <section className="avid-glass-surface rounded-3xl p-5">
                <div className={`alert ${projectHealthSnapshot.toneClass} items-start`}>
                  <ExclamationTriangleIcon className="h-6 w-6 shrink-0" />
                  <div>
                    <h2 className="text-lg font-black">{projectHealthSnapshot.label}</h2>
                    <p className="mt-1 text-sm leading-7">{projectHealthSnapshot.description}</p>
                  </div>
                </div>

                {canViewManagerWorkspace ? (
                  <div className={`mt-4 rounded-3xl border p-4 ${managerNextAction.toneClass}`}>
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-xs font-black opacity-75">پیشنهاد تصمیم مدیریتی</p>
                        <h3 className="mt-1 text-base font-black">{managerNextAction.title}</h3>
                        <p className="mt-1 text-sm font-bold leading-7 opacity-80">{managerNextAction.description}</p>
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm rounded-xl border-0 bg-base-100/75 text-base-content hover:bg-base-100"
                        onClick={() => {
                          if (projectStaffingPending && canManageProject) {
                            router.push(`/dashboard/projects/${projectId}/edit`);
                            return;
                          }

                          setActiveProjectTab(
                            overdueTasksCount || blockedTasksCount
                              ? 'tasks'
                              : !projectPhases.length
                                ? 'phases'
                                : !notes.length
                                  ? 'reports'
                                  : 'summary',
                          );
                        }}
                      >
                        {projectStaffingPending && canManageProject
                          ? 'تکمیل تخصیص‌ها'
                          : 'رفتن به بخش مرتبط'}
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="rounded-3xl border border-base-300 bg-base-200/50 p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="text-base font-black text-base-content">نمای یک‌نگاه پروژه</h3>
                        <p className="mt-1 text-sm leading-7 text-base-content/60">
                          این بخش وضعیت کلی پروژه را نشان می‌دهد؛ جزئیات مدیریتی و کارشناسی در فضاهای جداگانه قرار گرفته‌اند.
                        </p>
                      </div>
                      <div className="radial-progress bg-base-100 text-primary shadow-sm" style={{ '--value': taskCompletionRate, '--size': '5.5rem', '--thickness': '8px' } as any} role="progressbar">
                        {formatNumber(taskCompletionRate)}٪
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="stat rounded-2xl bg-base-100 shadow-sm">
                        <div className="stat-title text-xs font-bold">تکمیل وظایف</div>
                        <div className="stat-value text-2xl text-primary">{formatNumber(completedTasksCount)}</div>
                        <div className="stat-desc">از {formatNumber(tasks.length)} وظیفه</div>
                      </div>
                      <div className="stat rounded-2xl bg-base-100 shadow-sm">
                        <div className="stat-title text-xs font-bold">عقب‌افتاده</div>
                        <div className={`stat-value text-2xl ${overdueTasksCount ? 'text-error' : 'text-success'}`}>{formatNumber(overdueTasksCount)}</div>
                        <div className="stat-desc">وظیفه نیازمند پیگیری</div>
                      </div>
                      <div className="stat rounded-2xl bg-base-100 shadow-sm">
                        <div className="stat-title text-xs font-bold">روز تا سررسید</div>
                        <div className={`stat-value text-2xl ${daysRemaining !== null && daysRemaining < 0 ? 'text-error' : 'text-base-content'}`}>
                          {daysRemaining === null ? '—' : formatNumber(daysRemaining)}
                        </div>
                        <div className="stat-desc">موعد: {formatDate(project.dueDate)}</div>
                      </div>
                      <div className="stat rounded-2xl bg-base-100 shadow-sm">
                        <div className="stat-title text-xs font-bold">فازهای پروژه</div>
                        <div className="stat-value text-2xl text-info">{formatNumber(projectPhases.length)}</div>
                        <div className="stat-desc">قابل مشاهده در تب فازها</div>
                      </div>
                    </div>
                  </div>

                  {canViewManagerWorkspace ? (
                    <div className="rounded-3xl border border-base-300 bg-base-200/50 p-5">
                      <h3 className="text-base font-black text-base-content">جمع مالی ساده فازها</h3>
                      <p className="mt-1 text-sm leading-7 text-base-content/60">
                        این اعداد از مالی ساده فازها آمده و فقط در فضای مدیران نمایش داده می‌شود.
                      </p>
                      <div className="mt-5 space-y-3">
                        <div className="flex items-center justify-between rounded-2xl bg-base-100 px-4 py-3 text-sm shadow-sm">
                          <span className="font-bold text-base-content/60">درآمد واقعی</span>
                          <strong className="text-success">{formatAmount(phaseFinancialTotals.realizedRevenue)}</strong>
                        </div>
                        <div className="flex items-center justify-between rounded-2xl bg-base-100 px-4 py-3 text-sm shadow-sm">
                          <span className="font-bold text-base-content/60">هزینه واقعی</span>
                          <strong className="text-error">{formatAmount(phaseFinancialTotals.realizedCost)}</strong>
                        </div>
                        <div className="flex items-center justify-between rounded-2xl bg-base-100 px-4 py-3 text-sm shadow-sm">
                          <span className="font-bold text-base-content/60">مانده واقعی</span>
                          <strong className={(phaseFinancialTotals.realizedRevenue - phaseFinancialTotals.realizedCost) >= 0 ? 'text-success' : 'text-error'}>
                            {formatAmount(phaseFinancialTotals.realizedRevenue - phaseFinancialTotals.realizedCost)}
                          </strong>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-info/25 bg-info/5 p-5">
                      <div className="flex items-center gap-2">
                        <UserGroupIcon className="h-5 w-5 text-info" />
                        <h3 className="text-base font-black text-base-content">فضای کاری کارشناس</h3>
                      </div>
                      <p className="mt-2 text-sm leading-7 text-base-content/60">
                        فعالیت‌ها و خروجی‌های شما از عملیات مدیریتی پروژه جدا شده‌اند.
                      </p>
                      <div className="mt-5 rounded-2xl bg-base-100 p-4 shadow-sm">
                        <div className="text-xs font-bold text-base-content/55">فعالیت‌های ثبت‌شده من</div>
                        <div className="mt-1 text-3xl font-black text-info">
                          {formatNumber(visibleExpertTaskActivityEntries.length)}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-info btn-outline mt-4 w-full rounded-xl"
                        onClick={() => setActiveProjectTab('expert_activity')}
                      >
                        مشاهده فعالیت‌های من
                      </button>
                    </div>
                  )}
                </div>

                {showProjectWorkHistory ? (
                  <section className="mt-5 rounded-3xl border border-base-300 bg-base-200/40 p-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="text-base font-black text-base-content">
                          آخرین فعالیت‌های کارشناسان
                        </h3>
                        <p className="mt-1 text-sm leading-7 text-base-content/60">
                          فعالیت‌های ثبت‌شده در پنل، تلگرام و وظایف تکمیل‌شده این پروژه.
                        </p>
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline rounded-xl"
                        onClick={() => setActiveProjectTab('expert_activity')}
                      >
                        مشاهده فضای کارشناسان
                      </button>
                    </div>

                    {projectWorkHistoryError ? (
                      <div className="alert alert-warning mt-4 text-sm">
                        <ExclamationTriangleIcon className="h-5 w-5" />
                        <span>{projectWorkHistoryError}</span>
                      </div>
                    ) : recentExpertActivityEntries.length ? (
                      <div className="mt-4 grid gap-3 lg:grid-cols-2">
                        {recentExpertActivityEntries.map((entry) => (
                          <article
                            key={`summary-activity-${entry.key}`}
                            className="rounded-2xl border border-base-300 bg-base-100 p-4"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-black text-base-content">{entry.title}</h4>
                              <span className={`badge ${getProjectWorkKindClass(entry.kind)}`}>
                                {projectWorkKindLabels[entry.kind]}
                              </span>
                              <span className="badge badge-outline">
                                {entry.source === 'telegram_bot' ? 'تلگرام' : 'پنل'}
                              </span>
                            </div>
                            <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-7 text-base-content/70">
                              {entry.description}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-bold text-base-content/55">
                              {currentRole !== 'expert' ? (
                                <span>کارشناس: {entry.actorLabel}</span>
                              ) : null}
                              <span>تاریخ: {formatDate(entry.occurredAt || entry.createdAt)}</span>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-4 rounded-2xl border border-dashed border-base-300 p-5 text-center text-sm text-base-content/60">
                        هنوز فعالیتی برای این پروژه ثبت نشده است.
                      </div>
                    )}
                  </section>
                ) : null}
              </section>
            ) : null}

            {activeProjectTab === 'charts' ? (
              <section className="avid-glass-surface rounded-3xl p-5">
                <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-lg font-black text-base-content">
                      تحلیل اختصاصی پروژه
                    </h2>
                    <p className="mt-1 text-sm leading-7 text-base-content/55">
                      نمودارها برای خوانایی فارسی/راست‌به‌چپ با راهنمای داخلی، محورهای خوانا و بدون خروج متن از محدوده طراحی شده‌اند.
                    </p>
                  </div>
                  <span className="badge badge-primary badge-lg">نمای فعال: نمودارها</span>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                <ProjectDetailChartCard
                  title="درصد وضعیت وظایف پروژه"
                  description="نسبت هر وضعیت وظیفه برای همین پروژه به‌صورت درصدی نمایش داده می‌شود."
                >
                  {projectTaskStatusChartData.length ? (
                    <div className="h-[280px]" dir="ltr">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={projectTaskStatusChartData} margin={{ top: 10, right: 8, left: 8, bottom: 8 }}>
                          <CartesianGrid stroke={PROJECT_DETAIL_GRID_STROKE} strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="label" tick={projectDetailAxisTick} interval={0} />
                          <YAxis allowDecimals={false} tick={projectDetailAxisTick} domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                          <Tooltip content={<ProjectDetailTooltip formatter={(value) => formatPercent(value)} />} />
                          <Bar dataKey="percent" name="درصد وظایف" radius={[8, 8, 0, 0]}>
                            {projectTaskStatusChartData.map((item, index) => (
                              <Cell
                                key={item.status}
                                fill={PROJECT_DETAIL_CHART_COLORS[index % PROJECT_DETAIL_CHART_COLORS.length]}
                              />
                            ))}
                            <LabelList dataKey="percent" position="top" formatter={formatTaskPercentLabel} fill="var(--app-base-content)" fontSize={12} fontWeight={900} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <ProjectDetailEmptyChart text="برای این پروژه هنوز وظیفه‌ای ثبت نشده است." />
                  )}
                </ProjectDetailChartCard>

                <ProjectDetailChartCard
                  title="اولویت وظایف پروژه"
                  description="ترکیب سطح ریسک وظایف همین پروژه."
                >
                  {projectTaskPriorityChartData.length ? (
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={projectTaskPriorityChartData}
                            dataKey="count"
                            nameKey="label"
                            cx="50%"
                            cy="50%"
                            innerRadius={58}
                            outerRadius={96}
                            paddingAngle={3}
                            labelLine={false}
                            label={false}
                          >
                            {projectTaskPriorityChartData.map((item, index) => (
                              <Cell
                                key={item.priority}
                                fill={PROJECT_DETAIL_CHART_COLORS[index % PROJECT_DETAIL_CHART_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip content={<ProjectDetailTooltip />} />
                          <Legend iconType="circle" align="right" verticalAlign="bottom" wrapperStyle={{ direction: 'rtl', fontSize: 12, fontWeight: 800, paddingTop: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <ProjectDetailEmptyChart text="برای وظایف این پروژه اولویتی برای نمایش وجود ندارد." />
                  )}
                </ProjectDetailChartCard>

                <ProjectDetailChartCard
                  title="مدت فازهای پروژه"
                  description="مقایسه مدت زمان برنامه‌ریزی‌شده هر فاز، بدون نمایش افراد هر فاز."
                >
                  {projectPhaseDurationChartData.length ? (
                    <div className="h-[300px]" dir="ltr">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={projectPhaseDurationChartData}
                          layout="vertical"
                          margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                        >
                          <CartesianGrid stroke={PROJECT_DETAIL_GRID_STROKE} strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" allowDecimals={false} tick={projectDetailAxisTick} />
                          <YAxis dataKey="name" type="category" orientation="right" width={96} tick={projectDetailAxisTick} />
                          <Tooltip content={<ProjectDetailTooltip formatter={(value) => `${formatNumber(value)} روز`} />} />
                          <Bar dataKey="days" name="مدت فاز" fill="#2563eb" radius={[8, 8, 8, 8]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <ProjectDetailEmptyChart text="برای این پروژه فازی تعریف نشده است." />
                  )}
                </ProjectDetailChartCard>

                <ProjectDetailChartCard
                  title="روند پیشرفت گزارش‌شده"
                  description="درصد پیشرفت‌هایی که در گزارش‌های کاری همین پروژه ثبت شده‌اند."
                >
                  {projectProgressTrendChartData.length ? (
                    <div className="h-[300px]" dir="ltr">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={projectProgressTrendChartData} margin={{ top: 10, right: 8, left: 8, bottom: 8 }}>
                          <CartesianGrid stroke={PROJECT_DETAIL_GRID_STROKE} strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="label" tick={projectDetailAxisTick} />
                          <YAxis domain={[0, 100]} tick={projectDetailAxisTick} tickFormatter={(value) => `${value}%`} />
                          <Tooltip content={<ProjectDetailTooltip formatter={(value) => `${formatNumber(value)}٪`} />} />
                          <Line
                            type="monotone"
                            dataKey="progress"
                            name="درصد پیشرفت"
                            stroke="#16a34a"
                            strokeWidth={3}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <ProjectDetailEmptyChart text="هنوز گزارشی با درصد پیشرفت ثبت نشده است." />
                  )}
                </ProjectDetailChartCard>

                <div className="xl:col-span-2">
                  <ProjectDetailChartCard
                    title="دسته‌بندی فایل‌های پروژه"
                    description="تعداد فایل‌های ثبت‌شده برای پروژه، وظایف و گزارش‌های همین پروژه بر اساس دسته‌بندی."
                  >
                    {projectFileCategoryChartData.length ? (
                      <div className="h-[300px]" dir="ltr">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={projectFileCategoryChartData} margin={{ top: 10, right: 8, left: 8, bottom: 8 }}>
                            <CartesianGrid stroke={PROJECT_DETAIL_GRID_STROKE} strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="label" tick={projectDetailAxisTick} interval={0} />
                            <YAxis allowDecimals={false} tick={projectDetailAxisTick} />
                            <Tooltip content={<ProjectDetailTooltip />} />
                            <Bar dataKey="count" name="تعداد فایل" radius={[8, 8, 0, 0]}>
                              {projectFileCategoryChartData.map((item, index) => (
                                <Cell
                                  key={item.category}
                                  fill={PROJECT_DETAIL_CHART_COLORS[index % PROJECT_DETAIL_CHART_COLORS.length]}
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <ProjectDetailEmptyChart text="هنوز فایلی برای این پروژه ثبت نشده است." />
                    )}
                  </ProjectDetailChartCard>
                </div>
              </div>
              </section>
            ) : null}

            {activeProjectTab === 'phases' ? (
              <section id="project-phases" className="avid-glass-surface rounded-3xl p-5">
              <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    فازهای پروژه
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
هر فاز در یک ردیف کامل نمایش داده می‌شود؛ اطلاعات مالی این بخش ساده و فقط شامل درآمد/هزینه پیش‌بینی‌شده و واقعی است.
                  </p>
                </div>

                {canManageProject && projectId ? (
                  <Link href={`/dashboard/projects/${projectId}/edit`} className="btn btn-outline btn-sm">
                    <PencilSquareIcon className="h-4 w-4" />
                    ویرایش فازها
                  </Link>
                ) : null}
              </div>

              {projectPhases.length ? (
                <>
                  <div className="mb-4 grid gap-3 md:grid-cols-4">
                    <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-950">
                      <div className="text-xs text-gray-500">درآمد پیش‌بینی‌شده</div>
                      <div className="mt-1 font-bold text-gray-900 dark:text-gray-100">
                        {formatAmount(phaseFinancialTotals.potentialRevenue)}
                      </div>
                    </div>
                    <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-950">
                      <div className="text-xs text-gray-500">هزینه پیش‌بینی‌شده</div>
                      <div className="mt-1 font-bold text-gray-900 dark:text-gray-100">
                        {formatAmount(phaseFinancialTotals.potentialCost)}
                      </div>
                    </div>
                    <div className="rounded-xl bg-success/10 p-4 text-success">
                      <div className="text-xs">درآمد واقعی</div>
                      <div className="mt-1 font-bold">
                        {formatAmount(phaseFinancialTotals.realizedRevenue)}
                      </div>
                    </div>
                    <div className="rounded-xl bg-error/10 p-4 text-error">
                      <div className="text-xs">هزینه واقعی</div>
                      <div className="mt-1 font-bold">
                        {formatAmount(phaseFinancialTotals.realizedCost)}
                      </div>
                    </div>
                  </div>

                <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
                  <div className="hidden grid-cols-[70px_1.2fr_130px_130px_170px_170px_120px] gap-3 bg-gray-50 px-4 py-3 text-xs font-bold text-gray-500 dark:bg-gray-950 dark:text-gray-400 lg:grid">
                    <span>شماره</span>
                    <span>عنوان فاز</span>
                    <span>شروع</span>
                    <span>پایان</span>
                    <span>مالی ساده</span>
                    <span>واقعی</span>
                    <span>وضعیت</span>
                  </div>

                  <div className="divide-y divide-gray-200 dark:divide-gray-800">
                    {projectPhases.map((phase, index) => {
                      const phaseId = getPhaseId(phase);
                      const phaseStatus = getPhaseStatusLabel(phase);
                      const financial = getPhaseFinancial(phase);

                      return (
                        <div
                          key={phaseId || `${phase.title}-${index}`}
                          className="grid gap-3 bg-white px-4 py-4 text-sm transition hover:bg-primary/5 dark:bg-gray-900 dark:hover:bg-primary/10 lg:grid-cols-[70px_1.2fr_130px_130px_170px_170px_120px] lg:items-center"
                        >
                          <div className="inline-flex w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                            فاز {index + 1}
                          </div>

                          <div className="min-w-0">
                            <h3 className="truncate font-bold text-gray-900 dark:text-gray-100">
                              {phase.title}
                            </h3>
                            {phase.description ? (
                              <p className="mt-1 line-clamp-1 text-xs text-gray-500">
                                {phase.description}
                              </p>
                            ) : null}
                          </div>

                          <div className="text-gray-700 dark:text-gray-200">
                            <span className="ml-1 text-xs text-gray-500 lg:hidden">شروع:</span>
                            {formatDate(phase.startDate)}
                          </div>

                          <div className="text-gray-700 dark:text-gray-200">
                            <span className="ml-1 text-xs text-gray-500 lg:hidden">پایان:</span>
                            {formatDate(phase.endDate)}
                          </div>

                          <div className="space-y-1 text-xs text-gray-700 dark:text-gray-200">
                            <div>
                              <span className="text-gray-500 lg:hidden">پیش‌بینی درآمد: </span>
                              درآمد: <strong>{formatAmount(financial.potentialRevenue)}</strong>
                            </div>
                            <div>
                              <span className="text-gray-500 lg:hidden">پیش‌بینی هزینه: </span>
                              هزینه: <strong>{formatAmount(financial.potentialCost)}</strong>
                            </div>
                          </div>

                          <div className="space-y-1 text-xs text-gray-700 dark:text-gray-200">
                            <div>
                              <span className="text-gray-500 lg:hidden">درآمد واقعی: </span>
                              درآمد: <strong>{formatAmount(financial.realizedRevenue)}</strong>
                            </div>
                            <div>
                              <span className="text-gray-500 lg:hidden">هزینه واقعی: </span>
                              هزینه: <strong>{formatAmount(financial.realizedCost)}</strong>
                            </div>
                            {canManageProject && phaseId ? (
                              <Link
                                href={`/dashboard/projects/${projectId}/phases/${phaseId}`}
                                className="inline-flex text-xs font-bold text-primary hover:underline"
                              >
                                ثبت مالی فاز
                              </Link>
                            ) : null}
                          </div>

                          <div>
                            <span
                              className={
                                phaseStatus === 'در جریان'
                                  ? 'badge badge-primary'
                                  : phaseStatus === 'پایان‌یافته'
                                    ? 'badge badge-success'
                                    : 'badge badge-outline'
                              }
                            >
                              {phaseStatus}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700">
                  هنوز فازی برای این پروژه تعریف نشده است.
                </div>
              )}
            </section>
            ) : null}

            {activeProjectTab === 'members' ? (
              <div id="project-members" className="avid-glass-surface rounded-3xl p-5">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    اعضای پروژه و نقش‌ها
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    نقش هر عضو، زمان شروع همکاری و پایان احتمالی از اینجا قابل مشاهده و ویرایش است.
                  </p>
                </div>

                <span className="badge badge-outline">{projectMembers.length} عضو</span>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                {projectMembers.length ? (
                  projectMembers.map((member) => {
                    const memberUserId = getReferenceId(member.userId);
                    const isEditing = editingMemberId === memberUserId;

                    return (
                      <div
                        key={memberUserId}
                        className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-bold text-gray-900 dark:text-gray-100">
                              {getUserDisplayName(member.userId)}
                            </div>
                            {!isEditing ? (
                              <div className="mt-1 text-sm font-semibold text-primary">
                                {member.roleInProject || 'عضو پروژه'}
                              </div>
                            ) : null}
                          </div>

                          {canManageProject && !isEditing ? (
                            <button
                              type="button"
                              className="btn btn-ghost btn-xs"
                              onClick={() => startEditProjectMember(member)}
                            >
                              <PencilSquareIcon className="h-4 w-4" />
                              ویرایش
                            </button>
                          ) : null}
                        </div>

                        {isEditing ? (
                          <div className="mt-4 space-y-3">
                            <select
                              className="select select-bordered w-full bg-white dark:bg-gray-900"
                              value={memberForm.roleId}
                              disabled={!activeProjectRoles.length}
                              onChange={(event) => {
                                const role = projectRoleMap.get(event.target.value);

                                setMemberForm((previous) => ({
                                  ...previous,
                                  roleId: event.target.value,
                                  roleInProject: role?.title || '',
                                }));
                              }}
                            >
                              <option value="">
                                {activeProjectRoles.length
                                  ? 'انتخاب نقش پروژه'
                                  : 'ابتدا نقش پروژه تعریف کنید'}
                              </option>
                              {activeProjectRoles.map((role) => (
                                <option key={getProjectRoleId(role)} value={getProjectRoleId(role)}>
                                  {role.title}
                                </option>
                              ))}
                            </select>
                            {!activeProjectRoles.length ? (
                              <Link
                                href="/dashboard/projects/roles"
                                className="inline-flex text-xs font-semibold text-primary hover:underline"
                              >
                                رفتن به صفحه تعریف نقش‌ها
                              </Link>
                            ) : null}

                            <div className="grid gap-2 sm:grid-cols-2">
                              <ShamsiDateInput
                                label="شروع"
                                value={memberForm.startedAt}
                                onChange={(value) =>
                                  setMemberForm((previous) => ({ ...previous, startedAt: value }))
                                }
                                inputClassName="bg-white dark:bg-gray-900"
                              />

                              <ShamsiDateInput
                                label="پایان احتمالی"
                                value={memberForm.expectedFinishedAt}
                                onChange={(value) =>
                                  setMemberForm((previous) => ({ ...previous, expectedFinishedAt: value }))
                                }
                                inputClassName="bg-white dark:bg-gray-900"
                              />
                            </div>

                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={cancelEditProjectMember}
                              >
                                انصراف
                              </button>
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                disabled={savingMember}
                                onClick={() => saveProjectMember(member)}
                              >
                                {savingMember ? 'در حال ذخیره...' : 'ذخیره'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-4 grid gap-2 text-xs text-gray-600 dark:text-gray-300">
                            <div className="rounded-xl bg-white px-3 py-2 dark:bg-gray-900">
                              شروع همکاری: {formatDate(member.startedAt)}
                            </div>
                            <div className="rounded-xl bg-white px-3 py-2 dark:bg-gray-900">
                              پایان احتمالی: {formatDate(member.expectedFinishedAt)}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-warning/40 bg-warning/5 p-5 text-sm text-base-content/65 lg:col-span-2 xl:col-span-3">
                    <p>هنوز کاربری به پروژه تخصیص داده نشده است.</p>
                    {canManageProject ? (
                      <Link
                        href={`/dashboard/projects/${projectId}/edit`}
                        className="btn btn-warning btn-sm mt-3"
                      >
                        <UserGroupIcon className="h-4 w-4" />
                        انتخاب مسئول و اعضا
                      </Link>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
            ) : null}

            <div className="grid gap-6">
              <div className={activeProjectTab === 'tasks' ? 'space-y-6' : 'hidden'}>
                <div id="project-tasks" className="avid-glass-surface rounded-3xl p-5">
                  <div className="mb-5">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {editingTaskId
                        ? 'ویرایش وظیفه مدیریتی'
                        : 'مدیریت وظایف پروژه'}
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                      این بخش مخصوص تعریف، ویرایش، پیگیری و بستن وظایف توسط مدیران پروژه است.
                      فعالیت‌ها و خروجی‌های کارشناسان در فضای مستقل کارشناسان نمایش داده می‌شود.
                    </p>
                  </div>

                  {canManageProject ? (
                    <form
                      onSubmit={handleSubmitTask}
                      className="mb-6 rounded-2xl border border-dashed border-gray-300 p-4 dark:border-gray-700"
                    >
                    <div className="grid gap-3 lg:grid-cols-2">
                      <input
                        className="input input-bordered"
                        placeholder="عنوان وظیفه"
                        value={taskForm.title}
                        onChange={(event) =>
                          setTaskForm((previous) => ({
                            ...previous,
                            title: event.target.value,
                          }))
                        }
                        required
                      />

                      <select
                        className="select select-bordered"
                        value={taskForm.assigneeId}
                        onChange={(event) =>
                          setTaskForm((previous) => ({
                            ...previous,
                            assigneeId: event.target.value,
                          }))
                        }
                        required
                      >
                        <option value="">انتخاب مدیر مسئول</option>

                        {projectManagerOptions.map((manager) => (
                          <option
                            key={getReferenceId(manager)}
                            value={getReferenceId(manager)}
                          >
                            {getUserDisplayName(manager)}
                          </option>
                        ))}
                      </select>

                      <select
                        className="select select-bordered"
                        value={taskForm.priority}
                        onChange={(event) =>
                          setTaskForm((previous) => ({
                            ...previous,
                            priority: event.target.value as ProjectPriority,
                          }))
                        }
                      >
                        {priorityOptions.map((priority) => (
                          <option key={priority} value={priority}>
                            {projectPriorityLabels[priority]}
                          </option>
                        ))}
                      </select>

                      <select
                        className="select select-bordered"
                        value={taskForm.status}
                        onChange={(event) =>
                          setTaskForm((previous) => ({
                            ...previous,
                            status: event.target.value as ProjectTaskStatus,
                          }))
                        }
                      >
                        {Object.entries(projectTaskStatusLabels).map(
                          ([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ),
                        )}
                      </select>

                      <ShamsiDateInput
                        value={taskForm.startDate}
                        onChange={(value) =>
                          setTaskForm((previous) => ({ ...previous, startDate: value }))
                        }
                        placeholder="تاریخ شروع"
                      />

                      <ShamsiDateInput
                        value={taskForm.dueDate}
                        onChange={(value) =>
                          setTaskForm((previous) => ({ ...previous, dueDate: value }))
                        }
                        placeholder="موعد انجام"
                      />

                      <textarea
                        className="textarea textarea-bordered lg:col-span-2"
                        placeholder="توضیحات وظیفه"
                        value={taskForm.description}
                        onChange={(event) =>
                          setTaskForm((previous) => ({
                            ...previous,
                            description: event.target.value,
                          }))
                        }
                      />

                      <div className="lg:col-span-2">
                        <div className="flex flex-col gap-2 lg:flex-row">
                          <input
                            type="file"
                            multiple
                            className="file-input file-input-bordered w-full"
                            onChange={(event) =>
                              setTaskForm((previous) => ({
                                ...previous,
                                files: Array.from(event.target.files || []),
                              }))
                            }
                          />

                          {recordingTaskAudio ? (
                            <button
                              type="button"
                              className="btn btn-error shrink-0"
                              onClick={() => stopAudioRecording('task')}
                            >
                              <StopCircleIcon className="h-5 w-5" />
                              توقف ضبط
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-outline shrink-0"
                              onClick={() => startAudioRecording('task')}
                            >
                              <MicrophoneIcon className="h-5 w-5" />
                              ضبط صوت
                            </button>
                          )}
                        </div>

                        <div className="mt-2 text-xs leading-6 text-gray-500">
                          فایل‌های وظیفه می‌توانند از همین فرم، ضبط مستقیم صوت یا
                          بات تلگرام ثبت شوند. اگر فایل صوتی ارسال شود، سامانه
                          آن را با OpenAI به متن تبدیل و کنار پیوست ذخیره می‌کند.
                        </div>

                        {taskForm.files.length ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {taskForm.files.map((file) => (
                              <span
                                key={`${file.name}-${file.size}`}
                                className="badge badge-outline"
                              >
                                {file.name}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end gap-2">
                      {editingTaskId ? (
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={resetTaskForm}
                        >
                          <XMarkIcon className="h-5 w-5" />
                          انصراف
                        </button>
                      ) : null}

                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={savingTask || recordingTaskAudio}
                      >
                        <PlusIcon className="h-5 w-5" />
                        {savingTask
                          ? 'در حال ذخیره...'
                          : editingTaskId
                            ? 'ذخیره تغییرات'
                            : 'ثبت وظیفه برای مدیر'}
                      </button>
                    </div>
                    </form>
                  ) : (
                    <div className="alert alert-info mb-6 items-start">
                      <DocumentTextIcon className="h-5 w-5 shrink-0" />
                      <div>
                        <div className="font-black">نمای فقط‌خواندنی فضای مدیران</div>
                        <p className="mt-1 text-sm leading-7">
                          تعریف و ویرایش وظیفه فقط برای مدیر پروژه فعال است؛ شما می‌توانید وضعیت وظایف را مشاهده کنید.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {visibleTasks.length ? (
                      visibleTasks.map((task) => {
                        const canCloseTask = isUserAssignedToTask(
                          task,
                          currentUserId,
                        );

                        return (
                          <div
                            key={getTaskId(task)}
                            className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"
                          >
                            <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                              <div className="min-w-0 flex-1">
                                <div className="font-bold text-gray-900 dark:text-gray-100">
                                  {task.title}
                                </div>

                                <div className="mt-1 text-sm text-gray-500">
                                  {task.description || 'بدون توضیح'}
                                </div>

                                <div className="mt-2 text-xs text-primary">
                                  مسئول:{' '}
                                  {task.assignedUserIds?.length
                                    ? task.assignedUserIds
                                        .map((user) => getUserDisplayName(user))
                                        .join('، ')
                                    : 'بدون مسئول مشخص'}
                                </div>

                                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                  <span className="badge badge-outline">
                                    {projectTaskStatusLabels[task.status] ||
                                      task.status}
                                  </span>

                                  <span className="badge badge-outline">
                                    {projectPriorityLabels[task.priority] ||
                                      task.priority}
                                  </span>

                                  <span className="badge badge-ghost">
                                    شروع: {formatDate(task.startDate)}
                                  </span>

                                  <span className="badge badge-ghost">
                                    موعد: {formatDate(task.dueDate)}
                                  </span>

                                  {task.attachmentCount || task.files?.length ? (
                                    <span className="badge badge-primary gap-1">
                                      <PaperClipIcon className="h-3 w-3" />
                                      {task.attachmentCount ||
                                        task.files?.length}{' '}
                                      فایل
                                    </span>
                                  ) : null}
                                </div>

                                {renderFiles(task.files, 'فایل‌های پیوست وظیفه')}
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <button
                                  className="btn btn-xs btn-outline"
                                  onClick={() => startEditTask(task)}
                                >
                                  <PencilSquareIcon className="h-4 w-4" />
                                  ویرایش
                                </button>

                                {task.status !== 'in_progress' ? (
                                  <button
                                    className="btn btn-xs btn-outline"
                                    onClick={() =>
                                      handleUpdateTaskStatus(task, 'in_progress')
                                    }
                                  >
                                    شروع
                                  </button>
                                ) : null}

                                {canCloseTask ? (
                                  <button
                                    className="btn btn-xs btn-success"
                                    onClick={() =>
                                      handleUpdateTaskStatus(task, 'done')
                                    }
                                  >
                                    بستن کار
                                  </button>
                                ) : (
                                  <span className="badge badge-ghost">
                                    فقط مدیر مسئول می‌تواند این کار را ببندد
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700">
                        وظیفه بازی برای این پروژه وجود ندارد.
                      </div>
                    )}
                  </div>

                  {canViewManagerWorkspace ? (
                    <section className="mt-8 border-t border-base-300 pt-6">
                      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <h3 className="text-base font-black text-base-content">
                            وظایف تکمیل‌شده
                          </h3>
                          <p className="mt-1 text-sm leading-7 text-base-content/60">
                            وظایفی که وضعیت رسمی آن‌ها در پروژه «انجام‌شده» است.
                          </p>
                        </div>
                        <span className="badge badge-success badge-outline rounded-xl px-3 py-3">
                          {formatNumber(completedTasks.length)} وظیفه
                        </span>
                      </div>

                      <div className="space-y-3">
                        {completedTasks.length ? (
                          completedTasks.map((task) => (
                            <article
                              key={`completed-${getTaskId(task)}`}
                              className="rounded-2xl border border-success/25 bg-success/5 p-4"
                            >
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h4 className="font-black text-base-content">{task.title}</h4>
                                    <span className="badge badge-success">انجام‌شده</span>
                                    <span className="badge badge-outline">
                                      {projectPriorityLabels[task.priority] || task.priority}
                                    </span>
                                  </div>
                                  <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-base-content/70">
                                    {task.description || 'برای این وظیفه توضیحی ثبت نشده است.'}
                                  </p>
                                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-base-content/60">
                                    <span>مسئول: {task.assignedUserIds?.length ? task.assignedUserIds.map((user) => getUserDisplayName(user)).join('، ') : 'بدون مسئول مشخص'}</span>
                                    <span>موعد: {formatDate(task.dueDate)}</span>
                                    <span>تاریخ تکمیل: {formatDate(task.completedAt || task.updatedAt)}</span>
                                  </div>
                                  {renderFiles(task.files, 'فایل‌های تحویل وظیفه')}
                                </div>
                              </div>
                            </article>
                          ))
                        ) : (
                          <div className="rounded-2xl border border-dashed border-base-300 p-6 text-center text-sm text-base-content/60">
                            هنوز وظیفه تکمیل‌شده‌ای برای این پروژه وجود ندارد.
                          </div>
                        )}
                      </div>
                    </section>
                  ) : null}

                </div>

                <ProjectTimelineFlow
                  items={timelineItems}
                  formatDate={formatDate}
                  resolveFileUrl={resolveFileUrl}
                  formatFileSize={formatFileSize}
                />
              </div>

              <div
                id="project-expert-activity"
                className={
                  activeProjectTab === 'expert_activity'
                    ? 'avid-glass-surface rounded-3xl p-5'
                    : 'hidden'
                }
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <UserGroupIcon className="h-5 w-5 text-info" />
                      <h2 className="text-lg font-black text-base-content">
                        {currentRole === 'expert'
                          ? 'فعالیت‌ها و خروجی‌های من'
                          : 'فعالیت‌ها و خروجی‌های کارشناسان'}
                      </h2>
                      <span className="badge badge-info badge-outline">فضای کارشناسان</span>
                    </div>
                    <p className="mt-2 text-sm leading-7 text-base-content/60">
                      {currentRole === 'expert'
                        ? 'کارهایی که شما در پنل یا تلگرام ثبت کرده‌اید و وظایف رسمی تکمیل‌شده شما در این بخش نمایش داده می‌شود.'
                        : 'کارهای ثبت‌شده کارشناسان در پنل یا تلگرام، اعلام‌های تکمیل و وظایف رسمی انجام‌شده در این بخش مستقل از عملیات مدیران نمایش داده می‌شود.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="badge badge-info rounded-xl px-3 py-3 font-black">
                      {formatNumber(visibleExpertTaskActivityEntries.length)} ثبت
                    </span>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline rounded-xl"
                      onClick={loadProjectWorkspace}
                      disabled={loading}
                    >
                      <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                      به‌روزرسانی
                    </button>
                  </div>
                </div>

                {projectWorkHistoryError ? (
                  <div className="alert alert-warning mt-5 text-sm">
                    <ExclamationTriangleIcon className="h-5 w-5" />
                    <span>{projectWorkHistoryError}</span>
                  </div>
                ) : null}

                <div className="mt-6 space-y-3">
                  {visibleExpertTaskActivityEntries.length ? (
                    visibleExpertTaskActivityEntries.map((entry) => (
                      <article
                        key={`expert-activity-${entry.key}`}
                        className="rounded-2xl border border-info/20 bg-info/5 p-4"
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-black text-base-content">{entry.title}</h3>
                              <span className={`badge ${getProjectWorkKindClass(entry.kind)}`}>
                                {projectWorkKindLabels[entry.kind]}
                              </span>
                              <span className="badge badge-outline">
                                {entry.source === 'telegram_bot' ? 'ثبت تلگرام' : 'ثبت پنل'}
                              </span>
                              {entry.statusLabel ? (
                                <span className="badge badge-success badge-outline">
                                  {entry.statusLabel}
                                </span>
                              ) : null}
                            </div>

                            <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-base-content/75">
                              {entry.description}
                            </p>

                            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-base-content/60">
                              {currentRole !== 'expert' ? (
                                <span>کارشناس: {entry.actorLabel}</span>
                              ) : null}
                              <span>تاریخ: {formatDate(entry.occurredAt || entry.createdAt)}</span>
                              {entry.phaseLabel ? <span>فاز: {entry.phaseLabel}</span> : null}
                              {entry.taskLabel ? <span>وظیفه: {entry.taskLabel}</span> : null}
                              {entry.durationMinutes ? (
                                <span>مدت: {formatCompletionDuration(entry.durationMinutes)}</span>
                              ) : null}
                              {entry.progressPercent !== null &&
                              entry.progressPercent !== undefined ? (
                                <span>پیشرفت: {formatNumber(entry.progressPercent)}٪</span>
                              ) : null}
                            </div>

                            <div className="mt-3 grid gap-3 lg:grid-cols-3">
                              {entry.deliverables ? (
                                <div className="rounded-xl bg-success/5 p-3">
                                  <div className="text-xs font-black text-success">خروجی‌ها</div>
                                  <p className="mt-1 whitespace-pre-wrap text-sm leading-7 text-base-content/75">
                                    {entry.deliverables}
                                  </p>
                                </div>
                              ) : null}
                              {entry.blockers ? (
                                <div className="rounded-xl bg-error/5 p-3">
                                  <div className="text-xs font-black text-error">موانع</div>
                                  <p className="mt-1 whitespace-pre-wrap text-sm leading-7 text-base-content/75">
                                    {entry.blockers}
                                  </p>
                                </div>
                              ) : null}
                              {entry.nextSteps ? (
                                <div className="rounded-xl bg-primary/5 p-3">
                                  <div className="text-xs font-black text-primary">گام بعدی</div>
                                  <p className="mt-1 whitespace-pre-wrap text-sm leading-7 text-base-content/75">
                                    {entry.nextSteps}
                                  </p>
                                </div>
                              ) : null}
                            </div>

                            {renderFiles(entry.files, 'فایل‌های مرتبط')}
                          </div>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-info/30 bg-info/5 p-8 text-center text-sm leading-7 text-base-content/60">
                      {currentRole === 'expert'
                        ? 'هنوز فعالیتی برای شما در این پروژه ثبت نشده است.'
                        : 'هنوز فعالیتی از کارشناسان برای این پروژه ثبت نشده است.'}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div id="project-reports" className={activeProjectTab === 'reports' ? 'avid-glass-surface rounded-3xl p-5' : 'hidden'}>
                  <div className="mb-4 flex items-center gap-2">
                    <DocumentTextIcon className="h-5 w-5 text-primary" />

                    <div>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        گزارش‌های ثبت‌شده مدیران
                      </h2>
                      <p className="mt-1 text-sm leading-7 text-base-content/55">
                        این بخش فقط برای گزارش‌ها و ثبت‌های مدیریتی پروژه است. فعالیت کارشناسان در تب مستقل «فعالیت کارشناسان» نمایش داده می‌شود.
                      </p>
                    </div>
                  </div>

                  {canManageProject ? (
                    <form onSubmit={handleCreateWorkLog} className="space-y-4">
                    <select
                      className="select select-bordered w-full"
                      value={workAuthorId}
                      onChange={(event) => setWorkAuthorId(event.target.value)}
                      required
                    >
                      <option value="">انتخاب مدیر انجام‌دهنده کار</option>

                      {projectManagerOptions.map((manager) => (
                        <option
                          key={getReferenceId(manager)}
                          value={getReferenceId(manager)}
                        >
                          {getUserDisplayName(manager)}
                        </option>
                      ))}
                    </select>

                    <textarea
                      className="textarea textarea-bordered min-h-32 w-full"
                      placeholder="چه کاری روی این پروژه انجام شد؟ اگر صوت ضبط کنید، می‌توانید این بخش را خالی بگذارید."
                      value={workNote}
                      onChange={(event) => setWorkNote(event.target.value)}
                    />

                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="input input-bordered w-full"
                      placeholder="درصد پیشرفت اختیاری، مثلاً ۴۰"
                      value={progressPercent}
                      onChange={(event) => setProgressPercent(event.target.value)}
                    />

                    <div className="space-y-2">
                      <div className="flex flex-col gap-2">
                        <input
                          type="file"
                          className="file-input file-input-bordered w-full"
                          onChange={(event) =>
                            setWorkLogFile(event.target.files?.[0] || null)
                          }
                        />

                        {recordingWorkLogAudio ? (
                          <button
                            type="button"
                            className="btn btn-error w-full"
                            onClick={() => stopAudioRecording('workLog')}
                          >
                            <StopCircleIcon className="h-5 w-5" />
                            توقف ضبط صوت
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-outline w-full"
                            onClick={() => startAudioRecording('workLog')}
                          >
                            <MicrophoneIcon className="h-5 w-5" />
                            ضبط صوت گزارش
                          </button>
                        )}
                      </div>

                      <div className="text-xs leading-6 text-gray-500">
                        اگر فقط صوت ضبط شود، متن گزارش پس از ارسال با OpenAI ساخته
                        و ذخیره می‌شود. اگر متن را هم بنویسید، متن دستی به عنوان
                        توضیح گزارش ذخیره می‌شود و متن تبدیل‌شده کنار فایل صوتی
                        نمایش داده می‌شود.
                      </div>

                      {workLogFile ? (
                        <div className="badge badge-outline max-w-full truncate">
                          {workLogFile.name}
                        </div>
                      ) : null}
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary w-full"
                      disabled={savingWorkLog || recordingWorkLogAudio}
                    >
                      {savingWorkLog ? 'در حال ثبت...' : 'ثبت کار انجام‌شده'}
                    </button>
                    </form>
                  ) : (
                    <div className="alert alert-info items-start">
                      <DocumentTextIcon className="h-5 w-5 shrink-0" />
                      <div>
                        <div className="font-black">نمای فقط‌خواندنی گزارش‌های مدیران</div>
                        <p className="mt-1 text-sm leading-7">
                          ثبت گزارش مدیریتی فقط برای مدیر پروژه فعال است.
                        </p>
                      </div>
                    </div>
                  )}

                  <section className="mt-8 border-t border-base-300 pt-6">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <h3 className="text-base font-black text-base-content">
                          سوابق مدیریتی پروژه
                        </h3>
                        <p className="mt-1 text-sm leading-7 text-base-content/60">
                          این فهرست فقط گزارش‌هایی را نمایش می‌دهد که توسط مدیران پروژه ثبت شده‌اند.
                        </p>
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline rounded-xl"
                        onClick={loadProjectWorkspace}
                        disabled={loading}
                      >
                        <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        به‌روزرسانی
                      </button>
                    </div>

                    {projectWorkHistoryError ? (
                      <div className="alert alert-warning mt-5 text-sm">
                        <ExclamationTriangleIcon className="h-5 w-5" />
                        <span>{projectWorkHistoryError}</span>
                      </div>
                    ) : null}

                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      <div className="stat rounded-2xl bg-base-200/60">
                        <div className="stat-title text-xs font-bold">کل سوابق کار</div>
                        <div className="stat-value text-2xl text-base-content">
                          {formatNumber(managerReportSummary.total)}
                        </div>
                      </div>
                      <div className="stat rounded-2xl bg-primary/10">
                        <div className="stat-title text-xs font-bold">ثبت‌شده در پنل</div>
                        <div className="stat-value text-2xl text-primary">
                          {formatNumber(managerReportSummary.panel)}
                        </div>
                      </div>
                      <div className="stat rounded-2xl bg-info/10">
                        <div className="stat-title text-xs font-bold">ثبت‌شده در تلگرام</div>
                        <div className="stat-value text-2xl text-info">
                          {formatNumber(managerReportSummary.telegram_bot)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 space-y-4">
                      {managerReportEntries.length ? (
                        managerReportEntries.map((entry) => (
                          <article
                            key={entry.key}
                            className="rounded-3xl border border-base-300 bg-base-100 p-5"
                          >
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="text-base font-black text-base-content">
                                    {entry.title}
                                  </h4>
                                  <span className={`badge ${getProjectWorkKindClass(entry.kind)}`}>
                                    {projectWorkKindLabels[entry.kind]}
                                  </span>
                                  <span className="badge badge-outline">
                                    {entry.source === 'telegram_bot'
                                      ? 'منبع: تلگرام'
                                      : 'منبع: پنل'}
                                  </span>
                                  {entry.statusLabel ? (
                                    <span
                                      className={`badge ${
                                        entry.kind === 'expert_completion' &&
                                        entry.status &&
                                        entry.status !== 'done'
                                          ? getExpertCompletionStatusClass(
                                              entry.status as ExpertProjectCompletion['status'],
                                            )
                                          : 'badge-success'
                                      }`}
                                    >
                                      {entry.statusLabel}
                                    </span>
                                  ) : null}
                                </div>

                                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-base-content/60">
                                  <span>انجام‌دهنده: {entry.actorLabel}</span>
                                  <span>تاریخ کار: {formatDate(entry.occurredAt)}</span>
                                  {entry.registeredByLabel &&
                                  entry.registeredByLabel !== entry.actorLabel ? (
                                    <span>ثبت‌کننده: {entry.registeredByLabel}</span>
                                  ) : null}
                                  {entry.durationMinutes ? (
                                    <span>مدت: {formatCompletionDuration(entry.durationMinutes)}</span>
                                  ) : null}
                                  {entry.phaseLabel ? <span>فاز: {entry.phaseLabel}</span> : null}
                                  {entry.taskLabel && entry.kind !== 'completed_task' ? (
                                    <span>وظیفه: {entry.taskLabel}</span>
                                  ) : null}
                                </div>
                              </div>

                              {entry.progressPercent !== null &&
                              entry.progressPercent !== undefined ? (
                                <div className="rounded-2xl bg-primary/10 px-4 py-3 text-center">
                                  <div className="text-xs font-bold text-primary">پیشرفت ثبت‌شده</div>
                                  <div className="mt-1 text-xl font-black text-primary">
                                    {formatNumber(entry.progressPercent)}٪
                                  </div>
                                </div>
                              ) : null}
                            </div>

                            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-base-content/80">
                              {entry.description}
                            </p>

                            {entry.deliverables || entry.blockers || entry.nextSteps ? (
                              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                                {entry.deliverables ? (
                                  <div className="rounded-2xl bg-success/5 p-4">
                                    <div className="text-xs font-black text-success">خروجی‌ها</div>
                                    <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-base-content/75">
                                      {entry.deliverables}
                                    </p>
                                  </div>
                                ) : null}
                                {entry.blockers ? (
                                  <div className="rounded-2xl bg-error/5 p-4">
                                    <div className="text-xs font-black text-error">موانع</div>
                                    <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-base-content/75">
                                      {entry.blockers}
                                    </p>
                                  </div>
                                ) : null}
                                {entry.nextSteps ? (
                                  <div className="rounded-2xl bg-info/5 p-4">
                                    <div className="text-xs font-black text-info">گام بعدی</div>
                                    <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-base-content/75">
                                      {entry.nextSteps}
                                    </p>
                                  </div>
                                ) : null}
                              </div>
                            ) : null}

                            {renderFiles(entry.files, 'فایل‌های مرتبط با این کار')}
                          </article>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-dashed border-base-300 p-8 text-center text-sm leading-7 text-base-content/60">
                          هنوز گزارش مدیریتی برای این پروژه ثبت نشده است.
                        </div>
                      )}
                    </div>
                  </section>
                </div>

                {canViewManagerWorkspace ? (
                  <div
                    id="project-expert-completions"
                    className={
                      activeProjectTab === 'expert_completions'
                        ? 'avid-glass-surface rounded-3xl p-5'
                        : 'hidden'
                    }
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <CheckCircleIcon className="h-5 w-5 text-primary" />
                          <h2 className="text-lg font-black text-gray-900 dark:text-gray-100">
                            کارهای تکمیل‌شده کارشناسان
                          </h2>
                        </div>
                        <p className="mt-2 text-sm leading-7 text-gray-500">
                          اعلام‌های تکمیل ثبت‌شده توسط کارشناسان، چه از پنل و چه از ربات تلگرام، همراه با وضعیت بررسی مدیر نمایش داده می‌شوند.
                        </p>
                      </div>

                      <button
                        type="button"
                        className="btn btn-sm btn-outline rounded-xl"
                        onClick={loadProjectWorkspace}
                        disabled={loading}
                      >
                        <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        به‌روزرسانی
                      </button>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="stat rounded-2xl bg-base-200/60">
                        <div className="stat-title text-xs font-bold">کل ثبت‌ها</div>
                        <div className="stat-value text-2xl text-base-content">{formatNumber(expertCompletionSummary.total)}</div>
                      </div>
                      <div className="stat rounded-2xl bg-warning/10">
                        <div className="stat-title text-xs font-bold">در انتظار بررسی</div>
                        <div className="stat-value text-2xl text-warning">{formatNumber(expertCompletionSummary.pending)}</div>
                      </div>
                      <div className="stat rounded-2xl bg-success/10">
                        <div className="stat-title text-xs font-bold">تأییدشده</div>
                        <div className="stat-value text-2xl text-success">{formatNumber(expertCompletionSummary.approved)}</div>
                      </div>
                      <div className="stat rounded-2xl bg-error/10">
                        <div className="stat-title text-xs font-bold">ردشده</div>
                        <div className="stat-value text-2xl text-error">{formatNumber(expertCompletionSummary.rejected)}</div>
                      </div>
                    </div>

                    <div className="mt-6 space-y-4">
                      {expertCompletions.length ? (
                        expertCompletions.map((completion) => (
                          <article
                            key={completion.id || completion._id}
                            className={`rounded-3xl border p-5 ${
                              completion.status === 'pending'
                                ? 'border-warning/40 bg-warning/5'
                                : 'border-base-300 bg-base-100'
                            }`}
                          >
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="text-base font-black text-base-content">{completion.title}</h3>
                                  <span className={`badge ${getExpertCompletionStatusClass(completion.status)}`}>
                                    {completion.statusLabel || expertCompletionStatusLabels[completion.status]}
                                  </span>
                                  <span className="badge badge-outline">
                                    {completion.source === 'telegram_bot' ? 'ثبت‌شده در تلگرام' : 'ثبت‌شده در پنل'}
                                  </span>
                                </div>

                                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-base-content/60">
                                  <span>کارشناس: {getUserDisplayName(completion.expertId)}</span>
                                  <span>تاریخ تکمیل: {formatDate(completion.completionDate)}</span>
                                  <span>مدت کار: {formatCompletionDuration(completion.durationMinutes)}</span>
                                  <span>تاریخ ثبت: {formatDate(completion.createdAt)}</span>
                                </div>
                              </div>

                              {completion.reviewedAt ? (
                                <div className="rounded-2xl bg-base-200 px-4 py-3 text-xs leading-6 text-base-content/70">
                                  <div>بررسی: {formatDate(completion.reviewedAt)}</div>
                                  <div>بررسی‌کننده: {getUserDisplayName(completion.reviewerId)}</div>
                                </div>
                              ) : null}
                            </div>

                            <div className="mt-4 grid gap-4 lg:grid-cols-2">
                              <div className="rounded-2xl bg-base-200/60 p-4">
                                <div className="text-xs font-black text-primary">شرح کار انجام‌شده</div>
                                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-base-content/80">{completion.summary}</p>
                              </div>
                              <div className="rounded-2xl bg-base-200/60 p-4">
                                <div className="text-xs font-black text-primary">خروجی‌ها و تحویل‌دادنی‌ها</div>
                                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-base-content/80">{completion.deliverables}</p>
                              </div>
                            </div>

                            {completion.managerNote ? (
                              <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                                <div className="text-xs font-black text-primary">نظر مدیر</div>
                                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-base-content/80">{completion.managerNote}</p>
                              </div>
                            ) : null}
                          </article>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-dashed border-base-300 p-8 text-center text-sm leading-7 text-base-content/60">
                          هنوز هیچ کار تکمیل‌شده‌ای از طرف کارشناسان برای این پروژه ثبت نشده است.
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

                <div id="project-files" className={activeProjectTab === 'files' ? 'avid-glass-surface rounded-3xl p-5' : 'hidden'}>
                  <div className="mb-4 flex items-center gap-2">
                    <DocumentArrowUpIcon className="h-5 w-5 text-primary" />

                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      فایل‌های پروژه
                    </h2>
                  </div>

                  <form onSubmit={handleUploadFile} className="space-y-4">
                    <input
                      type="file"
                      className="file-input file-input-bordered w-full"
                      onChange={(event) =>
                        setSelectedFile(event.target.files?.[0] || null)
                      }
                    />

                    <select
                      className="select select-bordered w-full"
                      value={fileCategory}
                      onChange={(event) =>
                        setFileCategory(event.target.value as ProjectFileCategory)
                      }
                    >
                      {fileCategoryOptions.map((category) => (
                        <option key={category} value={category}>
                          {projectFileCategoryLabels[category]}
                        </option>
                      ))}
                    </select>

                    <button
                      type="submit"
                      className="btn btn-outline w-full"
                      disabled={uploadingFile || !selectedFile}
                    >
                      {uploadingFile ? 'در حال آپلود...' : 'آپلود فایل'}
                    </button>
                  </form>

                  <div className="mt-6 space-y-3">
                    {files.length ? (
                      files.map((file) => {
                        const fileUrl = resolveFileUrl(file.fileUrl);
                        const isAudio = isAudioProjectFile(file);

                        return (
                          <div
                            key={getFileId(file)}
                            className="rounded-xl border border-gray-200 p-3 transition hover:border-primary dark:border-gray-800"
                          >
                            <a
                              href={fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="block"
                            >
                              <div className="font-medium text-gray-900 dark:text-gray-100">
                                {file.originalName}
                              </div>

                              <div className="mt-1 text-xs text-gray-500">
                                {file.categoryLabel ||
                                  projectFileCategoryLabels[file.category]}{' '}
                                · {getUserDisplayName(file.uploadedBy)}
                              </div>
                            </a>

                            {isAudio ? (
                              <audio
                                controls
                                preload="none"
                                src={fileUrl}
                                className="mt-3 w-full"
                              />
                            ) : null}

                            {file.transcriptionText ? (
                              <div className="mt-3 rounded-lg bg-primary/5 p-3 text-sm leading-7 text-gray-700 dark:text-gray-200">
                                <div className="mb-1 flex items-center gap-1 text-xs font-bold text-primary">
                                  <SpeakerWaveIcon className="h-4 w-4" />
                                  متن تبدیل‌شده از صوت
                                </div>
                                {file.transcriptionText}
                              </div>
                            ) : file.transcriptionStatus === 'failed' ? (
                              <div className="mt-3 rounded-lg bg-error/10 p-3 text-xs leading-6 text-error">
                                تبدیل صوت به متن انجام نشد: {file.transcriptionError || 'خطای نامشخص'}
                              </div>
                            ) : null}
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-xl border border-dashed border-gray-300 p-5 text-center text-sm text-gray-500 dark:border-gray-700">
                        هنوز فایلی برای پروژه ثبت نشده است.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm dark:bg-gray-900">
            پروژه پیدا نشد یا به آن دسترسی ندارید.
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export const getServerSideProps = withAuth();

export default DashboardProjectDetailsPage;