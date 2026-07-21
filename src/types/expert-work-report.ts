import type { ExpertWorkLog, ExpertWorkLogProject } from './expert-work-log';
import type { PaginationState, UserSummary } from './project';

export type ExpertWorkReportSummary = {
  totalEntries: number;
  totalDurationMinutes: number;
  averageProgressPercent: number;
  expertCount: number;
  projectCount: number;
  activeDayCount: number;
  blockerEntries: number;
  deliverableEntries: number;
  lastWorkDate?: string | null;
};

export type ExpertWorkReportDailyTrend = {
  date: string;
  entryCount: number;
  totalDurationMinutes: number;
  averageProgressPercent: number;
  expertCount: number;
};

export type ExpertWorkReportProjectDistribution = {
  projectId: string;
  project?: ExpertWorkLogProject | null;
  entryCount: number;
  totalDurationMinutes: number;
  averageProgressPercent: number;
  lastWorkDate?: string | null;
};

export type ExpertPerformanceRow = {
  expertId: string;
  expert?: UserSummary | null;
  totalEntries: number;
  totalDurationMinutes: number;
  averageProgressPercent: number;
  projectCount: number;
  activeDayCount: number;
  blockerEntries: number;
  deliverableEntries: number;
  lastWorkDate?: string | null;
  latestTitle?: string;
};

export type ExpertWorkReportFilters = {
  projectId?: string;
  expertId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
};

export type ExpertWorkReportOverview = {
  summary: ExpertWorkReportSummary;
  experts: ExpertPerformanceRow[];
  dailyTrend: ExpertWorkReportDailyTrend[];
  projectDistribution: ExpertWorkReportProjectDistribution[];
  filters: {
    projects: ExpertWorkLogProject[];
    experts: UserSummary[];
  };
  pagination: PaginationState;
};

export type ExpertWorkReportExplanation = {
  topProject?: ExpertWorkReportProjectDistribution | null;
  averageMinutesPerEntry: number;
  blockerRatePercent: number;
  deliverableRatePercent: number;
};

export type ExpertWorkReportDetails = {
  expert: UserSummary;
  summary: ExpertWorkReportSummary;
  explanation: ExpertWorkReportExplanation;
  dailyTrend: ExpertWorkReportDailyTrend[];
  projectDistribution: ExpertWorkReportProjectDistribution[];
  entries: ExpertWorkLog[];
  pagination: PaginationState;
};

export type ExpertActivityLevel = 'champion' | 'high' | 'steady' | 'low' | 'inactive';

export type ExpertLeaderboardPeriod = {
  dateFrom: string;
  dateTo: string;
  previousDateFrom: string;
  previousDateTo: string;
  dayCount: number;
};

export type ExpertLeaderboardScoring = {
  activeDaysWeight: number;
  durationWeight: number;
  entriesWeight: number;
  deliverablesWeight: number;
  progressWeight: number;
  note: string;
};

export type ExpertLeaderboardRow = {
  expertId: string;
  expert: UserSummary;
  rank: number;
  previousRank: number | null;
  rankChange: number | null;
  activityScore: number;
  level: ExpertActivityLevel;
  totalEntries: number;
  totalDurationMinutes: number;
  activeDayCount: number;
  projectCount: number;
  averageProgressPercent: number;
  deliverableEntries: number;
  deliverableRatePercent: number;
  blockerEntries: number;
  lastWorkDate?: string | null;
  lastActivityAt?: string | null;
  inactiveDays: number | null;
};

export type ExpertLeaderboard = {
  period: ExpertLeaderboardPeriod;
  scoring: ExpertLeaderboardScoring;
  summary: {
    expertCount: number;
    activeExpertCount: number;
    inactiveExpertCount: number;
    averageScore: number;
    totalDurationMinutes: number;
    totalEntries: number;
  };
  mostActive: ExpertLeaderboardRow | null;
  leastActive: ExpertLeaderboardRow | null;
  rows: ExpertLeaderboardRow[];
};

export type ExpertLeaderboardFilters = {
  dateFrom?: string;
  dateTo?: string;
  search?: string;
};
