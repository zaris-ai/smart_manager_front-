import ShamsiDateInput from '@/components/common/ShamsiDateInput';
import { DashboardLayout } from '@/components/layouts';
import { PhaseUserSearchPicker } from '@/components/projects';
import { projectService } from '@/services/project.service';
import { userService } from '@/services/user.service';
import {
  getPhaseId,
  getProjectId,
  getReferenceId,
  getUserDisplayName,
  isManagerUser,
  Project,
  ProjectPayload,
  ProjectPhase,
  ProjectPhasePayload,
  ProjectPriority,
  projectPriorityLabels,
  ProjectStatus,
  projectStatusLabels,
} from '@/types/project';
import { AppUser } from '@/types/user';
import { withAuth } from '@/utils';
import { compareDateValues } from '@/utils/shamsi-date';
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  TrashIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FormEvent, useEffect, useMemo, useState } from 'react';

const statusOptions = Object.keys(projectStatusLabels) as ProjectStatus[];
const priorityOptions = Object.keys(projectPriorityLabels) as ProjectPriority[];

type PhaseDraft = {
  localId: string;
  persistedId: string;
  title: string;
  description: string;
  assignedUserIds: string[];
  startDate: string;
  endDate: string;
  potentialRevenueAmount: string;
  potentialCostAmount: string;
  realizedRevenueAmount: string;
  realizedCostAmount: string;
  financialNote: string;
};

const createPhaseDraft = (index: number): PhaseDraft => ({
  localId: `new-${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`,
  persistedId: '',
  title: index === 0 ? 'فاز ۱' : `فاز ${index + 1}`,
  description: '',
  assignedUserIds: [],
  startDate: '',
  endDate: '',
  potentialRevenueAmount: '',
  potentialCostAmount: '',
  realizedRevenueAmount: '0',
  realizedCostAmount: '0',
  financialNote: '',
});


const getUserId = (user: AppUser): string => {
  return user.id || user._id || '';
};


const phaseToDraft = (phase: ProjectPhase, index: number): PhaseDraft => {
  const phaseId = getPhaseId(phase);

  return {
    localId: phaseId || `loaded-${index}`,
    persistedId: phaseId,
    title: phase.title || `فاز ${index + 1}`,
    description: phase.description || '',
    assignedUserIds: (phase.assignedUserIds || [])
      .map((user) => getReferenceId(user))
      .filter(Boolean),
    startDate: phase.startDate || '',
    endDate: phase.endDate || '',
    potentialRevenueAmount: String(
      phase.financial?.potentialRevenueAmount ?? phase.financial?.expectedRevenue ?? 0,
    ),
    potentialCostAmount: String(
      phase.financial?.potentialCostAmount ?? phase.financial?.expectedExpense ?? 0,
    ),
    realizedRevenueAmount: String(
      phase.financial?.realizedRevenueAmount ?? phase.financial?.realizedRevenue ?? 0,
    ),
    realizedCostAmount: String(
      phase.financial?.realizedCostAmount ?? phase.financial?.realizedExpense ?? 0,
    ),
    financialNote: phase.financial?.note || '',
  };
};

