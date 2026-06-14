import { DashboardHeader, DashboardSidebar } from '@/components/dashboard';
import { cn, getLogoutUrl } from '@/utils';
import { signOut } from 'next-auth/react';
import { ReactNode, useState } from 'react';
import { toast } from 'sonner';

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsedSidebar, setCollapsedSidebar] = useState(false);
  const [profileDropdown, setProfileDropdown] = useState(false);
  const [notificationDropdown, setNotificationDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = async () => {
    const toastId = toast.loading('در حال خروج از سامانه...');

    try {
      await signOut({ callbackUrl: getLogoutUrl() });
      toast.success('با موفقیت خارج شدید.', { id: toastId });
    } catch {
      toast.error('خروج از سامانه انجام نشد. دوباره تلاش کنید.', {
        id: toastId,
      });
    }
  };

  return (
    <div
      className="min-h-screen bg-base-200 p-4 text-base-content transition-colors"
      dir="rtl"
    >
      {sidebarOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <DashboardSidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        collapsedSidebar={collapsedSidebar}
        setCollapsedSidebar={setCollapsedSidebar}
      />

      <div
        className={cn(
          'transition-all duration-300',
          collapsedSidebar ? 'lg:mr-24' : 'lg:mr-76',
        )}
      >
        <DashboardHeader
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          setSidebarOpen={setSidebarOpen}
          notificationDropdown={notificationDropdown}
          setNotificationDropdown={setNotificationDropdown}
          profileDropdown={profileDropdown}
          setProfileDropdown={setProfileDropdown}
          onLogout={handleLogout}
        />

        <main className="mt-4 p-6">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;