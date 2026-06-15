import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CalendarEvent,
  getReferenceId,
  getUserDisplayName,
  projectPriorityLabels,
  projectStatusLabels,
  projectTaskStatusLabels,
  UserReference,
} from '@/types/project';
import {
  CalendarDaysIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardDocumentListIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

type ProjectCalendarProps = {
  events: CalendarEvent[];
  currentUserId?: string;
  closingTaskId?: string;
  showCloseActions?: boolean;
  onCloseTask?: (event: CalendarEvent) => Promise<void> | void;
};

type SelectedDay = {
  date: Date;
  dateKey: string;
  events: CalendarEvent[];
};

const weekDays = [
  'شنبه',
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنجشنبه',
  'جمعه',
];

const closedTaskStatuses = ['done', 'cancelled'];

const isTaskEvent = (event: CalendarEvent): boolean => {
  return event.type === 'task_start' || event.type === 'task_due';
};

const toSafeDate = (value: Date | string): Date => {
  if (value instanceof Date) return value;

  /**
   * If backend sends "YYYY-MM-DD", parse it as local date.
   * This avoids timezone date shifting in the calendar.
   */
  const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;

    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  return new Date(value);
};

const toLocalDateKey = (value: Date | string): string => {
  const date = toSafeDate(value);

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const getMonthDays = (currentDate: Date): Date[] => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const jsDay = firstDay.getDay();
  const saturdayBasedOffset = (jsDay + 1) % 7;

  const days: Date[] = [];

  for (let index = saturdayBasedOffset; index > 0; index -= 1) {
    days.push(new Date(year, month, 1 - index));
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    days.push(new Date(year, month, day));
  }

  while (days.length % 7 !== 0) {
    const last = days[days.length - 1];

    days.push(new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1));
  }

  return days;
};

const formatMonthTitle = (date: Date): string => {
  return new Intl.DateTimeFormat('fa-IR', {
    month: 'long',
    year: 'numeric',
  }).format(date);
};

const formatDayNumber = (date: Date): string => {
  return new Intl.DateTimeFormat('fa-IR', {
    day: 'numeric',
  }).format(date);
};

