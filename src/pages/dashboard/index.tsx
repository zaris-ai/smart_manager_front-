import { DashboardLayout } from '@/components/layouts';
import { withAuth } from '@/utils';
import dynamic from 'next/dynamic';

const DashboardTestCharts = dynamic(
  () => import('@/components/dashboard/DashboardTestCharts'),
  {
    ssr: false,
  },
);

const DashboardHomePage = () => {
  return (
    <DashboardLayout>
      <DashboardTestCharts />
    </DashboardLayout>
  );
};

export const getServerSideProps = withAuth();

export default DashboardHomePage;