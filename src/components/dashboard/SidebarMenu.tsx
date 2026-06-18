import { cn } from '@/utils/cn';
import Link from 'next/link';
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
  '/dashboard/roles',
  '/dashboard/project-overview'
];

export const SidebarMenu: React.FC<SidebarMenuProps> = ({
  menuItems,
  isActive,
  collapsedSidebar,
}) => {
  const visibleItems = menuItems.filter(
    (item) => item.href && allowedMenuHrefs.includes(item.href),
  );

  const renderMenuItem = (item: MenuItem) => {
    const active = isActive(item.href);

    return (
      <Link
        key={item.href}
        href={item.href || '#'}
        className={cn(
          'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200',
          active
            ? 'bg-[#1D3D6B]/10 text-[#1D3D6B] dark:bg-[#0465a0]/20 dark:text-[#4A7BA7]'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-gray-200',
        )}
      >
        {active && (
          <div className="absolute right-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-l-full bg-[#0465a0] dark:bg-[#4A7BA7]" />
        )}

        <div
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200',
            collapsedSidebar
              ? active
                ? 'bg-transparent text-[#0465a0] dark:text-[#4A7BA7]'
                : 'bg-transparent text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-300'
              : active
                ? 'bg-[#0465a0] text-white dark:bg-[#0465a0]'
                : 'bg-transparent text-gray-500 group-hover:bg-gray-100 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:bg-gray-800 dark:group-hover:text-gray-300',
          )}
        >
          <item.icon className="h-5 w-5" />
        </div>

        {!collapsedSidebar && (
          <span
            className={cn(
              'flex-1 text-sm transition-all duration-200',
              active
                ? 'font-semibold text-[#0465a0] dark:text-[#4A7BA7]'
                : 'font-medium text-gray-600 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-gray-200',
            )}
          >
            {item.label}
          </span>
        )}

        {item.badge && !collapsedSidebar && (
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-semibold',
              active ? 'bg-[#0465a0] text-white' : 'bg-red-500 text-white',
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
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500">
            منوی اصلی
          </p>
        </div>
      )}

      <div className="space-y-1">{visibleItems.map(renderMenuItem)}</div>
    </nav>
  );
};