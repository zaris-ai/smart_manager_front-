import ShamsiDateInput from '@/components/common/ShamsiDateInput';
import UserAvatar from '@/components/common/UserAvatar';
import {
  AdminStatCard,
  DashboardPageHeader,
  FilterBar,
  SectionCard,
  SoftBadge,
} from '@/components/common/DashboardUi';
import {
  LeaveRequestFormModal,
  LeaveReviewModal,
} from '@/components/leave-requests';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import leaveRequestService from '@/services/leave-request.service';
import type {
  LeavePagination,
  LeaveRequest,
  LeaveRequestFilters,
  LeaveRequestOptions,
  LeaveRequestStatus,
  LeaveRequestSummary,
} from '@/types/leave-request';
import { getLeaveEntityId } from '@/types/leave-request';
import type { AppUser } from '@/types/user';
import { getPanelRole } from '@/utils/role-access';
import {
  formatShamsiDateLong,
  formatShamsiDateTime,
} from '@/utils/shamsi-date';
import { confirmToast } from '@/utils/sonner-confirm';
import { withAuth } from '@/utils/withAuth';
import {
  ArrowPathIcon,
  CalendarDaysIcon,
  CheckBadgeIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

const EMPTY_SUMMARY: LeaveRequestSummary = {
  mine: {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0,
    approvedDurationMinutes: 0,
  },
  review: {
    pendingCount: 0,
    pendingDurationMinutes: 0,
  },
  permissions: { canReview: false },
};

const EMPTY_PAGINATION: LeavePagination = {
  total: 0,
  page: 1,
  limit: 12,
  totalPages: 0,
  hasPrevPage: false,
  hasNextPage: false,
  prevPage: null,
  nextPage: null,
};

type TabKey = 'mine' | 'review';

const statusClasses: Record<LeaveRequestStatus, string> = {
  pending: 'bg-warning/12 text-warning',
  approved: 'bg-success/12 text-success',
  rejected: 'bg-error/12 text-error',
  cancelled: 'bg-base-300 text-base-content/55',
};

const statusIcons = {
  pending: ClockIcon,
  approved: CheckCircleIcon,
  rejected: XCircleIcon,
  cancelled: ExclamationTriangleIcon,
};

const userOf = (value: LeaveRequest['requesterId'] | LeaveRequest['reviewerId']) =>
  value && typeof value === 'object' ? value : null;

const durationText = (request: LeaveRequest): string => {
  if (request.durationType === 'hourly') {
    const hours = Math.floor(request.durationMinutes / 60);
    const minutes = request.durationMinutes % 60;
    if (hours && minutes) return `${hours.toLocaleString('fa-IR')} ساعت و ${minutes.toLocaleString('fa-IR')} دقیقه`;
    if (hours) return `${hours.toLocaleString('fa-IR')} ساعت`;
    return `${minutes.toLocaleString('fa-IR')} دقیقه`;
  }

  if (request.durationType === 'half_day') return 'نیم‌روز';
  return `${request.durationDays.toLocaleString('fa-IR')} روز`;
};

const periodText = (request: LeaveRequest): string => {
  const start = formatShamsiDateLong(request.startDate);
  const end = formatShamsiDateLong(request.endDate);
  if (request.durationType === 'hourly') {
    return `${start}، از ${request.startTime || '—'} تا ${request.endTime || '—'}`;
  }
  if (request.durationType === 'half_day') {
    return `${start}، ${request.halfDayPeriod === 'afternoon' ? 'بعدازظهر' : 'صبح'}`;
  }
  return request.startDate.slice(0, 10) === request.endDate.slice(0, 10)
    ? start
    : `${start} تا ${end}`;
};

const LeaveRequestCard = ({
  request,
  reviewMode,
  onEdit,
  onCancel,
  onReview,
}: {
  request: LeaveRequest;
  reviewMode: boolean;
  onEdit: (request: LeaveRequest) => void;
  onCancel: (request: LeaveRequest) => void;
  onReview: (request: LeaveRequest) => void;
}) => {
  const requester = userOf(request.requesterId);
  const reviewer = userOf(request.reviewerId);
  const StatusIcon = statusIcons[request.status];

  return (
    <article className="group overflow-hidden rounded-3xl border border-base-300 bg-base-100 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="h-1.5 bg-gradient-to-l from-primary via-info to-secondary opacity-75" />
      <div className="space-y-4 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            {reviewMode ? (
              <UserAvatar
                userId={requester?._id || requester?.id}
                name={requester?.fullName}
                size="lg"
              />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <CalendarDaysIcon className="h-7 w-7" />
              </div>
            )}
            <div className="min-w-0">
              {reviewMode ? (
                <div className="truncate font-black">{requester?.fullName || 'کاربر'}</div>
              ) : null}
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="font-black text-base-content">{request.leaveTypeLabel}</span>
                <SoftBadge className={statusClasses[request.status]}>
                  <StatusIcon className="h-4 w-4" />
                  {request.statusLabel}
                </SoftBadge>
              </div>
              <p className="mt-2 text-xs text-base-content/50">
                ثبت در {formatShamsiDateTime(request.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {reviewMode && request.status === 'pending' ? (
              <button type="button" className="btn btn-primary btn-sm rounded-xl" onClick={() => onReview(request)}>
                <ShieldCheckIcon className="h-4 w-4" />
                بررسی
              </button>
            ) : null}
            {!reviewMode && request.status === 'pending' ? (
              <>
                <button type="button" className="btn btn-outline btn-sm rounded-xl" onClick={() => onEdit(request)}>
                  <PencilSquareIcon className="h-4 w-4" />
                  ویرایش
                </button>
                <button type="button" className="btn btn-ghost btn-sm rounded-xl text-error" onClick={() => onCancel(request)}>
                  لغو
                </button>
              </>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-base-200/65 p-3">
            <div className="text-[11px] font-bold text-base-content/45">بازه مرخصی</div>
            <div className="mt-1 text-sm font-black leading-6">{periodText(request)}</div>
          </div>
          <div className="rounded-2xl bg-base-200/65 p-3">
            <div className="text-[11px] font-bold text-base-content/45">مدت درخواست</div>
            <div className="mt-1 text-sm font-black">{durationText(request)}</div>
          </div>
          <div className="rounded-2xl bg-base-200/65 p-3">
            <div className="text-[11px] font-bold text-base-content/45">نوع بازه</div>
            <div className="mt-1 text-sm font-black">{request.durationTypeLabel}</div>
          </div>
        </div>

        <div className="rounded-2xl border border-base-300 p-4">
          <div className="flex items-center gap-2 text-xs font-black text-base-content/50">
            <DocumentTextIcon className="h-4 w-4" />
            دلیل درخواست
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-base-content/80">{request.reason}</p>
        </div>

        {request.handoverNotes ? (
          <div className="rounded-2xl border border-info/20 bg-info/5 p-4">
            <div className="text-xs font-black text-info">تحویل کار و هماهنگی‌ها</div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-7">{request.handoverNotes}</p>
          </div>
        ) : null}

        {request.reviewedAt ? (
          <div className={`rounded-2xl border p-4 ${request.status === 'approved' ? 'border-success/25 bg-success/5' : 'border-error/25 bg-error/5'}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <UserAvatar userId={reviewer?._id || reviewer?.id} name={reviewer?.fullName} size="xs" />
                <span className="text-xs font-black">بررسی توسط {reviewer?.fullName || 'مدیر'}</span>
              </div>
              <span className="text-[11px] text-base-content/50">{formatShamsiDateTime(request.reviewedAt)}</span>
            </div>
            {request.reviewNote ? <p className="mt-3 whitespace-pre-wrap text-sm leading-7">{request.reviewNote}</p> : null}
          </div>
        ) : null}
      </div>
    </article>
  );
};

const LeaveRequestsPage = () => {
  const { data: session } = useSession();
  const role = getPanelRole(session?.user?.role);
  const [tab, setTab] = useState<TabKey>('mine');
  const [options, setOptions] = useState<LeaveRequestOptions | null>(null);
  const [summary, setSummary] = useState<LeaveRequestSummary>(EMPTY_SUMMARY);
  const [items, setItems] = useState<LeaveRequest[]>([]);
  const [pagination, setPagination] = useState<LeavePagination>(EMPTY_PAGINATION);
  const [requesters, setRequesters] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [filters, setFilters] = useState<LeaveRequestFilters>({
    status: '',
    leaveType: '',
    dateFrom: '',
    dateTo: '',
    search: '',
    requesterId: '',
    page: 1,
    limit: 12,
  });
  const [draftFilters, setDraftFilters] = useState(filters);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LeaveRequest | null>(null);
  const [reviewing, setReviewing] = useState<LeaveRequest | null>(null);

  const canReview = options?.permissions.canReview || summary.permissions.canReview;

  useEffect(() => {
    if (!canReview && tab === 'review') setTab('mine');
  }, [canReview, tab]);

  const loadBootstrap = useCallback(async () => {
    try {
      const [nextOptions, nextSummary] = await Promise.all([
        leaveRequestService.getOptions(),
        leaveRequestService.getSummary(),
      ]);
      setOptions(nextOptions);
      setSummary(nextSummary);

      if (nextOptions.permissions.canReview) {
        const nextRequesters = await leaveRequestService.listRequesters();
        setRequesters(nextRequesters);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'اطلاعات مرخصی دریافت نشد.');
    }
  }, []);

  const loadList = useCallback(
    async (nextFilters: LeaveRequestFilters, silent = false) => {
      try {
        if (silent) setRefreshing(true);
        else setLoading(true);
        const result = tab === 'review'
          ? await leaveRequestService.listReviewQueue(nextFilters)
          : await leaveRequestService.listMine(nextFilters);
        setItems(result.items);
        setPagination(result.pagination);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'درخواست‌های مرخصی دریافت نشد.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [tab],
  );

  const refreshAll = useCallback(async () => {
    await Promise.all([loadBootstrap(), loadList(filters, true)]);
  }, [filters, loadBootstrap, loadList]);

  useEffect(() => {
    void loadBootstrap();
  }, [loadBootstrap]);

  useEffect(() => {
    void loadList(filters);
  }, [filters, loadList]);

  const changeTab = (nextTab: TabKey) => {
    setTab(nextTab);
    const nextFilters: LeaveRequestFilters = {
      status: nextTab === 'review' ? 'pending' : '',
      leaveType: '',
      dateFrom: '',
      dateTo: '',
      search: '',
      requesterId: '',
      page: 1,
      limit: filters.limit || 12,
    };
    setDraftFilters(nextFilters);
    setFilters(nextFilters);
  };

  const applyFilters = () => {
    if (draftFilters.dateFrom && draftFilters.dateTo && draftFilters.dateFrom > draftFilters.dateTo) {
      toast.error('تاریخ شروع فیلتر نمی‌تواند بعد از تاریخ پایان باشد.');
      return;
    }
    setFilters({ ...draftFilters, page: 1, limit: filters.limit || 12 });
  };

  const clearFilters = () => {
    const nextFilters: LeaveRequestFilters = {
      status: tab === 'review' ? 'pending' : '',
      leaveType: '',
      dateFrom: '',
      dateTo: '',
      search: '',
      requesterId: '',
      page: 1,
      limit: filters.limit || 12,
    };
    setDraftFilters(nextFilters);
    setFilters(nextFilters);
  };

  const cancelRequest = async (request: LeaveRequest) => {
    const confirmed = await confirmToast({
      title: 'لغو درخواست مرخصی',
      description: 'درخواست از کارتابل بررسی مدیر خارج می‌شود و سابقه لغو در سامانه باقی می‌ماند.',
      confirmText: 'لغو درخواست',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      await leaveRequestService.cancel(getLeaveEntityId(request));
      await refreshAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'لغو درخواست انجام نشد.');
    }
  };

  const pageTitle = role === 'expert' ? 'درخواست مرخصی من' : 'مدیریت درخواست‌های مرخصی';
  const pageDescription = role === 'expert'
    ? 'درخواست‌های روزانه، نیم‌روز یا ساعتی خود را ثبت کنید و نتیجه بررسی مدیر را ببینید.'
    : 'مرخصی خود را ثبت کنید و درخواست‌های کارکنان را در کارتابل مدیریتی تأیید یا رد کنید.';

  return (
    <DashboardLayout>
      <div className="space-y-6" dir="rtl">
        <DashboardPageHeader
          eyebrow={role === 'expert' ? 'فضای کاری کارشناس' : 'منابع انسانی و حضور'}
          title={pageTitle}
          description={pageDescription}
          actions={
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-outline rounded-2xl" onClick={() => void refreshAll()} disabled={refreshing}>
                {refreshing ? <span className="loading loading-spinner loading-sm" /> : <ArrowPathIcon className="h-5 w-5" />}
                بروزرسانی
              </button>
              <Link href="/dashboard/leave-requests/new" className="btn btn-primary rounded-2xl">
                <PlusIcon className="h-5 w-5" />
                ثبت درخواست جدید
              </Link>
            </div>
          }
        />

        <div className={`grid gap-4 sm:grid-cols-2 ${canReview ? 'xl:grid-cols-5' : 'xl:grid-cols-4'}`}>
          <AdminStatCard title="کل درخواست‌های من" value={summary.mine.total.toLocaleString('fa-IR')} description="تمام وضعیت‌ها" icon={DocumentTextIcon} tone="primary" />
          <AdminStatCard title="در انتظار بررسی" value={summary.mine.pending.toLocaleString('fa-IR')} description="درخواست‌های قابل ویرایش" icon={ClockIcon} tone="warning" />
          <AdminStatCard title="تأیید شده" value={summary.mine.approved.toLocaleString('fa-IR')} description="مرخصی‌های پذیرفته‌شده" icon={CheckBadgeIcon} tone="success" />
          <AdminStatCard title="رد یا لغو شده" value={(summary.mine.rejected + summary.mine.cancelled).toLocaleString('fa-IR')} description="سوابق تصمیم و لغو" icon={XCircleIcon} tone="error" />
          {canReview ? (
            <AdminStatCard title="منتظر تصمیم من" value={summary.review.pendingCount.toLocaleString('fa-IR')} description="درخواست سایر کاربران" icon={UserGroupIcon} tone="info" />
          ) : null}
        </div>

        {canReview ? (
          <div className="avid-glass-surface flex flex-wrap gap-2 rounded-3xl p-2">
            <button type="button" className={`btn flex-1 rounded-2xl sm:flex-none ${tab === 'mine' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => changeTab('mine')}>
              <CalendarDaysIcon className="h-5 w-5" />
              درخواست‌های من
            </button>
            <button type="button" className={`btn flex-1 rounded-2xl sm:flex-none ${tab === 'review' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => changeTab('review')}>
              <ShieldCheckIcon className="h-5 w-5" />
              کارتابل بررسی
              {summary.review.pendingCount ? <span className="badge badge-error badge-sm">{summary.review.pendingCount.toLocaleString('fa-IR')}</span> : null}
            </button>
          </div>
        ) : null}

        <FilterBar>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <label className="form-control xl:col-span-2">
              <span className="label label-text text-xs font-bold">جست‌وجو</span>
              <div className="relative">
                <MagnifyingGlassIcon className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-base-content/35" />
                <input className="input input-bordered w-full bg-base-100 pr-10" value={draftFilters.search || ''} placeholder="دلیل، توضیح تحویل یا نظر مدیر..." onChange={(event) => setDraftFilters((current) => ({ ...current, search: event.target.value }))} />
              </div>
            </label>

            <label className="form-control">
              <span className="label label-text text-xs font-bold">وضعیت</span>
              <select className="select select-bordered bg-base-100" value={draftFilters.status || ''} onChange={(event) => setDraftFilters((current) => ({ ...current, status: event.target.value }))}>
                <option value="">همه وضعیت‌ها</option>
                {(options?.statuses || []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>

            <label className="form-control">
              <span className="label label-text text-xs font-bold">نوع مرخصی</span>
              <select className="select select-bordered bg-base-100" value={draftFilters.leaveType || ''} onChange={(event) => setDraftFilters((current) => ({ ...current, leaveType: event.target.value }))}>
                <option value="">همه انواع</option>
                {(options?.leaveTypes || []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>

            {tab === 'review' ? (
              <label className="form-control">
                <span className="label label-text text-xs font-bold">درخواست‌دهنده</span>
                <select className="select select-bordered bg-base-100" value={draftFilters.requesterId || ''} onChange={(event) => setDraftFilters((current) => ({ ...current, requesterId: event.target.value }))}>
                  <option value="">همه کاربران</option>
                  {requesters.map((user) => <option key={user._id || user.id} value={user._id || user.id}>{user.fullName}</option>)}
                </select>
              </label>
            ) : null}

            <div className={tab === 'review' ? '' : 'xl:col-span-2'}>
              <ShamsiDateInput label="از تاریخ" value={draftFilters.dateFrom || ''} onChange={(value) => setDraftFilters((current) => ({ ...current, dateFrom: value }))} />
            </div>
            <div>
              <ShamsiDateInput label="تا تاریخ" value={draftFilters.dateTo || ''} onChange={(value) => setDraftFilters((current) => ({ ...current, dateTo: value }))} />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button type="button" className="btn btn-ghost rounded-2xl" onClick={clearFilters}>پاک کردن</button>
            <button type="button" className="btn btn-primary rounded-2xl" onClick={applyFilters}>اعمال فیلتر</button>
          </div>
        </FilterBar>

        <SectionCard
          title={tab === 'review' ? 'درخواست‌های نیازمند بررسی' : 'سوابق درخواست‌های من'}
          description={tab === 'review'
            ? 'هر تصمیم همراه با نام مدیر، زمان بررسی و توضیح ثبت می‌شود. درخواست خودتان در این کارتابل نمایش داده نمی‌شود.'
            : 'درخواست‌های در انتظار را می‌توانید قبل از تصمیم مدیر ویرایش یا لغو کنید.'}
          actions={<SoftBadge className="bg-primary/10 text-primary">{pagination.total.toLocaleString('fa-IR')} درخواست</SoftBadge>}
        >
          {loading ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => <div key={index} className="skeleton h-72 rounded-3xl" />)}
            </div>
          ) : !items.length ? (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-base-300 bg-base-200/30 p-8 text-center">
              <CalendarDaysIcon className="h-14 w-14 text-base-content/25" />
              <h3 className="mt-4 text-lg font-black">درخواستی پیدا نشد</h3>
              <p className="mt-2 max-w-lg text-sm leading-7 text-base-content/55">
                {tab === 'review' ? 'در حال حاضر درخواستی مطابق فیلترهای انتخابی برای بررسی وجود ندارد.' : 'هنوز درخواست مرخصی ثبت نکرده‌اید یا نتیجه‌ای مطابق فیلترها وجود ندارد.'}
              </p>
              {tab === 'mine' ? <Link href="/dashboard/leave-requests/new" className="btn btn-primary mt-5 rounded-2xl"><PlusIcon className="h-5 w-5" />ثبت اولین درخواست</Link> : null}
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {items.map((request) => (
                <LeaveRequestCard
                  key={getLeaveEntityId(request)}
                  request={request}
                  reviewMode={tab === 'review'}
                  onEdit={(value) => { setEditing(value); setFormOpen(true); }}
                  onCancel={(value) => void cancelRequest(value)}
                  onReview={setReviewing}
                />
              ))}
            </div>
          )}

          {pagination.totalPages > 1 ? (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-base-300 pt-5">
              <div className="text-xs text-base-content/55">
                صفحه {pagination.page.toLocaleString('fa-IR')} از {pagination.totalPages.toLocaleString('fa-IR')} — {pagination.total.toLocaleString('fa-IR')} نتیجه
              </div>
              <div className="join">
                <button type="button" className="btn btn-sm join-item" disabled={!pagination.hasPrevPage || loading} onClick={() => setFilters((current) => ({ ...current, page: pagination.prevPage || 1 }))}>قبلی</button>
                <button type="button" className="btn btn-sm join-item btn-active">{pagination.page.toLocaleString('fa-IR')}</button>
                <button type="button" className="btn btn-sm join-item" disabled={!pagination.hasNextPage || loading} onClick={() => setFilters((current) => ({ ...current, page: pagination.nextPage || current.page }))}>بعدی</button>
              </div>
            </div>
          ) : null}
        </SectionCard>

        <LeaveRequestFormModal
          open={formOpen}
          options={options}
          request={editing}
          onClose={() => { setFormOpen(false); setEditing(null); }}
          onSaved={async () => { setFormOpen(false); setEditing(null); await refreshAll(); }}
        />

        <LeaveReviewModal
          open={Boolean(reviewing)}
          request={reviewing}
          onClose={() => setReviewing(null)}
          onReviewed={async () => { setReviewing(null); await refreshAll(); }}
        />
      </div>
    </DashboardLayout>
  );
};

export const getServerSideProps = withAuth();
export default LeaveRequestsPage;
