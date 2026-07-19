import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  ArchiveBoxIcon,
  BeakerIcon,
  CheckCircleIcon,
  CircleStackIcon,
  ClipboardDocumentIcon,
  CodeBracketIcon,
  CodeBracketSquareIcon,
  CpuChipIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  FolderIcon,
  LanguageIcon,
  MagnifyingGlassIcon,
  ScaleIcon,
  ChartBarSquareIcon,
  EyeIcon,
  QueueListIcon,
  ShieldCheckIcon,
  SparklesIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/layouts';
import { EmptyState, PageHeader } from '@/components/common';
import {
  RepositoryAnalysisProgress,
  RepositoryAnalysisStatusBadge,
  RepositoryAssessmentPanel,
} from '@/components/repository-analysis';
import { Card } from '@/components/ui';
import { repositoryAnalysisService } from '@/services/repository-analysis.service';
import type {
  RepositoryAnalysisRun,
  RepositoryPackageCategory,
} from '@/types/repository-analysis';
import {
  getArchitectureConfidencePercent,
  getRunProject,
  getRunRepository,
  isRepositoryRunActive,
  repositoryPackageCategoryLabels,
  shortCommitSha,
} from '@/utils/repository-analysis';
import { formatShamsiDateTime } from '@/utils/shamsi-date';
import { cn } from '@/utils/cn';
import { withAuth } from '@/utils';

type ReportTab =
  | 'executive'
  | 'readiness'
  | 'scalability'
  | 'review'
  | 'quality'
  | 'architecture'
  | 'packages'
  | 'inventory'
  | 'technical';

const analysisEngineLabels = {
  deterministic: 'تحلیل قطعی بدون AI',
  typescript_single_pass: 'تحلیل تک‌مرحله‌ای جایگزین',
  python_multi_pass: 'تحلیل چندمرحله‌ای Python',
};

const criticVerdictLabels = {
  approved: 'تایید شده',
  approved_with_caveats: 'تایید با ملاحظات',
  rejected: 'رد شده',
  not_run: 'اجرا نشده',
};

const analysisPassLabels: Record<string, string> = {
  deterministic_repository_scan: 'اسکن قطعی ساختار و پکیج‌ها',
  requirements_extraction: 'استخراج اتمیک الزامات و KPIها',
  module_evidence_review: 'بررسی شواهد فایل‌ها در چند بخش',
  candidate_synthesis: 'ساخت ارزیابی اولیه',
  adversarial_critic: 'نقد مخالف و کشف ادعاهای بدون شواهد',
  final_evidence_gate: 'دروازه نهایی شواهد و تولید گزارش فارسی',
  single_pass_review: 'تحلیل تک‌مرحله‌ای جایگزین',
  server_evidence_gate: 'اعتبارسنجی مسیرهای شواهد در Backend',
};

const tabItems: Array<{
  id: ReportTab;
  label: string;
  icon: typeof DocumentTextIcon;
}> = [
  { id: 'executive', label: 'خلاصه مدیریتی', icon: DocumentTextIcon },
  { id: 'readiness', label: 'آمادگی پروژه', icon: ScaleIcon },
  { id: 'scalability', label: 'ظرفیت و فشار', icon: ChartBarSquareIcon },
  { id: 'review', label: 'بازبینی کد', icon: EyeIcon },
  { id: 'quality', label: 'کیفیت تحلیل', icon: BeakerIcon },
  { id: 'architecture', label: 'معماری', icon: Squares2X2Icon },
  { id: 'packages', label: 'پکیج‌ها', icon: ArchiveBoxIcon },
  { id: 'inventory', label: 'ساختار مخزن', icon: FolderIcon },
  { id: 'technical', label: 'گزارش فنی', icon: CodeBracketIcon },
];

const formatDiagnosticValue = (value: unknown): string => {
  if (value === undefined || value === null || value === '') return '—';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const renderReportText = (value: string, emptyMessage: string) => {
  if (!value.trim()) {
    return <p className="text-sm leading-8 text-base-content/50">{emptyMessage}</p>;
  }

  return value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph, index) => (
      <p key={`${paragraph.slice(0, 24)}-${index}`} className="leading-9 text-base-content/75">
        {paragraph}
      </p>
    ));
};

