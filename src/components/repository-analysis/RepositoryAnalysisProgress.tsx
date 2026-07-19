import type { RepositoryAnalysisRun } from '@/types/repository-analysis';
import { cn } from '@/utils/cn';
import { repositoryRunStageLabels } from '@/utils/repository-analysis';

interface RepositoryAnalysisProgressProps {
  run: RepositoryAnalysisRun;
  compact?: boolean;
}

export default function RepositoryAnalysisProgress({
  run,
  compact = false,
}: RepositoryAnalysisProgressProps) {
  const progress = Math.max(0, Math.min(100, Number(run.progressPercent || 0)));
  const failed = run.status === 'failed';

  return (
    <div className={cn('space-y-2', compact ? 'min-w-[180px]' : '')}>
      <div className="flex items-center justify-between gap-3 text-xs font-bold text-base-content/60">
        <span>{repositoryRunStageLabels[run.currentStage] || run.currentStage || 'در انتظار'}</span>
        <span dir="ltr">{progress}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-base-200">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            failed ? 'bg-error' : 'bg-primary',
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
