export type UserRole = 'board' | 'manager' | 'expert';

export type UserStatus = 'active' | 'inactive' | 'suspended';

export enum UserPermission {
  USERS_READ = 'users.read',
  USERS_CREATE = 'users.create',
  USERS_UPDATE = 'users.update',
  USERS_DEACTIVATE = 'users.deactivate',
  USERS_DELETE = 'users.delete',

  ROLES_MANAGE = 'roles.manage',

  PROJECTS_READ = 'projects.read',
  PROJECTS_CREATE = 'projects.create',
  PROJECTS_UPDATE = 'projects.update',
  PROJECTS_MANAGE = 'projects.manage',

  REPORTS_READ = 'reports.read',
  REPORTS_CREATE = 'reports.create',
  REPORTS_REVIEW = 'reports.review',

  CONTRACTS_READ = 'contracts.read',
  CONTRACTS_CREATE = 'contracts.create',
  CONTRACTS_UPDATE = 'contracts.update',
  CONTRACTS_MANAGE = 'contracts.manage',

  EVIDENCE_READ = 'evidence.read',
  EVIDENCE_CREATE = 'evidence.create',
  EVIDENCE_REVIEW = 'evidence.review',

  RISKS_READ = 'risks.read',
  RISKS_CREATE = 'risks.create',
  RISKS_UPDATE = 'risks.update',
  RISKS_MANAGE = 'risks.manage',

  DECISIONS_READ = 'decisions.read',
  DECISIONS_APPROVE = 'decisions.approve',

  ADMIN_OVERVIEW = 'admin.overview',
}

export type UserProfile = {
  jobTitle?: string;
  domain?: string;
  specialtyChapter?: string;
  responsibilityScope?: string;
  bio?: string;
};

export type AppUser = {
  id?: string;
  _id?: string;

  firstName: string;
  lastName: string;
  fullName: string;

  username: string;
  email: string;
  phone?: string;

  role: UserRole | string;
  roleLabel?: string;

  status: UserStatus | string;
  statusLabel?: string;
  isActive: boolean;

  profile: UserProfile;

  managerId?: string | AppUser | null;

  telegramUserId?: string;
  telegramChatId?: string;
  telegramUsername?: string;

  language?: 'fa';
  direction?: 'rtl';

  lastLoginAt?: string | null;

  createdAt: string;
  updatedAt: string;
};

export type UserPayload = {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone?: string;
  password?: string;
  role: UserRole;
  status: UserStatus;
  profile: UserProfile;
  managerId?: string | null;

  telegramUserId?: string;
  telegramChatId?: string;
  telegramUsername?: string;
};

