import ShamsiDateInput from '@/components/common/ShamsiDateInput';
import {
  DashboardPageHeader,
  SectionCard,
  SoftBadge,
} from '@/components/common/DashboardUi';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import leaveRequestService from '@/services/leave-request.service';
import type {
  LeaveDurationType,
  LeaveHalfDayPeriod,
  LeaveRequest,
  LeaveRequestOptions,
  LeaveRequestPayload,
  LeaveRequestType,
} from '@/types/leave-request';
import { getLeaveEntityId } from '@/types/leave-request';
import { getPanelRole } from '@/utils/role-access';
import { withAuth } from '@/utils/withAuth';
import {
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentCheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

const toDateKey = (value?: string | null) => String(value || '').slice(0, 10);

const requestToPayload = (request: LeaveRequest): LeaveRequestPayload => ({
  leaveType: request.leaveType,
  durationType: request.durationType,
  startDate: toDateKey(request.startDate),
  endDate: toDateKey(request.endDate),
  halfDayPeriod: request.halfDayPeriod || 'morning',
  startTime: request.startTime || '08:00',
  endTime: request.endTime || '09:00',
  reason: request.reason || '',
  handoverNotes: request.handoverNotes || '',
  emergencyContact: request.emergencyContact || '',
});

const EditLeaveRequestPage = () => {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const role = getPanelRole(session?.user?.role);
  const requestId = typeof router.query.id === 'string' ? router.query.id : '';

  const [options, setOptions] = useState<LeaveRequestOptions | null>(null);
  const [request, setRequest] = useState<LeaveRequest | null>(null);
  const [payload, setPayload] = useState<LeaveRequestPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (sessionStatus !== 'loading' && role !== 'expert') {
      void router.replace('/dashboard/leave-requests');
    }
  }, [role, router, sessionStatus]);

  useEffect(() => {
    if (!router.isReady || !requestId || sessionStatus === 'loading' || role !== 'expert') {
      return;
    }

    let active = true;
    setLoading(true);
    setLoadError('');

    Promise.all([
      leaveRequestService.getOptions(),
      leaveRequestService.getById(requestId),
    ])
      .then(([nextOptions, nextRequest]) => {
        if (!active) return;
        setOptions(nextOptions);
        setRequest(nextRequest);
        setPayload(requestToPayload(nextRequest));
      })
      .catch((error) => {
        if (!active) return;
        const message = error instanceof Error
          ? error.message
          : 'جزئیات درخواست مرخصی دریافت نشد.';
        setLoadError(message);
        toast.error(message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [requestId, role, router.isReady, sessionStatus]);

  const effectiveDurationType = useMemo<LeaveDurationType>(
    () =>
      payload?.leaveType === 'hourly'
        ? 'hourly'
        : payload?.durationType || 'full_day',
    [payload?.durationType, payload?.leaveType],
  );

  const update = <K extends keyof LeaveRequestPayload>(
    key: K,
    value: LeaveRequestPayload[K],
  ) => {
    setPayload((current) => (current ? { ...current, [key]: value } : current));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!request || !payload) return;

    if (request.status !== 'pending') {
      toast.error('فقط درخواست در انتظار بررسی قابل ویرایش است.');
      return;
    }
    if (!payload.startDate || !payload.endDate) {
      toast.error('تاریخ شروع و پایان را انتخاب کنید.');
      return;
    }
    if (payload.startDate > payload.endDate) {
      toast.error('تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد.');
      return;
    }
    if (payload.reason.trim().length < 5) {
      toast.error('دلیل مرخصی را کامل‌تر وارد کنید.');
      return;
    }

    const normalized: LeaveRequestPayload = {
      ...payload,
      durationType: effectiveDurationType,
      endDate:
        effectiveDurationType === 'full_day'
          ? payload.endDate
          : payload.startDate,
    };

    try {
      setSaving(true);
      await leaveRequestService.update(getLeaveEntityId(request), normalized);
      await router.push('/dashboard/leave-requests');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'ویرایش درخواست انجام نشد.',
      );
    } finally {
      setSaving(false);
    }
  };

  const notEditable = Boolean(request && request.status !== 'pending');

  return (
    <DashboardLayout>
      {sessionStatus === 'loading' || role !== 'expert' ? (
        <div className="flex min-h-[45vh] items-center justify-center">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      ) : (
        <div className="space-y-6" dir="rtl">
          <DashboardPageHeader
            eyebrow="ویرایش در صفحه مستقل"
            title="ویرایش درخواست مرخصی"
            description="فقط درخواست‌های در انتظار بررسی قابل تغییر هستند. پس از ذخیره، نسخه به‌روزشده در همان کارتابل مدیریت نمایش داده می‌شود."
            backHref="/dashboard/leave-requests"
            backLabel="بازگشت به سوابق مرخصی"
          />

          {loading ? (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="skeleton h-[680px] rounded-3xl" />
              <div className="skeleton h-72 rounded-3xl" />
            </div>
          ) : loadError || !request || !payload ? (
            <SectionCard title="درخواست قابل ویرایش نیست">
              <div className="flex min-h-64 flex-col items-center justify-center text-center">
                <ExclamationTriangleIcon className="h-14 w-14 text-error/70" />
                <p className="mt-4 max-w-xl text-sm leading-7 text-base-content/65">
                  {loadError || 'درخواست مرخصی پیدا نشد.'}
                </p>
                <button
                  type="button"
                  className="btn btn-primary mt-5 rounded-2xl"
                  onClick={() => void router.push('/dashboard/leave-requests')}
                >
                  بازگشت به فهرست
                </button>
              </div>
            </SectionCard>
          ) : (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
              <SectionCard
                title="مشخصات درخواست"
                description="ویرایش‌ها پس از ذخیره بلافاصله جایگزین اطلاعات قبلی می‌شوند."
                actions={
                  <SoftBadge
                    className={
                      request.status === 'pending'
                        ? 'bg-warning/10 text-warning'
                        : 'bg-base-300 text-base-content/60'
                    }
                  >
                    {request.statusLabel}
                  </SoftBadge>
                }
              >
                {notEditable ? (
                  <div className="mb-5 rounded-2xl border border-warning/25 bg-warning/5 p-4 text-sm leading-7">
                    این درخواست قبلاً بررسی یا لغو شده است و دیگر قابل ویرایش نیست.
                  </div>
                ) : null}

                <form className="space-y-6" onSubmit={submit}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="form-control">
                      <span className="label label-text font-bold">نوع مرخصی</span>
                      <select
                        className="select select-bordered bg-base-100"
                        value={payload.leaveType}
                        disabled={notEditable || saving}
                        onChange={(event) => {
                          const value = event.target.value as LeaveRequestType;
                          update('leaveType', value);
                          if (value === 'hourly') update('durationType', 'hourly');
                        }}
                      >
                        {(options?.leaveTypes || []).map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="form-control">
                      <span className="label label-text font-bold">شیوه محاسبه مدت</span>
                      <select
                        className="select select-bordered bg-base-100"
                        value={effectiveDurationType}
                        disabled={notEditable || saving || payload.leaveType === 'hourly'}
                        onChange={(event) =>
                          update(
                            'durationType',
                            event.target.value as LeaveDurationType,
                          )
                        }
                      >
                        {(options?.durationTypes || []).map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <ShamsiDateInput
                      label="تاریخ شروع"
                      value={payload.startDate}
                      required
                      disabled={notEditable || saving}
                      onChange={(value) => {
                        update('startDate', value);
                        if (
                          effectiveDurationType !== 'full_day' ||
                          payload.endDate < value
                        ) {
                          update('endDate', value);
                        }
                      }}
                    />
                    <ShamsiDateInput
                      label="تاریخ پایان"
                      value={
                        effectiveDurationType === 'full_day'
                          ? payload.endDate
                          : payload.startDate
                      }
                      required
                      disabled={
                        notEditable ||
                        saving ||
                        effectiveDurationType !== 'full_day'
                      }
                      onChange={(value) => update('endDate', value)}
                    />
                  </div>

                  {effectiveDurationType === 'half_day' ? (
                    <label className="form-control">
                      <span className="label label-text font-bold">بازه نیم‌روز</span>
                      <div className="grid grid-cols-2 gap-3">
                        {(options?.halfDayPeriods || []).map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            disabled={notEditable || saving}
                            className={`btn rounded-2xl ${
                              payload.halfDayPeriod === option.value
                                ? 'btn-primary'
                                : 'btn-outline'
                            }`}
                            onClick={() =>
                              update(
                                'halfDayPeriod',
                                option.value as LeaveHalfDayPeriod,
                              )
                            }
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </label>
                  ) : null}

                  {effectiveDurationType === 'hourly' ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="form-control">
                        <span className="label label-text font-bold">ساعت شروع</span>
                        <input
                          type="time"
                          className="input input-bordered bg-base-100"
                          value={payload.startTime || ''}
                          disabled={notEditable || saving}
                          onChange={(event) => update('startTime', event.target.value)}
                        />
                      </label>
                      <label className="form-control">
                        <span className="label label-text font-bold">ساعت پایان</span>
                        <input
                          type="time"
                          className="input input-bordered bg-base-100"
                          value={payload.endTime || ''}
                          disabled={notEditable || saving}
                          onChange={(event) => update('endTime', event.target.value)}
                        />
                      </label>
                    </div>
                  ) : null}

                  <label className="form-control">
                    <span className="label label-text font-bold">دلیل درخواست</span>
                    <textarea
                      className="textarea textarea-bordered min-h-36 bg-base-100 leading-8"
                      value={payload.reason}
                      maxLength={3000}
                      disabled={notEditable || saving}
                      onChange={(event) => update('reason', event.target.value)}
                    />
                    <span className="mt-1 text-left text-xs text-base-content/40">
                      {payload.reason.length.toLocaleString('fa-IR')} / ۳۰۰۰
                    </span>
                  </label>

                  <label className="form-control">
                    <span className="label label-text font-bold">تحویل کار و هماهنگی‌ها</span>
                    <textarea
                      className="textarea textarea-bordered min-h-32 bg-base-100 leading-8"
                      value={payload.handoverNotes || ''}
                      maxLength={3000}
                      disabled={notEditable || saving}
                      onChange={(event) =>
                        update('handoverNotes', event.target.value)
                      }
                    />
                  </label>

                  <label className="form-control">
                    <span className="label label-text font-bold">راه تماس ضروری</span>
                    <input
                      className="input input-bordered bg-base-100"
                      value={payload.emergencyContact || ''}
                      maxLength={500}
                      disabled={notEditable || saving}
                      onChange={(event) =>
                        update('emergencyContact', event.target.value)
                      }
                    />
                  </label>

                  <div className="flex flex-col-reverse gap-3 border-t border-base-300 pt-6 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      className="btn btn-ghost rounded-2xl"
                      onClick={() => void router.push('/dashboard/leave-requests')}
                      disabled={saving}
                    >
                      انصراف
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary rounded-2xl px-10"
                      disabled={saving || notEditable}
                    >
                      {saving ? (
                        <span className="loading loading-spinner loading-sm" />
                      ) : (
                        <DocumentCheckIcon className="h-5 w-5" />
                      )}
                      ذخیره تغییرات
                    </button>
                  </div>
                </form>
              </SectionCard>

              <div className="space-y-4">
                <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/15 via-base-100 to-info/10 p-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-content">
                    <CalendarDaysIcon className="h-6 w-6" />
                  </div>
                  <h2 className="mt-4 text-lg font-black">پیش از ذخیره</h2>
                  <div className="mt-4 space-y-3 text-sm leading-7 text-base-content/65">
                    <div className="flex gap-2">
                      <CheckCircleIcon className="mt-1 h-5 w-5 shrink-0 text-success" />
                      <span>بازه جدید با درخواست‌های فعال دیگر تداخل ندارد.</span>
                    </div>
                    <div className="flex gap-2">
                      <CheckCircleIcon className="mt-1 h-5 w-5 shrink-0 text-success" />
                      <span>تحویل کار و هماهنگی‌ها به‌روز شده‌اند.</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-warning/25 bg-warning/5 p-5">
                  <div className="flex items-center gap-2 font-black text-warning">
                    <InformationCircleIcon className="h-5 w-5" />
                    محدودیت ویرایش
                  </div>
                  <p className="mt-3 text-sm leading-7 text-base-content/65">
                    پس از تأیید، رد یا لغو درخواست، این صفحه فقط وضعیت را نشان می‌دهد و ذخیره غیرفعال می‌شود.
                  </p>
                </div>

                <div className="rounded-3xl border border-base-300 bg-base-100 p-5">
                  <div className="flex items-center gap-2 font-black">
                    <ClockIcon className="h-5 w-5 text-info" />
                    شناسه درخواست
                  </div>
                  <code className="mt-3 block break-all rounded-xl bg-base-200 p-3 text-left text-xs" dir="ltr">
                    {getLeaveEntityId(request)}
                  </code>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};

export const getServerSideProps = withAuth();
export default EditLeaveRequestPage;
