import { useEffect, useMemo, useState } from 'react';
import type { ElementType, ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowPathIcon,
  ChartBarIcon,
  DocumentChartBarIcon,
  ExclamationTriangleIcon,
  FolderOpenIcon,
  ListBulletIcon,
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
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { toast } from 'sonner';
import { projectService } from '@/services/project.service';
import {
  getProjectId,
  getUserDisplayName,
  Project,
  ProjectFile,
  ProjectPhase,
  ProjectPriority,
  ProjectProgressNote,
  ProjectStatus,
  ProjectTask,
  projectPriorityLabels,
  projectStatusLabels,
} from '@/types/project';

type ProjectChartRow = {
  id: string;
  title: string;
  shortTitle: string;
  status: ProjectStatus | string;
  statusLabel: string;
  priority: ProjectPriority | string;
  priorityLabel: string;
  ownerName: string;
  startDate: string | null;
  dueDate: string | null;
  statusColor: string;
  statusTone: 'healthy' | 'active' | 'warning' | 'danger' | 'neutral';
  healthLabel: string;
  progressPercent: number;
  totalTasks: number;
  todoTasks: number;
  activeTasks: number;
  blockedTasks: number;
  doneTasks: number;
  cancelledTasks: number;
  openTasks: number;
  overdueTasks: number;
  reportCount: number;
  fileCount: number;
  reportFileCount: number;
  totalFileSizeBytes: number;
  phaseCount: number;
  totalPhaseDays: number;
  phaseExpectedRevenue: number;
  phaseExpectedExpense: number;
  phaseRealizedRevenue: number;
  phaseRealizedExpense: number;
  phaseRealizedBalance: number;
  lastReportDate: string | null;
  daysRemaining: number | null;
  daysOverdue: number;
  riskScore: number;
  backlogTasks: number;
  backlogPercent: number;
  todoPercent: number;
  activePercent: number;
  blockedPercent: number;
  donePercent: number;
  cancelledPercent: number;
};

const COLORS = {
  blue: '#2563eb',
  cyan: '#0891b2',
  emerald: '#16a34a',
  amber: '#f59e0b',
  orange: '#f97316',
  red: '#dc2626',
  rose: '#e11d48',
  violet: '#7c3aed',
  slate: '#64748b',
  gray: '#94a3b8',
};

const AXIS_TICK_STYLE = {
  fill: 'var(--app-base-content)',
  fontSize: 12,
  fontWeight: 800,
};

const GRID_STROKE = 'var(--app-border-soft)';

const formatNumber = (value: number | null | undefined): string => {
  return Number(value || 0).toLocaleString('fa-IR');
};

const formatPercent = (value: number | null | undefined): string => {
  return `${formatNumber(value || 0)}٪`;
};

type ChartLabelValue = string | number | boolean | null | undefined;

const formatTaskPercentLabel = (value: ChartLabelValue): string => {
  if (typeof value !== 'string' && typeof value !== 'number') return '';

  const percent = Number(value);

  if (!Number.isFinite(percent) || percent < 8) return '';

  return `${formatNumber(percent)}٪`;
};

const formatAmount = (value: number | null | undefined): string => {
  return `${formatNumber(value || 0)} ریال`;
};

const getFinanceBalanceClass = (value: number): string => {
  if (value > 0) return 'text-success';
  if (value < 0) return 'text-error';

  return 'text-base-content/70';
};

const normalizeAmount = (value?: number | string | null): number => {
  const amount = Number(value || 0);

  if (!Number.isFinite(amount) || amount < 0) return 0;

  return Math.round(amount);
};

const formatDate = (value?: string | null): string => {
  if (!value) return 'ثبت نشده';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'ثبت نشده';

  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
};

const formatBytes = (bytes: number | null | undefined): string => {
  const value = Number(bytes || 0);

  if (value <= 0) return '۰ بایت';

  const units = ['بایت', 'KB', 'MB', 'GB'];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toLocaleString('fa-IR', {
    maximumFractionDigits: unitIndex === 0 ? 0 : 1,
  })} ${units[unitIndex]}`;
};

const truncateTitle = (value: string, maxLength = 30): string => {
  if (!value) return 'پروژه بدون عنوان';
  if (value.length <= maxLength) return value;

  return `${value.slice(0, maxLength - 1)}…`;
};

const toDate = (value?: string | null): Date | null => {
  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

const diffDays = (first: Date, second: Date): number => {
  const day = 24 * 60 * 60 * 1000;

  return Math.ceil((first.getTime() - second.getTime()) / day);
};

const getPhaseFinancial = (phase: ProjectPhase) => {
  const financial = phase.financial || {};

  return {
    expectedRevenue: normalizeAmount(
      financial.expectedRevenue ?? financial.potentialRevenueAmount,
    ),
    expectedExpense: normalizeAmount(
      financial.expectedExpense ?? financial.potentialCostAmount,
    ),
    realizedRevenue: normalizeAmount(
      financial.realizedRevenue ?? financial.realizedRevenueAmount,
    ),
    realizedExpense: normalizeAmount(
      financial.realizedExpense ?? financial.realizedCostAmount,
    ),
  };
};

const getPhaseDurationDays = (phase: ProjectPhase): number => {
  const start = toDate(phase.startDate);
  const end = toDate(phase.endDate);

  if (!start || !end) return 0;

  return Math.max(diffDays(end, start), 1);
};

const getStatusBaseColor = (status: ProjectStatus | string): string => {
  switch (status) {
    case 'completed':
      return COLORS.emerald;
    case 'active':
      return COLORS.blue;
    case 'planning':
    case 'proposal_drafting':
    case 'contract_signing':
    case 'negotiating':
      return COLORS.cyan;
    case 'on_hold':
      return COLORS.amber;
    case 'cancelled':
      return COLORS.slate;
    default:
      return COLORS.violet;
  }
};

const getProjectHealth = (
  project: Project,
  overdueTasks: number,
  openTasks: number,
  blockedTasks: number,
  totalTasks: number,
): Pick<ProjectChartRow, 'statusColor' | 'statusTone' | 'healthLabel' | 'daysRemaining' | 'daysOverdue' | 'riskScore' | 'backlogTasks' | 'backlogPercent'> => {
  const today = new Date();
  const dueDate = toDate(project.dueDate || null);
  const status = project.status;
  const daysRemaining = dueDate ? diffDays(dueDate, today) : null;
  const daysOverdue = dueDate && daysRemaining !== null && daysRemaining < 0 ? Math.abs(daysRemaining) : 0;
  const backlogTasks = openTasks;
  const backlogPercent = totalTasks ? Math.round((backlogTasks / totalTasks) * 100) : 0;
  const riskScore = Math.min(
    100,
    backlogPercent + overdueTasks * 18 + blockedTasks * 12 + daysOverdue * 2,
  );

  if (status === 'cancelled') {
    return {
      statusColor: COLORS.slate,
      statusTone: 'neutral',
      healthLabel: 'لغوشده',
      daysRemaining,
      daysOverdue: 0,
      riskScore: 0,
      backlogTasks,
      backlogPercent,
    };
  }

  if (status === 'completed' && backlogTasks === 0) {
    return {
      statusColor: COLORS.emerald,
      statusTone: 'healthy',
      healthLabel: 'بدون بک‌لاگ',
      daysRemaining,
      daysOverdue: 0,
      riskScore: 0,
      backlogTasks,
      backlogPercent: 0,
    };
  }

  if (totalTasks === 0) {
    return {
      statusColor: COLORS.slate,
      statusTone: 'neutral',
      healthLabel: 'بدون وظیفه',
      daysRemaining,
      daysOverdue,
      riskScore: daysOverdue > 0 ? Math.min(60, daysOverdue * 5) : 10,
      backlogTasks: 0,
      backlogPercent: 0,
    };
  }

  if (overdueTasks > 0 || blockedTasks > 0 || backlogPercent >= 75) {
    return {
      statusColor: COLORS.red,
      statusTone: 'danger',
      healthLabel: 'بک‌لاگ بحرانی',
      daysRemaining,
      daysOverdue,
      riskScore,
      backlogTasks,
      backlogPercent,
    };
  }

  if (backlogPercent >= 50) {
    return {
      statusColor: COLORS.orange,
      statusTone: 'warning',
      healthLabel: 'بک‌لاگ زیاد',
      daysRemaining,
      daysOverdue,
      riskScore,
      backlogTasks,
      backlogPercent,
    };
  }

  if (backlogPercent >= 25) {
    return {
      statusColor: COLORS.amber,
      statusTone: 'warning',
      healthLabel: 'بک‌لاگ متوسط',
      daysRemaining,
      daysOverdue,
      riskScore,
      backlogTasks,
      backlogPercent,
    };
  }

  if (backlogPercent > 0) {
    return {
      statusColor: COLORS.blue,
      statusTone: 'active',
      healthLabel: 'بک‌لاگ کنترل‌شده',
      daysRemaining,
      daysOverdue,
      riskScore,
      backlogTasks,
      backlogPercent,
    };
  }

  return {
    statusColor: COLORS.emerald,
    statusTone: 'healthy',
    healthLabel: 'بدون بک‌لاگ',
    daysRemaining,
    daysOverdue,
    riskScore: 0,
    backlogTasks,
    backlogPercent,
  };
};

const buildProjectRows = (
  projects: Project[],
  taskMap: Record<string, ProjectTask[]>,
  noteMap: Record<string, ProjectProgressNote[]>,
  fileMap: Record<string, ProjectFile[]>,
  phaseMap: Record<string, ProjectPhase[]>,
): ProjectChartRow[] => {
  return projects.map((project) => {
    const id = getProjectId(project);
    const tasks = taskMap[id] || [];
    const notes = noteMap[id] || [];
    const files = fileMap[id] || [];
    const phases = phaseMap[id] || project.phases || [];
    const now = new Date();

    const doneTasks = tasks.filter((task) => task.status === 'done').length;
    const cancelledTasks = tasks.filter((task) => task.status === 'cancelled').length;
    const blockedTasks = tasks.filter((task) => task.status === 'blocked').length;
    const activeTasks = tasks.filter((task) => task.status === 'in_progress').length;
    const todoTasks = tasks.filter((task) => task.status === 'todo').length;
    const openTasks = tasks.filter(
      (task) => task.status !== 'done' && task.status !== 'cancelled',
    ).length;
    const overdueTasks = tasks.filter((task) => {
      const dueDate = toDate(task.dueDate || null);

      return Boolean(
        dueDate &&
          dueDate.getTime() < now.getTime() &&
          task.status !== 'done' &&
          task.status !== 'cancelled',
      );
    }).length;

    const totalTasks = tasks.length;
    const progressPercent = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;
    const toPercent = (value: number) => (totalTasks ? Math.round((value / totalTasks) * 100) : 0);
    const todoPercent = toPercent(todoTasks);
    const activePercent = toPercent(activeTasks);
    const blockedPercent = toPercent(blockedTasks);
    const donePercent = toPercent(doneTasks);
    const cancelledPercent = toPercent(cancelledTasks);
    const reportFiles = files.filter((file) => file.category === 'reports');
    const lastReportDate = notes
      .map((note) => toDate(note.createdAt))
      .filter(Boolean)
      .sort((first, second) => Number(second?.getTime() || 0) - Number(first?.getTime() || 0))[0];
    const phaseFinancialTotals = phases.reduce(
      (acc, phase) => {
        const financial = getPhaseFinancial(phase);

        acc.expectedRevenue += financial.expectedRevenue;
        acc.expectedExpense += financial.expectedExpense;
        acc.realizedRevenue += financial.realizedRevenue;
        acc.realizedExpense += financial.realizedExpense;

        return acc;
      },
      {
        expectedRevenue: 0,
        expectedExpense: 0,
        realizedRevenue: 0,
        realizedExpense: 0,
      },
    );
    const health = getProjectHealth(project, overdueTasks, openTasks, blockedTasks, totalTasks);

    return {
      id,
      title: project.title || 'پروژه بدون عنوان',
      shortTitle: truncateTitle(project.title || 'پروژه بدون عنوان'),
      status: project.status,
      statusLabel: project.statusLabel || projectStatusLabels[project.status] || project.status,
      priority: project.priority,
      priorityLabel: project.priorityLabel || projectPriorityLabels[project.priority] || project.priority,
      ownerName: getUserDisplayName(project.ownerId),
      startDate: project.startDate || null,
      dueDate: project.dueDate || null,
      progressPercent,
      todoPercent,
      activePercent,
      blockedPercent,
      donePercent,
      cancelledPercent,
      totalTasks,
      todoTasks,
      activeTasks,
      blockedTasks,
      doneTasks,
      cancelledTasks,
      openTasks,
      overdueTasks,
      reportCount: notes.length,
      fileCount: files.length,
      reportFileCount: reportFiles.length,
      totalFileSizeBytes: files.reduce((sum, file) => sum + Number(file.fileSize || 0), 0),
      phaseCount: phases.length,
      totalPhaseDays: phases.reduce((sum, phase) => sum + getPhaseDurationDays(phase), 0),
      phaseExpectedRevenue: phaseFinancialTotals.expectedRevenue,
      phaseExpectedExpense: phaseFinancialTotals.expectedExpense,
      phaseRealizedRevenue: phaseFinancialTotals.realizedRevenue,
      phaseRealizedExpense: phaseFinancialTotals.realizedExpense,
      phaseRealizedBalance: phaseFinancialTotals.realizedRevenue - phaseFinancialTotals.realizedExpense,
      lastReportDate: lastReportDate ? lastReportDate.toISOString() : null,
      ...health,
    };
  });
};

type TooltipProps = {
  active?: boolean;
  payload?: any[];
  label?: string;
};

const ProjectTooltip = ({ active, payload, label }: TooltipProps) => {
  if (!active || !payload?.length) return null;

  const row = payload[0]?.payload as ProjectChartRow | undefined;

  if (!row) return null;

  return (
    <div className="avid-glass-surface min-w-[260px] rounded-2xl px-4 py-3 text-right">
      <p className="text-sm font-black text-base-content">
        {row.title || label}
      </p>
      <div className="mt-3 grid gap-2 text-xs font-bold text-base-content/60">
        <div className="flex justify-between gap-4">
          <span>وضعیت</span>
          <span className="text-base-content">{row.healthLabel}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>درصد بک‌لاگ</span>
          <span className="text-base-content">{formatPercent(row.backlogPercent)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>بک‌لاگ / عقب‌افتاده</span>
          <span className="text-base-content">
            {formatNumber(row.backlogTasks)} / {formatNumber(row.overdueTasks)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span>گزارش / فایل</span>
          <span className="text-base-content">
            {formatNumber(row.reportCount)} / {formatNumber(row.fileCount)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span>سررسید</span>
          <span className="text-base-content">{formatDate(row.dueDate)}</span>
        </div>
      </div>
    </div>
  );
};

const SimpleTooltip = ({
  active,
  payload,
  label,
  valueFormatter = formatNumber,
}: TooltipProps & { valueFormatter?: (value: number) => string }) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="avid-glass-surface rounded-2xl px-4 py-3 text-right">
      <p className="mb-2 text-sm font-black text-base-content">{label}</p>
      <div className="space-y-1">
        {payload.map((entry) => (
          <div
            key={`${entry.name}-${entry.dataKey}`}
            className="flex min-w-[180px] items-center justify-between gap-4 text-xs"
          >
            <span className="font-bold text-base-content/60">
              {entry.name}
            </span>
            <span className="font-black text-base-content">
              {valueFormatter(Number(entry.value || 0))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ChartCard = ({
  title,
  description,
  children,
  className = '',
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) => {
  return (
    <section className={`avid-glass-surface rounded-3xl p-5 ${className}`}>
      <div className="mb-4">
        <h2 className="text-base font-black text-base-content">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-xs font-medium leading-6 text-base-content/60">
            {description}
          </p>
        ) : null}
      </div>
      <div className="[&_.recharts-cartesian-axis-tick-value]:fill-[var(--app-base-content)] [&_.recharts-legend-item-text]:!text-[var(--app-base-content)] [&_.recharts-text]:font-black">
        {children}
      </div>
    </section>
  );
};

const EmptyChart = ({ text = 'داده‌ای برای نمایش وجود ندارد.' }) => {
  return (
    <div className="flex h-[300px] items-center justify-center rounded-2xl border border-dashed border-base-300 text-sm font-bold text-base-content/55">
      {text}
    </div>
  );
};

const MetricCard = ({
  title,
  value,
  description,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: ElementType;
  tone: 'blue' | 'emerald' | 'amber' | 'rose' | 'slate' | 'violet';
}) => {
  const toneClasses = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900',
    emerald:
      'bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900',
    amber:
      'bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900',
    rose: 'bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900',
    slate:
      'bg-slate-50 text-slate-700 ring-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700',
    violet:
      'bg-violet-50 text-violet-700 ring-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900',
  };

  return (
    <div className="avid-glass-surface rounded-3xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-black text-base-content/60">
            {title}
          </p>
          <p className="mt-3 text-3xl font-black text-base-content">
            {typeof value === 'number' ? formatNumber(value) : value}
          </p>
          <p className="mt-2 text-xs leading-6 text-base-content/60">
            {description}
          </p>
        </div>
        <div className={`shrink-0 rounded-2xl p-3 ring-1 ${toneClasses[tone]}`}>
          <Icon className="h-7 w-7" />
        </div>
      </div>
    </div>
  );
};

const ProjectStatusLegend = () => {
  const items = [
    { label: 'بدون بک‌لاگ', color: COLORS.emerald },
    { label: 'بک‌لاگ کنترل‌شده', color: COLORS.blue },
    { label: 'بک‌لاگ متوسط', color: COLORS.amber },
    { label: 'بک‌لاگ زیاد', color: COLORS.orange },
    { label: 'بک‌لاگ بحرانی', color: COLORS.red },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item.label}
          className="inline-flex items-center gap-2 rounded-full border border-base-300 bg-base-100 px-3 py-1 text-xs font-black text-base-content/70"
        >
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
};

const ProjectChartsPage = () => {
  const [rows, setRows] = useState<ProjectChartRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingPriorityId, setSavingPriorityId] = useState('');

  const loadCharts = async () => {
    try {
      setLoading(true);
      setError('');

      const projectsResponse = await projectService.listProjects({ limit: 200 });
      const projects = projectsResponse.items || [];

      const detailRows = await Promise.all(
        projects.map(async (project) => {
          const projectId = getProjectId(project);

          if (!projectId) {
            return {
              project,
              tasks: [] as ProjectTask[],
              notes: [] as ProjectProgressNote[],
              files: [] as ProjectFile[],
              phases: project.phases || [],
            };
          }

          const [tasks, notes, files, phases] = await Promise.all([
            projectService.listTasks(projectId).catch(() => []),
            projectService.listNotes(projectId).catch(() => []),
            projectService.listFiles(projectId, { standaloneOnly: false }).catch(() => []),
            projectService.listProjectPhases(projectId).catch(() => project.phases || []),
          ]);

          return {
            project,
            tasks,
            notes,
            files,
            phases,
          };
        }),
      );

      const taskMap: Record<string, ProjectTask[]> = {};
      const noteMap: Record<string, ProjectProgressNote[]> = {};
      const fileMap: Record<string, ProjectFile[]> = {};
      const phaseMap: Record<string, ProjectPhase[]> = {};

      detailRows.forEach((item) => {
        const projectId = getProjectId(item.project);

        taskMap[projectId] = item.tasks;
        noteMap[projectId] = item.notes;
        fileMap[projectId] = item.files;
        phaseMap[projectId] = item.phases;
      });

      const nextRows = buildProjectRows(projects, taskMap, noteMap, fileMap, phaseMap);

      setRows(nextRows);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'خطا در دریافت نمودارهای پروژه‌محور';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCharts();
  }, []);

  const handlePriorityChange = async (row: ProjectChartRow, nextPriority: ProjectPriority) => {
    if (row.priority === nextPriority) return;

    try {
      setSavingPriorityId(row.id);
      const updatedProject = await projectService.updateProject(row.id, {
        priority: nextPriority,
      });
      const nextLabel = updatedProject.priorityLabel || projectPriorityLabels[nextPriority] || nextPriority;

      setRows((previous) =>
        previous.map((item) =>
          item.id === row.id
            ? {
                ...item,
                priority: nextPriority,
                priorityLabel: nextLabel,
              }
            : item,
        ),
      );
      toast.success('اولویت پروژه بروزرسانی شد.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'خطا در بروزرسانی اولویت پروژه');
    } finally {
      setSavingPriorityId('');
    }
  };

  const summary = useMemo(() => {
    const totalProjects = rows.length;
    const overdueProjects = rows.filter((row) => row.healthLabel === 'بک‌لاگ بحرانی').length;
    const dueSoonProjects = rows.filter((row) => row.healthLabel === 'بک‌لاگ زیاد' || row.healthLabel === 'بک‌لاگ متوسط').length;
    const completedProjects = rows.filter((row) => row.status === 'completed').length;
    const totalTasks = rows.reduce((sum, row) => sum + row.totalTasks, 0);
    const doneTasks = rows.reduce((sum, row) => sum + row.doneTasks, 0);
    const totalReports = rows.reduce((sum, row) => sum + row.reportCount, 0);
    const totalFiles = rows.reduce((sum, row) => sum + row.fileCount, 0);
    const totalFileSize = rows.reduce((sum, row) => sum + row.totalFileSizeBytes, 0);

    return {
      totalProjects,
      overdueProjects,
      dueSoonProjects,
      completedProjects,
      totalTasks,
      doneTasks,
      completionRate: totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0,
      totalReports,
      totalFiles,
      totalFileSize,
    };
  }, [rows]);

  const sortedRows = useMemo(() => {
    return [...rows].sort((first, second) => {
      if (second.riskScore !== first.riskScore) return second.riskScore - first.riskScore;

      return first.title.localeCompare(second.title, 'fa');
    });
  }, [rows]);

  const chartHeight = Math.max(360, sortedRows.length * 46 + 80);

  if (loading) {
    return (
      <div className="flex min-h-96 items-center justify-center" dir="rtl">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg text-primary" />
          <p className="mt-4 text-sm text-base-content/60">
            در حال آماده‌سازی نمودارهای پروژه‌محور...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4" dir="rtl">
        <div className="alert alert-error">
          <ExclamationTriangleIcon className="h-5 w-5" />
          <span>{error}</span>
        </div>
        <button type="button" className="btn btn-primary" onClick={loadCharts}>
          <ArrowPathIcon className="h-5 w-5" />
          تلاش دوباره
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <section className="avid-glass-surface rounded-3xl p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">
              گزارش مدیریتی پروژه‌محور
            </p>
            <h1 className="mt-3 text-2xl font-black text-base-content">
              نمودارهای مقایسه‌ای همه پروژه‌ها
            </h1>
            <p className="mt-2 max-w-4xl text-sm leading-7 text-base-content/60">
              در این صفحه محور تمام گزارش‌ها «پروژه» است. هر ردیف یا ستون یک پروژه را نشان می‌دهد تا مدیریت بتواند وضعیت، پیشرفت، ریسک، وظایف، فازها، گزارش‌ها و فایل‌های همه پروژه‌ها را کنار هم مقایسه کند.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/project-overview" className="btn btn-outline">
              نمای کلان
            </Link>
            <Link href="/dashboard/projects" className="btn btn-outline">
              لیست پروژه‌ها
            </Link>
            <button type="button" className="btn btn-primary" onClick={loadCharts}>
              <ArrowPathIcon className="h-5 w-5" />
              بروزرسانی
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="کل پروژه‌ها"
          value={summary.totalProjects}
          description={`${formatNumber(summary.completedProjects)} تکمیل‌شده / ${formatNumber(summary.overdueProjects)} بک‌لاگ بحرانی`}
          icon={FolderOpenIcon}
          tone="blue"
        />
        <MetricCard
          title="پروژه‌های نیازمند پیگیری"
          value={summary.overdueProjects + summary.dueSoonProjects}
          description={`${formatNumber(summary.overdueProjects)} بحرانی و ${formatNumber(summary.dueSoonProjects)} متوسط یا زیاد`}
          icon={ExclamationTriangleIcon}
          tone={summary.overdueProjects > 0 ? 'rose' : 'amber'}
        />
        <MetricCard
          title="نرخ تکمیل وظایف"
          value={formatPercent(summary.completionRate)}
          description={`${formatNumber(summary.doneTasks)} از ${formatNumber(summary.totalTasks)} وظیفه انجام شده است`}
          icon={ChartBarIcon}
          tone="emerald"
        />
        <MetricCard
          title="گزارش‌ها و فایل‌ها"
          value={summary.totalReports}
          description={`${formatNumber(summary.totalFiles)} فایل / ${formatBytes(summary.totalFileSize)}`}
          icon={DocumentChartBarIcon}
          tone="slate"
        />
      </section>

      <ChartCard
        title="وضعیت همه پروژه‌ها بر اساس مقدار بک‌لاگ"
        description="هر پروژه یک ستون افقی دارد. طول ستون درصد بک‌لاگ وظایف و رنگ ستون وضعیت مدیریتی همان پروژه را نشان می‌دهد. وضعیت پروژه در این صفحه از مقدار بک‌لاگ، وظایف مسدود و وظایف عقب‌افتاده محاسبه می‌شود."
      >
        <div className="mb-4">
          <ProjectStatusLegend />
        </div>
        {sortedRows.length ? (
          <div style={{ height: chartHeight }} dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sortedRows}
                layout="vertical"
                margin={{ top: 8, right: 12, left: 12, bottom: 8 }}
              >
                <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={AXIS_TICK_STYLE}
                  tickFormatter={(value) => `${value}%`}
                />
                <YAxis
                  dataKey="shortTitle"
                  type="category"
                  width={190}
                  tick={AXIS_TICK_STYLE}
                  interval={0}
                />
                <Tooltip content={<ProjectTooltip />} />
                <Bar dataKey="backlogPercent" name="درصد بک‌لاگ" radius={[0, 14, 14, 0]}>
                  {sortedRows.map((row) => (
                    <Cell key={`project-status-${row.id}`} fill={row.statusColor} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart text="هنوز پروژه‌ای برای نمایش نمودار ثبت نشده است." />
        )}
      </ChartCard>

      <section className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="درصد وضعیت وظایف هر پروژه"
          description="نمای مقایسه‌ای درصدی از وضعیت وظایف هر پروژه؛ مجموع هر ستون ۱۰۰٪ است تا پروژه‌های کوچک و بزرگ قابل مقایسه باشند."
        >
          {sortedRows.length ? (
            <div className="h-[420px]" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sortedRows} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="shortTitle" tick={AXIS_TICK_STYLE} interval={0} angle={-35} textAnchor="end" height={96} />
                  <YAxis allowDecimals={false} tick={AXIS_TICK_STYLE} domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                  <Tooltip content={<SimpleTooltip valueFormatter={(value) => formatPercent(value)} />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12, fontWeight: 800 }} />
                  <Bar dataKey="todoPercent" stackId="tasks" name="برای انجام" fill={COLORS.gray} radius={[0, 0, 0, 0]}>
                    <LabelList dataKey="todoPercent" position="center" formatter={formatTaskPercentLabel} fill="#fff" fontSize={11} fontWeight={900} />
                  </Bar>
                  <Bar dataKey="activePercent" stackId="tasks" name="در حال انجام" fill={COLORS.blue} radius={[0, 0, 0, 0]}>
                    <LabelList dataKey="activePercent" position="center" formatter={formatTaskPercentLabel} fill="#fff" fontSize={11} fontWeight={900} />
                  </Bar>
                  <Bar dataKey="blockedPercent" stackId="tasks" name="مسدود" fill={COLORS.amber} radius={[0, 0, 0, 0]}>
                    <LabelList dataKey="blockedPercent" position="center" formatter={formatTaskPercentLabel} fill="#111827" fontSize={11} fontWeight={900} />
                  </Bar>
                  <Bar dataKey="donePercent" stackId="tasks" name="انجام‌شده" fill={COLORS.emerald} radius={[10, 10, 0, 0]}>
                    <LabelList dataKey="donePercent" position="center" formatter={formatTaskPercentLabel} fill="#fff" fontSize={11} fontWeight={900} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        <ChartCard
          title="ریسک زمانی هر پروژه"
          description="امتیاز ریسک از ترکیب تاخیر پروژه، نزدیکی سررسید و وظایف عقب‌افتاده ساخته می‌شود."
        >
          {sortedRows.length ? (
            <div className="h-[420px]" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sortedRows} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="shortTitle" tick={AXIS_TICK_STYLE} interval={0} angle={-35} textAnchor="end" height={96} />
                  <YAxis allowDecimals={false} tick={AXIS_TICK_STYLE} domain={[0, 100]} />
                  <Tooltip content={<SimpleTooltip valueFormatter={(value) => `${formatNumber(value)} از ۱۰۰`} />} />
                  <Bar dataKey="riskScore" name="امتیاز ریسک" radius={[10, 10, 0, 0]}>
                    {sortedRows.map((row) => (
                      <Cell key={`risk-${row.id}`} fill={row.statusColor} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="گزارش‌ها و فایل‌ها بر اساس پروژه"
          description="این نمودار نشان می‌دهد برای هر پروژه چه مقدار گزارش کاری و فایل ثبت شده است."
        >
          {sortedRows.length ? (
            <div className="h-[420px]" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sortedRows} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="shortTitle" tick={AXIS_TICK_STYLE} interval={0} angle={-35} textAnchor="end" height={96} />
                  <YAxis allowDecimals={false} tick={AXIS_TICK_STYLE} />
                  <Tooltip content={<SimpleTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12, fontWeight: 800 }} />
                  <Bar dataKey="reportCount" name="گزارش کار" fill={COLORS.violet} radius={[8, 8, 0, 0]} />
                  <Bar dataKey="fileCount" name="کل فایل‌ها" fill={COLORS.cyan} radius={[8, 8, 0, 0]} />
                  <Bar dataKey="reportFileCount" name="فایل گزارش" fill={COLORS.blue} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        <ChartCard
          title="مالی ساده فازها بر اساس پروژه"
          description="این نمودار فقط بخش مالی ساده فازها را نشان می‌دهد؛ درآمد و هزینه واقعی فازها به تفکیک پروژه."
        >
          {sortedRows.length ? (
            <div className="h-[420px]" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sortedRows} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="shortTitle" tick={AXIS_TICK_STYLE} interval={0} angle={-35} textAnchor="end" height={96} />
                  <YAxis allowDecimals={false} tick={AXIS_TICK_STYLE} tickFormatter={(value) => formatNumber(Number(value))} />
                  <Tooltip content={<SimpleTooltip valueFormatter={(value) => formatAmount(value)} />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12, fontWeight: 800 }} />
                  <Bar dataKey="phaseRealizedRevenue" name="درآمد واقعی فازها" fill={COLORS.emerald} radius={[8, 8, 0, 0]} />
                  <Bar dataKey="phaseRealizedExpense" name="هزینه واقعی فازها" fill={COLORS.rose} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        <ChartCard
          title="فازهای هر پروژه"
          description="تعداد فازها و مجموع روزهای برنامه‌ریزی‌شده برای فازهای هر پروژه."
        >
          {sortedRows.length ? (
            <div className="h-[420px]" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sortedRows} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="shortTitle" tick={AXIS_TICK_STYLE} interval={0} angle={-35} textAnchor="end" height={96} />
                  <YAxis allowDecimals={false} tick={AXIS_TICK_STYLE} />
                  <Tooltip content={<SimpleTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12, fontWeight: 800 }} />
                  <Line type="monotone" dataKey="phaseCount" name="تعداد فاز" stroke={COLORS.blue} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="totalPhaseDays" name="مجموع روزهای فاز" stroke={COLORS.emerald} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>
      </section>

      <section className="avid-glass-surface rounded-3xl p-5">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-base font-black text-base-content">
              جدول مدیریتی پروژه‌ها
            </h2>
            <p className="mt-1 text-xs leading-6 text-base-content/60">
              جدول فقط داده‌های تصمیم‌ساز را نگه می‌دارد: وضعیت بک‌لاگ، اولویت قابل ویرایش، پیشرفت و مالی ساده فازها.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <ListBulletIcon className="h-4 w-4" />
            {formatNumber(sortedRows.length)} پروژه
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-950">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-black text-base-content/60">پروژه</th>
                <th className="px-4 py-3 text-right text-xs font-black text-base-content/60">وضعیت بک‌لاگ</th>
                <th className="px-4 py-3 text-right text-xs font-black text-base-content/60">اولویت</th>
                <th className="px-4 py-3 text-right text-xs font-black text-base-content/60">پیشرفت</th>
                <th className="px-4 py-3 text-right text-xs font-black text-base-content/60">درآمد / هزینه</th>
                <th className="px-4 py-3 text-right text-xs font-black text-base-content/60">سررسید</th>
                <th className="px-4 py-3 text-right text-xs font-black text-base-content/60">مسئول</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sortedRows.length ? (
                sortedRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <Link href={`/dashboard/projects/${row.id}`} className="font-black text-blue-700 hover:underline dark:text-blue-300">
                        {row.title}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black text-white" style={{ backgroundColor: row.statusColor }}>
                        {row.healthLabel} · {formatPercent(row.backlogPercent)}
                      </span>
                    </td>
                    <td className="min-w-40 whitespace-nowrap px-4 py-3 text-sm">
                      <select
                        className="select select-bordered select-sm w-full bg-base-100 font-black"
                        value={row.priority}
                        disabled={savingPriorityId === row.id}
                        onChange={(event) => handlePriorityChange(row, event.target.value as ProjectPriority)}
                      >
                        {Object.entries(projectPriorityLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-bold text-base-content">
                      {formatPercent(row.progressPercent)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs font-bold">
                      <div className="space-y-1">
                        <div className="flex min-w-56 items-center justify-between gap-4 rounded-lg bg-success/10 px-3 py-1 text-success">
                          <span>درآمد واقعی</span>
                          <span>{formatAmount(row.phaseRealizedRevenue)}</span>
                        </div>
                        <div className="flex min-w-56 items-center justify-between gap-4 rounded-lg bg-error/10 px-3 py-1 text-error">
                          <span>هزینه واقعی</span>
                          <span>{formatAmount(row.phaseRealizedExpense)}</span>
                        </div>
                        <div className={`flex min-w-56 items-center justify-between gap-4 rounded-lg bg-base-200 px-3 py-1 ${getFinanceBalanceClass(row.phaseRealizedBalance)}`}>
                          <span>مانده</span>
                          <span>{formatAmount(row.phaseRealizedBalance)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                      {formatDate(row.dueDate)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                      {row.ownerName}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-base-content/60">
                    هنوز پروژه‌ای برای گزارش مدیریتی ثبت نشده است.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default ProjectChartsPage;
