import UserAvatar from '@/components/common/UserAvatar';
import leaveRequestService from '@/services/leave-request.service';
import type { LeaveRequest } from '@/types/leave-request';
import { getLeaveEntityId } from '@/types/leave-request';
import { formatShamsiDateLong } from '@/utils/shamsi-date';
import { CheckCircleIcon, XCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  request: LeaveRequest | null;
  onClose: () => void;
  onReviewed: () => void | Promise<void>;
}

const requesterOf = (request: LeaveRequest | null) =>
  request && typeof request.requesterId === 'object' ? request.requesterId : null;

const LeaveReviewModal = ({ open, request, onClose, onReviewed }: Props) => {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState<'approve' | 'reject' | null>(null);

  useEffect(() => {
    if (open) setNote('');
  }, [open, request?.id]);

  if (!open || !request) return null;
  const requester = requesterOf(request);

  const review = async (action: 'approve' | 'reject') => {
    if (action === 'reject' && note.trim().length < 3) {
      toast.error('برای رد درخواست، دلیل را وارد کنید.');
      return;
    }

    try {
      setSaving(action);
      if (action === 'approve') {
        await leaveRequestService.approve(getLeaveEntityId(request), note.trim());
      } else {
        await leaveRequestService.reject(getLeaveEntityId(request), note.trim());
      }
      await onReviewed();
    } catch (error) {
      if (error instanceof Error && error.message) toast.error(error.message);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm" dir="rtl">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-base-300 bg-base-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-base-300 p-5">
          <div>
            <h2 className="text-xl font-black">بررسی درخواست مرخصی</h2>
            <p className="mt-1 text-xs text-base-content/55">تصمیم نهایی همراه با سابقه مدیر بررسی‌کننده ذخیره می‌شود.</p>
          </div>
          <button type="button" className="btn btn-ghost btn-circle" onClick={onClose} disabled={Boolean(saving)}>
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div className="flex items-center gap-3 rounded-2xl bg-base-200/70 p-4">
            <UserAvatar userId={requester?._id || requester?.id} name={requester?.fullName} size="lg" />
            <div>
              <div className="font-black">{requester?.fullName || 'کاربر'}</div>
              <div className="mt-1 text-xs text-base-content/55">{requester?.profile?.jobTitle || requester?.roleLabel || '—'}</div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-base-300 p-3">
              <div className="text-xs text-base-content/50">نوع</div>
              <div className="mt-1 font-bold">{request.leaveTypeLabel}</div>
            </div>
            <div className="rounded-2xl border border-base-300 p-3">
              <div className="text-xs text-base-content/50">مدت</div>
              <div className="mt-1 font-bold">{request.durationTypeLabel}</div>
            </div>
            <div className="rounded-2xl border border-base-300 p-3">
              <div className="text-xs text-base-content/50">بازه</div>
              <div className="mt-1 text-sm font-bold">
                {formatShamsiDateLong(request.startDate)}
                {request.startDate.slice(0, 10) !== request.endDate.slice(0, 10)
                  ? ` تا ${formatShamsiDateLong(request.endDate)}`
                  : ''}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-base-300 p-4">
            <div className="text-xs font-bold text-base-content/50">دلیل درخواست</div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-7">{request.reason}</p>
          </div>

          {request.handoverNotes ? (
            <div className="rounded-2xl border border-info/25 bg-info/5 p-4">
              <div className="text-xs font-bold text-info">تحویل کار و هماهنگی‌ها</div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-7">{request.handoverNotes}</p>
            </div>
          ) : null}

          <label className="form-control">
            <span className="label label-text font-bold">توضیح مدیر</span>
            <textarea
              className="textarea textarea-bordered min-h-24 bg-base-100 leading-7"
              value={note}
              maxLength={2000}
              placeholder="برای تأیید اختیاری و برای رد درخواست الزامی است..."
              onChange={(event) => setNote(event.target.value)}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              className="btn btn-success rounded-2xl text-success-content"
              onClick={() => void review('approve')}
              disabled={Boolean(saving)}
            >
              {saving === 'approve' ? <span className="loading loading-spinner loading-sm" /> : <CheckCircleIcon className="h-5 w-5" />}
              تأیید درخواست
            </button>
            <button
              type="button"
              className="btn btn-error rounded-2xl text-error-content"
              onClick={() => void review('reject')}
              disabled={Boolean(saving)}
            >
              {saving === 'reject' ? <span className="loading loading-spinner loading-sm" /> : <XCircleIcon className="h-5 w-5" />}
              رد درخواست
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaveReviewModal;
