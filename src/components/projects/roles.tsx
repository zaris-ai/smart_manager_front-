// src/components/projects/roles.tsx

import { DashboardLayout } from '@/components/layouts';
import {
  getProjectRoleId,
  ProjectRole,
  ProjectRolePayload,
  projectService,
} from '@/services/project.service';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  PencilSquareIcon,
  PlusIcon,
  TagIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';

type RoleFormState = {
  title: string;
  description: string;
  sortOrder: string;
  isActive: boolean;
};

const createEmptyForm = (): RoleFormState => ({
  title: '',
  description: '',
  sortOrder: '0',
  isActive: true,
});

const toRolePayload = (form: RoleFormState): ProjectRolePayload => ({
  title: form.title.trim(),
  description: form.description.trim(),
  sortOrder: Number.isFinite(Number(form.sortOrder)) ? Number(form.sortOrder) : 0,
  isActive: form.isActive,
});

const getRoleStatusBadge = (role: ProjectRole): string => {
  return role.isActive === false ? 'badge-warning' : 'badge-success';
};

const ProjectRolesPage = () => {
  const { data: session } = useSession();
  const userRole = String(session?.user?.role || '').toLowerCase();
  const canManage = userRole === 'manager' || userRole === 'admin';

  const [roles, setRoles] = useState<ProjectRole[]>([]);
  const [form, setForm] = useState<RoleFormState>(createEmptyForm());
  const [editingRoleId, setEditingRoleId] = useState('');
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const filteredRoles = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return roles.filter((role) => {
      if (!showInactive && role.isActive === false) return false;
      if (!normalizedSearch) return true;

      return (
        String(role.title || '').toLowerCase().includes(normalizedSearch) ||
        String(role.description || '').toLowerCase().includes(normalizedSearch)
      );
    });
  }, [roles, search, showInactive]);

  const activeRolesCount = useMemo(() => {
    return roles.filter((role) => role.isActive !== false).length;
  }, [roles]);

  const inactiveRolesCount = roles.length - activeRolesCount;

  const loadRoles = async () => {
    try {
      setLoading(true);
      setError('');

      const items = await projectService.listProjectRoles(true);
      setRoles(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در دریافت نقش‌های پروژه');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  const resetForm = () => {
    setForm(createEmptyForm());
    setEditingRoleId('');
    setError('');
    setSuccess('');
  };

  const startEdit = (role: ProjectRole) => {
    setEditingRoleId(getProjectRoleId(role));
    setForm({
      title: role.title || '',
      description: role.description || '',
      sortOrder: String(role.sortOrder ?? 0),
      isActive: role.isActive !== false,
    });
    setError('');
    setSuccess('');
  };

  const submitHandler = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canManage) {
      setError('شما دسترسی لازم برای مدیریت نقش‌های پروژه را ندارید.');
      return;
    }

    const payload = toRolePayload(form);

    if (!payload.title) {
      setError('عنوان نقش پروژه الزامی است.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      if (editingRoleId) {
        await projectService.updateProjectRole(editingRoleId, payload);
        setSuccess('نقش پروژه با موفقیت ویرایش شد.');
      } else {
        await projectService.createProjectRole(payload);
        setSuccess('نقش پروژه با موفقیت ایجاد شد.');
      }

      resetForm();
      await loadRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ذخیره نقش پروژه');
    } finally {
      setSaving(false);
    }
  };

  const deactivateRole = async (role: ProjectRole) => {
    if (!canManage) return;

    const roleId = getProjectRoleId(role);
    if (!roleId) return;

    const confirmed = window.confirm(
      `آیا از غیرفعال‌سازی نقش «${role.title}» مطمئن هستید؟`,
    );

    if (!confirmed) return;

    try {
      setError('');
      setSuccess('');
      await projectService.archiveProjectRole(roleId);
      setSuccess('نقش پروژه غیرفعال شد.');
      await loadRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در غیرفعال‌سازی نقش پروژه');
    }
  };

  const activateRole = async (role: ProjectRole) => {
    if (!canManage) return;

    const roleId = getProjectRoleId(role);
    if (!roleId) return;

    try {
      setError('');
      setSuccess('');
      await projectService.updateProjectRole(roleId, { isActive: true });
      setSuccess('نقش پروژه فعال شد.');
      await loadRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در فعال‌سازی نقش پروژه');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" dir="rtl">
        <div className="rounded-3xl bg-gradient-to-br from-primary/10 via-base-100 to-base-100 p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-content shadow-sm">
                <TagIcon className="h-8 w-8" />
              </div>

              <div>
                <h1 className="text-2xl font-extrabold text-base-content">
                  نقش‌های پروژه
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-base-content/60">
                  نقش‌های قابل استفاده برای اعضای پروژه را از این صفحه تعریف کنید.
                  بعد از تعریف، همین نقش‌ها در فرم ایجاد پروژه و صفحه جزئیات پروژه نمایش داده می‌شوند.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard/projects" className="btn btn-ghost">
                بازگشت به پروژه‌ها
              </Link>
              <button
                type="button"
                className="btn btn-outline"
                onClick={loadRoles}
                disabled={loading}
              >
                <ArrowPathIcon className="h-5 w-5" />
                بروزرسانی
              </button>
            </div>
          </div>
        </div>

        {error ? (
          <div className="alert alert-error">
            <XMarkIcon className="h-5 w-5" />
            <span>{error}</span>
          </div>
        ) : null}

        {success ? (
          <div className="alert alert-success">
            <CheckCircleIcon className="h-5 w-5" />
            <span>{success}</span>
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
          <form
            onSubmit={submitHandler}
            className="rounded-3xl bg-base-100 p-5 shadow-sm"
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-base-content">
                  {editingRoleId ? 'ویرایش نقش' : 'تعریف نقش جدید'}
                </h2>
                <p className="mt-1 text-sm text-base-content/60">
                  عنوان نقش باید کوتاه، روشن و قابل استفاده در پروژه‌ها باشد.
                </p>
              </div>

              {editingRoleId ? (
                <button type="button" className="btn btn-ghost btn-sm" onClick={resetForm}>
                  انصراف
                </button>
              ) : null}
            </div>

            <div className="space-y-4">
              <label className="form-control">
                <span className="label label-text font-semibold">عنوان نقش</span>
                <input
                  className="input input-bordered bg-base-100"
                  placeholder="مثلاً مذاکره‌کننده، مجری پروژه، ناظر"
                  value={form.title}
                  onChange={(event) =>
                    setForm((previous) => ({ ...previous, title: event.target.value }))
                  }
                  disabled={!canManage || saving}
                />
              </label>

              <label className="form-control">
                <span className="label label-text font-semibold">توضیح کوتاه</span>
                <textarea
                  className="textarea textarea-bordered min-h-24 bg-base-100"
                  placeholder="این نقش چه مسئولیتی در پروژه دارد؟"
                  value={form.description}
                  onChange={(event) =>
                    setForm((previous) => ({ ...previous, description: event.target.value }))
                  }
                  disabled={!canManage || saving}
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="form-control">
                  <span className="label label-text font-semibold">ترتیب نمایش</span>
                  <input
                    type="number"
                    className="input input-bordered bg-base-100"
                    value={form.sortOrder}
                    onChange={(event) =>
                      setForm((previous) => ({ ...previous, sortOrder: event.target.value }))
                    }
                    disabled={!canManage || saving}
                  />
                </label>

                <label className="form-control">
                  <span className="label label-text font-semibold">وضعیت</span>
                  <select
                    className="select select-bordered bg-base-100"
                    value={form.isActive ? 'active' : 'inactive'}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        isActive: event.target.value === 'active',
                      }))
                    }
                    disabled={!canManage || saving}
                  >
                    <option value="active">فعال</option>
                    <option value="inactive">غیرفعال</option>
                  </select>
                </label>
              </div>

              {!canManage ? (
                <div className="alert alert-warning text-sm">
                  فقط مدیران می‌توانند نقش پروژه ایجاد یا ویرایش کنند.
                </div>
              ) : null}

              <button type="submit" className="btn btn-primary w-full" disabled={!canManage || saving}>
                <PlusIcon className="h-5 w-5" />
                {saving
                  ? 'در حال ذخیره...'
                  : editingRoleId
                    ? 'ذخیره تغییرات نقش'
                    : 'ایجاد نقش پروژه'}
              </button>
            </div>
          </form>

          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-base-100 p-4 shadow-sm">
                <div className="text-sm text-base-content/60">همه نقش‌ها</div>
                <div className="mt-2 text-3xl font-extrabold">{roles.length}</div>
              </div>
              <div className="rounded-2xl bg-base-100 p-4 shadow-sm">
                <div className="text-sm text-base-content/60">فعال</div>
                <div className="mt-2 text-3xl font-extrabold text-success">
                  {activeRolesCount}
                </div>
              </div>
              <div className="rounded-2xl bg-base-100 p-4 shadow-sm">
                <div className="text-sm text-base-content/60">غیرفعال</div>
                <div className="mt-2 text-3xl font-extrabold text-warning">
                  {inactiveRolesCount}
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-base-100 p-5 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-base-content">لیست نقش‌ها</h2>
                  <p className="mt-1 text-sm text-base-content/60">
                    نقش‌های غیرفعال در فرم پروژه نمایش داده نمی‌شوند، اما سوابق قبلی پروژه‌ها حفظ می‌شود.
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    className="input input-bordered bg-base-100"
                    placeholder="جستجوی نقش..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                  <label className="label cursor-pointer justify-start gap-2 rounded-xl border border-base-300 px-3">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-primary checkbox-sm"
                      checked={showInactive}
                      onChange={(event) => setShowInactive(event.target.checked)}
                    />
                    <span className="label-text">نمایش غیرفعال‌ها</span>
                  </label>
                </div>
              </div>

              <div className="mt-5 overflow-hidden rounded-2xl border border-base-300">
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>عنوان</th>
                        <th>توضیح</th>
                        <th>ترتیب</th>
                        <th>وضعیت</th>
                        <th className="text-left">عملیات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={5} className="py-10 text-center text-base-content/60">
                            در حال دریافت نقش‌ها...
                          </td>
                        </tr>
                      ) : filteredRoles.length ? (
                        filteredRoles.map((role) => {
                          const roleId = getProjectRoleId(role);

                          return (
                            <tr key={roleId}>
                              <td>
                                <div className="font-bold text-base-content">{role.title}</div>
                              </td>
                              <td className="max-w-md text-sm text-base-content/60">
                                {role.description || '—'}
                              </td>
                              <td>{role.sortOrder ?? 0}</td>
                              <td>
                                <span className={`badge ${getRoleStatusBadge(role)}`}>
                                  {role.isActive === false ? 'غیرفعال' : 'فعال'}
                                </span>
                              </td>
                              <td>
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    className="btn btn-ghost btn-xs"
                                    onClick={() => startEdit(role)}
                                    disabled={!canManage}
                                  >
                                    <PencilSquareIcon className="h-4 w-4" />
                                    ویرایش
                                  </button>
                                  {role.isActive === false ? (
                                    <button
                                      type="button"
                                      className="btn btn-success btn-xs"
                                      onClick={() => activateRole(role)}
                                      disabled={!canManage}
                                    >
                                      فعال‌سازی
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      className="btn btn-warning btn-xs"
                                      onClick={() => deactivateRole(role)}
                                      disabled={!canManage}
                                    >
                                      <TrashIcon className="h-4 w-4" />
                                      غیرفعال
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-10 text-center text-base-content/60">
                            نقشی پیدا نشد. اولین نقش پروژه را از فرم سمت راست تعریف کنید.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ProjectRolesPage;