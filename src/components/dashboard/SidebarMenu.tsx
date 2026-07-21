import { cn } from '@/utils/cn';
import { getPanelRole } from '@/utils/role-access';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  menuSectionLabels,
  type MenuItem,
  type MenuSection,
} from './menuItems';

interface SidebarMenuProps {
  menuItems: MenuItem[];
  isActive: (href?: string, match?: 'exact' | 'prefix') => boolean;
  collapsedSidebar: boolean;
}

const managerSectionOrder: MenuSection[] = [
  'workspace',
  'projects',
  'reports',
  'personal',
  'people',
  'tools',
];

const expertSectionOrder: MenuSection[] = ['expert', 'personal'];

export const SidebarMenu: React.FC<SidebarMenuProps> = ({
  menuItems,
  isActive,
  collapsedSidebar,
}) => {
  const { data: session, status } = useSession();
  const role = getPanelRole(session?.user?.role);

  const visibleItems = menuItems
    .filter((item) => {
      if (!item.href) return false;
      if (!item.allowedRoles?.length) return true;

      // Keep authentication independent from role hydration. While the session
      // is loading, the menu is rendered after hydration instead of redirecting
      // or blocking the user.
      if (status === 'loading') return false;
      if (role === 'unknown') return true;

      return item.allowedRoles.map(getPanelRole).includes(role);
    })
    .sort((left, right) => left.priority - right.priority);

  const sectionOrder = role === 'expert' ? expertSectionOrder : managerSectionOrder;
  const groupedItems = sectionOrder
    .map((section) => ({
      section,
      items: visibleItems.filter((item) => item.section === section),
    }))
    .filter((group) => group.items.length > 0);

  const renderMenuItem = (item: MenuItem) => {
    const active = isActive(item.href, item.activeMatch);

    return (
      <Link
        key={`${item.label}-${item.href}`}
        href={item.href!}
        className={cn(
          'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200',
          active
            ? 'bg-primary/10 font-semibold text-primary shadow-sm'
            : 'text-base-content/60 hover:bg-base-200/80 hover:text-base-content',
        )}
      >
        {active ? (
          <div className="absolute right-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-l-full bg-primary" />
        ) : null}

        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all duration-200',
            active
              ? 'bg-primary text-primary-content shadow-md'
              : 'bg-base-200/80 text-base-content/55 group-hover:bg-base-300 group-hover:text-base-content',
          )}
        >
          <item.icon className="h-5 w-5" />
        </div>

        {!collapsedSidebar ? (
          <span
            className={cn(
              'flex-1 text-sm transition-all duration-200',
              active ? 'font-bold' : 'font-medium',
            )}
          >
            {item.label}
          </span>
        ) : null}
      </Link>
    );
  };

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4" dir="rtl">
      {!collapsedSidebar ? (
        <div className="mb-4 px-3">
          <p className="text-xs font-black text-base-content/45">
            {role === 'expert' ? 'فضای کاری کارشناس' : 'پنل مدیریت'}
          </p>
          <p className="mt-1 text-[11px] leading-5 text-base-content/35">
            صفحات بر اساس اولویت کاری مرتب شده‌اند.
          </p>
        </div>
      ) : null}

      {status === 'loading' ? (
        <div className="space-y-2 px-1" aria-label="در حال بارگذاری منو">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-12 animate-pulse rounded-xl bg-base-200/70"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          {groupedItems.map((group) => (
            <section key={group.section}>
              {!collapsedSidebar ? (
                <h3 className="mb-2 px-3 text-[11px] font-black tracking-wide text-base-content/40">
                  {menuSectionLabels[group.section]}
                </h3>
              ) : null}
              <div className="space-y-1">{group.items.map(renderMenuItem)}</div>
            </section>
          ))}
        </div>
      )}
    </nav>
  );
};
