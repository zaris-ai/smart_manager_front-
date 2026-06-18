// src/pages/dashboard/project-overview/index.tsx

import ProjectOverviewPage from '@/components/project-overview';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { withAuth } from '@/utils';

export const getServerSideProps = withAuth();

export default function ProjectOverviewRoutePage() {
  return (
    <DashboardLayout>
      <ProjectOverviewPage />
    </DashboardLayout>
  );
}
