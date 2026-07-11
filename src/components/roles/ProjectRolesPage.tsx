// src/components/roles/ProjectRolesPage.tsx

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArchiveBoxIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  EllipsisVerticalIcon,
  PencilSquareIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import {
  DashboardPageHeader,
  FilterBar,
  SectionCard,
} from '@/components/common';
import {
  ProjectRole,
  ProjectRolePayload,
  projectService,
} from '@/services/project.service';
import { confirmToast } from '@/utils/sonner-confirm';

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
  const [formOpen, setFormOpen] = useState(false);

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

  const openCreateForm = () => {
    resetForm();
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    resetForm();
  };

  const handleEdit = (role: ProjectRole) => {
    setEditingRoleId(getRoleId(role));
    setForm({
      title: getRoleTitle(role),
      description: role.description || '',
      sortOrder: String(role.sortOrder ?? role.displayOrder ?? 0),
      isActive: role.isActive !== false,
    });
    setFormOpen(true);
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

      closeForm();
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

    const confirmed = await confirmToast({
      title: `غیرفعال‌سازی نقش «${getRoleTitle(role)}»`,
      description: 'این نقش از انتخاب‌های جدید حذف می‌شود، اما سوابق قبلی پروژه‌ها باقی می‌ماند.',
      confirmText: 'غیرفعال کن',
      variant: 'warning',
    });

    if (!confirmed) return;

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
      <DashboardPageHeader
        eyebrow="تنظیمات پروژه"
        title="نقش‌های پروژه"
        description="نقش‌ها به‌صورت لیست مدیریتی نمایش داده می‌شوند و فرم ایجاد یا ویرایش فقط هنگام نیاز باز می‌شود."
        actions={
          <>
            <button
              type="button"
              onClick={loadRoles}
              disabled={isLoading}
              className="btn btn-outline"
            >
              <ArrowPathIcon className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
              بروزرسانی
            </button>
            <button type="button" onClick={openCreateForm} className="btn btn-primary">
              <PlusIcon className="h-5 w-5" />
              نقش جدید
            </button>
          </>
        }
      />

      <FilterBar>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="جستجوی نقش..."
            className="input input-bordered bg-base-100"
          />

          <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-base-300 bg-base-100 px-4 py-2 text-sm font-bold text-base-content/70">
            <span>نمایش غیرفعال‌ها</span>
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(event) => setShowInactive(event.target.checked)}
              className="checkbox checkbox-primary checkbox-sm"
            />
          </label>
        </div>
      </FilterBar>

      <SectionCard
        title="لیست نقش‌ها"
        description="برای جلوگیری از شلوغی، عملیات هر نقش از منوی سه‌نقطه انجام می‌شود."
        actions={<span className="badge badge-outline">{filteredRoles.length} نقش</span>}
      >
        {isLoading ? (
          <div className="rounded-2xl border border-dashed border-base-300 p-8 text-center text-sm text-base-content/55">
            در حال دریافت نقش‌ها...
          </div>
        ) : filteredRoles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-base-300 p-8 text-center text-sm text-base-content/55">
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
                  className="grid gap-4 rounded-2xl border border-base-300 bg-base-200/40 p-4 transition hover:border-primary/40 hover:bg-primary/5 md:grid-cols-[1fr_140px_120px_56px] md:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-base font-black text-base-content">
                        {getRoleTitle(role)}
                      </h3>
                      <span className="rounded-full bg-base-300 px-3 py-1 text-xs font-black text-base-content/60">
                        ترتیب: {Number(role.sortOrder ?? role.displayOrder ?? 0)}
                      </span>
                    </div>

                    <p className="mt-1 line-clamp-1 text-sm leading-6 text-base-content/55">
                      {role.description || 'بدون توضیح'}
                    </p>
                  </div>

                  <div>
                    {isInactive ? (
                      <span className="badge badge-error badge-outline">غیرفعال</span>
                    ) : (
                      <span className="badge badge-success badge-outline">فعال</span>
                    )}
                  </div>

                  <div className="text-xs text-base-content/50">
                    {role.updatedAt ? 'ویرایش‌شده' : 'ثبت‌شده'}
                  </div>

                  <div className="dropdown dropdown-end justify-self-end">
                    <button type="button" className="btn btn-ghost btn-sm btn-square" tabIndex={0}>
                      <EllipsisVerticalIcon className="h-5 w-5" />
                    </button>
                    <ul
                      tabIndex={0}
                      className="menu dropdown-content z-[1] mt-2 w-44 rounded-2xl border border-base-300 bg-base-100 p-2 shadow-xl"
                    >
                      <li>
                        <button type="button" onClick={() => handleEdit(role)}>
                          <PencilSquareIcon className="h-4 w-4" />
                          ویرایش
                        </button>
                      </li>
                      <li>
                        {isInactive ? (
                          <button type="button" className="text-success" onClick={() => handleRestore(role)}>
                            <CheckCircleIcon className="h-4 w-4" />
                            فعال‌سازی
                          </button>
                        ) : (
                          <button type="button" className="text-error" onClick={() => handleArchive(role)}>
                            <ArchiveBoxIcon className="h-4 w-4" />
                            غیرفعال
                          </button>
                        )}
                      </li>
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {formOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-xl rounded-3xl border border-base-300 bg-base-100 p-5 text-right shadow-2xl"
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-base-content">
                  {editingRoleId ? 'ویرایش نقش' : 'نقش جدید'}
                </h2>
                <p className="mt-1 text-sm leading-6 text-base-content/55">
                  اطلاعات نقش را کوتاه و قابل استفاده در فرم‌های پروژه وارد کنید.
                </p>
              </div>

              <button type="button" className="btn btn-ghost btn-sm btn-square" onClick={closeForm}>
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <label className="form-control">
                <span className="label label-text font-bold">عنوان نقش</span>
                <input
                  value={form.title}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      title: event.target.value,
                    }))
                  }
                  placeholder="مثلاً: مذاکره‌کننده"
                  className="input input-bordered bg-base-100"
                />
              </label>

              <label className="form-control">
                <span className="label label-text font-bold">توضیحات</span>
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
                  className="textarea textarea-bordered bg-base-100"
                />
              </label>

              <label className="form-control">
                <span className="label label-text font-bold">ترتیب نمایش</span>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      sortOrder: event.target.value,
                    }))
                  }
                  className="input input-bordered bg-base-100"
                />
              </label>

              <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-base-300 bg-base-200/50 px-4 py-3">
                <span className="text-sm font-bold text-base-content/75">
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
                  className="checkbox checkbox-primary checkbox-sm"
                />
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="btn btn-ghost" onClick={closeForm}>
                  انصراف
                </button>
                <button type="submit" disabled={isSaving} className="btn btn-primary">
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
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
