import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowPathIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  FolderIcon,
} from '@heroicons/react/24/outline';
import {
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
  DashboardRecentActivity,
  DashboardSummary,
} from '@/types/dashboard';

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('fa-IR').format(value || 0);
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

const createStatCards = (summary: DashboardSummary) => {
  return [
    {
      title: 'پروژه‌های فعال',
      value: formatNumber(summary.stats.activeProjects),
      description: `کل پروژه‌ها: ${formatNumber(summary.stats.totalProjects)}`,
      icon: FolderIcon,
      tone: 'violet',
    },
    {
      title: 'کارهای باز',
      value: formatNumber(summary.stats.openTasks),
      description: `موعد امروز: ${formatNumber(summary.stats.dueTodayTasks)}`,
      icon: ClockIcon,
      tone: 'amber',
    },
    {
      title: 'کارهای عقب‌افتاده',
      value: formatNumber(summary.stats.overdueTasks),
      description:
        summary.stats.overdueTasks > 0
          ? 'نیازمند پیگیری فوری'
          : 'مورد عقب‌افتاده‌ای ثبت نشده است',
      icon: ExclamationTriangleIcon,
      tone: summary.stats.overdueTasks > 0 ? 'rose' : 'emerald',
    },
    {
      title: 'گزارش امروز',
      value: formatNumber(summary.stats.workLogsToday),
      description: `گزارش‌های دیروز: ${formatNumber(
        summary.stats.workLogsYesterday,
      )}`,
      icon: DocumentTextIcon,
      tone: 'slate',
    },
  ];
};

const toneClasses: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900',
  violet:
    'bg-violet-50 text-violet-700 ring-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900',
  amber:
    'bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900',
  rose: 'bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900',
  emerald:
    'bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900',
  slate:
    'bg-slate-50 text-slate-700 ring-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700',
};

type DashboardChartTooltipProps = {
  active?: boolean;
  payload?: any[];
  label?: string;
};

