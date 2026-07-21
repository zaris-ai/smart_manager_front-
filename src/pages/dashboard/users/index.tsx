import { useEffect, useMemo, useState } from 'react';
import {
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  EyeSlashIcon,
  NoSymbolIcon,
  PencilSquareIcon,
  PlusIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

import {
  AdminStatCard,
  DashboardPageHeader,
  FilterBar,
  SectionCard,
  UserAvatar,
} from '@/components/common';
import { DashboardLayout } from '@/components/layouts';
import { RoleHelpPanel, UserFormModal } from '@/components/users';
import { userService } from '@/services/user.service';
import {
  AppUser,
  getUserDisplayName,
  getUserId,
  hasTelegramLink,
  normalizeUserRole,
  normalizeUserStatus,
  userRoleLabels,
  userStatusLabels,
} from '@/types/user';
import { withAuth } from '@/utils';
import { confirmToast } from '@/utils/sonner-confirm';

const statusBadgeClass = (status?: string): string => {
  switch (normalizeUserStatus(status)) {
    case 'active':
      return 'badge-success';
    case 'inactive':
      return 'badge-ghost';
    case 'suspended':
      return 'badge-warning';
    default:
      return 'badge-neutral';
  }
};

const roleBadgeClass = (role?: string): string => {
  switch (normalizeUserRole(role)) {
    case 'board':
      return 'badge-secondary';
    case 'manager':
      return 'badge-primary';
    case 'expert':
      return 'badge-info';
    default:
      return 'badge-neutral';
  }
};

const DashboardUsersPage = () => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');

  const [loading, setLoading] = useState(true);
  const [processingUserId, setProcessingUserId] = useState('');

  const activeUsersCount = useMemo(() => {
    return users.filter((user) => user.isActive).length;
  }, [users]);

  const telegramLinkedCount = useMemo(() => {
    return users.filter((user) => hasTelegramLink(user)).length;
  }, [users]);

  const loadUsers = async () => {
    try {
      setLoading(true);

      const response = await userService.listUsersPaginated({
        page: 1,
        limit: 100,
        search: search || undefined,
        role: role || undefined,
        status: status || undefined,
      });

      setUsers(response.items);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'خطا در دریافت کاربران');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const openCreateModal = () => {
    setSelectedUser(null);
    setFormOpen(true);
  };

  const openEditModal = (user: AppUser) => {
    setSelectedUser(user);
    setFormOpen(true);
  };

  const closeFormModal = () => {
    setFormOpen(false);
    setSelectedUser(null);
  };

  const handleSaved = async () => {
    toast.success(selectedUser ? 'کاربر با موفقیت ویرایش شد' : 'کاربر با موفقیت ایجاد شد');
    await loadUsers();
  };

  const handleActivateUser = async (user: AppUser) => {
    const userId = getUserId(user);

    if (!userId) {
      toast.error('شناسه کاربر معتبر نیست');
      return;
    }

    try {
      setProcessingUserId(userId);

      await userService.activateUser(userId);
      toast.success(`کاربر «${getUserDisplayName(user)}» فعال شد`);
      await loadUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'خطا در فعال‌سازی کاربر');
    } finally {
      setProcessingUserId('');
    }
  };

  const handleDeactivateUser = async (user: AppUser) => {
    const userId = getUserId(user);

    if (!userId) {
      toast.error('شناسه کاربر معتبر نیست');
      return;
    }

    const confirmed = await confirmToast({
      title: `غیرفعال‌سازی کاربر «${getUserDisplayName(user)}»`,
      description: 'کاربر پس از غیرفعال شدن دیگر نباید در جریان‌های اجرایی جدید استفاده شود.',
      confirmText: 'غیرفعال کن',
      variant: 'warning',
    });

    if (!confirmed) return;

    try {
      setProcessingUserId(userId);

      await userService.deactivateUser(userId);
      toast.success(`کاربر «${getUserDisplayName(user)}» غیرفعال شد`);
      await loadUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'خطا در غیرفعال‌سازی کاربر');
    } finally {
      setProcessingUserId('');
    }
  };

  const handleToggleUserStatus = async (user: AppUser) => {
    const normalizedStatus = normalizeUserStatus(user.status);

    if (normalizedStatus === 'active' && user.isActive) {
      await handleDeactivateUser(user);
      return;
    }

    await handleActivateUser(user);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" dir="rtl">
        <DashboardPageHeader
          eyebrow="مدیریت کاربران"
          title="کاربران سامانه"
          description="این صفحه به‌صورت جدول مدیریتی طراحی شده تا ایجاد، ویرایش و تغییر وضعیت کاربران بدون شلوغی بصری انجام شود."
          actions={
            <>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowHelp((value) => !value)}
              >
                {showHelp ? (
                  <EyeSlashIcon className="h-5 w-5" />
                ) : (
                  <EyeIcon className="h-5 w-5" />
                )}
                {showHelp ? 'مخفی کردن راهنما' : 'نمایش راهنما'}
              </button>

              <button type="button" className="btn btn-primary" onClick={openCreateModal}>
                <PlusIcon className="h-5 w-5" />
                کاربر جدید
              </button>
            </>
          }
        />

        {showHelp ? <RoleHelpPanel /> : null}

        <div className="grid gap-4 md:grid-cols-3">
          <AdminStatCard
            title="کل کاربران"
            value={users.length}
            description="کاربران دریافت‌شده با فیلتر فعلی"
            icon={UserGroupIcon}
            tone="primary"
          />
          <AdminStatCard
            title="کاربران فعال"
            value={activeUsersCount}
            description="حساب‌هایی که امکان فعالیت دارند"
            icon={CheckCircleIcon}
            tone="success"
          />
          <AdminStatCard
            title="متصل به تلگرام"
            value={telegramLinkedCount}
            description="کاربران دارای اتصال پیام‌رسان"
            icon={ChatBubbleLeftRightIcon}
            tone="info"
          />
        </div>

        <FilterBar>
          <div className="grid gap-3 lg:grid-cols-4">
            <input
              className="input input-bordered bg-base-100"
              placeholder="جستجو در کاربران"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <select
              className="select select-bordered bg-base-100"
              value={role}
              onChange={(event) => setRole(event.target.value)}
            >
              <option value="">همه نقش‌ها</option>
              <option value="board">هیئت مدیره</option>
              <option value="manager">مدیر</option>
              <option value="expert">کارشناس</option>
            </select>

            <select
              className="select select-bordered bg-base-100"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="">همه وضعیت‌ها</option>
              <option value="active">فعال</option>
              <option value="inactive">غیرفعال</option>
              <option value="suspended">تعلیق‌شده</option>
            </select>

            <button type="button" className="btn btn-neutral" onClick={loadUsers}>
              <ArrowPathIcon className="h-5 w-5" />
              اعمال فیلتر
            </button>
          </div>
        </FilterBar>

        <SectionCard
          title="لیست کاربران"
          description="عملیات هر کاربر داخل منوی سه‌نقطه قرار گرفته تا جدول خواناتر بماند."
          actions={<span className="badge badge-outline">{users.length} کاربر</span>}
          bodyClassName="overflow-x-auto"
        >
          {loading ? (
            <div className="flex justify-center py-16">
              <span className="loading loading-spinner loading-lg" />
            </div>
          ) : users.length === 0 ? (
            <div className="py-16 text-center text-sm text-base-content/55">
              کاربری پیدا نشد.
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>کاربر</th>
                  <th>نقش</th>
                  <th>وضعیت</th>
                  <th>اتصال تلگرام</th>
                  <th>پروفایل کاری</th>
                  <th className="text-left">عملیات</th>
                </tr>
              </thead>

              <tbody>
                {users.map((user) => {
                  const userId = getUserId(user);
                  const normalizedRole = normalizeUserRole(user.role);
                  const normalizedStatus = normalizeUserStatus(user.status);
                  const linkedToTelegram = hasTelegramLink(user);
                  const isProcessing = processingUserId === userId;
                  const isActive = normalizedStatus === 'active' && user.isActive;
                  const displayName = getUserDisplayName(user);

                  return (
                    <tr key={userId} className="hover">
                      <td>
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            userId={userId}
                            name={displayName}
                            size="sm"
                            className="rounded-2xl border-primary/15"
                          />
                          <div className="min-w-0">
                            <div className="break-words font-black text-base-content">
                              {displayName}
                            </div>
                            <div className="truncate text-xs text-base-content/50">
                              {user.username || 'بدون نام کاربری'} · {user.email || 'بدون ایمیل'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className={`badge ${roleBadgeClass(normalizedRole)}`}>
                          {user.roleLabel || userRoleLabels[normalizedRole]}
                        </span>
                      </td>

                      <td>
                        <span className={`badge ${statusBadgeClass(normalizedStatus)}`}>
                          {user.statusLabel || userStatusLabels[normalizedStatus]}
                        </span>
                      </td>

                      <td>
                        {linkedToTelegram ? (
                          <div className="space-y-1">
                            <span className="badge badge-success gap-1">
                              <ChatBubbleLeftRightIcon className="h-4 w-4" />
                              متصل
                            </span>

                            <div className="text-xs text-base-content/50" dir="ltr">
                              {user.telegramUsername
                                ? `@${user.telegramUsername}`
                                : user.telegramUserId || user.telegramChatId}
                            </div>
                          </div>
                        ) : (
                          <span className="badge badge-ghost">متصل نیست</span>
                        )}
                      </td>

                      <td>
                        <div className="text-sm font-bold text-base-content/80">
                          {user.profile?.jobTitle || 'بدون عنوان شغلی'}
                        </div>
                        <div className="text-xs text-base-content/50">
                          {user.profile?.domain || 'بدون دامنه کاری'}
                        </div>
                      </td>

                      <td>
                        <div className="dropdown dropdown-end flex justify-end">
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm btn-square"
                            disabled={isProcessing}
                            tabIndex={0}
                          >
                            {isProcessing ? (
                              <span className="loading loading-spinner loading-xs" />
                            ) : (
                              <EllipsisVerticalIcon className="h-5 w-5" />
                            )}
                          </button>
                          <ul
                            tabIndex={0}
                            className="menu dropdown-content z-[1] mt-2 w-44 rounded-2xl border border-base-300 bg-base-100 p-2 shadow-xl"
                          >
                            <li>
                              <button type="button" onClick={() => openEditModal(user)}>
                                <PencilSquareIcon className="h-4 w-4" />
                                ویرایش
                              </button>
                            </li>
                            <li>
                              <button
                                type="button"
                                className={isActive ? 'text-error' : 'text-success'}
                                onClick={() => handleToggleUserStatus(user)}
                              >
                                {isActive ? (
                                  <NoSymbolIcon className="h-4 w-4" />
                                ) : (
                                  <CheckCircleIcon className="h-4 w-4" />
                                )}
                                {isActive ? 'غیرفعال‌سازی' : 'فعال‌سازی'}
                              </button>
                            </li>
                          </ul>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </SectionCard>

        <UserFormModal
          open={formOpen}
          user={selectedUser}
          onClose={closeFormModal}
          onSaved={handleSaved}
        />
      </div>
    </DashboardLayout>
  );
};

export const getServerSideProps = withAuth();

export default DashboardUsersPage;
