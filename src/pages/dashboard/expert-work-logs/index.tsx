import ShamsiDateInput from '@/components/common/ShamsiDateInput';
import {
  AdminStatCard,
  DashboardPageHeader,
  FilterBar,
  SectionCard,
} from '@/components/common/DashboardUi';
import {
  ExpertWorkLogFormModal,
  ExpertWorkLogTimeline,
} from '@/components/expert-work-logs';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import expertWorkLogService from '@/services/expert-work-log.service';
import type {
  ExpertWorkLog,
  ExpertWorkLogFilters,
  ExpertWorkLogProject,
  ExpertWorkLogSummary,
} from '@/types/expert-work-log';
import { getEntityId } from '@/types/expert-work-log';
import type { PaginationState } from '@/types/project';
import { confirmToast } from '@/utils/sonner-confirm';
import { withAuth } from '@/utils/withAuth';
import {
  ArrowPathIcon,
  BriefcaseIcon,
  CalendarDaysIcon,
  ClockIcon,
  DocumentCheckIcon,
  MagnifyingGlassIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

const DEFAULT_SUMMARY: ExpertWorkLogSummary = {
  totalEntries: 0,
  totalDurationMinutes: 0,
  expertCount: 0,
  projectCount: 0,
};

const DEFAULT_PAGINATION: PaginationState = {
  total: 0,
  page: 1,
  limit: 20,
  totalPages: 0,
};

const formatDuration = (minutes: number): string => {
  const value = Number(minutes || 0);
  const hours = Math.floor(value / 60);
  const remaining = value % 60;

  if (!value) return '۰ دقیقه';
  if (hours && remaining) {
    return `${hours.toLocaleString('fa-IR')} ساعت و ${remaining.toLocaleString('fa-IR')} دقیقه`;
  }
  if (hours) return `${hours.toLocaleString('fa-IR')} ساعت`;
  return `${remaining.toLocaleString('fa-IR')} دقیقه`;
};

const ExpertWorkLogsPage = () => {
  const [projects, setProjects] = useState<ExpertWorkLogProject[]>([]);
  const [items, setItems] = useState<ExpertWorkLog[]>([]);
  const [summary, setSummary] = useState<ExpertWorkLogSummary>(DEFAULT_SUMMARY);
  const [pagination, setPagination] = useState<PaginationState>(DEFAULT_PAGINATION);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [projectLoading, setProjectLoading] = useState(true);

  const [filters, setFilters] = useState<ExpertWorkLogFilters>({
    projectId: '',
    dateFrom: '',
    dateTo: '',
    search: '',
    page: 1,
    limit: 20,
  });
  const [draftFilters, setDraftFilters] = useState(filters);

  const [formOpen, setFormOpen] = useState(false);
  const [editingWorkLog, setEditingWorkLog] = useState<ExpertWorkLog | null>(null);

  const loadProjects = useCallback(async () => {
    try {
      setProjectLoading(true);
      const result = await expertWorkLogService.listProjects({
        page: 1,
        limit: 100,
      });
      setProjects(result.items);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'پروژه‌های قابل دسترس دریافت نشد.');
    } finally {
      setProjectLoading(false);
    }
  }, []);

  const loadWorkLogs = useCallback(
    async (nextFilters: ExpertWorkLogFilters, silent = false) => {
      try {
        if (silent) setRefreshing(true);
        else setLoading(true);

        const result = await expertWorkLogService.list(nextFilters);
        setItems(result.items);
        setSummary(result.summary);
        setPagination(result.pagination);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'گزارش‌های کار دریافت نشد.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    void loadWorkLogs(filters);
  }, [filters, loadWorkLogs]);

  const selectedProject = useMemo(
    () => projects.find((project) => getEntityId(project) === filters.projectId),
    [projects, filters.projectId],
  );

  const applyFilters = () => {
    if (
      draftFilters.dateFrom &&
      draftFilters.dateTo &&
      draftFilters.dateFrom > draftFilters.dateTo
    ) {
      toast.error('تاریخ شروع بازه نمی‌تواند بعد از تاریخ پایان باشد.');
      return;
    }

    setFilters({
      ...draftFilters,
      page: 1,
      limit: filters.limit || 20,
    });
  };

  const clearFilters = () => {
    const nextFilters: ExpertWorkLogFilters = {
      projectId: '',
      dateFrom: '',
      dateTo: '',
      search: '',
      page: 1,
      limit: filters.limit || 20,
    };
    setDraftFilters(nextFilters);
    setFilters(nextFilters);
  };

  const openCreateForm = () => {
    setEditingWorkLog(null);
    setFormOpen(true);
  };

  const openEditForm = (workLog: ExpertWorkLog) => {
    setEditingWorkLog(workLog);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingWorkLog(null);
  };

  const handleSaved = async () => {
    closeForm();
    await Promise.all([loadWorkLogs(filters, true), loadProjects()]);
  };

  const handleDelete = async (workLog: ExpertWorkLog) => {
    const confirmed = await confirmToast({
      title: `حذف گزارش «${workLog.title}»`,
      description: 'گزارش از فهرست فعال حذف می‌شود و سابقه آن برای ممیزی در سامانه باقی می‌ماند.',
      confirmText: 'حذف گزارش',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      await expertWorkLogService.remove(getEntityId(workLog));
      await Promise.all([loadWorkLogs(filters, true), loadProjects()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'حذف گزارش انجام نشد.');
    }
  };

  const changePage = (page: number) => {
    if (page < 1 || page > pagination.totalPages || page === pagination.page) return;
    setFilters((current) => ({ ...current, page }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" dir="rtl">
        <DashboardPageHeader
          eyebrow="پنل کارشناسی"
          title="گزارش کار پروژه‌ها"
          description="فعالیت‌های واقعی خود را روزبه‌روز ثبت کنید. فقط پروژه‌هایی که در آن‌ها مسئولیت دارید در این صفحه نمایش داده می‌شوند."
          actions={
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-outline rounded-2xl"
                onClick={() => void loadWorkLogs(filters, true)}
                disabled={refreshing}
              >
                {refreshing ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  <ArrowPathIcon className="h-5 w-5" />
                )}
                بروزرسانی
              </button>
              <button
                type="button"
                className="btn btn-primary rounded-2xl"
                onClick={openCreateForm}
                disabled={projectLoading || !projects.length}
              >
                <PlusIcon className="h-5 w-5" />
                ثبت کار جدید
              </button>
            </div>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AdminStatCard
            title="تعداد فعالیت‌ها"
            value={summary.totalEntries.toLocaleString('fa-IR')}
            description="براساس فیلترهای فعلی"
            icon={DocumentCheckIcon}
            tone="primary"
          />
          <AdminStatCard
            title="زمان ثبت‌شده"
            value={formatDuration(summary.totalDurationMinutes)}
            description="مجموع زمان فعالیت‌های ثبت‌شده"
            icon={ClockIcon}
            tone="info"
          />
          <AdminStatCard
            title="پروژه‌های درگیر"
            value={summary.projectCount.toLocaleString('fa-IR')}
            description={selectedProject ? selectedProject.title : 'همه پروژه‌های قابل دسترس'}
            icon={BriefcaseIcon}
            tone="success"
          />
          <AdminStatCard
            title="کارشناسان ثبت‌کننده"
            value={summary.expertCount.toLocaleString('fa-IR')}
            description="افرادی که در نتایج فعلی گزارش دارند"
            icon={CalendarDaysIcon}
            tone="warning"
          />
        </div>

        <FilterBar>
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-5">
            <label className="form-control">
              <span className="label label-text font-bold">پروژه</span>
              <select
                className="select select-bordered w-full bg-base-100"
                value={draftFilters.projectId || ''}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    projectId: event.target.value,
                  }))
                }
                disabled={projectLoading}
              >
                <option value="">همه پروژه‌های من</option>
                {projects.map((project) => (
                  <option key={getEntityId(project)} value={getEntityId(project)}>
                    {project.title}
                  </option>
                ))}
              </select>
            </label>

            <ShamsiDateInput
              label="از تاریخ"
              value={draftFilters.dateFrom || ''}
              onChange={(value) =>
                setDraftFilters((current) => ({ ...current, dateFrom: value }))
              }
            />

            <ShamsiDateInput
              label="تا تاریخ"
              value={draftFilters.dateTo || ''}
              onChange={(value) =>
                setDraftFilters((current) => ({ ...current, dateTo: value }))
              }
            />

            <label className="form-control">
              <span className="label label-text font-bold">جست‌وجو</span>
              <div className="relative">
                <MagnifyingGlassIcon className="pointer-events-none absolute right-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-base-content/40" />
                <input
                  className="input input-bordered w-full bg-base-100 pr-11"
                  value={draftFilters.search || ''}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      search: event.target.value,
                    }))
                  }
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') applyFilters();
                  }}
                  placeholder="عنوان، شرح یا خروجی"
                />
              </div>
            </label>

            <div className="flex items-end gap-2">
              <button
                type="button"
                className="btn btn-primary flex-1 rounded-2xl"
                onClick={applyFilters}
              >
                اعمال فیلتر
              </button>
              <button
                type="button"
                className="btn btn-ghost rounded-2xl"
                onClick={clearFilters}
              >
                پاک‌کردن
              </button>
            </div>
          </div>
        </FilterBar>

        <SectionCard
          title="سوابق روزانه فعالیت"
          description="هر تاریخ به‌صورت مستقل نمایش داده می‌شود و در هر کارت، پروژه، کارشناس، زمان صرف‌شده، پیشرفت، خروجی و موانع مشخص است."
          actions={
            pagination.total ? (
              <span className="badge badge-ghost px-4 py-3 font-bold">
                {pagination.total.toLocaleString('fa-IR')} رکورد
              </span>
            ) : null
          }
        >
          <ExpertWorkLogTimeline
            items={items}
            loading={loading}
            onEdit={openEditForm}
            onDelete={handleDelete}
          />

          {pagination.totalPages > 1 ? (
            <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-base-300 pt-5 sm:flex-row">
              <p className="text-sm text-base-content/55">
                صفحه {pagination.page.toLocaleString('fa-IR')} از{' '}
                {pagination.totalPages.toLocaleString('fa-IR')}
              </p>
              <div className="join" dir="ltr">
                <button
                  type="button"
                  className="btn join-item btn-sm"
                  onClick={() => changePage(pagination.page - 1)}
                  disabled={pagination.page <= 1 || loading}
                >
                  قبلی
                </button>
                <button type="button" className="btn join-item btn-sm pointer-events-none">
                  {pagination.page.toLocaleString('fa-IR')}
                </button>
                <button
                  type="button"
                  className="btn join-item btn-sm"
                  onClick={() => changePage(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages || loading}
                >
                  بعدی
                </button>
              </div>
            </div>
          ) : null}
        </SectionCard>

        {!projectLoading && !projects.length ? (
          <div className="alert alert-warning rounded-3xl">
            <span>
              هنوز هیچ پروژه‌ای به شما تخصیص داده نشده است. برای ثبت گزارش کار، مدیر باید شما را به پروژه، فاز یا وظیفه مرتبط اضافه کند.
            </span>
          </div>
        ) : null}
      </div>

      <ExpertWorkLogFormModal
        open={formOpen}
        projects={projects}
        workLog={editingWorkLog}
        onClose={closeForm}
        onSaved={handleSaved}
      />
    </DashboardLayout>
  );
};

export const getServerSideProps = withAuth();

export default ExpertWorkLogsPage;
