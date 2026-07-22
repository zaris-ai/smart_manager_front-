import ShamsiDateInput from '@/components/common/ShamsiDateInput';
import { DashboardPageHeader, SectionCard, SoftBadge } from '@/components/common/DashboardUi';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import leaveRequestService from '@/services/leave-request.service';
import type {
  LeaveDurationType,
  LeaveHalfDayPeriod,
  LeaveRequestOptions,
  LeaveRequestPayload,
  LeaveRequestType,
} from '@/types/leave-request';
import { withAuth } from '@/utils/withAuth';
import { getPanelRole } from '@/utils/role-access';
import {
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentCheckIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

const todayKey = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const defaultPayload = (): LeaveRequestPayload => ({
  leaveType: 'annual',
  durationType: 'full_day',
  startDate: todayKey(),
  endDate: todayKey(),
  halfDayPeriod: 'morning',
  startTime: '08:00',
  endTime: '09:00',
  reason: '',
  handoverNotes: '',
  emergencyContact: '',
});

const NewLeaveRequestPage = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const role = getPanelRole(session?.user?.role);
  const [options, setOptions] = useState<LeaveRequestOptions | null>(null);
  const [payload, setPayload] = useState<LeaveRequestPayload>(defaultPayload());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== 'loading' && (role === 'manager' || role === 'board')) {
      void router.replace('/dashboard/leave-requests');
    }
  }, [role, router, status]);

  useEffect(() => {
    if (status === 'loading' || role !== 'expert') return;
    let active = true;
    leaveRequestService
      .getOptions()
      .then((value) => {
        if (active) setOptions(value);
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : 'گزینه‌های مرخصی دریافت نشد.'))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [role, status]);

  const effectiveDurationType = useMemo<LeaveDurationType>(
    () => (payload.leaveType === 'hourly' ? 'hourly' : payload.durationType),
    [payload.durationType, payload.leaveType],
  );

  const update = <K extends keyof LeaveRequestPayload>(key: K, value: LeaveRequestPayload[K]) =>
    setPayload((current) => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!payload.startDate || !payload.endDate) return toast.error('تاریخ شروع و پایان را انتخاب کنید.');
    if (payload.startDate > payload.endDate) return toast.error('تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد.');
    if (payload.reason.trim().length < 5) return toast.error('دلیل مرخصی را کامل‌تر وارد کنید.');

    const normalized: LeaveRequestPayload = {
      ...payload,
      durationType: effectiveDurationType,
      endDate: effectiveDurationType === 'full_day' ? payload.endDate : payload.startDate,
    };

    try {
      setSaving(true);
      await leaveRequestService.create(normalized);
      await router.push('/dashboard/leave-requests');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'ثبت درخواست انجام نشد.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      {status === 'loading' || role !== 'expert' ? (
        <div className="flex min-h-[45vh] items-center justify-center">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      ) : (
      <div className="space-y-6" dir="rtl">
        <DashboardPageHeader
          eyebrow="فرآیند مستقل ثبت درخواست"
          title="ثبت درخواست مرخصی"
          description="این صفحه فقط برای ثبت دقیق درخواست طراحی شده است. نوع مرخصی، بازه، دلیل و نحوه تحویل کار را کامل کنید تا فرآیند بررسی بدون رفت‌وبرگشت انجام شود."
          backHref="/dashboard/leave-requests"
          backLabel="بازگشت به سوابق مرخصی"
        />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <SectionCard title="مشخصات درخواست" description="اطلاعات ستاره‌دار برای ارسال درخواست الزامی است.">
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, index) => <div key={index} className="skeleton h-20 rounded-2xl" />)}
              </div>
            ) : (
              <form className="space-y-6" onSubmit={submit}>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="form-control">
                    <span className="label label-text font-bold">نوع مرخصی</span>
                    <select
                      className="select select-bordered bg-base-100"
                      value={payload.leaveType}
                      onChange={(event) => {
                        const value = event.target.value as LeaveRequestType;
                        update('leaveType', value);
                        if (value === 'hourly') update('durationType', 'hourly');
                      }}
                    >
                      {(options?.leaveTypes || []).map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>

                  <label className="form-control">
                    <span className="label label-text font-bold">شیوه محاسبه مدت</span>
                    <select
                      className="select select-bordered bg-base-100"
                      value={effectiveDurationType}
                      disabled={payload.leaveType === 'hourly'}
                      onChange={(event) => update('durationType', event.target.value as LeaveDurationType)}
                    >
                      {(options?.durationTypes || []).map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <ShamsiDateInput
                    label="تاریخ شروع"
                    value={payload.startDate}
                    required
                    onChange={(value) => {
                      update('startDate', value);
                      if (effectiveDurationType !== 'full_day' || payload.endDate < value) update('endDate', value);
                    }}
                  />
                  <ShamsiDateInput
                    label="تاریخ پایان"
                    value={effectiveDurationType === 'full_day' ? payload.endDate : payload.startDate}
                    required
                    disabled={effectiveDurationType !== 'full_day'}
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
                          className={`btn rounded-2xl ${payload.halfDayPeriod === option.value ? 'btn-primary' : 'btn-outline'}`}
                          onClick={() => update('halfDayPeriod', option.value as LeaveHalfDayPeriod)}
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
                      <input type="time" className="input input-bordered bg-base-100" value={payload.startTime || ''} onChange={(event) => update('startTime', event.target.value)} />
                    </label>
                    <label className="form-control">
                      <span className="label label-text font-bold">ساعت پایان</span>
                      <input type="time" className="input input-bordered bg-base-100" value={payload.endTime || ''} onChange={(event) => update('endTime', event.target.value)} />
                    </label>
                  </div>
                ) : null}

                <label className="form-control">
                  <span className="label label-text font-bold">دلیل درخواست</span>
                  <textarea className="textarea textarea-bordered min-h-36 bg-base-100 leading-8" value={payload.reason} maxLength={3000} placeholder="دلیل مرخصی و توضیح لازم برای بررسی مدیر را دقیق بنویسید..." onChange={(event) => update('reason', event.target.value)} />
                  <span className="mt-1 text-left text-xs text-base-content/40">{payload.reason.length.toLocaleString('fa-IR')} / ۳۰۰۰</span>
                </label>

                <label className="form-control">
                  <span className="label label-text font-bold">تحویل کار و هماهنگی‌ها</span>
                  <textarea className="textarea textarea-bordered min-h-32 bg-base-100 leading-8" value={payload.handoverNotes || ''} maxLength={3000} placeholder="کارهای در جریان، جانشین، زمان تحویل و هماهنگی‌های لازم را مشخص کنید..." onChange={(event) => update('handoverNotes', event.target.value)} />
                </label>

                <label className="form-control">
                  <span className="label label-text font-bold">راه تماس ضروری (اختیاری)</span>
                  <input className="input input-bordered bg-base-100" value={payload.emergencyContact || ''} maxLength={500} placeholder="شماره تماس یا روش ارتباط در شرایط ضروری" onChange={(event) => update('emergencyContact', event.target.value)} />
                </label>

                <div className="flex flex-col-reverse gap-3 border-t border-base-300 pt-6 sm:flex-row sm:justify-end">
                  <button type="button" className="btn btn-ghost rounded-2xl" onClick={() => void router.push('/dashboard/leave-requests')} disabled={saving}>انصراف</button>
                  <button type="submit" className="btn btn-primary rounded-2xl px-10" disabled={saving}>
                    {saving ? <span className="loading loading-spinner loading-sm" /> : <DocumentCheckIcon className="h-5 w-5" />}
                    ثبت نهایی درخواست
                  </button>
                </div>
              </form>
            )}
          </SectionCard>

          <div className="space-y-4">
            <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/15 via-base-100 to-info/10 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-content">
                <CalendarDaysIcon className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-lg font-black">قبل از ثبت بررسی کنید</h2>
              <div className="mt-4 space-y-3 text-sm leading-7 text-base-content/65">
                <div className="flex gap-2"><CheckCircleIcon className="mt-1 h-5 w-5 shrink-0 text-success" /><span>تاریخ و بازه زمانی دقیق است.</span></div>
                <div className="flex gap-2"><CheckCircleIcon className="mt-1 h-5 w-5 shrink-0 text-success" /><span>کارهای جاری و جانشین مشخص شده‌اند.</span></div>
                <div className="flex gap-2"><CheckCircleIcon className="mt-1 h-5 w-5 shrink-0 text-success" /><span>درخواست با مرخصی قبلی تداخل ندارد.</span></div>
              </div>
            </div>

            <div className="rounded-3xl border border-warning/25 bg-warning/5 p-5">
              <div className="flex items-center gap-2 font-black text-warning"><InformationCircleIcon className="h-5 w-5" />فرآیند بعد از ثبت</div>
              <p className="mt-3 text-sm leading-7 text-base-content/65">درخواست در وضعیت «در انتظار بررسی» قرار می‌گیرد. تا پیش از تصمیم مدیر می‌توانید آن را از صفحه سوابق ویرایش یا لغو کنید.</p>
            </div>

            <div className="rounded-3xl border border-base-300 bg-base-100 p-5">
              <div className="flex items-center gap-2 font-black"><ClockIcon className="h-5 w-5 text-info" />نکته مدت مرخصی</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <SoftBadge className="bg-info/10 text-info">روز کامل</SoftBadge>
                <SoftBadge className="bg-secondary/10 text-secondary">نیم‌روز</SoftBadge>
                <SoftBadge className="bg-primary/10 text-primary">ساعتی</SoftBadge>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
    </DashboardLayout>
  );
};

export const getServerSideProps = withAuth();
export default NewLeaveRequestPage;
