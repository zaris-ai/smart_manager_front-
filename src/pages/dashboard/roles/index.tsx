// src/pages/dashboard/roles/index.tsx

import ProjectRolesPage from '@/components/roles';
import { DashboardLayout } from '@/components/layouts';
import { withAuth } from '@/utils';

export const getServerSideProps = withAuth();

export default function RolesRoutePage() {
  return (
    <DashboardLayout>
      <ProjectRolesPage />
    </DashboardLayout>
  );
}