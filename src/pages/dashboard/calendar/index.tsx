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
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';

const getUserId = (user: UserSummary): string => {
    return user.id || user._id || '';
};

const DashboardCalendarPage = () => {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [users, setUsers] = useState<UserSummary[]>([]);

    const [assignedUserId, setAssignedUserId] = useState('');
    const [status, setStatus] = useState('');
    const [priority, setPriority] = useState('');

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadUsers = async () => {
        try {
            const response = await userService.listUsers();

            setUsers(response);
        } catch {
            setUsers([]);
        }
    };

    const loadEvents = async () => {
        try {
            setLoading(true);
            setError('');

            const response = await projectService.listCalendarEvents({
                assignedUserId: assignedUserId || undefined,
                status: status || undefined,
                priority: priority || undefined,
            });

            setEvents(response);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'خطا در دریافت تقویم پروژه‌ها');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
        loadEvents();
    }, []);

    return (
        <DashboardLayout>
            <div className="space-y-6" dir="rtl">
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            تقویم پروژه‌ها
                        </h1>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            شروع پروژه، موعد تحویل پروژه، شروع وظیفه و موعد وظیفه را یک‌جا ببینید.
                        </p>
                    </div>

                    <button className="btn btn-outline" onClick={loadEvents}>
                        <ArrowPathIcon className="h-5 w-5" />
                        بروزرسانی
                    </button>
                </div>

                <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-900">
                    <div className="grid gap-3 lg:grid-cols-4">
                        <select
                            className="select select-bordered"
                            value={assignedUserId}
                            onChange={(event) => setAssignedUserId(event.target.value)}
                        >
                            <option value="">همه کاربران</option>
                            {users.map((user) => (
                                <option key={getUserId(user)} value={getUserId(user)}>
                                    {getUserDisplayName(user)}
                                </option>
                            ))}
                        </select>

                        <select
                            className="select select-bordered"
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

                            <optgroup label="وضعیت وظیفه">
                                {Object.entries(projectTaskStatusLabels).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </optgroup>
                        </select>

                        <select
                            className="select select-bordered"
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

                        <button className="btn btn-neutral" onClick={loadEvents}>
                            اعمال فیلتر
                        </button>
                    </div>
                </div>

                {error ? (
                    <div className="alert alert-error">
                        <span>{error}</span>
                    </div>
                ) : null}

                {loading ? (
                    <div className="flex justify-center py-20">
                        <span className="loading loading-spinner loading-lg" />
                    </div>
                ) : (
                    <ProjectCalendar events={events} />
                )}
            </div>
        </DashboardLayout>
    );
};

export const getServerSideProps = withAuth();

export default DashboardCalendarPage;