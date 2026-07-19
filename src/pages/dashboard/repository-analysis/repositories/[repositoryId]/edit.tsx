import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { PencilSquareIcon } from '@heroicons/react/24/outline';
import { DashboardLayout } from '@/components/layouts';
import { PageHeader } from '@/components/common';
import {
  RepositoryConnectionForm,
  RepositoryConnectionFormSubmitPayload,
} from '@/components/repository-analysis';
import { Card } from '@/components/ui';
import { repositoryAnalysisService } from '@/services/repository-analysis.service';
import type {
  RepositoryConnection,
  UpdateRepositoryConnectionPayload,
} from '@/types/repository-analysis';
import { withAuth } from '@/utils';

export default function EditRepositoryConnectionPage() {
  const router = useRouter();
  const repositoryId = String(router.query.repositoryId || '');
  const [repository, setRepository] = useState<RepositoryConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!repositoryId) {
      setLoading(false);
      return;
    }

    repositoryAnalysisService
      .getRepository(repositoryId)
      .then(setRepository)
      .finally(() => setLoading(false));
  }, [repositoryId]);

  const handleSubmit = async (payload: RepositoryConnectionFormSubmitPayload) => {
    if (!repository) return;

    setSubmitting(true);
    try {
      const updated = await repositoryAnalysisService.updateRepository(
        repository.id,
        payload as UpdateRepositoryConnectionPayload,
      );
      setRepository(updated);
      await router.push(`/dashboard/repository-analysis/repositories/${updated.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" dir="rtl">
        <PageHeader
          title="ویرایش اتصال مخزن"
          description={repository?.name || 'تنظیم آدرس، branch پیش‌فرض و وضعیت اتصال'}
          icon={PencilSquareIcon}
          backHref={repositoryId ? `/dashboard/repository-analysis/repositories/${repositoryId}` : '/dashboard/repository-analysis'}
          backLabel="بازگشت به جزئیات مخزن"
        />

        {loading ? (
          <div className="h-96 animate-pulse rounded-3xl border border-base-300 bg-base-200/60" />
        ) : repository ? (
          <Card variant="bordered" padding="lg" className="mx-auto max-w-4xl rounded-3xl">
            <RepositoryConnectionForm
              repository={repository}
              isSubmitting={submitting}
              onSubmit={handleSubmit}
              onCancel={() => void router.push(`/dashboard/repository-analysis/repositories/${repository.id}`)}
            />
          </Card>
        ) : (
          <Card variant="bordered" padding="lg" className="mx-auto max-w-4xl rounded-3xl text-center">
            <p className="text-sm font-bold text-base-content/60">اتصال مخزن یافت نشد.</p>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

export const getServerSideProps = withAuth();