const formatFullDate = (date: Date | string): string => {
  return new Intl.DateTimeFormat('fa-IR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(toSafeDate(date));
};

const getEventBadgeClass = (type: CalendarEvent['type']): string => {
  switch (type) {
    case 'project_start':
      return 'badge-info';
    case 'project_due':
      return 'badge-warning';
    case 'task_start':
      return 'badge-success';
    case 'task_due':
      return 'badge-error';
    default:
      return 'badge-neutral';
  }
};

const getEventTypeLabel = (type: CalendarEvent['type']): string => {
  switch (type) {
    case 'project_start':
      return 'شروع پروژه';
    case 'project_due':
      return 'موعد پروژه';
    case 'task_start':
      return 'شروع کار';
    case 'task_due':
      return 'موعد کار';
    default:
      return 'رویداد';
  }
};

const getStatusLabel = (status: string): string => {
  return (
    projectStatusLabels[status as keyof typeof projectStatusLabels] ||
    projectTaskStatusLabels[status as keyof typeof projectTaskStatusLabels] ||
    status
  );
};

const formatAssignedUsers = (users: UserReference[]): string => {
  if (!users?.length) return 'بدون مسئول مشخص';

  return users.map((user) => getUserDisplayName(user)).join('، ');
};

const isUserAssignedToEvent = (
  event: CalendarEvent,
  currentUserId?: string,
): boolean => {
  if (!currentUserId) return true;

  return event.assignedUserIds?.some((user) => {
    return getReferenceId(user) === currentUserId;
  });
};

const isClosedTaskEvent = (event: CalendarEvent): boolean => {
  return closedTaskStatuses.includes(String(event.status || '').toLowerCase());
};

export const ProjectCalendar = ({
  events,
  currentUserId,
  closingTaskId,
  showCloseActions = false,
  onCloseTask,
}: ProjectCalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<SelectedDay | null>(null);

  const monthDays = useMemo(() => {
    return getMonthDays(currentDate);
  }, [currentDate]);

  const eventsByDate = useMemo(() => {
    return events.reduce<Record<string, CalendarEvent[]>>((acc, event) => {
      const key = toLocalDateKey(event.start);

      if (!acc[key]) acc[key] = [];

      acc[key].push(event);

      return acc;
    }, {});
  }, [events]);

  const goPreviousMonth = () => {
    setCurrentDate((value) => {
      return new Date(value.getFullYear(), value.getMonth() - 1, 1);
    });
  };

  const goNextMonth = () => {
    setCurrentDate((value) => {
      return new Date(value.getFullYear(), value.getMonth() + 1, 1);
    });
  };

  const openDayModal = (date: Date, dayEvents: CalendarEvent[]) => {
    setSelectedDay({
      date,
      dateKey: toLocalDateKey(date),
      events: dayEvents,
    });
  };

  const closeDayModal = () => {
    setSelectedDay(null);
  };

  const selectedTaskEvents = selectedDay?.events.filter(isTaskEvent) || [];
  const selectedProjectEvents = selectedDay?.events.filter((event) => !isTaskEvent(event)) || [];

  return (
    <>
      <div className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-base-content">
              {formatMonthTitle(currentDate)}
            </h2>

            <p className="mt-1 text-sm text-base-content/60">
              روی هر روز کلیک کنید تا تمام کارهای همان روز را ببینید و کارهای باز خودتان را ببندید.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button className="btn btn-sm btn-outline" onClick={goNextMonth}>
              <ChevronRightIcon className="h-4 w-4" />
              ماه بعد
            </button>

            <button
              className="btn btn-sm btn-ghost"
              onClick={() => setCurrentDate(new Date())}
            >
              امروز
            </button>

            <button className="btn btn-sm btn-outline" onClick={goPreviousMonth}>
              ماه قبل
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-base-content/60">
          {weekDays.map((day) => (
            <div key={day} className="rounded-lg bg-base-200 py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-7 gap-2">
          {monthDays.map((day) => {
            const dateKey = toLocalDateKey(day);
            const dayEvents = eventsByDate[dateKey] || [];
            const dayTaskEvents = dayEvents.filter(isTaskEvent);
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();

            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => openDayModal(day, dayEvents)}
                className={`min-h-36 rounded-xl border p-2 text-right transition hover:border-primary hover:bg-primary/5 ${
                  isCurrentMonth
                    ? 'border-base-300 bg-base-100'
                    : 'border-base-300 bg-base-200/60 opacity-60'
                }`}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-base-content">
                    {formatDayNumber(day)}
                  </span>

                  {dayTaskEvents.length ? (
                    <span className="badge badge-primary badge-sm">
                      {dayTaskEvents.length} کار
                    </span>
                  ) : dayEvents.length ? (
                    <span className="badge badge-outline badge-sm">
                      {dayEvents.length} رویداد
                    </span>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  {dayEvents.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      className="rounded-lg bg-base-200 p-2 text-xs"
                      title={event.title}
                    >
                      <div className="mb-1 flex flex-wrap items-center gap-1">
                        <span
                          className={`badge badge-xs ${getEventBadgeClass(event.type)}`}
                        >
                          {getEventTypeLabel(event.type)}
                        </span>

                        <span className="badge badge-xs badge-outline">
                          {projectPriorityLabels[event.priority] || event.priority}
                        </span>
                      </div>

                      <div className="line-clamp-2 font-medium text-base-content">
                        {event.title}
                      </div>

                      <div className="mt-1 text-[11px] text-base-content/60">
                        {getStatusLabel(event.status)}
                      </div>
                    </div>
                  ))}

                  {dayEvents.length > 3 ? (
                    <div className="rounded-lg border border-dashed border-base-300 p-2 text-center text-xs text-base-content/60">
                      +{dayEvents.length - 3} مورد دیگر
                    </div>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>

        {events.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-base-300 p-6 text-center text-sm text-base-content/60">
            هنوز رویدادی برای نمایش در تقویم وجود ندارد.
          </div>
        ) : null}
      </div>

      {selectedDay ? (
        <dialog className="modal modal-open" dir="rtl">
          <div className="modal-box max-w-4xl bg-base-100">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm text-base-content/60">
                  <CalendarDaysIcon className="h-5 w-5" />
                  {formatFullDate(selectedDay.date)}
                </div>

                <h3 className="text-xl font-bold text-base-content">
                  کارها و رویدادهای این روز
                </h3>

                <p className="mt-1 text-sm text-base-content/60">
                  {selectedTaskEvents.length} کار و {selectedProjectEvents.length} رویداد پروژه در این روز ثبت شده است.
                </p>
              </div>

              <button
                type="button"
                className="btn btn-ghost btn-sm btn-circle"
                onClick={closeDayModal}
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {selectedDay.events.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-base-300 p-8 text-center">
                <ClipboardDocumentListIcon className="mx-auto h-10 w-10 text-base-content/40" />
                <div className="mt-3 font-bold text-base-content">
                  برای این روز کاری ثبت نشده است
                </div>
                <p className="mt-1 text-sm text-base-content/60">
                  برای نمایش در تقویم، برای وظیفه تاریخ شروع یا موعد انجام ثبت کنید.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <section>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h4 className="font-bold text-base-content">
                      کارهای این روز
                    </h4>

                    <span className="badge badge-primary">
                      {selectedTaskEvents.length}
                    </span>
                  </div>

                  {selectedTaskEvents.length ? (
                    <div className="space-y-3">
                      {selectedTaskEvents.map((event) => {
                        const canCloseTask =
                          showCloseActions &&
                          Boolean(event.taskId) &&
                          !isClosedTaskEvent(event) &&
                          isUserAssignedToEvent(event, currentUserId);
                        const isClosing = closingTaskId === event.taskId;

                        return (
                          <div
                            key={event.id}
                            className="rounded-2xl border border-base-300 bg-base-200/60 p-4"
                          >
                            <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                              <div>
                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                  <span
                                    className={`badge ${getEventBadgeClass(event.type)}`}
                                  >
                                    {getEventTypeLabel(event.type)}
                                  </span>

                                  <span className="badge badge-outline">
                                    {projectPriorityLabels[event.priority] ||
                                      event.priority}
                                  </span>

                                  <span className="badge badge-ghost">
                                    {getStatusLabel(event.status)}
                                  </span>
                                </div>

                                <div className="text-base font-bold text-base-content">
                                  {event.title}
                                </div>

                                <div className="mt-2 text-sm text-base-content/60">
                                  مسئولان: {formatAssignedUsers(event.assignedUserIds)}
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                {canCloseTask ? (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-success"
                                    disabled={isClosing}
                                    onClick={() => onCloseTask?.(event)}
                                  >
                                    {isClosing ? (
                                      <span className="loading loading-spinner loading-xs" />
                                    ) : (
                                      <CheckCircleIcon className="h-4 w-4" />
                                    )}
                                    بستن کار
                                  </button>
                                ) : isTaskEvent(event) && isClosedTaskEvent(event) ? (
                                  <span className="badge badge-success gap-1">
                                    <CheckCircleIcon className="h-4 w-4" />
                                    بسته شده
                                  </span>
                                ) : null}

                                <Link
                                  href={`/dashboard/projects/${event.projectId}`}
                                  className="btn btn-sm btn-outline"
                                >
                                  مشاهده پروژه
                                </Link>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-base-300 p-5 text-center text-sm text-base-content/60">
                      در این روز وظیفه‌ای ثبت نشده است.
                    </div>
                  )}
                </section>

                {selectedProjectEvents.length ? (
                  <section>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h4 className="font-bold text-base-content">
                        رویدادهای پروژه
                      </h4>

                      <span className="badge badge-outline">
                        {selectedProjectEvents.length}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {selectedProjectEvents.map((event) => (
                        <div
                          key={event.id}
                          className="rounded-2xl border border-base-300 p-4"
                        >
                          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                            <div>
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                <span
                                  className={`badge ${getEventBadgeClass(event.type)}`}
                                >
                                  {getEventTypeLabel(event.type)}
                                </span>

                                <span className="badge badge-outline">
                                  {projectPriorityLabels[event.priority] ||
                                    event.priority}
                                </span>

                                <span className="badge badge-ghost">
                                  {getStatusLabel(event.status)}
                                </span>
                              </div>

                              <div className="text-base font-bold text-base-content">
                                {event.title}
                              </div>

                              <div className="mt-2 text-sm text-base-content/60">
                                کاربران مرتبط:{' '}
                                {formatAssignedUsers(event.assignedUserIds)}
                              </div>
                            </div>

                            <Link
                              href={`/dashboard/projects/${event.projectId}`}
                              className="btn btn-sm btn-outline"
                            >
                              مشاهده پروژه
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>
            )}

            <div className="modal-action">
              <button className="btn" type="button" onClick={closeDayModal}>
                بستن
              </button>
            </div>
          </div>

          <form method="dialog" className="modal-backdrop">
            <button type="button" onClick={closeDayModal}>
              close
            </button>
          </form>
        </dialog>
      ) : null}
    </>
  );
};