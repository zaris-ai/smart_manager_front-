import { useEffect, useMemo, useState } from 'react';
import {
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  NoSymbolIcon,
  PencilSquareIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { Toaster, toast } from 'sonner';

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
  const [showHelp, setShowHelp] = useState(true);

  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');

  const [loading, setLoading] = useState(true);
  const [processingUserId, setProcessingUserId] = useState('');

  const boardCount = useMemo(() => {
    return users.filter((user) => normalizeUserRole(user.role) === 'board')
      .length;
  }, [users]);

  const managersCount = useMemo(() => {
    return users.filter((user) => normalizeUserRole(user.role) === 'manager')
      .length;
  }, [users]);

  const expertsCount = useMemo(() => {
    return users.filter((user) => normalizeUserRole(user.role) === 'expert')
      .length;
  }, [users]);

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

    toast.warning(`آیا از غیرفعال‌سازی کاربر «${getUserDisplayName(user)}» مطمئن هستید؟`, {
      duration: 8000,
      action: {
        label: 'غیرفعال کن',
        onClick: async () => {
          try {
            setProcessingUserId(userId);

            await userService.deactivateUser(userId);
            toast.success(`کاربر «${getUserDisplayName(user)}» غیرفعال شد`);
            await loadUsers();
          } catch (err) {
            toast.error(
              err instanceof Error ? err.message : 'خطا در غیرفعال‌سازی کاربر',
            );
          } finally {
            setProcessingUserId('');
          }
        },
      },
      cancel: {
        label: 'انصراف',
        onClick: () => {
          toast.info('عملیات غیرفعال‌سازی لغو شد');
        },
      },
    });
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
      <Toaster richColors position="top-center" closeButton />

      <div className="space-y-6" dir="rtl">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              مدیریت کاربران
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              ایجاد، ویرایش، فعال‌سازی، غیرفعال‌سازی و اتصال کاربران به ربات تلگرام.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
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
          </div>
        </div>

        {showHelp ? <RoleHelpPanel /> : null}

        <div className="grid gap-4 md:grid-cols-5">
          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-900">
            <div className="text-sm text-gray-500">هیئت مدیره</div>
            <div className="mt-2 text-3xl font-bold text-secondary">
              {boardCount}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-900">
            <div className="text-sm text-gray-500">مدیران</div>
            <div className="mt-2 text-3xl font-bold text-primary">
              {managersCount}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-900">
            <div className="text-sm text-gray-500">کارشناسان</div>
            <div className="mt-2 text-3xl font-bold text-info">
              {expertsCount}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-900">
            <div className="text-sm text-gray-500">کاربران فعال</div>
            <div className="mt-2 text-3xl font-bold text-success">
              {activeUsersCount}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-900">
            <div className="text-sm text-gray-500">متصل به تلگرام</div>
            <div className="mt-2 text-3xl font-bold text-secondary">
              {telegramLinkedCount}
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-900">
          <div className="grid gap-3 lg:grid-cols-4">
            <input
              className="input input-bordered"
              placeholder="جستجو در کاربران"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <select
              className="select select-bordered"
              value={role}
              onChange={(event) => setRole(event.target.value)}
            >
              <option value="">همه نقش‌ها</option>
              <option value="board">هیئت مدیره</option>
              <option value="manager">مدیر</option>
              <option value="expert">کارشناس</option>
            </select>

            <select
              className="select select-bordered"
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
        </div>

        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm dark:bg-gray-900">
          {loading ? (
            <div className="flex justify-center py-16">
              <span className="loading loading-spinner loading-lg" />
            </div>
          ) : users.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-500">
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

                  return (
                    <tr key={userId}>
                      <td>
                        <div className="font-bold text-gray-900 dark:text-gray-100">
                          {getUserDisplayName(user)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {user.username} · {user.email}
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

                            <div className="text-xs text-gray-500" dir="ltr">
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
                        <div className="text-sm">
                          {user.profile?.jobTitle || 'بدون عنوان شغلی'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {user.profile?.domain || 'بدون دامنه کاری'}
                        </div>
                      </td>

                      <td>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            className="btn btn-warning btn-xs"
                            onClick={() => openEditModal(user)}
                            disabled={isProcessing}
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                            ویرایش
                          </button>

                          <button
                            type="button"
                            className={`btn btn-xs ${isActive ? 'btn-error' : 'btn-success'
                              }`}
                            onClick={() => handleToggleUserStatus(user)}
                            disabled={isProcessing}
                          >
                            {isProcessing ? (
                              <span className="loading loading-spinner loading-xs" />
                            ) : isActive ? (
                              <NoSymbolIcon className="h-4 w-4" />
                            ) : (
                              <CheckCircleIcon className="h-4 w-4" />
                            )}

                            {isActive ? 'غیرفعال' : 'فعال'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

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