import ShamsiDateInput from '@/components/common/ShamsiDateInput';
import {
  DashboardPageHeader,
  SectionCard,
  UserAvatar,
} from '@/components/common';
import { DashboardLayout } from '@/components/layouts';
import PhaseFormModal from '@/components/projects/PhaseFormModal';
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
  ClockIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
  UserGroupIcon,
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
  const [phases, setPhases] = useState<PhaseDraft[]>([]);
  const [phaseModalOpen, setPhaseModalOpen] = useState(false);
  const [phaseModalMode, setPhaseModalMode] = useState<'create' | 'edit'>('create');
  const [editingPhase, setEditingPhase] = useState<PhaseDraft | null>(null);

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

  const addPhase = () => {
    setPhaseModalMode('create');
    setEditingPhase(createPhaseDraft(phases.length));
    setPhaseModalOpen(true);
  };

  const editPhase = (phase: PhaseDraft) => {
    setPhaseModalMode('edit');
    setEditingPhase(phase);
    setPhaseModalOpen(true);
  };

  const savePhase = (phase: PhaseDraft) => {
    setPhases((previous) => {
      const exists = previous.some((item) => item.localId === phase.localId);
      return exists
        ? previous.map((item) => (item.localId === phase.localId ? phase : item))
        : [...previous, phase];
    });
    setPhaseModalOpen(false);
    setEditingPhase(null);
  };

  const removePhase = (localId: string) => {
    setPhases((previous) => previous.filter((phase) => phase.localId !== localId));
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
          description="ابتدا اطلاعات پایه پروژه را ثبت کنید، سپس فازهای اجرایی را در پنجره جداگانه بسازید و پیش از ثبت نهایی مرور کنید."
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
                description="هر فاز در یک پنجره مستقل تعریف می‌شود. کارت‌های زیر زمان‌بندی، مسئولان و پیش‌بینی مالی هر فاز را بدون باز کردن فرم نشان می‌دهند."
                actions={
                  <button type="button" className="btn btn-primary btn-sm gap-2" onClick={addPhase}>
                    <PlusIcon className="h-4 w-4" />
                    افزودن فاز جدید
                  </button>
                }
                bodyClassName="space-y-4"
              >
                {phases.length ? (
                  <div className="grid gap-4">
                    {phases.map((phase, index) => {
                      const assignedUsers = users.filter((user) =>
                        phase.assignedUserIds.includes(getUserId(user)),
                      );
                      const isComplete = Boolean(
                        phase.title.trim() &&
                          phase.startDate &&
                          phase.endDate &&
                          phase.assignedUserIds.length,
                      );

                      return (
                        <article
                          key={phase.localId}
                          className="group overflow-hidden rounded-3xl border border-base-300 bg-base-100 shadow-sm transition hover:border-primary/30 hover:shadow-md"
                        >
                          <div className={`h-1 ${isComplete ? 'bg-success' : 'bg-warning'}`} />
                          <div className="p-4 sm:p-5">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                              <div className="flex min-w-0 items-start gap-3">
                                <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                  <span className="text-[10px] font-bold">فاز</span>
                                  <span className="text-lg font-black leading-none">
                                    {(index + 1).toLocaleString('fa-IR')}
                                  </span>
                                </div>

                                <div className="min-w-0 pt-0.5">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="truncate text-base font-black text-base-content sm:text-lg">
                                      {phase.title || `فاز ${index + 1}`}
                                    </h3>
                                    <span
                                      className={`badge badge-sm font-bold ${
                                        isComplete
                                          ? 'border-success/25 bg-success/10 text-success'
                                          : 'border-warning/25 bg-warning/10 text-warning'
                                      }`}
                                    >
                                      {isComplete ? 'آماده ثبت' : 'نیازمند تکمیل'}
                                    </span>
                                  </div>
                                  <p className="mt-1 line-clamp-2 text-xs leading-6 text-base-content/50 sm:text-sm">
                                    {phase.description || 'برای این فاز هنوز توضیحی ثبت نشده است.'}
                                  </p>
                                </div>
                              </div>

                              <div className="flex shrink-0 items-center gap-2 self-end lg:self-start">
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-sm gap-1.5"
                                  onClick={() => editPhase(phase)}
                                >
                                  <PencilSquareIcon className="h-4 w-4" />
                                  ویرایش
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-sm btn-square text-error"
                                  onClick={() => removePhase(phase.localId)}
                                  aria-label={`حذف ${phase.title || `فاز ${index + 1}`}`}
                                  title="حذف فاز"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </div>
                            </div>

                            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                              <div className="rounded-2xl border border-base-300 bg-base-200/45 p-3">
                                <div className="flex items-center gap-2 text-xs font-bold text-base-content/45">
                                  <ClockIcon className="h-4 w-4 text-primary" />
                                  بازه اجرا
                                </div>
                                <div className="mt-2 text-sm font-black text-base-content">
                                  {phase.startDate || 'شروع نامشخص'}
                                </div>
                                <div className="mt-0.5 text-xs text-base-content/50">
                                  تا {phase.endDate || 'پایان نامشخص'}
                                </div>
                              </div>

                              <div className="rounded-2xl border border-base-300 bg-base-200/45 p-3">
                                <div className="flex items-center gap-2 text-xs font-bold text-base-content/45">
                                  <UserGroupIcon className="h-4 w-4 text-primary" />
                                  مسئولان فاز
                                </div>
                                <div className="mt-2 text-sm font-black text-base-content">
                                  {phase.assignedUserIds.length.toLocaleString('fa-IR')} نفر
                                </div>
                                {assignedUsers.length ? (
                                  <div className="mt-2 flex items-center">
                                    {assignedUsers.slice(0, 4).map((user, avatarIndex) => (
                                      <UserAvatar
                                        key={getUserId(user)}
                                        userId={getUserId(user)}
                                        name={getUserDisplayName(user as any)}
                                        size="xs"
                                        className={avatarIndex ? '-mr-2 border-base-100' : 'border-base-100'}
                                      />
                                    ))}
                                    {assignedUsers.length > 4 ? (
                                      <span className="-mr-2 flex h-8 min-w-8 items-center justify-center rounded-full border-2 border-base-100 bg-primary px-2 text-[10px] font-black text-primary-content">
                                        +{(assignedUsers.length - 4).toLocaleString('fa-IR')}
                                      </span>
                                    ) : null}
                                  </div>
                                ) : (
                                  <div className="mt-0.5 text-xs text-base-content/50">هنوز انتخاب نشده</div>
                                )}
                              </div>

                              <div className="rounded-2xl border border-success/20 bg-success/5 p-3">
                                <div className="flex items-center gap-2 text-xs font-bold text-success/75">
                                  <BanknotesIcon className="h-4 w-4" />
                                  درآمد پیش‌بینی‌شده
                                </div>
                                <div className="mt-2 text-sm font-black text-success">
                                  {formatAmount(phase.potentialRevenueAmount)}
                                  <span className="mr-1 text-[10px] font-bold opacity-70">ریال</span>
                                </div>
                              </div>

                              <div className="rounded-2xl border border-error/20 bg-error/5 p-3">
                                <div className="flex items-center gap-2 text-xs font-bold text-error/75">
                                  <BanknotesIcon className="h-4 w-4" />
                                  هزینه پیش‌بینی‌شده
                                </div>
                                <div className="mt-2 text-sm font-black text-error">
                                  {formatAmount(phase.potentialCostAmount)}
                                  <span className="mr-1 text-[10px] font-bold opacity-70">ریال</span>
                                </div>
                              </div>
                            </div>

                            {assignedUsers.length ? (
                              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-base-300 pt-4">
                                <span className="ml-1 text-xs font-bold text-base-content/45">اعضای منتخب:</span>
                                {assignedUsers.slice(0, 4).map((user) => {
                                  const userId = getUserId(user);
                                  return (
                                    <span
                                      key={userId}
                                      className="inline-flex items-center gap-2 rounded-full border border-base-300 bg-base-100 py-1 pl-3 pr-1 text-[11px] font-bold"
                                    >
                                      <UserAvatar
                                        userId={userId}
                                        name={getUserDisplayName(user as any)}
                                        size="xs"
                                      />
                                      <span className="break-words">{getUserDisplayName(user as any)}</span>
                                    </span>
                                  );
                                })}
                                {assignedUsers.length > 4 ? (
                                  <span className="badge badge-primary badge-outline py-3 text-[11px] font-black">
                                    +{(assignedUsers.length - 4).toLocaleString('fa-IR')}
                                  </span>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-3xl border border-dashed border-primary/30 bg-primary/[0.035] px-5 py-10 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary">
                      <CalendarDaysIcon className="h-8 w-8" />
                    </div>
                    <h3 className="mt-4 text-base font-black text-base-content">هنوز فازی تعریف نشده است</h3>
                    <p className="mx-auto mt-2 max-w-lg text-sm leading-7 text-base-content/50">
                      پروژه باید حداقل یک فاز اجرایی داشته باشد. زمان‌بندی، اعضای مسئول و پیش‌بینی مالی را داخل فرم فاز ثبت کنید.
                    </p>
                    <button type="button" className="btn btn-primary btn-sm mt-5 gap-2" onClick={addPhase}>
                      <PlusIcon className="h-4 w-4" />
                      تعریف اولین فاز
                    </button>
                  </div>
                )}
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
        <PhaseFormModal
          open={phaseModalOpen}
          phase={editingPhase}
          users={users}
          loadingUsers={loadingUsers}
          mode={phaseModalMode}
          onClose={() => {
            setPhaseModalOpen(false);
            setEditingPhase(null);
          }}
          onSave={savePhase}
        />
      </div>
    </DashboardLayout>
  );
};

export const getServerSideProps = withAuth();

export default DashboardProjectDefinitionPage;
