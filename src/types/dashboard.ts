export type DashboardScope = 'manager' | 'employee';

export type DashboardCountItem = {
    key: string;
    label: string;
    count: number;
};

export type DashboardTrendItem = {
    date: string;
    label: string;
    workLogs: number;
    completedTasks: number;
};

export type DashboardRecentActivityFile = {
    id: string;
    originalName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
    categoryLabel: string;
};

export type DashboardRecentActivity = {
    id: string;
    type: 'project' | 'task' | 'note' | 'file';
    title: string;
    description: string;
    date: string;
    projectId?: string;
    files?: DashboardRecentActivityFile[];
};

export type DashboardSummary = {
    generatedAt: string;
    scope: DashboardScope;
    stats: {
        totalUsers: number;
        activeUsers: number;
        totalProjects: number;
        activeProjects: number;
        completedProjects: number;
        openTasks: number;
        dueTodayTasks: number;
        overdueTasks: number;
        completedTasks: number;
        workLogsToday: number;
        workLogsYesterday: number;
        uploadedFiles: number;
        completionRate: number;
    };
    projectStatus: DashboardCountItem[];
    projectPriority: DashboardCountItem[];
    taskStatus: DashboardCountItem[];
    workTrend: DashboardTrendItem[];
    recentActivities: DashboardRecentActivity[];
};

export type DashboardApiResponse = {
    success?: boolean;
    message?: string;
    data?: DashboardSummary;
};