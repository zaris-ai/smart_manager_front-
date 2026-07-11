import ShamsiDateInput from '@/components/common/ShamsiDateInput';
import {
  DashboardPageHeader,
  SectionCard,
} from '@/components/common';
import { DashboardLayout } from '@/components/layouts';
import { PhaseUserSearchPicker } from '@/components/projects';
import { projectService } from '@/services/project.service';
import { userService } from '@/services/user.service';
import {
  getProjectId,
  getUserDisplayName,
  isManagerUser,
  ProjectPayload,
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
  BanknotesIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { FormEvent, useEffect, useMemo, useState } from 'react';

const statusOptions = Object.keys(projectStatusLabels) as ProjectStatus[];
const priorityOptions = Object.keys(projectPriorityLabels) as ProjectPriority[];

type PhaseDraft = {
  localId: string;
  title: string;
  description: string;
  assignedUserIds: string[];
  startDate: string;
  endDate: string;
  potentialRevenueAmount: string;
  potentialCostAmount: string;
};

const makeLocalId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const createPhaseDraft = (index: number): PhaseDraft => ({
  localId: makeLocalId(),
  title: `فاز ${index + 1}`,
  description: '',
  assignedUserIds: [],
  startDate: '',
  endDate: '',
  potentialRevenueAmount: '',
  potentialCostAmount: '',
});

const getUserId = (user: AppUser): string => user.id || user._id || '';

const formatAmount = (value: string): string => {
  const amount = Number(value || 0);

  if (!amount) return '—';

  return new Intl.NumberFormat('fa-IR').format(amount);
};

const DashboardProjectDefinitionPage = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const role = String(session?.user?.role || '').toLowerCase();
  const canCreateProject = role === 'manager' || role === 'admin';

  const [users, setUsers] = useState<AppUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('planning');
  const [priority, setPriority] = useState<ProjectPriority>('medium');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [phases, setPhases] = useState<PhaseDraft[]>([createPhaseDraft(0)]);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoadingUsers(true);
        setError('');

        const items = await userService.listUsers({ isActive: true, limit: 200 });
        const activeItems = items.filter((user) => user.isActive !== false);

        setUsers(activeItems);

        const firstManager = activeItems.find((user) => isManagerUser(user as any));
        const fallbackUser = firstManager || activeItems[0];

        if (fallbackUser) {
          setOwnerId(getUserId(fallbackUser));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'خطا در دریافت کاربران');
      } finally {
        setLoadingUsers(false);
      }
    };

    loadUsers();
  }, []);

  const ownerOptions = useMemo(() => {
    const managers = users.filter((user) => isManagerUser(user as any));

    return managers.length ? managers : users;
  }, [users]);

  const assignedPhaseUserCount = useMemo(() => {
    return new Set(phases.flatMap((phase) => phase.assignedUserIds)).size;
  }, [phases]);

  const totalPotentialRevenue = useMemo(() => {
    return phases.reduce((sum, phase) => sum + Number(phase.potentialRevenueAmount || 0), 0);
  }, [phases]);

  const totalPotentialCost = useMemo(() => {
    return phases.reduce((sum, phase) => sum + Number(phase.potentialCostAmount || 0), 0);
  }, [phases]);

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

  const addPhase = () => {
    setPhases((previous) => [...previous, createPhaseDraft(previous.length)]);
  };

  const removePhase = (localId: string) => {
    setPhases((previous) => {
      if (previous.length === 1) return previous;

      return previous.filter((phase) => phase.localId !== localId);
    });
  };

  const togglePhaseUser = (localId: string, userId: string) => {
    setPhases((previous) =>
      previous.map((phase) => {
        if (phase.localId !== localId) return phase;

        const assignedUserIds = phase.assignedUserIds.includes(userId)
          ? phase.assignedUserIds.filter((item) => item !== userId)
          : [...phase.assignedUserIds, userId];

        return {
          ...phase,
          assignedUserIds,
        };
      }),
    );
  };

  const validateForm = (): string => {
    if (!title.trim()) return 'عنوان پروژه الزامی است.';
    if (!ownerId) return 'مسئول پروژه را انتخاب کنید.';
    if (!startDate) return 'تاریخ شروع پروژه الزامی است.';
    if (dueDate && compareDateValues(dueDate, startDate) < 0) {
      return 'موعد تحویل پروژه نمی‌تواند قبل از تاریخ شروع باشد.';
    }
    if (!phases.length) return 'حداقل یک فاز برای پروژه تعریف کنید.';

    for (let index = 0; index < phases.length; index += 1) {
      const phase = phases[index];
      const phaseNumber = index + 1;

      if (!phase.title.trim()) return `عنوان فاز ${phaseNumber} الزامی است.`;
      if (!phase.startDate) return `تاریخ شروع فاز ${phaseNumber} الزامی است.`;
      if (!phase.endDate) return `تاریخ پایان فاز ${phaseNumber} الزامی است.`;
      if (compareDateValues(phase.endDate, phase.startDate) < 0) {
        return `تاریخ پایان فاز ${phaseNumber} نمی‌تواند قبل از تاریخ شروع باشد.`;
      }
      if (!phase.assignedUserIds.length) {
        return `برای فاز ${phaseNumber} حداقل یک مسئول انتخاب کنید.`;
      }
    }

    return '';
  };

  const buildPhasePayloads = (): ProjectPhasePayload[] => {
    return phases.map((phase) => ({
      title: phase.title.trim(),
      description: phase.description.trim(),
      assignedUserIds: phase.assignedUserIds,
      startDate: phase.startDate,
      endDate: phase.endDate,
      financial: {
        potentialRevenueAmount: Number(phase.potentialRevenueAmount || 0),
        potentialCostAmount: Number(phase.potentialCostAmount || 0),
        realizedRevenueAmount: 0,
        realizedCostAmount: 0,
        currency: 'IRR',
        note: '',
      },
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canCreateProject) {
      setError('شما دسترسی ایجاد پروژه را ندارید.');
      return;
    }

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    const phasePayloads = buildPhasePayloads();
    const assignedUserIds = Array.from(
      new Set([ownerId, ...phasePayloads.flatMap((phase) => phase.assignedUserIds)]),
    );

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

    try {
      setSaving(true);
      setError('');

      const createdProject = await projectService.createProject(payload);
      const createdProjectId = getProjectId(createdProject);

      if (createdProjectId) {
        await router.push(`/dashboard/projects/${createdProjectId}`);
        return;
      }

      await router.push('/dashboard/projects');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در تعریف پروژه');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" dir="rtl">
        <DashboardPageHeader
          eyebrow="پروژه جدید"
          title="تعریف پروژه جدید"
          description="فرم به چند بخش آرام‌تر تقسیم شده است. هر فاز به‌صورت جمع‌شونده نمایش داده می‌شود تا صفحه در پروژه‌های چندفازی شلوغ نشود."
          backHref="/dashboard/projects"
          backLabel="بازگشت به پروژه‌ها"
        />

        {error ? (
          <div className="alert alert-error text-sm shadow-sm">
            <span>{error}</span>
          </div>
        ) : null}

        {!canCreateProject ? (
          <SectionCard>
            <div className="py-8 text-center text-sm text-base-content/55">
              فقط مدیر سیستم می‌تواند پروژه جدید تعریف کند.
            </div>
          </SectionCard>
        ) : (
          <form className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]" onSubmit={handleSubmit}>
            <div className="space-y-6">
              <SectionCard
                title="۱. اطلاعات اصلی پروژه"
                description="اطلاعات پایه پروژه را کوتاه و دقیق وارد کنید. جزئیات اجرایی داخل فازها ثبت می‌شود."
                actions={<CalendarDaysIcon className="h-6 w-6 text-primary" />}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="form-control md:col-span-2">
                    <span className="label label-text font-semibold">عنوان پروژه</span>
                    <input
                      className="input input-bordered bg-base-100"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="مثلاً طراحی سامانه مدیریت پروژه"
                      required
                    />
                  </label>

                  <label className="form-control md:col-span-2">
                    <span className="label label-text font-semibold">توضیحات پروژه</span>
                    <textarea
                      className="textarea textarea-bordered min-h-24 bg-base-100"
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder="هدف، دامنه و خروجی‌های اصلی پروژه"
                    />
                  </label>

                  <label className="form-control">
                    <span className="label label-text font-semibold">وضعیت</span>
                    <select
                      className="select select-bordered bg-base-100"
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
                    <span className="label label-text font-semibold">اولویت</span>
                    <select
                      className="select select-bordered bg-base-100"
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

                  <ShamsiDateInput
                    label="تاریخ شروع پروژه"
                    value={startDate}
                    onChange={setStartDate}
                    required
                  />

                  <ShamsiDateInput
                    label="موعد تحویل پروژه"
                    value={dueDate}
                    onChange={setDueDate}
                  />

                  <label className="form-control md:col-span-2">
                    <span className="label label-text font-semibold">مسئول پروژه</span>
                    <select
                      className="select select-bordered bg-base-100"
                      value={ownerId}
                      onChange={(event) => setOwnerId(event.target.value)}
                      disabled={loadingUsers}
                      required
                    >
                      <option value="">انتخاب مسئول پروژه</option>
                      {ownerOptions.map((user) => {
                        const userId = getUserId(user);

                        return (
                          <option key={userId} value={userId}>
                            {getUserDisplayName(user as any)}
                          </option>
                        );
                      })}
                    </select>
                  </label>
                </div>
              </SectionCard>

              <SectionCard
                title="۲. فازهای پروژه"
                description="هر فاز را فقط زمانی باز کنید که می‌خواهید جزئیات آن را تغییر دهید. بخش مالی ساده فاز حذف نشده و در همان کارت فاز باقی مانده است."
                actions={
                  <button type="button" className="btn btn-outline btn-sm" onClick={addPhase}>
                    <PlusIcon className="h-4 w-4" />
                    افزودن فاز
                  </button>
                }
              >
                <div className="space-y-4">
                  {phases.map((phase, index) => {
                    return (
                      <details
                        key={phase.localId}
                        className="collapse collapse-arrow rounded-2xl border border-base-300 bg-base-200/50"
                        open={index === 0}
                      >
                        <summary className="collapse-title cursor-pointer px-5 py-4">
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div className="min-w-0">
                              <div className="text-xs font-black text-primary">فاز {index + 1}</div>
                              <div className="mt-1 truncate text-base font-black text-base-content">
                                {phase.title || `فاز ${index + 1}`}
                              </div>
                              <div className="mt-1 text-xs text-base-content/50">
                                {phase.startDate || 'شروع نامشخص'} تا {phase.endDate || 'پایان نامشخص'} · {phase.assignedUserIds.length} مسئول
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2 text-xs">
                              <span className="badge badge-outline">
                                درآمد: {formatAmount(phase.potentialRevenueAmount)}
                              </span>
                              <span className="badge badge-outline">
                                هزینه: {formatAmount(phase.potentialCostAmount)}
                              </span>
                            </div>
                          </div>
                        </summary>

                        <div className="collapse-content px-5 pb-5">
                          <div className="mb-4 flex justify-end">
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm text-error"
                              disabled={phases.length === 1}
                              onClick={() => removePhase(phase.localId)}
                            >
                              <TrashIcon className="h-4 w-4" />
                              حذف فاز
                            </button>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <label className="form-control md:col-span-2">
                              <span className="label label-text font-semibold">عنوان فاز</span>
                              <input
                                className="input input-bordered bg-base-100"
                                value={phase.title}
                                onChange={(event) => updatePhase(phase.localId, 'title', event.target.value)}
                                required
                              />
                            </label>

                            <ShamsiDateInput
                              label="شروع فاز"
                              value={phase.startDate}
                              onChange={(value) => updatePhase(phase.localId, 'startDate', value)}
                              required
                            />

                            <ShamsiDateInput
                              label="پایان فاز"
                              value={phase.endDate}
                              onChange={(value) => updatePhase(phase.localId, 'endDate', value)}
                              required
                            />

                            <label className="form-control">
                              <span className="label label-text font-semibold">درآمد پیش‌بینی‌شده فاز</span>
                              <input
                                type="number"
                                min="0"
                                className="input input-bordered bg-base-100"
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
                                className="input input-bordered bg-base-100"
                                value={phase.potentialCostAmount}
                                onChange={(event) => updatePhase(phase.localId, 'potentialCostAmount', event.target.value)}
                                placeholder="مثلاً 20000000"
                              />
                            </label>

                            <label className="form-control md:col-span-2">
                              <span className="label label-text font-semibold">توضیحات فاز</span>
                              <textarea
                                className="textarea textarea-bordered min-h-20 bg-base-100"
                                value={phase.description}
                                onChange={(event) => updatePhase(phase.localId, 'description', event.target.value)}
                                placeholder="کارهای اصلی این فاز"
                              />
                            </label>

                            <div className="md:col-span-2">
                              <PhaseUserSearchPicker
                                users={users}
                                selectedUserIds={phase.assignedUserIds}
                                onToggle={(userId) => togglePhaseUser(phase.localId, userId)}
                                loading={loadingUsers}
                              />
                            </div>
                          </div>
                        </div>
                      </details>
                    );
                  })}
                </div>
              </SectionCard>
            </div>

            <aside className="space-y-4">
              <div className="rounded-3xl border border-base-300 bg-base-100 p-5 shadow-sm xl:sticky xl:top-6">
                <div className="mb-4 flex items-center gap-2">
                  <CheckCircleIcon className="h-5 w-5 text-primary" />
                  <h2 className="font-black text-base-content">خلاصه ثبت پروژه</h2>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between rounded-xl bg-base-200/70 px-3 py-2">
                    <span className="text-base-content/55">تعداد فاز</span>
                    <span className="font-black">{phases.length}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-primary/10 px-3 py-2 text-primary">
                    <span>افراد مسئول</span>
                    <span className="font-black">{assignedPhaseUserCount}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-success/10 px-3 py-2 text-success">
                    <span className="flex items-center gap-1">
                      <BanknotesIcon className="h-4 w-4" />
                      درآمد پیش‌بینی‌شده
                    </span>
                    <span className="font-black">{new Intl.NumberFormat('fa-IR').format(totalPotentialRevenue)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-error/10 px-3 py-2 text-error">
                    <span>هزینه پیش‌بینی‌شده</span>
                    <span className="font-black">{new Intl.NumberFormat('fa-IR').format(totalPotentialCost)}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary mt-5 w-full"
                  disabled={saving || loadingUsers}
                >
                  {saving ? 'در حال ثبت...' : 'ثبت پروژه'}
                </button>
              </div>
            </aside>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
};

export const getServerSideProps = withAuth();

export default DashboardProjectDefinitionPage;
