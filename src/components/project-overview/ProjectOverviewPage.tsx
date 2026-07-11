// src/components/project-overview/ProjectOverviewPage.tsx

import { useEffect, useMemo, useState } from 'react';
import type { ElementType, ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowPathIcon,
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
  ProjectOverviewRoleWorkload,
  projectService,
} from '@/services/project.service';

const COLORS = {
  blue: '#2563eb',
  sky: '#0284c7',
  violet: '#7c3aed',
  emerald: '#16a34a',
  amber: '#f59e0b',
  orange: '#f97316',
  rose: '#e11d48',
  red: '#dc2626',
  slate: '#64748b',
  gray: '#94a3b8',
};

const PALETTE = [
  COLORS.blue,
  COLORS.violet,
  COLORS.sky,
  COLORS.emerald,
  COLORS.amber,
  COLORS.orange,
  COLORS.rose,
  COLORS.slate,
];

const AXIS_TICK_STYLE = {
  fill: 'var(--app-base-content)',
  fontSize: 12,
  fontWeight: 800,
};

const GRID_STROKE = 'var(--app-border-soft)';

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

const getStatusColor = (item: any, index: number): string => {
  const source = `${item?.status || item?.key || item?.label || ''}`.toLowerCase();

  if (
    source.includes('completed') ||
    source.includes('done') ||
    source.includes('تکمیل') ||
    source.includes('انجام')
  ) {
    return COLORS.emerald;
  }

  if (
    source.includes('active') ||
    source.includes('progress') ||
    source.includes('فعال') ||
    source.includes('جاری')
  ) {
    return COLORS.blue;
  }

  if (
    source.includes('hold') ||
    source.includes('blocked') ||
    source.includes('مسدود') ||
    source.includes('متوقف') ||
    source.includes('تعلیق')
  ) {
    return COLORS.amber;
  }

  if (
    source.includes('cancel') ||
    source.includes('overdue') ||
    source.includes('لغو') ||
    source.includes('عقب')
  ) {
    return COLORS.red;
  }

  return PALETTE[index % PALETTE.length];
};

const getPriorityColor = (item: any, index: number): string => {
  const source = `${item?.priority || item?.key || item?.label || ''}`.toLowerCase();

  if (source.includes('critical') || source.includes('بحرانی')) return COLORS.red;
  if (source.includes('high') || source.includes('زیاد') || source.includes('بالا')) return COLORS.orange;
  if (source.includes('medium') || source.includes('متوسط')) return COLORS.blue;
  if (source.includes('low') || source.includes('کم')) return COLORS.emerald;

  return PALETTE[index % PALETTE.length];
};

const getSeverityColor = (value: number, maxValue: number): string => {
  if (value <= 0) return COLORS.emerald;
  if (maxValue <= 1) return COLORS.red;

  const ratio = value / maxValue;

  if (ratio >= 0.75) return '#b91c1c';
  if (ratio >= 0.5) return '#dc2626';
  if (ratio >= 0.25) return '#f97316';

  return '#f59e0b';
};


type MetricCardProps = {
  title: string;
  value: string | number;
  subtitle: string;
  icon: ElementType;
  tone?: 'blue' | 'emerald' | 'amber' | 'rose' | 'slate' | 'violet';
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
  violet:
    'bg-violet-50 text-violet-700 ring-violet-100 dark:bg-violet-950/50 dark:text-violet-300 dark:ring-violet-900',
};

const MetricCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  tone = 'blue',
}: MetricCardProps) => {
  return (
    <div className="avid-glass-surface rounded-3xl p-5 transition hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-black text-base-content/60">
            {title}
          </p>
          <p className="mt-3 text-3xl font-black text-base-content">
            {typeof value === 'number' ? formatNumber(value) : value}
          </p>
          <p className="mt-2 text-xs leading-6 text-base-content/60">
            {subtitle}
          </p>
        </div>
        <div className={`shrink-0 rounded-2xl p-3 ring-1 ${toneClasses[tone]}`}>
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
    <section
      className={`avid-glass-surface rounded-3xl border-r-4 p-5 ${chartAccentClasses[accent]}`}
    >
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
      <div className="text-base-content [&_.recharts-cartesian-axis-tick-value]:fill-[var(--app-base-content)] [&_.recharts-legend-item-text]:!text-[var(--app-base-content)] [&_.recharts-pie-label-text]:fill-[var(--app-base-content)] [&_.recharts-text]:font-black">
        {children}
      </div>
    </section>
  );
};

const EmptyChart = ({ text = 'داده‌ای برای نمایش وجود ندارد.' }) => {
  return (
    <div className="flex h-[280px] items-center justify-center rounded-2xl border border-dashed border-base-300 text-sm font-bold text-base-content/55">
      {text}
    </div>
  );
};

const TableHeaderCell = ({ children }: { children: ReactNode }) => {
  return (
    <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-black text-base-content/60">
      {children}
    </th>
  );
};

