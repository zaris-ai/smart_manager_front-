export type UserRole = 'manager' | 'employee';

export type UserStatus = 'active' | 'inactive' | 'suspended';

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
  manager: 'مدیر',
  employee: 'کارمند',
};

export const userStatusLabels: Record<UserStatus, string> = {
  active: 'فعال',
  inactive: 'غیرفعال',
  suspended: 'تعلیق‌شده',
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

export const isManagerRole = (role?: string | null): boolean => {
  const normalized = String(role || '').toLowerCase();

  return normalized === 'manager' || normalized === 'admin';
};

export const isEmployeeRole = (role?: string | null): boolean => {
  return String(role || '').toLowerCase() === 'employee';
};

export const normalizeUserRole = (role?: string | null): UserRole => {
  return isManagerRole(role) ? 'manager' : 'employee';
};

export const normalizeUserStatus = (status?: string | null): UserStatus => {
  if (status === 'inactive' || status === 'suspended') return status;

  return 'active';
};

export const hasTelegramLink = (user?: Partial<AppUser> | null): boolean => {
  return Boolean(user?.telegramUserId || user?.telegramChatId);
};