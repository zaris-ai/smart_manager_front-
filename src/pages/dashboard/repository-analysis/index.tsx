import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  ArrowLeftIcon,
  BeakerIcon,
  CheckBadgeIcon,
  CircleStackIcon,
  CodeBracketSquareIcon,
  CpuChipIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  PowerIcon,
  ScaleIcon,
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
import {
  getEntityId,
  getRepositoryProject,
  getRunRepository,
  isRepositoryRunActive,
} from '@/utils/repository-analysis';
import { formatShamsiDateTime } from '@/utils/shamsi-date';
import { withAuth } from '@/utils';

const getLatestRunMap = (runs: RepositoryAnalysisRun[]) => {
  const map = new Map<string, RepositoryAnalysisRun>();

  runs.forEach((run) => {
    const repositoryId = getEntityId(run.repositoryId);
    if (!repositoryId || map.has(repositoryId)) return;
    map.set(repositoryId, run);
  });

  return map;
};

export default function RepositoryAnalysisOverviewPage() {
  const router = useRouter();
  const [repositories, setRepositories] = useState<RepositoryConnection[]>([]);
  const [runs, setRuns] = useState<RepositoryAnalysisRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [enabledFilter, setEnabledFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [analysisRepository, setAnalysisRepository] = useState<RepositoryConnection | null>(null);
  const [startingAnalysis, setStartingAnalysis] = useState(false);

  const loadData = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      else setLoading(true);

      try {
        const [repositoryItems, runResult] = await Promise.all([
          repositoryAnalysisService.listRepositories(undefined, { silent }),
          repositoryAnalysisService.listRuns({ page: 1, limit: 100 }, { silent }),
        ]);
        setRepositories(repositoryItems);
        setRuns(runResult.items);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const hasActiveRuns = useMemo(
    () => runs.some((run) => isRepositoryRunActive(run.status)),
    [runs],
  );

  useEffect(() => {
    if (!hasActiveRuns) return undefined;

    const interval = window.setInterval(() => {
      void loadData(true);
    }, 5000);

    return () => window.clearInterval(interval);
  }, [hasActiveRuns, loadData]);

  const latestRunByRepository = useMemo(() => getLatestRunMap(runs), [runs]);

  const filteredRepositories = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return repositories.filter((repository) => {
      if (enabledFilter === 'enabled' && !repository.enabled) return false;
      if (enabledFilter === 'disabled' && repository.enabled) return false;
      if (!normalizedSearch) return true;

      const projectTitle = getRepositoryProject(repository)?.title || '';
      return [
        repository.name,
        repository.gitlabProjectPath,
        repository.repositoryUrl,
        projectTitle,
      ].some((value) => String(value || '').toLowerCase().includes(normalizedSearch));
    });
  }, [enabledFilter, repositories, search]);

  const stats = useMemo(() => {
    const completed = runs.filter((run) =>
      ['completed', 'partially_completed'].includes(run.status),
    ).length;
    const aiReports = runs.filter((run) => run.aiUsed).length;
    const readinessRuns = runs.filter((run) => run.readinessAssessment);
    const averageReadiness = readinessRuns.length
      ? Math.round(
          readinessRuns.reduce(
            (total, run) => total + Number(run.readinessAssessment?.score || 0),
            0,
          ) / readinessRuns.length,
        )
      : 0;

    return {
      repositories: repositories.length,
      enabled: repositories.filter((repository) => repository.enabled).length,
      active: runs.filter((run) => isRepositoryRunActive(run.status)).length,
      completed,
      aiReports,
      averageReadiness,
    };
  }, [repositories, runs]);

  const handleStartAnalysis = async (payload: StartRepositoryAnalysisPayload) => {
    if (!analysisRepository) return;

    setStartingAnalysis(true);
    try {
      const run = await repositoryAnalysisService.startAnalysis(analysisRepository.id, payload);
      setAnalysisRepository(null);
      await router.push(`/dashboard/repository-analysis/runs/${run.id}`);
    } finally {
      setStartingAnalysis(false);
    }
  };


  return (
    <DashboardLayout>
      <div className="space-y-6" dir="rtl">
        <PageHeader
          title="تحلیل هوشمند مخازن"
          description="مقایسه پروژه با انتظارات، ارزیابی آمادگی، ظرفیت معماری و بازبینی کد بدون اجرای پروژه."
          icon={CpuChipIcon}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => void loadData(true)}
                disabled={refreshing}
              >
                <ArrowLeftIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : 'rotate-180'}`} />
                بروزرسانی
              </Button>
              <Link href="/dashboard/repository-analysis/new" className="btn btn-primary rounded-xl font-bold">
                <PlusIcon className="h-5 w-5" />
                اتصال مخزن جدید
              </Link>
            </div>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {[
            { label: 'کل مخازن', value: stats.repositories, icon: CodeBracketSquareIcon, tone: 'text-primary bg-primary/10' },
            { label: 'اتصال فعال', value: stats.enabled, icon: PowerIcon, tone: 'text-success bg-success/10' },
            { label: 'در حال تحلیل', value: stats.active, icon: BeakerIcon, tone: 'text-info bg-info/10' },
            { label: 'گزارش تکمیل‌شده', value: stats.completed, icon: CheckBadgeIcon, tone: 'text-warning bg-warning/10' },
            { label: 'گزارش AI', value: stats.aiReports, icon: CpuChipIcon, tone: 'text-secondary bg-secondary/10' },
            { label: 'میانگین آمادگی', value: stats.averageReadiness, suffix: '٪', icon: ScaleIcon, tone: 'text-primary bg-primary/10' },
          ].map((item) => (
            <Card key={item.label} variant="bordered" padding="sm" className="rounded-3xl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-base-content/50">{item.label}</p>
                  <p className="mt-2 text-2xl font-black text-base-content">{item.value.toLocaleString('fa-IR')}{'suffix' in item ? item.suffix : ''}</p>
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${item.tone}`}>
                  <item.icon className="h-5 w-5" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card variant="bordered" padding="md" className="rounded-3xl">
          <div className="grid gap-4 lg:grid-cols-[1fr_210px]">
            <label className="input input-bordered flex h-12 items-center gap-3 rounded-2xl bg-base-100">
              <MagnifyingGlassIcon className="h-5 w-5 text-base-content/40" />
              <input
                type="search"
                className="grow text-right"
                placeholder="جستجو در نام مخزن، پروژه یا مسیر GitLab"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <select
              className="select select-bordered h-12 rounded-2xl bg-base-100"
              value={enabledFilter}
              onChange={(event) => setEnabledFilter(event.target.value as typeof enabledFilter)}
            >
              <option value="all">همه اتصال‌ها</option>
              <option value="enabled">فقط فعال</option>
              <option value="disabled">فقط غیرفعال</option>
            </select>
          </div>
        </Card>

        {loading ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-64 animate-pulse rounded-3xl border border-base-300 bg-base-200/60" />
            ))}
          </div>
        ) : filteredRepositories.length === 0 ? (
          <Card variant="bordered" padding="none" className="rounded-3xl">
            <EmptyState
              icon={CircleStackIcon}
              title={repositories.length ? 'مخزنی با این فیلتر یافت نشد' : 'هنوز مخزنی متصل نشده است'}
              description={
                repositories.length
                  ? 'عبارت جستجو یا وضعیت اتصال را تغییر دهید.'
                  : 'برای دریافت گزارش معماری و پکیج‌ها، ابتدا یکی از مخازن GitLab را به پروژه متصل کنید.'
              }
              action={
                !repositories.length
                  ? {
                      label: 'اتصال اولین مخزن',
                      icon: PlusIcon,
                      onClick: () => void router.push('/dashboard/repository-analysis/new'),
                    }
                  : undefined
              }
            />
          </Card>
        ) : (
          <div className="grid gap-5 xl:grid-cols-2">
            {filteredRepositories.map((repository) => {
              const latestRun = latestRunByRepository.get(repository.id);
              const project = getRepositoryProject(repository);
              const runRepository = latestRun ? getRunRepository(latestRun) : null;
              const displayName = runRepository?.name || repository.name;

              return (
                <Card key={repository.id} variant="bordered" padding="md" className="rounded-3xl transition hover:-translate-y-0.5 hover:shadow-lg">
                  <div className="flex flex-col gap-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <CodeBracketSquareIcon className="h-6 w-6" />
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/dashboard/repository-analysis/repositories/${repository.id}`}
                            className="block truncate text-lg font-black text-base-content hover:text-primary"
                          >
                            {displayName}
                          </Link>
                          <p className="mt-1 truncate text-xs font-medium text-base-content/45" dir="ltr">
                            {repository.gitlabProjectPath}
                          </p>
                        </div>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${
                        repository.enabled
                          ? 'bg-success/10 text-success'
                          : 'bg-base-200 text-base-content/45'
                      }`}>
                        {repository.enabled ? 'فعال' : 'غیرفعال'}
                      </span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-base-200/45 p-3">
                        <p className="text-[11px] font-bold text-base-content/45">پروژه</p>
                        <p className="mt-1 truncate text-sm font-black text-base-content">{project?.title || '—'}</p>
                      </div>
                      <div className="rounded-2xl bg-base-200/45 p-3">
                        <p className="text-[11px] font-bold text-base-content/45">شاخه پیش‌فرض</p>
                        <p className="mt-1 truncate text-sm font-black text-base-content" dir="ltr">
                          {repository.defaultBranch || 'تشخیص خودکار'}
                        </p>
                      </div>
                    </div>

                    {latestRun ? (
                      <div className="rounded-2xl border border-base-300 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold text-base-content/45">آخرین تحلیل</p>
                            <p className="mt-1 text-xs font-semibold text-base-content/65">
                              {formatShamsiDateTime(latestRun.createdAt)}
                            </p>
                          </div>
                          <RepositoryAnalysisStatusBadge status={latestRun.status} />
                        </div>
                        {isRepositoryRunActive(latestRun.status) ? (
                          <div className="mt-4">
                            <RepositoryAnalysisProgress run={latestRun} />
                          </div>
                        ) : (
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm font-bold text-base-content/70">
                              معماری: {latestRun.architecture?.classification || 'نامشخص'}
                            </p>
                            {latestRun.readinessAssessment ? (
                              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">
                                آمادگی {latestRun.readinessAssessment.score.toLocaleString('fa-IR')}٪
                              </span>
                            ) : null}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-base-300 p-4 text-center text-sm text-base-content/50">
                        هنوز تحلیلی برای این مخزن اجرا نشده است.
                      </div>
                    )}

                    <div className="flex flex-wrap justify-end gap-2 border-t border-base-300/70 pt-4">
                      <Link
                        href={`/dashboard/repository-analysis/repositories/${repository.id}`}
                        className="btn btn-ghost btn-sm rounded-xl"
                      >
                        مشاهده مخزن
                      </Link>
                      {latestRun ? (
                        <Link
                          href={`/dashboard/repository-analysis/runs/${latestRun.id}`}
                          className="btn btn-outline btn-sm rounded-xl"
                        >
                          آخرین گزارش
                        </Link>
                      ) : null}
                      <Button
                        size="sm"
                        onClick={() => setAnalysisRepository(repository)}
                        disabled={!repository.enabled || Boolean(latestRun && isRepositoryRunActive(latestRun.status))}
                      >
                        <BeakerIcon className="h-4 w-4" />
                        تحلیل جدید
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <StartRepositoryAnalysisModal
        open={Boolean(analysisRepository)}
        repository={analysisRepository}
        isSubmitting={startingAnalysis}
        onClose={() => setAnalysisRepository(null)}
        onSubmit={handleStartAnalysis}
      />
    </DashboardLayout>
  );
}

export const getServerSideProps = withAuth();
