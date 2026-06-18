// src/pages/dashboard/projects/index.tsx

import { DashboardLayout } from '@/components/layouts';
import { ProjectFormModal, ProjectImportModal } from '@/components/projects';
import { projectService } from '@/services/project.service';
import {
  getProjectId,
  getReferenceId,
  getUserDisplayName,
  Project,
  projectPriorityLabels,
  ProjectStatus,
  projectStatusLabels,
} from '@/types/project';
import { withAuth } from '@/utils';
import {
  ArrowPathIcon,
  ArrowUpTrayIcon,
  CalendarDaysIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

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

const getInitials = (name: string): string => {
  const cleanName = name.trim();

  if (!cleanName) return '؟';

  return cleanName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('');
};

const DashboardProjectsPage = () => {
  const { data: session } = useSession();
  const role = String(session?.user?.role || '').toLowerCase();
  const isManager = role === 'manager' || role === 'admin';

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  const openCreateModal = () => {
    setSelectedProject(null);
    setFormModalOpen(true);
  };

  const openEditModal = (project: Project) => {
    setSelectedProject(project);
    setFormModalOpen(true);
  };

  const handleDelete = async (project: Project) => {
    const confirmed = window.confirm(
      `آیا از حذف پروژه «${project.title}» مطمئن هستید؟`,
    );

    if (!confirmed) return;

    try {
      await projectService.deleteProject(getProjectId(project));
      await loadProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در حذف پروژه');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" dir="rtl">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              مدیریت پروژه‌ها
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              پروژه‌ها، نقش اعضا، زمان‌بندی، وظایف، فایل‌ها و یادداشت‌های پیشرفت را مدیریت کنید.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href="/dashboard/project-overview" className="btn btn-outline">
              <UserGroupIcon className="h-5 w-5" />
              نمای کلان
            </Link>

            <Link href="/dashboard/calendar" className="btn btn-outline">
              <CalendarDaysIcon className="h-5 w-5" />
              تقویم پروژه‌ها
            </Link>

            {isManager ? (
              <>
                <button
                  className="btn btn-outline"
                  onClick={() => setImportModalOpen(true)}
                >
                  <ArrowUpTrayIcon className="h-5 w-5" />
                  ورود از اکسل
                </button>

                <button className="btn btn-primary" onClick={openCreateModal}>
                  <PlusIcon className="h-5 w-5" />
                  پروژه جدید
                </button>
              </>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-gray-900">
            <div className="text-sm text-gray-500">کل پروژه‌ها</div>
            <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
              {projects.length}
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm dark:border-emerald-950 dark:bg-gray-900">
            <div className="text-sm text-gray-500">پروژه‌های فعال</div>
            <div className="mt-2 text-3xl font-bold text-emerald-600">
              {activeProjectsCount}
            </div>
          </div>

          <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm dark:border-rose-950 dark:bg-gray-900">
            <div className="text-sm text-gray-500">پروژه‌های عقب‌افتاده</div>
            <div className="mt-2 text-3xl font-bold text-rose-600">
              {dueProjectsCount}
            </div>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm dark:border-blue-950 dark:bg-gray-900">
            <div className="text-sm text-gray-500">کارشناسان درگیر</div>
            <div className="mt-2 text-3xl font-bold text-blue-600">
              {teamMembersCount}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-gray-900">
          <div className="grid gap-3 lg:grid-cols-5">
            <input
              className="input input-bordered bg-white lg:col-span-2 dark:bg-gray-950"
              placeholder="جستجو در عنوان یا توضیحات پروژه"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <select
              className="select select-bordered bg-white dark:bg-gray-950"
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
              className="select select-bordered bg-white dark:bg-gray-950"
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

            <button className="btn btn-neutral" onClick={loadProjects}>
              <ArrowPathIcon className="h-5 w-5" />
              اعمال فیلتر
            </button>
          </div>
        </div>

        {error ? (
          <div className="alert alert-error">
            <span>{error}</span>
          </div>
        ) : null}

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-gray-900">
          {loading ? (
            <div className="flex justify-center py-16">
              <span className="loading loading-spinner loading-lg" />
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
              <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                هنوز پروژه‌ای برای نمایش وجود ندارد
              </div>
              <p className="mt-2 max-w-md text-sm text-gray-500">
                {isManager
                  ? 'برای شروع، یک پروژه ایجاد کنید یا فایل اکسل پروژه‌ها را وارد کنید.'
                  : 'فقط پروژه‌هایی که به شما تخصیص داده شده‌اند در این صفحه نمایش داده می‌شوند.'}
              </p>
              {isManager ? (
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  <button
                    className="btn btn-outline"
                    onClick={() => setImportModalOpen(true)}
                  >
                    <ArrowUpTrayIcon className="h-5 w-5" />
                    ورود از اکسل
                  </button>

                  <button className="btn btn-primary" onClick={openCreateModal}>
                    <PlusIcon className="h-5 w-5" />
                    ایجاد اولین پروژه
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {projects.map((project) => {
                const projectId = getProjectId(project);
                const projectMembers = getProjectMembers(project);
                const overdue = isProjectOverdue(project);

                return (
                  <div
                    key={projectId}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-5 transition hover:border-blue-200 hover:bg-blue-50/40 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-blue-900 dark:hover:bg-blue-950/20"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/dashboard/projects/${projectId}`}
                            className="text-lg font-black text-gray-900 transition hover:text-primary dark:text-gray-100"
                          >
                            {project.title}
                          </Link>

                          {overdue ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-200">
                              <ExclamationTriangleIcon className="h-4 w-4" />
                              عقب‌افتاده
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-2 line-clamp-2 max-w-2xl text-sm leading-7 text-gray-500 dark:text-gray-400">
                          {project.description || 'بدون توضیح'}
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${
                            statusBadgeClass[project.status] ||
                            'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {project.statusLabel ||
                            projectStatusLabels[project.status]}
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${
                            priorityBadgeClass[project.priority] ||
                            'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {project.priorityLabel ||
                            projectPriorityLabels[project.priority]}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-gray-900">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                          <ClockIcon className="h-5 w-5 text-blue-500" />
                          زمان‌بندی پروژه
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                            <div className="text-slate-400">شروع</div>
                            <div className="mt-1 font-bold text-slate-800 dark:text-slate-100">
                              {formatDate(project.startDate)}
                            </div>
                          </div>

                          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                            <div className="text-slate-400">تحویل</div>
                            <div
                              className={`mt-1 font-bold ${
                                overdue
                                  ? 'text-rose-600 dark:text-rose-300'
                                  : 'text-slate-800 dark:text-slate-100'
                              }`}
                            >
                              {formatDate(project.dueDate)}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-gray-900">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                            <UserGroupIcon className="h-5 w-5 text-blue-500" />
                            تیم و نقش‌ها
                          </div>

                          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 dark:bg-blue-950 dark:text-blue-200">
                            {projectMembers.length ||
                              project.assignedUserIds?.length ||
                              0}{' '}
                            نفر
                          </span>
                        </div>

                        <div className="mt-3 space-y-2">
                          {projectMembers.length ? (
                            <>
                              {projectMembers.slice(0, 4).map((member, index) => {
                                const user = getMemberUser(member);
                                const userId =
                                  getReferenceId(user) || `${projectId}-${index}`;
                                const displayName = getUserDisplayName(user);
                                const roleTitle =
                                  member.roleInProject || 'عضو پروژه';

                                return (
                                  <div
                                    key={userId}
                                    className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950"
                                  >
                                    <div className="flex min-w-0 items-center gap-3">
                                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-xs font-black text-white">
                                        {getInitials(displayName)}
                                      </div>

                                      <div className="min-w-0">
                                        <div className="truncate text-sm font-black text-slate-900 dark:text-white">
                                          {displayName}
                                        </div>
                                        <div className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                                          {roleTitle}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="shrink-0 text-left text-[11px] leading-5 text-slate-400">
                                      <div>شروع: {formatDate(member.startedAt)}</div>
                                      <div>
                                        پایان: {formatDate(member.expectedFinishedAt)}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}

                              {projectMembers.length > 4 ? (
                                <div className="rounded-2xl border border-dashed border-slate-200 px-3 py-2 text-center text-xs font-bold text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                  +{projectMembers.length - 4} عضو دیگر در جزئیات پروژه
                                </div>
                              ) : null}
                            </>
                          ) : project.assignedUserIds?.length ? (
                            <div className="flex flex-wrap gap-2">
                              {project.assignedUserIds.slice(0, 5).map((user) => (
                                <span
                                  key={getReferenceId(user)}
                                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                >
                                  {getUserDisplayName(user)}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-center text-xs text-gray-500 dark:border-slate-700">
                              هنوز عضوی برای این پروژه تعریف نشده است.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
                      <Link
                        href={`/dashboard/projects/${projectId}`}
                        className="btn btn-primary btn-sm"
                      >
                        <EyeIcon className="h-4 w-4" />
                        مشاهده
                      </Link>

                      {isManager ? (
                        <>
                          <button
                            className="btn btn-warning btn-sm"
                            onClick={() => openEditModal(project)}
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                            ویرایش
                          </button>

                          <button
                            className="btn btn-error btn-sm"
                            onClick={() => handleDelete(project)}
                          >
                            <TrashIcon className="h-4 w-4" />
                            حذف
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <ProjectFormModal
          open={formModalOpen}
          project={selectedProject}
          onClose={() => setFormModalOpen(false)}
          onSaved={loadProjects}
        />

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