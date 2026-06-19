import { DashboardLayout } from '@/components/layouts';
import {
  ProjectTimelineFlow,
  TimelineFlowItem,
} from '@/components/projects/ProjectTimelineFlow';
import {
  getProjectRoleId,
  ProjectRole,
  projectService,
} from '@/services/project.service';
import { userService } from '@/services/user.service';
import {
  getFileId,
  getNoteId,
  getProjectId,
  getReferenceId,
  getTaskId,
  getUserDisplayName,
  isManagerUser,
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
import { AppUser } from '@/types/user';
import { withAuth } from '@/utils';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentArrowUpIcon,
  DocumentTextIcon,
  FlagIcon,
  MicrophoneIcon,
  PaperClipIcon,
  PencilSquareIcon,
  PlusIcon,
  SpeakerWaveIcon,
  StopCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

type TimelineItem = TimelineFlowItem;

type TaskFormState = {
  title: string;
  description: string;
  assigneeId: string;
  startDate: string;
  dueDate: string;
  priority: ProjectPriority;
  status: ProjectTaskStatus;
  files: File[];
};

type ProjectMemberReference = {
  userId?: any;
  roleId?: ProjectRole | string | null;
  roleInProject?: string | null;
  startedAt?: string | null;
  expectedFinishedAt?: string | null;
};

type ProjectMemberFormState = {
  roleId: string;
  roleInProject: string;
  startedAt: string;
  expectedFinishedAt: string;
};

type ProjectWithMembers = Project & {
  projectMembers?: ProjectMemberReference[];
  members?: ProjectMemberReference[];
};

const priorityOptions: ProjectPriority[] = ['low', 'medium', 'high', 'critical'];

const fileCategoryOptions = Object.keys(
  projectFileCategoryLabels,
) as ProjectFileCategory[];

const createEmptyTaskForm = (): TaskFormState => ({
  title: '',
  description: '',
  assigneeId: '',
  startDate: '',
  dueDate: '',
  priority: 'medium',
  status: 'todo',
  files: [],
});

const getProjectMembers = (project?: Project | null): ProjectMemberReference[] => {
  if (!project) return [];

  const projectWithMembers = project as ProjectWithMembers;

  if (projectWithMembers.projectMembers?.length) {
    return projectWithMembers.projectMembers;
  }

  if (projectWithMembers.members?.length) {
    return projectWithMembers.members;
  }

  return (project.assignedUserIds || []).map((user) => ({
    userId: user,
    roleInProject:
      getReferenceId(user) === getReferenceId(project.ownerId)
        ? 'مسئول پروژه'
        : 'عضو پروژه',
    startedAt: project.startDate || null,
    expectedFinishedAt: project.dueDate || null,
  }));
};

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

const toDateInput = (value?: string | null): string => {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  return date.toISOString().slice(0, 10);
};

const toDateKey = (value?: string | null): string => {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  return date.toISOString().slice(0, 10);
};

const isUserAssignedToTask = (task: ProjectTask, userId?: string): boolean => {
  if (!userId) return false;

  return Boolean(
    task.assignedUserIds?.some((user) => {
      return getReferenceId(user) === userId;
    }),
  );
};

const getBackendOrigin = (): string => {
  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1';

  return apiBaseUrl.replace(/\/api(?:\/v\d+)?\/?$/, '').replace(/\/$/, '');
};

const resolveFileUrl = (fileUrl: string): string => {
  if (!fileUrl) return '#';
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl;

  return `${getBackendOrigin()}${
    fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`
  }`;
};

const formatFileSize = (value?: number): string => {
  if (!value) return 'حجم نامشخص';

  if (value < 1024 * 1024) {
    return `${Math.ceil(value / 1024)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

const isAudioProjectFile = (file?: ProjectFile | null): boolean => {
  if (!file) return false;

  const fileType = String(file.fileType || '').toLowerCase();
  const fileName = String(file.originalName || file.fileName || '').toLowerCase();

  return (
    fileType.startsWith('audio/') ||
    fileType === 'video/webm' ||
    fileType === 'video/mp4' ||
    /\.(flac|mp3|mp4|mpeg|mpga|m4a|ogg|wav|webm)$/.test(fileName)
  );
};

const isAudioBrowserFile = (file?: File | null): boolean => {
  if (!file) return false;

  return (
    file.type.startsWith('audio/') ||
    file.type === 'video/webm' ||
    file.type === 'video/mp4' ||
    /\.(flac|mp3|mp4|mpeg|mpga|m4a|ogg|wav|webm)$/i.test(file.name)
  );
};

const getSupportedAudioMimeType = (): string => {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    return '';
  }

  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/mp4',
  ];

  return candidates.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) || '';
};

const getRecordedAudioExtension = (mimeType: string): string => {
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('mp4')) return 'm4a';

  return 'webm';
};

const buildRecordedAudioFile = (blob: Blob, prefix: string): File => {
  const mimeType = blob.type || 'audio/webm';
  const extension = getRecordedAudioExtension(mimeType);

  return new File([blob], `${prefix}-${Date.now()}.${extension}`, {
    type: mimeType,
  });
};

