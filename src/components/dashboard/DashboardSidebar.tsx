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
        'fixed right-4 top-4 z-50 flex h-[calc(100vh-2rem)] flex-col rounded border border-gray-100 bg-white transition-all duration-300 dark:border-gray-700/50 dark:bg-gray-900',
        collapsedSidebar ? 'w-20' : 'w-72',
        sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0',
      )}
      dir="rtl"
    >
      <div className="flex h-20 items-center justify-between border-b border-gray-200 px-5 dark:border-gray-700">
        {!collapsedSidebar && (
          <Link
            href={ROUTES.DASHBOARD.HOME}
            className="group flex items-center gap-3"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0465a0] text-white shadow-md transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg">
              <span className="text-lg font-black">آ</span>
            </div>

            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                پنل آوید
              </h1>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                مدیریت هوشمند کار
              </p>
            </div>
          </Link>
        )}

        {collapsedSidebar && (
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#1D3D6B] text-white shadow-md">
            <span className="text-lg font-black">آ</span>
          </div>
        )}

        <button
          onClick={() => setSidebarOpen(false)}
          className="rounded-lg p-1 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200 lg:hidden"
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
        className="absolute -left-6 top-26 hidden rounded-full bg-white p-2 shadow-lg transition-all duration-300 hover:scale-110 hover:bg-[#2A4F7E] hover:shadow-xl dark:bg-[#1D3D6B] lg:flex"
        type="button"
      >
        <ChevronLeftIcon
          className={cn(
            'h-4 w-4 text-[#1D3D6B] transition-transform duration-300 hover:text-white',
            !collapsedSidebar && 'rotate-180',
          )}
        />
      </button>
    </aside>
  );
};