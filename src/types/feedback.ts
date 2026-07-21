import type { AppUser } from './user';

export type FeedbackType = 'criticism' | 'suggestion';
export type FeedbackScope = 'general' | 'project' | 'process' | 'system' | 'team' | 'other';
export type FeedbackStatus = 'new' | 'under_review' | 'responded' | 'closed' | 'withdrawn';

export interface FeedbackItem {
  id: string;
  _id?: string;
  submitterId: AppUser | string;
  type: FeedbackType;
  typeLabel: string;
  scope: FeedbackScope;
  scopeLabel: string;
  title: string;
  description: string;
  proposedSolution?: string;
  isAnonymous: boolean;
  status: FeedbackStatus;
  statusLabel: string;
  reviewerId?: AppUser | string | null;
  reviewedAt?: string | null;
  managerResponse?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackPayload {
  type: FeedbackType;
  scope: FeedbackScope;
  title: string;
  description: string;
  proposedSolution?: string;
  isAnonymous?: boolean;
}

export interface FeedbackOption<T extends string = string> {
  value: T;
  label: string;
}

export interface FeedbackOptions {
  types: FeedbackOption<FeedbackType>[];
  scopes: FeedbackOption<FeedbackScope>[];
  statuses: FeedbackOption<FeedbackStatus>[];
  permissions: { canSubmit: boolean; canReview: boolean };
}

export interface FeedbackFilters {
  type?: string;
  scope?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface FeedbackPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  prevPage: number | null;
  nextPage: number | null;
}

export interface FeedbackListResult {
  items: FeedbackItem[];
  pagination: FeedbackPagination;
}

export interface FeedbackSummary {
  mine: { total: number; new: number; underReview: number; responded: number; closed: number };
  inbox: { total: number; criticisms: number; suggestions: number };
  permissions: { canReview: boolean };
}
