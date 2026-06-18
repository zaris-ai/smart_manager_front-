// src/components/roles/ProjectRolesPage.tsx

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArchiveBoxIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  PencilSquareIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import {
  ProjectRole,
  ProjectRolePayload,
  projectService,
} from '@/services/project.service';

type RoleFormState = {
  title: string;
  description: string;
  sortOrder: string;
  isActive: boolean;
};

const emptyForm: RoleFormState = {
  title: '',
  description: '',
  sortOrder: '0',
  isActive: true,
};

const getRoleId = (role: ProjectRole): string => {
  return String(role.id || role._id || '');
};

const getRoleTitle = (role: ProjectRole): string => {
  return String(role.title || role.name || '');
};

const toRolePayload = (form: RoleFormState): ProjectRolePayload => {
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    sortOrder: Number(form.sortOrder || 0),
    isActive: form.isActive,
  };
};

export default function ProjectRolesPage() {
  const [roles, setRoles] = useState<ProjectRole[]>([]);
  const [form, setForm] = useState<RoleFormState>(emptyForm);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadRoles = async () => {
    try {
      setIsLoading(true);
      const data = await projectService.listProjectRoles(true);
      setRoles(data);
    } catch (error: any) {
      toast.error(error?.message || 'خطا در دریافت نقش‌های پروژه');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  const filteredRoles = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return roles
      .filter((role) => {
        if (!showInactive && role.isActive === false) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        return [
          getRoleTitle(role),
          role.description || '',
          String(role.sortOrder ?? role.displayOrder ?? ''),
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch);
      })
      .sort((a, b) => {
        const aOrder = Number(a.sortOrder ?? a.displayOrder ?? 0);
        const bOrder = Number(b.sortOrder ?? b.displayOrder ?? 0);

        if (aOrder !== bOrder) {
          return aOrder - bOrder;
        }

        return getRoleTitle(a).localeCompare(getRoleTitle(b), 'fa');
      });
  }, [roles, search, showInactive]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingRoleId(null);
  };

  const handleEdit = (role: ProjectRole) => {
    setEditingRoleId(getRoleId(role));
    setForm({
      title: getRoleTitle(role),
      description: role.description || '',
      sortOrder: String(role.sortOrder ?? role.displayOrder ?? 0),
      isActive: role.isActive !== false,
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.title.trim()) {
      toast.error('عنوان نقش الزامی است.');
      return;
    }

    try {
      setIsSaving(true);
      const payload = toRolePayload(form);

      if (editingRoleId) {
        await projectService.updateProjectRole(editingRoleId, payload);
        toast.success('نقش پروژه با موفقیت ویرایش شد.');
      } else {
        await projectService.createProjectRole(payload);
        toast.success('نقش پروژه با موفقیت ایجاد شد.');
      }

      resetForm();
      await loadRoles();
    } catch (error: any) {
      toast.error(error?.message || 'خطا در ذخیره نقش پروژه');
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchive = async (role: ProjectRole) => {
    const roleId = getRoleId(role);

    if (!roleId) {
      toast.error('شناسه نقش معتبر نیست.');
      return;
    }

    try {
      await projectService.archiveProjectRole(roleId);
      toast.success('نقش پروژه غیرفعال شد.');
      await loadRoles();
    } catch (error: any) {
      toast.error(error?.message || 'خطا در غیرفعال‌سازی نقش پروژه');
    }
  };

  const handleRestore = async (role: ProjectRole) => {
    const roleId = getRoleId(role);

    if (!roleId) {
      toast.error('شناسه نقش معتبر نیست.');
      return;
    }

    try {
      await projectService.updateProjectRole(roleId, {
        isActive: true,
      });
      toast.success('نقش پروژه فعال شد.');
      await loadRoles();
    } catch (error: any) {
      toast.error(error?.message || 'خطا در فعال‌سازی نقش پروژه');
    }
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
              مدیریت نقش‌ها
            </p>
            <h1 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
              نقش‌های پروژه
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500 dark:text-slate-400">
              نقش‌های قابل انتخاب برای اعضای پروژه را اینجا تعریف کنید. سپس در فرم پروژه و صفحه جزئیات پروژه، اعضا فقط از همین نقش‌های از پیش تعریف‌شده انتخاب می‌شوند.
            </p>
          </div>

          <button
            type="button"
            onClick={loadRoles}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            <ArrowPathIcon className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
            بروزرسانی
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              {editingRoleId ? 'ویرایش نقش' : 'نقش جدید'}
            </h2>

            {editingRoleId ? (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-bold text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <XMarkIcon className="h-4 w-4" />
                انصراف
              </button>
            ) : null}
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
                عنوان نقش
              </span>
              <input
                value={form.title}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    title: event.target.value,
                  }))
                }
                placeholder="مثلا: مذاکره‌کننده"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-blue-950"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
                توضیحات
              </span>
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    description: event.target.value,
                  }))
                }
                placeholder="توضیح کوتاه درباره مسئولیت این نقش"
                rows={4}
                className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-blue-950"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
                ترتیب نمایش
              </span>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    sortOrder: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-blue-950"
              />
            </label>

            <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-950">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                نقش فعال باشد
              </span>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    isActive: event.target.checked,
                  }))
                }
                className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
            </label>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {editingRoleId ? (
                <PencilSquareIcon className="h-5 w-5" />
              ) : (
                <PlusIcon className="h-5 w-5" />
              )}
              {isSaving
                ? 'در حال ذخیره...'
                : editingRoleId
                  ? 'ذخیره ویرایش'
                  : 'ایجاد نقش'}
            </button>
          </div>
        </form>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                لیست نقش‌ها
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {filteredRoles.length} نقش نمایش داده می‌شود.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="جستجوی نقش..."
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-blue-950"
              />

              <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(event) => setShowInactive(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                نمایش غیرفعال‌ها
              </label>
            </div>
          </div>

          {isLoading ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              در حال دریافت نقش‌ها...
            </div>
          ) : filteredRoles.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              نقشی برای نمایش وجود ندارد.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRoles.map((role) => {
                const roleId = getRoleId(role);
                const isInactive = role.isActive === false;

                return (
                  <div
                    key={roleId}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-200 hover:bg-blue-50/40 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-blue-900 dark:hover:bg-blue-950/20"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-black text-slate-900 dark:text-white">
                            {getRoleTitle(role)}
                          </h3>

                          {isInactive ? (
                            <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                              غیرفعال
                            </span>
                          ) : (
                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                              فعال
                            </span>
                          )}

                          <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            ترتیب: {Number(role.sortOrder ?? role.displayOrder ?? 0)}
                          </span>
                        </div>

                        {role.description ? (
                          <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-400">
                            {role.description}
                          </p>
                        ) : (
                          <p className="mt-2 text-sm text-slate-400">
                            بدون توضیح
                          </p>
                        )}
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(role)}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                          ویرایش
                        </button>

                        {isInactive ? (
                          <button
                            type="button"
                            onClick={() => handleRestore(role)}
                            className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
                          >
                            <CheckCircleIcon className="h-4 w-4" />
                            فعال‌سازی
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleArchive(role)}
                            className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 transition hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300"
                          >
                            <ArchiveBoxIcon className="h-4 w-4" />
                            غیرفعال
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}