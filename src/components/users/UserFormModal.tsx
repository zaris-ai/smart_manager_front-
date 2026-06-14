import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { userService } from '@/services/user.service';
import {
  AppUser,
  getUserDisplayName,
  getUserId,
  isManagerRole,
  UserPayload,
  userRoleLabels,
  UserRole,
  userStatusLabels,
  UserStatus,
} from '@/types/user';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  UserCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

type UserFormModalProps = {
  open: boolean;
  user?: AppUser | null;
  onClose: () => void;
  onSaved: () => void;
};

const defaultValues: UserPayload = {
  firstName: '',
  lastName: '',
  username: '',
  email: '',
  phone: '',
  password: '',
  role: 'employee',
  status: 'active',
  profile: {
    jobTitle: '',
    domain: '',
    specialtyChapter: '',
    responsibilityScope: '',
    bio: '',
  },
  managerId: null,
};

const roleCards: Record<
  UserRole,
  {
    title: string;
    description: string;
    className: string;
    activeClassName: string;
  }
> = {
  manager: {
    title: 'مدیر',
    description: 'مدیریت کاربران، پروژه‌ها، وظایف، فایل‌ها و گزارش پیشرفت',
    className: 'border-blue-200 bg-blue-50 text-blue-800',
    activeClassName: 'ring-blue-500 border-blue-500 bg-blue-100',
  },
  employee: {
    title: 'کارمند',
    description: 'مشاهده و انجام پروژه‌ها و وظایف تخصیص‌یافته',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    activeClassName: 'ring-emerald-500 border-emerald-500 bg-emerald-100',
  },
};

