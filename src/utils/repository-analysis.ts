import type {
  RepositoryAnalysisRun,
  RepositoryAnalysisRunStatus,
  RepositoryConnection,
  RepositoryConnectionReference,
  RepositoryPackageCategory,
  RepositoryProjectReference,
} from '@/types/repository-analysis';

export const repositoryRunStatusLabels: Record<RepositoryAnalysisRunStatus, string> = {
  queued: 'در صف',
  scanning: 'در حال اسکن',
  analyzing: 'تحلیل هوشمند',
  completed: 'تکمیل‌شده',
  partially_completed: 'تکمیل نسبی',
  failed: 'ناموفق',
};

export const repositoryRunStageLabels: Record<string, string> = {
  queued: 'در انتظار شروع',
  resolving_repository: 'بررسی اتصال مخزن',
  resolving_commit: 'تعیین نسخه دقیق',
  reading_repository_tree: 'خواندن ساختار مخزن',
  detecting_packages_and_architecture: 'شناسایی پکیج‌ها و معماری',
  ai_architecture_review: 'آماده‌سازی تحلیل هوش مصنوعی',
  ai_requirements_extraction: 'استخراج دقیق الزامات و KPIها',
  ai_evidence_review: 'بازبینی شواهد کد در چند بخش',
  ai_candidate_synthesis: 'ساخت ارزیابی اولیه',
  ai_critic_review: 'نقد مستقل و حذف ادعاهای بدون شواهد',
  ai_final_synthesis: 'تولید گزارش نهایی فارسی',
  ai_schema_repair: 'اصلاح ساختار خروجی و تکمیل KPIهای جاافتاده',
  ai_fallback_review: 'اجرای تحلیل جایگزین',
  finalizing: 'آماده‌سازی گزارش',
  completed: 'تحلیل تکمیل شد',
  failed: 'تحلیل ناموفق بود',
};

export const repositoryPackageCategoryLabels: Record<RepositoryPackageCategory, string> = {
  runtime: 'اجرایی',
  development: 'توسعه',
  peer: 'همتا',
  optional: 'اختیاری',
  unknown: 'نامشخص',
};

export const activeRepositoryRunStatuses: RepositoryAnalysisRunStatus[] = [
  'queued',
  'scanning',
  'analyzing',
];

export const getEntityId = (value: unknown): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;

  const entity = value as { id?: string; _id?: string };
  return entity.id || entity._id || '';
};

export const getRepositoryProject = (
  repository?: RepositoryConnection | null,
): RepositoryProjectReference | null => {
  if (!repository || typeof repository.projectId === 'string') return null;
  return repository.projectId;
};

export const getRunProject = (
  run?: RepositoryAnalysisRun | null,
): RepositoryProjectReference | null => {
  if (!run || typeof run.projectId === 'string') return null;
  return run.projectId;
};

export const getRunRepository = (
  run?: RepositoryAnalysisRun | null,
): RepositoryConnectionReference | null => {
  if (!run || typeof run.repositoryId === 'string') return null;
  return run.repositoryId;
};

export const isRepositoryRunActive = (
  status?: RepositoryAnalysisRunStatus | null,
): boolean => Boolean(status && activeRepositoryRunStatuses.includes(status));


export const getRepositoryRunStatusClass = (
  status: RepositoryAnalysisRunStatus,
): string => {
  switch (status) {
    case 'completed':
      return 'border-success/20 bg-success/10 text-success';
    case 'partially_completed':
      return 'border-warning/20 bg-warning/10 text-warning';
    case 'failed':
      return 'border-error/20 bg-error/10 text-error';
    case 'queued':
      return 'border-info/20 bg-info/10 text-info';
    case 'scanning':
    case 'analyzing':
      return 'border-primary/20 bg-primary/10 text-primary';
    default:
      return 'border-base-300 bg-base-200 text-base-content/70';
  }
};

export const getArchitectureConfidencePercent = (confidence?: number): number => {
  const value = Number(confidence || 0);
  if (!Number.isFinite(value)) return 0;
  if (value <= 1) return Math.round(Math.max(0, Math.min(1, value)) * 100);
  return Math.round(Math.max(0, Math.min(100, value)));
};


export const getRepositoryWebUrl = (
  repository?: RepositoryConnection | RepositoryConnectionReference | null,
): string => {
  if (!repository) return '';
  const path = String(repository.gitlabProjectPath || '').replace(/^\/+|\/+$/g, '');
  const baseUrl =
    'gitlabBaseUrl' in repository
      ? String(repository.gitlabBaseUrl || '').replace(/\/+$/g, '')
      : '';

  if (baseUrl && path) return `${baseUrl}/${path}`;

  const cloneUrl = String(repository.repositoryUrl || '');
  return /^https?:\/\//i.test(cloneUrl) ? cloneUrl.replace(/\.git$/i, '') : '';
};

export const shortCommitSha = (commitSha?: string): string => {
  if (!commitSha) return '—';
  return commitSha.slice(0, 8);
};