export type UserListResponse = {
  items: AppUser[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export const userRoleLabels: Record<UserRole, string> = {
  board: 'هیئت مدیره',
  manager: 'مدیر',
  expert: 'کارشناس',
};

export const userStatusLabels: Record<UserStatus, string> = {
  active: 'فعال',
  inactive: 'غیرفعال',
  suspended: 'تعلیق‌شده',
};

export const userRoleOptions: Array<{
  value: UserRole;
  label: string;
  description: string;
}> = [
  {
    value: 'board',
    label: userRoleLabels.board,
    description: 'دسترسی راهبردی و نظارتی؛ فقط مشاهده، بدون ثبت یا تغییر داده.',
  },
  {
    value: 'manager',
    label: userRoleLabels.manager,
    description: 'دسترسی مدیریتی و اجرایی؛ امکان ایجاد، ویرایش، بررسی و مدیریت.',
  },
  {
    value: 'expert',
    label: userRoleLabels.expert,
    description: 'دسترسی اجرایی محدود؛ ثبت گزارش، شواهد و پیگیری وظایف خود.',
  },
];

export const userStatusOptions: Array<{
  value: UserStatus;
  label: string;
}> = [
  {
    value: 'active',
    label: userStatusLabels.active,
  },
  {
    value: 'inactive',
    label: userStatusLabels.inactive,
  },
  {
    value: 'suspended',
    label: userStatusLabels.suspended,
  },
];

export const ROLE_ACCESS_LEVEL: Record<UserRole, number> = {
  board: 100,
  manager: 70,
  expert: 10,
};

export const ACCESS_LEVEL_LABELS = [
  {
    value: 100,
    role: 'board' as UserRole,
    label: 'هیئت مدیره',
    description: 'دسترسی راهبردی و نظارتی؛ فقط مشاهده، بدون ثبت یا تغییر داده.',
  },
  {
    value: 70,
    role: 'manager' as UserRole,
    label: 'مدیر',
    description: 'دسترسی مدیریتی و اجرایی؛ امکان ایجاد، ویرایش، بررسی و مدیریت.',
  },
  {
    value: 10,
    role: 'expert' as UserRole,
    label: 'کارشناس',
    description: 'دسترسی اجرایی محدود؛ ثبت گزارش، شواهد و پیگیری وظایف خود.',
  },
];

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, UserPermission[]> = {
  board: [
    UserPermission.USERS_READ,
    UserPermission.PROJECTS_READ,
    UserPermission.REPORTS_READ,
    UserPermission.CONTRACTS_READ,
    UserPermission.EVIDENCE_READ,
    UserPermission.RISKS_READ,
    UserPermission.DECISIONS_READ,
    UserPermission.ADMIN_OVERVIEW,
  ],

  manager: [
    UserPermission.USERS_READ,
    UserPermission.USERS_CREATE,
    UserPermission.USERS_UPDATE,
    UserPermission.USERS_DEACTIVATE,
    UserPermission.ROLES_MANAGE,

    UserPermission.PROJECTS_READ,
    UserPermission.PROJECTS_CREATE,
    UserPermission.PROJECTS_UPDATE,
    UserPermission.PROJECTS_MANAGE,

    UserPermission.REPORTS_READ,
    UserPermission.REPORTS_CREATE,
    UserPermission.REPORTS_REVIEW,

    UserPermission.CONTRACTS_READ,
    UserPermission.CONTRACTS_CREATE,
    UserPermission.CONTRACTS_UPDATE,
    UserPermission.CONTRACTS_MANAGE,

    UserPermission.EVIDENCE_READ,
    UserPermission.EVIDENCE_CREATE,
    UserPermission.EVIDENCE_REVIEW,

    UserPermission.RISKS_READ,
    UserPermission.RISKS_CREATE,
    UserPermission.RISKS_UPDATE,
    UserPermission.RISKS_MANAGE,

    UserPermission.DECISIONS_READ,
    UserPermission.DECISIONS_APPROVE,

    UserPermission.ADMIN_OVERVIEW,
  ],

  expert: [
    UserPermission.PROJECTS_READ,
    UserPermission.REPORTS_CREATE,
    UserPermission.EVIDENCE_CREATE,
    UserPermission.RISKS_READ,
    UserPermission.RISKS_CREATE,
  ],
};

export const getUserId = (user: AppUser): string => {
  return user.id || user._id || '';
};

export const getUserDisplayName = (user?: Partial<AppUser> | null): string => {
  if (!user) return 'کاربر نامشخص';

  return (
    user.fullName ||
    [user.firstName, user.lastName].filter(Boolean).join(' ') ||
    user.username ||
    user.email ||
    'کاربر نامشخص'
  );
};

export const normalizeUserRole = (role?: string | null): UserRole => {
  const normalized = String(role || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');

  if (normalized === 'board') return 'board';
  if (normalized === 'manager') return 'manager';
  if (normalized === 'expert') return 'expert';

  /**
   * Backward compatibility with old frontend/backend values.
   */
  if (normalized === 'employee') return 'expert';
  if (normalized === 'admin') return 'manager';
  if (normalized === 'super_admin') return 'manager';
  if (normalized === 'project_owner') return 'manager';
  if (normalized === 'specialty_owner') return 'manager';

  return 'expert';
};

export const normalizeUserStatus = (status?: string | null): UserStatus => {
  const normalized = String(status || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');

  if (normalized === 'inactive') return 'inactive';
  if (normalized === 'suspended') return 'suspended';

  return 'active';
};

export const getUserRoleLabel = (role?: string | null): string => {
  return userRoleLabels[normalizeUserRole(role)];
};

export const getUserStatusLabel = (status?: string | null): string => {
  return userStatusLabels[normalizeUserStatus(status)];
};

export const isBoardRole = (role?: string | null): boolean => {
  return normalizeUserRole(role) === 'board';
};

export const isManagerRole = (role?: string | null): boolean => {
  return normalizeUserRole(role) === 'manager';
};

export const isExpertRole = (role?: string | null): boolean => {
  return normalizeUserRole(role) === 'expert';
};

export const canBeAssignedAsManager = (role?: string | null): boolean => {
  return normalizeUserRole(role) === 'manager';
};

export const canHaveManager = (role?: string | null): boolean => {
  return normalizeUserRole(role) === 'expert';
};

export const getRoleAccessLevel = (role?: string | null): number => {
  return ROLE_ACCESS_LEVEL[normalizeUserRole(role)];
};

export const hasPermission = (
  role: string | UserRole | undefined | null,
  permission: UserPermission,
): boolean => {
  const normalizedRole = normalizeUserRole(role);

  return DEFAULT_ROLE_PERMISSIONS[normalizedRole]?.includes(permission) || false;
};

export const hasAnyPermission = (
  role: string | UserRole | undefined | null,
  permissions: UserPermission[],
): boolean => {
  return permissions.some((permission) => hasPermission(role, permission));
};

export const hasTelegramLink = (user?: Partial<AppUser> | null): boolean => {
  return Boolean(user?.telegramUserId || user?.telegramChatId);
};