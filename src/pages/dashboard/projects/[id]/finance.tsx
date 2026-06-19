import { ProjectFinancePage } from '@/components/project-finance';
import { withAuth } from '@/utils';

export const getServerSideProps = withAuth();

export default ProjectFinancePage;