const UserFormModal = ({
  open,
  user,
  onClose,
  onSaved,
}: UserFormModalProps) => {
  const [managers, setManagers] = useState<AppUser[]>([]);
  const [loadingManagers, setLoadingManagers] = useState(false);
  const [error, setError] = useState('');

  const isEditMode = Boolean(user && getUserId(user));

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<UserPayload>({
    defaultValues,
  });

  const selectedRole = watch('role');

  const managerOptions = useMemo(() => {
    return managers.filter((item) => {
      const currentUserId = user ? getUserId(user) : '';

      return getUserId(item) !== currentUserId && isManagerRole(item.role);
    });
  }, [managers, user]);

  useEffect(() => {
    if (!open) return;

    const loadManagers = async () => {
      try {
        setLoadingManagers(true);

        const items = await userService.listUsers({
          role: 'manager',
          isActive: true,
          limit: 100,
        });

        setManagers(items);
      } catch {
        setManagers([]);
      } finally {
        setLoadingManagers(false);
      }
    };

    loadManagers();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    if (user) {
      reset({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        username: user.username || '',
        email: user.email || '',
        phone: user.phone || '',
        password: '',
        role: isManagerRole(user.role) ? 'manager' : 'employee',
        status: (user.status as UserStatus) || 'active',
        profile: {
          jobTitle: user.profile?.jobTitle || '',
          domain: user.profile?.domain || '',
          specialtyChapter: user.profile?.specialtyChapter || '',
          responsibilityScope: user.profile?.responsibilityScope || '',
          bio: user.profile?.bio || '',
        },
        managerId:
          typeof user.managerId === 'string'
            ? user.managerId
            : user.managerId
              ? getUserId(user.managerId)
              : null,
      });
    } else {
      reset(defaultValues);
    }

    setError('');
  }, [open, user, reset]);

  const submitHandler = async (values: UserPayload) => {
    try {
      setError('');

      const payload: UserPayload = {
        ...values,
        managerId: values.role === 'employee' ? values.managerId || null : null,
        password: values.password || undefined,
      };

      if (isEditMode && user) {
        await userService.updateUser(getUserId(user), payload);
      } else {
        await userService.createUser(payload);
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ذخیره کاربر');
    }
  };

  if (!open) return null;

  return (
    <dialog className="modal modal-open" dir="rtl">
      <div className="modal-box flex max-h-[92vh] max-w-5xl flex-col overflow-hidden bg-gray-50 p-0 dark:bg-gray-950">
        <div className="border-b border-gray-200 bg-white px-6 py-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <UserCircleIcon className="h-7 w-7" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {isEditMode ? 'ویرایش کاربر' : 'ایجاد کاربر جدید'}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  ساختار دسترسی فقط شامل مدیر و کارمند است.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-ghost btn-sm btn-circle"
              onClick={onClose}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <form
          onSubmit={handleSubmit(submitHandler)}
          className="flex-1 space-y-5 overflow-y-auto px-6 py-5"
        >
          {error ? (
            <div className="alert alert-error">
              <ExclamationTriangleIcon className="h-5 w-5" />
              <span>{error}</span>
            </div>
          ) : null}

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h4 className="mb-4 font-bold text-gray-900 dark:text-gray-100">
              اطلاعات هویتی
            </h4>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="form-control">
                <span className="label label-text">نام</span>
                <input
                  className={`input input-bordered ${errors.firstName ? 'input-error' : ''}`}
                  {...register('firstName', { required: 'نام الزامی است.' })}
                />
                {errors.firstName?.message ? (
                  <span className="mt-1 text-xs text-error">
                    {errors.firstName.message}
                  </span>
                ) : null}
              </label>

              <label className="form-control">
                <span className="label label-text">نام خانوادگی</span>
                <input
                  className={`input input-bordered ${errors.lastName ? 'input-error' : ''}`}
                  {...register('lastName', { required: 'نام خانوادگی الزامی است.' })}
                />
                {errors.lastName?.message ? (
                  <span className="mt-1 text-xs text-error">
                    {errors.lastName.message}
                  </span>
                ) : null}
              </label>

              <label className="form-control">
                <span className="label label-text">نام کاربری</span>
                <input
                  className={`input input-bordered ${errors.username ? 'input-error' : ''}`}
                  {...register('username', { required: 'نام کاربری الزامی است.' })}
                />
                {errors.username?.message ? (
                  <span className="mt-1 text-xs text-error">
                    {errors.username.message}
                  </span>
                ) : null}
              </label>

              <label className="form-control">
                <span className="label label-text">ایمیل</span>
                <input
                  type="email"
                  className={`input input-bordered ${errors.email ? 'input-error' : ''}`}
                  {...register('email', { required: 'ایمیل الزامی است.' })}
                />
                {errors.email?.message ? (
                  <span className="mt-1 text-xs text-error">
                    {errors.email.message}
                  </span>
                ) : null}
              </label>

              <label className="form-control">
                <span className="label label-text">شماره تماس</span>
                <input className="input input-bordered" {...register('phone')} />
              </label>

              <label className="form-control">
                <span className="label label-text">
                  {isEditMode ? 'رمز عبور جدید' : 'رمز عبور'}
                </span>
                <input
                  type="password"
                  className={`input input-bordered ${errors.password ? 'input-error' : ''}`}
                  {...register('password', {
                    required: isEditMode ? false : 'رمز عبور الزامی است.',
                    minLength: {
                      value: 8,
                      message: 'رمز عبور باید حداقل ۸ کاراکتر باشد.',
                    },
                  })}
                />
                {errors.password?.message ? (
                  <span className="mt-1 text-xs text-error">
                    {errors.password.message}
                  </span>
                ) : null}
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h4 className="mb-4 font-bold text-gray-900 dark:text-gray-100">
              نقش و وضعیت
            </h4>

            <div className="grid gap-3 md:grid-cols-2">
              {Object.keys(userRoleLabels).map((roleKey) => {
                const role = roleKey as UserRole;
                const visual = roleCards[role];
                const active = selectedRole === role;

                return (
                  <label
                    key={role}
                    className={`cursor-pointer rounded-2xl border p-4 transition-all ${visual.className
                      } ${active
                        ? `${visual.activeClassName} ring-2 ring-offset-2`
                        : 'hover:shadow-md'
                      }`}
                  >
                    <input
                      type="radio"
                      value={role}
                      className="sr-only"
                      {...register('role')}
                    />

                    <div className="flex items-center justify-between">
                      <span className="font-bold">{visual.title}</span>
                      {active ? <CheckCircleIcon className="h-5 w-5" /> : null}
                    </div>

                    <p className="mt-2 text-sm leading-6 opacity-80">
                      {visual.description}
                    </p>
                  </label>
                );
              })}
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="form-control">
                <span className="label label-text">وضعیت</span>
                <select className="select select-bordered" {...register('status')}>
                  {Object.entries(userStatusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              {selectedRole === 'employee' ? (
                <label className="form-control">
                  <span className="label label-text">مدیر مستقیم</span>
                  <select
                    className="select select-bordered"
                    disabled={loadingManagers}
                    {...register('managerId')}
                  >
                    <option value="">بدون مدیر مستقیم</option>
                    {managerOptions.map((manager) => (
                      <option key={getUserId(manager)} value={getUserId(manager)}>
                        {getUserDisplayName(manager)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h4 className="mb-4 font-bold text-gray-900 dark:text-gray-100">
              پروفایل کاری
            </h4>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="form-control">
                <span className="label label-text">عنوان شغلی</span>
                <input className="input input-bordered" {...register('profile.jobTitle')} />
              </label>

              <label className="form-control">
                <span className="label label-text">دامنه کاری</span>
                <input className="input input-bordered" {...register('profile.domain')} />
              </label>

              <label className="form-control">
                <span className="label label-text">تخصص / Chapter</span>
                <input
                  className="input input-bordered"
                  {...register('profile.specialtyChapter')}
                />
              </label>

              <label className="form-control">
                <span className="label label-text">حوزه مسئولیت</span>
                <input
                  className="input input-bordered"
                  {...register('profile.responsibilityScope')}
                />
              </label>

              <label className="form-control md:col-span-2">
                <span className="label label-text">توضیحات</span>
                <textarea
                  className="textarea textarea-bordered min-h-24"
                  {...register('profile.bio')}
                />
              </label>
            </div>
          </section>
        </form>

        <div className="border-t border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              انصراف
            </button>

            <button
              type="button"
              className="btn btn-primary min-w-32"
              disabled={isSubmitting}
              onClick={handleSubmit(submitHandler)}
            >
              {isSubmitting
                ? 'در حال ذخیره...'
                : isEditMode
                  ? 'ذخیره تغییرات'
                  : 'ایجاد کاربر'}
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
};

export default UserFormModal;