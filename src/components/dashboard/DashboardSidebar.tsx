import Link from 'next/link';
import { useRouter } from 'next/router';
import { ROUTES } from '@/config/constants';
import { cn } from '@/utils/cn';
import { XMarkIcon, ChevronLeftIcon } from '@heroicons/react/24/outline';
import { SidebarMenu } from './SidebarMenu';
import { menuItems } from './menuItems';

interface DashboardSidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  collapsedSidebar: boolean;
  setCollapsedSidebar: (collapsed: boolean) => void;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  sidebarOpen,
  setSidebarOpen,
  collapsedSidebar,
  setCollapsedSidebar,
}) => {
  const router = useRouter();

  const isActive = (href?: string) => {
    if (!href) return false;

    const [basePath] = href.split('?');

    if (basePath === '/dashboard') {
      return router.pathname === '/dashboard';
    }

    return router.pathname === basePath || router.pathname.startsWith(`${basePath}/`);
  };

  return (
    <aside
      className={cn(
        'avid-glass-surface fixed right-4 top-4 z-50 flex h-[calc(100vh-2rem)] flex-col rounded-3xl transition-all duration-300',
        collapsedSidebar ? 'w-20' : 'w-72',
        sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0',
      )}
      dir="rtl"
    >
      <div className="flex h-20 items-center justify-between border-b border-base-300/70 px-5">
        {!collapsedSidebar && (
          <Link
            href={ROUTES.DASHBOARD.HOME}
            className="group flex items-center gap-3"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-white shadow-md transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg">
              <span className="text-lg font-black">آ</span>
            </div>

            <div>
              <h1 className="text-xl font-bold text-base-content">
                پنل آوید
              </h1>
              <p className="mt-0.5 text-xs text-base-content/55">
                مدیریت هوشمند کار
              </p>
            </div>
          </Link>
        )}

        {collapsedSidebar && (
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-white shadow-md">
            <span className="text-lg font-black">آ</span>
          </div>
        )}

        <button
          onClick={() => setSidebarOpen(false)}
          className="btn btn-ghost btn-square btn-sm lg:hidden"
          type="button"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
      </div>

      <SidebarMenu
        menuItems={menuItems}
        isActive={isActive}
        collapsedSidebar={collapsedSidebar}
      />

      <button
        onClick={() => setCollapsedSidebar(!collapsedSidebar)}
        className="absolute -left-6 top-26 hidden rounded-full border border-base-300 bg-base-100 p-2 text-primary shadow-lg transition-all duration-300 hover:scale-110 hover:bg-primary hover:text-primary-content hover:shadow-xl lg:flex"
        type="button"
      >
        <ChevronLeftIcon
          className={cn(
            'h-4 w-4 transition-transform duration-300',
            !collapsedSidebar && 'rotate-180',
          )}
        />
      </button>
    </aside>
  );
};