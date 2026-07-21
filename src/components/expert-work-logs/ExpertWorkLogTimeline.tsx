import type { ExpertWorkLog } from '@/types/expert-work-log';
import { getEntityId, getEntityLabel } from '@/types/expert-work-log';
import { UserAvatar } from '@/components/common';
import {
  formatShamsiDateTime,
  formatShamsiFullDate,
} from '@/utils/shamsi-date';
import {
  BriefcaseIcon,
  CalendarDaysIcon,
  CheckBadgeIcon,
  ClockIcon,
  DocumentCheckIcon,
  ExclamationTriangleIcon,
  FlagIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { useMemo } from 'react';

const formatDuration = (minutes?: number | null): string => {
  const value = Number(minutes || 0);
  if (!value) return 'زمان ثبت نشده';

  const hours = Math.floor(value / 60);
  const remaining = value % 60;

  if (hours && remaining) return `${hours.toLocaleString('fa-IR')} ساعت و ${remaining.toLocaleString('fa-IR')} دقیقه`;
  if (hours) return `${hours.toLocaleString('fa-IR')} ساعت`;
  return `${remaining.toLocaleString('fa-IR')} دقیقه`;
};

const getDateKey = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

type Props = {
  items: ExpertWorkLog[];
  loading?: boolean;
  onEdit: (workLog: ExpertWorkLog) => void;
  onDelete: (workLog: ExpertWorkLog) => void;
};

export default function ExpertWorkLogTimeline({
  items,
  loading = false,
  onEdit,
  onDelete,
}: Props) {
  const groupedItems = useMemo(() => {
    const groups = new Map<string, ExpertWorkLog[]>();

    items.forEach((item) => {
      const key = getDateKey(item.workDate);
      const current = groups.get(key) || [];
      current.push(item);
      groups.set(key, current);
    });

    return Array.from(groups.entries());
  }, [items]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-44 animate-pulse rounded-3xl bg-base-200" />
        ))}
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-base-300 bg-base-200/25 p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary">
          <DocumentCheckIcon className="h-8 w-8" />
        </div>
        <h3 className="mt-4 text-lg font-black text-base-content">هنوز گزارشی ثبت نشده است</h3>
        <p className="mt-2 max-w-lg text-sm leading-7 text-base-content/55">
          با ثبت فعالیت روزانه، سابقه دقیق کار هر کارشناس روی پروژه و تاریخ انجام آن قابل پیگیری می‌شود.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {groupedItems.map(([dateKey, dateItems]) => (
        <section key={dateKey} className="relative">
          <div className="sticky top-28 z-10 mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-content shadow-sm">
              <CalendarDaysIcon className="h-5 w-5" />
            </div>
            <div className="rounded-2xl border border-base-300 bg-base-100/95 px-4 py-2 shadow-sm backdrop-blur">
              <h3 className="font-black text-base-content">{formatShamsiFullDate(dateKey)}</h3>
              <p className="text-xs text-base-content/50">
                {dateItems.length.toLocaleString('fa-IR')} فعالیت ثبت‌شده
              </p>
            </div>
          </div>

          <div className="mr-5 space-y-4 border-r-2 border-base-300 pr-7">
            {dateItems.map((item) => {
              const project = typeof item.projectId === 'string' ? null : item.projectId;
              const expert = typeof item.expertId === 'string' ? null : item.expertId;
              const expertReferenceId = typeof item.expertId === 'string' ? item.expertId : getEntityId(item.expertId);
              const phase = typeof item.phaseId === 'string' ? null : item.phaseId;
              const task = typeof item.taskId === 'string' ? null : item.taskId;
              const progress = item.progressPercent;

              return (
                <article
                  key={getEntityId(item)}
                  className="relative rounded-3xl border border-base-300 bg-base-100 p-5 shadow-sm transition hover:border-primary/30 hover:shadow-md"
                >
                  <span className="absolute -right-[2.2rem] top-7 h-4 w-4 rounded-full border-4 border-base-100 bg-primary shadow" />

                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 font-black text-primary">
                          <BriefcaseIcon className="h-4 w-4" />
                          {getEntityLabel(project, 'پروژه نامشخص')}
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full bg-base-200 py-1 pl-3 pr-1 font-bold text-base-content/65">
                          <UserAvatar
                            userId={expertReferenceId}
                            name={getEntityLabel(expert, 'کارشناس نامشخص')}
                            size="xs"
                          />
                          <span className="break-words">{getEntityLabel(expert, 'کارشناس نامشخص')}</span>
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-info/10 px-3 py-1 font-bold text-info">
                          <ClockIcon className="h-4 w-4" />
                          {formatDuration(item.durationMinutes)}
                        </span>
                      </div>

                      <h4 className="mt-4 text-lg font-black text-base-content">{item.title}</h4>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-8 text-base-content/70">
                        {item.description}
                      </p>

                      {phase || task ? (
                        <div className="mt-4 flex flex-wrap gap-2 text-xs">
                          {phase ? (
                            <span className="rounded-xl border border-base-300 bg-base-200/60 px-3 py-1.5 font-bold text-base-content/65">
                              فاز: {getEntityLabel(phase)}
                            </span>
                          ) : null}
                          {task ? (
                            <span className="rounded-xl border border-base-300 bg-base-200/60 px-3 py-1.5 font-bold text-base-content/65">
                              وظیفه: {getEntityLabel(task)}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {item.permissions?.canEdit ? (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm rounded-xl"
                          onClick={() => onEdit(item)}
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                          ویرایش
                        </button>
                      ) : null}
                      {item.permissions?.canDelete ? (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm rounded-xl text-error hover:bg-error/10"
                          onClick={() => onDelete(item)}
                        >
                          <TrashIcon className="h-4 w-4" />
                          حذف
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {progress !== null && progress !== undefined ? (
                    <div className="mt-5 rounded-2xl border border-base-300 bg-base-200/35 p-3">
                      <div className="mb-2 flex items-center justify-between text-xs font-bold">
                        <span className="text-base-content/55">پیشرفت مرتبط با این فعالیت</span>
                        <span className="text-primary">{Number(progress).toLocaleString('fa-IR')}٪</span>
                      </div>
                      <progress className="progress progress-primary h-2 w-full" value={progress} max={100} />
                    </div>
                  ) : null}

                  {(item.deliverables || item.blockers || item.nextSteps) ? (
                    <div className="mt-5 grid gap-3 lg:grid-cols-3">
                      {item.deliverables ? (
                        <div className="rounded-2xl border border-success/20 bg-success/5 p-4">
                          <div className="flex items-center gap-2 text-sm font-black text-success">
                            <CheckBadgeIcon className="h-5 w-5" />
                            خروجی‌ها
                          </div>
                          <p className="mt-2 whitespace-pre-wrap text-xs leading-7 text-base-content/65">
                            {item.deliverables}
                          </p>
                        </div>
                      ) : null}

                      {item.blockers ? (
                        <div className="rounded-2xl border border-warning/20 bg-warning/5 p-4">
                          <div className="flex items-center gap-2 text-sm font-black text-warning">
                            <ExclamationTriangleIcon className="h-5 w-5" />
                            موانع
                          </div>
                          <p className="mt-2 whitespace-pre-wrap text-xs leading-7 text-base-content/65">
                            {item.blockers}
                          </p>
                        </div>
                      ) : null}

                      {item.nextSteps ? (
                        <div className="rounded-2xl border border-info/20 bg-info/5 p-4">
                          <div className="flex items-center gap-2 text-sm font-black text-info">
                            <FlagIcon className="h-5 w-5" />
                            گام بعدی
                          </div>
                          <p className="mt-2 whitespace-pre-wrap text-xs leading-7 text-base-content/65">
                            {item.nextSteps}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-base-300 pt-3 text-[11px] text-base-content/45">
                    <span>ثبت: {formatShamsiDateTime(item.createdAt)}</span>
                    {item.revision && item.revision > 1 ? (
                      <span>ویرایش شماره {item.revision.toLocaleString('fa-IR')}</span>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
