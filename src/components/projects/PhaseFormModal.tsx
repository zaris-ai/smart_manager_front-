import ShamsiDateInput from '@/components/common/ShamsiDateInput';
import PhaseUserSearchPicker from '@/components/projects/PhaseUserSearchPicker';
import { AppUser } from '@/types/user';
import { compareDateValues } from '@/utils/shamsi-date';
import {
  BanknotesIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  UserGroupIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useMemo, useState } from 'react';

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

type Props = {
  open: boolean;
  phase: PhaseDraft | null;
  users: AppUser[];
  loadingUsers: boolean;
  mode?: 'create' | 'edit';
  onClose: () => void;
  onSave: (phase: PhaseDraft) => void;
};

const formatAmount = (value: string): string => {
  const amount = Number(value || 0);
  return amount ? new Intl.NumberFormat('fa-IR').format(amount) : '۰';
};

export default function PhaseFormModal({
  open,
  phase,
  users,
  loadingUsers,
  mode = 'create',
  onClose,
  onSave,
}: Props) {
  const [draft, setDraft] = useState<PhaseDraft | null>(phase);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    setDraft(phase);
    setValidationError('');
  }, [phase, open]);

  const financialBalance = useMemo(() => {
    if (!draft) return 0;
    return Number(draft.potentialRevenueAmount || 0) - Number(draft.potentialCostAmount || 0);
  }, [draft]);

  if (!open || !draft) return null;

  const update = <K extends keyof PhaseDraft>(key: K, value: PhaseDraft[K]) => {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
    if (validationError) setValidationError('');
  };

  const toggleUser = (userId: string) => {
    const selectedUserIds = draft.assignedUserIds.includes(userId)
      ? draft.assignedUserIds.filter((id) => id !== userId)
      : [...draft.assignedUserIds, userId];

    update('assignedUserIds', selectedUserIds);
  };

  const handleSave = () => {
    if (!draft.title.trim()) {
      setValidationError('عنوان فاز را وارد کنید.');
      return;
    }

    if (!draft.startDate || !draft.endDate) {
      setValidationError('تاریخ شروع و پایان فاز الزامی است.');
      return;
    }

    if (compareDateValues(draft.endDate, draft.startDate) < 0) {
      setValidationError('تاریخ پایان فاز نمی‌تواند قبل از تاریخ شروع باشد.');
      return;
    }

    if (!draft.assignedUserIds.length) {
      setValidationError('حداقل یک مسئول برای فاز انتخاب کنید.');
      return;
    }

    onSave({ ...draft, title: draft.title.trim(), description: draft.description.trim() });
  };

  const modalTitle = mode === 'edit' ? 'ویرایش فاز پروژه' : 'افزودن فاز جدید';
  const modalDescription =
    mode === 'edit'
      ? 'زمان‌بندی، مسئولان و پیش‌بینی مالی این فاز را به‌روزرسانی کنید.'
      : 'اطلاعات اجرایی فاز را کامل کنید؛ پس از ذخیره به فهرست پروژه اضافه می‌شود.';

  return (
    <dialog
      open
      className="modal modal-bottom sm:modal-middle"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div
        className="modal-box max-h-[94vh] w-full max-w-6xl overflow-hidden rounded-t-[2rem] border border-base-300 bg-base-100 p-0 shadow-2xl sm:rounded-[2rem]"
        dir="rtl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-base-300 bg-base-100 px-5 py-5 sm:px-7">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <CalendarDaysIcon className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xl font-black text-base-content sm:text-2xl">{modalTitle}</h3>
              <p className="mt-1 max-w-2xl text-xs leading-6 text-base-content/55 sm:text-sm">
                {modalDescription}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-circle btn-sm shrink-0"
            onClick={onClose}
            aria-label="بستن پنجره"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </header>

        <div className="max-h-[calc(94vh-10.5rem)] overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          {validationError ? (
            <div className="alert alert-error mb-5 rounded-2xl text-sm shadow-sm">
              <span>{validationError}</span>
            </div>
          ) : null}

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
            <div className="space-y-5">
              <section className="rounded-3xl border border-base-300 bg-base-200/35 p-4 sm:p-5">
                <div className="mb-4 flex items-center gap-2">
                  <DocumentTextIcon className="h-5 w-5 text-primary" />
                  <div>
                    <h4 className="font-black text-base-content">اطلاعات اصلی فاز</h4>
                    <p className="mt-0.5 text-xs text-base-content/50">عنوان و شرح خروجی این مرحله</p>
                  </div>
                </div>

                <div className="grid gap-4">
                  <label className="form-control">
                    <span className="label label-text font-semibold">عنوان فاز</span>
                    <input
                      className="input input-bordered bg-base-100"
                      value={draft.title}
                      onChange={(event) => update('title', event.target.value)}
                      placeholder="مثلاً تحلیل و طراحی اولیه"
                      autoFocus
                    />
                  </label>

                  <label className="form-control">
                    <span className="label label-text font-semibold">توضیحات فاز</span>
                    <textarea
                      className="textarea textarea-bordered min-h-28 bg-base-100"
                      placeholder="فعالیت‌ها، خروجی مورد انتظار و نکات اجرایی این فاز"
                      value={draft.description}
                      onChange={(event) => update('description', event.target.value)}
                    />
                  </label>
                </div>
              </section>

              <section className="rounded-3xl border border-base-300 bg-base-100 p-4 sm:p-5">
                <div className="mb-4 flex items-center gap-2">
                  <CalendarDaysIcon className="h-5 w-5 text-primary" />
                  <div>
                    <h4 className="font-black text-base-content">زمان‌بندی فاز</h4>
                    <p className="mt-0.5 text-xs text-base-content/50">بازه اجرایی این مرحله را مشخص کنید</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <ShamsiDateInput
                    label="تاریخ شروع"
                    value={draft.startDate}
                    onChange={(value) => update('startDate', value)}
                    required
                  />
                  <ShamsiDateInput
                    label="تاریخ پایان"
                    value={draft.endDate}
                    onChange={(value) => update('endDate', value)}
                    required
                  />
                </div>
              </section>

              <section className="rounded-3xl border border-base-300 bg-base-100 p-4 sm:p-5">
                <div className="mb-4 flex items-center gap-2">
                  <BanknotesIcon className="h-5 w-5 text-primary" />
                  <div>
                    <h4 className="font-black text-base-content">پیش‌بینی مالی ساده</h4>
                    <p className="mt-0.5 text-xs text-base-content/50">
                      درآمد و هزینه بالقوه؛ مبالغ تحقق‌یافته بعداً در صفحه فاز ثبت می‌شوند
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="form-control">
                    <span className="label label-text font-semibold">درآمد پیش‌بینی‌شده</span>
                    <div className="relative">
                      <input
                        className="input input-bordered bg-base-100 pl-16"
                        type="number"
                        min="0"
                        inputMode="numeric"
                        placeholder="۰"
                        value={draft.potentialRevenueAmount}
                        onChange={(event) => update('potentialRevenueAmount', event.target.value)}
                      />
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-base-content/45">
                        ریال
                      </span>
                    </div>
                  </label>

                  <label className="form-control">
                    <span className="label label-text font-semibold">هزینه پیش‌بینی‌شده</span>
                    <div className="relative">
                      <input
                        className="input input-bordered bg-base-100 pl-16"
                        type="number"
                        min="0"
                        inputMode="numeric"
                        placeholder="۰"
                        value={draft.potentialCostAmount}
                        onChange={(event) => update('potentialCostAmount', event.target.value)}
                      />
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-base-content/45">
                        ریال
                      </span>
                    </div>
                  </label>
                </div>
              </section>

              <section className="rounded-3xl border border-base-300 bg-base-100 p-4 sm:p-5">
                <div className="mb-4 flex items-center gap-2">
                  <UserGroupIcon className="h-5 w-5 text-primary" />
                  <div>
                    <h4 className="font-black text-base-content">مسئولان فاز</h4>
                    <p className="mt-0.5 text-xs text-base-content/50">اعضای اجرایی این مرحله را جستجو و انتخاب کنید</p>
                  </div>
                </div>

                <PhaseUserSearchPicker
                  users={users}
                  selectedUserIds={draft.assignedUserIds}
                  onToggle={toggleUser}
                  loading={loadingUsers}
                  title="انتخاب اعضای مسئول"
                />
              </section>
            </div>

            <aside className="space-y-4 xl:sticky xl:top-0 xl:self-start">
              <div className="rounded-3xl border border-primary/20 bg-primary/5 p-5">
                <div className="mb-4 flex items-center gap-2 text-primary">
                  <CheckCircleIcon className="h-5 w-5" />
                  <h4 className="font-black">خلاصه فاز</h4>
                </div>

                <dl className="space-y-3 text-sm">
                  <div className="rounded-2xl bg-base-100 px-3 py-3">
                    <dt className="text-xs text-base-content/50">عنوان</dt>
                    <dd className="mt-1 line-clamp-2 font-black text-base-content">
                      {draft.title.trim() || 'بدون عنوان'}
                    </dd>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-2xl bg-base-100 px-3 py-3">
                      <dt className="text-xs text-base-content/50">شروع</dt>
                      <dd className="mt-1 font-black text-base-content">{draft.startDate || '—'}</dd>
                    </div>
                    <div className="rounded-2xl bg-base-100 px-3 py-3">
                      <dt className="text-xs text-base-content/50">پایان</dt>
                      <dd className="mt-1 font-black text-base-content">{draft.endDate || '—'}</dd>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl bg-base-100 px-3 py-3">
                    <dt className="text-base-content/55">تعداد مسئولان</dt>
                    <dd className="font-black text-primary">
                      {draft.assignedUserIds.length.toLocaleString('fa-IR')} نفر
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-3xl border border-base-300 bg-base-200/45 p-5">
                <div className="mb-3 text-sm font-black text-base-content">نمای مالی</div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between rounded-xl bg-success/10 px-3 py-2.5 text-success">
                    <span>درآمد</span>
                    <span className="font-black">{formatAmount(draft.potentialRevenueAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-error/10 px-3 py-2.5 text-error">
                    <span>هزینه</span>
                    <span className="font-black">{formatAmount(draft.potentialCostAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-base-300 bg-base-100 px-3 py-2.5 text-base-content">
                    <span>تراز پیش‌بینی</span>
                    <span className="font-black">
                      {new Intl.NumberFormat('fa-IR').format(financialBalance)}
                    </span>
                  </div>
                </div>
                <p className="mt-3 text-[11px] leading-5 text-base-content/45">تمام مبالغ به ریال نمایش داده می‌شوند.</p>
              </div>
            </aside>
          </div>
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-base-300 bg-base-100 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
          <button type="button" className="btn btn-ghost sm:min-w-28" onClick={onClose}>
            انصراف
          </button>
          <button type="button" className="btn btn-primary sm:min-w-36" onClick={handleSave}>
            <CheckCircleIcon className="h-5 w-5" />
            {mode === 'edit' ? 'ذخیره تغییرات' : 'افزودن فاز'}
          </button>
        </footer>
      </div>

      <button type="button" className="modal-backdrop" onClick={onClose} aria-label="بستن پنجره">
        close
      </button>
    </dialog>
  );
}
