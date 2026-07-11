// src/components/projects/roles.tsx
// Compatibility wrapper: the canonical project-role UI lives in src/components/roles.

import ProjectRolesPage from '@/components/roles';
import { DashboardLayout } from '@/components/layouts';

const LegacyProjectRolesRoute = () => {
  return (
    <DashboardLayout>
      <ProjectRolesPage />
    </DashboardLayout>
  );
};

export default LegacyProjectRolesRoute;
