import { AdminStatCard, DashboardPageHeader, FilterBar, SectionCard } from '@/components/common/DashboardUi';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import projectFinanceReportService from '@/services/project-finance-report.service';
import type {
  ProjectFinanceReportFilters,
  ProjectFinanceReportItem,
  ProjectFinanceReportResult,
} from '@/types/project-finance-report';
import { getUserDisplayName, projectPriorityLabels, projectStatusLabels } from '@/types/project';
import { withAuth } from '@/utils/withAuth';
import {
  ArrowPathIcon,
  BanknotesIcon,
  BriefcaseIcon,
  ChartBarSquareIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  ReceiptPercentIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { toast } from 'sonner';

const EMPTY: ProjectFinanceReportResult = {
  items: [],
  summary: {
    expectedRevenue: 0,
    expectedExpense: 0,
    realizedRevenue: 0,
    realizedExpense: 0,
    expectedBalance: 0,
    realizedBalance: 0,
    phaseCount: 0,
    financialNoteCount: 0,
  },
  pagination: { total: 0, page: 1, limit: 12, totalPages: 0 },
};

const amount = (value: number) => `${Number(value || 0).toLocaleString('fa-IR')} ریال`;
const percent = (value?: number | null) => value === null || value === undefined
  ? 'قابل محاسبه نیست'
  : `${Math.round(value).toLocaleString('fa-IR')}٪`;
const shortTitle = (value: string) => value.length > 22 ? `${value.slice(0, 21)}…` : value;

const balanceClass = (value: number) => value > 0 ? 'text-success' : value < 0 ? 'text-error' : 'text-base-content';

const FinanceChart = ({ projects }: { projects: ProjectFinanceReportItem[] }) => {
  const data = projects.slice(0, 10).map((project) => ({
    project: shortTitle(project.title),
    revenue: project.summary.realizedRevenue,
    expense: project.summary.realizedExpense,
  }));

  return (
    <div className="h-96 w-full" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 16, right: 12, left: 12, bottom: 55 }}>
          <CartesianGrid stroke="var(--app-border-soft)" strokeDasharray="4 4" vertical={false} />
          <XAxis dataKey="project" interval={0} angle={-25} textAnchor="end" height={80} tick={{ fill: 'var(--app-base-content)', fontSize: 11, fontWeight: 700 }} />
          <YAxis tick={{ fill: 'var(--app-base-content)', fontSize: 11, fontWeight: 700 }} tickFormatter={(value) => Number(value).toLocaleString('fa-IR', { notation: 'compact' })} />
          <Tooltip formatter={(value: any, name: any) => [amount(value), name === 'revenue' ? 'درآمد تحقق‌یافته' : 'هزینه تحقق‌یافته']} />
          <Legend formatter={(value) => value === 'revenue' ? 'درآمد تحقق‌یافته' : 'هزینه تحقق‌یافته'} />
          <Bar dataKey="revenue" fill="#16a34a" radius={[8, 8, 0, 0]} />
          <Bar dataKey="expense" fill="#dc2626" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const getServerSideProps = withAuth();

export default function ProjectFinanceDescriptionPage() {
  const [data, setData] = useState<ProjectFinanceReportResult>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ProjectFinanceReportFilters>({ page: 1, limit: 12 });
  const [draft, setDraft] = useState<ProjectFinanceReportFilters>({ page: 1, limit: 12 });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const load = useCallback(async (next: ProjectFinanceReportFilters, quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      setData(await projectFinanceReportService.list(next));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'خطا در دریافت گزارش مالی پروژه‌ها');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(filters); }, [filters, load]);

  const completion = data.summary.expectedRevenue
    ? Math.round((data.summary.realizedRevenue / data.summary.expectedRevenue) * 100)
    : null;

  const applyFilters = () => setFilters({ ...draft, page: 1, limit: filters.limit || 12 });
  const clearFilters = () => {
    const next = { page: 1, limit: filters.limit || 12 };
    setDraft(next);
    setFilters(next);
  };

  const visibleProjects = useMemo(() => data.items, [data.items]);

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <DashboardPageHeader
          eyebrow="مالی پروژه‌ها"
          title="شرح مالی پروژه‌ها"
          description="هر پروژه به‌صورت مستقل نمایش داده می‌شود؛ توضیح اصلی پروژه، شرح هر فاز، یادداشت مالی فاز، پیش‌بینی درآمد و هزینه و مقادیر تحقق‌یافته در یک نمای واحد قابل بررسی است."
          actions={<button type="button" className="btn btn-outline rounded-2xl" disabled={loading} onClick={() => void load(filters, true)}><ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />به‌روزرسانی</button>}
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AdminStatCard title="درآمد تحقق‌یافته" value={amount(data.summary.realizedRevenue)} description={`تحقق نسبت به پیش‌بینی: ${percent(completion)}`} icon={CurrencyDollarIcon} tone="success" />
          <AdminStatCard title="هزینه تحقق‌یافته" value={amount(data.summary.realizedExpense)} description={`هزینه پیش‌بینی‌شده: ${amount(data.summary.expectedExpense)}`} icon={BanknotesIcon} tone="error" />
          <AdminStatCard title="تراز تحقق‌یافته" value={<span className={balanceClass(data.summary.realizedBalance)}>{amount(data.summary.realizedBalance)}</span>} description={`تراز پیش‌بینی‌شده: ${amount(data.summary.expectedBalance)}`} icon={ChartBarSquareIcon} tone={data.summary.realizedBalance >= 0 ? 'success' : 'error'} />
          <AdminStatCard title="یادداشت‌های مالی" value={data.summary.financialNoteCount.toLocaleString('fa-IR')} description={`${data.summary.phaseCount.toLocaleString('fa-IR')} فاز در پروژه‌های این صفحه`} icon={DocumentTextIcon} tone="warning" />
        </div>

        <FilterBar>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <label className="form-control xl:col-span-2">
              <span className="label label-text font-bold">جست‌وجوی پروژه</span>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-base-content/40" />
                <input className="input input-bordered w-full bg-base-100 pr-11" value={draft.search || ''} onChange={(event) => setDraft((current) => ({ ...current, search: event.target.value }))} onKeyDown={(event) => event.key === 'Enter' && applyFilters()} placeholder="عنوان یا توضیح پروژه" />
              </div>
            </label>
            <label className="form-control">
              <span className="label label-text font-bold">وضعیت</span>
              <select className="select select-bordered bg-base-100" value={draft.status || ''} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}>
                <option value="">همه وضعیت‌ها</option>
                {Object.entries(projectStatusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </label>
            <label className="form-control">
              <span className="label label-text font-bold">اولویت</span>
              <select className="select select-bordered bg-base-100" value={draft.priority || ''} onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value }))}>
                <option value="">همه اولویت‌ها</option>
                {Object.entries(projectPriorityLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </label>
            <div className="flex items-end gap-2"><button type="button" className="btn btn-primary flex-1 rounded-2xl" onClick={applyFilters}>اعمال</button><button type="button" className="btn btn-ghost rounded-2xl" onClick={clearFilters}>پاک‌کردن</button></div>
          </div>
        </FilterBar>

        <SectionCard title="مقایسه مالی پروژه‌ها" description="مقایسه درآمد و هزینه تحقق‌یافته برای پروژه‌های صفحه جاری؛ برای تفسیر، توضیحات پروژه و یادداشت‌های هر فاز را نیز بررسی کنید.">
          {visibleProjects.length ? <FinanceChart projects={visibleProjects} /> : <div className="flex h-80 items-center justify-center text-base-content/45">داده‌ای برای نمودار وجود ندارد.</div>}
        </SectionCard>

        <SectionCard title="شرح مستقل هر پروژه" description="هر کارت یک پروژه مستقل است. فازها را باز کنید تا توضیحات اجرایی و مالی همان پروژه بدون اختلاط با پروژه‌های دیگر دیده شود." actions={<span className="badge badge-ghost p-3 font-bold">{data.pagination.total.toLocaleString('fa-IR')} پروژه</span>}>
          {loading ? (
            <div className="space-y-4">{[1, 2, 3].map((item) => <div key={item} className="h-72 animate-pulse rounded-3xl bg-base-200" />)}</div>
          ) : visibleProjects.length ? (
            <div className="space-y-5">
              {visibleProjects.map((project) => {
                const isOpen = expanded[project.id] ?? true;
                return (
                  <article key={project.id} className="overflow-hidden rounded-3xl border border-base-300 bg-base-100 shadow-sm">
                    <div className="p-5">
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="rounded-full bg-primary/10 px-3 py-1 font-black text-primary">{project.statusLabel || projectStatusLabels[project.status as keyof typeof projectStatusLabels] || project.status}</span>
                            <span className="rounded-full bg-warning/10 px-3 py-1 font-black text-warning">{project.priorityLabel || projectPriorityLabels[project.priority as keyof typeof projectPriorityLabels] || project.priority}</span>
                            <span className="rounded-full bg-base-200 px-3 py-1 font-bold text-base-content/60">مسئول: {getUserDisplayName(project.ownerId) || 'ثبت نشده'}</span>
                          </div>
                          <h2 className="mt-3 text-xl font-black text-base-content">{project.title}</h2>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-8 text-base-content/65">{project.description?.trim() || 'برای این پروژه توضیحی ثبت نشده است.'}</p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <Link href={`/dashboard/projects/${project.id}`} className="btn btn-outline btn-sm rounded-xl"><BriefcaseIcon className="h-4 w-4" />جزئیات پروژه</Link>
                          <button type="button" className="btn btn-ghost btn-sm rounded-xl" onClick={() => setExpanded((current) => ({ ...current, [project.id]: !isOpen }))}>{isOpen ? 'بستن فازها' : 'نمایش فازها'}</button>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-2xl bg-success/5 p-4"><span className="text-xs font-bold text-success">درآمد تحقق‌یافته</span><strong className="mt-2 block text-lg">{amount(project.summary.realizedRevenue)}</strong><span className="text-xs text-base-content/50">از {amount(project.summary.expectedRevenue)}</span></div>
                        <div className="rounded-2xl bg-error/5 p-4"><span className="text-xs font-bold text-error">هزینه تحقق‌یافته</span><strong className="mt-2 block text-lg">{amount(project.summary.realizedExpense)}</strong><span className="text-xs text-base-content/50">از {amount(project.summary.expectedExpense)}</span></div>
                        <div className="rounded-2xl bg-info/5 p-4"><span className="text-xs font-bold text-info">تحقق درآمد</span><strong className="mt-2 block text-lg">{percent(project.summary.revenueAchievementPercent)}</strong><span className="text-xs text-base-content/50">بر اساس پیش‌بینی ثبت‌شده</span></div>
                        <div className="rounded-2xl bg-base-200/60 p-4"><span className="text-xs font-bold text-base-content/55">تراز تحقق‌یافته</span><strong className={`mt-2 block text-lg ${balanceClass(project.summary.realizedBalance)}`}>{amount(project.summary.realizedBalance)}</strong><span className="text-xs text-base-content/50">{project.summary.phaseCount.toLocaleString('fa-IR')} فاز</span></div>
                      </div>
                    </div>

                    {isOpen ? (
                      <div className="border-t border-base-300 bg-base-200/25 p-5">
                        {project.phases.length ? (
                          <div className="grid gap-4 xl:grid-cols-2">
                            {project.phases.map((phase, index) => {
                              const financial = phase.financial || {};
                              return (
                                <div key={phase.id || phase._id || `${project.id}-${index}`} className="rounded-3xl border border-base-300 bg-base-100 p-5">
                                  <div className="flex items-start justify-between gap-3">
                                    <div><span className="text-xs font-black text-primary">فاز {(index + 1).toLocaleString('fa-IR')}</span><h3 className="mt-1 font-black">{phase.title}</h3></div>
                                    <ReceiptPercentIcon className="h-6 w-6 text-base-content/35" />
                                  </div>
                                  <div className="mt-4 rounded-2xl bg-base-200/55 p-4">
                                    <div className="text-xs font-black text-base-content/55">شرح فاز</div>
                                    <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-base-content/70">{phase.description?.trim() || 'برای این فاز شرح اجرایی ثبت نشده است.'}</p>
                                  </div>
                                  <div className="mt-3 rounded-2xl border border-warning/20 bg-warning/5 p-4">
                                    <div className="text-xs font-black text-warning">توضیح مالی فاز</div>
                                    <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-base-content/70">{financial.note?.trim() || 'برای وضعیت مالی این فاز توضیحی ثبت نشده است.'}</p>
                                  </div>
                                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                                    <div className="rounded-xl bg-success/5 p-3"><span className="text-base-content/50">درآمد پیش‌بینی</span><strong className="mt-1 block">{amount(Number(financial.expectedRevenue ?? financial.potentialRevenueAmount ?? 0))}</strong></div>
                                    <div className="rounded-xl bg-error/5 p-3"><span className="text-base-content/50">هزینه پیش‌بینی</span><strong className="mt-1 block">{amount(Number(financial.expectedExpense ?? financial.potentialCostAmount ?? 0))}</strong></div>
                                    <div className="rounded-xl bg-success/10 p-3"><span className="text-base-content/50">درآمد تحقق‌یافته</span><strong className="mt-1 block">{amount(Number(financial.realizedRevenue ?? financial.realizedRevenueAmount ?? 0))}</strong></div>
                                    <div className="rounded-xl bg-error/10 p-3"><span className="text-base-content/50">هزینه تحقق‌یافته</span><strong className="mt-1 block">{amount(Number(financial.realizedExpense ?? financial.realizedCostAmount ?? 0))}</strong></div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : <div className="rounded-3xl border border-dashed border-base-300 p-8 text-center text-base-content/50">برای این پروژه فازی ثبت نشده است.</div>}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : <div className="flex min-h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-base-300"><BriefcaseIcon className="h-12 w-12 text-base-content/25" /><p className="mt-3 font-bold text-base-content/55">پروژه‌ای مطابق فیلترها پیدا نشد.</p></div>}

          {data.pagination.totalPages > 1 ? <div className="mt-6 flex justify-center gap-2 border-t border-base-300 pt-5"><button className="btn btn-sm rounded-xl" disabled={data.pagination.page <= 1} onClick={() => setFilters((current) => ({ ...current, page: Math.max(1, data.pagination.page - 1) }))}>قبلی</button><span className="flex items-center px-4 text-sm font-bold">صفحه {data.pagination.page.toLocaleString('fa-IR')} از {data.pagination.totalPages.toLocaleString('fa-IR')}</span><button className="btn btn-sm rounded-xl" disabled={data.pagination.page >= data.pagination.totalPages} onClick={() => setFilters((current) => ({ ...current, page: data.pagination.page + 1 }))}>بعدی</button></div> : null}
        </SectionCard>
      </div>
    </DashboardLayout>
  );
}
