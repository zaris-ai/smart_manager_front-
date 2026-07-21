import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  ArrowPathIcon,
  BoltIcon,
  CheckCircleIcon,
  ChatBubbleBottomCenterTextIcon,
  ClipboardDocumentCheckIcon,
  CommandLineIcon,
  ExclamationTriangleIcon,
  LinkIcon,
  PaperAirplaneIcon,
  SignalIcon,
  TrashIcon,
  UserGroupIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

import {
  AdminStatCard,
  DashboardPageHeader,
  FilterBar,
  SectionCard,
  SoftBadge,
} from '@/components/common';
import { DashboardLayout } from '@/components/layouts';
import { telegramService } from '@/services/telegram.service';
import {
  TelegramLinkCode,
  TelegramLinkedUser,
  TelegramOverview,
} from '@/types/telegram';
import { withAuth } from '@/utils';
import { confirmToast } from '@/utils/sonner-confirm';

const formatDateTime = (value?: string | number | null): string => {
  if (!value) return 'ثبت نشده';

  const date =
    typeof value === 'number' ? new Date(value * 1000) : new Date(value);

  if (Number.isNaN(date.getTime())) return 'ثبت نشده';

  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const getUserName = (user: TelegramLinkedUser): string => {
  return user.fullName || user.username || user.email || 'کاربر نامشخص';
};

const TelegramManagementPage = () => {
  const { data: session, status: sessionStatus } = useSession();
  const role = String(session?.user?.role || '').toLowerCase();
  const canManageTelegram = ['manager', 'admin', 'super_admin', 'project_owner'].includes(role);

  const [overview, setOverview] = useState<TelegramOverview | null>(null);
  const [linkCode, setLinkCode] = useState<TelegramLinkCode | null>(null);
  const [users, setUsers] = useState<TelegramLinkedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState('');
  const [search, setSearch] = useState('');
  const [linkedFilter, setLinkedFilter] = useState<'all' | 'linked' | 'unlinked'>(
    'all',
  );
  const [publicUrl, setPublicUrl] = useState('');
  const [testUserId, setTestUserId] = useState('');
  const [testMessage, setTestMessage] = useState(
    '✅ اتصال ربات تلگرام آوید با موفقیت بررسی شد.',
  );

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const [overviewData, userData] = await Promise.all([
        telegramService.getOverview(),
        telegramService.listUsers({
          page: 1,
          limit: 100,
          search: search || undefined,
          linked:
            linkedFilter === 'all'
              ? undefined
              : linkedFilter === 'linked',
        }),
      ]);

      setOverview(overviewData);
      setUsers(userData.items);

      if (!testUserId) {
        const firstLinkedUser = userData.items.find((user) => user.linked);
        if (firstLinkedUser) setTestUserId(firstLinkedUser.id);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'خطا در بارگذاری اطلاعات');
    } finally {
      setLoading(false);
    }
  }, [linkedFilter, search, testUserId]);

  useEffect(() => {
    if (sessionStatus === 'authenticated' && canManageTelegram) {
      void loadData();
    }
  }, [sessionStatus, canManageTelegram]);

  const linkedUsers = useMemo(
    () => users.filter((user) => user.linked),
    [users],
  );

  const handleConfigureWebhook = async () => {
    try {
      setProcessing('configure');
      await telegramService.configureWebhook(publicUrl || undefined);
      toast.success('وبهوک تلگرام تنظیم شد');
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'خطا در تنظیم وبهوک');
    } finally {
      setProcessing('');
    }
  };

  const handleRemoveWebhook = async () => {
    const confirmed = await confirmToast({
      title: 'حذف وبهوک تلگرام',
      description:
        'پس از حذف وبهوک، ربات هیچ پیام یا callback جدیدی دریافت نمی‌کند تا دوباره تنظیم شود.',
      confirmText: 'حذف وبهوک',
      variant: 'warning',
    });

    if (!confirmed) return;

    try {
      setProcessing('remove');
      await telegramService.removeWebhook(false);
      toast.success('وبهوک تلگرام حذف شد');
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'خطا در حذف وبهوک');
    } finally {
      setProcessing('');
    }
  };

  const handleSendTest = async () => {
    if (!testUserId) {
      toast.error('یک کاربر متصل به تلگرام انتخاب کنید');
      return;
    }

    try {
      setProcessing('test');
      await telegramService.sendTestMessage({
        userId: testUserId,
        message: testMessage,
      });
      toast.success('پیام آزمایشی ارسال شد');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'خطا در ارسال پیام');
    } finally {
      setProcessing('');
    }
  };


  const handleCreateLinkCode = async (user: TelegramLinkedUser) => {
    try {
      setProcessing(`link-code:${user.id}`);
      const result = await telegramService.createLinkCode(user.id);
      setLinkCode(result);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'خطا در ساخت کد اتصال',
      );
    } finally {
      setProcessing('');
    }
  };

  const copyLinkValue = async (value: string, message: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(message);
    } catch {
      toast.error('کپی خودکار انجام نشد؛ مقدار را به‌صورت دستی کپی کنید.');
    }
  };

  const handleUnlink = async (user: TelegramLinkedUser) => {
    const confirmed = await confirmToast({
      title: `حذف اتصال تلگرام «${getUserName(user)}»`,
      description:
        'شناسه کاربر، Chat ID و Username تلگرام پاک می‌شود و sessionهای فعال او نیز حذف خواهند شد.',
      confirmText: 'حذف اتصال',
      variant: 'warning',
    });

    if (!confirmed) return;

    try {
      setProcessing(`unlink:${user.id}`);
      await telegramService.unlinkUser(user.id);
      toast.success('اتصال تلگرام کاربر حذف شد');
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'خطا در حذف اتصال');
    } finally {
      setProcessing('');
    }
  };

  const webhookActive = Boolean(overview?.webhook?.url);
  const configurationReady = Boolean(
    overview?.configuration.tokenConfigured &&
      overview?.configuration.secretConfigured,
  );
  const telegramDeepLink =
    linkCode && overview?.bot?.username
      ? `https://t.me/${overview.bot.username.replace(/^@/, '')}?start=${linkCode.startParameter}`
      : '';

  if (sessionStatus !== 'loading' && !canManageTelegram) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-2xl py-16" dir="rtl">
          <div className="alert alert-error items-start">
            <ExclamationTriangleIcon className="h-6 w-6" />
            <div>
              <div className="font-black">دسترسی مدیریتی لازم است</div>
              <div className="mt-1 text-sm leading-7">
                تنظیم وبهوک، مشاهده اتصال همه کاربران و ساخت کد اتصال فقط برای مدیران مجاز است.
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6" dir="rtl">
        <DashboardPageHeader
          eyebrow="یکپارچه‌سازی و عملیات"
          title="مدیریت ربات تلگرام"
          description="وضعیت وبهوک، اتصال کاربران، قابلیت‌های ربات، فعالیت‌های ثبت‌شده و خطاهای عملیاتی را در یک صفحه کنترل کنید."
          actions={
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => void loadData()}
              disabled={loading}
            >
              <ArrowPathIcon
                className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`}
              />
              بروزرسانی
            </button>
          }
        />

        {overview?.apiError ? (
          <div className="alert alert-error">
            <ExclamationTriangleIcon className="h-5 w-5" />
            <div>
              <div className="font-black">خطا در ارتباط با Telegram API</div>
              <div className="mt-1 text-sm">{overview.apiError}</div>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AdminStatCard
            title="وضعیت ربات"
            value={webhookActive ? 'فعال' : configurationReady ? 'آماده تنظیم' : 'ناقص'}
            description={
              overview?.bot?.username
                ? `@${overview.bot.username}`
                : 'هویت ربات دریافت نشده است'
            }
            icon={SignalIcon}
            tone={webhookActive ? 'success' : configurationReady ? 'warning' : 'error'}
          />
          <AdminStatCard
            title="کاربران متصل"
            value={overview?.counts.linkedUsers || 0}
            description={`${overview?.counts.unlinkedUsers || 0} کاربر فعال هنوز متصل نیست`}
            icon={UserGroupIcon}
            tone="info"
          />
          <AdminStatCard
            title="خروجی ثبت‌شده از ربات"
            value={
              (overview?.counts.telegramTasks || 0) +
              (overview?.counts.telegramReports || 0) +
              (overview?.counts.telegramWorkLogs || 0) +
              (overview?.counts.telegramLeaveRequests || 0) +
              (overview?.counts.telegramFeedback || 0)
            }
            description={`${overview?.counts.telegramTasks || 0} وظیفه، ${overview?.counts.telegramReports || 0} گزارش پروژه، ${overview?.counts.telegramWorkLogs || 0} گزارش کار، ${overview?.counts.telegramLeaveRequests || 0} مرخصی و ${overview?.counts.telegramFeedback || 0} پیام سازمانی`}
            icon={ClipboardDocumentCheckIcon}
            tone="primary"
          />
          <AdminStatCard
            title="نیازمند اقدام مدیریتی"
            value={overview?.counts.staffingPending || 0}
            description={`${overview?.counts.overdueTasks || 0} وظیفه عقب‌افتاده و ${overview?.counts.staffingPending || 0} پروژه با تخصیص ناقص`}
            icon={ExclamationTriangleIcon}
            tone={
              (overview?.counts.staffingPending || 0) > 0 ? 'warning' : 'success'
            }
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <SectionCard
            title="وضعیت اتصال و وبهوک"
            description="Telegram باید درخواست‌ها را به مسیر امن /api/v1/telegram/webhook ارسال کند. Secret Token در Header بررسی می‌شود و داخل URL قرار نمی‌گیرد."
            actions={
              <SoftBadge
                className={
                  webhookActive
                    ? 'bg-success/10 text-success'
                    : 'bg-warning/10 text-warning'
                }
              >
                {webhookActive ? 'وبهوک فعال' : 'وبهوک غیرفعال'}
              </SoftBadge>
            }
          >
            {loading ? (
              <div className="flex justify-center py-16">
                <span className="loading loading-spinner loading-lg" />
              </div>
            ) : (
              <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-base-200/60 p-4">
                    <div className="text-xs font-bold text-base-content/50">
                      ربات
                    </div>
                    <div className="mt-2 font-black">
                      {overview?.bot?.first_name || 'نامشخص'}
                    </div>
                    <div className="mt-1 text-sm text-base-content/60">
                      {overview?.bot?.username
                        ? `@${overview.bot.username}`
                        : 'Username دریافت نشده'}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-base-200/60 p-4">
                    <div className="text-xs font-bold text-base-content/50">
                      درخواست‌های معلق تلگرام
                    </div>
                    <div className="mt-2 text-2xl font-black">
                      {overview?.webhook?.pending_update_count || 0}
                    </div>
                    <div className="mt-1 text-sm text-base-content/60">
                      حداکثر اتصال: {overview?.webhook?.max_connections || 'نامشخص'}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-base-300 bg-base-100 p-4">
                  <div className="flex items-center gap-2 font-black">
                    <LinkIcon className="h-5 w-5 text-primary" />
                    URL فعلی وبهوک
                  </div>
                  <div className="mt-3 break-all rounded-xl bg-base-200 px-3 py-2 font-mono text-xs">
                    {overview?.webhook?.url || 'تنظیم نشده'}
                  </div>
                  {overview?.webhook?.last_error_message ? (
                    <div className="mt-3 rounded-xl bg-error/10 p-3 text-sm text-error">
                      <div className="font-black">آخرین خطا</div>
                      <div className="mt-1">{overview.webhook.last_error_message}</div>
                      <div className="mt-1 text-xs opacity-75">
                        {formatDateTime(overview.webhook.last_error_date)}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-3 rounded-2xl border border-base-300 p-4">
                  <label className="form-control">
                    <span className="label label-text font-bold">
                      آدرس عمومی HTTPS سرور
                    </span>
                    <input
                      className="input input-bordered bg-base-100 ltr:text-left"
                      dir="ltr"
                      placeholder="https://panel.example.com"
                      value={publicUrl}
                      onChange={(event) => setPublicUrl(event.target.value)}
                    />
                    <span className="mt-2 text-xs leading-6 text-base-content/55">
                      خالی بگذارید تا TELEGRAM_BOT_PUBLIC_URL سمت سرور استفاده شود.
                    </span>
                  </label>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleConfigureWebhook}
                      disabled={processing === 'configure'}
                    >
                      {processing === 'configure' ? (
                        <span className="loading loading-spinner loading-sm" />
                      ) : (
                        <WrenchScrewdriverIcon className="h-5 w-5" />
                      )}
                      تنظیم یا بروزرسانی وبهوک
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-error"
                      onClick={handleRemoveWebhook}
                      disabled={!webhookActive || processing === 'remove'}
                    >
                      {processing === 'remove' ? (
                        <span className="loading loading-spinner loading-sm" />
                      ) : (
                        <TrashIcon className="h-5 w-5" />
                      )}
                      حذف وبهوک
                    </button>
                  </div>
                </div>
              </div>
            )}
          </SectionCard>

          <div className="space-y-6">
            <SectionCard
              title="آزمون ارسال پیام"
              description="برای اطمینان از معتبر بودن Token، Chat ID و دسترسی ربات، یک پیام آزمایشی ارسال کنید."
            >
              <div className="space-y-4">
                <label className="form-control">
                  <span className="label label-text font-bold">کاربر مقصد</span>
                  <select
                    className="select select-bordered bg-base-100"
                    value={testUserId}
                    onChange={(event) => setTestUserId(event.target.value)}
                  >
                    <option value="">انتخاب کاربر متصل</option>
                    {linkedUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {getUserName(user)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="form-control">
                  <span className="label label-text font-bold">متن پیام</span>
                  <textarea
                    className="textarea textarea-bordered min-h-28 bg-base-100"
                    value={testMessage}
                    onChange={(event) => setTestMessage(event.target.value)}
                  />
                </label>

                <button
                  type="button"
                  className="btn btn-neutral w-full"
                  onClick={handleSendTest}
                  disabled={!testUserId || processing === 'test'}
                >
                  {processing === 'test' ? (
                    <span className="loading loading-spinner loading-sm" />
                  ) : (
                    <PaperAirplaneIcon className="h-5 w-5" />
                  )}
                  ارسال پیام آزمایشی
                </button>
              </div>
            </SectionCard>

            <SectionCard
              title="پیکربندی قابلیت‌ها"
              description="این موارد از متغیرهای محیطی backend خوانده می‌شوند."
            >
              <div className="space-y-3 text-sm">
                {[
                  ['Bot Token', overview?.configuration.tokenConfigured],
                  ['Webhook Secret', overview?.configuration.secretConfigured],
                  ['Public URL', overview?.configuration.publicUrlConfigured],
                  ['تبدیل ویس به متن', overview?.configuration.transcriptionConfigured],
                  ['هشدار روزانه', overview?.configuration.dailyAlertEnabled],
                ].map(([label, enabled]) => (
                  <div
                    key={String(label)}
                    className="flex items-center justify-between rounded-xl bg-base-200/60 px-3 py-2"
                  >
                    <span className="font-bold">{label}</span>
                    {enabled ? (
                      <CheckCircleIcon className="h-5 w-5 text-success" />
                    ) : (
                      <ExclamationTriangleIcon className="h-5 w-5 text-warning" />
                    )}
                  </div>
                ))}
                <div className="rounded-xl bg-base-200/60 px-3 py-2">
                  هشدار روزانه: {overview?.configuration.dailyAlertTime || '-'} —{' '}
                  {overview?.configuration.dailyAlertTimezone || '-'}
                </div>
              </div>
            </SectionCard>
          </div>
        </div>

        <SectionCard
          title="کاربران و اتصال تلگرام"
          description="برای هر کاربر یک کد یک‌بارمصرف بسازید. ربات شناسه‌های واقعی تلگرام را از Update رسمی دریافت می‌کند و نیازی به ورود دستی User ID یا Chat ID نیست."
          actions={
            <Link href="/dashboard/users" className="btn btn-sm btn-outline">
              مدیریت کامل کاربران
            </Link>
          }
          bodyClassName="overflow-x-auto"
        >
          <FilterBar className="mb-4 shadow-none">
            <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
              <input
                className="input input-bordered bg-base-100"
                placeholder="جستجو در نام، Username یا شناسه تلگرام"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <select
                className="select select-bordered bg-base-100"
                value={linkedFilter}
                onChange={(event) =>
                  setLinkedFilter(
                    event.target.value as 'all' | 'linked' | 'unlinked',
                  )
                }
              >
                <option value="all">همه کاربران</option>
                <option value="linked">فقط متصل</option>
                <option value="unlinked">فقط بدون اتصال</option>
              </select>
              <button
                type="button"
                className="btn btn-neutral"
                onClick={() => void loadData()}
              >
                اعمال فیلتر
              </button>
            </div>
          </FilterBar>

          {loading ? (
            <div className="flex justify-center py-14">
              <span className="loading loading-spinner loading-lg" />
            </div>
          ) : users.length === 0 ? (
            <div className="py-14 text-center text-base-content/55">
              کاربری پیدا نشد.
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>کاربر</th>
                  <th>نقش</th>
                  <th>وضعیت اتصال</th>
                  <th>Telegram User ID</th>
                  <th>Chat ID</th>
                  <th>Username</th>
                  <th className="text-left">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="hover">
                    <td>
                      <div className="font-black">{getUserName(user)}</div>
                      <div className="mt-1 text-xs text-base-content/50">
                        {user.email}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-outline">
                        {user.roleLabel || user.role}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${user.linked ? 'badge-success' : 'badge-warning'}`}
                      >
                        {user.linked ? 'متصل' : 'بدون اتصال'}
                      </span>
                    </td>
                    <td className="font-mono text-xs">
                      {user.telegramUserId || '—'}
                    </td>
                    <td className="font-mono text-xs">
                      {user.telegramChatId || '—'}
                    </td>
                    <td>
                      {user.telegramUsername
                        ? `@${user.telegramUsername.replace(/^@/, '')}`
                        : '—'}
                    </td>
                    <td className="text-left">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm text-primary"
                          onClick={() => void handleCreateLinkCode(user)}
                          disabled={processing === `link-code:${user.id}`}
                        >
                          {processing === `link-code:${user.id}` ? (
                            <span className="loading loading-spinner loading-xs" />
                          ) : (
                            <LinkIcon className="h-4 w-4" />
                          )}
                          {user.linked ? 'کد اتصال مجدد' : 'ساخت کد اتصال'}
                        </button>
                        {user.linked ? (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm text-error"
                            onClick={() => handleUnlink(user)}
                            disabled={processing === `unlink:${user.id}`}
                          >
                            {processing === `unlink:${user.id}` ? (
                              <span className="loading loading-spinner loading-xs" />
                            ) : (
                              <TrashIcon className="h-4 w-4" />
                            )}
                            حذف اتصال
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>

        <div className="grid gap-6 xl:grid-cols-2">
          <SectionCard
            title="دستورات و قابلیت‌های ربات"
            description="منوی دکمه‌ای و دستورات متنی هر دو از این قابلیت‌ها استفاده می‌کنند."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {(overview?.commands || []).map((command) => (
                <div
                  key={command.command}
                  className="rounded-2xl border border-base-300 bg-base-100 p-4"
                >
                  <div className="flex items-center gap-2">
                    <CommandLineIcon className="h-5 w-5 text-primary" />
                    <code className="font-black text-primary">
                      {command.command}
                    </code>
                  </div>
                  <div className="mt-2 text-sm leading-6 text-base-content/60">
                    {command.description}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl bg-info/10 p-4 text-sm leading-7 text-info">
              <div className="flex items-center gap-2 font-black">
                <BoltIcon className="h-5 w-5" />
                تغییر مهم در فرآیند وظیفه
              </div>
              <p className="mt-2">
                مسئول وظیفه دیگر از فهرست عمومی مدیران انتخاب نمی‌شود؛ ربات فقط افراد
                واقعی همان پروژه را نمایش می‌دهد. پروژه‌های واردشده از Excel باید ابتدا
                در پنل تعیین مسئول و عضو شوند.
              </p>
            </div>
          </SectionCard>

          <SectionCard
            title="فعالیت‌های اخیر ربات"
            description="آخرین وظایف و گزارش‌هایی که منبع آن‌ها telegram_bot بوده است."
          >
            <div className="space-y-3">
              {(overview?.activity || []).length === 0 ? (
                <div className="py-10 text-center text-base-content/50">
                  فعالیتی ثبت نشده است.
                </div>
              ) : (
                overview?.activity.map((item) => (
                  <div
                    key={`${item.type}:${item.id}`}
                    className="flex items-start gap-3 rounded-2xl border border-base-300 bg-base-100 p-4"
                  >
                    <div
                      className={`rounded-xl p-2 ${
                        item.type === 'task'
                          ? 'bg-primary/10 text-primary'
                          : 'bg-info/10 text-info'
                      }`}
                    >
                      {item.type === 'task' ? (
                        <ClipboardDocumentCheckIcon className="h-5 w-5" />
                      ) : (
                        <ChatBubbleBottomCenterTextIcon className="h-5 w-5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-2 font-black">{item.title}</div>
                      <div className="mt-1 text-sm text-base-content/55">
                        {item.projectTitle} — {item.actorName}
                      </div>
                      <div className="mt-1 text-xs text-base-content/40">
                        {formatDateTime(item.createdAt)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        </div>

        <div className={`modal ${linkCode ? 'modal-open' : ''}`}>
          <div className="modal-box max-w-xl" dir="rtl">
            <h3 className="text-xl font-black">کد اتصال امن تلگرام</h3>
            <p className="mt-2 text-sm leading-7 text-base-content/60">
              این کد برای «{linkCode?.userName || 'کاربر'}» ساخته شده، فقط یک‌بار
              قابل استفاده است و پس از {linkCode?.expiresInMinutes || 15} دقیقه
              منقضی می‌شود.
            </p>

            {linkCode?.alreadyLinked ? (
              <div className="alert alert-warning mt-4 text-sm">
                این کاربر در حال حاضر متصل است. استفاده از این کد، اتصال را به حساب تلگرامی که کد را مصرف می‌کند منتقل خواهد کرد.
              </div>
            ) : null}

            <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-5 text-center">
              <div className="text-xs font-bold text-base-content/50">کد اتصال</div>
              <div className="mt-2 font-mono text-3xl font-black tracking-[0.3em] text-primary" dir="ltr">
                {linkCode?.code}
              </div>
              <div className="mt-3 text-xs text-base-content/50">
                اعتبار تا {formatDateTime(linkCode?.expiresAt)}
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <button
                type="button"
                className="btn btn-outline w-full justify-between"
                onClick={() =>
                  void copyLinkValue(
                    linkCode?.command || '',
                    'دستور اتصال کپی شد',
                  )
                }
              >
                <code dir="ltr">{linkCode?.command}</code>
                کپی دستور
              </button>

              {telegramDeepLink ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <a
                    href={telegramDeepLink}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary"
                  >
                    <PaperAirplaneIcon className="h-5 w-5" />
                    باز کردن ربات
                  </a>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() =>
                      void copyLinkValue(
                        telegramDeepLink,
                        'لینک اتصال کپی شد',
                      )
                    }
                  >
                    <LinkIcon className="h-5 w-5" />
                    کپی لینک مستقیم
                  </button>
                </div>
              ) : (
                <div className="alert alert-warning text-sm">
                  Username ربات در دسترس نیست؛ دستور بالا را برای کاربر ارسال کنید.
                </div>
              )}
            </div>

            <div className="modal-action">
              <button
                type="button"
                className="btn"
                onClick={() => setLinkCode(null)}
              >
                بستن
              </button>
            </div>
          </div>
          <button
            type="button"
            className="modal-backdrop"
            aria-label="بستن"
            onClick={() => setLinkCode(null)}
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export const getServerSideProps = withAuth();

export default TelegramManagementPage;
