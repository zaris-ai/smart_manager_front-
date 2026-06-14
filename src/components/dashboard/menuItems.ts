import {
  CalendarDaysIcon,
  ClipboardDocumentListIcon,
  HomeIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';

export interface MenuItem {
  label: string;
  href?: string;
  icon: React.ElementType;
  badge?: number;
  section?: 'main' | 'users' | 'projects';
}

export const menuItems: MenuItem[] = [
  {
    label: 'داشبورد',
    href: '/dashboard',
    icon: HomeIcon,
    section: 'main',
  },
  {
    label: 'پروژه‌ها',
    href: '/dashboard/projects',
    icon: ClipboardDocumentListIcon,
    section: 'projects',
  },
  {
    label: 'تقویم پروژه‌ها',
    href: '/dashboard/calendar',
    icon: CalendarDaysIcon,
    section: 'projects',
  },
  {
    label: 'کاربران',
    href: '/dashboard/users',
    icon: UsersIcon,
    section: 'users',
  },
];