import { DashboardLayout } from '@/components/layouts';
import { projectService } from '@/services/project.service';
import {
    getFileId,
    getNoteId,
    getProjectId,
    getReferenceId,
    getTaskId,
    getUserDisplayName,
    Project,
    projectFileCategoryLabels,
    ProjectFile,
    ProjectFileCategory,
    projectPriorityLabels,
    ProjectPriority,
    ProjectProgressNote,
    ProjectTask,
    projectTaskStatusLabels,
    ProjectTaskStatus,
} from '@/types/project';
import { withAuth } from '@/utils';
import {
    ArrowLeftIcon,
    ArrowPathIcon,
    CalendarDaysIcon,
    CheckCircleIcon,
    ClockIcon,
    DocumentArrowUpIcon,
    DocumentTextIcon,
    FlagIcon,
    PlusIcon,
} from '@heroicons/react/24/outline';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FormEvent, useEffect, useMemo, useState } from 'react';

type TimelineItem = {
    id: string;
    date: string;
    title: string;
    description?: string;
    badge: string;
};

const priorityOptions: ProjectPriority[] = ['low', 'medium', 'high', 'critical'];
const fileCategoryOptions = Object.keys(
    projectFileCategoryLabels,
) as ProjectFileCategory[];

const formatDate = (value?: string | null): string => {
    if (!value) return '—';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '—';

    return new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }).format(date);
};

const toDateKey = (value?: string | null): string => {
    if (!value) return '';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '';

    return date.toISOString().slice(0, 10);
};

const getBackendOrigin = (): string => {
    const apiBaseUrl =
        process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1';

    return apiBaseUrl.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
};

