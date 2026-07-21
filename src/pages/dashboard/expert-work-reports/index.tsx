import ShamsiDateInput from '@/components/common/ShamsiDateInput';
import { UserAvatar } from '@/components/common';
import { AdminStatCard, DashboardPageHeader, FilterBar, SectionCard } from '@/components/common/DashboardUi';
import { DailyPerformanceChart, ExpertRankingChart } from '@/components/expert-work-reports';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import expertWorkReportService from '@/services/expert-work-report.service';
import type { ExpertWorkReportFilters, ExpertWorkReportOverview } from '@/types/expert-work-report';
import { getEntityId, getEntityLabel } from '@/types/expert-work-log';
import { formatShamsiFullDate } from '@/utils/shamsi-date';
import { withAuth } from '@/utils/withAuth';
import {
  ArrowPathIcon,
  BriefcaseIcon,
  ChartBarSquareIcon,
  ClockIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

const EMPTY: ExpertWorkReportOverview = {
  summary: {
    totalEntries: 0,
    totalDurationMinutes: 0,
    averageProgressPercent: 0,
    expertCount: 0,
    projectCount: 0,
    activeDayCount: 0,
    blockerEntries: 0,
    deliverableEntries: 0,
    lastWorkDate: null,
  },
  experts: [],
  dailyTrend: [],
  projectDistribution: [],
  filters: { projects: [], experts: [] },
  pagination: { total: 0, page: 1, limit: 12, totalPages: 0 },
};

const formatDuration = (minutes: number) => {
  const value = Number(minutes || 0);
  const hours = Math.floor(value / 60);
  const rest = value % 60;
  if (!value) return '۰ دقیقه';
  if (hours && rest) return `${hours.toLocaleString('fa-IR')} ساعت و ${rest.toLocaleString('fa-IR')} دقیقه`;
  if (hours) return `${hours.toLocaleString('fa-IR')} ساعت`;
  return `${rest.toLocaleString('fa-IR')} دقیقه`;
};

export const getServerSideProps = withAuth();

export default function ExpertWorkReportsPage() {
  const [data, setData] = useState<ExpertWorkReportOverview>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ExpertWorkReportFilters>({ page: 1, limit: 12 });
  const [draft, setDraft] = useState<ExpertWorkReportFilters>({ page: 1, limit: 12 });

  const load = useCallback(async (next: ExpertWorkReportFilters, quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      setData(await expertWorkReportService.getOverview(next));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'خطا در دریافت گزارش کارشناسان');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(filters); }, [filters, load]);

  const topExpert = data.experts[0];
  const averageHours = data.summary.totalEntries
    ? data.summary.totalDurationMinutes / data.summary.totalEntries / 60
    : 0;

  const applyFilters = () => setFilters({ ...draft, page: 1, limit: filters.limit || 12 });
  const clearFilters = () => {
    const next = { page: 1, limit: filters.limit || 12 };
    setDraft(next);
    setFilters(next);
  };

  const pageButtons = useMemo(() => {
    const count = Math.max(data.pagination.totalPages, 1);
    return Array.from({ length: count }, (_, index) => index + 1).filter(
      (page) => page === 1 || page === count || Math.abs(page - data.pagination.page) <= 1,
    );
  }, [data.pagination]);

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <DashboardPageHeader
          eyebrow="گزارش مدیریتی"
          title="گزارش عملکرد کارشناسان"
          description="تحلیل قابل پیگیری از زمان صرف‌شده، تعداد فعالیت‌ها، پیشرفت، خروجی‌ها و موانع هر کارشناس؛ این صفحه فقط خواندنی است و از فضای ثبت گزارش کارشناسان جدا نگه داشته شده است."
          actions={
            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard/expert-leaderboard" className="btn btn-primary rounded-2xl">
                <TrophyIcon className="h-5 w-5" />
                جدول رتبه‌بندی
              </Link>
              <button type="button" className="btn btn-outline rounded-2xl" disabled={loading} onClick={() => void load(filters, true)}>
                <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                به‌روزرسانی
              </button>
            </div>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AdminStatCard title="کل گزارش‌های ثبت‌شده" value={data.summary.totalEntries.toLocaleString('fa-IR')} description={`${data.summary.activeDayCount.toLocaleString('fa-IR')} روز کاری ثبت‌شده`} icon={DocumentTextIcon} tone="primary" />
          <AdminStatCard title="مجموع زمان فعالیت" value={formatDuration(data.summary.totalDurationMinutes)} description={`میانگین ${averageHours.toLocaleString('fa-IR', { maximumFractionDigits: 1 })} ساعت برای هر گزارش`} icon={ClockIcon} tone="info" />
          <AdminStatCard title="کارشناسان فعال" value={data.summary.expertCount.toLocaleString('fa-IR')} description={topExpert ? `بیشترین زمان: ${getEntityLabel(topExpert.expert)}` : 'در بازه انتخاب‌شده'} icon={UserGroupIcon} tone="success" />
          <AdminStatCard title="گزارش‌های دارای مانع" value={data.summary.blockerEntries.toLocaleString('fa-IR')} description={`${data.summary.projectCount.toLocaleString('fa-IR')} پروژه در گزارش فعلی`} icon={ExclamationTriangleIcon} tone="warning" />
        </div>

        <FilterBar>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <label className="form-control">
              <span className="label label-text font-bold">کارشناس</span>
              <select className="select select-bordered bg-base-100" value={draft.expertId || ''} onChange={(event) => setDraft((current) => ({ ...current, expertId: event.target.value }))}>
                <option value="">همه کارشناسان</option>
                {data.filters.experts.map((expert) => <option key={getEntityId(expert)} value={getEntityId(expert)}>{getEntityLabel(expert)}</option>)}
              </select>
            </label>
            <label className="form-control">
              <span className="label label-text font-bold">پروژه</span>
              <select className="select select-bordered bg-base-100" value={draft.projectId || ''} onChange={(event) => setDraft((current) => ({ ...current, projectId: event.target.value }))}>
                <option value="">همه پروژه‌ها</option>
                {data.filters.projects.map((project) => <option key={getEntityId(project)} value={getEntityId(project)}>{project.title}</option>)}
              </select>
            </label>
            <ShamsiDateInput label="از تاریخ" value={draft.dateFrom || ''} onChange={(value) => setDraft((current) => ({ ...current, dateFrom: value }))} />
            <ShamsiDateInput label="تا تاریخ" value={draft.dateTo || ''} onChange={(value) => setDraft((current) => ({ ...current, dateTo: value }))} />
            <label className="form-control">
              <span className="label label-text font-bold">جست‌وجو</span>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-base-content/40" />
                <input className="input input-bordered w-full bg-base-100 pr-11" value={draft.search || ''} onChange={(event) => setDraft((current) => ({ ...current, search: event.target.value }))} onKeyDown={(event) => event.key === 'Enter' && applyFilters()} placeholder="نام، فعالیت یا خروجی" />
              </div>
            </label>
            <div className="flex items-end gap-2">
              <button type="button" className="btn btn-primary flex-1 rounded-2xl" onClick={applyFilters}>اعمال</button>
              <button type="button" className="btn btn-ghost rounded-2xl" onClick={clearFilters}>پاک‌کردن</button>
            </div>
          </div>
        </FilterBar>

        <div className="grid gap-5 xl:grid-cols-2">
          <SectionCard title="روند روزانه عملکرد" description="زمان کار و تعداد گزارش‌های ثبت‌شده در هر روز؛ افت ناگهانی یا افزایش غیرعادی باید با برنامه پروژه تطبیق داده شود.">
            {data.dailyTrend.length ? <DailyPerformanceChart data={data.dailyTrend} /> : <div className="flex h-80 items-center justify-center text-base-content/45">داده‌ای برای نمودار وجود ندارد.</div>}
          </SectionCard>
          <SectionCard title="رتبه‌بندی بر مبنای زمان ثبت‌شده" description="این نمودار بهره‌وری را به‌تنهایی اثبات نمی‌کند؛ زمان ثبت‌شده باید همراه خروجی، پیشرفت و موانع خوانده شود.">
            {data.experts.length ? <ExpertRankingChart data={data.experts} /> : <div className="flex h-80 items-center justify-center text-base-content/45">داده‌ای برای نمودار وجود ندارد.</div>}
          </SectionCard>
        </div>

        <SectionCard title="کارشناسان و خلاصه عملکرد" description="برای مشاهده جزئیات روزانه، پروژه‌های درگیر، توضیحات کار، خروجی‌ها و موانع روی هر کارشناس کلیک کنید." actions={<span className="badge badge-ghost p-3 font-bold">{data.pagination.total.toLocaleString('fa-IR')} کارشناس</span>}>
          {loading ? (
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">{[1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="h-64 animate-pulse rounded-3xl bg-base-200" />)}</div>
          ) : data.experts.length ? (
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {data.experts.map((item) => (
                <Link key={item.expertId} href={`/dashboard/expert-work-reports/${item.expertId}`} className="group rounded-3xl border border-base-300 bg-base-100 p-5 transition hover:-translate-y-1 hover:border-primary/35 hover:shadow-lg">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <UserAvatar
                        userId={item.expertId}
                        name={getEntityLabel(item.expert)}
                        size="lg"
                        className="border-primary/20"
                      />
                      <div className="min-w-0">
                        <h3 className="break-words text-lg font-black group-hover:text-primary">{getEntityLabel(item.expert)}</h3>
                        <p className="mt-1 break-words text-xs text-base-content/50">{item.expert?.profile?.jobTitle || item.expert?.email || 'کارشناس پروژه'}</p>
                      </div>
                    </div>
                    <div className="shrink-0 rounded-2xl bg-primary/10 p-3 text-primary"><ChartBarSquareIcon className="h-6 w-6" /></div>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl bg-base-200/60 p-3"><div className="text-xs text-base-content/50">زمان کار</div><strong className="mt-1 block">{formatDuration(item.totalDurationMinutes)}</strong></div>
                    <div className="rounded-2xl bg-base-200/60 p-3"><div className="text-xs text-base-content/50">تعداد فعالیت</div><strong className="mt-1 block">{item.totalEntries.toLocaleString('fa-IR')}</strong></div>
                    <div className="rounded-2xl bg-base-200/60 p-3"><div className="text-xs text-base-content/50">پروژه‌ها</div><strong className="mt-1 block">{item.projectCount.toLocaleString('fa-IR')}</strong></div>
                    <div className="rounded-2xl bg-base-200/60 p-3"><div className="text-xs text-base-content/50">میانگین پیشرفت</div><strong className="mt-1 block">{Math.round(item.averageProgressPercent || 0).toLocaleString('fa-IR')}٪</strong></div>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-base-300 pt-4 text-xs text-base-content/55">
                    <span>{item.lastWorkDate ? `آخرین فعالیت: ${formatShamsiFullDate(item.lastWorkDate)}` : 'بدون تاریخ فعالیت'}</span>
                    <span className="font-black text-primary">مشاهده جزئیات</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : <div className="flex min-h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-base-300 text-center"><BriefcaseIcon className="h-12 w-12 text-base-content/25" /><p className="mt-3 font-bold text-base-content/55">گزارشی مطابق فیلترها پیدا نشد.</p></div>}

          {data.pagination.totalPages > 1 ? (
            <div className="mt-6 flex flex-wrap justify-center gap-2 border-t border-base-300 pt-5">
              {pageButtons.map((page) => <button key={page} type="button" className={`btn btn-sm rounded-xl ${page === data.pagination.page ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilters((current) => ({ ...current, page }))}>{page.toLocaleString('fa-IR')}</button>)}
            </div>
          ) : null}
        </SectionCard>
      </div>
    </DashboardLayout>
  );
}
