import {
    DashboardPageHeader,
    FilterBar,
    SectionCard,
} from '@/components/common';
import { DashboardLayout } from '@/components/layouts';
import { ProjectCalendar } from '@/components/projects';
import { projectService } from '@/services/project.service';
import { userService } from '@/services/user.service';
import {
    CalendarEvent,
    getUserDisplayName,
    projectPriorityLabels,
    projectStatusLabels,
    projectTaskStatusLabels,
    UserSummary,
} from '@/types/project';
import { withAuth } from '@/utils';
import {
    ArrowPathIcon,
    CheckCircleIcon,
    UserCircleIcon,
} from '@heroicons/react/24/outline';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useMemo, useState } from 'react';

const getUserId = (user: UserSummary): string => {
    return user.id || user._id || '';
};

const DashboardCalendarPage = () => {
    const { data: session } = useSession();
    const currentUserId = session?.user?.id || '';

    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [users, setUsers] = useState<UserSummary[]>([]);

    const [assignedUserId, setAssignedUserId] = useState('');
    const [status, setStatus] = useState('');
    const [priority, setPriority] = useState('');
    const [onlyMine, setOnlyMine] = useState(true);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [closingTaskId, setClosingTaskId] = useState('');

    const effectiveAssignedUserId = useMemo(() => {
        return onlyMine ? currentUserId : assignedUserId;
    }, [assignedUserId, currentUserId, onlyMine]);

    const loadUsers = useCallback(async () => {
        try {
            const response = await userService.listUsers({
                role: 'manager',
                isActive: true,
                limit: 100,
            });

            setUsers(response);
        } catch {
            setUsers([]);
        }
    }, []);

    const loadEvents = useCallback(async () => {
        try {
            setLoading(true);
            setError('');

            const response = await projectService.listCalendarEvents({
                assignedUserId: effectiveAssignedUserId || undefined,
                status: status || undefined,
                priority: priority || undefined,
            });

            setEvents(response);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'خطا در دریافت تقویم پروژه‌ها');
        } finally {
            setLoading(false);
        }
    }, [effectiveAssignedUserId, priority, status]);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    useEffect(() => {
        loadEvents();
    }, [loadEvents]);

    const handleCloseTaskFromCalendar = async (event: CalendarEvent) => {
        if (!event.projectId || !event.taskId) return;

        try {
            setClosingTaskId(event.taskId);
            setError('');

            await projectService.closeTask(event.projectId, event.taskId);
            await loadEvents();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'خطا در بستن کار');
        } finally {
            setClosingTaskId('');
        }
    };

    const handleAssignedUserChange = (value: string) => {
        setAssignedUserId(value);
        setOnlyMine(false);
    };

    return (
        <DashboardLayout>
            <div className="space-y-6" dir="rtl">
                <DashboardPageHeader
                    eyebrow="تقویم پروژه‌ها"
                    title="تقویم کارهای پروژه"
                    description="تقویم عنصر اصلی این صفحه است؛ فیلترها به یک نوار فشرده منتقل شده‌اند تا نمای روزها خلوت‌تر بماند."
                    actions={
                        <>
                            <button
                                className={`btn ${onlyMine ? 'btn-primary' : 'btn-outline'}`}
                                onClick={() => setOnlyMine((value) => !value)}
                                disabled={!currentUserId}
                                type="button"
                            >
                                <UserCircleIcon className="h-5 w-5" />
                                کارهای من
                            </button>

                            <button className="btn btn-outline" onClick={loadEvents} type="button">
                                <ArrowPathIcon className="h-5 w-5" />
                                بروزرسانی
                            </button>
                        </>
                    }
                />

                <FilterBar>
                    <div className="mb-3 flex flex-col gap-2 rounded-2xl bg-base-200/60 px-4 py-3 text-sm text-base-content/60 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <span className="font-black text-base-content">نمای فعلی: </span>
                            {onlyMine
                                ? 'فقط کارهای مدیر واردشده'
                                : 'همه کارها یا کارهای مدیر انتخاب‌شده'}
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                            <CheckCircleIcon className="h-4 w-4 text-success" />
                            کارهای باز را از داخل مودال روزانه می‌توانید ببندید.
                        </div>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-4">
                        <select
                            className="select select-bordered bg-base-100"
                            value={assignedUserId}
                            onChange={(event) => handleAssignedUserChange(event.target.value)}
                            disabled={onlyMine}
                        >
                            <option value="">همه مدیران</option>
                            {users.map((user) => (
                                <option key={getUserId(user)} value={getUserId(user)}>
                                    {getUserDisplayName(user)}
                                </option>
                            ))}
                        </select>

                        <select
                            className="select select-bordered bg-base-100"
                            value={status}
                            onChange={(event) => setStatus(event.target.value)}
                        >
                            <option value="">همه وضعیت‌ها</option>

                            <optgroup label="وضعیت پروژه">
                                {Object.entries(projectStatusLabels).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </optgroup>

                            <optgroup label="وضعیت کار">
                                {Object.entries(projectTaskStatusLabels).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </optgroup>
                        </select>

                        <select
                            className="select select-bordered bg-base-100"
                            value={priority}
                            onChange={(event) => setPriority(event.target.value)}
                        >
                            <option value="">همه اولویت‌ها</option>
                            {Object.entries(projectPriorityLabels).map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </select>

                        <button className="btn btn-neutral" onClick={loadEvents} type="button">
                            اعمال فیلتر
                        </button>
                    </div>
                </FilterBar>

                {error ? (
                    <div className="alert alert-error">
                        <span>{error}</span>
                    </div>
                ) : null}

                <SectionCard
                    title="نمای تقویم"
                    description="رویدادهای پروژه، فاز و وظیفه در یک نمای متمرکز نمایش داده می‌شوند."
                    actions={<span className="badge badge-outline">{events.length} رویداد</span>}
                >
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <span className="loading loading-spinner loading-lg" />
                        </div>
                    ) : (
                        <ProjectCalendar
                            events={events}
                            currentUserId={currentUserId}
                            closingTaskId={closingTaskId}
                            showCloseActions
                            onCloseTask={handleCloseTaskFromCalendar}
                        />
                    )}
                </SectionCard>
            </div>
        </DashboardLayout>
    );
};

export const getServerSideProps = withAuth();

export default DashboardCalendarPage;
