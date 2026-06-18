// src/components/project-overview/ProjectOverviewPage.tsx

import { useEffect, useMemo, useState } from 'react';
import type { ElementType, ReactNode } from 'react';
import {
  ArrowPathIcon,
  ChartBarIcon,
  ClockIcon,
  DocumentChartBarIcon,
  ExclamationTriangleIcon,
  FolderOpenIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  Treemap,
  XAxis,
  YAxis,
} from 'recharts';
import { toast } from 'sonner';
import {
  ProjectOverviewData,
  ProjectOverviewExpertWorkload,
  ProjectOverviewOverdueProject,
  ProjectOverviewReportVolume,
  ProjectOverviewRoleWorkload,
  projectService,
} from '@/services/project.service';

const SEMANTIC_COLORS = {
  blue: '#2563eb',
  sky: '#0284c7',
  cyan: '#0891b2',
  violet: '#7c3aed',
  emerald: '#16a34a',
  amber: '#f59e0b',
  orange: '#f97316',
  rose: '#e11d48',
  red: '#dc2626',
  slate: '#64748b',
  zinc: '#71717a',
};

const SAFE_STAGE_COLORS = [
  SEMANTIC_COLORS.blue,
  SEMANTIC_COLORS.sky,
  SEMANTIC_COLORS.violet,
  SEMANTIC_COLORS.emerald,
  SEMANTIC_COLORS.amber,
  SEMANTIC_COLORS.slate,
  SEMANTIC_COLORS.rose,
  SEMANTIC_COLORS.zinc,
];

const RISK_SCALE_COLORS = [
  '#fee2e2',
  '#fecaca',
  '#fca5a5',
  '#f87171',
  '#ef4444',
  '#dc2626',
  '#b91c1c',
  '#991b1b',
];

const BUNDLE_SIZE_COLORS = [
  '#dbeafe',
  '#bfdbfe',
  '#93c5fd',
  '#60a5fa',
  '#3b82f6',
  '#2563eb',
  '#1d4ed8',
  '#1e40af',
];

const AXIS_TICK_STYLE = {
  fill: '#0f172a',
  fontSize: 12,
  fontWeight: 900,
};

const GRID_STROKE = '#e2e8f0';

const emptyOverview: ProjectOverviewData = {
  generatedAt: new Date().toISOString(),
  summary: {
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    cancelledProjects: 0,
    overdueProjects: 0,
    dueSoonProjects: 0,
    totalTasks: 0,
    overdueTasks: 0,
    blockedTasks: 0,
    doneTasks: 0,
    totalRoles: 0,
    totalExperts: 0,
    reportFilesCount: 0,
    reportFilesSizeBytes: 0,
  },
  charts: {
    projectsByStatus: [],
    projectsByPriority: [],
    tasksByStatus: [],
    overdueByRole: [],
    overdueByExpert: [],
    reportVolumeByProject: [],
  },
  tables: {
    overdueProjects: [],
    roleWorkload: [],
    expertWorkload: [],
  },
};