export default function RepositoryAnalysisRunDetailPage() {
  const router = useRouter();
  const runId = String(router.query.runId || '');

  const [run, setRun] = useState<RepositoryAnalysisRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ReportTab>('executive');
  const [packageSearch, setPackageSearch] = useState('');
  const [packageCategory, setPackageCategory] = useState<'all' | RepositoryPackageCategory>('all');

  const loadRun = useCallback(
    async (silent = false) => {
      if (!runId) return;
      if (!silent) setLoading(true);

      try {
        const result = await repositoryAnalysisService.getRun(runId, { silent });
        setRun(result);
      } finally {
        setLoading(false);
      }
    },
    [runId],
  );

  useEffect(() => {
    void loadRun();
  }, [loadRun]);

  useEffect(() => {
    if (!run || !isRepositoryRunActive(run.status)) return undefined;

    const interval = window.setInterval(() => {
      void loadRun(true);
    }, 4000);

    return () => window.clearInterval(interval);
  }, [loadRun, run]);

  const repository = getRunRepository(run);
  const project = getRunProject(run);
  const confidence = getArchitectureConfidencePercent(run?.architecture?.confidence);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    (run?.packages || []).forEach((item) => {
      counts[item.category] = (counts[item.category] || 0) + 1;
    });
    return counts;
  }, [run?.packages]);

  const filteredPackages = useMemo(() => {
    const normalizedSearch = packageSearch.trim().toLowerCase();

    return (run?.packages || []).filter((item) => {
      if (packageCategory !== 'all' && item.category !== packageCategory) return false;
      if (!normalizedSearch) return true;

      return [item.name, item.version, item.ecosystem, item.manifestPath].some((value) =>
        String(value || '').toLowerCase().includes(normalizedSearch),
      );
    });
  }, [packageCategory, packageSearch, run?.packages]);

  const copyCommit = async () => {
    if (!run?.commitSha || typeof navigator === 'undefined') return;
    await navigator.clipboard.writeText(run.commitSha);
    toast.success('شناسه commit کپی شد.');
  };


  return (
    <DashboardLayout>
      <div className="space-y-6" dir="rtl">
        {loading ? (
          <div className="space-y-4">
            <div className="h-28 animate-pulse rounded-3xl bg-base-200/70" />
            <div className="h-80 animate-pulse rounded-3xl bg-base-200/70" />
          </div>
        ) : !run ? (
          <Card variant="bordered" padding="none" className="rounded-3xl">
            <EmptyState
              variant="error"
              title="گزارش تحلیل یافت نشد"
              description="ممکن است شناسه گزارش معتبر نباشد یا گزارش حذف شده باشد."
              action={{
                label: 'بازگشت به تحلیل مخازن',
                onClick: () => void router.push('/dashboard/repository-analysis'),
              }}
            />
          </Card>
        ) : (
          <>
            <PageHeader
              title={`گزارش تحلیل ${repository?.name || 'مخزن'}`}
              description={project?.title ? `پروژه: ${project.title}` : 'گزارش تحلیل ایستای مخزن GitLab'}
              icon={CpuChipIcon}
              backHref={
                repository?.id
                  ? `/dashboard/repository-analysis/repositories/${repository.id}`
                  : '/dashboard/repository-analysis'
              }
              backLabel="بازگشت به مخزن"
              actions={<RepositoryAnalysisStatusBadge status={run.status} className="px-4 py-2" />}
            />

            {isRepositoryRunActive(run.status) ? (
              <Card variant="bordered" padding="md" className="rounded-3xl border-primary/20 bg-primary/5">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <CpuChipIcon className="h-6 w-6 animate-pulse" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-black text-base-content">تحلیل هنوز در حال اجرا است</h2>
                    <p className="mt-1 text-xs leading-6 text-base-content/55">
                      این صفحه به‌صورت خودکار بروزرسانی می‌شود. خروج از صفحه، اجرای تحلیل در بک‌اند را متوقف نمی‌کند.
                    </p>
                    <div className="mt-4">
                      <RepositoryAnalysisProgress run={run} />
                    </div>
                  </div>
                </div>
              </Card>
            ) : null}

            {run.status === 'failed' ? (
              <Card variant="bordered" padding="md" className="rounded-3xl border-error/25 bg-error/5">
                <div className="flex items-start gap-3">
                  <ExclamationTriangleIcon className="mt-1 h-6 w-6 shrink-0 text-error" />
                  <div>
                    <h2 className="font-black text-error">تحلیل ناموفق بود</h2>
                    <p className="mt-2 text-sm leading-7 text-base-content/70">
                      {run.errorMessage || 'بک‌اند نتوانست مخزن را تحلیل کند.'}
                    </p>
                    {run.errorCode ? (
                      <code className="mt-3 inline-block rounded-lg bg-base-200 px-3 py-1 text-xs" dir="ltr">
                        {run.errorCode}
                      </code>
                    ) : null}
                  </div>
                </div>
              </Card>
            ) : null}

            {run.aiError ? (
              <Card variant="bordered" padding="md" className="rounded-3xl border-error/25 bg-error/5">
                <div className="flex items-start gap-3">
                  <ExclamationTriangleIcon className="mt-1 h-6 w-6 shrink-0 text-error" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="font-black text-error">جزئیات دقیق خطای OpenAI</h2>
                        <p className="mt-1 text-xs leading-6 text-base-content/55">
                          این اطلاعات مستقیماً از پاسخ OpenAI یا خطای شبکه ثبت شده است.
                        </p>
                      </div>
                      {run.aiError.httpStatus ? (
                        <code className="rounded-lg bg-error/10 px-3 py-1 text-xs font-black text-error" dir="ltr">
                          HTTP {run.aiError.httpStatus}
                        </code>
                      ) : null}
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {[
                        ['پیام OpenAI', run.aiError.openaiError?.message || run.errorMessage],
                        ['کد OpenAI', run.aiError.openaiError?.code],
                        ['نوع خطا', run.aiError.openaiError?.type],
                        ['پارامتر خطادار', run.aiError.openaiError?.param],
                        ['مرحله تحلیل', run.aiError.stage],
                        ['مدل', run.aiError.model || run.aiModel],
                        ['تعداد تلاش', run.aiError.attempt && run.aiError.maxAttempts ? `${run.aiError.attempt}/${run.aiError.maxAttempts}` : run.aiError.attempt],
                        ['قابل تلاش مجدد', run.aiError.retryable === undefined ? undefined : run.aiError.retryable ? 'بله' : 'خیر'],
                        ['OpenAI Request ID', run.aiError.requestId],
                        ['Client Request ID', run.aiError.clientRequestId],
                        ['Organization', run.aiError.organization],
                        ['زمان پردازش OpenAI', run.aiError.processingMs ? `${run.aiError.processingMs} ms` : undefined],
                      ].map(([label, value]) => (
                        <div key={String(label)} className="rounded-2xl border border-base-300/70 bg-base-100/70 p-3">
                          <p className="text-[11px] font-bold text-base-content/45">{String(label)}</p>
                          <p className="mt-2 break-words text-xs font-bold leading-6 text-base-content/75" dir={String(label).includes('ID') || String(label).includes('OpenAI') || String(label) === 'مدل' ? 'ltr' : 'rtl'}>
                            {formatDiagnosticValue(value)}
                          </p>
                        </div>
                      ))}
                    </div>

                    {run.aiError.endpoint ? (
                      <div className="mt-3 rounded-2xl border border-base-300/70 bg-base-100/70 p-3">
                        <p className="text-[11px] font-bold text-base-content/45">Endpoint</p>
                        <code className="mt-2 block break-all text-xs leading-6" dir="ltr">
                          {run.aiError.endpoint}
                        </code>
                      </div>
                    ) : null}

                    {run.aiError.headers && Object.keys(run.aiError.headers).length ? (
                      <details className="mt-3 rounded-2xl border border-base-300/70 bg-base-100/70 p-3">
                        <summary className="cursor-pointer text-sm font-black">هدرهای تشخیصی OpenAI و Rate Limit</summary>
                        <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-all rounded-xl bg-base-200 p-3 text-xs leading-6" dir="ltr">
                          {JSON.stringify(run.aiError.headers, null, 2)}
                        </pre>
                      </details>
                    ) : null}

                    {run.aiError.rawResponseBody || run.aiError.rawModelContent ? (
                      <details className="mt-3 rounded-2xl border border-base-300/70 bg-base-100/70 p-3">
                        <summary className="cursor-pointer text-sm font-black">بدنه خام پاسخ OpenAI</summary>
                        <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-all rounded-xl bg-base-200 p-3 text-xs leading-6" dir="ltr">
                          {run.aiError.rawResponseBody || run.aiError.rawModelContent}
                        </pre>
                      </details>
                    ) : null}

                    {run.aiError.exceptionMessage || run.aiError.childProcess?.stderrTail ? (
                      <details className="mt-3 rounded-2xl border border-base-300/70 bg-base-100/70 p-3">
                        <summary className="cursor-pointer text-sm font-black">جزئیات فنی Process/Network</summary>
                        <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-all rounded-xl bg-base-200 p-3 text-xs leading-6" dir="ltr">
                          {[
                            run.aiError.exceptionType
                              ? `exceptionType: ${run.aiError.exceptionType}`
                              : '',
                            run.aiError.exceptionMessage
                              ? `exceptionMessage: ${run.aiError.exceptionMessage}`
                              : '',
                            run.aiError.childProcess?.exitCode !== undefined
                              ? `exitCode: ${run.aiError.childProcess?.exitCode}`
                              : '',
                            run.aiError.childProcess?.signal
                              ? `signal: ${run.aiError.childProcess.signal}`
                              : '',
                            run.aiError.childProcess?.stderrTail || '',
                          ]
                            .filter(Boolean)
                            .join('\n')}
                        </pre>
                      </details>
                    ) : null}
                  </div>
                </div>
              </Card>
            ) : null}

            {run.warnings.length ? (
              <Card variant="bordered" padding="md" className="rounded-3xl border-warning/25 bg-warning/5">
                <div className="flex items-start gap-3">
                  <ExclamationTriangleIcon className="mt-1 h-5 w-5 shrink-0 text-warning" />
                  <div className="min-w-0">
                    <h2 className="font-black text-base-content">هشدارهای تحلیل</h2>
                    <ul className="mt-3 space-y-2 text-sm leading-7 text-base-content/70">
                      {run.warnings.map((warning, index) => (
                        <li key={`${warning}-${index}`} className="flex items-start gap-2">
                          <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
                          <span className="break-words">{warning}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Card variant="bordered" padding="sm" className="rounded-3xl">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <ArchiveBoxIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-base-content/45">پکیج‌های شناسایی‌شده</p>
                    <p className="mt-1 text-xl font-black">{run.packages.length.toLocaleString('fa-IR')}</p>
                  </div>
                </div>
              </Card>
              <Card variant="bordered" padding="sm" className="rounded-3xl">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-info/10 text-info">
                    <CodeBracketSquareIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-base-content/45">فریم‌ورک‌ها</p>
                    <p className="mt-1 text-xl font-black">{run.frameworks.length.toLocaleString('fa-IR')}</p>
                  </div>
                </div>
              </Card>
              <Card variant="bordered" padding="sm" className="rounded-3xl">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-success/10 text-success">
                    <FolderIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-base-content/45">فایل‌ها</p>
                    <p className="mt-1 text-xl font-black">{(run.inventory?.totalFiles || 0).toLocaleString('fa-IR')}</p>
                  </div>
                </div>
              </Card>
              <Card variant="bordered" padding="sm" className="rounded-3xl">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
                    <SparklesIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-base-content/45">روش تحلیل هوشمند</p>
                    <p className="mt-1 text-sm font-black">
                      {run.aiUsed
                        ? run.analysisQuality?.engine === 'python_multi_pass'
                          ? 'چندمرحله‌ای + reviewer'
                          : 'تک‌مرحله‌ای جایگزین'
                        : run.aiEnabled
                          ? 'انجام نشده'
                          : 'غیرفعال'}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            <Card variant="bordered" padding="md" className="rounded-3xl">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <p className="text-xs font-bold text-base-content/45">نسخه تحلیل‌شده</p>
                  <p className="mt-2 font-black" dir="ltr">{run.resolvedRef || run.requestedRef || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-base-content/45">Commit</p>
                  <button
                    type="button"
                    className="mt-2 inline-flex items-center gap-2 font-mono text-sm font-black text-primary"
                    onClick={copyCommit}
                    disabled={!run.commitSha}
                    title="کپی commit"
                  >
                    {shortCommitSha(run.commitSha)}
                    {run.commitSha ? <ClipboardDocumentIcon className="h-4 w-4" /> : null}
                  </button>
                </div>
                <div>
                  <p className="text-xs font-bold text-base-content/45">زمان شروع</p>
                  <p className="mt-2 text-sm font-black">{formatShamsiDateTime(run.startedAt || run.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-base-content/45">زمان پایان</p>
                  <p className="mt-2 text-sm font-black">{formatShamsiDateTime(run.completedAt)}</p>
                </div>
              </div>
              <div className="mt-5 rounded-2xl border border-info/20 bg-info/10 p-4 text-xs leading-7 text-base-content/65">
                دامنه این گزارش تحلیل ایستا و مقایسه با انتظارات است؛ پروژه اجرا، load test یا تست نفوذ نشده و ظرفیت عددی باید با آزمون عملی تایید شود.
              </div>
            </Card>

            <div className="overflow-x-auto rounded-2xl border border-base-300 bg-base-100 p-1">
              <div className="flex min-w-max gap-1">
                {tabItems.map((tab) => {
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-black transition',
                        active
                          ? 'bg-primary text-primary-content shadow-sm'
                          : 'text-base-content/55 hover:bg-base-200 hover:text-base-content',
                      )}
                    >
                      <tab.icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {activeTab === 'executive' ? (
              <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
                <Card variant="bordered" padding="lg" className="rounded-3xl">
                  <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <DocumentTextIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black">خلاصه مدیریتی</h2>
                      <p className="mt-1 text-xs text-base-content/50">برداشت سریع برای تصمیم‌گیری مدیریتی</p>
                    </div>
                  </div>
                  <div className="space-y-5 text-sm">
                    {renderReportText(run.executiveReport, 'خلاصه مدیریتی هنوز آماده نشده است.')}
                  </div>
                </Card>

                <div className="space-y-5">
                  <Card variant="bordered" padding="md" className="rounded-3xl">
                    <div className="flex items-center gap-3">
                      <ShieldCheckIcon className="h-6 w-6 text-success" />
                      <h2 className="font-black">معماری تشخیص‌داده‌شده</h2>
                    </div>
                    <p className="mt-4 text-xl font-black text-primary">
                      {run.architecture?.classification || 'در انتظار نتیجه'}
                    </p>
                    <div className="mt-4 flex items-center justify-between text-xs font-bold text-base-content/50">
                      <span>اطمینان تحلیل</span>
                      <span dir="ltr">{confidence}%</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-base-200">
                      <div className="h-full rounded-full bg-success" style={{ width: `${confidence}%` }} />
                    </div>
                  </Card>

                  <Card variant="bordered" padding="md" className="rounded-3xl">
                    <h2 className="font-black">فریم‌ورک‌ها و ابزارهای اصلی</h2>
                    {run.frameworks.length ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {run.frameworks.map((framework) => (
                          <span key={framework} className="rounded-xl bg-primary/10 px-3 py-2 text-xs font-black text-primary">
                            {framework}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-base-content/50">موردی شناسایی نشده است.</p>
                    )}
                  </Card>
                </div>
              </div>
            ) : null}

            {activeTab === 'readiness' ? (
              <RepositoryAssessmentPanel type="readiness" run={run} />
            ) : null}

            {activeTab === 'scalability' ? (
              <RepositoryAssessmentPanel type="scalability" run={run} />
            ) : null}

            {activeTab === 'review' ? (
              <RepositoryAssessmentPanel type="review" run={run} />
            ) : null}

            {activeTab === 'quality' ? (
              <div className="space-y-5">
                <Card variant="bordered" padding="lg" className="rounded-3xl">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <BeakerIcon className="h-6 w-6" />
                      </div>
                      <div>
                        <h2 className="text-lg font-black">روش و اعتبار تحلیل</h2>
                        <p className="mt-1 text-xs leading-6 text-base-content/50">
                          این بخش نشان می‌دهد گزارش با چه مراحلی ساخته شده و چه مقدار از نتیجه به شواهد فایل متصل است.
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-primary/10 px-3 py-2 text-xs font-black text-primary" dir="ltr">
                      {run.analysisQuality?.pipelineVersion
                        ? `pipeline ${run.analysisQuality.pipelineVersion}`
                        : 'deterministic'}
                    </span>
                  </div>

                  {!run.analysisQuality ? (
                    <div className="mt-6 rounded-2xl border border-warning/20 bg-warning/10 p-4 text-sm leading-7">
                      فراداده کیفیت برای این اجرای قدیمی ذخیره نشده است. یک تحلیل جدید آغاز کنید.
                    </div>
                  ) : (
                    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                      {[
                        {
                          label: 'موتور تحلیل',
                          value:
                            analysisEngineLabels[run.analysisQuality.engine],
                        },
                        {
                          label: 'پوشش شواهد KPI',
                          value: `${run.analysisQuality.evidenceCoveragePercent.toLocaleString('fa-IR')}٪`,
                        },
                        {
                          label: 'الزامات استخراج‌شده',
                          value: run.analysisQuality.requirementCount.toLocaleString('fa-IR'),
                        },
                        {
                          label: 'بخش‌های بررسی AI',
                          value: run.analysisQuality.moduleBatches.toLocaleString('fa-IR'),
                        },
                        {
                          label: 'فراخوانی‌های مدل',
                          value: Number(run.analysisQuality.modelCalls || 0).toLocaleString('fa-IR'),
                        },
                      ].map((item) => (
                        <div key={item.label} className="rounded-2xl border border-base-300 bg-base-200/35 p-4">
                          <p className="text-xs font-bold text-base-content/45">{item.label}</p>
                          <p className="mt-2 font-black text-base-content">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                {run.analysisQuality ? (
                  <div className="grid gap-5 xl:grid-cols-2">
                    <Card variant="bordered" padding="md" className="rounded-3xl">
                      <h2 className="font-black">مراحل اجراشده</h2>
                      <ol className="mt-5 space-y-3">
                        {run.analysisQuality.passes.map((pass, index) => (
                          <li key={`${pass}-${index}`} className="flex items-center gap-3 rounded-2xl bg-base-200/45 p-3 text-sm">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-black text-primary">
                              {(index + 1).toLocaleString('fa-IR')}
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-bold">{analysisPassLabels[pass] || pass}</p>
                              <code className="mt-1 block text-[10px] text-base-content/45" dir="ltr">{pass}</code>
                            </div>
                          </li>
                        ))}
                      </ol>
                    </Card>

                    <Card variant="bordered" padding="md" className="rounded-3xl">
                      <h2 className="font-black">کنترل reviewer مستقل</h2>
                      <div className="mt-4 space-y-4 text-sm leading-7">
                        <div className="flex items-center justify-between gap-3 rounded-2xl bg-base-200/45 p-4">
                          <span className="font-bold text-base-content/60">نتیجه reviewer</span>
                          <span className="font-black">{criticVerdictLabels[run.analysisQuality.criticVerdict]}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 rounded-2xl bg-base-200/45 p-4">
                          <span className="font-bold text-base-content/60">ادعاهای حذف‌شده یا ردشده</span>
                          <span className="font-black">{run.analysisQuality.unsupportedClaimsRemoved.toLocaleString('fa-IR')}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 rounded-2xl bg-base-200/45 p-4">
                          <span className="font-bold text-base-content/60">زمان خط لوله AI</span>
                          <span className="font-black">
                            {(run.analysisQuality.durationMs / 1000).toLocaleString('fa-IR', { maximumFractionDigits: 1 })} ثانیه
                          </span>
                        </div>
                      </div>
                    </Card>

                    <Card variant="bordered" padding="md" className="rounded-3xl xl:col-span-2">
                      <h2 className="font-black">شواهد ناقص و محدودیت‌های باقی‌مانده</h2>
                      {run.analysisQuality.missingEvidenceItems.length ? (
                        <ul className="mt-4 grid gap-3 lg:grid-cols-2">
                          {run.analysisQuality.missingEvidenceItems.map((item, index) => (
                            <li key={`${item}-${index}`} className="flex items-start gap-3 rounded-2xl border border-warning/15 bg-warning/5 p-4 text-sm leading-7">
                              <ExclamationTriangleIcon className="mt-1 h-5 w-5 shrink-0 text-warning" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-4 text-sm text-base-content/50">مورد اضافه‌ای از reviewer ثبت نشده است.</p>
                      )}
                    </Card>

                    <Card variant="bordered" padding="md" className="rounded-3xl xl:col-span-2">
                      <h2 className="font-black">فایل‌های مرجع گزارش</h2>
                      <div className="mt-4 flex max-h-72 flex-wrap gap-2 overflow-y-auto" dir="ltr">
                        {run.analysisQuality.referencedFiles.length ? (
                          run.analysisQuality.referencedFiles.map((file) => (
                            <code key={file} className="rounded-lg bg-base-200 px-2.5 py-1 text-[11px]">{file}</code>
                          ))
                        ) : (
                          <p className="text-sm text-base-content/50" dir="rtl">مسیر مرجع معتبری ثبت نشده است.</p>
                        )}
                      </div>
                    </Card>
                  </div>
                ) : null}
              </div>
            ) : null}

            {activeTab === 'architecture' ? (
              <div className="space-y-5">
                <Card variant="bordered" padding="lg" className="rounded-3xl">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold text-base-content/45">طبقه‌بندی معماری</p>
                      <h2 className="mt-2 text-2xl font-black text-primary">
                        {run.architecture?.classification || 'نامشخص'}
                      </h2>
                    </div>
                    <span className="rounded-full bg-success/10 px-4 py-2 text-sm font-black text-success" dir="ltr">
                      {confidence}% confidence
                    </span>
                  </div>
                  <p className="mt-6 leading-9 text-base-content/75">
                    {run.architecture?.summary || 'توضیح معماری هنوز آماده نشده است.'}
                  </p>
                </Card>

                <div className="grid gap-5 xl:grid-cols-2">
                  <Card variant="bordered" padding="md" className="rounded-3xl">
                    <div className="flex items-center gap-3">
                      <CheckCircleIcon className="h-6 w-6 text-success" />
                      <h2 className="text-lg font-black">نقاط قوت</h2>
                    </div>
                    <ul className="mt-5 space-y-3">
                      {(run.architecture?.strengths || []).length ? (
                        run.architecture?.strengths.map((item) => (
                          <li key={item} className="flex items-start gap-3 rounded-2xl bg-success/5 p-3 text-sm leading-7">
                            <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
                            {item}
                          </li>
                        ))
                      ) : (
                        <li className="text-sm text-base-content/50">موردی ثبت نشده است.</li>
                      )}
                    </ul>
                  </Card>

                  <Card variant="bordered" padding="md" className="rounded-3xl">
                    <div className="flex items-center gap-3">
                      <ExclamationTriangleIcon className="h-6 w-6 text-warning" />
                      <h2 className="text-lg font-black">نگرانی‌ها</h2>
                    </div>
                    <ul className="mt-5 space-y-3">
                      {(run.architecture?.concerns || []).length ? (
                        run.architecture?.concerns.map((item) => (
                          <li key={item} className="flex items-start gap-3 rounded-2xl bg-warning/5 p-3 text-sm leading-7">
                            <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
                            {item}
                          </li>
                        ))
                      ) : (
                        <li className="text-sm text-base-content/50">موردی ثبت نشده است.</li>
                      )}
                    </ul>
                  </Card>
                </div>

                <div className="grid gap-5 xl:grid-cols-2">
                  <Card variant="bordered" padding="md" className="rounded-3xl">
                    <div className="flex items-center gap-3">
                      <QueueListIcon className="h-5 w-5 text-primary" />
                      <h2 className="font-black">لایه‌ها</h2>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(run.architecture?.layers || []).length ? (
                        run.architecture?.layers.map((item) => (
                          <span key={item} className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-black text-primary">
                            {item}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-base-content/50">لایه‌ای تشخیص داده نشد.</span>
                      )}
                    </div>
                  </Card>

                  <Card variant="bordered" padding="md" className="rounded-3xl">
                    <div className="flex items-center gap-3">
                      <Squares2X2Icon className="h-5 w-5 text-secondary" />
                      <h2 className="font-black">ماژول‌ها</h2>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(run.architecture?.modules || []).length ? (
                        run.architecture?.modules.map((item) => (
                          <span key={item} className="rounded-xl border border-secondary/20 bg-secondary/5 px-3 py-2 text-xs font-black text-secondary">
                            {item}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-base-content/50">ماژولی تشخیص داده نشد.</span>
                      )}
                    </div>
                  </Card>
                </div>

                <Card variant="bordered" padding="md" className="rounded-3xl">
                  <h2 className="font-black">شواهد طبقه‌بندی</h2>
                  <ul className="mt-4 grid gap-3 lg:grid-cols-2">
                    {(run.architecture?.evidence || []).length ? (
                      run.architecture?.evidence.map((item) => (
                        <li key={item} className="rounded-2xl bg-base-200/45 p-4 font-mono text-xs leading-6" dir="ltr">
                          {item}
                        </li>
                      ))
                    ) : (
                      <li className="text-sm text-base-content/50">شواهدی ثبت نشده است.</li>
                    )}
                  </ul>
                </Card>
              </div>
            ) : null}

            {activeTab === 'packages' ? (
              <Card variant="bordered" padding="none" className="overflow-hidden rounded-3xl">
                <div className="space-y-4 border-b border-base-300 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-black">پکیج‌های پروژه</h2>
                      <p className="mt-1 text-xs text-base-content/50">وابستگی‌های اعلام‌شده در manifestهای مخزن</p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">
                      {run.packages.length.toLocaleString('fa-IR')} پکیج
                    </span>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
                    <label className="input input-bordered flex h-11 items-center gap-3 rounded-2xl">
                      <MagnifyingGlassIcon className="h-4 w-4 text-base-content/40" />
                      <input
                        type="search"
                        className="grow text-right"
                        placeholder="جستجوی نام، نسخه یا فایل manifest"
                        value={packageSearch}
                        onChange={(event) => setPackageSearch(event.target.value)}
                      />
                    </label>
                    <select
                      className="select select-bordered h-11 rounded-2xl"
                      value={packageCategory}
                      onChange={(event) => setPackageCategory(event.target.value as typeof packageCategory)}
                    >
                      <option value="all">همه دسته‌ها</option>
                      {(Object.keys(repositoryPackageCategoryLabels) as RepositoryPackageCategory[]).map((category) => (
                        <option key={category} value={category}>
                          {repositoryPackageCategoryLabels[category]} ({categoryCounts[category] || 0})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {filteredPackages.length ? (
                  <div className="overflow-x-auto">
                    <table className="table table-zebra w-full">
                      <thead>
                        <tr>
                          <th className="text-right">پکیج</th>
                          <th className="text-right">نسخه</th>
                          <th className="text-right">نوع</th>
                          <th className="text-right">اکوسیستم</th>
                          <th className="text-right">Manifest</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPackages.map((item, index) => (
                          <tr key={`${item.manifestPath}-${item.name}-${index}`}>
                            <td className="font-mono text-sm font-bold" dir="ltr">{item.name}</td>
                            <td className="font-mono text-xs" dir="ltr">{item.version || '—'}</td>
                            <td>
                              <span className="rounded-full bg-base-200 px-2.5 py-1 text-xs font-black">
                                {repositoryPackageCategoryLabels[item.category] || item.category}
                              </span>
                            </td>
                            <td className="text-sm">{item.ecosystem || '—'}</td>
                            <td className="max-w-[260px] truncate font-mono text-xs" dir="ltr" title={item.manifestPath}>
                              {item.manifestPath}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState
                    icon={ArchiveBoxIcon}
                    title="پکیجی یافت نشد"
                    description="فیلتر یا عبارت جستجو را تغییر دهید."
                  />
                )}
              </Card>
            ) : null}

            {activeTab === 'inventory' ? (
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    { label: 'کل ورودی‌ها', value: run.inventory?.totalEntries || 0, icon: CircleStackIcon },
                    { label: 'فایل‌ها', value: run.inventory?.totalFiles || 0, icon: DocumentTextIcon },
                    { label: 'پوشه‌ها', value: run.inventory?.totalDirectories || 0, icon: FolderIcon },
                    { label: 'زبان‌ها', value: run.inventory?.languages?.length || 0, icon: LanguageIcon },
                  ].map((item) => (
                    <Card key={item.label} variant="bordered" padding="sm" className="rounded-3xl">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <item.icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-base-content/45">{item.label}</p>
                          <p className="mt-1 text-lg font-black">{item.value.toLocaleString('fa-IR')}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {run.inventory?.truncated ? (
                  <div className="rounded-2xl border border-warning/25 bg-warning/10 p-4 text-sm leading-7">
                    فهرست مخزن به سقف تعیین‌شده در بک‌اند رسیده است؛ نتیجه معماری ممکن است همه فایل‌ها را پوشش نداده باشد.
                  </div>
                ) : null}

                <div className="grid gap-5 xl:grid-cols-2">
                  <Card variant="bordered" padding="md" className="rounded-3xl">
                    <h2 className="font-black">زبان‌های برنامه‌نویسی</h2>
                    <div className="mt-5 space-y-4">
                      {(run.inventory?.languages || []).length ? (
                        run.inventory?.languages.map((language) => {
                          const max = Math.max(...(run.inventory?.languages || []).map((item) => item.fileCount), 1);
                          const width = Math.max(4, Math.round((language.fileCount / max) * 100));
                          return (
                            <div key={language.name}>
                              <div className="flex items-center justify-between gap-3 text-sm font-bold">
                                <span>{language.name}</span>
                                <span>{language.fileCount.toLocaleString('fa-IR')} فایل</span>
                              </div>
                              <div className="mt-2 h-2 overflow-hidden rounded-full bg-base-200">
                                <div className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-sm text-base-content/50">زبانی شناسایی نشده است.</p>
                      )}
                    </div>
                  </Card>

                  <Card variant="bordered" padding="md" className="rounded-3xl">
                    <h2 className="font-black">فایل‌های Manifest</h2>
                    <div className="mt-4 space-y-2">
                      {(run.inventory?.manifestFiles || []).length ? (
                        run.inventory?.manifestFiles.map((file) => (
                          <div key={file} className="rounded-xl bg-base-200/50 px-3 py-2 font-mono text-xs" dir="ltr">
                            {file}
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-base-content/50">فایل manifest شناسایی نشده است.</p>
                      )}
                    </div>
                  </Card>
                </div>

                <div className="grid gap-5 xl:grid-cols-2">
                  <Card variant="bordered" padding="md" className="rounded-3xl">
                    <h2 className="font-black">پوشه‌های سطح اول</h2>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {(run.inventory?.topLevelDirectories || []).length ? (
                        run.inventory?.topLevelDirectories.map((directory) => (
                          <div key={directory} className="flex items-center gap-2 rounded-xl bg-base-200/45 px-3 py-2 font-mono text-xs" dir="ltr">
                            <FolderIcon className="h-4 w-4 shrink-0 text-warning" />
                            <span className="truncate">{directory}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-base-content/50">پوشه‌ای ثبت نشده است.</p>
                      )}
                    </div>
                  </Card>

                  <Card variant="bordered" padding="md" className="rounded-3xl">
                    <h2 className="font-black">فایل‌های منتخب برای تحلیل</h2>
                    <div className="mt-4 max-h-80 space-y-2 overflow-y-auto pl-1">
                      {(run.inventory?.selectedSourceFiles || []).length ? (
                        run.inventory?.selectedSourceFiles.map((file) => (
                          <div key={file} className="rounded-xl bg-base-200/45 px-3 py-2 font-mono text-xs" dir="ltr">
                            {file}
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-base-content/50">فایلی انتخاب نشده است.</p>
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            ) : null}

            {activeTab === 'technical' ? (
              <Card variant="bordered" padding="lg" className="rounded-3xl">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-base-200 text-base-content/70">
                    <CodeBracketIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black">گزارش فنی</h2>
                    <p className="mt-1 text-xs text-base-content/50">جزئیات مناسب برای تیم توسعه و تصمیم‌های معماری</p>
                  </div>
                </div>
                <div className="space-y-5 text-sm">
                  {renderReportText(run.technicalReport, 'گزارش فنی هنوز آماده نشده است.')}
                </div>
              </Card>
            ) : null}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

export const getServerSideProps = withAuth();
