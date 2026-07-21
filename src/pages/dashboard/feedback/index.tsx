import UserAvatar from '@/components/common/UserAvatar';
import {
  AdminStatCard,
  DashboardPageHeader,
  FilterBar,
  SectionCard,
  SoftBadge,
} from '@/components/common/DashboardUi';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import feedbackService from '@/services/feedback.service';
import type {
  FeedbackFilters,
  FeedbackItem,
  FeedbackOptions,
  FeedbackPagination,
  FeedbackPayload,
  FeedbackStatus,
  FeedbackSummary,
  FeedbackType,
} from '@/types/feedback';
import type { AppUser } from '@/types/user';
import { getPanelRole } from '@/utils/role-access';
import { formatShamsiDateTime } from '@/utils/shamsi-date';
import { confirmToast } from '@/utils/sonner-confirm';
import { withAuth } from '@/utils/withAuth';
import {
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  LightBulbIcon,
  MagnifyingGlassIcon,
  MegaphoneIcon,
  PencilSquareIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserGroupIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

const EMPTY_PAGINATION: FeedbackPagination = {
  total: 0,
  page: 1,
  limit: 12,
  totalPages: 0,
  hasPrevPage: false,
  hasNextPage: false,
  prevPage: null,
  nextPage: null,
};

const EMPTY_SUMMARY: FeedbackSummary = {
  mine: { total: 0, new: 0, underReview: 0, responded: 0, closed: 0 },
  inbox: { total: 0, criticisms: 0, suggestions: 0 },
  permissions: { canReview: false },
};

const initialPayload = (): FeedbackPayload => ({
  type: 'suggestion',
  scope: 'general',
  title: '',
  description: '',
  proposedSolution: '',
  isAnonymous: false,
});

const statusClasses: Record<FeedbackStatus, string> = {
  new: 'bg-info/12 text-info',
  under_review: 'bg-warning/12 text-warning',
  responded: 'bg-success/12 text-success',
  closed: 'bg-base-300 text-base-content/60',
  withdrawn: 'bg-error/10 text-error',
};

const objectUser = (value: FeedbackItem['submitterId'] | FeedbackItem['reviewerId']) =>
  value && typeof value === 'object' ? (value as AppUser) : null;

const FeedbackCard = ({
  item,
  inboxMode,
  onEdit,
  onWithdraw,
  onReview,
}: {
  item: FeedbackItem;
  inboxMode: boolean;
  onEdit: (item: FeedbackItem) => void;
  onWithdraw: (item: FeedbackItem) => void;
  onReview: (item: FeedbackItem) => void;
}) => {
  const submitter = objectUser(item.submitterId);
  const reviewer = objectUser(item.reviewerId);
  const isSuggestion = item.type === 'suggestion';

  return (
    <article className="overflow-hidden rounded-3xl border border-base-300 bg-base-100 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className={`h-1.5 ${isSuggestion ? 'bg-gradient-to-l from-primary via-info to-secondary' : 'bg-gradient-to-l from-warning via-error to-secondary'}`} />
      <div className="space-y-4 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-3">
            {inboxMode ? (
              <UserAvatar userId={submitter?._id || submitter?.id} name={submitter?.fullName || 'ناشناس'} size="lg" />
            ) : (
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${isSuggestion ? 'bg-primary/10 text-primary' : 'bg-warning/10 text-warning'}`}>
                {isSuggestion ? <LightBulbIcon className="h-7 w-7" /> : <MegaphoneIcon className="h-7 w-7" />}
              </div>
            )}
            <div className="min-w-0">
              {inboxMode ? <div className="truncate font-black">{submitter?.fullName || 'ناشناس'}</div> : null}
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <SoftBadge className={isSuggestion ? 'bg-primary/10 text-primary' : 'bg-warning/12 text-warning'}>{item.typeLabel}</SoftBadge>
                <SoftBadge className="bg-base-200 text-base-content/65">{item.scopeLabel}</SoftBadge>
                <SoftBadge className={statusClasses[item.status]}>{item.statusLabel}</SoftBadge>
                {item.isAnonymous ? <SoftBadge className="bg-secondary/10 text-secondary">ارسال ناشناس</SoftBadge> : null}
              </div>
              <h3 className="mt-3 text-lg font-black leading-8">{item.title}</h3>
              <p className="mt-1 text-xs text-base-content/45">ثبت در {formatShamsiDateTime(item.createdAt)}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {inboxMode && item.status !== 'withdrawn' ? (
              <button type="button" className="btn btn-primary btn-sm rounded-xl" onClick={() => onReview(item)}>
                <ShieldCheckIcon className="h-4 w-4" />
                بررسی
              </button>
            ) : null}
            {!inboxMode && item.status === 'new' ? (
              <>
                <button type="button" className="btn btn-outline btn-sm rounded-xl" onClick={() => onEdit(item)}><PencilSquareIcon className="h-4 w-4" />ویرایش</button>
                <button type="button" className="btn btn-ghost btn-sm rounded-xl text-error" onClick={() => onWithdraw(item)}>پس گرفتن</button>
              </>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border border-base-300 p-4">
          <div className="text-xs font-black text-base-content/45">شرح موضوع</div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-8 text-base-content/80">{item.description}</p>
        </div>

        {item.proposedSolution ? (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center gap-2 text-xs font-black text-primary"><SparklesIcon className="h-4 w-4" />راهکار پیشنهادی</div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-8">{item.proposedSolution}</p>
          </div>
        ) : null}

        {item.managerResponse || item.reviewedAt ? (
          <div className="rounded-2xl border border-success/25 bg-success/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-black text-success">
                <UserAvatar userId={reviewer?._id || reviewer?.id} name={reviewer?.fullName || 'مدیر'} size="xs" />
                پاسخ مدیریت {reviewer?.fullName ? `— ${reviewer.fullName}` : ''}
              </div>
              {item.reviewedAt ? <span className="text-[11px] text-base-content/45">{formatShamsiDateTime(item.reviewedAt)}</span> : null}
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-8">{item.managerResponse || 'پیام در حال بررسی مدیریت است.'}</p>
          </div>
        ) : null}
      </div>
    </article>
  );
};

const FeedbackPage = () => {
  const { data: session } = useSession();
  const role = getPanelRole(session?.user?.role);
  const [options, setOptions] = useState<FeedbackOptions | null>(null);
  const [summary, setSummary] = useState<FeedbackSummary>(EMPTY_SUMMARY);
  const [tab, setTab] = useState<'mine' | 'inbox'>('mine');
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [pagination, setPagination] = useState<FeedbackPagination>(EMPTY_PAGINATION);
  const [filters, setFilters] = useState<FeedbackFilters>({ page: 1, limit: 12 });
  const [draftFilters, setDraftFilters] = useState<FeedbackFilters>({});
  const [payload, setPayload] = useState<FeedbackPayload>(initialPayload());
  const [editing, setEditing] = useState<FeedbackItem | null>(null);
  const [reviewing, setReviewing] = useState<FeedbackItem | null>(null);
  const [reviewStatus, setReviewStatus] = useState<Extract<FeedbackStatus, 'under_review' | 'responded' | 'closed'>>('under_review');
  const [reviewResponse, setReviewResponse] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const canReview = Boolean(options?.permissions.canReview || summary.permissions.canReview);

  const loadList = useCallback(async () => {
    const result = tab === 'inbox' ? await feedbackService.listInbox(filters) : await feedbackService.listMine(filters);
    setItems(result.items);
    setPagination(result.pagination);
  }, [filters, tab]);

  const refreshAll = useCallback(async () => {
    try {
      setRefreshing(true);
      const [nextOptions, nextSummary] = await Promise.all([
        feedbackService.getOptions(),
        feedbackService.getSummary(),
      ]);
      setOptions(nextOptions);
      setSummary(nextSummary);
      await loadList();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'دریافت اطلاعات انجام نشد.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadList]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    if (!canReview && tab === 'inbox') setTab('mine');
  }, [canReview, tab]);

  const updatePayload = <K extends keyof FeedbackPayload>(key: K, value: FeedbackPayload[K]) =>
    setPayload((current) => ({ ...current, [key]: value }));

  const resetForm = () => {
    setPayload(initialPayload());
    setEditing(null);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (payload.title.trim().length < 3) return toast.error('عنوان را کامل‌تر وارد کنید.');
    if (payload.description.trim().length < 10) return toast.error('شرح موضوع را کامل‌تر وارد کنید.');
    try {
      setSaving(true);
      if (editing) await feedbackService.update(editing.id, payload);
      else await feedbackService.create(payload);
      resetForm();
      setTab('mine');
      setFilters({ page: 1, limit: 12 });
      await refreshAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'ثبت پیام انجام نشد.');
    } finally {
      setSaving(false);
    }
  };

  const editItem = (item: FeedbackItem) => {
    setEditing(item);
    setPayload({
      type: item.type,
      scope: item.scope,
      title: item.title,
      description: item.description,
      proposedSolution: item.proposedSolution || '',
      isAnonymous: item.isAnonymous,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const withdraw = async (item: FeedbackItem) => {
    const accepted = await confirmToast({ title: 'پس گرفتن پیام', description: 'این پیام از کارتابل بررسی خارج می‌شود.', confirmText: 'پس بگیر', variant: 'danger' });
    if (!accepted) return;
    try {
      await feedbackService.withdraw(item.id);
      await refreshAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'عملیات انجام نشد.');
    }
  };

  const openReview = (item: FeedbackItem) => {
    setReviewing(item);
    setReviewStatus(item.status === 'new' ? 'under_review' : item.status === 'closed' ? 'closed' : 'responded');
    setReviewResponse(item.managerResponse || '');
  };

  const submitReview = async () => {
    if (!reviewing) return;
    if (reviewStatus === 'responded' && reviewResponse.trim().length < 3) return toast.error('متن پاسخ مدیریت را وارد کنید.');
    try {
      setSaving(true);
      await feedbackService.review(reviewing.id, reviewStatus, reviewResponse);
      setReviewing(null);
      setReviewResponse('');
      await refreshAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'بررسی پیام انجام نشد.');
    } finally {
      setSaving(false);
    }
  };

  const changeTab = (next: 'mine' | 'inbox') => {
    setTab(next);
    setFilters({ page: 1, limit: 12 });
    setDraftFilters({});
    setLoading(true);
  };

  const title = role === 'expert' ? 'انتقادات و پیشنهادهای من' : 'انتقادات و پیشنهادها';
  const description = role === 'expert'
    ? 'نظر، انتقاد و راهکار خود را شفاف ثبت کنید و پاسخ مدیریت را در همین صفحه دنبال کنید.'
    : 'پیام خود را ثبت کنید و بازخوردهای کارشناسان و مدیران را در کارتابل مدیریت پاسخ دهید.';

  return (
    <DashboardLayout>
      <div className="space-y-6" dir="rtl">
        <DashboardPageHeader
          eyebrow="صدای سازمان"
          title={title}
          description={description}
          actions={
            <button type="button" className="btn btn-outline rounded-2xl" onClick={() => void refreshAll()} disabled={refreshing}>
              {refreshing ? <span className="loading loading-spinner loading-sm" /> : <ArrowPathIcon className="h-5 w-5" />}
              بروزرسانی
            </button>
          }
        />

        <div className={`grid gap-4 sm:grid-cols-2 ${canReview ? 'xl:grid-cols-5' : 'xl:grid-cols-4'}`}>
          <AdminStatCard title="کل پیام‌های من" value={summary.mine.total.toLocaleString('fa-IR')} description="انتقاد و پیشنهاد ثبت‌شده" icon={ChatBubbleLeftRightIcon} tone="primary" />
          <AdminStatCard title="جدید" value={summary.mine.new.toLocaleString('fa-IR')} description="هنوز بررسی نشده" icon={SparklesIcon} tone="info" />
          <AdminStatCard title="در حال بررسی" value={summary.mine.underReview.toLocaleString('fa-IR')} description="در کارتابل مدیریت" icon={ClockIcon} tone="warning" />
          <AdminStatCard title="پاسخ گرفته" value={summary.mine.responded.toLocaleString('fa-IR')} description="دارای پاسخ مدیریت" icon={CheckCircleIcon} tone="success" />
          {canReview ? <AdminStatCard title="نیازمند بررسی" value={summary.inbox.total.toLocaleString('fa-IR')} description={`${summary.inbox.suggestions.toLocaleString('fa-IR')} پیشنهاد، ${summary.inbox.criticisms.toLocaleString('fa-IR')} انتقاد`} icon={UserGroupIcon} tone="error" /> : null}
        </div>

        <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <SectionCard
            title={editing ? 'ویرایش پیام' : 'ثبت انتقاد یا پیشنهاد'}
            description="موضوع را دقیق، محترمانه و همراه با راهکار عملی ثبت کنید."
            className="h-fit xl:sticky xl:top-4"
          >
            <form className="space-y-4" onSubmit={submit}>
              <div className="grid grid-cols-2 gap-3">
                {(options?.types || []).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`btn h-auto min-h-20 flex-col rounded-2xl ${payload.type === option.value ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => updatePayload('type', option.value as FeedbackType)}
                  >
                    {option.value === 'suggestion' ? <LightBulbIcon className="h-6 w-6" /> : <MegaphoneIcon className="h-6 w-6" />}
                    {option.label}
                  </button>
                ))}
              </div>

              <label className="form-control">
                <span className="label label-text font-bold">حوزه موضوع</span>
                <select className="select select-bordered bg-base-100" value={payload.scope} onChange={(event) => updatePayload('scope', event.target.value as FeedbackPayload['scope'])}>
                  {(options?.scopes || []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>

              <label className="form-control">
                <span className="label label-text font-bold">عنوان</span>
                <input className="input input-bordered bg-base-100" value={payload.title} maxLength={200} placeholder="موضوع را در یک جمله بنویسید" onChange={(event) => updatePayload('title', event.target.value)} />
              </label>

              <label className="form-control">
                <span className="label label-text font-bold">شرح کامل</span>
                <textarea className="textarea textarea-bordered min-h-36 bg-base-100 leading-8" value={payload.description} maxLength={5000} placeholder="چه چیزی باید اصلاح یا بهتر شود؟ مثال و اثر آن را توضیح دهید..." onChange={(event) => updatePayload('description', event.target.value)} />
              </label>

              <label className="form-control">
                <span className="label label-text font-bold">راهکار پیشنهادی (اختیاری)</span>
                <textarea className="textarea textarea-bordered min-h-28 bg-base-100 leading-8" value={payload.proposedSolution || ''} maxLength={5000} placeholder="راهکار عملی یا نتیجه مطلوب را پیشنهاد دهید..." onChange={(event) => updatePayload('proposedSolution', event.target.value)} />
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-base-300 bg-base-200/40 p-4">
                <input type="checkbox" className="checkbox checkbox-primary mt-1" checked={Boolean(payload.isAnonymous)} onChange={(event) => updatePayload('isAnonymous', event.target.checked)} />
                <span>
                  <span className="block font-black">ارسال ناشناس برای کارتابل مدیریت</span>
                  <span className="mt-1 block text-xs leading-6 text-base-content/55">هویت شما در نمایش مدیریتی مخفی می‌شود، اما برای ممیزی امنیتی در سامانه نگهداری خواهد شد.</span>
                </span>
              </label>

              <div className="flex flex-wrap justify-end gap-2 border-t border-base-300 pt-4">
                {editing ? <button type="button" className="btn btn-ghost rounded-2xl" onClick={resetForm}>انصراف از ویرایش</button> : null}
                <button type="submit" className="btn btn-primary rounded-2xl px-7" disabled={saving}>
                  {saving ? <span className="loading loading-spinner loading-sm" /> : <ChatBubbleLeftRightIcon className="h-5 w-5" />}
                  {editing ? 'ذخیره تغییرات' : 'ثبت پیام'}
                </button>
              </div>
            </form>
          </SectionCard>

          <div className="space-y-4">
            {canReview ? (
              <div className="avid-glass-surface flex flex-wrap gap-2 rounded-3xl p-2">
                <button type="button" className={`btn flex-1 rounded-2xl sm:flex-none ${tab === 'mine' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => changeTab('mine')}><ChatBubbleLeftRightIcon className="h-5 w-5" />پیام‌های من</button>
                <button type="button" className={`btn flex-1 rounded-2xl sm:flex-none ${tab === 'inbox' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => changeTab('inbox')}><ShieldCheckIcon className="h-5 w-5" />کارتابل مدیریت{summary.inbox.total ? <span className="badge badge-error badge-sm">{summary.inbox.total.toLocaleString('fa-IR')}</span> : null}</button>
              </div>
            ) : null}

            <FilterBar>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <label className="form-control xl:col-span-2">
                  <span className="label label-text text-xs font-bold">جست‌وجو</span>
                  <div className="relative">
                    <MagnifyingGlassIcon className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-base-content/35" />
                    <input className="input input-bordered w-full bg-base-100 pr-10" value={draftFilters.search || ''} placeholder="عنوان، شرح یا پاسخ مدیریت..." onChange={(event) => setDraftFilters((current) => ({ ...current, search: event.target.value }))} />
                  </div>
                </label>
                <label className="form-control">
                  <span className="label label-text text-xs font-bold">نوع پیام</span>
                  <select className="select select-bordered bg-base-100" value={draftFilters.type || ''} onChange={(event) => setDraftFilters((current) => ({ ...current, type: event.target.value }))}>
                    <option value="">همه</option>
                    {(options?.types || []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <label className="form-control">
                  <span className="label label-text text-xs font-bold">وضعیت</span>
                  <select className="select select-bordered bg-base-100" value={draftFilters.status || ''} onChange={(event) => setDraftFilters((current) => ({ ...current, status: event.target.value }))}>
                    <option value="">همه وضعیت‌ها</option>
                    {(options?.statuses || []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" className="btn btn-ghost rounded-2xl" onClick={() => { setDraftFilters({}); setFilters({ page: 1, limit: 12 }); }}>پاک کردن</button>
                <button type="button" className="btn btn-primary rounded-2xl" onClick={() => setFilters({ ...draftFilters, page: 1, limit: 12 })}>اعمال فیلتر</button>
              </div>
            </FilterBar>

            <SectionCard
              title={tab === 'inbox' ? 'پیام‌های نیازمند بررسی' : 'سوابق پیام‌های من'}
              description={tab === 'inbox' ? 'برای هر پیام وضعیت بررسی و پاسخ شفاف ثبت کنید.' : 'پیام جدید را می‌توانید تا قبل از شروع بررسی ویرایش یا پس بگیرید.'}
              actions={<SoftBadge className="bg-primary/10 text-primary">{pagination.total.toLocaleString('fa-IR')} پیام</SoftBadge>}
            >
              {loading ? (
                <div className="space-y-4">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="skeleton h-72 rounded-3xl" />)}</div>
              ) : !items.length ? (
                <div className="flex min-h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-base-300 bg-base-200/30 p-8 text-center">
                  <EyeIcon className="h-14 w-14 text-base-content/25" />
                  <h3 className="mt-4 text-lg font-black">پیامی پیدا نشد</h3>
                  <p className="mt-2 max-w-lg text-sm leading-7 text-base-content/55">هنوز پیامی ثبت نشده یا نتیجه‌ای مطابق فیلترها وجود ندارد.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => <FeedbackCard key={item.id} item={item} inboxMode={tab === 'inbox'} onEdit={editItem} onWithdraw={(value) => void withdraw(value)} onReview={openReview} />)}
                </div>
              )}

              {pagination.totalPages > 1 ? (
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-base-300 pt-5">
                  <span className="text-xs text-base-content/55">صفحه {pagination.page.toLocaleString('fa-IR')} از {pagination.totalPages.toLocaleString('fa-IR')}</span>
                  <div className="join">
                    <button type="button" className="btn btn-sm join-item" disabled={!pagination.hasPrevPage} onClick={() => setFilters((current) => ({ ...current, page: pagination.prevPage || 1 }))}>قبلی</button>
                    <button type="button" className="btn btn-sm join-item btn-active">{pagination.page.toLocaleString('fa-IR')}</button>
                    <button type="button" className="btn btn-sm join-item" disabled={!pagination.hasNextPage} onClick={() => setFilters((current) => ({ ...current, page: pagination.nextPage || current.page }))}>بعدی</button>
                  </div>
                </div>
              ) : null}
            </SectionCard>
          </div>
        </div>

        {reviewing ? (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-3xl border border-base-300 bg-base-100 shadow-2xl">
              <div className="flex items-start justify-between border-b border-base-300 p-5">
                <div><h2 className="text-xl font-black">بررسی پیام</h2><p className="mt-1 text-sm text-base-content/55">{reviewing.title}</p></div>
                <button type="button" className="btn btn-ghost btn-circle" onClick={() => setReviewing(null)}><XMarkIcon className="h-6 w-6" /></button>
              </div>
              <div className="space-y-4 p-5">
                <label className="form-control">
                  <span className="label label-text font-bold">وضعیت</span>
                  <select className="select select-bordered bg-base-100" value={reviewStatus} onChange={(event) => setReviewStatus(event.target.value as typeof reviewStatus)}>
                    <option value="under_review">در حال بررسی</option>
                    <option value="responded">پاسخ داده شده</option>
                    <option value="closed">بسته شده</option>
                  </select>
                </label>
                <label className="form-control">
                  <span className="label label-text font-bold">پاسخ مدیریت</span>
                  <textarea className="textarea textarea-bordered min-h-40 bg-base-100 leading-8" value={reviewResponse} maxLength={5000} placeholder="نتیجه بررسی، اقدام انجام‌شده یا دلیل تصمیم را بنویسید..." onChange={(event) => setReviewResponse(event.target.value)} />
                </label>
                <div className="flex justify-end gap-2 border-t border-base-300 pt-4">
                  <button type="button" className="btn btn-ghost rounded-2xl" onClick={() => setReviewing(null)}>انصراف</button>
                  <button type="button" className="btn btn-primary rounded-2xl px-7" onClick={() => void submitReview()} disabled={saving}>{saving ? <span className="loading loading-spinner loading-sm" /> : <ShieldCheckIcon className="h-5 w-5" />}ثبت نتیجه بررسی</button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
};

export const getServerSideProps = withAuth();
export default FeedbackPage;
