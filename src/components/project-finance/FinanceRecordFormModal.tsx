import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  ProjectFinanceCurrency,
  ProjectFinanceRecord,
  ProjectFinanceRecordPayload,
  ProjectFinanceType,
  getFinanceRecordId,
  isFinanceActualType,
  isFinanceForecastType,
  isFinanceInvoiceType,
  projectFinanceCurrencyLabels,
  projectFinanceCurrencyOptions,
  projectFinanceTypeLabels,
  projectFinanceTypeOptions,
} from '@/types/project-finance';
import { cn } from '@/utils/cn';
import {
  BanknotesIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  LinkIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

type FinanceRecordFormModalProps = {
  open: boolean;
  record?: ProjectFinanceRecord | null;
  records: ProjectFinanceRecord[];
  canManage: boolean;
  onClose: () => void;
  onSubmit: (payload: ProjectFinanceRecordPayload) => Promise<void>;
};

type FormValues = ProjectFinanceRecordPayload & {
  counterpartyName?: string;
  counterpartyPhone?: string;
  counterpartyNationalIdOrEconomicCode?: string;
  address?: string;
};

const toDateInputValue = (value?: string | null): string => {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  return date.toISOString().slice(0, 10);
};

const defaultValues: FormValues = {
  type: 'income_forecast',
  status: 'submitted',
  title: '',
  description: '',
  amount: 0,
  taxAmount: 0,
  discountAmount: 0,
  currency: 'IRR',
  forecastDate: '',
  dueDate: '',
  actualDate: '',
  invoiceNumber: '',
  invoiceDate: '',
  counterpartyName: '',
  counterpartyPhone: '',
  counterpartyNationalIdOrEconomicCode: '',
  address: '',
  linkedForecastId: '',
  linkedInvoiceId: '',
  notAchievedReason: '',
  delayReason: '',
  managerNote: '',
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  const candidate = error as {
    response?: {
      data?: {
        message?: string;
        error?: string;
      };
    };
    message?: string;
  };

  return (
    candidate?.response?.data?.message ||
    candidate?.response?.data?.error ||
    candidate?.message ||
    fallback
  );
};

const buildDefaultValues = (record?: ProjectFinanceRecord | null): FormValues => {
  if (!record) return defaultValues;

  return {
    type: record.type,
    status: record.status,
    title: record.title || '',
    description: record.description || '',
    amount: Number(record.amount || 0),
    taxAmount: Number(record.taxAmount || 0),
    discountAmount: Number(record.discountAmount || 0),
    currency: (record.currency || 'IRR') as ProjectFinanceCurrency,
    forecastDate: toDateInputValue(record.forecastDate),
    dueDate: toDateInputValue(record.dueDate),
    actualDate: toDateInputValue(record.actualDate),
    invoiceNumber: record.invoiceNumber || '',
    invoiceDate: toDateInputValue(record.invoiceDate),
    counterpartyName: record.counterparty?.name || '',
    counterpartyPhone: record.counterparty?.phone || '',
    counterpartyNationalIdOrEconomicCode:
      record.counterparty?.nationalIdOrEconomicCode || '',
    address: record.counterparty?.address || '',
    linkedForecastId:
      typeof record.linkedForecastId === 'string'
        ? record.linkedForecastId
        : record.linkedForecastId?.id || record.linkedForecastId?._id || '',
    linkedInvoiceId:
      typeof record.linkedInvoiceId === 'string'
        ? record.linkedInvoiceId
        : record.linkedInvoiceId?.id || record.linkedInvoiceId?._id || '',
    notAchievedReason: record.notAchievedReason || '',
    delayReason: record.delayReason || '',
    managerNote: record.managerNote || '',
  };
};

export const FinanceRecordFormModal = ({
  open,
  record,
  records,
  canManage,
  onClose,
  onSubmit,
}: FinanceRecordFormModalProps) => {
  const isEditMode = Boolean(record && getFinanceRecordId(record));

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues,
  });

  const selectedType = watch('type');
  const linkedForecastId = watch('linkedForecastId');
  const linkedInvoiceId = watch('linkedInvoiceId');
  const isActualRecord = isFinanceActualType(selectedType as ProjectFinanceType);
  const isInvoiceRecord = isFinanceInvoiceType(selectedType as ProjectFinanceType);
  const amount = Number(watch('amount') || 0);
  const taxAmount = Number(watch('taxAmount') || 0);
  const discountAmount = Number(watch('discountAmount') || 0);
  const finalAmount = Math.max(amount + taxAmount - discountAmount, 0);
  const actualRelationMissing = isActualRecord && !linkedForecastId && !linkedInvoiceId;

  const forecastOptions = useMemo(() => {
    const requiredDirection = selectedType.includes('expense') || selectedType === 'payable_invoice' || selectedType === 'actual_payment'
      ? 'expense'
      : 'income';
    const currentRecordId = getFinanceRecordId(record || undefined);

    return records.filter((item) => {
      return (
        isFinanceForecastType(item.type) &&
        item.direction === requiredDirection &&
        getFinanceRecordId(item) !== currentRecordId &&
        !['cancelled', 'rejected'].includes(item.status)
      );
    });
  }, [records, selectedType, record]);

  const invoiceOptions = useMemo(() => {
    const requiredDirection = selectedType === 'actual_payment' ? 'expense' : 'income';
    const currentRecordId = getFinanceRecordId(record || undefined);

    return records.filter((item) => {
      return (
        isFinanceInvoiceType(item.type) &&
        item.direction === requiredDirection &&
        getFinanceRecordId(item) !== currentRecordId &&
        !['cancelled', 'rejected'].includes(item.status)
      );
    });
  }, [records, selectedType, record]);

  useEffect(() => {
    if (!open) return;

    reset(buildDefaultValues(record));
  }, [open, record, reset]);

  const submitHandler = async (values: FormValues) => {
    const isActualPayload = isFinanceActualType(values.type);

    if (isActualPayload && !values.linkedForecastId && !values.linkedInvoiceId) {
      toast.error('برای ثبت دریافت یا پرداخت واقعی، انتخاب حداقل یک فاکتور مرتبط یا پیش‌بینی مرتبط الزامی است.');
      return;
    }

    try {
      await onSubmit({
        ...values,
        amount: Number(values.amount || 0),
        taxAmount: Number(values.taxAmount || 0),
        discountAmount: Number(values.discountAmount || 0),
        forecastDate: values.forecastDate || null,
        dueDate: values.dueDate || null,
        actualDate: values.actualDate || null,
        invoiceDate: values.invoiceDate || null,
        linkedForecastId: values.linkedForecastId || null,
        linkedInvoiceId: values.linkedInvoiceId || null,
        counterparty: {
          name: values.counterpartyName || '',
          phone: values.counterpartyPhone || '',
          nationalIdOrEconomicCode: values.counterpartyNationalIdOrEconomicCode || '',
          address: values.address || '',
        },
      });

      onClose();
    } catch (error) {
      toast.error(getErrorMessage(error, 'خطا در ذخیره رکورد مالی'));
    }
  };

  if (!open) return null;

  return (
    <dialog className="modal modal-open" dir="rtl">
      <div className="modal-box flex max-h-[92vh] max-w-6xl flex-col overflow-hidden bg-base-200 p-0">
        <div className="border-b border-base-300 bg-base-100 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <BanknotesIcon className="h-7 w-7" />
              </div>

              <div>
                <h3 className="text-xl font-extrabold text-base-content">
                  {isEditMode ? 'ویرایش رکورد مالی' : 'ثبت رکورد مالی پروژه'}
                </h3>
                <p className="mt-1 text-sm leading-7 text-base-content/60">
                  پیش‌بینی‌ها، فاکتورها، دریافت‌ها و پرداخت‌ها باید جدا ثبت شوند تا گزارش مالی دقیق بماند.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-ghost btn-sm btn-circle"
              onClick={onClose}
              aria-label="بستن"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <form
          onSubmit={handleSubmit(submitHandler)}
          className="flex-1 space-y-5 overflow-y-auto px-6 py-5"
        >
          <section className="avid-form-section">
            <div className="mb-5 flex items-center gap-2">
              <DocumentTextIcon className="h-5 w-5 text-primary" />
              <div>
                <h4 className="avid-form-title">اطلاعات اصلی</h4>
                <p className="avid-form-hint mt-1">
                  نوع رکورد مشخص می‌کند این آیتم در پیش‌بینی، فاکتور یا تحقق واقعی گزارش شود.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <label className="form-control lg:col-span-2">
                <span className="label label-text">عنوان</span>
                <input
                  className={cn('input input-bordered bg-base-100', errors.title ? 'input-error' : '')}
                  placeholder="مثلاً فاکتور مرحله اول قرارداد"
                  {...register('title', { required: 'عنوان رکورد مالی الزامی است.' })}
                />
                {errors.title?.message ? (
                  <span className="avid-error-text">{errors.title.message}</span>
                ) : null}
              </label>

              <label className="form-control">
                <span className="label label-text">نوع رکورد</span>
                <select className="select select-bordered bg-base-100" {...register('type')}>
                  {projectFinanceTypeOptions.map((type) => (
                    <option key={type} value={type}>
                      {projectFinanceTypeLabels[type]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-control">
                <span className="label label-text">وضعیت اولیه</span>
                <select
                  className="select select-bordered bg-base-100"
                  disabled={!canManage}
                  {...register('status')}
                >
                  <option value="submitted">ثبت‌شده</option>
                  {canManage ? (
                    <>
                      <option value="draft">پیش‌نویس</option>
                      <option value="approved">تأییدشده</option>
                    </>
                  ) : null}
                </select>
              </label>

              <label className="form-control lg:col-span-4">
                <span className="label label-text">توضیحات</span>
                <textarea
                  className="textarea textarea-bordered min-h-24 bg-base-100"
                  placeholder="توضیح لازم برای مدیر پروژه یا گزارش مالی"
                  {...register('description')}
                />
              </label>
            </div>
          </section>

          <section className="avid-form-section">
            <div className="mb-5 flex items-center gap-2">
              <BanknotesIcon className="h-5 w-5 text-primary" />
              <div>
                <h4 className="avid-form-title">مبالغ</h4>
                <p className="avid-form-hint mt-1">
                  مبلغ نهایی از مبلغ پایه + مالیات - تخفیف محاسبه می‌شود.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <label className="form-control">
                <span className="label label-text">مبلغ پایه</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className={cn('input input-bordered bg-base-100', errors.amount ? 'input-error' : '')}
                  {...register('amount', {
                    required: 'مبلغ الزامی است.',
                    valueAsNumber: true,
                    min: { value: 0, message: 'مبلغ نمی‌تواند منفی باشد.' },
                  })}
                />
                {errors.amount?.message ? (
                  <span className="avid-error-text">{errors.amount.message}</span>
                ) : null}
              </label>

              <label className="form-control">
                <span className="label label-text">مالیات</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="input input-bordered bg-base-100"
                  {...register('taxAmount', { valueAsNumber: true })}
                />
              </label>

              <label className="form-control">
                <span className="label label-text">تخفیف</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="input input-bordered bg-base-100"
                  {...register('discountAmount', { valueAsNumber: true })}
                />
              </label>

              <label className="form-control">
                <span className="label label-text">واحد پول</span>
                <select className="select select-bordered bg-base-100" {...register('currency')}>
                  {projectFinanceCurrencyOptions.map((currency) => (
                    <option key={currency} value={currency}>
                      {projectFinanceCurrencyLabels[currency]}
                    </option>
                  ))}
                </select>
              </label>

              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                <div className="text-xs font-bold text-base-content/55">مبلغ نهایی</div>
                <div className="mt-2 text-xl font-black text-primary">
                  {new Intl.NumberFormat('fa-IR').format(finalAmount)}
                </div>
              </div>
            </div>
          </section>

          <section className="avid-form-section">
            <div className="mb-5 flex items-center gap-2">
              <CalendarDaysIcon className="h-5 w-5 text-primary" />
              <div>
                <h4 className="avid-form-title">تاریخ‌ها</h4>
                <p className="avid-form-hint mt-1">
                  تاریخ سررسید برای تشخیص فاکتورهای محقق‌نشده و عقب‌افتاده استفاده می‌شود.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {isFinanceForecastType(selectedType as ProjectFinanceType) ? (
                <label className="form-control">
                  <span className="label label-text">تاریخ پیش‌بینی</span>
                  <input type="date" className="input input-bordered bg-base-100" {...register('forecastDate')} />
                </label>
              ) : null}

              {isInvoiceRecord ? (
                <>
                  <label className="form-control">
                    <span className="label label-text">شماره فاکتور</span>
                    <input className="input input-bordered bg-base-100" {...register('invoiceNumber')} />
                  </label>

                  <label className="form-control">
                    <span className="label label-text">تاریخ فاکتور</span>
                    <input type="date" className="input input-bordered bg-base-100" {...register('invoiceDate')} />
                  </label>
                </>
              ) : null}

              {isFinanceActualType(selectedType as ProjectFinanceType) ? (
                <label className="form-control">
                  <span className="label label-text">تاریخ تحقق</span>
                  <input type="date" className="input input-bordered bg-base-100" {...register('actualDate')} />
                </label>
              ) : null}

              {!isFinanceActualType(selectedType as ProjectFinanceType) ? (
                <label className="form-control">
                  <span className="label label-text">تاریخ سررسید</span>
                  <input type="date" className="input input-bordered bg-base-100" {...register('dueDate')} />
                </label>
              ) : null}
            </div>
          </section>

          {(isInvoiceRecord || isActualRecord) ? (
            <section className="avid-form-section">
              <div className="mb-5 flex items-center gap-2">
                <LinkIcon className="h-5 w-5 text-primary" />
                <div>
                  <h4 className="avid-form-title">ارتباط مالی</h4>
                  <p className="avid-form-hint mt-1">
                    فاکتور را به پیش‌بینی وصل کنید. برای دریافت یا پرداخت واقعی، انتخاب فاکتور مرتبط یا پیش‌بینی مرتبط الزامی است.
                  </p>
                </div>
              </div>

              {isActualRecord ? (
                <div className="alert alert-info mb-4 items-start text-sm leading-7">
                  <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
                  <span>
                    این بخش همان «فاکتور یا پیش‌بینی مرتبط» است. برای ثبت دریافت واقعی یا پرداخت واقعی، حداقل یکی از دو فیلد زیر را انتخاب کنید.
                  </span>
                </div>
              ) : null}

              {isActualRecord && !forecastOptions.length && !invoiceOptions.length ? (
                <div className="alert alert-warning mb-4 items-start text-sm leading-7">
                  <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
                  <span>
                    برای این نوع تراکنش، هنوز فاکتور یا پیش‌بینی قابل اتصال وجود ندارد. ابتدا فاکتور دریافتنی/پرداختنی یا پیش‌بینی دریافت/هزینه ثبت کنید.
                  </span>
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <label className="form-control">
                  <span className="label label-text">
                    پیش‌بینی مرتبط {isActualRecord ? <span className="text-error">*</span> : null}
                  </span>
                  <select className="select select-bordered bg-base-100" {...register('linkedForecastId')}>
                    <option value="">انتخاب پیش‌بینی مرتبط</option>
                    {forecastOptions.map((item) => (
                      <option key={getFinanceRecordId(item)} value={getFinanceRecordId(item)}>
                        {item.title || 'بدون عنوان'} - {new Intl.NumberFormat('fa-IR').format(item.finalAmount || 0)}
                      </option>
                    ))}
                  </select>
                  <span className="mt-1 text-xs leading-6 text-base-content/50">
                    برای اتصال به پیش‌بینی درآمد یا هزینه پروژه استفاده می‌شود.
                  </span>
                </label>

                {isActualRecord ? (
                  <label className="form-control">
                    <span className="label label-text">
                      فاکتور مرتبط <span className="text-error">*</span>
                    </span>
                    <select className="select select-bordered bg-base-100" {...register('linkedInvoiceId')}>
                      <option value="">انتخاب فاکتور مرتبط</option>
                      {invoiceOptions.map((item) => (
                        <option key={getFinanceRecordId(item)} value={getFinanceRecordId(item)}>
                          {item.invoiceNumber ? `${item.invoiceNumber} - ` : ''}{item.title || 'بدون عنوان'}
                        </option>
                      ))}
                    </select>
                    <span className="mt-1 text-xs leading-6 text-base-content/50">
                      برای تسویه یا تحقق یک فاکتور دریافتنی/پرداختنی استفاده می‌شود.
                    </span>
                  </label>
                ) : null}
              </div>

              {actualRelationMissing ? (
                <div className="mt-3 rounded-2xl border border-error/20 bg-error/5 px-4 py-3 text-sm font-bold leading-7 text-error">
                  برای این نوع رکورد، حداقل یکی از موارد «پیش‌بینی مرتبط» یا «فاکتور مرتبط» باید انتخاب شود.
                </div>
              ) : null}
            </section>
          ) : null}

          {isInvoiceRecord ? (
            <section className="avid-form-section">
              <div className="mb-5">
                <h4 className="avid-form-title">طرف حساب</h4>
                <p className="avid-form-hint mt-1">
                  برای گزارش فاکتورهای پروژه، طرف حساب و اطلاعات تماس را کامل ثبت کنید.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <label className="form-control lg:col-span-2">
                  <span className="label label-text">نام طرف حساب</span>
                  <input className="input input-bordered bg-base-100" {...register('counterpartyName')} />
                </label>

                <label className="form-control">
                  <span className="label label-text">تلفن</span>
                  <input className="input input-bordered bg-base-100" {...register('counterpartyPhone')} />
                </label>

                <label className="form-control">
                  <span className="label label-text">شناسه ملی / اقتصادی</span>
                  <input className="input input-bordered bg-base-100" {...register('counterpartyNationalIdOrEconomicCode')} />
                </label>

                <label className="form-control lg:col-span-4">
                  <span className="label label-text">آدرس</span>
                  <input className="input input-bordered bg-base-100" {...register('address')} />
                </label>
              </div>
            </section>
          ) : null}

          <section className="avid-form-section">
            <div className="mb-5 flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-warning" />
              <div>
                <h4 className="avid-form-title">دلایل و توضیحات مدیریتی</h4>
                <p className="avid-form-hint mt-1">
                  اگر فاکتور یا پیش‌بینی در سررسید محقق نشده، دلیل عدم تحقق باید روشن باشد.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="form-control">
                <span className="label label-text">دلیل عدم تحقق</span>
                <textarea
                  className="textarea textarea-bordered min-h-24 bg-base-100"
                  placeholder="مثلاً عدم پرداخت کارفرما، نقص مدارک، تغییر فاز پروژه"
                  {...register('notAchievedReason')}
                />
              </label>

              <label className="form-control">
                <span className="label label-text">دلیل تأخیر</span>
                <textarea
                  className="textarea textarea-bordered min-h-24 bg-base-100"
                  placeholder="علت تأخیر در دریافت یا پرداخت"
                  {...register('delayReason')}
                />
              </label>

              {canManage ? (
                <label className="form-control md:col-span-2">
                  <span className="label label-text">یادداشت مدیر</span>
                  <textarea
                    className="textarea textarea-bordered min-h-24 bg-base-100"
                    placeholder="یادداشت داخلی مدیر پروژه"
                    {...register('managerNote')}
                  />
                </label>
              ) : null}
            </div>
          </section>

          <div className="sticky bottom-0 -mx-6 border-t border-base-300 bg-base-100 px-6 py-4">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                انصراف
              </button>

              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <span className="loading loading-spinner loading-sm" />
                    در حال ذخیره...
                  </>
                ) : isEditMode ? (
                  'ذخیره تغییرات'
                ) : (
                  'ثبت رکورد مالی'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </dialog>
  );
};