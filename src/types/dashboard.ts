import type { UserSummary } from './project';

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


export type DashboardExpertActivityRow = {
    expertId: string;
    expert: UserSummary;
    rank: number;
    previousRank: number | null;
    rankChange: number | null;
    activityScore: number;
    totalEntries: number;
    totalDurationMinutes: number;
    activeDayCount: number;
    projectCount: number;
    deliverableRatePercent: number;
    averageProgressPercent: number;
    lastWorkDate?: string | null;
    lastActivityAt?: string | null;
    inactiveDays: number | null;
};

export type DashboardExpertActivity = {
    period: { dateFrom: string; dateTo: string; dayCount: number };
    mostActive: DashboardExpertActivityRow | null;
    leastActive: DashboardExpertActivityRow | null;
    activeExpertCount: number;
    inactiveExpertCount: number;
};

export type DashboardExpertLeave = {
    id: string;
    expertId: string;
    expert: UserSummary;
    leaveType: string;
    leaveTypeLabel: string;
    durationType: string;
    durationTypeLabel: string;
    startsAt: string;
    endsAt: string;
    startTime: string;
    endTime: string;
    halfDayPeriod?: string | null;
    reason: string;
    handoverNotes: string;
    isActiveNow: boolean;
};

export type DashboardExpertLeaves = {
    todayCount: number;
    activeNowCount: number;
    today: DashboardExpertLeave[];
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
    expertActivity: DashboardExpertActivity | null;
    expertLeaves: DashboardExpertLeaves | null;
};

export type DashboardApiResponse = {
    success?: boolean;
    message?: string;
    data?: DashboardSummary;
};