const formatNumber = (value: number | null | undefined): string => {
  return Number(value || 0).toLocaleString('fa-IR');
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

const formatDate = (value?: string | null): string => {
  if (!value) return 'ثبت نشده';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'ثبت نشده';

  return date.toLocaleDateString('fa-IR');
};

const getCompletionRate = (completed: number, total: number): number => {
  if (!total) return 0;

  return Math.round((completed / total) * 100);
};

const getSeverityColor = (value: number, maxValue: number): string => {
  if (value <= 0) return SEMANTIC_COLORS.emerald;
  if (maxValue <= 0) return SEMANTIC_COLORS.red;

  const index = Math.min(
    RISK_SCALE_COLORS.length - 1,
    Math.max(1, Math.ceil((value / maxValue) * (RISK_SCALE_COLORS.length - 1))),
  );

  return RISK_SCALE_COLORS[index];
};

const getBundleColor = (value: number, maxValue: number): string => {
  if (value <= 0 || maxValue <= 0) return '#e2e8f0';

  const index = Math.min(
    BUNDLE_SIZE_COLORS.length - 1,
    Math.max(1, Math.ceil((value / maxValue) * (BUNDLE_SIZE_COLORS.length - 1))),
  );

  return BUNDLE_SIZE_COLORS[index];
};

const getStatusColor = (item: any, index: number): string => {
  const source = `${item?.status || item?.key || item?.label || ''}`.toLowerCase();

  if (
    source.includes('completed') ||
    source.includes('done') ||
    source.includes('تکمیل') ||
    source.includes('انجام')
  ) {
    return SEMANTIC_COLORS.emerald;
  }

  if (
    source.includes('active') ||
    source.includes('progress') ||
    source.includes('فعال') ||
    source.includes('جاری')
  ) {
    return SEMANTIC_COLORS.blue;
  }

  if (
    source.includes('hold') ||
    source.includes('blocked') ||
    source.includes('مسدود') ||
    source.includes('متوقف') ||
    source.includes('تعلیق')
  ) {
    return SEMANTIC_COLORS.amber;
  }

  if (
    source.includes('cancel') ||
    source.includes('overdue') ||
    source.includes('لغو') ||
    source.includes('عقب')
  ) {
    return SEMANTIC_COLORS.red;
  }

  return SAFE_STAGE_COLORS[index % SAFE_STAGE_COLORS.length];
};

const getPriorityColor = (item: any, index: number): string => {
  const source = `${item?.priority || item?.key || item?.label || ''}`.toLowerCase();

  if (source.includes('critical') || source.includes('بحرانی')) {
    return SEMANTIC_COLORS.red;
  }

  if (source.includes('high') || source.includes('زیاد') || source.includes('بالا')) {
    return SEMANTIC_COLORS.orange;
  }

  if (source.includes('medium') || source.includes('متوسط')) {
    return SEMANTIC_COLORS.blue;
  }

  if (source.includes('low') || source.includes('کم')) {
    return SEMANTIC_COLORS.emerald;
  }

  return SAFE_STAGE_COLORS[index % SAFE_STAGE_COLORS.length];
};

type MetricCardProps = {
  title: string;
  value: string | number;
  subtitle: string;
  icon: ElementType;
  tone?: 'blue' | 'emerald' | 'amber' | 'rose' | 'slate';
};

const toneClasses: Record<NonNullable<MetricCardProps['tone']>, string> = {
  blue: 'bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-900',
  emerald:
    'bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900',
  amber:
    'bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-900',
  rose: 'bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-950/50 dark:text-rose-300 dark:ring-rose-900',
  slate:
    'bg-slate-50 text-slate-700 ring-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700',
};

const MetricCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  tone = 'blue',
}: MetricCardProps) => {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <p className="mt-3 text-3xl font-black text-slate-950 dark:text-white">
            {typeof value === 'number' ? formatNumber(value) : value}
          </p>
          <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
        </div>
        <div className={`rounded-2xl p-3 ring-1 ${toneClasses[tone]}`}>
          <Icon className="h-7 w-7" />
        </div>
      </div>
    </div>
  );
};

type ChartCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
  accent?: 'blue' | 'emerald' | 'amber' | 'rose' | 'violet' | 'slate';
};

const chartAccentClasses: Record<NonNullable<ChartCardProps['accent']>, string> = {
  blue: 'border-r-blue-500',
  emerald: 'border-r-emerald-500',
  amber: 'border-r-amber-500',
  rose: 'border-r-rose-500',
  violet: 'border-r-violet-500',
  slate: 'border-r-slate-400',
};