const TableCell = ({ children }: { children: ReactNode }) => {
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
    <div className="avid-glass-surface rounded-2xl px-4 py-3 text-right">
      {title ? (
        <p className="mb-2 text-sm font-black text-base-content">
          {title}
        </p>
      ) : null}
      <div className="space-y-1">
        {payload.map((entry) => (
          <div
            key={`${entry.name}-${entry.dataKey}`}
            className="flex min-w-[150px] items-center justify-between gap-4 text-xs"
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

type ProjectHealthTreemapItem = {
  name: string;
  value: number;
  description: string;
  color: string;
  textColor: '#ffffff' | '#0f172a';
  mutedTextColor: string;
};

const ProjectHealthTreemapTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: any[];
}) => {
  if (!active || !payload?.length) return null;

  const item = payload[0]?.payload as ProjectHealthTreemapItem | undefined;

  if (!item) return null;

  return (
    <div className="avid-glass-surface rounded-2xl px-4 py-3 text-right">
      <p className="text-sm font-black text-base-content">
        {item.name}
      </p>
      <p className="mt-2 text-xs font-bold text-base-content/60">
        تعداد پروژه:{' '}
        <span className="text-base-content">
          {formatNumber(item.value)}
        </span>
      </p>
      <p className="mt-1 max-w-[260px] text-xs font-bold leading-6 text-base-content/60">
        {item.description}
      </p>
    </div>
  );
};

const ProjectHealthTreemapContent = (props: any) => {
  const { x, y, width, height, name, value, color, textColor, mutedTextColor } = props;

  if (width < 8 || height < 8) return null;

  const showTitle = width > 70 && height > 38;
  const showValue = width > 96 && height > 64;
  const safeTextColor = textColor || '#ffffff';
  const safeMutedTextColor = mutedTextColor || safeTextColor;
  const clipId = `project-health-map-${Math.round(x)}-${Math.round(y)}-${Math.round(width)}-${Math.round(height)}`;
  const maxTitleChars = Math.max(4, Math.floor((width - 28) / 8));
  const safeName = String(name || 'نامشخص');
  const visibleName = safeName.length > maxTitleChars ? `${safeName.slice(0, maxTitleChars - 1)}…` : safeName;

  return (
    <g dir="rtl">
      <defs>
        <clipPath id={clipId}>
          <rect
            x={x + 4}
            y={y + 4}
            width={Math.max(width - 8, 0)}
            height={Math.max(height - 8, 0)}
            rx={14}
            ry={14}
          />
        </clipPath>
      </defs>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={16}
        ry={16}
        fill={color || COLORS.blue}
        stroke="var(--app-base-100)"
        strokeWidth={3}
      />
      <g clipPath={`url(#${clipId})`}>
        {showTitle ? (
          <text
            x={x + width - 14}
            y={y + 24}
            textAnchor="end"
            direction="rtl"
            unicodeBidi="plaintext"
            fill={safeTextColor}
            fontSize={13}
            fontWeight={900}
          >
            {visibleName}
          </text>
        ) : null}
        {showValue ? (
          <text
            x={x + width - 14}
            y={y + 52}
            textAnchor="end"
            direction="rtl"
            unicodeBidi="plaintext"
            fill={safeTextColor}
            fontSize={24}
            fontWeight={900}
          >
            {formatNumber(Number(value || 0))}
          </text>
        ) : null}
        {showValue ? (
          <text
            x={x + width - 14}
            y={y + 74}
            textAnchor="end"
            direction="rtl"
            unicodeBidi="plaintext"
            fill={safeMutedTextColor}
            fontSize={11}
            fontWeight={800}
          >
            پروژه
          </text>
        ) : null}
      </g>
    </g>
  );
};


const topItems = <T,>(items: T[], limit = 8): T[] => {
  return items.slice(0, limit);
};

const ProjectOverviewPage = () => {
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

  const totalOpenProjects = Math.max(
    summary.totalProjects - summary.completedProjects - summary.cancelledProjects,
    0,
  );

  const projectStagePieData = useMemo(() => {
    return overview.charts.projectsByStatus.filter((item) => item.count > 0);
  }, [overview.charts.projectsByStatus]);

  const projectPriorityData = useMemo(() => {
    return overview.charts.projectsByPriority.filter((item) => item.count > 0);
  }, [overview.charts.projectsByPriority]);

  const taskStatusData = useMemo(() => {
    return overview.charts.tasksByStatus.filter(
      (item) => item.count > 0 || Number(item.overdue || 0) > 0,
    );
  }, [overview.charts.tasksByStatus]);

  const roleRiskData = useMemo(() => {
    return topItems(
      [...overview.charts.overdueByRole].sort(
        (first, second) => second.overdueProjects - first.overdueProjects,
      ),
    );
  }, [overview.charts.overdueByRole]);

  const expertRiskData = useMemo(() => {
    return topItems(
      [...overview.charts.overdueByExpert].sort(
        (first, second) => second.overdueProjects - first.overdueProjects,
      ),
    );
  }, [overview.charts.overdueByExpert]);


  const maxOverdueByRole = useMemo(() => {
    return Math.max(...roleRiskData.map((item) => Number(item.overdueProjects || 0)), 0);
  }, [roleRiskData]);

  const maxOverdueByExpert = useMemo(() => {
    return Math.max(...expertRiskData.map((item) => Number(item.overdueProjects || 0)), 0);
  }, [expertRiskData]);


  const projectHealthTreemapData = useMemo<ProjectHealthTreemapItem[]>(() => {
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
        name: 'بک‌لاگ بحرانی',
        value: overdue,
        description: 'پروژه‌هایی که به‌دلیل عقب‌افتادگی در گروه بک‌لاگ بحرانی قرار می‌گیرند.',
        color: COLORS.red,
        textColor: '#ffffff' as const,
        mutedTextColor: '#fee2e2',
      },
      {
        name: 'بک‌لاگ روبه‌افزایش',
        value: dueSoon,
        description: 'پروژه‌هایی که به‌دلیل نزدیکی سررسید باید از نظر بک‌لاگ کنترل شوند.',
        color: COLORS.amber,
        textColor: '#0f172a' as const,
        mutedTextColor: '#334155',
      },
      {
        name: 'بک‌لاگ کنترل‌شده',
        value: healthyOpen,
        description: 'پروژه‌های باز که در سطح فعلی نیازمند اقدام فوری بک‌لاگ نیستند.',
        color: COLORS.blue,
        textColor: '#ffffff' as const,
        mutedTextColor: '#dbeafe',
      },
      {
        name: 'تکمیل‌شده',
        value: completed,
        description: 'پروژه‌هایی که به پایان رسیده‌اند.',
        color: COLORS.emerald,
        textColor: '#ffffff' as const,
        mutedTextColor: '#dcfce7',
      },
      {
        name: 'لغوشده',
        value: cancelled,
        description: 'پروژه‌هایی که از چرخه اجرا خارج شده‌اند.',
        color: COLORS.slate,
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
      <section className="rounded-3xl border border-base-300 bg-base-100 p-5 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">
              نمای کلان پروژه‌ها
            </p>
            <h1 className="mt-3 text-2xl font-black text-base-content">
              تحلیل پورتفو، ریسک و ظرفیت اجرا
            </h1>
            <p className="mt-2 max-w-4xl text-sm leading-7 text-base-content/60">
              این صفحه فقط تحلیل‌های تجمیعی پروژه‌ها را نمایش می‌دهد. نمودارهای فعالیت روزانه در داشبورد اصلی و نمودارهای اختصاصی هر پروژه در صفحه جزئیات همان پروژه قرار گرفته‌اند تا اطلاعات تکراری نشوند.
            </p>
            <p className="mt-3 text-xs text-base-content/45">
              آخرین بروزرسانی: {formatDate(overview.generatedAt)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard" className="btn btn-outline">
              داشبورد عملیاتی
            </Link>
            <Link href="/dashboard/project-charts" className="btn btn-primary">
              نمودارهای مدیریتی پروژه‌ها
            </Link>
            <Link href="/dashboard/projects" className="btn btn-outline">
              لیست پروژه‌ها
            </Link>
            <button
              type="button"
              onClick={loadOverview}
              disabled={isLoading}
              className="btn btn-primary"
            >
              <ArrowPathIcon className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
              بروزرسانی
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <ChartCard
          title="نقشه وضعیت بک‌لاگ پروژه‌ها"
          description="اندازه هر خانه تعداد پروژه‌های همان گروه بک‌لاگ را نشان می‌دهد. قرمز یعنی بک‌لاگ بحرانی، زرد یعنی بک‌لاگ روبه‌افزایش و آبی یعنی بک‌لاگ کنترل‌شده."
          accent="rose"
        >
          {projectHealthTreemapData.length ? (
            <div className="h-[380px]">
              <ResponsiveContainer width="100%" height="100%">
                <Treemap
                  data={projectHealthTreemapData}
                  dataKey="value"
                  nameKey="name"
                  aspectRatio={4 / 3}
                  stroke="#fff"
                  content={<ProjectHealthTreemapContent />}
                >
                  <Tooltip content={<ProjectHealthTreemapTooltip />} />
                </Treemap>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart text="هنوز پروژه‌ای برای نمایش وضعیت ثبت نشده است." />
          )}
        </ChartCard>

        <ChartCard
          title="ترکیب مرحله اجرایی پروژه‌ها"
          description={`نرخ تکمیل کل پروژه‌ها: ${formatNumber(completionRate)}٪.`}
          accent="emerald"
        >
          {projectStagePieData.length ? (
            <div className="h-[380px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={projectStagePieData}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={74}
                    outerRadius={118}
                    paddingAngle={3}
                    labelLine={false}
                    label={(props: any) => {
                      const label = props.label || props.name;
                      const value = Number(props.count || props.value || 0);

                      return `${label}: ${formatNumber(value)}`;
                    }}
                  >
                    {projectStagePieData.map((entry, index) => (
                      <Cell key={`stage-${index}`} fill={getStatusColor(entry, index)} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={
                      <ChartTooltip
                        valueFormatter={(value) => `${formatNumber(value)} پروژه`}
                      />
                    }
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12, fontWeight: 800 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="اولویت پروژه‌ها"
          description="نمای پورتفویی از ریسک ثبت‌شده برای پروژه‌ها."
          accent="amber"
        >
          {projectPriorityData.length ? (
            <div className="h-[320px]" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectPriorityData} margin={{ top: 10, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={AXIS_TICK_STYLE} interval={0} />
                  <YAxis allowDecimals={false} tick={AXIS_TICK_STYLE} />
                  <Tooltip
                    content={
                      <ChartTooltip
                        valueFormatter={(value) => `${formatNumber(value)} پروژه`}
                      />
                    }
                  />
                  <Bar dataKey="count" name="تعداد پروژه" radius={[10, 10, 0, 0]}>
                    {projectPriorityData.map((entry, index) => (
                      <Cell key={`priority-${index}`} fill={getPriorityColor(entry, index)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        <ChartCard
          title="وضعیت وظایف کل پروژه‌ها"
          description="آبی تعداد کل وظایف و قرمز وظایف عقب‌افتاده در همان وضعیت را نشان می‌دهد."
          accent="violet"
        >
          {taskStatusData.length ? (
            <div className="h-[320px]" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={taskStatusData} margin={{ top: 10, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={AXIS_TICK_STYLE} interval={0} minTickGap={8} />
                  <YAxis allowDecimals={false} tick={AXIS_TICK_STYLE} />
                  <Tooltip
                    content={
                      <ChartTooltip
                        valueFormatter={(value) => `${formatNumber(value)} وظیفه`}
                      />
                    }
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12, fontWeight: 800 }} />
                  <Bar dataKey="count" name="کل وظایف" fill={COLORS.blue} radius={[8, 8, 0, 0]} />
                  <Bar dataKey="overdue" name="عقب‌افتاده" fill={COLORS.red} radius={[8, 8, 0, 0]} />
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
          title="ریسک عقب‌افتادگی بر اساس نقش"
          description="برای تشخیص اینکه کدام نقش بیشترین فشار پیگیری دارد."
          accent="rose"
        >
          {roleRiskData.length ? (
            <div className="h-[340px]" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={roleRiskData} layout="vertical" margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={AXIS_TICK_STYLE} />
                  <YAxis dataKey="title" type="category" width={145} tick={AXIS_TICK_STYLE} />
                  <Tooltip
                    content={
                      <ChartTooltip
                        valueFormatter={(value) => `${formatNumber(value)} پروژه عقب‌افتاده`}
                      />
                    }
                  />
                  <Bar dataKey="overdueProjects" name="پروژه عقب‌افتاده" radius={[10, 10, 10, 10]}>
                    {roleRiskData.map((entry, index) => (
                      <Cell key={`role-risk-${index}`} fill={getSeverityColor(Number(entry.overdueProjects || 0), maxOverdueByRole)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart text="برای نقش‌ها عقب‌افتادگی ثبت نشده است." />
          )}
        </ChartCard>

        <ChartCard
          title="ریسک عقب‌افتادگی بر اساس کارشناس"
          description="برای تشخیص کارشناسانی که پروژه‌های نیازمند پیگیری بیشتری دارند."
          accent="rose"
        >
          {expertRiskData.length ? (
            <div className="h-[340px]" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={expertRiskData} layout="vertical" margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={AXIS_TICK_STYLE} />
                  <YAxis dataKey="name" type="category" width={145} tick={AXIS_TICK_STYLE} />
                  <Tooltip
                    content={
                      <ChartTooltip
                        valueFormatter={(value) => `${formatNumber(value)} پروژه عقب‌افتاده`}
                      />
                    }
                  />
                  <Bar dataKey="overdueProjects" name="پروژه عقب‌افتاده" radius={[10, 10, 10, 10]}>
                    {expertRiskData.map((entry, index) => (
                      <Cell key={`expert-risk-${index}`} fill={getSeverityColor(Number(entry.overdueProjects || 0), maxOverdueByExpert)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart text="برای کارشناسان عقب‌افتادگی ثبت نشده است." />
          )}
        </ChartCard>
      </section>

      <section className="rounded-3xl border border-r-4 border-r-rose-500 border-base-300 bg-base-100 p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-base font-black text-base-content">
              پروژه‌های عقب‌افتاده
            </h2>
            <p className="mt-1 text-xs leading-6 text-base-content/60">
              این جدول فقط وضعیت پیگیری پروژه‌های عقب‌افتاده را نشان می‌دهد. نمودارهای مقایسه‌ای پروژه‌محور در صفحه «نمودارهای مدیریتی پروژه‌ها» قرار دارد تا این صفحه تکراری نشود.
            </p>
          </div>
          <Link href="/dashboard/project-charts" className="btn btn-outline btn-sm">
            مشاهده نمودارهای پروژه‌محور
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-950">
              <tr>
                <TableHeaderCell>پروژه</TableHeaderCell>
                <TableHeaderCell>وضعیت</TableHeaderCell>
                <TableHeaderCell>سررسید</TableHeaderCell>
                <TableHeaderCell>تاخیر</TableHeaderCell>
                <TableHeaderCell>مسئول</TableHeaderCell>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {overview.tables.overdueProjects.length ? (
                overview.tables.overdueProjects.map((project: ProjectOverviewOverdueProject) => (
                  <tr key={project.id} className="hover:bg-rose-50/50 dark:hover:bg-rose-950/20">
                    <TableCell>
                      <Link href={`/dashboard/projects/${project.id}`} className="font-black text-blue-700 hover:underline dark:text-blue-300">
                        {project.title}
                      </Link>
                    </TableCell>
                    <TableCell>{project.statusLabel}</TableCell>
                    <TableCell>{formatDate(project.dueDate)}</TableCell>
                    <TableCell>
                      <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-black text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                        {formatNumber(project.daysOverdue)} روز
                      </span>
                    </TableCell>
                    <TableCell>{project.ownerName || '—'}</TableCell>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-base-content/60">
                    پروژه عقب‌افتاده‌ای ثبت نشده است.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-3xl border border-base-300 bg-base-100 p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <UserGroupIcon className="h-5 w-5 text-blue-500" />
            <h2 className="text-base font-black text-base-content">
              جدول بار کاری نقش‌ها
            </h2>
          </div>
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
                {overview.tables.roleWorkload.length ? (
                  overview.tables.roleWorkload.slice(0, 10).map((role: ProjectOverviewRoleWorkload) => (
                    <tr key={role.id || role.title} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <TableCell>{role.title}</TableCell>
                      <TableCell>{formatNumber(role.totalProjects)}</TableCell>
                      <TableCell>{formatNumber(role.activeProjects)}</TableCell>
                      <TableCell>{formatNumber(role.overdueProjects)}</TableCell>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-base-content/60">
                      هنوز نقش پروژه‌ای برای اعضا ثبت نشده است.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-base-300 bg-base-100 p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <UserGroupIcon className="h-5 w-5 text-violet-500" />
            <h2 className="text-base font-black text-base-content">
              جدول بار کاری کارشناسان
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-950">
                <tr>
                  <TableHeaderCell>کارشناس</TableHeaderCell>
                  <TableHeaderCell>کل پروژه</TableHeaderCell>
                  <TableHeaderCell>فعال</TableHeaderCell>
                  <TableHeaderCell>عقب‌افتاده</TableHeaderCell>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {overview.tables.expertWorkload.length ? (
                  overview.tables.expertWorkload.slice(0, 10).map((expert: ProjectOverviewExpertWorkload) => (
                    <tr key={expert.id || expert.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <TableCell>{expert.name}</TableCell>
                      <TableCell>{formatNumber(expert.totalProjects)}</TableCell>
                      <TableCell>{formatNumber(expert.activeProjects)}</TableCell>
                      <TableCell>{formatNumber(expert.overdueProjects)}</TableCell>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-base-content/60">
                      هنوز کارشناس پروژه‌ای برای نمایش وجود ندارد.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </div>
  );
};

export default ProjectOverviewPage;
