import type { CSSProperties } from 'react';
import {
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  ScaleIcon,
  ShieldExclamationIcon,
  WrenchScrewdriverIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { Card } from '@/components/ui';
import type {
  RepositoryAnalysisRun,
  RepositoryCodeReviewFinding,
  RepositoryRecommendation,
  RepositoryRequirementStatus,
} from '@/types/repository-analysis';
import { cn } from '@/utils/cn';

export type RepositoryAssessmentPanelType = 'readiness' | 'scalability' | 'review';

const readinessLabels = {
  ready: 'آماده',
  conditionally_ready: 'آماده مشروط',
  not_ready: 'آماده نیست',
  insufficient_evidence: 'شواهد ناکافی',
};

const scalabilityLabels = {
  likely_sufficient: 'احتمالاً کافی',
  conditionally_sufficient: 'کافی با شرط',
  unlikely_sufficient: 'احتمالاً ناکافی',
  insufficient_evidence: 'شواهد ناکافی',
};

const requirementStatusLabels: Record<RepositoryRequirementStatus, string> = {
  met: 'تامین شده',
  partial: 'ناقص',
  not_met: 'تامین نشده',
  unknown: 'نامشخص',
};

const statusClasses: Record<RepositoryRequirementStatus, string> = {
  met: 'bg-success/10 text-success',
  partial: 'bg-warning/10 text-warning',
  not_met: 'bg-error/10 text-error',
  unknown: 'bg-base-200 text-base-content/55',
};

const severityClasses: Record<RepositoryCodeReviewFinding['severity'], string> = {
  critical: 'bg-error text-error-content',
  high: 'bg-error/15 text-error',
  medium: 'bg-warning/15 text-warning',
  low: 'bg-info/15 text-info',
  info: 'bg-base-200 text-base-content/60',
};

const severityLabels: Record<RepositoryCodeReviewFinding['severity'], string> = {
  critical: 'بحرانی',
  high: 'زیاد',
  medium: 'متوسط',
  low: 'کم',
  info: 'اطلاعاتی',
};


const workloadTargetLabels: Record<string, string> = {
  concurrentUsers: 'کاربران همزمان',
  requestsPerSecond: 'درخواست در ثانیه',
  targetLatencyMs: 'تاخیر هدف (ms)',
  availabilityPercent: 'دسترس‌پذیری (%)',
  dataVolume: 'حجم داده',
  growthHorizonMonths: 'افق رشد (ماه)',
};

const priorityLabels: Record<RepositoryRecommendation['priority'], string> = {
  critical: 'بحرانی',
  high: 'زیاد',
  medium: 'متوسط',
  low: 'کم',
};

function ScoreRing({ value, label }: { value: number; label: string }) {
  const score = Math.max(0, Math.min(100, Math.round(value || 0)));

  return (
    <div className="rounded-3xl border border-base-300 bg-base-100 p-5 text-center">
      <div
        className="radial-progress text-primary"
        style={{ '--value': score, '--size': '6rem', '--thickness': '0.55rem' } as CSSProperties}
        role="progressbar"
        aria-valuenow={score}
      >
        <span className="text-lg font-black text-base-content">{score.toLocaleString('fa-IR')}٪</span>
      </div>
      <p className="mt-3 text-xs font-black text-base-content/55">{label}</p>
    </div>
  );
}

function BulletList({ items, empty }: { items: string[]; empty: string }) {
  if (!items.length) return <p className="text-sm text-base-content/45">{empty}</p>;

  return (
    <ul className="space-y-3">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="flex items-start gap-3 text-sm leading-7 text-base-content/70">
          <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function RepositoryAssessmentPanel({
  type,
  run,
}: {
  type: RepositoryAssessmentPanelType;
  run: RepositoryAnalysisRun;
}) {
  if (type === 'readiness') {
    const assessment = run.readinessAssessment;

    if (!assessment) {
      return (
        <Card variant="bordered" padding="md" className="rounded-3xl">
          <p className="text-sm text-base-content/50">ارزیابی آمادگی هنوز آماده نشده است.</p>
        </Card>
      );
    }

    return (
      <div className="space-y-5">
        <div className="grid gap-5 xl:grid-cols-[220px_1fr]">
          <ScoreRing value={assessment.score} label="امتیاز آمادگی" />
          <Card variant="bordered" padding="md" className="rounded-3xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <ScaleIcon className="h-6 w-6 text-primary" />
                <h2 className="text-lg font-black">نتیجه آمادگی پروژه</h2>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">
                {readinessLabels[assessment.verdict]}
              </span>
            </div>
            <p className="mt-5 text-sm leading-8 text-base-content/70">{assessment.summary}</p>
            <p className="mt-3 text-xs font-bold text-base-content/45">
              اطمینان ارزیابی: {Math.round(assessment.confidence * 100).toLocaleString('fa-IR')}٪
            </p>
          </Card>
        </div>

        {run.expectations?.provided ? (
          <Card variant="bordered" padding="md" className="rounded-3xl">
            <div className="flex items-center gap-3">
              <CheckCircleIcon className="h-6 w-6 text-success" />
              <div>
                <h2 className="font-black">مبنای انتظارات</h2>
                <p className="mt-1 text-xs text-base-content/50">
                  {run.expectations.fileName || 'توضیحات متنی'} · {run.expectations.contentLength.toLocaleString('fa-IR')} کاراکتر
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {Object.entries(run.expectations.workloadTargets || {})
                .filter(([, value]) => value !== null && value !== undefined && value !== '')
                .map(([key, value]) => (
                  <span key={key} className="rounded-xl bg-base-200 px-3 py-2 text-xs font-bold">
                    {workloadTargetLabels[key] || key}: {String(value)}
                  </span>
                ))}
            </div>
          </Card>
        ) : (
          <div className="rounded-2xl border border-warning/25 bg-warning/10 p-4 text-sm leading-7">
            فایل یا متن انتظارات برای این تحلیل ارسال نشده است؛ نتیجه آمادگی محدود خواهد بود.
          </div>
        )}

        <Card variant="bordered" padding="none" className="overflow-hidden rounded-3xl">
          <div className="border-b border-base-300 px-6 py-5">
            <h2 className="text-lg font-black">انطباق با انتظارات</h2>
            <p className="mt-1 text-xs text-base-content/50">هر مورد فقط بر اساس شواهد واقعی مخزن ارزیابی شده است.</p>
          </div>
          {assessment.matchedExpectations.length ? (
            <div className="divide-y divide-base-300">
              {assessment.matchedExpectations.map((item, index) => (
                <div key={`${item.expectation}-${index}`} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="max-w-3xl">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        {item.id ? (
                          <code className="rounded-lg bg-base-200 px-2 py-1 text-[10px] font-black" dir="ltr">
                            {item.id}
                          </code>
                        ) : null}
                        {item.category ? (
                          <span className="rounded-full bg-info/10 px-2.5 py-1 text-[10px] font-black text-info">
                            {item.category}
                          </span>
                        ) : null}
                        {item.priority ? (
                          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-black text-primary">
                            اولویت {priorityLabels[item.priority]}
                          </span>
                        ) : null}
                        {item.hardGate ? (
                          <span className="rounded-full bg-error/10 px-2.5 py-1 text-[10px] font-black text-error">
                            شرط حیاتی
                          </span>
                        ) : null}
                      </div>
                      <h3 className="font-black leading-7">{item.expectation}</h3>
                    </div>
                    <span className={cn('rounded-full px-3 py-1 text-xs font-black', statusClasses[item.status])}>
                      {requirementStatusLabels[item.status]}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-base-content/65">{item.explanation}</p>
                  {item.evidence.length ? (
                    <div className="mt-3 flex flex-wrap gap-2" dir="ltr">
                      {item.evidence.map((evidence) => (
                        <code key={evidence} className="rounded-lg bg-base-200 px-2.5 py-1 text-[11px]">{evidence}</code>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-sm text-base-content/50">موردی از فایل انتظارات استخراج نشده است.</div>
          )}
        </Card>

        <div className="grid gap-5 xl:grid-cols-2">
          <Card variant="bordered" padding="md" className="rounded-3xl border-error/15">
            <div className="flex items-center gap-3">
              <XCircleIcon className="h-6 w-6 text-error" />
              <h2 className="font-black">مسدودکننده‌ها و شکاف‌ها</h2>
            </div>
            <div className="mt-5 space-y-5">
              <BulletList items={assessment.blockers} empty="مسدودکننده قطعی ثبت نشده است." />
              <div className="border-t border-base-300 pt-5">
                <BulletList items={assessment.gaps} empty="شکاف مشخصی ثبت نشده است." />
              </div>
            </div>
          </Card>

          <Card variant="bordered" padding="md" className="rounded-3xl">
            <div className="flex items-center gap-3">
              <WrenchScrewdriverIcon className="h-6 w-6 text-primary" />
              <h2 className="font-black">راهکارهای پیشنهادی</h2>
            </div>
            <div className="mt-5 space-y-4">
              {assessment.recommendations.length ? assessment.recommendations.map((item, index) => (
                <div key={`${item.title}-${index}`} className="rounded-2xl bg-base-200/45 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-black">{item.title}</h3>
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-black text-primary">
                      {priorityLabels[item.priority]}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-6 text-base-content/60">{item.description}</p>
                  <p className="mt-3 text-sm font-bold leading-7 text-base-content/75">{item.suggestedSolution}</p>
                </div>
              )) : <p className="text-sm text-base-content/45">راهکاری ثبت نشده است.</p>}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (type === 'scalability') {
    const assessment = run.scalabilityAssessment;

    if (!assessment) {
      return <Card variant="bordered" padding="md" className="rounded-3xl"><p className="text-sm text-base-content/50">ارزیابی ظرفیت هنوز آماده نشده است.</p></Card>;
    }

    return (
      <div className="space-y-5">
        <Card variant="bordered" padding="md" className="rounded-3xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <ArrowTrendingUpIcon className="h-6 w-6 text-secondary" />
              <h2 className="text-lg font-black">تحمل بار و مقیاس‌پذیری</h2>
            </div>
            <span className="rounded-full bg-secondary/10 px-3 py-1 text-xs font-black text-secondary">
              {scalabilityLabels[assessment.verdict]}
            </span>
          </div>
          <p className="mt-5 text-sm leading-8 text-base-content/70">{assessment.summary}</p>
          <div className="mt-5 rounded-2xl border border-warning/25 bg-warning/10 p-4 text-xs leading-7">
            این نتیجه ظرفیت عددی را تضمین نمی‌کند؛ بدون load test و telemetry فقط ریسک معماری قابل ارزیابی است.
          </div>
        </Card>

        <div className="grid gap-5 xl:grid-cols-2">
          <Card variant="bordered" padding="md" className="rounded-3xl">
            <h2 className="font-black">فرضیات بار</h2>
            <div className="mt-4"><BulletList items={assessment.workloadAssumptions} empty="هدف بار مشخص نشده است." /></div>
          </Card>
          <Card variant="bordered" padding="md" className="rounded-3xl">
            <h2 className="font-black">نقاط قوت معماری</h2>
            <div className="mt-4"><BulletList items={assessment.strengths} empty="نقطه قوت قطعی ثبت نشده است." /></div>
          </Card>
          <Card variant="bordered" padding="md" className="rounded-3xl border-warning/15">
            <h2 className="font-black">گلوگاه‌ها و ریسک ظرفیت</h2>
            <div className="mt-4 space-y-5">
              <BulletList items={assessment.bottlenecks} empty="گلوگاه مشخصی ثبت نشده است." />
              <div className="border-t border-base-300 pt-5"><BulletList items={assessment.capacityRisks} empty="ریسکی ثبت نشده است." /></div>
            </div>
          </Card>
          <Card variant="bordered" padding="md" className="rounded-3xl border-success/15">
            <h2 className="font-black">معماری و اصلاحات پیشنهادی</h2>
            <div className="mt-4"><BulletList items={assessment.recommendedArchitecture} empty="اصلاحی ثبت نشده است." /></div>
          </Card>
        </div>

        <Card variant="bordered" padding="md" className="rounded-3xl">
          <div className="flex items-center gap-3">
            <ClockIcon className="h-6 w-6 text-info" />
            <h2 className="font-black">برنامه تایید ظرفیت</h2>
          </div>
          <ol className="mt-5 grid gap-3 lg:grid-cols-2">
            {assessment.validationPlan.map((item, index) => (
              <li key={`${item}-${index}`} className="flex gap-3 rounded-2xl bg-base-200/45 p-4 text-sm leading-7">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-info/10 text-xs font-black text-info">
                  {(index + 1).toLocaleString('fa-IR')}
                </span>
                {item}
              </li>
            ))}
          </ol>
        </Card>
      </div>
    );
  }

  const assessment = run.codeReviewAssessment;

  if (!assessment) {
    return <Card variant="bordered" padding="md" className="rounded-3xl"><p className="text-sm text-base-content/50">بازبینی کد هنوز آماده نشده است.</p></Card>;
  }

  const scoreItems = [
    { label: 'امتیاز کل', value: assessment.overallScore },
    { label: 'نگهداشت‌پذیری', value: assessment.maintainabilityScore },
    { label: 'قابلیت اطمینان', value: assessment.reliabilityScore },
    { label: 'امنیت', value: assessment.securityScore },
    { label: 'کارایی', value: assessment.performanceScore },
  ];

  return (
    <div className="space-y-5">
      <Card variant="bordered" padding="md" className="rounded-3xl">
        <div className="flex items-center gap-3">
          <EyeIcon className="h-6 w-6 text-primary" />
          <h2 className="text-lg font-black">بازخورد observer درباره کیفیت کد</h2>
        </div>
        <p className="mt-4 text-sm leading-8 text-base-content/70">{assessment.summary}</p>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {scoreItems.map((item) => <ScoreRing key={item.label} value={item.value} label={item.label} />)}
      </div>

      <Card variant="bordered" padding="md" className="rounded-3xl">
        <div className="flex items-center gap-3">
          <CheckCircleIcon className="h-6 w-6 text-success" />
          <h2 className="font-black">نقاط قوت کدنویسی</h2>
        </div>
        <div className="mt-4"><BulletList items={assessment.strengths} empty="نقطه قوت مشخصی ثبت نشده است." /></div>
      </Card>

      <Card variant="bordered" padding="none" className="overflow-hidden rounded-3xl">
        <div className="border-b border-base-300 px-6 py-5">
          <div className="flex items-center gap-3">
            <ShieldExclamationIcon className="h-6 w-6 text-warning" />
            <div>
              <h2 className="text-lg font-black">یافته‌های بازبینی</h2>
              <p className="mt-1 text-xs text-base-content/50">یافته‌های AI باید پیش از ثبت defect توسط تیم فنی تایید شوند.</p>
            </div>
          </div>
        </div>
        {assessment.findings.length ? (
          <div className="divide-y divide-base-300">
            {assessment.findings.map((finding, index) => (
              <div key={`${finding.title}-${index}`} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-base-content/45">{finding.category}</p>
                    <h3 className="mt-1 font-black leading-7">{finding.title}</h3>
                  </div>
                  <span className={cn('rounded-full px-3 py-1 text-xs font-black', severityClasses[finding.severity])}>
                    {severityLabels[finding.severity]}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-base-content/65">{finding.description}</p>
                <div className="mt-4 rounded-2xl bg-primary/5 p-4 text-sm leading-7">
                  <span className="font-black text-primary">راهکار: </span>
                  {finding.recommendation}
                </div>
                {finding.evidencePaths.length ? (
                  <div className="mt-3 flex flex-wrap gap-2" dir="ltr">
                    {finding.evidencePaths.map((path) => (
                      <code key={path} className="rounded-lg bg-base-200 px-2.5 py-1 text-[11px]">{path}</code>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : <div className="p-6 text-sm text-base-content/50">یافته‌ای ثبت نشده است.</div>}
      </Card>
    </div>
  );
}