const resolveFileUrl = (fileUrl: string): string => {
    if (!fileUrl) return '#';
    if (/^https?:\/\//i.test(fileUrl)) return fileUrl;

    return `${getBackendOrigin()}${fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`}`;
};

const DashboardProjectDetailsPage = () => {
    const router = useRouter();
    const { data: session } = useSession();

    const projectId = typeof router.query.id === 'string' ? router.query.id : '';
    const currentUserId = session?.user?.id || '';

    const [project, setProject] = useState<Project | null>(null);
    const [tasks, setTasks] = useState<ProjectTask[]>([]);
    const [notes, setNotes] = useState<ProjectProgressNote[]>([]);
    const [files, setFiles] = useState<ProjectFile[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [savingWorkLog, setSavingWorkLog] = useState(false);
    const [savingTask, setSavingTask] = useState(false);
    const [uploadingFile, setUploadingFile] = useState(false);

    const [workNote, setWorkNote] = useState('');
    const [progressPercent, setProgressPercent] = useState('');

    const [nextTaskTitle, setNextTaskTitle] = useState('');
    const [nextTaskDescription, setNextTaskDescription] = useState('');
    const [nextTaskStartDate, setNextTaskStartDate] = useState('');
    const [nextTaskDueDate, setNextTaskDueDate] = useState('');
    const [nextTaskPriority, setNextTaskPriority] =
        useState<ProjectPriority>('medium');

    const [fileCategory, setFileCategory] = useState<ProjectFileCategory>('other');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const loadProjectWorkspace = async () => {
        if (!projectId) return;

        try {
            setLoading(true);
            setError('');

            const [projectResponse, tasksResponse, notesResponse, filesResponse] =
                await Promise.all([
                    projectService.getProject(projectId),
                    projectService.listTasks(projectId),
                    projectService.listNotes(projectId),
                    projectService.listFiles(projectId),
                ]);

            setProject(projectResponse);
            setTasks(tasksResponse);
            setNotes(notesResponse);
            setFiles(filesResponse);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : 'خطا در دریافت اطلاعات پروژه',
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!router.isReady) return;

        loadProjectWorkspace();
    }, [router.isReady, projectId]);

    const timelineItems = useMemo<TimelineItem[]>(() => {
        if (!project) return [];

        const items: TimelineItem[] = [
            {
                id: `project-start-${getProjectId(project)}`,
                date: project.startDate,
                title: 'شروع پروژه',
                description: project.title,
                badge: 'badge-info',
            },
        ];

        if (project.dueDate) {
            items.push({
                id: `project-due-${getProjectId(project)}`,
                date: project.dueDate,
                title: 'موعد تحویل پروژه',
                description: project.title,
                badge: 'badge-warning',
            });
        }

        tasks.forEach((task) => {
            if (task.startDate) {
                items.push({
                    id: `task-start-${getTaskId(task)}`,
                    date: task.startDate,
                    title: 'شروع وظیفه',
                    description: task.title,
                    badge: 'badge-success',
                });
            }

            if (task.dueDate) {
                items.push({
                    id: `task-due-${getTaskId(task)}`,
                    date: task.dueDate,
                    title: 'موعد وظیفه',
                    description: task.title,
                    badge: 'badge-error',
                });
            }
        });

        notes.forEach((note) => {
            items.push({
                id: `note-${getNoteId(note)}`,
                date: note.createdAt,
                title: 'گزارش کار ثبت شد',
                description: note.note,
                badge: 'badge-primary',
            });
        });

        return items.sort((first, second) => {
            return new Date(first.date).getTime() - new Date(second.date).getTime();
        });
    }, [project, tasks, notes]);

    const openTasks = useMemo(() => {
        return tasks.filter((task) => !['done', 'cancelled'].includes(task.status));
    }, [tasks]);

    const todayTasks = useMemo(() => {
        const today = toDateKey(new Date().toISOString());

        return tasks.filter((task) => toDateKey(task.dueDate) === today);
    }, [tasks]);

    const handleCreateWorkLog = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!projectId || !workNote.trim()) return;

        try {
            setSavingWorkLog(true);
            setError('');

            await projectService.createNote(projectId, {
                note: workNote.trim(),
                progressPercent: progressPercent ? Number(progressPercent) : null,
                statusSnapshot: project?.status,
            });

            setWorkNote('');
            setProgressPercent('');
            await loadProjectWorkspace();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'خطا در ثبت گزارش کار');
        } finally {
            setSavingWorkLog(false);
        }
    };

    const handleCreateNextTask = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!projectId || !nextTaskTitle.trim()) return;

        try {
            setSavingTask(true);
            setError('');

            await projectService.createTask(projectId, {
                title: nextTaskTitle.trim(),
                description: nextTaskDescription.trim(),
                assignedUserIds: currentUserId ? [currentUserId] : [],
                status: 'todo',
                priority: nextTaskPriority,
                startDate: nextTaskStartDate || null,
                dueDate: nextTaskDueDate || null,
            });

            setNextTaskTitle('');
            setNextTaskDescription('');
            setNextTaskStartDate('');
            setNextTaskDueDate('');
            setNextTaskPriority('medium');
            await loadProjectWorkspace();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'خطا در ثبت کار بعدی');
        } finally {
            setSavingTask(false);
        }
    };

    const handleUploadFile = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const form = event.currentTarget;

        if (!projectId || !selectedFile) return;

        try {
            setUploadingFile(true);
            setError('');

            await projectService.uploadFile(projectId, {
                file: selectedFile,
                category: fileCategory,
            });

            setSelectedFile(null);
            setFileCategory('other');
            form.reset();

            await loadProjectWorkspace();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'خطا در آپلود فایل');
        } finally {
            setUploadingFile(false);
        }
    };

    const handleUpdateTaskStatus = async (
        task: ProjectTask,
        status: ProjectTaskStatus,
    ) => {
        if (!projectId) return;

        try {
            setError('');
            await projectService.updateTask(projectId, getTaskId(task), { status });
            await loadProjectWorkspace();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'خطا در تغییر وضعیت وظیفه');
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex justify-center py-24" dir="rtl">
                    <span className="loading loading-spinner loading-lg" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6" dir="rtl">
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                    <div>
                        <Link
                            href="/dashboard/projects"
                            className="mb-3 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary"
                        >
                            <ArrowLeftIcon className="h-4 w-4" />
                            بازگشت به پروژه‌ها
                        </Link>

                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            {project?.title || 'پروژه'}
                        </h1>
                        <p className="mt-1 max-w-3xl text-sm text-gray-500 dark:text-gray-400">
                            {project?.description || 'برای این پروژه توضیحی ثبت نشده است.'}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Link href="/dashboard/calendar" className="btn btn-outline">
                            <CalendarDaysIcon className="h-5 w-5" />
                            مشاهده در تقویم
                        </Link>

                        <button className="btn btn-ghost" onClick={loadProjectWorkspace}>
                            <ArrowPathIcon className="h-5 w-5" />
                            بروزرسانی
                        </button>
                    </div>
                </div>

                {error ? (
                    <div className="alert alert-error">
                        <span>{error}</span>
                    </div>
                ) : null}

                {project ? (
                    <>
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-900">
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <ClockIcon className="h-5 w-5" />
                                    شروع پروژه
                                </div>
                                <div className="mt-2 text-lg font-bold text-gray-900 dark:text-gray-100">
                                    {formatDate(project.startDate)}
                                </div>
                            </div>

                            <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-900">
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <CalendarDaysIcon className="h-5 w-5" />
                                    موعد تحویل
                                </div>
                                <div className="mt-2 text-lg font-bold text-gray-900 dark:text-gray-100">
                                    {formatDate(project.dueDate)}
                                </div>
                            </div>

                            <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-900">
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <FlagIcon className="h-5 w-5" />
                                    کارهای باز
                                </div>
                                <div className="mt-2 text-3xl font-bold text-primary">
                                    {openTasks.length}
                                </div>
                            </div>

                            <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-900">
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <CheckCircleIcon className="h-5 w-5" />
                                    کارهای امروز
                                </div>
                                <div className="mt-2 text-3xl font-bold text-success">
                                    {todayTasks.length}
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-900">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                اعضای پروژه
                            </h2>
                            <div className="mt-4 flex flex-wrap gap-2">
                                {project.assignedUserIds.length ? (
                                    project.assignedUserIds.map((user) => (
                                        <span key={getReferenceId(user)} className="badge badge-outline">
                                            {getUserDisplayName(user)}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-sm text-gray-500">
                                        هنوز کاربری به پروژه تخصیص داده نشده است.
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="grid gap-6 xl:grid-cols-3">
                            <div className="space-y-6 xl:col-span-2">
                                <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-900">
                                    <div className="mb-5 flex items-center justify-between gap-3">
                                        <div>
                                            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                                کارهای بعدی پروژه
                                            </h2>
                                            <p className="mt-1 text-sm text-gray-500">
                                                هر کاری که موعد داشته باشد به صورت خودکار در تقویم نمایش داده می‌شود.
                                            </p>
                                        </div>
                                    </div>

                                    <form
                                        onSubmit={handleCreateNextTask}
                                        className="mb-6 rounded-2xl border border-dashed border-gray-300 p-4 dark:border-gray-700"
                                    >
                                        <div className="grid gap-3 lg:grid-cols-2">
                                            <input
                                                className="input input-bordered"
                                                placeholder="عنوان کار بعدی"
                                                value={nextTaskTitle}
                                                onChange={(event) => setNextTaskTitle(event.target.value)}
                                                required
                                            />

                                            <select
                                                className="select select-bordered"
                                                value={nextTaskPriority}
                                                onChange={(event) =>
                                                    setNextTaskPriority(event.target.value as ProjectPriority)
                                                }
                                            >
                                                {priorityOptions.map((priority) => (
                                                    <option key={priority} value={priority}>
                                                        {projectPriorityLabels[priority]}
                                                    </option>
                                                ))}
                                            </select>

                                            <input
                                                type="date"
                                                className="input input-bordered"
                                                value={nextTaskStartDate}
                                                onChange={(event) =>
                                                    setNextTaskStartDate(event.target.value)
                                                }
                                            />

                                            <input
                                                type="date"
                                                className="input input-bordered"
                                                value={nextTaskDueDate}
                                                onChange={(event) => setNextTaskDueDate(event.target.value)}
                                            />

                                            <textarea
                                                className="textarea textarea-bordered lg:col-span-2"
                                                placeholder="توضیح کوتاه درباره کار بعدی"
                                                value={nextTaskDescription}
                                                onChange={(event) =>
                                                    setNextTaskDescription(event.target.value)
                                                }
                                            />
                                        </div>

                                        <div className="mt-4 flex justify-end">
                                            <button
                                                type="submit"
                                                className="btn btn-primary"
                                                disabled={savingTask}
                                            >
                                                <PlusIcon className="h-5 w-5" />
                                                {savingTask ? 'در حال ثبت...' : 'ثبت کار بعدی'}
                                            </button>
                                        </div>
                                    </form>

                                    <div className="space-y-3">
                                        {tasks.length ? (
                                            tasks.map((task) => (
                                                <div
                                                    key={getTaskId(task)}
                                                    className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"
                                                >
                                                    <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                                                        <div>
                                                            <div className="font-bold text-gray-900 dark:text-gray-100">
                                                                {task.title}
                                                            </div>
                                                            <div className="mt-1 text-sm text-gray-500">
                                                                {task.description || 'بدون توضیح'}
                                                            </div>
                                                            <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                                                <span className="badge badge-outline">
                                                                    {projectTaskStatusLabels[task.status] || task.status}
                                                                </span>
                                                                <span className="badge badge-outline">
                                                                    {projectPriorityLabels[task.priority] || task.priority}
                                                                </span>
                                                                <span className="badge badge-ghost">
                                                                    شروع: {formatDate(task.startDate)}
                                                                </span>
                                                                <span className="badge badge-ghost">
                                                                    موعد: {formatDate(task.dueDate)}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-wrap gap-2">
                                                            {task.status !== 'in_progress' ? (
                                                                <button
                                                                    className="btn btn-xs btn-outline"
                                                                    onClick={() =>
                                                                        handleUpdateTaskStatus(task, 'in_progress')
                                                                    }
                                                                >
                                                                    شروع
                                                                </button>
                                                            ) : null}

                                                            {task.status !== 'done' ? (
                                                                <button
                                                                    className="btn btn-xs btn-success"
                                                                    onClick={() => handleUpdateTaskStatus(task, 'done')}
                                                                >
                                                                    انجام شد
                                                                </button>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700">
                                                هنوز کاری برای این پروژه ثبت نشده است.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-900">
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                        تایم‌لاین پروژه
                                    </h2>
                                    <p className="mt-1 text-sm text-gray-500">
                                        شروع پروژه، موعدها، کارها و گزارش‌های ثبت‌شده در یک مسیر زمانی نمایش داده می‌شوند.
                                    </p>

                                    <div className="mt-6 space-y-4">
                                        {timelineItems.map((item) => (
                                            <div key={item.id} className="flex gap-3">
                                                <div className="flex flex-col items-center">
                                                    <span className={`badge badge-sm ${item.badge}`} />
                                                    <span className="mt-1 h-full w-px bg-gray-200 dark:bg-gray-700" />
                                                </div>
                                                <div className="pb-4">
                                                    <div className="text-xs text-gray-500">
                                                        {formatDate(item.date)}
                                                    </div>
                                                    <div className="mt-1 font-bold text-gray-900 dark:text-gray-100">
                                                        {item.title}
                                                    </div>
                                                    {item.description ? (
                                                        <div className="mt-1 line-clamp-2 text-sm text-gray-500">
                                                            {item.description}
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-900">
                                    <div className="mb-4 flex items-center gap-2">
                                        <DocumentTextIcon className="h-5 w-5 text-primary" />
                                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                            ثبت کار انجام‌شده
                                        </h2>
                                    </div>

                                    <form onSubmit={handleCreateWorkLog} className="space-y-4">
                                        <textarea
                                            className="textarea textarea-bordered min-h-32 w-full"
                                            placeholder="امروز چه کاری روی این پروژه انجام شد؟"
                                            value={workNote}
                                            onChange={(event) => setWorkNote(event.target.value)}
                                            required
                                        />

                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            className="input input-bordered w-full"
                                            placeholder="درصد پیشرفت اختیاری، مثلاً ۴۰"
                                            value={progressPercent}
                                            onChange={(event) => setProgressPercent(event.target.value)}
                                        />

                                        <button
                                            type="submit"
                                            className="btn btn-primary w-full"
                                            disabled={savingWorkLog}
                                        >
                                            {savingWorkLog ? 'در حال ثبت...' : 'ثبت گزارش کار'}
                                        </button>
                                    </form>

                                    <div className="mt-6 space-y-3">
                                        {notes.slice(0, 5).map((note) => (
                                            <div
                                                key={getNoteId(note)}
                                                className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800"
                                            >
                                                <div className="text-xs text-gray-500">
                                                    {formatDate(note.createdAt)} · {getUserDisplayName(note.authorId)}
                                                </div>
                                                <div className="mt-1 text-sm text-gray-700 dark:text-gray-200">
                                                    {note.note}
                                                </div>
                                                {note.progressPercent !== null &&
                                                    note.progressPercent !== undefined ? (
                                                    <div className="mt-2 text-xs text-primary">
                                                        پیشرفت: {note.progressPercent}%
                                                    </div>
                                                ) : null}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-900">
                                    <div className="mb-4 flex items-center gap-2">
                                        <DocumentArrowUpIcon className="h-5 w-5 text-primary" />
                                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                            فایل‌های پروژه
                                        </h2>
                                    </div>

                                    <form onSubmit={handleUploadFile} className="space-y-4">
                                        <input
                                            type="file"
                                            className="file-input file-input-bordered w-full"
                                            onChange={(event) =>
                                                setSelectedFile(event.target.files?.[0] || null)
                                            }
                                        />

                                        <select
                                            className="select select-bordered w-full"
                                            value={fileCategory}
                                            onChange={(event) =>
                                                setFileCategory(event.target.value as ProjectFileCategory)
                                            }
                                        >
                                            {fileCategoryOptions.map((category) => (
                                                <option key={category} value={category}>
                                                    {projectFileCategoryLabels[category]}
                                                </option>
                                            ))}
                                        </select>

                                        <button
                                            type="submit"
                                            className="btn btn-outline w-full"
                                            disabled={uploadingFile || !selectedFile}
                                        >
                                            {uploadingFile ? 'در حال آپلود...' : 'آپلود فایل'}
                                        </button>
                                    </form>

                                    <div className="mt-6 space-y-3">
                                        {files.length ? (
                                            files.map((file) => (
                                                <a
                                                    key={getFileId(file)}
                                                    href={resolveFileUrl(file.fileUrl)}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="block rounded-xl border border-gray-200 p-3 transition hover:border-primary dark:border-gray-800"
                                                >
                                                    <div className="font-medium text-gray-900 dark:text-gray-100">
                                                        {file.originalName}
                                                    </div>
                                                    <div className="mt-1 text-xs text-gray-500">
                                                        {file.categoryLabel || projectFileCategoryLabels[file.category]} · {getUserDisplayName(file.uploadedBy)}
                                                    </div>
                                                </a>
                                            ))
                                        ) : (
                                            <div className="rounded-xl border border-dashed border-gray-300 p-5 text-center text-sm text-gray-500 dark:border-gray-700">
                                                هنوز فایلی برای پروژه ثبت نشده است.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="rounded-2xl bg-white p-8 text-center shadow-sm dark:bg-gray-900">
                        پروژه پیدا نشد یا به آن دسترسی ندارید.
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export const getServerSideProps = withAuth();

export default DashboardProjectDetailsPage;