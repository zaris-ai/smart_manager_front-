import ShamsiDateInput from '@/components/common/ShamsiDateInput';
import expertWorkLogService from '@/services/expert-work-log.service';
import type {
  ExpertWorkLog,
  ExpertWorkLogPayload,
  ExpertWorkLogProject,
  ExpertWorkLogProjectContext,
} from '@/types/expert-work-log';
import { getEntityId } from '@/types/expert-work-log';
import { formatDateInputValue } from '@/utils/shamsi-date';
import {
  BriefcaseIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  FlagIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { FormEvent, useEffect, useMemo, useState } from 'react';

const EMPTY_FORM: ExpertWorkLogPayload = {
  projectId: '',
  phaseId: null,
  taskId: null,
  workDate: formatDateInputValue(new Date()),
  title: '',
  description: '',
  durationMinutes: null,
  progressPercent: null,
  deliverables: '',
  blockers: '',
  nextSteps: '',
};

type Props = {
  open: boolean;
  projects: ExpertWorkLogProject[];
  workLog?: ExpertWorkLog | null;
  onClose: () => void;
  onSaved: (workLog: ExpertWorkLog) => void;
};

const readText = (value?: string | null): string => String(value || '');

const toFormValue = (workLog?: ExpertWorkLog | null): ExpertWorkLogPayload => {
  if (!workLog) return { ...EMPTY_FORM };

  return {
    projectId: getEntityId(workLog.projectId),
    phaseId: getEntityId(workLog.phaseId) || null,
    taskId: getEntityId(workLog.taskId) || null,
    workDate: /^\d{4}-\d{2}-\d{2}/.test(workLog.workDate)
      ? workLog.workDate.slice(0, 10)
      : formatDateInputValue(workLog.workDate),
    title: workLog.title || '',
    description: workLog.description || '',
    durationMinutes: workLog.durationMinutes ?? null,
    progressPercent: workLog.progressPercent ?? null,
    deliverables: workLog.deliverables || '',
    blockers: workLog.blockers || '',
    nextSteps: workLog.nextSteps || '',
  };
};

export default function ExpertWorkLogFormModal({
  open,
  projects,
  workLog,
  onClose,
  onSaved,
}: Props) {
  const [form, setForm] = useState<ExpertWorkLogPayload>(() => toFormValue(workLog));
  const [context, setContext] = useState<ExpertWorkLogProjectContext | null>(null);
  const [loadingContext, setLoadingContext] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isEdit = Boolean(workLog && getEntityId(workLog));

  useEffect(() => {
    if (!open) return;

    const nextForm = toFormValue(workLog);
    setForm(nextForm);
    setContext(null);
    setError('');

    if (nextForm.projectId) {
      void loadProjectContext(nextForm.projectId);
    }
  }, [open, workLog]);

  const loadProjectContext = async (projectId: string) => {
    if (!projectId) {
      setContext(null);
      return;
    }

    try {
      setLoadingContext(true);
      setError('');
      const nextContext = await expertWorkLogService.getProjectContext(projectId);
      setContext(nextContext);
    } catch (err) {
      setContext(null);
      setError(err instanceof Error ? err.message : 'اطلاعات پروژه دریافت نشد.');
    } finally {
      setLoadingContext(false);
    }
  };

  const selectedProject = useMemo(
    () => projects.find((project) => getEntityId(project) === form.projectId),
    [projects, form.projectId],
  );

  const update = <K extends keyof ExpertWorkLogPayload>(
    key: K,
    value: ExpertWorkLogPayload[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (error) setError('');
  };

  const handleProjectChange = (projectId: string) => {
    setForm((current) => ({
      ...current,
      projectId,
      phaseId: null,
      taskId: null,
    }));
    setContext(null);
    setError('');
    void loadProjectContext(projectId);
  };

  const validate = (): string => {
    if (!form.projectId) return 'پروژه را انتخاب کنید.';
    if (!form.workDate) return 'تاریخ انجام کار را انتخاب کنید.';
    if (form.workDate > formatDateInputValue(new Date())) {
      return 'تاریخ انجام کار نمی‌تواند در آینده باشد.';
    }
    if (form.title.trim().length < 3) return 'عنوان کار حداقل ۳ کاراکتر باشد.';
    if (form.description.trim().length < 3) return 'شرح کار حداقل ۳ کاراکتر باشد.';
    if (
      form.durationMinutes !== null &&
      (Number(form.durationMinutes) < 1 || Number(form.durationMinutes) > 1440)
    ) {
      return 'مدت زمان باید بین ۱ تا ۱۴۴۰ دقیقه باشد.';
    }
    if (
      form.progressPercent !== null &&
      (Number(form.progressPercent) < 0 || Number(form.progressPercent) > 100)
    ) {
      return 'درصد پیشرفت باید بین صفر تا صد باشد.';
    }
    return '';
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload: ExpertWorkLogPayload = {
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      deliverables: readText(form.deliverables).trim(),
      blockers: readText(form.blockers).trim(),
      nextSteps: readText(form.nextSteps).trim(),
      durationMinutes:
        form.durationMinutes === null || form.durationMinutes === undefined
          ? null
          : Number(form.durationMinutes),
      progressPercent:
        form.progressPercent === null || form.progressPercent === undefined
          ? null
          : Number(form.progressPercent),
    };

    try {
      setSaving(true);
      setError('');

      const saved = isEdit
        ? await expertWorkLogService.update(getEntityId(workLog), payload)
        : await expertWorkLogService.create(payload);

      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ذخیره گزارش کار انجام نشد.');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <dialog
      open
      className="modal modal-bottom sm:modal-middle"
      onCancel={(event) => {
        event.preventDefault();
        if (!saving) onClose();
      }}
    >
      <div
        className="modal-box max-h-[95vh] w-full max-w-6xl overflow-hidden rounded-t-[2rem] border border-base-300 bg-base-100 p-0 shadow-2xl sm:rounded-[2rem]"
        dir="rtl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-base-300 px-5 py-5 sm:px-7">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <BriefcaseIcon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-base-content sm:text-2xl">
                {isEdit ? 'ویرایش گزارش کار' : 'ثبت کار انجام‌شده'}
              </h3>
              <p className="mt-1 text-sm leading-6 text-base-content/55">
                فعالیت واقعی خود را با تاریخ، زمان صرف‌شده، خروجی و گام بعدی ثبت کنید.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-circle btn-sm"
            onClick={onClose}
            disabled={saving}
            aria-label="بستن"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="max-h-[calc(95vh-11rem)] overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
            {error ? (
              <div className="alert alert-error mb-5 rounded-2xl text-sm">
                <span>{error}</span>
              </div>
            ) : null}

            <div className="grid gap-5 xl:grid-cols-2">
              <section className="space-y-4 rounded-3xl border border-base-300 bg-base-200/30 p-4 sm:p-5">
                <div className="flex items-center gap-2">
                  <CalendarDaysIcon className="h-5 w-5 text-primary" />
                  <h4 className="font-black text-base-content">پروژه و تاریخ</h4>
                </div>

                <label className="form-control">
                  <span className="label label-text font-bold">پروژه</span>
                  <select
                    className="select select-bordered w-full bg-base-100"
                    value={form.projectId}
                    onChange={(event) => handleProjectChange(event.target.value)}
                    disabled={isEdit || saving}
                    required
                  >
                    <option value="">انتخاب پروژه</option>
                    {projects.map((project) => (
                      <option key={getEntityId(project)} value={getEntityId(project)}>
                        {project.title}
                      </option>
                    ))}
                  </select>
                  {isEdit ? (
                    <span className="mt-1 text-xs text-base-content/50">
                      پروژه گزارش ثبت‌شده قابل تغییر نیست.
                    </span>
                  ) : null}
                </label>

                <ShamsiDateInput
                  label="تاریخ انجام کار"
                  value={form.workDate}
                  onChange={(value) => update('workDate', value)}
                  required
                  disabled={saving}
                />

                {selectedProject ? (
                  <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3 text-xs leading-6 text-base-content/65">
                    <span className="font-black text-primary">{selectedProject.title}</span>
                    {selectedProject.description ? ` — ${selectedProject.description}` : ''}
                  </div>
                ) : null}
              </section>

              <section className="space-y-4 rounded-3xl border border-base-300 bg-base-100 p-4 sm:p-5">
                <div className="flex items-center gap-2">
                  <FlagIcon className="h-5 w-5 text-primary" />
                  <h4 className="font-black text-base-content">ارتباط با فاز و وظیفه</h4>
                </div>

                {loadingContext ? (
                  <div className="flex min-h-28 items-center justify-center">
                    <span className="loading loading-spinner loading-md text-primary" />
                  </div>
                ) : (
                  <>
                    <label className="form-control">
                      <span className="label label-text font-bold">فاز مرتبط</span>
                      <select
                        className="select select-bordered w-full bg-base-100"
                        value={form.phaseId || ''}
                        onChange={(event) => update('phaseId', event.target.value || null)}
                        disabled={!context || saving}
                      >
                        <option value="">بدون فاز مشخص</option>
                        {(context?.phases || []).map((phase) => (
                          <option key={getEntityId(phase)} value={getEntityId(phase)}>
                            {phase.title}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="form-control">
                      <span className="label label-text font-bold">وظیفه مرتبط</span>
                      <select
                        className="select select-bordered w-full bg-base-100"
                        value={form.taskId || ''}
                        onChange={(event) => update('taskId', event.target.value || null)}
                        disabled={!context || saving}
                      >
                        <option value="">بدون وظیفه مشخص</option>
                        {(context?.tasks || []).map((task) => (
                          <option key={getEntityId(task)} value={getEntityId(task)}>
                            {task.title}
                          </option>
                        ))}
                      </select>
                    </label>

                    {context && !context.phases.length && !context.tasks.length ? (
                      <p className="rounded-2xl bg-warning/10 p-3 text-xs leading-6 text-warning">
                        برای این پروژه فاز یا وظیفه مستقیمی به شما تخصیص داده نشده است؛ گزارش را می‌توانید در سطح پروژه ثبت کنید.
                      </p>
                    ) : null}
                  </>
                )}
              </section>

              <section className="space-y-4 rounded-3xl border border-base-300 bg-base-100 p-4 sm:p-5 xl:col-span-2">
                <div className="flex items-center gap-2">
                  <DocumentTextIcon className="h-5 w-5 text-primary" />
                  <h4 className="font-black text-base-content">شرح فعالیت</h4>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <label className="form-control lg:col-span-2">
                    <span className="label label-text font-bold">عنوان کار</span>
                    <input
                      className="input input-bordered w-full bg-base-100"
                      value={form.title}
                      onChange={(event) => update('title', event.target.value)}
                      maxLength={220}
                      placeholder="مثلاً تکمیل فرم ثبت قرارداد"
                      disabled={saving}
                      required
                    />
                  </label>

                  <label className="form-control lg:col-span-2">
                    <span className="label label-text font-bold">شرح دقیق کار انجام‌شده</span>
                    <textarea
                      className="textarea textarea-bordered min-h-32 w-full bg-base-100 leading-7"
                      value={form.description}
                      onChange={(event) => update('description', event.target.value)}
                      maxLength={6000}
                      placeholder="چه کاری انجام شد، نتیجه چه بود و چه بخشی از پروژه را جلو برد؟"
                      disabled={saving}
                      required
                    />
                  </label>

                  <label className="form-control">
                    <span className="label label-text font-bold">مدت زمان (دقیقه)</span>
                    <div className="relative">
                      <ClockIcon className="pointer-events-none absolute right-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-base-content/40" />
                      <input
                        type="number"
                        min={1}
                        max={1440}
                        className="input input-bordered w-full bg-base-100 pr-11"
                        value={form.durationMinutes ?? ''}
                        onChange={(event) =>
                          update(
                            'durationMinutes',
                            event.target.value ? Number(event.target.value) : null,
                          )
                        }
                        placeholder="مثلاً ۱۲۰"
                        disabled={saving}
                      />
                    </div>
                  </label>

                  <label className="form-control">
                    <span className="label label-text font-bold">درصد پیشرفت مرتبط</span>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        className="range range-primary range-sm flex-1"
                        value={form.progressPercent ?? 0}
                        onChange={(event) => update('progressPercent', Number(event.target.value))}
                        disabled={saving}
                      />
                      <input
                        type="number"
                        min={0}
                        max={100}
                        className="input input-bordered w-24 bg-base-100 text-center"
                        value={form.progressPercent ?? ''}
                        onChange={(event) =>
                          update(
                            'progressPercent',
                            event.target.value ? Number(event.target.value) : null,
                          )
                        }
                        placeholder="٪"
                        disabled={saving}
                      />
                    </div>
                  </label>
                </div>
              </section>

              <section className="space-y-4 rounded-3xl border border-base-300 bg-success/5 p-4 sm:p-5">
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="h-5 w-5 text-success" />
                  <h4 className="font-black text-base-content">خروجی و گام بعدی</h4>
                </div>

                <label className="form-control">
                  <span className="label label-text font-bold">خروجی‌های تحویل‌شده</span>
                  <textarea
                    className="textarea textarea-bordered min-h-24 bg-base-100 leading-7"
                    value={form.deliverables || ''}
                    onChange={(event) => update('deliverables', event.target.value)}
                    maxLength={3000}
                    placeholder="فایل، قابلیت، تصمیم یا نتیجه قابل تحویل"
                    disabled={saving}
                  />
                </label>

                <label className="form-control">
                  <span className="label label-text font-bold">گام بعدی</span>
                  <textarea
                    className="textarea textarea-bordered min-h-24 bg-base-100 leading-7"
                    value={form.nextSteps || ''}
                    onChange={(event) => update('nextSteps', event.target.value)}
                    maxLength={3000}
                    placeholder="اقدام بعدی مشخص و قابل پیگیری"
                    disabled={saving}
                  />
                </label>
              </section>

              <section className="space-y-4 rounded-3xl border border-base-300 bg-warning/5 p-4 sm:p-5">
                <div className="flex items-center gap-2">
                  <FlagIcon className="h-5 w-5 text-warning" />
                  <h4 className="font-black text-base-content">موانع و وابستگی‌ها</h4>
                </div>

                <label className="form-control">
                  <span className="label label-text font-bold">موانع فعلی</span>
                  <textarea
                    className="textarea textarea-bordered min-h-32 bg-base-100 leading-7"
                    value={form.blockers || ''}
                    onChange={(event) => update('blockers', event.target.value)}
                    maxLength={3000}
                    placeholder="مانع، وابستگی، تصمیم معطل یا ریسک مؤثر بر ادامه کار"
                    disabled={saving}
                  />
                </label>
              </section>
            </div>
          </div>

          <footer className="flex flex-col-reverse gap-2 border-t border-base-300 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
            <button
              type="button"
              className="btn btn-ghost rounded-2xl"
              onClick={onClose}
              disabled={saving}
            >
              انصراف
            </button>
            <button
              type="submit"
              className="btn btn-primary min-w-40 rounded-2xl"
              disabled={saving || loadingContext}
            >
              {saving ? <span className="loading loading-spinner loading-sm" /> : null}
              {isEdit ? 'ذخیره تغییرات' : 'ثبت گزارش کار'}
            </button>
          </footer>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="button" onClick={onClose} disabled={saving}>بستن</button>
      </form>
    </dialog>
  );
}
