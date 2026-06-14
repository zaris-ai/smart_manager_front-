import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowPathIcon,
  ArrowTrendingUpIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  FolderIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { dashboardService } from '@/services/dashboard.service';
import {
  DashboardCountItem,
  DashboardRecentActivity,
  DashboardSummary,
} from '@/types/dashboard';

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('fa-IR').format(value || 0);
};

const formatPercent = (value: number): string => {
  return `${formatNumber(value || 0)}٪`;
};

const formatDateTime = (value?: string): string => {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('fa-IR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const getActivityIcon = (type: DashboardRecentActivity['type']) => {
  switch (type) {
    case 'project':
      return FolderIcon;
    case 'task':
      return ClipboardDocumentCheckIcon;
    case 'note':
      return DocumentTextIcon;
    case 'file':
      return DocumentTextIcon;
    default:
      return ChartBarIcon;
  }
};

const getTopCountItems = (items: DashboardCountItem[], limit = 6) => {
  return [...items]
    .sort((first, second) => second.count - first.count)
    .slice(0, limit);
};

const createStatCards = (summary: DashboardSummary) => {
  const isManager = summary.scope === 'manager';

  return [
    {
      title: isManager ? 'کاربران فعال' : 'حساب کاربری',
      value: formatNumber(summary.stats.activeUsers),
      description: isManager
        ? `از ${formatNumber(summary.stats.totalUsers)} کاربر ثبت‌شده`
        : 'نمایش داده‌های مربوط به کاربر جاری',
      icon: UserGroupIcon,
      badge: isManager ? 'مدیریتی' : 'شخصی',
    },
    {
      title: 'پروژه‌های فعال',
      value: formatNumber(summary.stats.activeProjects),
      description: `کل پروژه‌ها: ${formatNumber(summary.stats.totalProjects)}`,
      icon: FolderIcon,
      badge: 'پروژه',
    },
    {
      title: 'کارهای باز',
      value: formatNumber(summary.stats.openTasks),
      description: `موعد امروز: ${formatNumber(summary.stats.dueTodayTasks)}`,
      icon: ClockIcon,
      badge: 'وظیفه',
    },
    {
      title: 'کارهای عقب‌افتاده',
      value: formatNumber(summary.stats.overdueTasks),
      description:
        summary.stats.overdueTasks > 0
          ? 'نیازمند پیگیری فوری'
          : 'مورد عقب‌افتاده‌ای ثبت نشده است',
      icon: ExclamationTriangleIcon,
      badge: 'ریسک',
    },
    {
      title: 'گزارش امروز',
      value: formatNumber(summary.stats.workLogsToday),
      description: `گزارش‌های دیروز: ${formatNumber(
        summary.stats.workLogsYesterday,
      )}`,
      icon: DocumentTextIcon,
      badge: 'گزارش',
    },
    {
      title: 'نرخ تکمیل وظایف',
      value: formatPercent(summary.stats.completionRate),
      description: `وظایف انجام‌شده: ${formatNumber(
        summary.stats.completedTasks,
      )}`,
      icon: ArrowTrendingUpIcon,
      badge: 'عملکرد',
    },
    {
      title: 'پروژه‌های تکمیل‌شده',
      value: formatNumber(summary.stats.completedProjects),
      description: 'پروژه‌هایی که وضعیت تکمیل‌شده دارند',
      icon: CheckCircleIcon,
      badge: 'خروجی',
    },
    {
      title: 'فایل‌های پروژه',
      value: formatNumber(summary.stats.uploadedFiles),
      description: 'فایل‌های ثبت‌شده در پروژه‌ها',
      icon: DocumentTextIcon,
      badge: 'فایل',
    },
  ];
};

export default function DashboardTestCharts() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await dashboardService.getSummary();

      setSummary(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در دریافت داشبورد');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const statCards = useMemo(() => {
    return summary ? createStatCards(summary) : [];
  }, [summary]);

  const projectStatusData = useMemo(() => {
    return summary ? getTopCountItems(summary.projectStatus) : [];
  }, [summary]);

  const taskStatusData = useMemo(() => {
    return summary ? getTopCountItems(summary.taskStatus) : [];
  }, [summary]);

  if (loading) {
    return (
      <div className="flex min-h-96 items-center justify-center" dir="rtl">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg text-primary" />
          <p className="mt-4 text-sm text-base-content/60">
            در حال دریافت اطلاعات داشبورد...
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

        <button className="btn btn-primary" onClick={loadDashboard} type="button">
          <ArrowPathIcon className="h-5 w-5" />
          تلاش دوباره
        </button>
      </div>
    );
  }

  if (!summary) {
    return (
      <div
        className="rounded-2xl border border-base-300 bg-base-100 p-8 text-center"
        dir="rtl"
      >
        اطلاعات داشبورد در دسترس نیست.
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-bold text-base-content">
            داشبورد مدیریتی
          </h1>
          <p className="mt-1 text-sm text-base-content/60">
            نمای واقعی از کاربران، پروژه‌ها، وظایف، گزارش‌های کاری و فایل‌های
            ثبت‌شده.
          </p>
          <p className="mt-1 text-xs text-base-content/50">
            آخرین بروزرسانی: {formatDateTime(summary.generatedAt)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/projects" className="btn btn-outline">
            پروژه‌ها
          </Link>
          <Link href="/dashboard/calendar" className="btn btn-outline">
            تقویم
          </Link>
          <button className="btn btn-primary" onClick={loadDashboard} type="button">
            <ArrowPathIcon className="h-5 w-5" />
            بروزرسانی
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.title}
              className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-base-content/60">
                    {item.title}
                  </p>
                  <p className="mt-3 text-3xl font-bold text-base-content">
                    {item.value}
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-6 w-6" />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-2">
                <p className="text-xs text-base-content/60">{item.description}</p>
                <span className="badge badge-outline badge-sm">{item.badge}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="text-base font-semibold text-base-content">
              روند گزارش‌های کاری و کارهای تکمیل‌شده
            </h2>
            <p className="mt-1 text-xs text-base-content/60">
              داده واقعی ۷ روز اخیر بر اساس گزارش‌های ثبت‌شده و وظایف انجام‌شده.
            </p>
          </div>

          <div className="h-80" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={summary.workTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="workLogs"
                  name="گزارش کار"
                  stroke="var(--color-primary)"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="completedTasks"
                  name="وظیفه انجام‌شده"
                  stroke="var(--color-secondary)"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="text-base font-semibold text-base-content">
              وضعیت پروژه‌ها
            </h2>
            <p className="mt-1 text-xs text-base-content/60">
              توزیع پروژه‌ها بر اساس وضعیت فعلی.
            </p>
          </div>

          <div className="h-80" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectStatusData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar
                  dataKey="count"
                  name="تعداد پروژه"
                  fill="var(--color-primary)"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="text-base font-semibold text-base-content">
              وضعیت وظایف
            </h2>
            <p className="mt-1 text-xs text-base-content/60">
              تعداد وظایف در هر وضعیت کاری.
            </p>
          </div>

          <div className="h-72" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={taskStatusData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar
                  dataKey="count"
                  name="تعداد وظیفه"
                  fill="var(--color-accent)"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="text-base font-semibold text-base-content">
              اولویت پروژه‌ها
            </h2>
            <p className="mt-1 text-xs text-base-content/60">
              وضعیت ریسک پروژه‌ها بر اساس اولویت ثبت‌شده.
            </p>
          </div>

          <div className="space-y-3">
            {summary.projectPriority.map((item) => {
              const max = Math.max(
                ...summary.projectPriority.map((priority) => priority.count),
                1,
              );
              const percent = Math.round((item.count / max) * 100);

              return (
                <div key={item.key}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-base-content">
                      {item.label}
                    </span>
                    <span className="text-base-content/60">
                      {formatNumber(item.count)} پروژه
                    </span>
                  </div>
                  <progress
                    className="progress progress-primary w-full"
                    value={percent}
                    max="100"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
        <div className="mb-5">
          <h2 className="text-base font-semibold text-base-content">
            آخرین رویدادهای سامانه
          </h2>
          <p className="mt-1 text-xs text-base-content/60">
            آخرین پروژه‌ها، وظایف، گزارش‌ها و فایل‌های ثبت‌شده.
          </p>
        </div>

        {summary.recentActivities.length ? (
          <div className="space-y-4">
            {summary.recentActivities.map((activity) => {
              const Icon = getActivityIcon(activity.type);

              const content = (
                <div className="flex items-start justify-between gap-4 rounded-xl border border-base-300 bg-base-200/60 p-4 transition hover:border-primary">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-base-content">
                        {activity.title}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-xs leading-6 text-base-content/60">
                        {activity.description}
                      </p>
                    </div>
                  </div>

                  <span className="shrink-0 rounded-full bg-base-100 px-3 py-1 text-xs font-medium text-base-content/60">
                    {formatDateTime(activity.date)}
                  </span>
                </div>
              );

              if (activity.projectId) {
                return (
                  <Link
                    key={`${activity.type}-${activity.id}`}
                    href={`/dashboard/projects/${activity.projectId}`}
                  >
                    {content}
                  </Link>
                );
              }

              return <div key={`${activity.type}-${activity.id}`}>{content}</div>;
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-base-300 p-8 text-center text-sm text-base-content/60">
            هنوز رویدادی برای نمایش ثبت نشده است.
          </div>
        )}
      </div>
    </div>
  );
}