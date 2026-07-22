import type { ElementType } from 'react';
import {
  BanknotesIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentCheckIcon,
  ClipboardDocumentListIcon,
  CpuChipIcon,
  DocumentChartBarIcon,
  DocumentPlusIcon,
  HomeIcon,
  IdentificationIcon,
  PaperAirplaneIcon,
  PresentationChartBarIcon,
  RectangleGroupIcon,
  TrophyIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';

export type MenuSection =
  | 'workspace'
  | 'projects'
  | 'reports'
  | 'people'
  | 'tools'
  | 'expert'
  | 'personal';

export interface MenuItem {
  label: string;
  href?: string;
  icon: ElementType;
  badge?: number;
  section: MenuSection;
  priority: number;
  allowedRoles?: string[];
  activeMatch?: 'exact' | 'prefix';
}

export const menuSectionLabels: Record<MenuSection, string> = {
  workspace: 'شروع و کارهای روزانه',
  projects: 'مدیریت پروژه‌ها',
  reports: 'گزارش و پایش',
  people: 'تیم و منابع انسانی',
  tools: 'ابزارهای مدیریتی',
  expert: 'فضای کاری کارشناس',
  personal: 'درخواست‌ها و ارتباطات',
};

const ADMIN_ROLES = ['manager', 'board', 'admin', 'super_admin', 'project_owner'];
const EXPERT_ROLES = ['expert', 'employee'];

/**
 * Items are intentionally ordered by operational importance for each role.
 * SidebarMenu preserves this order inside each section.
 */
export const menuItems: MenuItem[] = [
  // Manager: primary daily workspace
  {
    label: 'داشبورد مدیریت',
    href: '/dashboard',
    icon: HomeIcon,
    section: 'workspace',
    priority: 10,
    allowedRoles: ADMIN_ROLES,
  },
  {
    label: 'پروژه‌ها',
    href: '/dashboard/projects',
    icon: ClipboardDocumentListIcon,
    section: 'projects',
    priority: 20,
    allowedRoles: ADMIN_ROLES,
  },
  {
    label: 'تقویم پروژه‌ها',
    href: '/dashboard/calendar',
    icon: CalendarDaysIcon,
    section: 'projects',
    priority: 30,
    allowedRoles: ADMIN_ROLES,
  },

  // Manager: monitoring and decision-making
  {
    label: 'نمای کلان پروژه‌ها',
    href: '/dashboard/project-overview',
    icon: PresentationChartBarIcon,
    section: 'reports',
    priority: 40,
    allowedRoles: ADMIN_ROLES,
  },
  {
    label: 'نمودارهای مدیریتی',
    href: '/dashboard/project-charts',
    icon: RectangleGroupIcon,
    section: 'reports',
    priority: 50,
    allowedRoles: ADMIN_ROLES,
  },
  {
    label: 'شرح مالی پروژه‌ها',
    href: '/dashboard/project-finance',
    icon: BanknotesIcon,
    section: 'reports',
    priority: 60,
    allowedRoles: ADMIN_ROLES,
  },
  {
    label: 'گزارش عملکرد کارشناسان',
    href: '/dashboard/expert-work-reports',
    icon: DocumentChartBarIcon,
    section: 'reports',
    priority: 70,
    allowedRoles: ADMIN_ROLES,
  },
  {
    label: 'رتبه‌بندی کارشناسان',
    href: '/dashboard/expert-leaderboard',
    icon: TrophyIcon,
    section: 'reports',
    priority: 80,
    allowedRoles: ADMIN_ROLES,
  },

  // Expert: primary daily workspace
  {
    label: 'ثبت و پیگیری گزارش کار',
    href: '/dashboard/expert-work-logs',
    icon: ClipboardDocumentCheckIcon,
    section: 'expert',
    priority: 10,
    allowedRoles: EXPERT_ROLES,
  },
  {
    label: 'لیگ رقابتی کارشناسان',
    href: '/dashboard/expert-competition',
    icon: TrophyIcon,
    section: 'expert',
    priority: 20,
    allowedRoles: EXPERT_ROLES,
  },

  // Shared personal actions
  {
    label: 'ثبت درخواست مرخصی',
    href: '/dashboard/leave-requests/new',
    icon: DocumentPlusIcon,
    section: 'personal',
    priority: 90,
    allowedRoles: EXPERT_ROLES,
    activeMatch: 'exact',
  },
  {
    label: 'درخواست‌های مرخصی من',
    href: '/dashboard/leave-requests',
    icon: CalendarDaysIcon,
    section: 'personal',
    priority: 100,
    allowedRoles: EXPERT_ROLES,
    activeMatch: 'exact',
  },
  {
    label: 'بررسی مرخصی کارشناسان',
    href: '/dashboard/leave-requests',
    icon: CalendarDaysIcon,
    section: 'people',
    priority: 115,
    allowedRoles: ADMIN_ROLES,
    activeMatch: 'exact',
  },
  {
    label: 'انتقادات و پیشنهادهای من',
    href: '/dashboard/feedback',
    icon: ChatBubbleLeftRightIcon,
    section: 'personal',
    priority: 110,
    allowedRoles: EXPERT_ROLES,
  },
  {
    label: 'بررسی انتقادات و پیشنهادها',
    href: '/dashboard/feedback',
    icon: ChatBubbleLeftRightIcon,
    section: 'people',
    priority: 118,
    allowedRoles: ADMIN_ROLES,
  },

  // Manager: people and access management
  {
    label: 'کاربران',
    href: '/dashboard/users',
    icon: UsersIcon,
    section: 'people',
    priority: 120,
    allowedRoles: ADMIN_ROLES,
  },
  {
    label: 'نقش‌های پروژه',
    href: '/dashboard/roles',
    icon: IdentificationIcon,
    section: 'people',
    priority: 130,
    allowedRoles: ADMIN_ROLES,
  },

  // Manager: supporting tools
  {
    label: 'ربات تلگرام',
    href: '/dashboard/telegram',
    icon: PaperAirplaneIcon,
    section: 'tools',
    priority: 140,
    allowedRoles: ADMIN_ROLES,
  },
  {
    label: 'تحلیل هوشمند پروژه',
    href: '/dashboard/repository-analysis',
    icon: CpuChipIcon,
    section: 'tools',
    priority: 150,
    allowedRoles: ADMIN_ROLES,
  },
];
