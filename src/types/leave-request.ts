import type { AppUser } from './user';

export type LeaveRequestType =
  | 'annual'
  | 'sick'
  | 'hourly'
  | 'unpaid'
  | 'marriage'
  | 'bereavement'
  | 'maternity'
  | 'paternity'
  | 'other';

export type LeaveDurationType = 'full_day' | 'half_day' | 'hourly';
export type LeaveHalfDayPeriod = 'morning' | 'afternoon';
export type LeaveRequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export type LeaveRequest = {
  id: string;
  _id?: string;
  requesterId: AppUser | string;
  leaveType: LeaveRequestType;
  leaveTypeLabel: string;
  durationType: LeaveDurationType;
  durationTypeLabel: string;
  startDate: string;
  endDate: string;
  startsAt: string;
  endsAt: string;
  halfDayPeriod?: LeaveHalfDayPeriod | null;
  startTime?: string;
  endTime?: string;
  durationMinutes: number;
  durationDays: number;
  reason: string;
  handoverNotes: string;
  emergencyContact: string;
  status: LeaveRequestStatus;
  statusLabel: string;
  reviewerId?: AppUser | string | null;
  reviewedAt?: string | null;
  reviewNote: string;
  cancelledAt?: string | null;
  cancelledBy?: AppUser | string | null;
  createdAt: string;
  updatedAt: string;
};

export type LeaveRequestPayload = {
  leaveType: LeaveRequestType;
  durationType: LeaveDurationType;
  startDate: string;
  endDate: string;
  halfDayPeriod?: LeaveHalfDayPeriod | null;
  startTime?: string;
  endTime?: string;
  reason: string;
  handoverNotes?: string;
  emergencyContact?: string;
};

export type LeaveRequestOption = { value: string; label: string };

export type LeaveRequestOptions = {
  leaveTypes: LeaveRequestOption[];
  durationTypes: LeaveRequestOption[];
  halfDayPeriods: LeaveRequestOption[];
  statuses: LeaveRequestOption[];
  permissions: {
    canSubmit: boolean;
    canReview: boolean;
  };
};

export type LeaveRequestSummary = {
  mine: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    cancelled: number;
    approvedDurationMinutes: number;
  };
  review: {
    pendingCount: number;
    pendingDurationMinutes: number;
  };
  permissions: {
    canReview: boolean;
  };
};

export type LeaveRequestFilters = {
  status?: string;
  leaveType?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  requesterId?: string;
  page?: number;
  limit?: number;
};

export type LeavePagination = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  prevPage: number | null;
  nextPage: number | null;
};

export type LeaveRequestListResult = {
  items: LeaveRequest[];
  pagination: LeavePagination;
};

export const leaveTypeLabels: Record<LeaveRequestType, string> = {
  annual: 'مرخصی استحقاقی',
  sick: 'مرخصی استعلاجی',
  hourly: 'مرخصی ساعتی',
  unpaid: 'مرخصی بدون حقوق',
  marriage: 'مرخصی ازدواج',
  bereavement: 'مرخصی فوت بستگان',
  maternity: 'مرخصی زایمان',
  paternity: 'مرخصی پدری',
  other: 'سایر',
};

export const durationTypeLabels: Record<LeaveDurationType, string> = {
  full_day: 'روز کامل',
  half_day: 'نیم‌روز',
  hourly: 'ساعتی',
};

export const leaveStatusLabels: Record<LeaveRequestStatus, string> = {
  pending: 'در انتظار بررسی',
  approved: 'تأیید شده',
  rejected: 'رد شده',
  cancelled: 'لغو شده',
};

export const getLeaveEntityId = (value?: { id?: string; _id?: string } | string | null) =>
  typeof value === 'string' ? value : String(value?.id || value?._id || '');
