import { DashboardLayout } from '@/components/layouts';
import { projectService } from '@/services/project.service';
import {
  getPhaseId,
  getProjectId,
  getReferenceId,
  getUserDisplayName,
  Project,
  ProjectPhase,
} from '@/types/project';
import { withAuth } from '@/utils';
import { formatShamsiDateLong } from '@/utils/shamsi-date';
import {
  ArrowLeftIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FormEvent, useEffect, useMemo, useState } from 'react';

type FinancialForm = {
  realizedRevenueAmount: string;
  realizedCostAmount: string;
  note: string;
};

const normalizeAmount = (value?: number | string | null): number => {
  const amount = Number(value || 0);

  if (!Number.isFinite(amount) || amount < 0) return 0;

  return Math.round(amount);
};

const formatAmount = (value?: number | string | null): string => {
  return `${normalizeAmount(value).toLocaleString('fa-IR')} ریال`;
};

const buildFinancialForm = (phase?: ProjectPhase | null): FinancialForm => ({
  realizedRevenueAmount: String(normalizeAmount(phase?.financial?.realizedRevenueAmount)),
  realizedCostAmount: String(normalizeAmount(phase?.financial?.realizedCostAmount)),
  note: phase?.financial?.note || '',
});

const DashboardProjectPhaseDetailsPage = () => {
  const router = useRouter();
  const { id, phaseId } = router.query;
  const projectId = typeof id === 'string' ? id : '';
  const selectedPhaseId = typeof phaseId === 'string' ? phaseId : '';

  const { data: session } = useSession();
  const role = String(session?.user?.role || '').toLowerCase();
  const canManageFinance = role === 'manager' || role === 'admin';

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<FinancialForm>(buildFinancialForm());

  const phase = useMemo(() => {
    const phases = Array.isArray(project?.phases) ? project.phases : [];

    return phases.find((item) => getPhaseId(item) === selectedPhaseId) || null;
  }, [project, selectedPhaseId]);

  const potentialRevenue = normalizeAmount(phase?.financial?.potentialRevenueAmount);
  const potentialCost = normalizeAmount(phase?.financial?.potentialCostAmount);
  const realizedRevenue = normalizeAmount(phase?.financial?.realizedRevenueAmount);
  const realizedCost = normalizeAmount(phase?.financial?.realizedCostAmount);

  const loadProject = async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      setError('');

      const [response, phasesResponse] = await Promise.all([
        projectService.getProject(projectId),
        projectService.listProjectPhases(projectId),
      ]);
      const responsePhases = phasesResponse.length ? phasesResponse : response.phases || [];
      const responsePhase = responsePhases.find((item) => getPhaseId(item) === selectedPhaseId) || null;

      setProject({ ...response, phases: responsePhases });
      setForm(buildFinancialForm(responsePhase));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در دریافت اطلاعات فاز');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProject();
  }, [projectId, selectedPhaseId]);

  const handleSaveFinancial = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!projectId || !selectedPhaseId || !phase) return;

    try {
      setSaving(true);
      setError('');

      const updatedPhase = await projectService.updateProjectPhaseFinancial(
        projectId,
        selectedPhaseId,
        {
          realizedRevenueAmount: normalizeAmount(form.realizedRevenueAmount),
          realizedCostAmount: normalizeAmount(form.realizedCostAmount),
          note: form.note.trim(),
        },
      );

      setProject((currentProject) => {
        if (!currentProject) return currentProject;

        const currentPhases = Array.isArray(currentProject.phases)
          ? currentProject.phases
          : [];
        const refreshedPhases = currentPhases.map((item) =>
          getPhaseId(item) === selectedPhaseId ? updatedPhase : item,
        );

        return { ...currentProject, phases: refreshedPhases };
      });
      setForm(buildFinancialForm(updatedPhase));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ثبت مالی فاز');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" dir="rtl">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              جزئیات فاز پروژه
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              مشخصات فاز، مسئولان اجرا، بازه زمانی و مالی ساده فاز را مشاهده و تکمیل کنید.
            </p>
          </div>

          <Link href={projectId ? `/dashboard/projects/${projectId}` : '/dashboard/projects'} className="btn btn-outline">
            <ArrowLeftIcon className="h-5 w-5" />
            بازگشت به پروژه
          </Link>
        </div>

        {error ? (
          <div className="alert alert-error text-sm shadow-sm">
            <span>{error}</span>
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl bg-white p-8 text-center text-sm text-gray-500 shadow-sm dark:bg-gray-900">
            در حال دریافت اطلاعات فاز...
          </div>
        ) : !project || !phase ? (
          <div className="rounded-2xl bg-white p-8 text-center text-sm text-gray-500 shadow-sm dark:bg-gray-900">
            فاز انتخاب‌شده برای این پروژه پیدا نشد.
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <main className="space-y-6">
              <section className="rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-900">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="text-sm font-bold text-primary">{project.title}</div>
                    <h2 className="mt-1 text-xl font-bold text-gray-900 dark:text-gray-100">
                      {phase.title}
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-gray-500">
                      {phase.description || 'برای این فاز توضیحی ثبت نشده است.'}
                    </p>
                  </div>

                  <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm dark:bg-gray-950">
                    <div className="flex items-center gap-2 font-bold text-gray-800 dark:text-gray-100">
                      <CalendarDaysIcon className="h-5 w-5 text-primary" />
                      زمان‌بندی فاز
                    </div>
                    <div className="mt-2 text-gray-500">
                      {formatShamsiDateLong(phase.startDate)} تا {formatShamsiDateLong(phase.endDate)}
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-900">
                <div className="mb-4 flex items-center gap-2">
                  <UserGroupIcon className="h-5 w-5 text-primary" />
                  <h2 className="font-bold text-gray-900 dark:text-gray-100">مسئولان فاز</h2>
                </div>

                <div className="flex flex-wrap gap-2">
                  {phase.assignedUserIds?.length ? (
                    phase.assignedUserIds.map((user) => (
                      <span
                        key={getReferenceId(user) || getUserDisplayName(user)}
                        className="badge badge-primary badge-outline px-3 py-3"
                      >
                        {getUserDisplayName(user)}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500">برای این فاز مسئولی ثبت نشده است.</span>
                  )}
                </div>
              </section>

              <section className="rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-900">
                <div className="mb-4 flex items-center gap-2">
                  <BanknotesIcon className="h-5 w-5 text-primary" />
                  <h2 className="font-bold text-gray-900 dark:text-gray-100">مالی ساده فاز</h2>
                </div>

                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-xl bg-emerald-50 p-4 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200">
                    <div className="text-xs">درآمد برآوردی</div>
                    <div className="mt-1 font-bold">{formatAmount(potentialRevenue)}</div>
                  </div>
                  <div className="rounded-xl bg-rose-50 p-4 text-rose-700 dark:bg-rose-950/30 dark:text-rose-200">
                    <div className="text-xs">هزینه برآوردی</div>
                    <div className="mt-1 font-bold">{formatAmount(potentialCost)}</div>
                  </div>
                  <div className="rounded-xl bg-green-50 p-4 text-green-700 dark:bg-green-950/30 dark:text-green-200">
                    <div className="text-xs">درآمد تحقق‌یافته</div>
                    <div className="mt-1 font-bold">{formatAmount(realizedRevenue)}</div>
                  </div>
                  <div className="rounded-xl bg-orange-50 p-4 text-orange-700 dark:bg-orange-950/30 dark:text-orange-200">
                    <div className="text-xs">هزینه تحقق‌یافته</div>
                    <div className="mt-1 font-bold">{formatAmount(realizedCost)}</div>
                  </div>
                </div>

                <form className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950" onSubmit={handleSaveFinancial}>
                  <div className="mb-3">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100">ثبت درآمد و هزینه تحقق‌یافته</h3>
                    <p className="mt-1 text-xs text-gray-500">
                      این بخش هر زمان قابل ویرایش است و فقط مبلغ واقعی درآمد و هزینه فاز را نگهداری می‌کند.
                    </p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="form-control">
                      <span className="label label-text font-semibold">درآمد تحقق‌یافته</span>
                      <input
                        type="number"
                        min="0"
                        className="input input-bordered bg-white dark:bg-gray-900"
                        value={form.realizedRevenueAmount}
                        onChange={(event) => setForm((previous) => ({ ...previous, realizedRevenueAmount: event.target.value }))}
                        disabled={!canManageFinance}
                      />
                    </label>

                    <label className="form-control">
                      <span className="label label-text font-semibold">هزینه تحقق‌یافته</span>
                      <input
                        type="number"
                        min="0"
                        className="input input-bordered bg-white dark:bg-gray-900"
                        value={form.realizedCostAmount}
                        onChange={(event) => setForm((previous) => ({ ...previous, realizedCostAmount: event.target.value }))}
                        disabled={!canManageFinance}
                      />
                    </label>

                    <label className="form-control md:col-span-2">
                      <span className="label label-text font-semibold">توضیح مالی</span>
                      <textarea
                        className="textarea textarea-bordered min-h-20 bg-white dark:bg-gray-900"
                        value={form.note}
                        onChange={(event) => setForm((previous) => ({ ...previous, note: event.target.value }))}
                        disabled={!canManageFinance}
                        placeholder="توضیح کوتاه درباره درآمد یا هزینه واقعی این فاز"
                      />
                    </label>
                  </div>

                  {canManageFinance ? (
                    <button type="submit" className="btn btn-primary mt-4" disabled={saving}>
                      {saving ? 'در حال ثبت...' : 'ثبت مالی فاز'}
                    </button>
                  ) : null}
                </form>
              </section>
            </main>

            <aside className="space-y-4">
              <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-900 xl:sticky xl:top-6">
                <h2 className="font-bold text-gray-900 dark:text-gray-100">خلاصه فاز</h2>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 dark:bg-gray-950">
                    <span className="text-gray-500">مانده برآوردی</span>
                    <span className="font-bold">{formatAmount(potentialRevenue - potentialCost)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 dark:bg-gray-950">
                    <span className="text-gray-500">مانده تحقق‌یافته</span>
                    <span className="font-bold">{formatAmount(realizedRevenue - realizedCost)}</span>
                  </div>
                  <div className="rounded-xl bg-blue-50 p-3 text-xs leading-6 text-blue-700 dark:bg-blue-950/30 dark:text-blue-200">
                    {phase.financial?.note || 'برای مالی این فاز توضیحی ثبت نشده است.'}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export const getServerSideProps = withAuth();

export default DashboardProjectPhaseDetailsPage;
