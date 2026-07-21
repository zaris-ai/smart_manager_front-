import ShamsiDateInput from '@/components/common/ShamsiDateInput';
import leaveRequestService from '@/services/leave-request.service';
import type {
  LeaveDurationType,
  LeaveHalfDayPeriod,
  LeaveRequest,
  LeaveRequestOptions,
  LeaveRequestPayload,
  LeaveRequestType,
} from '@/types/leave-request';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  options: LeaveRequestOptions | null;
  request?: LeaveRequest | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

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

const toDateKey = (value?: string | null) => String(value || '').slice(0, 10);

const LeaveRequestFormModal = ({
  open,
  options,
  request,
  onClose,
  onSaved,
}: Props) => {
  const [payload, setPayload] = useState<LeaveRequestPayload>(defaultPayload());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (!request) {
      setPayload(defaultPayload());
      return;
    }

    setPayload({
      leaveType: request.leaveType,
      durationType: request.durationType,
      startDate: toDateKey(request.startDate),
      endDate: toDateKey(request.endDate),
      halfDayPeriod: request.halfDayPeriod || 'morning',
      startTime: request.startTime || '08:00',
      endTime: request.endTime || '09:00',
      reason: request.reason,
      handoverNotes: request.handoverNotes || '',
      emergencyContact: request.emergencyContact || '',
    });
  }, [open, request]);

  const effectiveDurationType = useMemo<LeaveDurationType>(
    () => (payload.leaveType === 'hourly' ? 'hourly' : payload.durationType),
    [payload.durationType, payload.leaveType],
  );

  const update = <K extends keyof LeaveRequestPayload>(
    key: K,
    value: LeaveRequestPayload[K],
  ) => setPayload((current) => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

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
        effectiveDurationType === 'full_day' ? payload.endDate : payload.startDate,
    };

    try {
      setSaving(true);
      if (request?.id) await leaveRequestService.update(request.id, normalized);
      else await leaveRequestService.create(normalized);
      await onSaved();
    } catch (error) {
      if (error instanceof Error && error.message) toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm" dir="rtl">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-base-300 bg-base-100 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-base-300 bg-base-100/95 px-5 py-4 backdrop-blur">
          <div>
            <h2 className="text-xl font-black">
              {request ? 'ویرایش درخواست مرخصی' : 'ثبت درخواست مرخصی'}
            </h2>
            <p className="mt-1 text-xs text-base-content/55">
              بازه و دلیل درخواست را دقیق ثبت کنید تا مدیر بتواند سریع تصمیم بگیرد.
            </p>
          </div>
          <button type="button" className="btn btn-ghost btn-circle" onClick={onClose} disabled={saving}>
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form className="space-y-5 p-5" onSubmit={submit}>
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
                if (effectiveDurationType !== 'full_day' || payload.endDate < value) {
                  update('endDate', value);
                }
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
                <input
                  type="time"
                  className="input input-bordered bg-base-100"
                  value={payload.startTime || ''}
                  onChange={(event) => update('startTime', event.target.value)}
                />
              </label>
              <label className="form-control">
                <span className="label label-text font-bold">ساعت پایان</span>
                <input
                  type="time"
                  className="input input-bordered bg-base-100"
                  value={payload.endTime || ''}
                  onChange={(event) => update('endTime', event.target.value)}
                />
              </label>
            </div>
          ) : null}

          <label className="form-control">
            <span className="label label-text font-bold">دلیل درخواست</span>
            <textarea
              className="textarea textarea-bordered min-h-28 bg-base-100 leading-7"
              value={payload.reason}
              maxLength={3000}
              placeholder="دلیل مرخصی و توضیح لازم برای بررسی مدیر را بنویسید..."
              onChange={(event) => update('reason', event.target.value)}
            />
          </label>

          <label className="form-control">
            <span className="label label-text font-bold">تحویل کار و هماهنگی‌ها</span>
            <textarea
              className="textarea textarea-bordered min-h-24 bg-base-100 leading-7"
              value={payload.handoverNotes || ''}
              maxLength={3000}
              placeholder="کارهای در جریان، جانشین، زمان تحویل یا هماهنگی‌های لازم..."
              onChange={(event) => update('handoverNotes', event.target.value)}
            />
          </label>

          <label className="form-control">
            <span className="label label-text font-bold">راه تماس ضروری (اختیاری)</span>
            <input
              className="input input-bordered bg-base-100"
              value={payload.emergencyContact || ''}
              maxLength={500}
              placeholder="شماره تماس یا روش ارتباط در شرایط ضروری"
              onChange={(event) => update('emergencyContact', event.target.value)}
            />
          </label>

          <div className="flex flex-col-reverse gap-3 border-t border-base-300 pt-5 sm:flex-row sm:justify-end">
            <button type="button" className="btn btn-ghost rounded-2xl" onClick={onClose} disabled={saving}>
              انصراف
            </button>
            <button type="submit" className="btn btn-primary rounded-2xl px-8" disabled={saving}>
              {saving ? <span className="loading loading-spinner loading-sm" /> : null}
              {request ? 'ذخیره تغییرات' : 'ثبت درخواست'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeaveRequestFormModal;