const DashboardChartTooltip = ({
  active,
  payload,
  label,
}: DashboardChartTooltipProps) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-3 text-right shadow-xl">
      <p className="mb-2 text-sm font-black text-base-content">{label}</p>
      <div className="space-y-1">
        {payload.map((entry) => (
          <div
            key={`${entry.name}-${entry.dataKey}`}
            className="flex min-w-[150px] items-center justify-between gap-4 text-xs"
          >
            <span className="font-bold text-base-content/60">{entry.name}</span>
            <span className="font-black text-base-content">
              {formatNumber(Number(entry.value || 0))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
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

  const latestActivities = useMemo(() => {
    return summary?.recentActivities.slice(0, 8) || [];
  }, [summary?.recentActivities]);

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
    <div className="space-y-6 text-right" dir="rtl">
      <section className="rounded-3xl border border-base-300 bg-base-100 p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <div>
            <div className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">
              داشبورد عملیاتی
            </div>
            <h1 className="mt-3 text-2xl font-black text-base-content">
              وضعیت روزانه سامانه
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-base-content/60">
              تمرکز این صفحه فقط روی کارهای روزانه، روند کوتاه‌مدت و فعالیت‌های اخیر است. گزارش‌های مدیریتی و پرتفو در صفحات جداگانه نمایش داده می‌شوند.
            </p>
            <p className="mt-2 text-xs text-base-content/50">
              آخرین بروزرسانی: {formatDateTime(summary.generatedAt)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/projects" className="btn btn-primary">
              پروژه‌ها
            </Link>
            <Link href="/dashboard/calendar" className="btn btn-outline">
              <CalendarDaysIcon className="h-5 w-5" />
              تقویم
            </Link>
            <button className="btn btn-ghost" onClick={loadDashboard} type="button">
              <ArrowPathIcon className="h-5 w-5" />
              بروزرسانی
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.title}
              className="rounded-3xl border border-base-300 bg-base-100 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-base-content/60">
                    {item.title}
                  </p>
                  <p className="mt-3 text-3xl font-black text-base-content">
                    {item.value}
                  </p>
                  <p className="mt-2 text-xs leading-6 text-base-content/55">
                    {item.description}
                  </p>
                </div>

                <div className={`shrink-0 rounded-2xl p-3 ring-1 ${toneClasses[item.tone]}`}>
                  <Icon className="h-7 w-7" />
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="rounded-3xl border border-base-300 bg-base-100 p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-lg font-black text-base-content">
                روند ۷ روز اخیر
              </h2>
              <p className="mt-1 text-xs leading-6 text-base-content/60">
                روند گزارش‌های کاری و وظایف تکمیل‌شده؛ این نمودار مختص داشبورد عملیاتی است و در نمای کلان تکرار نمی‌شود.
              </p>
            </div>
          </div>

          <div className="h-80" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={summary.workTrend}
                margin={{ top: 12, right: 12, left: 8, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fontWeight: 700 }} />
                <YAxis tick={{ fontSize: 12, fontWeight: 700 }} allowDecimals={false} />
                <Tooltip content={<DashboardChartTooltip />} />
                <Line
                  type="monotone"
                  dataKey="workLogs"
                  name="گزارش کار"
                  stroke="#2563eb"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="completedTasks"
                  name="وظیفه انجام‌شده"
                  stroke="#16a34a"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-base-300 bg-base-100 p-5 shadow-sm">
          <h2 className="text-lg font-black text-base-content">دسترسی سریع</h2>
          <p className="mt-1 text-xs leading-6 text-base-content/60">
            مسیرهای اصلی برای مدیریت روزانه بدون تکرار نمودارهای تحلیلی.
          </p>

          <div className="mt-5 space-y-3">
            <Link
              href="/dashboard/project-charts"
              className="flex items-center justify-between rounded-2xl border border-base-300 bg-base-200/60 px-4 py-3 transition hover:border-primary hover:bg-primary/5"
            >
              <span className="font-bold text-base-content">نمودارهای مدیریتی پروژه‌ها</span>
              <ChartBarIcon className="h-5 w-5 text-primary" />
            </Link>
            <Link
              href="/dashboard/project-overview"
              className="flex items-center justify-between rounded-2xl border border-base-300 bg-base-200/60 px-4 py-3 transition hover:border-primary hover:bg-primary/5"
            >
              <span className="font-bold text-base-content">تحلیل پورتفو</span>
              <ChartBarIcon className="h-5 w-5 text-primary" />
            </Link>
            <Link
              href="/dashboard/projects/define"
              className="flex items-center justify-between rounded-2xl border border-base-300 bg-base-200/60 px-4 py-3 transition hover:border-primary hover:bg-primary/5"
            >
              <span className="font-bold text-base-content">تعریف پروژه جدید</span>
              <FolderIcon className="h-5 w-5 text-primary" />
            </Link>
            <Link
              href="/dashboard/calendar"
              className="flex items-center justify-between rounded-2xl border border-base-300 bg-base-200/60 px-4 py-3 transition hover:border-primary hover:bg-primary/5"
            >
              <span className="font-bold text-base-content">تقویم پروژه‌ها</span>
              <CalendarDaysIcon className="h-5 w-5 text-primary" />
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-base-300 bg-base-100 p-5 shadow-sm">
        <div className="mb-5">
          <h2 className="text-lg font-black text-base-content">
            آخرین رویدادهای سامانه
          </h2>
          <p className="mt-1 text-xs leading-6 text-base-content/60">
            آخرین پروژه‌ها، وظایف، گزارش‌ها و فایل‌های ثبت‌شده. برای تحلیل وضعیت پروژه‌ها از صفحه نمای کلان استفاده کنید.
          </p>
        </div>

        {latestActivities.length ? (
          <div className="grid gap-3 xl:grid-cols-2">
            {latestActivities.map((activity) => {
              const Icon = getActivityIcon(activity.type);

              const content = (
                <div className="flex h-full items-start justify-between gap-4 rounded-2xl border border-base-300 bg-base-200/60 p-4 transition hover:border-primary hover:bg-primary/5">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-black text-base-content">
                        {activity.title}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-xs leading-6 text-base-content/60">
                        {activity.description}
                      </p>

                      {activity.files?.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {activity.files.slice(0, 3).map((file) => (
                            <span
                              key={file.id}
                              className="badge badge-outline max-w-full truncate text-xs"
                            >
                              {file.originalName}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <span className="shrink-0 rounded-full bg-base-100 px-3 py-1 text-xs font-bold text-base-content/60">
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
          <div className="rounded-2xl border border-dashed border-base-300 p-8 text-center text-sm text-base-content/60">
            هنوز رویدادی برای نمایش ثبت نشده است.
          </div>
        )}
      </section>
    </div>
  );
}