const DashboardProjectEditPage = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const projectId = typeof router.query.id === 'string' ? router.query.id : '';
  const role = String(session?.user?.role || '').toLowerCase();
  const canEditProject = role === 'manager' || role === 'admin';

  const [users, setUsers] = useState<AppUser[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('planning');
  const [priority, setPriority] = useState<ProjectPriority>('medium');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [phases, setPhases] = useState<PhaseDraft[]>([]);

  const loadWorkspace = async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      setError('');

      const [projectResponse, usersResponse] = await Promise.all([
        projectService.getProject(projectId),
        userService.listUsers({ isActive: true, limit: 100 }),
      ]);

      setProject(projectResponse);
      setUsers(usersResponse || []);
      setTitle(projectResponse.title || '');
      setDescription(projectResponse.description || '');
      setStatus(projectResponse.status || 'planning');
      setPriority(projectResponse.priority || 'medium');
      setStartDate(projectResponse.startDate || '');
      setDueDate(projectResponse.dueDate || '');
      setOwnerId(getReferenceId(projectResponse.ownerId));
      setPhases(
        projectResponse.phases?.length
          ? projectResponse.phases.map(phaseToDraft)
          : [createPhaseDraft(0)],
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در دریافت اطلاعات پروژه');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!router.isReady) return;

    loadWorkspace();
  }, [router.isReady, projectId]);

  const activeUsers = useMemo(() => {
    return users.filter((user) => user.isActive !== false);
  }, [users]);

  const ownerOptions = useMemo(() => {
    const managers = activeUsers.filter((user) => isManagerUser(user as any));

    return managers.length ? managers : activeUsers;
  }, [activeUsers]);

  const assignedPhaseUserCount = useMemo(() => {
    return new Set(phases.flatMap((phase) => phase.assignedUserIds)).size;
  }, [phases]);

  const hasIncompleteAssignments = useMemo(() => {
    if (!project) return false;

    return !ownerId || phases.some((phase) => !phase.assignedUserIds.length);
  }, [ownerId, phases, project]);

  const updatePhase = <K extends keyof PhaseDraft>(
    localId: string,
    key: K,
    value: PhaseDraft[K],
  ) => {
    setPhases((previous) =>
      previous.map((phase) =>
        phase.localId === localId
          ? {
              ...phase,
              [key]: value,
            }
          : phase,
      ),
    );
  };

  const togglePhaseAssignee = (localId: string, userId: string) => {
    setPhases((previous) =>
      previous.map((phase) => {
        if (phase.localId !== localId) return phase;

        const exists = phase.assignedUserIds.includes(userId);

        return {
          ...phase,
          assignedUserIds: exists
            ? phase.assignedUserIds.filter((item) => item !== userId)
            : [...phase.assignedUserIds, userId],
        };
      }),
    );
  };

  const addPhase = () => {
    setPhases((previous) => [...previous, createPhaseDraft(previous.length)]);
  };

  const removePhase = (localId: string) => {
    setPhases((previous) => {
      if (previous.length === 1) return previous;

      return previous.filter((phase) => phase.localId !== localId);
    });
  };

  const validateForm = (): string | null => {
    if (!canEditProject) return 'شما دسترسی لازم برای ویرایش پروژه را ندارید.';
    if (!title.trim()) return 'عنوان پروژه الزامی است.';
    if (!ownerId) return 'مسئول پروژه الزامی است.';
    if (!startDate) return 'تاریخ شروع پروژه الزامی است.';
    if (dueDate && compareDateValues(dueDate, startDate) < 0) {
      return 'موعد تحویل پروژه نمی‌تواند قبل از تاریخ شروع باشد.';
    }
    if (!phases.length) return 'حداقل یک فاز برای پروژه تعریف کنید.';

    for (let index = 0; index < phases.length; index += 1) {
      const phase = phases[index];
      const phaseNumber = index + 1;

      if (!phase.title.trim()) return `عنوان فاز ${phaseNumber} الزامی است.`;
      if (!phase.startDate || !phase.endDate) {
        return `تاریخ شروع و پایان فاز ${phaseNumber} الزامی است.`;
      }
      if (compareDateValues(phase.endDate, phase.startDate) < 0) {
        return `تاریخ پایان فاز ${phaseNumber} نمی‌تواند قبل از تاریخ شروع باشد.`;
      }
      if (!phase.assignedUserIds.length) {
        return `برای فاز ${phaseNumber} حداقل یک مسئول انتخاب کنید.`;
      }
    }

    return null;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      setError('');

      const phasePayloads: ProjectPhasePayload[] = phases.map((phase) => ({
        id: phase.persistedId || undefined,
        _id: phase.persistedId || undefined,
        title: phase.title.trim(),
        description: phase.description.trim(),
        assignedUserIds: phase.assignedUserIds,
        startDate: phase.startDate,
        endDate: phase.endDate,
        financial: {
          potentialRevenueAmount: Number(phase.potentialRevenueAmount || 0),
          potentialCostAmount: Number(phase.potentialCostAmount || 0),
          realizedRevenueAmount: Number(phase.realizedRevenueAmount || 0),
          realizedCostAmount: Number(phase.realizedCostAmount || 0),
          currency: 'IRR',
          note: phase.financialNote || '',
        },
      }));

      const assignedUserIds = Array.from(
        new Set([
          ownerId,
          ...phasePayloads.flatMap((phase) => phase.assignedUserIds),
        ]),
      ).filter(Boolean);

      const payload: ProjectPayload = {
        title: title.trim(),
        description: description.trim(),
        status,
        priority,
        startDate,
        dueDate: dueDate || null,
        ownerId,
        assignedUserIds,
        phases: phasePayloads,
      };

      const updatedProject = await projectService.updateProject(projectId, payload);
      const updatedProjectId = getProjectId(updatedProject) || projectId;

      await router.push(`/dashboard/projects/${updatedProjectId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ویرایش پروژه');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-24" dir="rtl">
          <span className="loading loading-spinner loading-lg" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6" dir="rtl">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <Link
              href={projectId ? `/dashboard/projects/${projectId}` : '/dashboard/projects'}
              className="mb-3 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              بازگشت به جزئیات پروژه
            </Link>

            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              ویرایش پروژه
            </h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-500 dark:text-gray-400">
              اطلاعات اصلی را ویرایش و مسئول پروژه و مسئولان هر فاز را از میان کاربران فعال انتخاب کنید.
            </p>
          </div>
        </div>

        {error ? (
          <div className="alert alert-error">
            <ExclamationTriangleIcon className="h-5 w-5" />
            <span>{error}</span>
          </div>
        ) : null}

        {!canEditProject ? (
          <div className="alert alert-warning">
            فقط مدیران می‌توانند پروژه را ویرایش کنند.
          </div>
        ) : null}

        {canEditProject && hasIncompleteAssignments ? (
          <div className="alert alert-info items-start">
            <UserGroupIcon className="h-6 w-6 shrink-0" />
            <div>
              <h2 className="font-black">مرحله تکمیل تخصیص‌های پروژه</h2>
              <p className="mt-1 text-sm leading-7">
                اطلاعات پروژه و فازها از اکسل وارد شده‌اند، اما افراد عمداً در فایل ثبت نمی‌شوند.
                مسئول پروژه و حداقل یک مسئول برای هر فاز انتخاب کنید. پس از ذخیره، نقش دقیق اعضا
                از تب «اعضا» در صفحه جزئیات پروژه قابل تنظیم است.
              </p>
            </div>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ClipboardDocumentListIcon className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900 dark:text-gray-100">
                    اطلاعات اصلی پروژه
                  </h2>
                  <p className="text-xs text-gray-500">
                    تاریخ‌ها در فرم به صورت شمسی وارد می‌شوند.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <label className="form-control lg:col-span-2">
                  <span className="label label-text font-semibold">عنوان پروژه</span>
                  <input
                    className="input input-bordered bg-white dark:bg-gray-950"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    required
                  />
                </label>

                <label className="form-control lg:col-span-2">
                  <span className="label label-text font-semibold">توضیحات پروژه</span>
                  <textarea
                    className="textarea textarea-bordered min-h-28 bg-white dark:bg-gray-950"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                  />
                </label>

                <label className="form-control">
                  <span className="label label-text font-semibold">مسئول پروژه</span>
                  <select
                    className="select select-bordered bg-white dark:bg-gray-950"
                    value={ownerId}
                    onChange={(event) => setOwnerId(event.target.value)}
                    required
                  >
                    <option value="">انتخاب مسئول پروژه</option>
                    {ownerOptions.map((user) => (
                      <option key={getUserId(user)} value={getUserId(user)}>
                        {getUserDisplayName(user as any)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="form-control">
                  <span className="label label-text font-semibold">وضعیت پروژه</span>
                  <select
                    className="select select-bordered bg-white dark:bg-gray-950"
                    value={status}
                    onChange={(event) => setStatus(event.target.value as ProjectStatus)}
                  >
                    {statusOptions.map((item) => (
                      <option key={item} value={item}>
                        {projectStatusLabels[item]}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="form-control">
                  <span className="label label-text font-semibold">اولویت پروژه</span>
                  <select
                    className="select select-bordered bg-white dark:bg-gray-950"
                    value={priority}
                    onChange={(event) => setPriority(event.target.value as ProjectPriority)}
                  >
                    {priorityOptions.map((item) => (
                      <option key={item} value={item}>
                        {projectPriorityLabels[item]}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <ShamsiDateInput
                    label="تاریخ شروع"
                    value={startDate}
                    onChange={setStartDate}
                    required
                  />

                  <ShamsiDateInput
                    label="موعد تحویل"
                    value={dueDate}
                    onChange={setDueDate}
                  />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-center">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    <CalendarDaysIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900 dark:text-gray-100">
                      فازهای پروژه
                    </h2>
                    <p className="text-xs text-gray-500">
                      می‌توانید فاز جدید اضافه کنید یا فازهای قبلی را ویرایش کنید.
                    </p>
                  </div>
                </div>

                <button type="button" className="btn btn-outline btn-sm" onClick={addPhase}>
                  <PlusIcon className="h-4 w-4" />
                  افزودن فاز
                </button>
              </div>

              <div className="space-y-4">
                {phases.map((phase, index) => {

                  return (
                    <div
                      key={phase.localId}
                      className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950"
                    >
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-bold text-primary">
                            فاز {index + 1}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs text-error"
                            disabled={phases.length === 1}
                            onClick={() => removePhase(phase.localId)}
                          >
                            <TrashIcon className="h-4 w-4" />
                            حذف
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-4 lg:grid-cols-2">
                        <label className="form-control">
                          <span className="label label-text font-semibold">عنوان فاز</span>
                          <input
                            className="input input-bordered bg-white dark:bg-gray-900"
                            value={phase.title}
                            onChange={(event) => updatePhase(phase.localId, 'title', event.target.value)}
                            required
                          />
                        </label>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <ShamsiDateInput
                            label="شروع فاز"
                            value={phase.startDate}
                            onChange={(value) => updatePhase(phase.localId, 'startDate', value)}
                            inputClassName="dark:bg-gray-900"
                            required
                          />

                          <ShamsiDateInput
                            label="پایان فاز"
                            value={phase.endDate}
                            onChange={(value) => updatePhase(phase.localId, 'endDate', value)}
                            inputClassName="dark:bg-gray-900"
                            required
                          />

                          <label className="form-control">
                            <span className="label label-text font-semibold">درآمد پیش‌بینی‌شده فاز</span>
                            <input
                              type="number"
                              min="0"
                              className="input input-bordered bg-white dark:bg-gray-900"
                              value={phase.potentialRevenueAmount}
                              onChange={(event) => updatePhase(phase.localId, 'potentialRevenueAmount', event.target.value)}
                              placeholder="مثلاً 50000000"
                            />
                          </label>

                          <label className="form-control">
                            <span className="label label-text font-semibold">هزینه پیش‌بینی‌شده فاز</span>
                            <input
                              type="number"
                              min="0"
                              className="input input-bordered bg-white dark:bg-gray-900"
                              value={phase.potentialCostAmount}
                              onChange={(event) => updatePhase(phase.localId, 'potentialCostAmount', event.target.value)}
                              placeholder="مثلاً 20000000"
                            />
                          </label>

                          <label className="form-control">
                            <span className="label label-text font-semibold">درآمد واقعی فاز</span>
                            <input
                              type="number"
                              min="0"
                              className="input input-bordered bg-white dark:bg-gray-900"
                              value={phase.realizedRevenueAmount}
                              onChange={(event) => updatePhase(phase.localId, 'realizedRevenueAmount', event.target.value)}
                              placeholder="مثلاً 30000000"
                            />
                          </label>

                          <label className="form-control">
                            <span className="label label-text font-semibold">هزینه واقعی فاز</span>
                            <input
                              type="number"
                              min="0"
                              className="input input-bordered bg-white dark:bg-gray-900"
                              value={phase.realizedCostAmount}
                              onChange={(event) => updatePhase(phase.localId, 'realizedCostAmount', event.target.value)}
                              placeholder="مثلاً 10000000"
                            />
                          </label>
                        </div>

                        <label className="form-control lg:col-span-2">
                          <span className="label label-text font-semibold">توضیحات فاز</span>
                          <textarea
                            className="textarea textarea-bordered min-h-20 bg-white dark:bg-gray-900"
                            value={phase.description}
                            onChange={(event) => updatePhase(phase.localId, 'description', event.target.value)}
                          />
                        </label>

                        <label className="form-control lg:col-span-2">
                          <span className="label label-text font-semibold">توضیح مالی ساده فاز</span>
                          <textarea
                            className="textarea textarea-bordered min-h-16 bg-white dark:bg-gray-900"
                            value={phase.financialNote}
                            onChange={(event) => updatePhase(phase.localId, 'financialNote', event.target.value)}
                            placeholder="مثلاً درآمد این فاز بعد از تایید کارفرما ثبت می‌شود."
                          />
                        </label>

                        <div className="lg:col-span-2">
                          <PhaseUserSearchPicker
                            users={activeUsers}
                            selectedUserIds={phase.assignedUserIds}
                            onToggle={(userId) => togglePhaseAssignee(phase.localId, userId)}
                            title="مسئولان فاز"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          <aside className="space-y-4">
            <div className="sticky top-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-4 flex items-center gap-2">
                <UserGroupIcon className="h-5 w-5 text-primary" />
                <h2 className="font-bold text-gray-900 dark:text-gray-100">
                  خلاصه فازها
                </h2>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 dark:bg-gray-950">
                  <span className="text-gray-500">تعداد فاز</span>
                  <span className="font-bold">{phases.length}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-blue-50 px-3 py-2 text-blue-700 dark:bg-blue-950/30 dark:text-blue-200">
                  <span>تعداد افراد مسئول</span>
                  <span className="font-bold">{assignedPhaseUserCount}</span>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary mt-5 w-full"
                disabled={saving || !canEditProject}
              >
                {saving ? 'در حال ذخیره...' : 'ذخیره تغییرات پروژه'}
              </button>

              {project ? (
                <Link
                  href={`/dashboard/projects/${getProjectId(project)}`}
                  className="btn btn-ghost mt-2 w-full"
                >
                  انصراف
                </Link>
              ) : null}
            </div>
          </aside>
        </form>
      </div>
    </DashboardLayout>
  );
};

export const getServerSideProps = withAuth();

export default DashboardProjectEditPage;
