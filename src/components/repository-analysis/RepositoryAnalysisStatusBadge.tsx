import { cn } from '@/utils/cn';
import {
  getRepositoryRunStatusClass,
  repositoryRunStatusLabels,
} from '@/utils/repository-analysis';
import type { RepositoryAnalysisRunStatus } from '@/types/repository-analysis';

interface RepositoryAnalysisStatusBadgeProps {
  status: RepositoryAnalysisRunStatus;
  className?: string;
}

export default function RepositoryAnalysisStatusBadge({
  status,
  className,
}: RepositoryAnalysisStatusBadgeProps) {
  const isActive = ['queued', 'scanning', 'analyzing'].includes(status);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black',
        getRepositoryRunStatusClass(status),
        className,
      )}
    >
      {isActive ? <span className="h-2 w-2 animate-pulse rounded-full bg-current" /> : null}
      {repositoryRunStatusLabels[status] || status}
    </span>
  );
}
