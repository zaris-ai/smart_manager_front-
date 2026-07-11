import dynamic from 'next/dynamic';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { withAuth } from '@/utils';

const ProjectChartsPage = dynamic(
  () => import('@/components/project-charts'),
  {
    ssr: false,
  },
);

export const getServerSideProps = withAuth();

export default function ProjectChartsRoutePage() {
  return (
    <DashboardLayout>
      <ProjectChartsPage />
    </DashboardLayout>
  );
}
