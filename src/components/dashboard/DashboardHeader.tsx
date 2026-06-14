import { ThemeToggle } from '@/components/common';
import { Bars3Icon } from '@heroicons/react/24/outline';
import { useSession } from 'next-auth/react';

interface DashboardHeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  setSidebarOpen: (open: boolean) => void;
  notificationDropdown: boolean;
  setNotificationDropdown: (open: boolean) => void;
  profileDropdown: boolean;
  setProfileDropdown: (open: boolean) => void;
  onLogout: () => void;
}

function getUserInitials(name?: string | null, username?: string | null): string {
  const source = name?.trim() || username?.trim() || 'کاربر';
  const parts = source.split(' ').filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  setSidebarOpen,
  onLogout,
}) => {
  const { data: session } = useSession();

  const userName = session?.user?.name || session?.user?.username || 'کاربر';
  const username = session?.user?.username || '';
  const email = session?.user?.email || '';
  const initials = getUserInitials(userName, username);

  return (
    <header
      className="sticky top-4 z-30 mx-2 h-20 rounded-2xl border border-base-300 bg-base-100/90 shadow-sm backdrop-blur-md"
      dir="rtl"
    >
      <div className="flex h-full items-center justify-between gap-6 px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="btn btn-ghost btn-square lg:hidden"
            type="button"
            aria-label="باز کردن منو"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>

          <div>
            <h2 className="text-base font-semibold text-base-content">
              پنل مدیریتی آوید
            </h2>
            <p className="mt-0.5 text-xs text-base-content/60">
              مدیریت کاربران، پروژه‌ها، گزارش کار و تقویم
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle variant="dropdown" />

          <div className="hidden items-center gap-3 md:flex">
            <div className="avatar placeholder">
              <div className="w-10 rounded-full bg-primary text-primary-content">
                <span className="text-sm font-bold">{initials}</span>
              </div>
            </div>

            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-base-content">
                {userName}
              </p>

              <p className="mt-0.5 text-xs text-base-content/60" dir="ltr">
                {username || email || '—'}
              </p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="btn btn-outline btn-sm"
            type="button"
          >
            خروج
          </button>
        </div>
      </div>
    </header>
  );
};