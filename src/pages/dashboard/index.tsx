import { DashboardLayout } from '@/components/layouts';
import { withAuth } from '@/utils';
import { getPanelRole } from '@/utils/role-access';
import {
  ClipboardDocumentCheckIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

const DashboardTestCharts = dynamic(
  () => import('@/components/dashboard/DashboardTestCharts'),
  { ssr: false },
);

const ExpertDashboardHome = () => (
  <div className="space-y-6" dir="rtl">
    <section className="rounded-3xl border border-base-300 bg-base-100 p-6 shadow-sm">
      <div className="max-w-3xl">
        <span className="badge badge-primary badge-outline">فضای کاری کارشناس</span>
        <h1 className="mt-4 text-2xl font-black text-base-content">
          ثبت فعالیت و مشاهده جایگاه رقابتی
        </h1>
        <p className="mt-3 leading-8 text-base-content/65">
          از این صفحه می‌توانید فعالیت‌های انجام‌شده در پروژه‌های خود را ثبت کنید و
          وضعیت خود را در لیگ کارشناسان ببینید.
        </p>
      </div>
    </section>

    <section className="grid gap-5 md:grid-cols-2">
      <Link
        href="/dashboard/expert-work-logs"
        className="group rounded-3xl border border-primary/25 bg-primary/5 p-6 transition hover:-translate-y-1 hover:border-primary/45 hover:shadow-lg"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-base-content">گزارش کار من</h2>
            <p className="mt-2 leading-7 text-base-content/60">
              فعالیت روزانه، زمان صرف‌شده، خروجی‌ها، موانع و گام بعدی را ثبت کنید.
            </p>
          </div>
          <div className="rounded-2xl bg-primary p-3 text-primary-content">
            <ClipboardDocumentCheckIcon className="h-7 w-7" />
          </div>
        </div>
      </Link>

      <Link
        href="/dashboard/expert-competition"
        className="group rounded-3xl border border-warning/30 bg-warning/10 p-6 transition hover:-translate-y-1 hover:border-warning/50 hover:shadow-lg"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-base-content">لیگ رقابتی کارشناسان</h2>
            <p className="mt-2 leading-7 text-base-content/60">
              رتبه، امتیاز فعالیت، فاصله تا جایگاه بعدی و نشان‌های رقابتی خود را ببینید.
            </p>
          </div>
          <div className="rounded-2xl bg-warning p-3 text-warning-content">
            <TrophyIcon className="h-7 w-7" />
          </div>
        </div>
      </Link>
    </section>
  </div>
);

const DashboardHomePage = () => {
  const { data: session, status } = useSession();
  const role = getPanelRole(session?.user?.role);

  return (
    <DashboardLayout>
      {status === 'loading' ? (
        <div className="flex min-h-[45vh] items-center justify-center">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      ) : role === 'expert' ? (
        <ExpertDashboardHome />
      ) : (
        <DashboardTestCharts />
      )}
    </DashboardLayout>
  );
};

export const getServerSideProps = withAuth();

export default DashboardHomePage;