const ChartCard = ({
  title,
  description,
  children,
  accent = 'blue',
}: ChartCardProps) => {
  return (
    <div
      className={`rounded-3xl border border-r-4 border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${chartAccentClasses[accent]}`}
    >
      <div className="mb-4">
        <h2 className="text-base font-black text-slate-950 dark:text-white">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-xs font-medium leading-6 text-slate-500 dark:text-slate-400">
            {description}
          </p>
        ) : null}
      </div>
      <div className="text-slate-950 dark:text-white [&_.recharts-cartesian-axis-tick-value]:fill-slate-950 dark:[&_.recharts-cartesian-axis-tick-value]:fill-white [&_.recharts-legend-item-text]:!text-slate-950 dark:[&_.recharts-legend-item-text]:!text-white [&_.recharts-pie-label-text]:fill-slate-950 dark:[&_.recharts-pie-label-text]:fill-white [&_.recharts-text]:font-black">
        {children}
      </div>
    </div>
  );
};

const EmptyChart = ({ text = 'داده‌ای برای نمایش وجود ندارد.' }) => {
  return (
    <div className="flex h-[280px] items-center justify-center rounded-2xl border border-dashed border-slate-200 text-sm font-bold text-slate-500 dark:border-slate-700 dark:text-slate-400">
      {text}
    </div>
  );
};

const TableHeaderCell = ({ children }: { children: React.ReactNode }) => {
  return (
    <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-black text-slate-500 dark:text-slate-400">
      {children}
    </th>
  );
};

const TableCell = ({ children }: { children: React.ReactNode }) => {
  return (
    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
      {children}
    </td>
  );
};

type ChartTooltipProps = {
  active?: boolean;
  payload?: any[];
  label?: string;
  valueFormatter?: (value: number) => string;
  labelFormatter?: (label: string) => string;
};

