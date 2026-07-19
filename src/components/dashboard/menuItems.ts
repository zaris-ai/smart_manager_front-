// src/components/dashboard/menuItems.ts

import type { ElementType } from 'react';
import {
  CalendarDaysIcon,
  ClipboardDocumentListIcon,
  HomeIcon,
  IdentificationIcon,
  PresentationChartBarIcon,
  PaperAirplaneIcon,
  RectangleGroupIcon,
  UsersIcon,
  CpuChipIcon,
} from '@heroicons/react/24/outline';

export interface MenuItem {
  label: string;
  href?: string;
  icon: ElementType;
  badge?: number;
  section?: 'main' | 'users' | 'projects';
  allowedRoles?: string[];
}

export const menuItems: MenuItem[] = [
  {
    label: 'داشبورد',
    href: '/dashboard',
    icon: HomeIcon,
    section: 'main',
  },
  {
    label: 'نمای کلان پروژه‌ها',
    href: '/dashboard/project-overview',
    icon: PresentationChartBarIcon,
    section: 'projects',
  },
  {
    label: 'نمودارهای مدیریتی',
    href: '/dashboard/project-charts',
    icon: RectangleGroupIcon,
    section: 'projects',
  },
  {
    label: 'پروژه‌ها',
    href: '/dashboard/projects',
    icon: ClipboardDocumentListIcon,
    section: 'projects',
  },
  {
    label: 'نقش‌های پروژه',
    href: '/dashboard/roles',
    icon: IdentificationIcon,
    section: 'projects',
  },
  {
    label: 'تقویم پروژه‌ها',
    href: '/dashboard/calendar',
    icon: CalendarDaysIcon,
    section: 'projects',
  },
  {
    label: 'ربات تلگرام',
    href: '/dashboard/telegram',
    icon: PaperAirplaneIcon,
    section: 'users',
    allowedRoles: ['manager', 'admin', 'super_admin', 'project_owner'],
  },
  {
    label: 'تحلیل هوشمند پروژه',
    href: '/dashboard/repository-analysis',
    icon: CpuChipIcon,
    section: 'projects',
  },
  {
    label: 'کاربران',
    href: '/dashboard/users',
    icon: UsersIcon,
    section: 'users',
  },
];