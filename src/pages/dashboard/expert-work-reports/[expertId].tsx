import ShamsiDateInput from '@/components/common/ShamsiDateInput';
import { UserAvatar } from '@/components/common';
import { AdminStatCard, DashboardPageHeader, FilterBar, SectionCard } from '@/components/common/DashboardUi';
import { DailyPerformanceChart, ProjectDistributionChart } from '@/components/expert-work-reports';
import ExpertWorkLogTimeline from '@/components/expert-work-logs/ExpertWorkLogTimeline';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import expertWorkReportService from '@/services/expert-work-report.service';
import type { ExpertWorkReportDetails, ExpertWorkReportFilters } from '@/types/expert-work-report';
import { getEntityLabel } from '@/types/expert-work-log';
import { withAuth } from '@/utils/withAuth';
import {
  ArrowPathIcon,
  BriefcaseIcon,
  CheckBadgeIcon,
  ClockIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

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

export default function ExpertWorkReportDetailsPage() {
  const router = useRouter();
  const expertId = typeof router.query.expertId === 'string' ? router.query.expertId : '';
  const [data, setData] = useState<ExpertWorkReportDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Omit<ExpertWorkReportFilters, 'expertId'>>({ page: 1, limit: 20 });
  const [draft, setDraft] = useState<Omit<ExpertWorkReportFilters, 'expertId'>>({ page: 1, limit: 20 });
  const [projectOptions, setProjectOptions] = useState<Array<{ id: string; title: string }>>([]);

  const load = useCallback(async (next: Omit<ExpertWorkReportFilters, 'expertId'>, quiet = false) => {
    if (!expertId) return;
    if (!quiet) setLoading(true);
    try {
      const result = await expertWorkReportService.getDetails(expertId, next);
      setData(result);
      setProjectOptions((current) => {
        const merged = new Map(current.map((item) => [item.id, item]));
        result.projectDistribution.forEach((item) => {
          merged.set(item.projectId, {
            id: item.projectId,
            title: getEntityLabel(item.project, 'پروژه نامشخص'),
          });
        });
        return Array.from(merged.values());
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'خطا در دریافت جزئیات کارشناس');
    } finally {
      setLoading(false);
    }
  }, [expertId]);

  useEffect(() => { if (router.isReady && expertId) void load(filters); }, [expertId, filters, load, router.isReady]);

  const explanationText = useMemo(() => {
    if (!data) return [];
    const items: string[] = [];
    if (data.explanation.topProject?.project) {
      items.push(`بیشترین زمان ثبت‌شده مربوط به پروژه «${getEntityLabel(data.explanation.topProject.project)}» است.`);
    }
    items.push(`میانگین زمان هر فعالیت ${formatDuration(data.explanation.averageMinutesPerEntry)} است.`);
    if (data.explanation.blockerRatePercent > 0) {
      items.push(`${data.explanation.blockerRatePercent.toLocaleString('fa-IR')}٪ گزارش‌ها دارای مانع ثبت‌شده‌اند و نیاز به بررسی مدیریتی دارند.`);
    } else {
      items.push('در بازه فعلی مانع صریحی در گزارش‌ها ثبت نشده است.');
    }
    items.push(`${data.explanation.deliverableRatePercent.toLocaleString('fa-IR')}٪ گزارش‌ها خروجی مشخص دارند.`);
    return items;
  }, [data]);

  const applyFilters = () => setFilters({ ...draft, page: 1, limit: filters.limit || 20 });
  const clearFilters = () => {
    const next = { page: 1, limit: filters.limit || 20 };
    setDraft(next);
    setFilters(next);
  };

  if (!data && loading) {
    return <DashboardLayout><div className="space-y-5">{[1, 2, 3].map((item) => <div key={item} className="h-40 animate-pulse rounded-3xl bg-base-200" />)}</div></DashboardLayout>;
  }

  if (!data) {
    return <DashboardLayout><SectionCard><div className="py-20 text-center font-bold text-base-content/55">اطلاعات کارشناس دریافت نشد.</div></SectionCard></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <DashboardPageHeader
          backHref="/dashboard/expert-work-reports"
          backLabel="بازگشت به گزارش کارشناسان"
          eyebrow="جزئیات عملکرد"
          title={getEntityLabel(data.expert)}
          description={`${data.expert.profile?.jobTitle || 'کارشناس پروژه'} — این صفحه سابقه روزانه، توزیع فعالیت میان پروژه‌ها، زمان صرف‌شده، پیشرفت، خروجی و موانع ثبت‌شده را نمایش می‌دهد.`}
          actions={<button type="button" className="btn btn-outline rounded-2xl" disabled={loading} onClick={() => void load(filters, true)}><ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />به‌روزرسانی</button>}
        />

        <section className="flex flex-col gap-4 rounded-3xl border border-base-300 bg-base-100 p-5 shadow-sm sm:flex-row sm:items-center">
          <UserAvatar
            userId={expertId}
            name={getEntityLabel(data.expert)}
            size="xl"
            eager
            className="border-4 border-primary/20"
          />
          <div className="min-w-0">
            <h2 className="break-words text-2xl font-black text-base-content">{getEntityLabel(data.expert)}</h2>
            <p className="mt-1 break-words text-sm text-base-content/55">{data.expert.profile?.jobTitle || 'کارشناس پروژه'}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="badge badge-primary badge-outline">{data.summary.activeDayCount.toLocaleString('fa-IR')} روز فعال</span>
              <span className="badge badge-info badge-outline">{data.summary.projectCount.toLocaleString('fa-IR')} پروژه</span>
              <span className="badge badge-success badge-outline">{data.summary.deliverableEntries.toLocaleString('fa-IR')} خروجی مستند</span>
            </div>
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AdminStatCard title="فعالیت‌های ثبت‌شده" value={data.summary.totalEntries.toLocaleString('fa-IR')} description={`${data.summary.activeDayCount.toLocaleString('fa-IR')} روز دارای گزارش`} icon={DocumentTextIcon} tone="primary" />
          <AdminStatCard title="مجموع زمان" value={formatDuration(data.summary.totalDurationMinutes)} description={`میانگین ${formatDuration(data.explanation.averageMinutesPerEntry)} برای هر فعالیت`} icon={ClockIcon} tone="info" />
          <AdminStatCard title="گزارش‌های دارای خروجی" value={data.summary.deliverableEntries.toLocaleString('fa-IR')} description={`${data.explanation.deliverableRatePercent.toLocaleString('fa-IR')}٪ از کل فعالیت‌ها`} icon={CheckBadgeIcon} tone="success" />
          <AdminStatCard title="گزارش‌های دارای مانع" value={data.summary.blockerEntries.toLocaleString('fa-IR')} description={`${data.explanation.blockerRatePercent.toLocaleString('fa-IR')}٪ از کل فعالیت‌ها`} icon={ExclamationTriangleIcon} tone="warning" />
        </div>

        <FilterBar>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <label className="form-control">
              <span className="label label-text font-bold">پروژه</span>
              <select className="select select-bordered bg-base-100" value={draft.projectId || ''} onChange={(event) => setDraft((current) => ({ ...current, projectId: event.target.value }))}>
                <option value="">همه پروژه‌ها</option>
                {projectOptions.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
              </select>
            </label>
            <ShamsiDateInput label="از تاریخ" value={draft.dateFrom || ''} onChange={(value) => setDraft((current) => ({ ...current, dateFrom: value }))} />
            <ShamsiDateInput label="تا تاریخ" value={draft.dateTo || ''} onChange={(value) => setDraft((current) => ({ ...current, dateTo: value }))} />
            <label className="form-control">
              <span className="label label-text font-bold">جست‌وجو در توضیحات</span>
              <input className="input input-bordered bg-base-100" value={draft.search || ''} onChange={(event) => setDraft((current) => ({ ...current, search: event.target.value }))} onKeyDown={(event) => event.key === 'Enter' && applyFilters()} placeholder="عنوان، شرح، خروجی یا مانع" />
            </label>
            <div className="flex items-end gap-2"><button type="button" className="btn btn-primary flex-1 rounded-2xl" onClick={applyFilters}>اعمال</button><button type="button" className="btn btn-ghost rounded-2xl" onClick={clearFilters}>پاک‌کردن</button></div>
          </div>
        </FilterBar>

        <SectionCard title="تفسیر مدیریتی داده‌ها" description="این توضیحات از داده‌های ثبت‌شده ساخته شده‌اند؛ کیفیت یا اثر واقعی کار باید همراه وضعیت پروژه و خروجی تحویل‌شده ارزیابی شود.">
          <div className="grid gap-3 lg:grid-cols-2">
            {explanationText.map((text, index) => <div key={text} className="flex gap-3 rounded-2xl border border-base-300 bg-base-200/35 p-4"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-black text-primary">{(index + 1).toLocaleString('fa-IR')}</span><p className="text-sm leading-7 text-base-content/70">{text}</p></div>)}
          </div>
        </SectionCard>

        <div className="grid gap-5 xl:grid-cols-2">
          <SectionCard title="روند فعالیت در طول زمان" description="ترکیب زمان و تعداد گزارش‌ها نشان می‌دهد فعالیت چگونه در بازه انتخاب‌شده توزیع شده است.">
            {data.dailyTrend.length ? <DailyPerformanceChart data={data.dailyTrend} /> : <div className="flex h-80 items-center justify-center text-base-content/45">داده‌ای برای نمودار وجود ندارد.</div>}
          </SectionCard>
          <SectionCard title="توزیع زمان میان پروژه‌ها" description="پروژه‌ای با زمان بیشتر الزاماً عملکرد بهتر ندارد؛ پیچیدگی، خروجی و مرحله پروژه نیز باید بررسی شود.">
            {data.projectDistribution.length ? <ProjectDistributionChart data={data.projectDistribution} /> : <div className="flex h-80 items-center justify-center text-base-content/45">داده‌ای برای نمودار وجود ندارد.</div>}
          </SectionCard>
        </div>

        <SectionCard title="جزئیات روزانه فعالیت‌ها" description="هر گزارش با پروژه، فاز یا وظیفه مرتبط، شرح کار، زمان، پیشرفت، خروجی، مانع و گام بعدی نمایش داده می‌شود." actions={<span className="badge badge-ghost p-3 font-bold">{data.pagination.total.toLocaleString('fa-IR')} رکورد</span>}>
          <ExpertWorkLogTimeline items={data.entries} loading={loading} onEdit={() => undefined} onDelete={() => undefined} />
          {data.pagination.totalPages > 1 ? <div className="mt-6 flex justify-center gap-2 border-t border-base-300 pt-5"><button className="btn btn-sm rounded-xl" disabled={data.pagination.page <= 1} onClick={() => setFilters((current) => ({ ...current, page: Math.max(1, data.pagination.page - 1) }))}>قبلی</button><span className="flex items-center px-4 text-sm font-bold">صفحه {data.pagination.page.toLocaleString('fa-IR')} از {data.pagination.totalPages.toLocaleString('fa-IR')}</span><button className="btn btn-sm rounded-xl" disabled={data.pagination.page >= data.pagination.totalPages} onClick={() => setFilters((current) => ({ ...current, page: data.pagination.page + 1 }))}>بعدی</button></div> : null}
        </SectionCard>
      </div>
    </DashboardLayout>
  );
}
