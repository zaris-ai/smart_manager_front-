// src/pages/dashboard/projects/roles.tsx

import ProjectRolesPage from '@/components/projects/roles';
import { withAuth } from '@/utils';

export const getServerSideProps = withAuth();

export default ProjectRolesPage;