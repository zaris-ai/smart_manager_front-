// src/pages/dashboard/projects/index.tsx

import {
  AdminStatCard,
  DashboardPageHeader,
  FilterBar,
  SectionCard,
  SoftBadge,
} from '@/components/common';
import { DashboardLayout } from '@/components/layouts';
import { ProjectImportModal } from '@/components/projects';
import { projectService } from '@/services/project.service';
import {
  getProjectId,
  getReferenceId,
  getUserDisplayName,
  Project,
  ProjectPriority,
  projectPriorityLabels,
  ProjectStatus,
  projectStatusLabels,
} from '@/types/project';
import { withAuth } from '@/utils';
import { confirmToast } from '@/utils/sonner-confirm';
import {
  ArrowPathIcon,
  ArrowUpTrayIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  EllipsisVerticalIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  FolderIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

const PAGE_LIMIT = 20;

type ProjectMemberListItem = {
  userId?: unknown;
  roleInProject?: string | null;
  startedAt?: string | null;
  expectedFinishedAt?: string | null;
};

type ProjectWithMembers = Project & {
  projectMembers?: ProjectMemberListItem[];
  members?: ProjectMemberListItem[];
};

const getProjectMembers = (project: Project): ProjectMemberListItem[] => {
  const projectWithMembers = project as ProjectWithMembers;

  return projectWithMembers.projectMembers || projectWithMembers.members || [];
};

const getMemberUser = (member: ProjectMemberListItem): any => {
  return member.userId as any;
};

const isProjectStaffingPending = (project: Project): boolean => {
  const memberCount =
    getProjectMembers(project).length || project.assignedUserIds?.length || 0;

  return !getReferenceId(project.ownerId) || memberCount === 0;
};

const statusBadgeClass: Record<ProjectStatus, string> = {
  negotiating: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  proposal_drafting: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-200',
  contract_signing: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-200',
  planning: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-200',
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200',
  on_hold: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-200',
  completed: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200',
  cancelled: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-200',
};

const priorityBadgeClass: Record<string, string> = {
  low: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-200',
  high: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-200',
  critical: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-200',
};

const formatDate = (value?: string | null): string => {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('fa-IR').format(date);
};

const isProjectOverdue = (project: Project): boolean => {
  if (!project.dueDate || project.status === 'completed') return false;

  const dueDate = new Date(project.dueDate);

  if (Number.isNaN(dueDate.getTime())) return false;

  return dueDate < new Date();
};

const normalizeAmount = (value?: number | string | null): number => {
  const amount = Number(value || 0);

  if (!Number.isFinite(amount)) return 0;

  return Math.round(amount);
};

const formatAmount = (value?: number | string | null): string => {
  return `${normalizeAmount(value).toLocaleString('fa-IR')} ریال`;
};

const getProjectFinance = (project: Project) => {
  const phaseSummary = project.phaseSummary;

  if (phaseSummary) {
    const revenue = normalizeAmount(
      phaseSummary.totalRealizedRevenue ?? phaseSummary.totalPotentialRevenue ?? phaseSummary.totalExpectedRevenue,
    );
    const expense = normalizeAmount(
      phaseSummary.totalRealizedExpense ?? phaseSummary.totalRealizedCost ?? phaseSummary.totalPotentialCost ?? phaseSummary.totalExpectedExpense,
    );

    return {
      revenue,
      expense,
      balance: revenue - expense,
    };
  }

  const totals = (project.phases || []).reduce(
    (acc, phase) => {
      const financial = phase.financial || {};

      acc.revenue += normalizeAmount(
        financial.realizedRevenueAmount ?? financial.realizedRevenue ?? financial.potentialRevenueAmount ?? financial.expectedRevenue,
      );
      acc.expense += normalizeAmount(
        financial.realizedCostAmount ?? financial.realizedExpense ?? financial.potentialCostAmount ?? financial.expectedExpense,
      );

      return acc;
    },
    { revenue: 0, expense: 0 },
  );

  return {
    ...totals,
    balance: totals.revenue - totals.expense,
  };
};

const getFinanceBalanceClass = (value: number): string => {
  if (value > 0) return 'text-success';
  if (value < 0) return 'text-error';

  return 'text-base-content/65';
};

const DashboardProjectsPage = () => {
  const { data: session } = useSession();
  const role = String(session?.user?.role || '').toLowerCase();
  const isManager = role === 'manager' || role === 'admin';

  const [projects, setProjects] = useState<Project[]>([]);
  const [importModalOpen, setImportModalOpen] = useState(false);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingPriorityId, setSavingPriorityId] = useState('');

  const activeProjectsCount = useMemo(() => {
    return projects.filter((project) => project.status === 'active').length;
  }, [projects]);

  const dueProjectsCount = useMemo(() => {
    return projects.filter(isProjectOverdue).length;
  }, [projects]);

  const teamMembersCount = useMemo(() => {
    const userIds = new Set<string>();

    projects.forEach((project) => {
      getProjectMembers(project).forEach((member) => {
        const userId = getReferenceId(getMemberUser(member));

        if (userId) {
          userIds.add(userId);
        }
      });
    });

    return userIds.size;
  }, [projects]);

  const staffingPendingCount = useMemo(() => {
    return projects.filter(isProjectStaffingPending).length;
  }, [projects]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await projectService.listProjects({
        page: 1,
        limit: PAGE_LIMIT,
        search: search || undefined,
        status: status || undefined,
        priority: priority || undefined,
      });

      setProjects(response.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در دریافت پروژه‌ها');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleDelete = async (project: Project) => {
    const confirmed = await confirmToast({
      title: `حذف پروژه «${project.title}»`,
      description: 'این عملیات پروژه را از لیست حذف می‌کند. قبل از تایید مطمئن شوید به اطلاعات وابسته نیاز ندارید.',
      confirmText: 'حذف پروژه',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      await projectService.deleteProject(getProjectId(project));
      await loadProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در حذف پروژه');
    }
  };

  const handlePriorityChange = async (project: Project, nextPriority: ProjectPriority) => {
    const projectId = getProjectId(project);

    if (!projectId || project.priority === nextPriority) return;

    try {
      setSavingPriorityId(projectId);
      const updatedProject = await projectService.updateProject(projectId, {
        priority: nextPriority,
      });

      setProjects((previous) =>
        previous.map((item) =>
          getProjectId(item) === projectId
            ? {
                ...item,
                priority: updatedProject.priority || nextPriority,
                priorityLabel:
                  updatedProject.priorityLabel || projectPriorityLabels[nextPriority] || nextPriority,
              }
            : item,
        ),
      );
      toast.success('اولویت پروژه بروزرسانی شد.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'خطا در ویرایش اولویت پروژه';

      setError(message);
      toast.error(message);
    } finally {
      setSavingPriorityId('');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" dir="rtl">
        <DashboardPageHeader
          eyebrow="فهرست پروژه‌ها"
          title="مدیریت پروژه‌ها"
          description="این صفحه فقط برای مرور و اقدام سریع روی پروژه‌هاست. جزئیات، اعضا، فازها و نمودارها در صفحه اختصاصی هر پروژه قرار گرفته‌اند."
          actions={
            <>
              <Link href="/dashboard/project-charts" className="btn btn-outline">
                <ChartBarIcon className="h-5 w-5" />
                نمودارها
              </Link>

              <Link href="/dashboard/calendar" className="btn btn-outline">
                <CalendarDaysIcon className="h-5 w-5" />
                تقویم
              </Link>

              {isManager ? (
                <>
                  <button
                    className="btn btn-outline"
                    onClick={() => setImportModalOpen(true)}
                    type="button"
                  >
                    <ArrowUpTrayIcon className="h-5 w-5" />
                    ورود از اکسل
                  </button>

                  <Link className="btn btn-primary" href="/dashboard/projects/define">
                    <PlusIcon className="h-5 w-5" />
                    پروژه جدید
                  </Link>
                </>
              ) : null}
            </>
          }
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <AdminStatCard
            title="کل پروژه‌ها"
            value={projects.length}
            description="پروژه‌های قابل مشاهده برای نقش فعلی"
            icon={FolderIcon}
            tone="neutral"
          />
          <AdminStatCard
            title="پروژه‌های فعال"
            value={activeProjectsCount}
            description="پروژه‌هایی که نیازمند پیگیری روزانه‌اند"
            icon={ChartBarIcon}
            tone="success"
          />
          <AdminStatCard
            title="عقب‌افتاده"
            value={dueProjectsCount}
            description="موعد تحویل گذشته و تکمیل نشده"
            icon={ExclamationTriangleIcon}
            tone={dueProjectsCount ? 'error' : 'success'}
          />
          <AdminStatCard
            title="کارشناسان درگیر"
            value={teamMembersCount}
            description="تعداد افراد یکتای عضو پروژه‌ها"
            icon={UserGroupIcon}
            tone="primary"
          />
          <AdminStatCard
            title="نیازمند تخصیص"
            value={staffingPendingCount}
            description="پروژه‌های بدون مسئول یا عضو مشخص"
            icon={UserGroupIcon}
            tone={staffingPendingCount ? 'warning' : 'success'}
          />
        </div>

        <FilterBar>
          <div className="grid gap-3 lg:grid-cols-5">
            <input
              className="input input-bordered bg-base-100 lg:col-span-2"
              placeholder="جستجو در عنوان یا توضیحات پروژه"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <select
              className="select select-bordered bg-base-100"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="">همه وضعیت‌ها</option>
              {Object.entries(projectStatusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <select
              className="select select-bordered bg-base-100"
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
            >
              <option value="">همه اولویت‌ها</option>
              {Object.entries(projectPriorityLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <button className="btn btn-neutral" onClick={loadProjects} type="button">
              <ArrowPathIcon className="h-5 w-5" />
              اعمال فیلتر
            </button>
          </div>
        </FilterBar>

        {error ? (
          <div className="alert alert-error">
            <span>{error}</span>
          </div>
        ) : null}

        <SectionCard
          title="لیست پروژه‌ها"
          description="هر پروژه در یک ردیف کامل نمایش داده می‌شود؛ اولویت قابل ویرایش است و درآمد/هزینه فازها با رنگ‌بندی مدیریتی نمایش داده می‌شود."
          actions={
            <span className="badge badge-outline">
              {projects.length} پروژه
            </span>
          }
        >
          {loading ? (
            <div className="flex justify-center py-16">
              <span className="loading loading-spinner loading-lg" />
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
              <div className="text-lg font-black text-base-content">
                هنوز پروژه‌ای برای نمایش وجود ندارد
              </div>
              <p className="mt-2 max-w-md text-sm leading-7 text-base-content/55">
                {isManager
                  ? 'برای شروع، یک پروژه ایجاد کنید یا فایل اکسل پروژه‌ها را وارد کنید.'
                  : 'فقط پروژه‌هایی که به شما تخصیص داده شده‌اند در این صفحه نمایش داده می‌شوند.'}
              </p>
              {isManager ? (
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  <button
                    className="btn btn-outline"
                    onClick={() => setImportModalOpen(true)}
                    type="button"
                  >
                    <ArrowUpTrayIcon className="h-5 w-5" />
                    ورود از اکسل
                  </button>

                  <Link className="btn btn-primary" href="/dashboard/projects/define">
                    <PlusIcon className="h-5 w-5" />
                    ایجاد اولین پروژه
                  </Link>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map((project) => {
                const projectId = getProjectId(project);
                const projectMembers = getProjectMembers(project);
                const overdue = isProjectOverdue(project);
                const staffingPending = isProjectStaffingPending(project);
                const ownerName = project.ownerId
                  ? getUserDisplayName(project.ownerId)
                  : 'تخصیص انجام نشده';
                const finance = getProjectFinance(project);

                return (
                  <div
                    key={projectId}
                    className="grid gap-4 rounded-2xl border border-base-300 bg-base-200/40 p-4 transition hover:border-primary/40 hover:bg-primary/5 xl:grid-cols-[minmax(260px,1.3fr)_150px_160px_240px_150px_170px_56px] xl:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/dashboard/projects/${projectId}`}
                          className="truncate text-base font-black text-base-content transition hover:text-primary"
                        >
                          {project.title}
                        </Link>

                        {overdue ? (
                          <SoftBadge className="bg-error/10 text-error">
                            <ExclamationTriangleIcon className="h-4 w-4" />
                            عقب‌افتاده
                          </SoftBadge>
                        ) : null}

                        {staffingPending ? (
                          <SoftBadge className="bg-warning/15 text-warning">
                            <UserGroupIcon className="h-4 w-4" />
                            تخصیص ناقص
                          </SoftBadge>
                        ) : null}
                      </div>

                      <p className="mt-1 line-clamp-1 text-xs leading-6 text-base-content/55">
                        {project.description || 'بدون توضیح'}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 xl:block">
                      <SoftBadge
                        className={
                          statusBadgeClass[project.status] ||
                          'bg-base-300 text-base-content/70'
                        }
                      >
                        {project.statusLabel || projectStatusLabels[project.status]}
                      </SoftBadge>
                    </div>

                    <div className="min-w-0">
                      {isManager ? (
                        <select
                          className="select select-bordered select-sm w-full bg-base-100 font-black"
                          value={project.priority}
                          disabled={savingPriorityId === projectId}
                          onChange={(event) => handlePriorityChange(project, event.target.value as ProjectPriority)}
                          aria-label="ویرایش اولویت پروژه"
                        >
                          {Object.entries(projectPriorityLabels).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <SoftBadge
                          className={
                            priorityBadgeClass[project.priority] ||
                            'bg-base-300 text-base-content/70'
                          }
                        >
                          {project.priorityLabel || projectPriorityLabels[project.priority]}
                        </SoftBadge>
                      )}
                    </div>

                    <div className="space-y-1 text-xs font-bold">
                      <div className="flex items-center justify-between gap-4 rounded-lg bg-success/10 px-3 py-1 text-success">
                        <span>درآمد</span>
                        <span>{formatAmount(finance.revenue)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 rounded-lg bg-error/10 px-3 py-1 text-error">
                        <span>هزینه</span>
                        <span>{formatAmount(finance.expense)}</span>
                      </div>
                      <div className={`flex items-center justify-between gap-4 rounded-lg bg-base-200 px-3 py-1 ${getFinanceBalanceClass(finance.balance)}`}>
                        <span>مانده</span>
                        <span>{formatAmount(finance.balance)}</span>
                      </div>
                    </div>

                    <div className="min-w-0 text-sm">
                      <div
                        className={`truncate font-bold ${
                          staffingPending ? 'text-warning' : 'text-base-content'
                        }`}
                      >
                        {ownerName}
                      </div>
                      <div className="text-xs text-base-content/50">
                        {projectMembers.length || project.assignedUserIds?.length || 0} عضو
                      </div>
                      {staffingPending && isManager ? (
                        <Link
                          href={`/dashboard/projects/${projectId}/edit`}
                          className="mt-1 inline-flex text-xs font-bold text-primary hover:underline"
                        >
                          تکمیل افراد و مسئولیت‌ها
                        </Link>
                      ) : null}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs xl:block xl:space-y-1">
                      <div>
                        <span className="text-base-content/45">شروع: </span>
                        <span className="font-bold text-base-content/80">
                          {formatDate(project.startDate)}
                        </span>
                      </div>
                      <div>
                        <span className="text-base-content/45">تحویل: </span>
                        <span className={overdue ? 'font-bold text-error' : 'font-bold text-base-content/80'}>
                          {formatDate(project.dueDate)}
                        </span>
                      </div>
                    </div>

                    <div className="dropdown dropdown-end justify-self-end">
                      <button type="button" className="btn btn-ghost btn-sm btn-square" tabIndex={0}>
                        <EllipsisVerticalIcon className="h-5 w-5" />
                      </button>
                      <ul
                        tabIndex={0}
                        className="menu dropdown-content z-[1] mt-2 w-44 rounded-2xl border border-base-300 bg-base-100 p-2 shadow-xl"
                      >
                        <li>
                          <Link href={`/dashboard/projects/${projectId}`}>
                            <EyeIcon className="h-4 w-4" />
                            مشاهده
                          </Link>
                        </li>

                        {isManager ? (
                          <>
                            <li>
                              <Link href={`/dashboard/projects/${projectId}/edit`}>
                                <PencilSquareIcon className="h-4 w-4" />
                                {staffingPending ? 'تکمیل تخصیص‌ها' : 'ویرایش'}
                              </Link>
                            </li>
                            <li>
                              <button
                                type="button"
                                className="text-error"
                                onClick={() => handleDelete(project)}
                              >
                                <TrashIcon className="h-4 w-4" />
                                حذف
                              </button>
                            </li>
                          </>
                        ) : null}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        <ProjectImportModal
          open={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          onImported={loadProjects}
        />
      </div>
    </DashboardLayout>
  );
};

export const getServerSideProps = withAuth();

export default DashboardProjectsPage;
