import apiClient from '@/lib/axios';
import {
  ApiResponse,
  CalendarEvent,
  CreateProjectNotePayload,
  PaginationState,
  Project,
  ProjectFile,
  ProjectImportResult,
  ProjectListResponse,
  ProjectPayload,
  ProjectProgressNote,
  ProjectTask,
  ProjectTaskPayload,
} from '@/types/project';

type QueryParams = Record<string, string | number | boolean | undefined | null>;

const defaultPagination: PaginationState = {
  total: 0,
  page: 1,
  limit: 20,
  totalPages: 1,
};

const unwrapData = <T>(responseData: ApiResponse<T> | T): T => {
  if (
    responseData &&
    typeof responseData === 'object' &&
    'data' in responseData
  ) {
    return (responseData as ApiResponse<T>).data as T;
  }

  return responseData as T;
};

const unwrapMessage = (error: unknown, fallback: string): string => {
  const err = error as {
    response?: {
      data?: {
        message?: string;
      };
    };
    message?: string;
  };

  return err.response?.data?.message || err.message || fallback;
};

const normalizeListResponse = (
  responseData: ApiResponse<Project[]> | Project[] | ProjectListResponse,
): ProjectListResponse => {
  if (Array.isArray(responseData)) {
    return {
      items: responseData,
      pagination: defaultPagination,
    };
  }

  if ('items' in responseData && Array.isArray(responseData.items)) {
    return responseData as ProjectListResponse;
  }

  const apiResponse = responseData as ApiResponse<Project[]>;

  return {
    items: Array.isArray(apiResponse.data) ? apiResponse.data : [],
    pagination: apiResponse.pagination || defaultPagination,
  };
};

export const projectService = {
  async listProjects(params?: QueryParams): Promise<ProjectListResponse> {
    try {
      const response = await apiClient.get('/projects', { params });

      return normalizeListResponse(response.data);
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در دریافت پروژه‌ها'));
    }
  },

  async createProject(payload: ProjectPayload): Promise<Project> {
    try {
      const response = await apiClient.post('/projects', {
        ...payload,
        dueDate: payload.dueDate || null,
        assignedUserIds: payload.assignedUserIds || [],
      });

      return unwrapData<Project>(response.data);
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در ایجاد پروژه'));
    }
  },

  async importProjectsFromExcel(file: File): Promise<ProjectImportResult> {
    try {
      const formData = new FormData();

      formData.append('file', file);

      const response = await apiClient.post('/projects/import/excel', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return unwrapData<ProjectImportResult>(response.data);
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در ورود پروژه‌ها از اکسل'));
    }
  },

  async getProject(projectId: string): Promise<Project> {
    try {
      const response = await apiClient.get(`/projects/${projectId}`);

      return unwrapData<Project>(response.data);
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در دریافت پروژه'));
    }
  },

  async updateProject(
    projectId: string,
    payload: Partial<ProjectPayload>,
  ): Promise<Project> {
    try {
      const requestPayload: Partial<ProjectPayload> = { ...payload };

      if ('dueDate' in requestPayload) {
        requestPayload.dueDate = requestPayload.dueDate || null;
      }

      const response = await apiClient.patch(
        `/projects/${projectId}`,
        requestPayload,
      );

      return unwrapData<Project>(response.data);
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در ویرایش پروژه'));
    }
  },

  async deleteProject(projectId: string): Promise<void> {
    try {
      await apiClient.delete(`/projects/${projectId}`);
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در حذف پروژه'));
    }
  },

  async assignUsers(projectId: string, userIds: string[]): Promise<Project> {
    try {
      const response = await apiClient.post(`/projects/${projectId}/users`, {
        userIds,
      });

      return unwrapData<Project>(response.data);
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در تخصیص کاربران به پروژه'));
    }
  },

  async removeUser(projectId: string, userId: string): Promise<Project> {
    try {
      const response = await apiClient.delete(
        `/projects/${projectId}/users/${userId}`,
      );

      return unwrapData<Project>(response.data);
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در حذف کاربر از پروژه'));
    }
  },

  async listTasks(projectId: string): Promise<ProjectTask[]> {
    try {
      const response = await apiClient.get(`/projects/${projectId}/tasks`);

      return unwrapData<ProjectTask[]>(response.data) || [];
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در دریافت وظایف پروژه'));
    }
  },

  async createTask(
    projectId: string,
    payload: ProjectTaskPayload,
  ): Promise<ProjectTask> {
    try {
      const response = await apiClient.post(`/projects/${projectId}/tasks`, {
        ...payload,
        startDate: payload.startDate || null,
        dueDate: payload.dueDate || null,
        assignedUserIds: payload.assignedUserIds || [],
      });

      return unwrapData<ProjectTask>(response.data);
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در ایجاد وظیفه'));
    }
  },

  async updateTask(
    projectId: string,
    taskId: string,
    payload: Partial<ProjectTaskPayload>,
  ): Promise<ProjectTask> {
    try {
      const requestPayload: Partial<ProjectTaskPayload> = { ...payload };

      if ('startDate' in requestPayload) {
        requestPayload.startDate = requestPayload.startDate || null;
      }

      if ('dueDate' in requestPayload) {
        requestPayload.dueDate = requestPayload.dueDate || null;
      }

      const response = await apiClient.patch(
        `/projects/${projectId}/tasks/${taskId}`,
        requestPayload,
      );

      return unwrapData<ProjectTask>(response.data);
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در ویرایش وظیفه'));
    }
  },

  async deleteTask(projectId: string, taskId: string): Promise<void> {
    try {
      await apiClient.delete(`/projects/${projectId}/tasks/${taskId}`);
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در حذف وظیفه'));
    }
  },

  async listNotes(projectId: string): Promise<ProjectProgressNote[]> {
    try {
      const response = await apiClient.get(`/projects/${projectId}/notes`);

      return unwrapData<ProjectProgressNote[]>(response.data) || [];
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در دریافت یادداشت‌های پروژه'));
    }
  },

  async createNote(
    projectId: string,
    payload: CreateProjectNotePayload,
  ): Promise<ProjectProgressNote> {
    try {
      const response = await apiClient.post(
        `/projects/${projectId}/notes`,
        payload,
      );

      return unwrapData<ProjectProgressNote>(response.data);
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در ثبت یادداشت پروژه'));
    }
  },

  async listFiles(projectId: string): Promise<ProjectFile[]> {
    try {
      const response = await apiClient.get(`/projects/${projectId}/files`);

      return unwrapData<ProjectFile[]>(response.data) || [];
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در دریافت فایل‌های پروژه'));
    }
  },

  async uploadFile(
    projectId: string,
    payload: {
      file: File;
      category: string;
    },
  ): Promise<ProjectFile> {
    try {
      const formData = new FormData();

      formData.append('file', payload.file);
      formData.append('category', payload.category || 'other');

      const response = await apiClient.post(
        `/projects/${projectId}/files`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );

      return unwrapData<ProjectFile>(response.data);
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در آپلود فایل پروژه'));
    }
  },

  async deleteFile(projectId: string, fileId: string): Promise<void> {
    try {
      await apiClient.delete(`/projects/${projectId}/files/${fileId}`);
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در حذف فایل پروژه'));
    }
  },

  async listCalendarEvents(params?: QueryParams): Promise<CalendarEvent[]> {
    try {
      const response = await apiClient.get('/projects/calendar/events', {
        params,
      });

      return unwrapData<CalendarEvent[]>(response.data) || [];
    } catch (error) {
      throw new Error(unwrapMessage(error, 'خطا در دریافت تقویم پروژه‌ها'));
    }
  },
};