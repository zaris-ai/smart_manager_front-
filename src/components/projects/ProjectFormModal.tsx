import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  getProjectRoleId,
  ProjectRole,
  projectService,
} from '@/services/project.service';
import { userService } from '@/services/user.service';
import {
  getProjectId,
  getReferenceId,
  getUserDisplayName,
  isManagerUser,
  Project,
  ProjectPayload,
  ProjectPriority,
  projectPriorityLabels,
  ProjectStatus,
  projectStatusLabels,
  UserSummary,
} from '@/types/project';
import {
  CalendarDaysIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  FlagIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
  UserGroupIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

type ProjectFormModalProps = {
  open: boolean;
  project?: Project | null;
  onClose: () => void;
  onSaved: () => void;
};

type ProjectMemberFormState = {
  userId: string;
  roleId: string;
  roleInProject: string;
  startedAt: string;
  expectedFinishedAt: string;
};

type ProjectMemberReference = {
  userId?: UserSummary | string | null;
  roleId?: ProjectRole | string | null;
  roleInProject?: string | null;
  startedAt?: string | null;
  expectedFinishedAt?: string | null;
};

type ProjectWithMembers = Project & {
  projectMembers?: ProjectMemberReference[];
  members?: ProjectMemberReference[];
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

const getInitials = (user: UserSummary): string => {
  return getUserDisplayName(user).slice(0, 2);
};

const normalizeMemberDraftsFromProject = (
  project: Project | null | undefined,
): Record<string, ProjectMemberFormState> => {
  if (!project) return {};

  const projectWithMembers = project as ProjectWithMembers;
  const members = projectWithMembers.projectMembers || projectWithMembers.members || [];

  return members.reduce<Record<string, ProjectMemberFormState>>((acc, member) => {
    const userId = getReferenceId(member.userId);

    if (!userId) return acc;

    acc[userId] = {
      userId,
      roleId:
        typeof member.roleId === 'string'
          ? member.roleId
          : getProjectRoleId(member.roleId),
      roleInProject: member.roleInProject || '',
      startedAt: toDateInputValue(member.startedAt),
      expectedFinishedAt: toDateInputValue(member.expectedFinishedAt),
    };

    return acc;
  }, {});
};

const buildDefaultMemberDraft = ({
  userId,
  ownerId,
  startDate,
  dueDate,
}: {
  userId: string;
  ownerId?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
}): ProjectMemberFormState => ({
  userId,
  roleId: '',
  roleInProject: userId === ownerId ? 'مسئول پروژه' : 'عضو پروژه',
  startedAt: startDate || '',
  expectedFinishedAt: dueDate || '',
});

const statusVisuals: Record<
  ProjectStatus,
  {
    title: string;
    description: string;
    className: string;
    activeClassName: string;
  }
> = {
  negotiating: {
    title: 'در حال مذاکره',
    description: 'پروژه در مرحله مذاکره با مشتری است.',
    className: 'border-violet-200 bg-violet-50 text-violet-800',
    activeClassName: 'ring-violet-500 border-violet-500 bg-violet-100',
  },
  proposal_drafting: {
    title: 'تدوین پروپوزال',
    description: 'پیشنهاد فنی یا مالی پروژه در حال آماده‌سازی است.',
    className: 'border-cyan-200 bg-cyan-50 text-cyan-800',
    activeClassName: 'ring-cyan-500 border-cyan-500 bg-cyan-100',
  },
  contract_signing: {
    title: 'عقد قرارداد',
    description: 'پروژه در مرحله نهایی‌سازی و امضای قرارداد است.',
    className: 'border-teal-200 bg-teal-50 text-teal-800',
    activeClassName: 'ring-teal-500 border-teal-500 bg-teal-100',
  },
  planning: {
    title: 'برنامه‌ریزی',
    description: 'پروژه هنوز وارد اجرا نشده است.',
    className: 'border-sky-200 bg-sky-50 text-sky-800',
    activeClassName: 'ring-sky-500 border-sky-500 bg-sky-100',
  },
  active: {
    title: 'فعال',
    description: 'پروژه در حال اجراست.',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    activeClassName: 'ring-emerald-500 border-emerald-500 bg-emerald-100',
  },
  on_hold: {
    title: 'متوقف موقت',
    description: 'پروژه فعلاً متوقف شده است.',
    className: 'border-amber-200 bg-amber-50 text-amber-800',
    activeClassName: 'ring-amber-500 border-amber-500 bg-amber-100',
  },
  completed: {
    title: 'تکمیل‌شده',
    description: 'پروژه پایان یافته است.',
    className: 'border-indigo-200 bg-indigo-50 text-indigo-800',
    activeClassName: 'ring-indigo-500 border-indigo-500 bg-indigo-100',
  },
  cancelled: {
    title: 'لغوشده',
    description: 'پروژه لغو شده است.',
    className: 'border-rose-200 bg-rose-50 text-rose-800',
    activeClassName: 'ring-rose-500 border-rose-500 bg-rose-100',
  },
};

const priorityVisuals: Record<
  ProjectPriority,
  {
    title: string;
    description: string;
    className: string;
    activeClassName: string;
  }
> = {
  low: {
    title: 'کم',
    description: 'اهمیت پایین',
    className: 'border-gray-200 bg-gray-50 text-gray-700',
    activeClassName: 'ring-gray-500 border-gray-500 bg-gray-100',
  },
  medium: {
    title: 'متوسط',
    description: 'اهمیت عادی',
    className: 'border-blue-200 bg-blue-50 text-blue-800',
    activeClassName: 'ring-blue-500 border-blue-500 bg-blue-100',
  },
  high: {
    title: 'زیاد',
    description: 'نیازمند پیگیری جدی',
    className: 'border-orange-200 bg-orange-50 text-orange-800',
    activeClassName: 'ring-orange-500 border-orange-500 bg-orange-100',
  },
  critical: {
    title: 'بحرانی',
    description: 'دارای ریسک مدیریتی',
    className: 'border-red-200 bg-red-50 text-red-800',
    activeClassName: 'ring-red-500 border-red-500 bg-red-100',
  },
};

export const ProjectFormModal = ({
  open,
  project,
  onClose,
  onSaved,
}: ProjectFormModalProps) => {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [projectRoles, setProjectRoles] = useState<ProjectRole[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [error, setError] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [memberDrafts, setMemberDrafts] = useState<Record<string, ProjectMemberFormState>>({});

  const isEditMode = Boolean(project && getProjectId(project));

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProjectPayload>({
    defaultValues: {
      title: '',
      description: '',
      status: 'planning',
      priority: 'medium',
      startDate: '',
      dueDate: '',
      ownerId: '',
      assignedUserIds: [],
    },
  });

  const selectedStatus = watch('status');
  const selectedPriority = watch('priority');
  const selectedOwnerId = watch('ownerId');
  const selectedUserIds = watch('assignedUserIds') || [];
  const watchedTitle = watch('title');
  const watchedStartDate = watch('startDate');
  const watchedDueDate = watch('dueDate');

  const activeUsers = useMemo(() => {
    return users.filter((user) => user.isActive !== false);
  }, [users]);

  const managerUsers = useMemo(() => {
    return activeUsers.filter(isManagerUser);
  }, [activeUsers]);

  const ownerOptions = managerUsers.length > 0 ? managerUsers : activeUsers;

  const activeProjectRoles = useMemo(() => {
    return projectRoles.filter((role) => role.isActive !== false);
  }, [projectRoles]);

  const projectRoleMap = useMemo(() => {
    return new Map(activeProjectRoles.map((role) => [getProjectRoleId(role), role]));
  }, [activeProjectRoles]);

  const selectedUsers = useMemo(() => {
    return activeUsers.filter((user) => selectedUserIds.includes(getUserId(user)));
  }, [activeUsers, selectedUserIds]);

  const selectedMemberIds = useMemo(() => {
    return Array.from(
      new Set(
        [selectedOwnerId, ...selectedUserIds].filter(
          (item): item is string => Boolean(item),
        ),
      ),
    );
  }, [selectedOwnerId, selectedUserIds]);

  const selectedMemberDrafts = useMemo(() => {
    return selectedMemberIds.map((userId) => {
      return (
        memberDrafts[userId] ||
        buildDefaultMemberDraft({
          userId,
          ownerId: selectedOwnerId,
          startDate: watchedStartDate,
          dueDate: watchedDueDate,
        })
      );
    });
  }, [memberDrafts, selectedMemberIds, selectedOwnerId, watchedStartDate, watchedDueDate]);

  const selectedOwner = useMemo(() => {
    return activeUsers.find((user) => getUserId(user) === selectedOwnerId);
  }, [activeUsers, selectedOwnerId]);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = userSearch.trim().toLowerCase();

    if (!normalizedSearch) return activeUsers;

    return activeUsers.filter((user) => {
      const displayName = getUserDisplayName(user).toLowerCase();
      const email = user.email?.toLowerCase() || '';
      const username = user.username?.toLowerCase() || '';

      return (
        displayName.includes(normalizedSearch) ||
        email.includes(normalizedSearch) ||
        username.includes(normalizedSearch)
      );
    });
  }, [activeUsers, userSearch]);

  useEffect(() => {
    if (!open) return;

    const loadInitialData = async () => {
      try {
        setLoadingUsers(true);
        setLoadingRoles(true);
        setError('');

        const [items, roles] = await Promise.all([
          userService.listUsers(),
          projectService.listProjectRoles(false),
        ]);

        setUsers(items);
        setProjectRoles(roles);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'خطا در دریافت اطلاعات فرم پروژه');
      } finally {
        setLoadingUsers(false);
        setLoadingRoles(false);
      }
    };

    loadInitialData();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    if (project) {
      const assignedUserIds =
        project.assignedUserIds?.map((user) => getReferenceId(user)).filter(Boolean) ||
        [];
      const ownerId = getReferenceId(project.ownerId);

      reset({
        title: project.title || '',
        description: project.description || '',
        status: project.status || 'planning',
        priority: project.priority || 'medium',
        startDate: toDateInputValue(project.startDate),
        dueDate: toDateInputValue(project.dueDate),
        ownerId,
        assignedUserIds,
      });

      setMemberDrafts(normalizeMemberDraftsFromProject(project));
    } else {
      reset({
        title: '',
        description: '',
        status: 'planning',
        priority: 'medium',
        startDate: '',
        dueDate: '',
        ownerId: '',
        assignedUserIds: [],
      });

      setMemberDrafts({});
    }

    setUserSearch('');
    setError('');
  }, [open, project, reset]);

  const toggleAssignedUser = (userId: string) => {
    const nextValue = selectedUserIds.includes(userId)
      ? selectedUserIds.filter((id) => id !== userId)
      : [...selectedUserIds, userId];

    setValue('assignedUserIds', nextValue, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });

    if (!selectedUserIds.includes(userId)) {
      setMemberDrafts((previous) => ({
        ...previous,
        [userId]:
          previous[userId] ||
          buildDefaultMemberDraft({
            userId,
            ownerId: selectedOwnerId,
            startDate: watchedStartDate,
            dueDate: watchedDueDate,
          }),
      }));
    }
  };

  const removeAssignedUser = (userId: string) => {
    setValue(
      'assignedUserIds',
      selectedUserIds.filter((id) => id !== userId),
      {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      },
    );
  };

  useEffect(() => {
    if (!selectedOwnerId) return;

    setMemberDrafts((previous) => ({
      ...previous,
      [selectedOwnerId]:
        previous[selectedOwnerId] ||
        buildDefaultMemberDraft({
          userId: selectedOwnerId,
          ownerId: selectedOwnerId,
          startDate: watchedStartDate,
          dueDate: watchedDueDate,
        }),
    }));
  }, [selectedOwnerId, watchedStartDate, watchedDueDate]);

  const updateMemberDraft = (
    userId: string,
    field: keyof Omit<ProjectMemberFormState, 'userId'>,
    value: string,
  ) => {
    setMemberDrafts((previous) => ({
      ...previous,
      [userId]: {
        ...(previous[userId] ||
          buildDefaultMemberDraft({
            userId,
            ownerId: selectedOwnerId,
            startDate: watchedStartDate,
            dueDate: watchedDueDate,
          })),
        [field]: value,
      },
    }));
  };

  const submitHandler = async (values: ProjectPayload) => {
    try {
      setError('');

      const assignedUserIds = Array.from(
        new Set([...(values.assignedUserIds || []), values.ownerId].filter(Boolean)),
      );

      const projectMembers = assignedUserIds.map((userId) => {
        const draft =
          memberDrafts[userId] ||
          buildDefaultMemberDraft({
            userId,
            ownerId: values.ownerId,
            startDate: values.startDate || '',
            dueDate: values.dueDate || '',
          });

        const selectedRole = draft.roleId ? projectRoleMap.get(draft.roleId) : null;

        return {
          userId,
          roleId: draft.roleId || null,
          roleInProject:
            selectedRole?.title ||
            draft.roleInProject.trim() ||
            (userId === values.ownerId ? 'مسئول پروژه' : 'عضو پروژه'),
          startedAt: draft.startedAt || values.startDate || null,
          expectedFinishedAt: draft.expectedFinishedAt || values.dueDate || null,
        };
      });

      const memberWithoutRole = projectMembers.find((member) => !member.roleId);

      if (memberWithoutRole) {
        setError('برای همه اعضای پروژه باید نقش از صفحه نقش‌ها انتخاب شود.');
        return;
      }

      const invalidMemberDate = projectMembers.find((member) => {
        return (
          member.startedAt &&
          member.expectedFinishedAt &&
          new Date(member.expectedFinishedAt) < new Date(member.startedAt)
        );
      });

      if (invalidMemberDate) {
        setError('تاریخ پایان احتمالی عضو پروژه نمی‌تواند قبل از تاریخ شروع او باشد.');
        return;
      }

      const payload = {
        ...values,
        dueDate: values.dueDate || null,
        assignedUserIds,
        projectMembers,
      } as ProjectPayload & {
        projectMembers: Array<{
          userId: string;
          roleId: string | null;
          roleInProject: string;
          startedAt: string | null;
          expectedFinishedAt: string | null;
        }>;
      };

      if (isEditMode && project) {
        await projectService.updateProject(getProjectId(project), payload);
      } else {
        await projectService.createProject(payload);
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ذخیره پروژه');
    }
  };

  if (!open) return null;

  return (
    <dialog className="modal modal-open" dir="rtl">
      <div className="modal-box flex max-h-[92vh] max-w-6xl flex-col overflow-hidden bg-gray-50 p-0 dark:bg-gray-950">
        <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <ClipboardDocumentListIcon className="h-7 w-7" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {isEditMode ? 'ویرایش پروژه' : 'ایجاد پروژه جدید'}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  فقط مدیران می‌توانند پروژه ایجاد یا ویرایش کنند. کارشناسان فقط پروژه‌ها و وظایف تخصیص‌یافته را می‌بینند.
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
          className="flex-1 overflow-y-auto px-6 py-5"
        >
          {error ? (
            <div className="alert alert-error mb-5">
              <ExclamationTriangleIcon className="h-5 w-5" />
              <span>{error}</span>
            </div>
          ) : null}

          <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
            <div className="space-y-5">
              <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    <ClipboardDocumentListIcon className="h-6 w-6" />
                  </div>

                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-gray-100">
                      اطلاعات اصلی پروژه
                    </h4>
                    <p className="text-xs text-gray-500">
                      عنوان و توضیحات باید خروجی و محدوده پروژه را واضح کند.
                    </p>
                  </div>
                </div>

                <label className="form-control">
                  <span className="label label-text font-semibold">عنوان پروژه</span>
                  <input
                    className={`input input-bordered bg-white dark:bg-gray-950 ${
                      errors.title ? 'input-error' : ''
                    }`}
                    placeholder="مثلاً طراحی پنل مدیریت پروژه"
                    {...register('title', {
                      required: 'عنوان پروژه الزامی است.',
                      minLength: {
                        value: 3,
                        message: 'عنوان پروژه باید حداقل ۳ کاراکتر باشد.',
                      },
                    })}
                  />
                  {errors.title?.message ? (
                    <span className="mt-1 text-xs text-error">
                      {errors.title.message}
                    </span>
                  ) : null}
                </label>

                <label className="form-control mt-4">
                  <span className="label label-text font-semibold">
                    توضیحات پروژه
                  </span>
                  <textarea
                    className="textarea textarea-bordered min-h-32 bg-white dark:bg-gray-950"
                    placeholder="هدف، محدوده، خروجی مورد انتظار و نکات مهم پروژه را بنویسید."
                    {...register('description')}
                  />
                </label>
              </section>

              <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    <FlagIcon className="h-6 w-6" />
                  </div>

                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-gray-100">
                      وضعیت و اولویت
                    </h4>
                    <p className="text-xs text-gray-500">
                      این اطلاعات برای فیلتر، گزارش مدیریتی و تقویم استفاده می‌شود.
                    </p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <div className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                      وضعیت پروژه
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      {Object.keys(projectStatusLabels).map((value) => {
                        const status = value as ProjectStatus;
                        const visual = statusVisuals[status];
                        const active = selectedStatus === status;

                        return (
                          <label
                            key={status}
                            className={`cursor-pointer rounded-2xl border p-3 transition-all ${
                              visual.className
                            } ${
                              active
                                ? `${visual.activeClassName} ring-2 ring-offset-2`
                                : 'hover:shadow-md'
                            }`}
                          >
                            <input
                              type="radio"
                              value={status}
                              className="sr-only"
                              {...register('status')}
                            />

                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-bold">{visual.title}</span>
                              {active ? <CheckCircleIcon className="h-5 w-5" /> : null}
                            </div>

                            <p className="mt-2 text-xs leading-5 opacity-80">
                              {visual.description}
                            </p>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                      اولویت پروژه
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      {Object.keys(projectPriorityLabels).map((value) => {
                        const priority = value as ProjectPriority;
                        const visual = priorityVisuals[priority];
                        const active = selectedPriority === priority;

                        return (
                          <label
                            key={priority}
                            className={`cursor-pointer rounded-2xl border p-3 transition-all ${
                              visual.className
                            } ${
                              active
                                ? `${visual.activeClassName} ring-2 ring-offset-2`
                                : 'hover:shadow-md'
                            }`}
                          >
                            <input
                              type="radio"
                              value={priority}
                              className="sr-only"
                              {...register('priority')}
                            />

                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-bold">{visual.title}</span>
                              {active ? <CheckCircleIcon className="h-5 w-5" /> : null}
                            </div>

                            <p className="mt-2 text-xs leading-5 opacity-80">
                              {visual.description}
                            </p>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                    <CalendarDaysIcon className="h-6 w-6" />
                  </div>

                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-gray-100">
                      زمان‌بندی پروژه
                    </h4>
                    <p className="text-xs text-gray-500">
                      تاریخ شروع الزامی است. موعد تحویل برای تقویم و گزارش عقب‌افتادگی استفاده می‌شود.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="form-control">
                    <span className="label label-text font-semibold">تاریخ شروع</span>
                    <input
                      type="date"
                      className={`input input-bordered bg-white dark:bg-gray-950 ${
                        errors.startDate ? 'input-error' : ''
                      }`}
                      {...register('startDate', {
                        required: 'تاریخ شروع الزامی است.',
                      })}
                    />
                    {errors.startDate?.message ? (
                      <span className="mt-1 text-xs text-error">
                        {errors.startDate.message}
                      </span>
                    ) : null}
                  </label>

                  <label className="form-control">
                    <span className="label label-text font-semibold">موعد تحویل</span>
                    <input
                      type="date"
                      className={`input input-bordered bg-white dark:bg-gray-950 ${
                        errors.dueDate ? 'input-error' : ''
                      }`}
                      {...register('dueDate', {
                        validate: (value) => {
                          if (!value || !watchedStartDate) return true;

                          return (
                            new Date(value) >= new Date(watchedStartDate) ||
                            'موعد تحویل نمی‌تواند قبل از تاریخ شروع باشد.'
                          );
                        },
                      })}
                    />
                    {errors.dueDate?.message ? (
                      <span className="mt-1 text-xs text-error">
                        {errors.dueDate.message}
                      </span>
                    ) : null}
                  </label>
                </div>
              </section>

              <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                    <UserGroupIcon className="h-6 w-6" />
                  </div>

                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-gray-100">
                      تیم پروژه
                    </h4>
                    <p className="text-xs text-gray-500">
                      مسئول پروژه باید مدیر باشد. کارشناسان فقط به‌عنوان عضو یا مسئول وظیفه انتخاب می‌شوند.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="form-control">
                    <span className="label label-text font-semibold">مسئول پروژه</span>
                    <select
                      className={`select select-bordered bg-white dark:bg-gray-950 ${
                        errors.ownerId ? 'select-error' : ''
                      }`}
                      disabled={loadingUsers}
                      {...register('ownerId', {
                        required: 'انتخاب مسئول پروژه الزامی است.',
                      })}
                    >
                      <option value="">
                        {loadingUsers ? 'در حال دریافت کاربران...' : 'انتخاب مسئول پروژه'}
                      </option>
                      {ownerOptions.map((user) => (
                        <option key={getUserId(user)} value={getUserId(user)}>
                          {getUserDisplayName(user)}
                        </option>
                      ))}
                    </select>
                    {errors.ownerId?.message ? (
                      <span className="mt-1 text-xs text-error">
                        {errors.ownerId.message}
                      </span>
                    ) : null}
                  </label>

                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
                    <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                          اعضای پروژه
                        </div>
                        <div className="text-xs text-gray-500">
                          {selectedUserIds.length} کاربر انتخاب شده است.
                        </div>
                      </div>

                      <label className="input input-bordered flex items-center gap-2 bg-white md:w-72 dark:bg-gray-900">
                        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                        <input
                          type="text"
                          className="grow"
                          placeholder="جستجوی کاربر..."
                          value={userSearch}
                          onChange={(event) => setUserSearch(event.target.value)}
                        />
                      </label>
                    </div>

                    {selectedUsers.length > 0 ? (
                      <div className="mb-4 flex flex-wrap gap-2">
                        {selectedUsers.map((user) => {
                          const userId = getUserId(user);

                          return (
                            <span
                              key={userId}
                              className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
                            >
                              {getUserDisplayName(user)}
                              <button
                                type="button"
                                className="rounded-full hover:bg-primary/20"
                                onClick={() => removeAssignedUser(userId)}
                              >
                                <XMarkIcon className="h-4 w-4" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    ) : null}

                    {selectedMemberDrafts.length > 0 ? (
                      <div className="mb-4 space-y-3 rounded-2xl border border-primary/10 bg-primary/5 p-4">
                        <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                          <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                            نقش و زمان‌بندی هر عضو
                          </div>
                          <div className="text-xs text-gray-500">
                            برای هر نفر نقش، تاریخ شروع و پایان احتمالی را مشخص کنید.
                          </div>
                        </div>

                        <div className="space-y-3">
                          {selectedMemberDrafts.map((draft) => {
                            const user = activeUsers.find((item) => getUserId(item) === draft.userId);
                            const isOwner = draft.userId === selectedOwnerId;

                            return (
                              <div
                                key={draft.userId}
                                className="rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
                              >
                                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                  <div>
                                    <div className="font-bold text-gray-900 dark:text-gray-100">
                                      {user ? getUserDisplayName(user) : 'کاربر انتخاب‌شده'}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {isOwner ? 'مسئول اصلی پروژه' : 'عضو پروژه'}
                                    </div>
                                  </div>

                                  {isOwner ? (
                                    <span className="badge badge-primary">مسئول پروژه</span>
                                  ) : null}
                                </div>

                                <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr]">
                                  <label className="form-control">
                                    <span className="label label-text text-xs font-semibold">
                                      نقش در پروژه
                                    </span>
                                    <select
                                      className="select select-bordered bg-white dark:bg-gray-950"
                                      value={draft.roleId}
                                      disabled={loadingRoles || !activeProjectRoles.length}
                                      onChange={(event) => {
                                        const role = projectRoleMap.get(event.target.value);

                                        updateMemberDraft(
                                          draft.userId,
                                          'roleId',
                                          event.target.value,
                                        );
                                        updateMemberDraft(
                                          draft.userId,
                                          'roleInProject',
                                          role?.title || '',
                                        );
                                      }}
                                    >
                                      <option value="">
                                        {activeProjectRoles.length
                                          ? 'انتخاب نقش پروژه'
                                          : 'ابتدا نقش پروژه تعریف کنید'}
                                      </option>
                                      {activeProjectRoles.map((role) => (
                                        <option key={getProjectRoleId(role)} value={getProjectRoleId(role)}>
                                          {role.title}
                                        </option>
                                      ))}
                                    </select>
                                    {!activeProjectRoles.length ? (
                                      <a
                                        href="/dashboard/projects/roles"
                                        className="mt-2 inline-flex text-xs font-semibold text-primary hover:underline"
                                      >
                                        رفتن به صفحه تعریف نقش‌ها
                                      </a>
                                    ) : null}
                                  </label>

                                  <label className="form-control">
                                    <span className="label label-text text-xs font-semibold">
                                      شروع همکاری
                                    </span>
                                    <input
                                      type="date"
                                      className="input input-bordered bg-white dark:bg-gray-950"
                                      value={draft.startedAt}
                                      onChange={(event) =>
                                        updateMemberDraft(
                                          draft.userId,
                                          'startedAt',
                                          event.target.value,
                                        )
                                      }
                                    />
                                  </label>

                                  <label className="form-control">
                                    <span className="label label-text text-xs font-semibold">
                                      پایان احتمالی
                                    </span>
                                    <input
                                      type="date"
                                      className="input input-bordered bg-white dark:bg-gray-950"
                                      value={draft.expectedFinishedAt}
                                      onChange={(event) =>
                                        updateMemberDraft(
                                          draft.userId,
                                          'expectedFinishedAt',
                                          event.target.value,
                                        )
                                      }
                                    />
                                  </label>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    <div className="max-h-72 overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 dark:border-gray-800 dark:bg-gray-900">
                      {loadingUsers ? (
                        <div className="flex items-center justify-center py-10">
                          <span className="loading loading-spinner loading-md" />
                        </div>
                      ) : filteredUsers.length === 0 ? (
                        <div className="py-10 text-center text-sm text-gray-500">
                          کاربری پیدا نشد.
                        </div>
                      ) : (
                        <div className="grid gap-2 md:grid-cols-2">
                          {filteredUsers.map((user) => {
                            const userId = getUserId(user);
                            const selected = selectedUserIds.includes(userId);

                            return (
                              <button
                                key={userId}
                                type="button"
                                className={`flex items-center gap-3 rounded-xl border p-3 text-right transition-all ${
                                  selected
                                    ? 'border-primary bg-primary/10 ring-1 ring-primary'
                                    : 'border-gray-200 bg-white hover:border-primary/40 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800'
                                }`}
                                onClick={() => toggleAssignedUser(userId)}
                              >
                                <div
                                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                                    selected
                                      ? 'bg-primary text-white'
                                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                                  }`}
                                >
                                  {getInitials(user)}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-sm font-bold text-gray-900 dark:text-gray-100">
                                    {getUserDisplayName(user)}
                                  </div>
                                  <div className="truncate text-xs text-gray-500">
                                    {user.roleLabel || user.role || user.email || user.username || 'کاربر'}
                                  </div>
                                </div>

                                {selected ? (
                                  <CheckCircleIcon className="h-5 w-5 text-primary" />
                                ) : null}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <aside className="space-y-4">
              <div className="sticky top-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <CheckCircleIcon className="h-6 w-6" />
                  </div>

                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-gray-100">
                      خلاصه پروژه
                    </h4>
                    <p className="text-xs text-gray-500">
                      قبل از ذخیره، اطلاعات را مرور کنید.
                    </p>
                  </div>
                </div>

                <div className="space-y-4 text-sm">
                  <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-950">
                    <div className="text-xs text-gray-500">عنوان</div>
                    <div className="mt-1 font-bold text-gray-900 dark:text-gray-100">
                      {watchedTitle || 'هنوز عنوانی وارد نشده'}
                    </div>
                  </div>

                  <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-950">
                    <div className="text-xs text-gray-500">مسئول پروژه</div>
                    <div className="mt-1 flex items-center gap-2 font-bold text-gray-900 dark:text-gray-100">
                      <UserCircleIcon className="h-5 w-5 text-gray-400" />
                      {selectedOwner ? getUserDisplayName(selectedOwner) : 'انتخاب نشده'}
                    </div>
                  </div>

                  <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-950">
                    <div className="text-xs text-gray-500">اعضا و نقش‌ها</div>
                    <div className="mt-2 space-y-2">
                      {selectedMemberDrafts.length ? (
                        selectedMemberDrafts.slice(0, 4).map((member) => {
                          const user = activeUsers.find((item) => getUserId(item) === member.userId);

                          return (
                            <div key={member.userId} className="rounded-lg bg-white p-2 dark:bg-gray-900">
                              <div className="font-bold text-gray-900 dark:text-gray-100">
                                {user ? getUserDisplayName(user) : 'عضو پروژه'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {member.roleInProject || 'عضو پروژه'}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="font-bold text-gray-900 dark:text-gray-100">
                          هنوز عضوی انتخاب نشده
                        </div>
                      )}

                      {selectedMemberDrafts.length > 4 ? (
                        <div className="text-xs text-gray-500">
                          +{selectedMemberDrafts.length - 4} عضو دیگر
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-950">
                    <div className="text-xs text-gray-500">وضعیت / اولویت</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="badge badge-info">
                        {projectStatusLabels[selectedStatus]}
                      </span>
                      <span className="badge badge-outline">
                        {projectPriorityLabels[selectedPriority]}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-950">
                    <div className="text-xs text-gray-500">زمان‌بندی</div>
                    <div className="mt-1 text-gray-900 dark:text-gray-100">
                      شروع: {watchedStartDate || '—'}
                    </div>
                    <div className="mt-1 text-gray-900 dark:text-gray-100">
                      تحویل: {watchedDueDate || '—'}
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </form>

        <div className="sticky bottom-0 z-10 border-t border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-500">
              بعد از ذخیره، مدیر می‌تواند برای پروژه وظیفه، یادداشت پیشرفت و فایل اضافه کند.
            </p>

            <div className="flex gap-2">
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                انصراف
              </button>

              <button
                type="button"
                className="btn btn-primary min-w-36"
                disabled={isSubmitting}
                onClick={handleSubmit(submitHandler)}
              >
                {isSubmitting
                  ? 'در حال ذخیره...'
                  : isEditMode
                    ? 'ذخیره تغییرات'
                    : 'ایجاد پروژه'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <form method="dialog" className="modal-backdrop">
        <button type="button" onClick={onClose}>
          بستن
        </button>
      </form>
    </dialog>
  );
};