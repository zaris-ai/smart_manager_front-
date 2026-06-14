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
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

const PAGE_LIMIT = 20;

const statusBadgeClass: Record<ProjectStatus, string> = {
  planning: 'badge-info',
  active: 'badge-success',
  on_hold: 'badge-warning',
  completed: 'badge-primary',
  cancelled: 'badge-error',
};

const priorityBadgeClass: Record<string, string> = {
  low: 'badge-ghost',
  medium: 'badge-info',
  high: 'badge-warning',
  critical: 'badge-error',
};

const formatDate = (value?: string | null): string => {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('fa-IR').format(date);
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
    const now = new Date();

    return projects.filter((project) => {
      if (!project.dueDate) return false;

      const dueDate = new Date(project.dueDate);

      return project.status !== 'completed' && dueDate < now;
    }).length;
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
              پروژه‌ها، کاربران مسئول، وظایف، فایل‌ها و یادداشت‌های پیشرفت را مدیریت کنید.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
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

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-900">
            <div className="text-sm text-gray-500">کل پروژه‌ها</div>
            <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
              {projects.length}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-900">
            <div className="text-sm text-gray-500">پروژه‌های فعال</div>
            <div className="mt-2 text-3xl font-bold text-success">
              {activeProjectsCount}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-900">
            <div className="text-sm text-gray-500">پروژه‌های عقب‌افتاده</div>
            <div className="mt-2 text-3xl font-bold text-error">
              {dueProjectsCount}
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-900">
          <div className="grid gap-3 lg:grid-cols-5">
            <input
              className="input input-bordered lg:col-span-2"
              placeholder="جستجو در عنوان یا توضیحات پروژه"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <select
              className="select select-bordered"
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
              className="select select-bordered"
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

        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm dark:bg-gray-900">
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
            <table className="table">
              <thead>
                <tr>
                  <th>پروژه</th>
                  <th>وضعیت</th>
                  <th>اولویت</th>
                  <th>زمان‌بندی</th>
                  <th>کاربران</th>
                  <th className="text-left">عملیات</th>
                </tr>
              </thead>

              <tbody>
                {projects.map((project) => (
                  <tr key={getProjectId(project)}>
                    <td>
                      <Link
                        href={`/dashboard/projects/${getProjectId(project)}`}
                        className="font-bold text-gray-900 hover:text-primary dark:text-gray-100"
                      >
                        {project.title}
                      </Link>
                      <div className="mt-1 max-w-md truncate text-xs text-gray-500">
                        {project.description || 'بدون توضیح'}
                      </div>
                    </td>

                    <td>
                      <span
                        className={`badge ${statusBadgeClass[project.status] || 'badge-neutral'}`}
                      >
                        {project.statusLabel || projectStatusLabels[project.status]}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`badge ${priorityBadgeClass[project.priority] || 'badge-neutral'}`}
                      >
                        {project.priorityLabel || projectPriorityLabels[project.priority]}
                      </span>
                    </td>

                    <td>
                      <div className="text-xs text-gray-600 dark:text-gray-300">
                        شروع: {formatDate(project.startDate)}
                      </div>
                      <div className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                        تحویل: {formatDate(project.dueDate)}
                      </div>
                    </td>

                    <td>
                      <div className="flex max-w-xs flex-wrap gap-1">
                        {project.assignedUserIds?.length ? (
                          project.assignedUserIds.slice(0, 3).map((user) => (
                            <span
                              key={getReferenceId(user)}
                              className="badge badge-outline"
                            >
                              {getUserDisplayName(user)}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-500">
                            کاربری تخصیص داده نشده
                          </span>
                        )}

                        {project.assignedUserIds?.length > 3 ? (
                          <span className="badge badge-ghost">
                            +{project.assignedUserIds.length - 3}
                          </span>
                        ) : null}
                      </div>
                    </td>

                    <td>
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/dashboard/projects/${getProjectId(project)}`}
                          className="btn btn-primary btn-xs"
                        >
                          مشاهده
                        </Link>

                        {isManager ? (
                          <>
                            <button
                              className="btn btn-warning btn-xs"
                              onClick={() => openEditModal(project)}
                            >
                              <PencilSquareIcon className="h-4 w-4" />
                              ویرایش
                            </button>

                            <button
                              className="btn btn-error btn-xs"
                              onClick={() => handleDelete(project)}
                            >
                              <TrashIcon className="h-4 w-4" />
                              حذف
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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