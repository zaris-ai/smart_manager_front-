import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { CodeBracketSquareIcon } from '@heroicons/react/24/outline';
import { DashboardLayout } from '@/components/layouts';
import { PageHeader } from '@/components/common';
import {
  RepositoryConnectionForm,
  RepositoryConnectionFormSubmitPayload,
} from '@/components/repository-analysis';
import { Card } from '@/components/ui';
import { projectService } from '@/services/project.service';
import { repositoryAnalysisService } from '@/services/repository-analysis.service';
import type { Project } from '@/types/project';
import type { CreateRepositoryConnectionPayload } from '@/types/repository-analysis';
import { withAuth } from '@/utils';

export default function NewRepositoryConnectionPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    projectService
      .listProjects({ page: 1, limit: 100 })
      .then((result) => setProjects(result.items))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (payload: RepositoryConnectionFormSubmitPayload) => {
    setSubmitting(true);
    try {
      const repository = await repositoryAnalysisService.createRepository(
        payload as CreateRepositoryConnectionPayload,
      );
      await router.push(`/dashboard/repository-analysis/repositories/${repository.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" dir="rtl">
        <PageHeader
          title="اتصال مخزن GitLab"
          description="یک مخزن را به پروژه متصل کنید تا ساختار، پکیج‌ها و معماری آن به‌صورت ایستا تحلیل شود."
          icon={CodeBracketSquareIcon}
          backHref="/dashboard/repository-analysis"
          backLabel="بازگشت به تحلیل مخازن"
        />

        {loading ? (
          <div className="h-96 animate-pulse rounded-3xl border border-base-300 bg-base-200/60" />
        ) : (
          <Card variant="bordered" padding="lg" className="mx-auto max-w-4xl rounded-3xl">
            <RepositoryConnectionForm
              projects={projects}
              isSubmitting={submitting}
              onSubmit={handleSubmit}
              onCancel={() => void router.push('/dashboard/repository-analysis')}
            />
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

export const getServerSideProps = withAuth();
