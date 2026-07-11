import ShamsiDateInput from '@/components/common/ShamsiDateInput';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { userService } from '@/services/user.service';
import {
  getReferenceId,
  getTaskId,
  getUserDisplayName,
  projectPriorityLabels,
  ProjectTask,
  ProjectTaskPayload,
  projectTaskStatusLabels,
  UserSummary,
} from '@/types/project';
import {
  CalendarDaysIcon,
  CheckCircleIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/utils/cn';

type TaskFormModalProps = {
  open: boolean;
  task?: ProjectTask | null;
  onClose: () => void;
  onSubmit: (payload: ProjectTaskPayload) => Promise<void>;
};

const toDateInputValue = (value?: string | null): string => {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  return date.toISOString().slice(0, 10);
};

const getUserId = (user: UserSummary): string => {
  return user.id || user._id || '';
};

export const TaskFormModal = ({
  open,
  task,
  onClose,
  onSubmit,
}: TaskFormModalProps) => {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [error, setError] = useState('');

  const isEditMode = Boolean(task && getTaskId(task));

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProjectTaskPayload>({
    defaultValues: {
      title: '',
      description: '',
      assignedUserIds: [],
      status: 'todo',
      priority: 'medium',
      startDate: '',
      dueDate: '',
    },
  });

  const selectedUserIds = watch('assignedUserIds') || [];

  const activeUsers = useMemo(() => {
    return users.filter((user) => user.isActive !== false);
  }, [users]);

  useEffect(() => {
    if (!open) return;

    const loadUsers = async () => {
      try {
        setError('');

        const items = await userService.listUsers();

        setUsers(items);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'خطا در دریافت کاربران');
      }
    };

    loadUsers();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    if (task) {
      reset({
        title: task.title || '',
        description: task.description || '',
        assignedUserIds:
          task.assignedUserIds?.map((user) => getReferenceId(user)).filter(Boolean) ||
          [],
        status: task.status || 'todo',
        priority: task.priority || 'medium',
        startDate: toDateInputValue(task.startDate),
        dueDate: toDateInputValue(task.dueDate),
      });
    } else {
      reset({
        title: '',
        description: '',
        assignedUserIds: [],
        status: 'todo',
        priority: 'medium',
        startDate: '',
        dueDate: '',
      });
    }

    setError('');
  }, [open, task, reset]);

  const toggleAssignedUser = (userId: string) => {
    const nextValue = selectedUserIds.includes(userId)
      ? selectedUserIds.filter((id) => id !== userId)
      : [...selectedUserIds, userId];

    setValue('assignedUserIds', nextValue, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const submitHandler = async (values: ProjectTaskPayload) => {
    try {
      setError('');

      await onSubmit({
        ...values,
        startDate: values.startDate || null,
        dueDate: values.dueDate || null,
        assignedUserIds: values.assignedUserIds || [],
      });

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ذخیره وظیفه');
    }
  };

  if (!open) return null;

  return (
    <dialog className="modal modal-open" dir="rtl">
      <div className="modal-box flex max-h-[92vh] max-w-5xl flex-col overflow-hidden bg-base-200 p-0">
        <div className="border-b border-base-300 bg-base-100 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <ClipboardDocumentCheckIcon className="h-7 w-7" />
              </div>

              <div>
                <h3 className="text-xl font-extrabold text-base-content">
                  {isEditMode ? 'ویرایش وظیفه' : 'ایجاد وظیفه جدید'}
                </h3>
                <p className="mt-1 text-sm leading-7 text-base-content/60">
                  وظایف مبنای نمایش در تقویم، هشدار مدیریتی و پیگیری اجرای
                  پروژه هستند.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-ghost btn-sm btn-circle"
              onClick={onClose}
              aria-label="بستن"
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
            <div className="alert alert-error items-start">
              <ExclamationTriangleIcon className="h-5 w-5" />
              <span>{error}</span>
            </div>
          ) : null}

          <section className="avid-form-section">
            <div className="mb-5">
              <h4 className="avid-form-title">اطلاعات اصلی وظیفه</h4>
              <p className="avid-form-hint mt-1">
                عنوان باید کوتاه و اجرایی باشد تا در تقویم و گزارش‌ها واضح دیده
                شود.
              </p>
            </div>

            <div className="grid gap-4">
              <label className="form-control">
                <span className="label label-text">عنوان وظیفه</span>
                <input
                  className={cn(
                    'input input-bordered',
                    errors.title ? 'input-error' : '',
                  )}
                  placeholder="مثلاً طراحی API تقویم پروژه"
                  {...register('title', { required: 'عنوان وظیفه الزامی است.' })}
                />
                {errors.title?.message ? (
                  <span className="avid-error-text">{errors.title.message}</span>
                ) : null}
              </label>

              <label className="form-control">
                <span className="label label-text">توضیحات</span>
                <textarea
                  className="textarea textarea-bordered min-h-28"
                  placeholder="توضیح کوتاه درباره کاری که باید انجام شود."
                  {...register('description')}
                />
              </label>
            </div>
          </section>

          <section className="avid-form-section">
            <div className="mb-5 flex items-center gap-2">
              <CalendarDaysIcon className="h-5 w-5 text-primary" />
              <div>
                <h4 className="avid-form-title">وضعیت، اولویت و زمان‌بندی</h4>
                <p className="avid-form-hint mt-1">
                  تاریخ شروع و موعد انجام باعث نمایش وظیفه در تقویم می‌شود.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <label className="form-control">
                <span className="label label-text">وضعیت</span>
                <select className="select select-bordered" {...register('status')}>
                  {Object.entries(projectTaskStatusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-control">
                <span className="label label-text">اولویت</span>
                <select className="select select-bordered" {...register('priority')}>
                  {Object.entries(projectPriorityLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <ShamsiDateInput
                label="تاریخ شروع"
                value={watch('startDate')}
                onChange={(value) => setValue('startDate', value, { shouldDirty: true })}
              />

              <ShamsiDateInput
                label="موعد انجام"
                value={watch('dueDate')}
                onChange={(value) => setValue('dueDate', value, { shouldDirty: true })}
              />
            </div>
          </section>

          <section className="avid-form-section">
            <div className="mb-5 flex items-center gap-2">
              <UserGroupIcon className="h-5 w-5 text-primary" />
              <div>
                <h4 className="avid-form-title">کاربران مسئول</h4>
                <p className="avid-form-hint mt-1">
                  به جای لیست چندانتخابی سخت، کاربران را با کارت انتخاب کنید.
                </p>
              </div>
            </div>

            {activeUsers.length ? (
              <div className="grid max-h-64 gap-3 overflow-y-auto rounded-2xl border border-base-300 bg-base-200/60 p-3 md:grid-cols-2">
                {activeUsers.map((user) => {
                  const userId = getUserId(user);
                  const active = selectedUserIds.includes(userId);

                  return (
                    <button
                      key={userId}
                      type="button"
                      onClick={() => toggleAssignedUser(userId)}
                      className={cn(
                        'flex items-center justify-between gap-3 rounded-2xl border p-3 text-right transition',
                        active
                          ? 'border-primary bg-primary/10 text-primary shadow-sm'
                          : 'border-base-300 bg-base-100 hover:border-primary/50',
                      )}
                    >
                      <span>
                        <span className="block font-bold">
                          {getUserDisplayName(user)}
                        </span>
                        <span className="mt-1 block text-xs text-base-content/55">
                          {user.email || user.username || 'بدون اطلاعات تماس'}
                        </span>
                      </span>

                      {active ? (
                        <CheckCircleIcon className="h-5 w-5 shrink-0" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-base-300 p-5 text-center text-sm text-base-content/60">
                کاربر فعالی برای تخصیص وظیفه پیدا نشد.
              </div>
            )}
          </section>
        </form>

        <div className="border-t border-base-300 bg-base-100 px-6 py-4">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              انصراف
            </button>

            <button
              type="button"
              className="btn btn-primary min-w-36"
              disabled={isSubmitting}
              onClick={handleSubmit(submitHandler)}
            >
              {isSubmitting ? (
                <>
                  <span className="loading loading-spinner loading-sm" />
                  در حال ذخیره...
                </>
              ) : isEditMode ? (
                'ذخیره تغییرات'
              ) : (
                'ایجاد وظیفه'
              )}
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
};