import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  ArrowTopRightOnSquareIcon,
  BeakerIcon,
  CodeBracketSquareIcon,
  CpuChipIcon,
  DocumentMagnifyingGlassIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { DashboardLayout } from '@/components/layouts';
import { EmptyState, PageHeader } from '@/components/common';
import {
  RepositoryAnalysisProgress,
  RepositoryAnalysisStatusBadge,
  StartRepositoryAnalysisModal,
} from '@/components/repository-analysis';
import { Button, Card } from '@/components/ui';
import { repositoryAnalysisService } from '@/services/repository-analysis.service';
import type {
  RepositoryAnalysisRun,
  RepositoryConnection,
  StartRepositoryAnalysisPayload,
} from '@/types/repository-analysis';
import { confirmToast } from '@/utils/sonner-confirm';
import {
  getRepositoryProject,
  getRepositoryWebUrl,
  isRepositoryRunActive,
  shortCommitSha,
} from '@/utils/repository-analysis';
import { formatShamsiDateTime } from '@/utils/shamsi-date';
import { withAuth } from '@/utils';

export default function RepositoryConnectionDetailPage() {
  const router = useRouter();
  const repositoryId = String(router.query.repositoryId || '');

  const [repository, setRepository] = useState<RepositoryConnection | null>(null);
  const [runs, setRuns] = useState<RepositoryAnalysisRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);
  const [startingAnalysis, setStartingAnalysis] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(
    async (silent = false) => {
      if (!repositoryId) return;
      if (!silent) setLoading(true);

      try {
        const [repositoryResult, runResult] = await Promise.all([
          repositoryAnalysisService.getRepository(repositoryId, { silent }),
          repositoryAnalysisService.listRuns(
            { repositoryId, page: 1, limit: 50 },
            { silent },
          ),
        ]);
        setRepository(repositoryResult);
        setRuns(runResult.items);
      } finally {
        setLoading(false);
      }
    },
    [repositoryId],
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const activeRun = useMemo(
    () => runs.find((run) => isRepositoryRunActive(run.status)) || null,
    [runs],
  );

  useEffect(() => {
    if (!activeRun) return undefined;

    const interval = window.setInterval(() => {
      void loadData(true);
    }, 5000);

    return () => window.clearInterval(interval);
  }, [activeRun, loadData]);

  const project = getRepositoryProject(repository);
  const repositoryWebUrl = getRepositoryWebUrl(repository);

  const handleStartAnalysis = async (payload: StartRepositoryAnalysisPayload) => {
    if (!repository) return;
    setStartingAnalysis(true);

    try {
      const run = await repositoryAnalysisService.startAnalysis(repository.id, payload);
      setAnalysisModalOpen(false);
      await router.push(`/dashboard/repository-analysis/runs/${run.id}`);
    } finally {
      setStartingAnalysis(false);
    }
  };

  const handleDelete = async () => {
    if (!repository) return;

    const confirmed = await confirmToast({
      title: `اتصال مخزن «${repository.name}» حذف شود؟`,
      description: 'گزارش‌های قبلی باقی می‌مانند اما دیگر امکان اجرای تحلیل جدید برای این اتصال وجود ندارد.',
      confirmText: 'حذف اتصال',
      variant: 'danger',
    });

    if (!confirmed) return;

    setDeleting(true);
    try {
      await repositoryAnalysisService.deleteRepository(repository.id);
      await router.push('/dashboard/repository-analysis');
    } finally {
      setDeleting(false);
    }
  };


  return (
    <DashboardLayout>
      <div className="space-y-6" dir="rtl">
        {loading ? (
          <div className="space-y-4">
            <div className="h-24 animate-pulse rounded-3xl bg-base-200/70" />
            <div className="h-64 animate-pulse rounded-3xl bg-base-200/70" />
          </div>
        ) : !repository ? (
          <Card variant="bordered" padding="none" className="rounded-3xl">
            <EmptyState
              variant="error"
              title="مخزن یافت نشد"
              description="ممکن است اتصال مخزن حذف شده باشد یا شما به آن دسترسی نداشته باشید."
              action={{
                label: 'بازگشت',
                onClick: () => void router.push('/dashboard/repository-analysis'),
              }}
            />
          </Card>
        ) : (
          <>
            <PageHeader
              title={repository.name}
              description={project?.title ? `مخزن متصل به پروژه «${project.title}»` : 'مخزن GitLab متصل‌شده'}
              icon={CodeBracketSquareIcon}
              backHref="/dashboard/repository-analysis"
              backLabel="بازگشت به فهرست مخازن"
              actions={
                (
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/dashboard/repository-analysis/repositories/${repository.id}/edit`}
                      className="btn btn-outline rounded-xl font-bold"
                    >
                      <PencilSquareIcon className="h-4 w-4" />
                      ویرایش
                    </Link>
                    <Button
                      variant="danger"
                      onClick={handleDelete}
                      isLoading={deleting}
                      disabled={Boolean(activeRun)}
                    >
                      <TrashIcon className="h-4 w-4" />
                      حذف اتصال
                    </Button>
                    <Button
                      onClick={() => setAnalysisModalOpen(true)}
                      disabled={!repository.enabled || Boolean(activeRun)}
                    >
                      <BeakerIcon className="h-5 w-5" />
                      تحلیل جدید
                    </Button>
                  </div>
                )
              }
            />

            <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
              <Card variant="bordered" padding="md" className="rounded-3xl">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold text-base-content/45">مسیر GitLab</p>
                    <p className="mt-2 break-all font-mono text-sm font-bold text-base-content" dir="ltr">
                      {repository.gitlabProjectPath}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${
                    repository.enabled
                      ? 'bg-success/10 text-success'
                      : 'bg-base-200 text-base-content/45'
                  }`}>
                    {repository.enabled ? 'اتصال فعال' : 'اتصال غیرفعال'}
                  </span>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-base-200/45 p-4">
                    <p className="text-xs font-bold text-base-content/45">سرور GitLab</p>
                    <p className="mt-2 truncate text-sm font-black" dir="ltr">{repository.gitlabBaseUrl}</p>
                  </div>
                  <div className="rounded-2xl bg-base-200/45 p-4">
                    <p className="text-xs font-bold text-base-content/45">شاخه پیش‌فرض</p>
                    <p className="mt-2 text-sm font-black" dir="ltr">{repository.defaultBranch || 'تشخیص خودکار'}</p>
                  </div>
                  <div className="rounded-2xl bg-base-200/45 p-4">
                    <p className="text-xs font-bold text-base-content/45">تاریخ اتصال</p>
                    <p className="mt-2 text-sm font-black">{formatShamsiDateTime(repository.createdAt)}</p>
                  </div>
                  <div className="rounded-2xl bg-base-200/45 p-4">
                    <p className="text-xs font-bold text-base-content/45">تعداد تحلیل‌ها</p>
                    <p className="mt-2 text-sm font-black">{runs.length.toLocaleString('fa-IR')}</p>
                  </div>
                </div>

                {repositoryWebUrl ? (
                <a
                  href={repositoryWebUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex items-center gap-2 text-sm font-black text-primary hover:underline"
                >
                  باز کردن مخزن در GitLab
                  <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                </a>
                ) : null}
              </Card>

              <Card variant="bordered" padding="md" className="rounded-3xl">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <CpuChipIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-black text-base-content">وضعیت تحلیل</h2>
                    <p className="mt-1 text-xs text-base-content/50">آخرین وضعیت ثبت‌شده برای مخزن</p>
                  </div>
                </div>

                {runs[0] ? (
                  <div className="mt-5 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <RepositoryAnalysisStatusBadge status={runs[0].status} />
                      <span className="text-xs font-semibold text-base-content/50">
                        {formatShamsiDateTime(runs[0].createdAt)}
                      </span>
                    </div>
                    <RepositoryAnalysisProgress run={runs[0]} />
                    {runs[0].readinessAssessment ? (
                      <div className="flex items-center justify-between rounded-2xl bg-primary/5 px-4 py-3 text-xs font-black">
                        <span className="text-base-content/55">امتیاز آمادگی</span>
                        <span className="text-primary">{runs[0].readinessAssessment.score.toLocaleString('fa-IR')}٪</span>
                      </div>
                    ) : null}
                    <Link
                      href={`/dashboard/repository-analysis/runs/${runs[0].id}`}
                      className="btn btn-outline btn-sm w-full rounded-xl"
                    >
                      مشاهده آخرین گزارش
                    </Link>
                  </div>
                ) : (
                  <div className="mt-5 rounded-2xl border border-dashed border-base-300 p-5 text-center">
                    <p className="text-sm text-base-content/55">هنوز تحلیلی ثبت نشده است.</p>
                    {repository.enabled ? (
                      <Button size="sm" className="mt-4" onClick={() => setAnalysisModalOpen(true)}>
                        شروع اولین تحلیل
                      </Button>
                    ) : null}
                  </div>
                )}
              </Card>
            </div>

            <Card variant="bordered" padding="none" className="overflow-hidden rounded-3xl">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-base-300 px-6 py-5">
                <div>
                  <h2 className="text-lg font-black text-base-content">تاریخچه تحلیل‌ها</h2>
                  <p className="mt-1 text-xs text-base-content/50">هر گزارش به branch و commit دقیق متصل است.</p>
                </div>
                <span className="rounded-full bg-base-200 px-3 py-1 text-xs font-black text-base-content/60">
                  {runs.length.toLocaleString('fa-IR')} گزارش
                </span>
              </div>

              {runs.length === 0 ? (
                <EmptyState
                  icon={DocumentMagnifyingGlassIcon}
                  title="گزارشی وجود ندارد"
                  description="پس از اجرای اولین تحلیل، نتیجه در این بخش نمایش داده می‌شود."
                />
              ) : (
                <div className="divide-y divide-base-300">
                  {runs.map((run) => (
                    <Link
                      key={run.id}
                      href={`/dashboard/repository-analysis/runs/${run.id}`}
                      className="grid gap-4 px-6 py-5 transition hover:bg-base-200/45 lg:grid-cols-[minmax(0,1fr)_180px_170px_140px] lg:items-center"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-black text-base-content" dir="ltr">
                            {run.resolvedRef || run.requestedRef || repository.defaultBranch || 'default'}
                          </span>
                          {run.aiUsed ? (
                            <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-[10px] font-black text-secondary">AI</span>
                          ) : null}
                        </div>
                        <p className="mt-1 truncate text-xs text-base-content/45" dir="ltr">
                          commit: {shortCommitSha(run.commitSha)}
                        </p>
                        {run.readinessAssessment ? (
                          <p className="mt-1 text-xs font-bold text-primary">
                            آمادگی: {run.readinessAssessment.score.toLocaleString('fa-IR')}٪
                          </p>
                        ) : null}
                      </div>
                      <RepositoryAnalysisStatusBadge status={run.status} className="w-fit" />
                      <span className="text-xs font-semibold text-base-content/55">{formatShamsiDateTime(run.createdAt)}</span>
                      <span className="text-left text-xs font-black text-primary">مشاهده گزارش</span>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
      </div>

      <StartRepositoryAnalysisModal
        open={analysisModalOpen}
        repository={repository}
        isSubmitting={startingAnalysis}
        onClose={() => setAnalysisModalOpen(false)}
        onSubmit={handleStartAnalysis}
      />
    </DashboardLayout>
  );
}

export const getServerSideProps = withAuth();