const renderFiles = (
  attachedFiles?: ProjectFile[],
  title = 'فایل‌های پیوست',
) => {
  if (!attachedFiles?.length) return null;

  return (
    <div className="mt-3 rounded-lg border border-primary/10 bg-primary/5 p-3">
      <div className="mb-2 text-xs font-bold text-primary">{title}</div>

      <div className="space-y-3">
        {attachedFiles.map((file) => {
          const fileUrl = resolveFileUrl(file.fileUrl);
          const isAudio = isAudioProjectFile(file);

          return (
            <div
              key={getFileId(file)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-900"
            >
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-3 transition hover:text-primary"
              >
                <span className="min-w-0 truncate font-medium text-gray-800 dark:text-gray-100">
                  {file.originalName}
                </span>

                <span className="shrink-0 text-gray-500">
                  {file.categoryLabel || projectFileCategoryLabels[file.category]} ·{' '}
                  {formatFileSize(file.fileSize)}
                </span>
              </a>

              {isAudio ? (
                <audio controls preload="none" src={fileUrl} className="mt-3 w-full" />
              ) : null}

              {file.transcriptionText ? (
                <div className="mt-3 rounded-lg bg-base-200/70 p-3 leading-6 text-base-content/75">
                  <div className="mb-1 flex items-center gap-1 font-bold text-primary">
                    <SpeakerWaveIcon className="h-4 w-4" />
                    متن تبدیل‌شده از صوت
                  </div>
                  {file.transcriptionText}
                </div>
              ) : file.transcriptionStatus === 'failed' ? (
                <div className="mt-3 rounded-lg bg-error/10 p-3 leading-6 text-error">
                  تبدیل صوت به متن انجام نشد: {file.transcriptionError || 'خطای نامشخص'}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const DashboardProjectDetailsPage = () => {
  const router = useRouter();
  const { data: session } = useSession();

  const projectId = typeof router.query.id === 'string' ? router.query.id : '';
  const currentUserId = session?.user?.id || '';
  const currentRole = String(session?.user?.role || '').toLowerCase();
  const canManageProject = currentRole === 'manager' || currentRole === 'admin';

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [notes, setNotes] = useState<ProjectProgressNote[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [managerUsers, setManagerUsers] = useState<AppUser[]>([]);
  const [projectRoles, setProjectRoles] = useState<ProjectRole[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [savingWorkLog, setSavingWorkLog] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  const [workNote, setWorkNote] = useState('');
  const [workAuthorId, setWorkAuthorId] = useState('');
  const [progressPercent, setProgressPercent] = useState('');
  const [workLogFile, setWorkLogFile] = useState<File | null>(null);

  const [editingTaskId, setEditingTaskId] = useState('');
  const [taskForm, setTaskForm] = useState<TaskFormState>(
    createEmptyTaskForm(),
  );

  const [editingMemberId, setEditingMemberId] = useState('');
  const [savingMember, setSavingMember] = useState(false);
  const [memberForm, setMemberForm] = useState<ProjectMemberFormState>({
    roleId: '',
    roleInProject: '',
    startedAt: '',
    expectedFinishedAt: '',
  });

  const [fileCategory, setFileCategory] = useState<ProjectFileCategory>('other');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const taskRecorderRef = useRef<MediaRecorder | null>(null);
  const workLogRecorderRef = useRef<MediaRecorder | null>(null);
  const [recordingTaskAudio, setRecordingTaskAudio] = useState(false);
  const [recordingWorkLogAudio, setRecordingWorkLogAudio] = useState(false);

  const visibleTasks = useMemo(() => {
    return tasks.filter((task) => task.status !== 'done');
  }, [tasks]);

  const openTasks = useMemo(() => {
    return visibleTasks.filter((task) => task.status !== 'cancelled');
  }, [visibleTasks]);

  const todayTasks = useMemo(() => {
    const today = toDateKey(new Date().toISOString());

    return visibleTasks.filter((task) => toDateKey(task.dueDate) === today);
  }, [visibleTasks]);

  const projectMembers = useMemo(() => getProjectMembers(project), [project]);

  const activeProjectRoles = useMemo(() => {
    return projectRoles.filter((role) => role.isActive !== false);
  }, [projectRoles]);

  const projectRoleMap = useMemo(() => {
    return new Map(activeProjectRoles.map((role) => [getProjectRoleId(role), role]));
  }, [activeProjectRoles]);

  const loadProjectWorkspace = async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      setError('');

      const [
        projectResponse,
        tasksResponse,
        notesResponse,
        filesResponse,
        managersResponse,
        projectRolesResponse,
      ] = await Promise.all([
        projectService.getProject(projectId),
        projectService.listTasks(projectId),
        projectService.listNotes(projectId),
        projectService.listFiles(projectId, { standaloneOnly: true }),
        userService.listUsers({ role: 'manager', isActive: true, limit: 100 }),
        projectService.listProjectRoles(false),
      ]);

      setProject(projectResponse);
      setTasks(tasksResponse || []);
      setNotes(notesResponse || []);
      setFiles(filesResponse || []);
      setManagerUsers(managersResponse || []);
      setProjectRoles(projectRolesResponse || []);
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

  const projectManagerOptions = useMemo(() => {
    if (managerUsers.length) return managerUsers;

    if (!project) return [];

    const projectUsers = [
      project.ownerId,
      ...(project.assignedUserIds || []),
    ].filter(Boolean);

    const uniqueManagers = new Map<string, any>();

    projectUsers.forEach((user) => {
      if (typeof user === 'string' || !isManagerUser(user)) return;

      const userId = getReferenceId(user);

      if (userId) {
        uniqueManagers.set(userId, user);
      }
    });

    return Array.from(uniqueManagers.values());
  }, [project, managerUsers]);

  useEffect(() => {
    if (!projectManagerOptions.length) return;

    const currentManager = projectManagerOptions.find((manager) => {
      return getReferenceId(manager) === currentUserId;
    });

    const defaultManagerId = getReferenceId(
      currentManager || projectManagerOptions[0],
    );

    if (!workAuthorId) {
      setWorkAuthorId(defaultManagerId);
    }

    if (!taskForm.assigneeId) {
      setTaskForm((previous) => ({
        ...previous,
        assigneeId: defaultManagerId,
      }));
    }
  }, [currentUserId, projectManagerOptions, taskForm.assigneeId, workAuthorId]);

  const timelineItems = useMemo<TimelineItem[]>(() => {
    if (!project) return [];

    const items: TimelineItem[] = [
      {
        id: `project-start-${getProjectId(project)}`,
        date: project.startDate,
        title: 'شروع پروژه',
        description: project.description || project.title,
        type: 'project_start',
        meta: [
          {
            label: 'عنوان پروژه',
            value: project.title,
          },
          {
            label: 'وضعیت پروژه',
            value: project.statusLabel || project.status || '—',
          },
          {
            label: 'اولویت پروژه',
            value:
              projectPriorityLabels[project.priority] || project.priority || '—',
          },
          {
            label: 'تاریخ شروع',
            value: formatDate(project.startDate),
          },
          {
            label: 'موعد تحویل',
            value: formatDate(project.dueDate),
          },
        ],
      },
    ];

    if (project.dueDate) {
      items.push({
        id: `project-due-${getProjectId(project)}`,
        date: project.dueDate,
        title: 'موعد تحویل پروژه',
        description: project.description || project.title,
        type: 'project_due',
        meta: [
          {
            label: 'عنوان پروژه',
            value: project.title,
          },
          {
            label: 'وضعیت پروژه',
            value: project.statusLabel || project.status || '—',
          },
          {
            label: 'اولویت پروژه',
            value:
              projectPriorityLabels[project.priority] || project.priority || '—',
          },
          {
            label: 'تاریخ شروع',
            value: formatDate(project.startDate),
          },
          {
            label: 'موعد تحویل',
            value: formatDate(project.dueDate),
          },
        ],
      });
    }

    tasks.forEach((task) => {
      const taskMeta = [
        {
          label: 'عنوان وظیفه',
          value: task.title,
        },
        {
          label: 'مسئول',
          value: task.assignedUserIds?.length
            ? task.assignedUserIds
                .map((user) => getUserDisplayName(user))
                .join('، ')
            : 'بدون مسئول مشخص',
        },
        {
          label: 'وضعیت',
          value: projectTaskStatusLabels[task.status] || task.status || '—',
        },
        {
          label: 'اولویت',
          value: projectPriorityLabels[task.priority] || task.priority || '—',
        },
        {
          label: 'تاریخ شروع',
          value: formatDate(task.startDate),
        },
        {
          label: 'موعد انجام',
          value: formatDate(task.dueDate),
        },
        {
          label: 'تعداد فایل',
          value: `${task.files?.length || task.attachmentCount || 0}`,
        },
      ];

      if (task.status !== 'done' && task.startDate) {
        items.push({
          id: `task-start-${getTaskId(task)}`,
          date: task.startDate,
          title: `شروع وظیفه: ${task.title}`,
          description: task.description || 'برای این وظیفه توضیحی ثبت نشده است.',
          type: 'task_start',
          statusLabel: projectTaskStatusLabels[task.status] || task.status,
          priorityLabel: projectPriorityLabels[task.priority] || task.priority,
          files: task.files || [],
          meta: taskMeta,
        });
      }

      if (task.status !== 'done' && task.dueDate) {
        items.push({
          id: `task-due-${getTaskId(task)}`,
          date: task.dueDate,
          title: `موعد وظیفه: ${task.title}`,
          description: task.description || 'برای این وظیفه توضیحی ثبت نشده است.',
          type: 'task_due',
          statusLabel: projectTaskStatusLabels[task.status] || task.status,
          priorityLabel: projectPriorityLabels[task.priority] || task.priority,
          files: task.files || [],
          meta: taskMeta,
        });
      }

      if (task.status === 'done' && task.completedAt) {
        items.push({
          id: `task-completed-${getTaskId(task)}`,
          date: task.completedAt,
          title: `تکمیل وظیفه: ${task.title}`,
          description:
            task.description ||
            'این وظیفه از پنل یا بات تلگرام تکمیل شده است.',
          type: 'task_completed',
          statusLabel: projectTaskStatusLabels[task.status] || task.status,
          priorityLabel: projectPriorityLabels[task.priority] || task.priority,
          files: task.files || [],
          meta: [
            ...taskMeta,
            {
              label: 'زمان تکمیل',
              value: formatDate(task.completedAt),
            },
          ],
        });
      }
    });

    notes.forEach((note) => {
      items.push({
        id: `note-${getNoteId(note)}`,
        date: note.createdAt,
        title: `کار انجام‌شده توسط ${getUserDisplayName(note.authorId)}`,
        description: note.note,
        type: 'work_report',
        progressPercent: note.progressPercent,
        files: note.files || [],
        meta: [
          {
            label: 'مدیر انجام‌دهنده',
            value: getUserDisplayName(note.authorId),
          },
          {
            label: 'ثبت‌شده توسط',
            value: getUserDisplayName(note.registeredById || note.authorId),
          },
          {
            label: 'تاریخ ثبت',
            value: formatDate(note.createdAt),
          },
          {
            label: 'درصد پیشرفت',
            value:
              note.progressPercent !== null && note.progressPercent !== undefined
                ? `${note.progressPercent}%`
                : 'ثبت نشده',
          },
          {
            label: 'تعداد فایل پیوست',
            value: `${note.files?.length || 0}`,
          },
          {
            label: 'منبع ثبت',
            value: note.source === 'telegram_bot' ? 'بات تلگرام' : 'پنل',
          },
        ],
      });
    });

    return items.sort((first, second) => {
      return new Date(first.date).getTime() - new Date(second.date).getTime();
    });
  }, [project, tasks, notes]);

  const startEditProjectMember = (member: ProjectMemberReference) => {
    const userId = getReferenceId(member.userId);

    if (!userId) return;

    setEditingMemberId(userId);
    setMemberForm({
      roleId:
        typeof member.roleId === 'string'
          ? member.roleId
          : getProjectRoleId(member.roleId),
      roleInProject: member.roleInProject || '',
      startedAt: toDateInput(member.startedAt),
      expectedFinishedAt: toDateInput(member.expectedFinishedAt),
    });
  };

  const cancelEditProjectMember = () => {
    setEditingMemberId('');
    setMemberForm({
      roleId: '',
      roleInProject: '',
      startedAt: '',
      expectedFinishedAt: '',
    });
  };

  const saveProjectMember = async (member: ProjectMemberReference) => {
    if (!project || !projectId) return;

    const memberUserId = getReferenceId(member.userId);

    if (!memberUserId) return;

    if (!memberForm.roleId) {
      setError('برای عضو پروژه باید یک نقش از صفحه نقش‌ها انتخاب شود.');
      return;
    }

    if (
      memberForm.startedAt &&
      memberForm.expectedFinishedAt &&
      new Date(memberForm.expectedFinishedAt) < new Date(memberForm.startedAt)
    ) {
      setError('تاریخ پایان احتمالی عضو پروژه نمی‌تواند قبل از تاریخ شروع او باشد.');
      return;
    }

    try {
      setSavingMember(true);
      setError('');

      const nextMembers = projectMembers.map((item) => {
        const itemUserId = getReferenceId(item.userId);

        if (itemUserId !== memberUserId) {
          return {
            userId: itemUserId,
            roleId:
              typeof item.roleId === 'string'
                ? item.roleId
                : getProjectRoleId(item.roleId) || null,
            roleInProject: item.roleInProject || 'عضو پروژه',
            startedAt: item.startedAt || project.startDate || null,
            expectedFinishedAt: item.expectedFinishedAt || project.dueDate || null,
          };
        }

        const selectedRole = projectRoleMap.get(memberForm.roleId);

        return {
          userId: itemUserId,
          roleId: memberForm.roleId,
          roleInProject: selectedRole?.title || memberForm.roleInProject.trim() || 'عضو پروژه',
          startedAt: memberForm.startedAt || null,
          expectedFinishedAt: memberForm.expectedFinishedAt || null,
        };
      });

      const updatedProject = await projectService.updateProject(projectId, {
        assignedUserIds: nextMembers.map((item) => item.userId).filter(Boolean),
        projectMembers: nextMembers,
      } as any);

      setProject(updatedProject);
      cancelEditProjectMember();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ویرایش عضو پروژه');
    } finally {
      setSavingMember(false);
    }
  };

  const resetTaskForm = () => {
    const currentAssigneeId = taskForm.assigneeId;

    setEditingTaskId('');
    setTaskForm({
      ...createEmptyTaskForm(),
      assigneeId: currentAssigneeId,
    });
  };

  const startEditTask = (task: ProjectTask) => {
    setEditingTaskId(getTaskId(task));
    setTaskForm({
      title: task.title || '',
      description: task.description || '',
      assigneeId: getReferenceId(task.assignedUserIds?.[0]),
      startDate: toDateInput(task.startDate),
      dueDate: toDateInput(task.dueDate),
      priority: task.priority || 'medium',
      status: task.status || 'todo',
      files: [],
    });
  };

  const startAudioRecording = async (target: 'task' | 'workLog') => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('مرورگر شما امکان ضبط صدا را پشتیبانی نمی‌کند.');
      return;
    }

    if (typeof MediaRecorder === 'undefined') {
      setError('مرورگر شما MediaRecorder را پشتیبانی نمی‌کند.');
      return;
    }

    try {
      setError('');

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: BlobPart[] = [];
      const mimeType = getSupportedAudioMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());

        const blob = new Blob(chunks, {
          type: recorder.mimeType || mimeType || 'audio/webm',
        });

        const audioFile = buildRecordedAudioFile(
          blob,
          target === 'task' ? 'task-audio' : 'project-report-audio',
        );

        if (target === 'task') {
          setTaskForm((previous) => ({
            ...previous,
            files: [...previous.files, audioFile],
          }));
        } else {
          setWorkLogFile(audioFile);
        }
      };

      if (target === 'task') {
        taskRecorderRef.current = recorder;
        setRecordingTaskAudio(true);
      } else {
        workLogRecorderRef.current = recorder;
        setRecordingWorkLogAudio(true);
      }

      recorder.start();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'اجازه دسترسی به میکروفون داده نشد یا ضبط صدا شروع نشد.',
      );
    }
  };

  const stopAudioRecording = (target: 'task' | 'workLog') => {
    const recorder =
      target === 'task' ? taskRecorderRef.current : workLogRecorderRef.current;

    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }

    if (target === 'task') {
      taskRecorderRef.current = null;
      setRecordingTaskAudio(false);
    } else {
      workLogRecorderRef.current = null;
      setRecordingWorkLogAudio(false);
    }
  };

  const handleSubmitTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!projectId || !taskForm.title.trim()) return;

    if (!taskForm.assigneeId) {
      setError('برای تعریف وظیفه، انتخاب مدیر مسئول الزامی است.');
      return;
    }

    try {
      setSavingTask(true);
      setError('');

      const payload = {
        title: taskForm.title.trim(),
        description: taskForm.description.trim(),
        assignedUserIds: [taskForm.assigneeId],
        status: taskForm.status,
        priority: taskForm.priority,
        startDate: taskForm.startDate || null,
        dueDate: taskForm.dueDate || null,
        files: taskForm.files,
      };

      if (editingTaskId) {
        await projectService.updateTask(projectId, editingTaskId, payload);
      } else {
        await projectService.createTask(projectId, payload);
      }

      resetTaskForm();

      await loadProjectWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ذخیره وظیفه');
    } finally {
      setSavingTask(false);
    }
  };

  const handleCreateWorkLog = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;

    const workLogHasAudio = isAudioBrowserFile(workLogFile);

    if (!projectId) return;

    if (!workNote.trim() && !workLogHasAudio) {
      setError('برای ثبت گزارش، متن گزارش یا فایل صوتی ضبط‌شده الزامی است.');
      return;
    }

    if (!workAuthorId) {
      setError('برای ثبت کار انجام‌شده، انتخاب مدیر انجام‌دهنده الزامی است.');
      return;
    }

    try {
      setSavingWorkLog(true);
      setError('');

      await projectService.createNote(projectId, {
        authorId: workAuthorId,
        note: workNote.trim(),
        progressPercent: progressPercent ? Number(progressPercent) : null,
        statusSnapshot: project?.status,
        file: workLogFile,
      });

      setWorkNote('');
      setProgressPercent('');
      setWorkLogFile(null);
      form.reset();

      await loadProjectWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ثبت گزارش کار');
    } finally {
      setSavingWorkLog(false);
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

      if (status === 'done') {
        await projectService.closeTask(projectId, getTaskId(task));
      } else {
        await projectService.updateTask(projectId, getTaskId(task), {
          title: task.title,
          description: task.description || '',
          assignedUserIds: task.assignedUserIds
            .map((user) => getReferenceId(user))
            .filter(Boolean),
          priority: task.priority,
          status,
          startDate: task.startDate,
          dueDate: task.dueDate,
        });
      }

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
            {projectId ? (
              <Link href={`/dashboard/projects/${projectId}/finance`} className="btn btn-primary">
                <BanknotesIcon className="h-5 w-5" />
                مالی پروژه
              </Link>
            ) : null}

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
                  وظایف باز
                </div>

                <div className="mt-2 text-3xl font-bold text-primary">
                  {openTasks.length}
                </div>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-900">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CheckCircleIcon className="h-5 w-5" />
                  وظایف امروز
                </div>

                <div className="mt-2 text-3xl font-bold text-success">
                  {todayTasks.length}
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-900">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    اعضای پروژه و نقش‌ها
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    نقش هر عضو، زمان شروع همکاری و پایان احتمالی از اینجا قابل مشاهده و ویرایش است.
                  </p>
                </div>

                <span className="badge badge-outline">{projectMembers.length} عضو</span>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                {projectMembers.length ? (
                  projectMembers.map((member) => {
                    const memberUserId = getReferenceId(member.userId);
                    const isEditing = editingMemberId === memberUserId;

                    return (
                      <div
                        key={memberUserId}
                        className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-bold text-gray-900 dark:text-gray-100">
                              {getUserDisplayName(member.userId)}
                            </div>
                            {!isEditing ? (
                              <div className="mt-1 text-sm font-semibold text-primary">
                                {member.roleInProject || 'عضو پروژه'}
                              </div>
                            ) : null}
                          </div>

                          {canManageProject && !isEditing ? (
                            <button
                              type="button"
                              className="btn btn-ghost btn-xs"
                              onClick={() => startEditProjectMember(member)}
                            >
                              <PencilSquareIcon className="h-4 w-4" />
                              ویرایش
                            </button>
                          ) : null}
                        </div>

                        {isEditing ? (
                          <div className="mt-4 space-y-3">
                            <select
                              className="select select-bordered w-full bg-white dark:bg-gray-900"
                              value={memberForm.roleId}
                              disabled={!activeProjectRoles.length}
                              onChange={(event) => {
                                const role = projectRoleMap.get(event.target.value);

                                setMemberForm((previous) => ({
                                  ...previous,
                                  roleId: event.target.value,
                                  roleInProject: role?.title || '',
                                }));
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
                              <Link
                                href="/dashboard/projects/roles"
                                className="inline-flex text-xs font-semibold text-primary hover:underline"
                              >
                                رفتن به صفحه تعریف نقش‌ها
                              </Link>
                            ) : null}

                            <div className="grid gap-2 sm:grid-cols-2">
                              <label className="form-control">
                                <span className="label label-text text-xs">شروع</span>
                                <input
                                  type="date"
                                  className="input input-bordered bg-white dark:bg-gray-900"
                                  value={memberForm.startedAt}
                                  onChange={(event) =>
                                    setMemberForm((previous) => ({
                                      ...previous,
                                      startedAt: event.target.value,
                                    }))
                                  }
                                />
                              </label>

                              <label className="form-control">
                                <span className="label label-text text-xs">پایان احتمالی</span>
                                <input
                                  type="date"
                                  className="input input-bordered bg-white dark:bg-gray-900"
                                  value={memberForm.expectedFinishedAt}
                                  onChange={(event) =>
                                    setMemberForm((previous) => ({
                                      ...previous,
                                      expectedFinishedAt: event.target.value,
                                    }))
                                  }
                                />
                              </label>
                            </div>

                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={cancelEditProjectMember}
                              >
                                انصراف
                              </button>
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                disabled={savingMember}
                                onClick={() => saveProjectMember(member)}
                              >
                                {savingMember ? 'در حال ذخیره...' : 'ذخیره'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-4 grid gap-2 text-xs text-gray-600 dark:text-gray-300">
                            <div className="rounded-xl bg-white px-3 py-2 dark:bg-gray-900">
                              شروع همکاری: {formatDate(member.startedAt)}
                            </div>
                            <div className="rounded-xl bg-white px-3 py-2 dark:bg-gray-900">
                              پایان احتمالی: {formatDate(member.expectedFinishedAt)}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
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
                  <div className="mb-5">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {editingTaskId
                        ? 'ویرایش وظیفه مدیر'
                        : 'تعریف وظیفه برای مدیران'}
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                      وظایف می‌توانند از پنل یا بات تلگرام ثبت شوند. فایل‌های
                      ارسال‌شده از تلگرام نیز به عنوان پیوست وظیفه نمایش داده
                      می‌شوند. وظایف تکمیل‌شده در لیست فعال نمایش داده نمی‌شوند،
                      اما در تایم‌لاین باقی می‌مانند.
                    </p>
                  </div>

                  <form
                    onSubmit={handleSubmitTask}
                    className="mb-6 rounded-2xl border border-dashed border-gray-300 p-4 dark:border-gray-700"
                  >
                    <div className="grid gap-3 lg:grid-cols-2">
                      <input
                        className="input input-bordered"
                        placeholder="عنوان وظیفه"
                        value={taskForm.title}
                        onChange={(event) =>
                          setTaskForm((previous) => ({
                            ...previous,
                            title: event.target.value,
                          }))
                        }
                        required
                      />

                      <select
                        className="select select-bordered"
                        value={taskForm.assigneeId}
                        onChange={(event) =>
                          setTaskForm((previous) => ({
                            ...previous,
                            assigneeId: event.target.value,
                          }))
                        }
                        required
                      >
                        <option value="">انتخاب مدیر مسئول</option>

                        {projectManagerOptions.map((manager) => (
                          <option
                            key={getReferenceId(manager)}
                            value={getReferenceId(manager)}
                          >
                            {getUserDisplayName(manager)}
                          </option>
                        ))}
                      </select>

                      <select
                        className="select select-bordered"
                        value={taskForm.priority}
                        onChange={(event) =>
                          setTaskForm((previous) => ({
                            ...previous,
                            priority: event.target.value as ProjectPriority,
                          }))
                        }
                      >
                        {priorityOptions.map((priority) => (
                          <option key={priority} value={priority}>
                            {projectPriorityLabels[priority]}
                          </option>
                        ))}
                      </select>

                      <select
                        className="select select-bordered"
                        value={taskForm.status}
                        onChange={(event) =>
                          setTaskForm((previous) => ({
                            ...previous,
                            status: event.target.value as ProjectTaskStatus,
                          }))
                        }
                      >
                        {Object.entries(projectTaskStatusLabels).map(
                          ([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ),
                        )}
                      </select>

                      <input
                        type="date"
                        className="input input-bordered"
                        value={taskForm.startDate}
                        onChange={(event) =>
                          setTaskForm((previous) => ({
                            ...previous,
                            startDate: event.target.value,
                          }))
                        }
                      />

                      <input
                        type="date"
                        className="input input-bordered"
                        value={taskForm.dueDate}
                        onChange={(event) =>
                          setTaskForm((previous) => ({
                            ...previous,
                            dueDate: event.target.value,
                          }))
                        }
                      />

                      <textarea
                        className="textarea textarea-bordered lg:col-span-2"
                        placeholder="توضیحات وظیفه"
                        value={taskForm.description}
                        onChange={(event) =>
                          setTaskForm((previous) => ({
                            ...previous,
                            description: event.target.value,
                          }))
                        }
                      />

                      <div className="lg:col-span-2">
                        <div className="flex flex-col gap-2 lg:flex-row">
                          <input
                            type="file"
                            multiple
                            className="file-input file-input-bordered w-full"
                            onChange={(event) =>
                              setTaskForm((previous) => ({
                                ...previous,
                                files: Array.from(event.target.files || []),
                              }))
                            }
                          />

                          {recordingTaskAudio ? (
                            <button
                              type="button"
                              className="btn btn-error shrink-0"
                              onClick={() => stopAudioRecording('task')}
                            >
                              <StopCircleIcon className="h-5 w-5" />
                              توقف ضبط
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-outline shrink-0"
                              onClick={() => startAudioRecording('task')}
                            >
                              <MicrophoneIcon className="h-5 w-5" />
                              ضبط صوت
                            </button>
                          )}
                        </div>

                        <div className="mt-2 text-xs leading-6 text-gray-500">
                          فایل‌های وظیفه می‌توانند از همین فرم، ضبط مستقیم صوت یا
                          بات تلگرام ثبت شوند. اگر فایل صوتی ارسال شود، سامانه
                          آن را با OpenAI به متن تبدیل و کنار پیوست ذخیره می‌کند.
                        </div>

                        {taskForm.files.length ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {taskForm.files.map((file) => (
                              <span
                                key={`${file.name}-${file.size}`}
                                className="badge badge-outline"
                              >
                                {file.name}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end gap-2">
                      {editingTaskId ? (
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={resetTaskForm}
                        >
                          <XMarkIcon className="h-5 w-5" />
                          انصراف
                        </button>
                      ) : null}

                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={savingTask || recordingTaskAudio}
                      >
                        <PlusIcon className="h-5 w-5" />
                        {savingTask
                          ? 'در حال ذخیره...'
                          : editingTaskId
                            ? 'ذخیره تغییرات'
                            : 'ثبت وظیفه برای مدیر'}
                      </button>
                    </div>
                  </form>

                  <div className="space-y-3">
                    {visibleTasks.length ? (
                      visibleTasks.map((task) => {
                        const canCloseTask = isUserAssignedToTask(
                          task,
                          currentUserId,
                        );

                        return (
                          <div
                            key={getTaskId(task)}
                            className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"
                          >
                            <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                              <div className="min-w-0 flex-1">
                                <div className="font-bold text-gray-900 dark:text-gray-100">
                                  {task.title}
                                </div>

                                <div className="mt-1 text-sm text-gray-500">
                                  {task.description || 'بدون توضیح'}
                                </div>

                                <div className="mt-2 text-xs text-primary">
                                  مسئول:{' '}
                                  {task.assignedUserIds?.length
                                    ? task.assignedUserIds
                                        .map((user) => getUserDisplayName(user))
                                        .join('، ')
                                    : 'بدون مسئول مشخص'}
                                </div>

                                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                  <span className="badge badge-outline">
                                    {projectTaskStatusLabels[task.status] ||
                                      task.status}
                                  </span>

                                  <span className="badge badge-outline">
                                    {projectPriorityLabels[task.priority] ||
                                      task.priority}
                                  </span>

                                  <span className="badge badge-ghost">
                                    شروع: {formatDate(task.startDate)}
                                  </span>

                                  <span className="badge badge-ghost">
                                    موعد: {formatDate(task.dueDate)}
                                  </span>

                                  {task.attachmentCount || task.files?.length ? (
                                    <span className="badge badge-primary gap-1">
                                      <PaperClipIcon className="h-3 w-3" />
                                      {task.attachmentCount ||
                                        task.files?.length}{' '}
                                      فایل
                                    </span>
                                  ) : null}
                                </div>

                                {renderFiles(task.files, 'فایل‌های پیوست وظیفه')}
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <button
                                  className="btn btn-xs btn-outline"
                                  onClick={() => startEditTask(task)}
                                >
                                  <PencilSquareIcon className="h-4 w-4" />
                                  ویرایش
                                </button>

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

                                {canCloseTask ? (
                                  <button
                                    className="btn btn-xs btn-success"
                                    onClick={() =>
                                      handleUpdateTaskStatus(task, 'done')
                                    }
                                  >
                                    بستن کار
                                  </button>
                                ) : (
                                  <span className="badge badge-ghost">
                                    فقط مدیر مسئول می‌تواند این کار را ببندد
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700">
                        وظیفه بازی برای این پروژه وجود ندارد.
                      </div>
                    )}
                  </div>
                </div>

                <ProjectTimelineFlow
                  items={timelineItems}
                  formatDate={formatDate}
                  resolveFileUrl={resolveFileUrl}
                  formatFileSize={formatFileSize}
                />
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
                    <select
                      className="select select-bordered w-full"
                      value={workAuthorId}
                      onChange={(event) => setWorkAuthorId(event.target.value)}
                      required
                    >
                      <option value="">انتخاب مدیر انجام‌دهنده کار</option>

                      {projectManagerOptions.map((manager) => (
                        <option
                          key={getReferenceId(manager)}
                          value={getReferenceId(manager)}
                        >
                          {getUserDisplayName(manager)}
                        </option>
                      ))}
                    </select>

                    <textarea
                      className="textarea textarea-bordered min-h-32 w-full"
                      placeholder="چه کاری روی این پروژه انجام شد؟ اگر صوت ضبط کنید، می‌توانید این بخش را خالی بگذارید."
                      value={workNote}
                      onChange={(event) => setWorkNote(event.target.value)}
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

                    <div className="space-y-2">
                      <div className="flex flex-col gap-2">
                        <input
                          type="file"
                          className="file-input file-input-bordered w-full"
                          onChange={(event) =>
                            setWorkLogFile(event.target.files?.[0] || null)
                          }
                        />

                        {recordingWorkLogAudio ? (
                          <button
                            type="button"
                            className="btn btn-error w-full"
                            onClick={() => stopAudioRecording('workLog')}
                          >
                            <StopCircleIcon className="h-5 w-5" />
                            توقف ضبط صوت
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-outline w-full"
                            onClick={() => startAudioRecording('workLog')}
                          >
                            <MicrophoneIcon className="h-5 w-5" />
                            ضبط صوت گزارش
                          </button>
                        )}
                      </div>

                      <div className="text-xs leading-6 text-gray-500">
                        اگر فقط صوت ضبط شود، متن گزارش پس از ارسال با OpenAI ساخته
                        و ذخیره می‌شود. اگر متن را هم بنویسید، متن دستی به عنوان
                        توضیح گزارش ذخیره می‌شود و متن تبدیل‌شده کنار فایل صوتی
                        نمایش داده می‌شود.
                      </div>

                      {workLogFile ? (
                        <div className="badge badge-outline max-w-full truncate">
                          {workLogFile.name}
                        </div>
                      ) : null}
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary w-full"
                      disabled={savingWorkLog || recordingWorkLogAudio}
                    >
                      {savingWorkLog ? 'در حال ثبت...' : 'ثبت کار انجام‌شده'}
                    </button>
                  </form>

                  <div className="mt-6 space-y-3">
                    {notes.slice(0, 5).map((note) => (
                      <div
                        key={getNoteId(note)}
                        className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800"
                      >
                        <div className="space-y-1 text-xs text-gray-500">
                          <div>
                            {formatDate(note.createdAt)} · انجام‌دهنده:{' '}
                            {getUserDisplayName(note.authorId)}
                          </div>

                          {note.registeredById &&
                          getReferenceId(note.registeredById) !==
                            getReferenceId(note.authorId) ? (
                            <div>
                              ثبت‌شده توسط:{' '}
                              {getUserDisplayName(note.registeredById)}
                            </div>
                          ) : null}
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

                        {renderFiles(note.files, 'فایل‌های پیوست گزارش')}
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
                      files.map((file) => {
                        const fileUrl = resolveFileUrl(file.fileUrl);
                        const isAudio = isAudioProjectFile(file);

                        return (
                          <div
                            key={getFileId(file)}
                            className="rounded-xl border border-gray-200 p-3 transition hover:border-primary dark:border-gray-800"
                          >
                            <a
                              href={fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="block"
                            >
                              <div className="font-medium text-gray-900 dark:text-gray-100">
                                {file.originalName}
                              </div>

                              <div className="mt-1 text-xs text-gray-500">
                                {file.categoryLabel ||
                                  projectFileCategoryLabels[file.category]}{' '}
                                · {getUserDisplayName(file.uploadedBy)}
                              </div>
                            </a>

                            {isAudio ? (
                              <audio
                                controls
                                preload="none"
                                src={fileUrl}
                                className="mt-3 w-full"
                              />
                            ) : null}

                            {file.transcriptionText ? (
                              <div className="mt-3 rounded-lg bg-primary/5 p-3 text-sm leading-7 text-gray-700 dark:text-gray-200">
                                <div className="mb-1 flex items-center gap-1 text-xs font-bold text-primary">
                                  <SpeakerWaveIcon className="h-4 w-4" />
                                  متن تبدیل‌شده از صوت
                                </div>
                                {file.transcriptionText}
                              </div>
                            ) : file.transcriptionStatus === 'failed' ? (
                              <div className="mt-3 rounded-lg bg-error/10 p-3 text-xs leading-6 text-error">
                                تبدیل صوت به متن انجام نشد: {file.transcriptionError || 'خطای نامشخص'}
                              </div>
                            ) : null}
                          </div>
                        );
                      })
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