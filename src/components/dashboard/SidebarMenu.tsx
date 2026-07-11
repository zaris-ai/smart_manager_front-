import { cn } from '@/utils/cn';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { MenuItem } from './menuItems';

interface SidebarMenuProps {
  menuItems: MenuItem[];
  isActive: (href?: string) => boolean;
  collapsedSidebar: boolean;
}

const allowedMenuHrefs = [
  '/dashboard',
  '/dashboard/projects',
  '/dashboard/calendar',
  '/dashboard/users',
  '/dashboard/telegram',
  '/dashboard/roles',
  '/dashboard/project-overview',
  '/dashboard/project-charts'
];

export const SidebarMenu: React.FC<SidebarMenuProps> = ({
  menuItems,
  isActive,
  collapsedSidebar,
}) => {
  const { data: session } = useSession();
  const role = String(session?.user?.role || '').toLowerCase();

  const visibleItems = menuItems.filter(
    (item) =>
      item.href &&
      allowedMenuHrefs.includes(item.href) &&
      (!item.allowedRoles?.length || item.allowedRoles.includes(role)),
  );

  const renderMenuItem = (item: MenuItem) => {
    const active = isActive(item.href);

    return (
      <Link
        key={item.href}
        href={item.href || '#'}
        className={cn(
          'group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-all duration-200',
          active
            ? 'bg-primary/10 text-primary shadow-sm'
            : 'text-base-content/60 hover:bg-base-200/80 hover:text-base-content',
        )}
      >
        {active && (
          <div className="absolute right-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-l-full bg-primary" />
        )}

        <div
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200',
            collapsedSidebar
              ? active
                ? 'bg-transparent text-primary'
                : 'bg-transparent text-base-content/55 group-hover:text-base-content'
              : active
                ? 'bg-primary text-primary-content'
                : 'bg-transparent text-base-content/55 group-hover:bg-base-200 group-hover:text-base-content',
          )}
        >
          <item.icon className="h-5 w-5" />
        </div>

        {!collapsedSidebar && (
          <span
            className={cn(
              'flex-1 text-sm transition-all duration-200',
              active
                ? 'font-black text-primary'
                : 'font-bold text-base-content/60 group-hover:text-base-content',
            )}
          >
            {item.label}
          </span>
        )}

        {item.badge && !collapsedSidebar && (
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-semibold',
              active ? 'bg-primary text-primary-content' : 'bg-red-500 text-white',
            )}
          >
            {item.badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4" dir="rtl">
      {!collapsedSidebar && (
        <div className="mb-3 px-3">
          <p className="text-xs font-black text-base-content/45">
            منوی اصلی
          </p>
        </div>
      )}

      <div className="space-y-1">{visibleItems.map(renderMenuItem)}</div>
    </nav>
  );
};