const ChartTooltip = ({
  active,
  payload,
  label,
  valueFormatter = formatNumber,
  labelFormatter,
}: ChartTooltipProps) => {
  if (!active || !payload?.length) return null;

  const title = labelFormatter ? labelFormatter(String(label || '')) : label;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right shadow-xl dark:border-slate-700 dark:bg-slate-900">
      {title ? (
        <p className="mb-2 text-sm font-black text-slate-900 dark:text-white">
          {title}
        </p>
      ) : null}
      <div className="space-y-1">
        {payload.map((entry) => (
          <div
            key={`${entry.name}-${entry.dataKey}`}
            className="flex min-w-[150px] items-center justify-between gap-4 text-xs"
          >
            <span className="font-bold text-slate-500 dark:text-slate-400">
              {entry.name}
            </span>
            <span className="font-black text-slate-950 dark:text-white">
              {valueFormatter(Number(entry.value || 0))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

type ProjectStatusTreemapItem = {
  name: string;
  value: number;
  description: string;
  color: string;
  textColor: '#ffffff' | '#0f172a';
  mutedTextColor: string;
};

const ProjectStatusTreemapTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: any[];
}) => {
  if (!active || !payload?.length) return null;

  const item = payload[0]?.payload as ProjectStatusTreemapItem | undefined;

  if (!item) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right shadow-xl dark:border-slate-700 dark:bg-slate-900">
      <p className="text-sm font-black text-slate-900 dark:text-white">
        {item.name}
      </p>
      <p className="mt-2 text-xs font-bold text-slate-500 dark:text-slate-400">
        تعداد پروژه: <span className="text-slate-950 dark:text-white">{formatNumber(item.value)}</span>
      </p>
      <p className="mt-1 max-w-[240px] text-xs font-bold leading-6 text-slate-500 dark:text-slate-400">
        {item.description}
      </p>
    </div>
  );
};

const ProjectStatusTreemapContent = (props: any) => {
  const { x, y, width, height, name, value, color, textColor, mutedTextColor } = props;

  if (width < 8 || height < 8) return null;

  const showTitle = width > 72 && height > 40;
  const showValue = width > 92 && height > 62;
  const safeTextColor = textColor || '#ffffff';
  const safeMutedTextColor = mutedTextColor || safeTextColor;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={16}
        ry={16}
        fill={color || SEMANTIC_COLORS.blue}
        stroke="#ffffff"
        strokeWidth={4}
      />
      {showTitle ? (
        <text
          x={x + width - 14}
          y={y + 26}
          textAnchor="end"
          fill={safeTextColor}
          fontSize={13}
          fontWeight={900}
          direction="rtl"
        >
          {String(name || '').slice(0, 26)}
        </text>
      ) : null}
      {showValue ? (
        <>
          <text
            x={x + width - 14}
            y={y + 52}
            textAnchor="end"
            fill={safeTextColor}
            fontSize={22}
            fontWeight={900}
            direction="rtl"
          >
            {formatNumber(Number(value || 0))}
          </text>
          <text
            x={x + width - 14}
            y={y + 74}
            textAnchor="end"
            fill={safeMutedTextColor}
            fontSize={11}
            fontWeight={800}
            direction="rtl"
          >
            پروژه
          </text>
        </>
      ) : null}
    </g>
  );
};

export default function ProjectOverviewPage() {
  const [overview, setOverview] = useState<ProjectOverviewData>(emptyOverview);
  const [isLoading, setIsLoading] = useState(true);

  const loadOverview = async () => {
    try {
      setIsLoading(true);
      const data = await projectService.getProjectOverview();
      setOverview(data || emptyOverview);
    } catch (error: any) {
      toast.error(error?.message || 'خطا در دریافت نمای کلان پروژه‌ها');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const summary = overview.summary;
  const completionRate = useMemo(
    () => getCompletionRate(summary.completedProjects, summary.totalProjects),
    [summary.completedProjects, summary.totalProjects],
  );

  const projectStagePieData = overview.charts.projectsByStatus.filter(
    (item) => item.count > 0,
  );

  const totalOpenProjects = Math.max(
    summary.totalProjects - summary.completedProjects - summary.cancelledProjects,
    0,
  );

  const maxOverdueByRole = useMemo(() => {
    return Math.max(
      ...overview.charts.overdueByRole.map((item) => Number(item.overdueProjects || 0)),
      0,
    );
  }, [overview.charts.overdueByRole]);

  const maxOverdueByExpert = useMemo(() => {
    return Math.max(
      ...overview.charts.overdueByExpert.map((item) => Number(item.overdueProjects || 0)),
      0,
    );
  }, [overview.charts.overdueByExpert]);

  const maxReportVolume = useMemo(() => {
    return Math.max(
      ...overview.charts.reportVolumeByProject.map((item) =>
        Number(item.reportFilesSizeBytes || 0),
      ),
      0,
    );
  }, [overview.charts.reportVolumeByProject]);

  const projectStatusTreemapData = useMemo<ProjectStatusTreemapItem[]>(() => {
    const overdue = Number(summary.overdueProjects || 0);
    const dueSoon = Number(summary.dueSoonProjects || 0);
    const completed = Number(summary.completedProjects || 0);
    const cancelled = Number(summary.cancelledProjects || 0);
    const healthyOpen = Math.max(
      Number(summary.totalProjects || 0) - overdue - dueSoon - completed - cancelled,
      0,
    );

    return [
      {
        name: 'عقب‌افتاده',
        value: overdue,
        description: 'پروژه‌هایی که از تاریخ سررسید عبور کرده‌اند و باید با رنگ قرمز دیده شوند.',
        color: SEMANTIC_COLORS.red,
        textColor: '#ffffff' as const,
        mutedTextColor: '#fee2e2',
      },
      {
        name: 'نزدیک سررسید',
        value: dueSoon,
        description: 'پروژه‌هایی که تا ۷ روز آینده به سررسید می‌رسند و نیازمند پیگیری نزدیک هستند.',
        color: SEMANTIC_COLORS.amber,
        textColor: '#0f172a' as const,
        mutedTextColor: '#334155',
      },
      {
        name: 'در جریان سالم',
        value: healthyOpen,
        description: 'پروژه‌های باز که عقب‌افتاده یا نزدیک سررسید نیستند.',
        color: SEMANTIC_COLORS.blue,
        textColor: '#ffffff' as const,
        mutedTextColor: '#dbeafe',
      },
      {
        name: 'تکمیل‌شده',
        value: completed,
        description: 'پروژه‌هایی که به پایان رسیده‌اند و وضعیت سالم دارند.',
        color: SEMANTIC_COLORS.emerald,
        textColor: '#ffffff' as const,
        mutedTextColor: '#dcfce7',
      },
      {
        name: 'لغوشده',
        value: cancelled,
        description: 'پروژه‌هایی که از چرخه اجرا خارج شده‌اند.',
        color: SEMANTIC_COLORS.slate,
        textColor: '#ffffff' as const,
        mutedTextColor: '#e2e8f0',
      },
    ].filter((item) => item.value > 0);
  }, [
    summary.cancelledProjects,
    summary.completedProjects,
    summary.dueSoonProjects,
    summary.overdueProjects,
    summary.totalProjects,
  ]);

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
              اتاق کنترل پروژه‌ها
            </p>
            <h1 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
              نمای کلان پروژه‌ها
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500 dark:text-slate-400">
              این صفحه برای تصمیم‌گیری مدیریتی طراحی شده است: وضعیت مرحله‌ای پروژه‌ها، پروژه‌ها و وظایف عقب‌افتاده، بار کاری نقش‌ها و کارشناسان، و حجم گزارش‌های ثبت‌شده را یک‌جا نشان می‌دهد.
            </p>
            <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
              آخرین بروزرسانی: {formatDate(overview.generatedAt)}
            </p>
          </div>

          <button
            type="button"
            onClick={loadOverview}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            <ArrowPathIcon className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
            بروزرسانی نمای کلان
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="کل پروژه‌ها"
          value={summary.totalProjects}
          subtitle={`${formatNumber(totalOpenProjects)} پروژه باز / ${formatNumber(summary.completedProjects)} تکمیل‌شده`}
          icon={FolderOpenIcon}
          tone="blue"
        />
        <MetricCard
          title="پروژه‌های عقب‌افتاده"
          value={summary.overdueProjects}
          subtitle={`${formatNumber(summary.dueSoonProjects)} پروژه در ۷ روز آینده سررسید دارد`}
          icon={ExclamationTriangleIcon}
          tone={summary.overdueProjects > 0 ? 'rose' : 'emerald'}
        />
        <MetricCard
          title="وظایف عقب‌افتاده"
          value={summary.overdueTasks}
          subtitle={`${formatNumber(summary.blockedTasks)} وظیفه مسدود / ${formatNumber(summary.doneTasks)} انجام‌شده`}
          icon={ClockIcon}
          tone={summary.overdueTasks > 0 ? 'amber' : 'emerald'}
        />
        <MetricCard
          title="حجم گزارش‌ها"
          value={formatBytes(summary.reportFilesSizeBytes)}
          subtitle={`${formatNumber(summary.reportFilesCount)} فایل گزارش ثبت شده است`}
          icon={DocumentChartBarIcon}
          tone="slate"
        />
      </div>

      <div className="rounded-3xl border border-r-4 border-r-slate-400 border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center gap-2">
          <ChartBarIcon className="h-5 w-5 text-blue-500" />
          <h2 className="text-base font-black text-slate-950 dark:text-white">
            بار کاری نقش‌ها و حجم گزارش‌ها
          </h2>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-950">
                <tr>
                  <TableHeaderCell>نقش</TableHeaderCell>
                  <TableHeaderCell>کل پروژه</TableHeaderCell>
                  <TableHeaderCell>فعال</TableHeaderCell>
                  <TableHeaderCell>عقب‌افتاده</TableHeaderCell>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {overview.tables.roleWorkload.slice(0, 10).map((role: ProjectOverviewRoleWorkload) => (
                  <tr key={role.id || role.title} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <TableCell>{role.title}</TableCell>
                    <TableCell>{formatNumber(role.totalProjects)}</TableCell>
                    <TableCell>{formatNumber(role.activeProjects)}</TableCell>
                    <TableCell>
                      <span
                        className={
                          role.overdueProjects > 0
                            ? 'rounded-full bg-rose-100 px-3 py-1 text-xs font-black text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                            : 'rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        }
                      >
                        {formatNumber(role.overdueProjects)}
                      </span>
                    </TableCell>
                  </tr>
                ))}
                {!overview.tables.roleWorkload.length ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                      هنوز نقش پروژه‌ای برای اعضا ثبت نشده است.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-950">
                <tr>
                  <TableHeaderCell>پروژه</TableHeaderCell>
                  <TableHeaderCell>تعداد گزارش</TableHeaderCell>
                  <TableHeaderCell>حجم گزارش</TableHeaderCell>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {overview.charts.reportVolumeByProject.map((project: ProjectOverviewReportVolume) => (
                  <tr key={project.projectId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <TableCell>{project.projectTitle}</TableCell>
                    <TableCell>{formatNumber(project.reportFilesCount)}</TableCell>
                    <TableCell>
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        {formatBytes(project.reportFilesSizeBytes)}
                      </span>
                    </TableCell>
                  </tr>
                ))}
                {!overview.charts.reportVolumeByProject.length ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                      هنوز گزارش فایل‌دار ثبت نشده است.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ChartCard
        title="Bundle Size Treemap | وضعیت پروژه‌ها"
        description="اندازه هر خانه تعداد پروژه‌های همان وضعیت را نشان می‌دهد. قرمز یعنی عقب‌افتاده، زرد یعنی نزدیک سررسید، آبی یعنی در جریان سالم، سبز یعنی تکمیل‌شده."
        accent="rose"
      >
        {projectStatusTreemapData.length ? (
          <div className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <Treemap
                data={projectStatusTreemapData}
                dataKey="value"
                nameKey="name"
                aspectRatio={4 / 3}
                stroke="#fff"
                content={<ProjectStatusTreemapContent />}
              >
                <Tooltip content={<ProjectStatusTreemapTooltip />} />
              </Treemap>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart text="هنوز پروژه‌ای برای نمایش وضعیت ثبت نشده است." />
        )}
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <ChartCard
          title="مرحله پروژه‌ها"
          description={`نرخ تکمیل کل پروژه‌ها: ${formatNumber(completionRate)}٪. سبز یعنی تکمیل‌شده، آبی یعنی فعال، زرد یعنی توقف/مسدود، قرمز یعنی لغو یا ریسک.`}
          accent="emerald"
        >
          {projectStagePieData.length ? (
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={projectStagePieData}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={112}
                    paddingAngle={3}
                    labelLine={false}
                    label={(props: any) => {
                      const label = props.label || props.name;
                      const value = Number(props.count || props.value || 0);

                      return `${label}: ${formatNumber(value)}`;
                    }}
                  >
                    {projectStagePieData.map((entry, index) => (
                      <Cell
                        key={`stage-${index}`}
                        fill={getStatusColor(entry, index)}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={
                      <ChartTooltip
                        valueFormatter={(value) => `${formatNumber(value)} پروژه`}
                      />
                    }
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{
                      fontSize: 12,
                      fontWeight: 800,
                      paddingTop: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        <ChartCard
          title="اولویت پروژه‌ها"
          description="قرمز یعنی بحرانی، نارنجی یعنی اولویت بالا، آبی یعنی متوسط، سبز یعنی کم‌ریسک."
          accent="amber"
        >
          {overview.charts.projectsByPriority.length ? (
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={overview.charts.projectsByPriority}
                  layout="vertical"
                  margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                >
                  <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={AXIS_TICK_STYLE} />
                  <YAxis
                    dataKey="label"
                    type="category"
                    width={105}
                    tick={AXIS_TICK_STYLE}
                  />
                  <Tooltip
                    content={
                      <ChartTooltip
                        valueFormatter={(value) => `${formatNumber(value)} پروژه`}
                      />
                    }
                  />
                  <Bar dataKey="count" name="تعداد پروژه" radius={[10, 10, 10, 10]}>
                    {overview.charts.projectsByPriority.map((entry, index) => (
                      <Cell
                        key={`priority-${index}`}
                        fill={getPriorityColor(entry, index)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="وضعیت وظایف"
          description="آبی تعداد کل وظایف را نشان می‌دهد. قرمز همان وظایف عقب‌افتاده در هر وضعیت است."
          accent="rose"
        >
          {overview.charts.tasksByStatus.length ? (
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={overview.charts.tasksByStatus}
                  margin={{ top: 10, right: 8, left: 8, bottom: 8 }}
                >
                  <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={AXIS_TICK_STYLE}
                    interval={0}
                    minTickGap={8}
                  />
                  <YAxis allowDecimals={false} tick={AXIS_TICK_STYLE} />
                  <Tooltip
                    content={
                      <ChartTooltip
                        valueFormatter={(value) => `${formatNumber(value)} وظیفه`}
                      />
                    }
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  />
                  <Bar
                    dataKey="count"
                    name="کل وظایف"
                    fill={SEMANTIC_COLORS.blue}
                    radius={[8, 8, 0, 0]}
                  />
                  <Bar
                    dataKey="overdue"
                    name="عقب‌افتاده"
                    fill={SEMANTIC_COLORS.red}
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        <ChartCard
          title="ریسک عقب‌افتادگی بر اساس نقش"
          description="قرمز پررنگ‌تر یعنی آن نقش پروژه‌های عقب‌افتاده بیشتری دارد."
          accent="rose"
        >
          {overview.charts.overdueByRole.length ? (
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={overview.charts.overdueByRole}
                  layout="vertical"
                  margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                >
                  <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={AXIS_TICK_STYLE} />
                  <YAxis
                    dataKey="title"
                    type="category"
                    width={135}
                    tick={AXIS_TICK_STYLE}
                  />
                  <Tooltip
                    content={
                      <ChartTooltip
                        valueFormatter={(value) => `${formatNumber(value)} پروژه عقب‌افتاده`}
                      />
                    }
                  />
                  <Bar dataKey="overdueProjects" name="پروژه عقب‌افتاده" radius={[10, 10, 10, 10]}>
                    {overview.charts.overdueByRole.map((entry, index) => (
                      <Cell
                        key={`role-overdue-${index}`}
                        fill={getSeverityColor(Number(entry.overdueProjects || 0), maxOverdueByRole)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart text="برای نقش‌ها عقب‌افتادگی ثبت نشده است." />
          )}
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="ریسک عقب‌افتادگی بر اساس کارشناس"
          description="قرمز پررنگ‌تر یعنی کارشناس پروژه‌های عقب‌افتاده بیشتری در مسئولیت خود دارد."
          accent="rose"
        >
          {overview.charts.overdueByExpert.length ? (
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={overview.charts.overdueByExpert}
                  layout="vertical"
                  margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                >
                  <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={AXIS_TICK_STYLE} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={135}
                    tick={AXIS_TICK_STYLE}
                  />
                  <Tooltip
                    content={
                      <ChartTooltip
                        valueFormatter={(value) => `${formatNumber(value)} پروژه عقب‌افتاده`}
                      />
                    }
                  />
                  <Bar dataKey="overdueProjects" name="پروژه عقب‌افتاده" radius={[10, 10, 10, 10]}>
                    {overview.charts.overdueByExpert.map((entry, index) => (
                      <Cell
                        key={`expert-overdue-${index}`}
                        fill={getSeverityColor(Number(entry.overdueProjects || 0), maxOverdueByExpert)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart text="برای کارشناسان عقب‌افتادگی ثبت نشده است." />
          )}
        </ChartCard>

        <ChartCard
          title="حجم گزارش‌ها بر اساس پروژه"
          description="آبی پررنگ‌تر یعنی آن پروژه گزارش‌ها یا فایل‌های ثبت‌شده حجیم‌تری دارد."
          accent="blue"
        >
          {overview.charts.reportVolumeByProject.length ? (
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={overview.charts.reportVolumeByProject}
                  layout="vertical"
                  margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                >
                  <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={AXIS_TICK_STYLE}
                    tickFormatter={(value) => formatBytes(Number(value))}
                  />
                  <YAxis
                    dataKey="projectTitle"
                    type="category"
                    width={145}
                    tick={AXIS_TICK_STYLE}
                  />
                  <Tooltip content={<ChartTooltip valueFormatter={formatBytes} />} />
                  <Bar dataKey="reportFilesSizeBytes" name="حجم گزارش" radius={[10, 10, 10, 10]}>
                    {overview.charts.reportVolumeByProject.map((entry, index) => (
                      <Cell
                        key={`report-volume-${index}`}
                        fill={getBundleColor(Number(entry.reportFilesSizeBytes || 0), maxReportVolume)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart text="هنوز فایل گزارش ثبت نشده است." />
          )}
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-3xl border border-r-4 border-r-rose-500 border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-rose-500" />
            <h2 className="text-base font-black text-slate-950 dark:text-white">
              پروژه‌های عقب‌افتاده
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-950">
                <tr>
                  <TableHeaderCell>پروژه</TableHeaderCell>
                  <TableHeaderCell>مرحله</TableHeaderCell>
                  <TableHeaderCell>سررسید</TableHeaderCell>
                  <TableHeaderCell>تاخیر</TableHeaderCell>
                  <TableHeaderCell>مسئول</TableHeaderCell>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {overview.tables.overdueProjects.length ? (
                  overview.tables.overdueProjects.map((project: ProjectOverviewOverdueProject) => (
                    <tr key={project.id} className="hover:bg-rose-50/50 dark:hover:bg-rose-950/20">
                      <TableCell>{project.title}</TableCell>
                      <TableCell>{project.statusLabel}</TableCell>
                      <TableCell>{formatDate(project.dueDate)}</TableCell>
                      <TableCell>
                        <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-black text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                          {formatNumber(project.daysOverdue)} روز
                        </span>
                      </TableCell>
                      <TableCell>{project.ownerName}</TableCell>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                      پروژه عقب‌افتاده‌ای وجود ندارد.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-3xl border border-r-4 border-r-blue-500 border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center gap-2">
            <UserGroupIcon className="h-5 w-5 text-blue-500" />
            <h2 className="text-base font-black text-slate-950 dark:text-white">
              بار کاری کارشناسان
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-950">
                <tr>
                  <TableHeaderCell>کارشناس</TableHeaderCell>
                  <TableHeaderCell>پروژه فعال</TableHeaderCell>
                  <TableHeaderCell>عقب‌افتاده</TableHeaderCell>
                  <TableHeaderCell>نقش‌ها</TableHeaderCell>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {overview.tables.expertWorkload.length ? (
                  overview.tables.expertWorkload.slice(0, 10).map((expert: ProjectOverviewExpertWorkload) => (
                    <tr key={expert.id || expert.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <TableCell>{expert.name}</TableCell>
                      <TableCell>{formatNumber(expert.activeProjects)}</TableCell>
                      <TableCell>
                        <span
                          className={
                            expert.overdueProjects > 0
                              ? 'rounded-full bg-rose-100 px-3 py-1 text-xs font-black text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                              : 'rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          }
                        >
                          {formatNumber(expert.overdueProjects)}
                        </span>
                      </TableCell>
                      <TableCell>{expert.roles?.join('، ') || '—'}</TableCell>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                      هنوز عضوی برای پروژه‌ها ثبت نشده است.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}