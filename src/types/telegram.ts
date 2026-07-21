export type TelegramBotIdentity = {
  id: number;
  is_bot: boolean;
  first_name: string;
  username?: string;
  can_join_groups?: boolean;
  can_read_all_group_messages?: boolean;
  supports_inline_queries?: boolean;
};

export type TelegramWebhookInfo = {
  url: string;
  has_custom_certificate?: boolean;
  pending_update_count?: number;
  ip_address?: string;
  last_error_date?: number;
  last_error_message?: string;
  last_synchronization_error_date?: number;
  max_connections?: number;
  allowed_updates?: string[];
};

export type TelegramOverview = {
  configuration: {
    tokenConfigured: boolean;
    secretConfigured: boolean;
    publicUrlConfigured: boolean;
    transcriptionConfigured: boolean;
    dailyAlertEnabled: boolean;
    dailyAlertTime: string;
    dailyAlertTimezone: string;
  };
  bot: TelegramBotIdentity | null;
  webhook: TelegramWebhookInfo | null;
  apiError?: string;
  counts: {
    activeUsers: number;
    linkedUsers: number;
    unlinkedUsers: number;
    activeReportSessions: number;
    activeTaskSessions: number;
    activeFeatureSessions: number;
    telegramWorkLogs: number;
    telegramLeaveRequests: number;
    telegramFeedback: number;
    telegramTasks: number;
    telegramReports: number;
    telegramFiles: number;
    openTasks: number;
    overdueTasks: number;
    staffingPending: number;
    activeProjects: number;
  };
  commands: Array<{
    command: string;
    description: string;
  }>;
  activity: Array<{
    id: string;
    type: 'task' | 'report';
    title: string;
    projectTitle: string;
    actorName: string;
    createdAt: string;
  }>;
};

export type TelegramLinkedUser = {
  id: string;
  _id?: string;
  firstName?: string;
  lastName?: string;
  fullName: string;
  username: string;
  email: string;
  role: string;
  roleLabel?: string;
  status: string;
  statusLabel?: string;
  isActive: boolean;
  telegramUserId?: string;
  telegramChatId?: string;
  telegramUsername?: string;
  linked: boolean;
  updatedAt: string;
};

export type TelegramUserListResponse = {
  items: TelegramLinkedUser[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export type TelegramLinkCode = {
  userId: string;
  userName: string;
  code: string;
  command: string;
  startParameter: string;
  expiresAt: string;
  expiresInMinutes: number;
  alreadyLinked: boolean;
};
