import { FormEvent, useEffect, useState } from 'react';
import {
  AdjustmentsHorizontalIcon,
  BeakerIcon,
  CpuChipIcon,
  DocumentArrowUpIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { Button, Input } from '@/components/ui';
import type {
  RepositoryConnection,
  StartRepositoryAnalysisPayload,
} from '@/types/repository-analysis';

interface StartRepositoryAnalysisModalProps {
  open: boolean;
  repository: RepositoryConnection | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (payload: StartRepositoryAnalysisPayload) => Promise<void> | void;
}

const toOptionalNumber = (value: string): number | undefined => {
  const normalized = value.trim();
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export default function StartRepositoryAnalysisModal({
  open,
  repository,
  isSubmitting = false,
  onClose,
  onSubmit,
}: StartRepositoryAnalysisModalProps) {
  const [ref, setRef] = useState('');
  const [useAi, setUseAi] = useState(true);
  const [expectationsFile, setExpectationsFile] = useState<File | null>(null);
  const [expectationsText, setExpectationsText] = useState('');
  const [showCapacityTargets, setShowCapacityTargets] = useState(false);
  const [concurrentUsers, setConcurrentUsers] = useState('');
  const [requestsPerSecond, setRequestsPerSecond] = useState('');
  const [targetLatencyMs, setTargetLatencyMs] = useState('');
  const [availabilityPercent, setAvailabilityPercent] = useState('');
  const [dataVolume, setDataVolume] = useState('');
  const [growthHorizonMonths, setGrowthHorizonMonths] = useState('');

  useEffect(() => {
    if (!open) return;
    setRef(repository?.defaultBranch || '');
    setUseAi(true);
    setExpectationsFile(null);
    setExpectationsText('');
    setShowCapacityTargets(false);
    setConcurrentUsers('');
    setRequestsPerSecond('');
    setTargetLatencyMs('');
    setAvailabilityPercent('');
    setDataVolume('');
    setGrowthHorizonMonths('');
  }, [open, repository]);

  if (!open || !repository) return null;

  const handleFileChange = (file: File | null) => {
    if (file && file.size > 512 * 1024) {
      toast.error('حجم فایل انتظارات باید کمتر از ۵۱۲ کیلوبایت باشد.');
      setExpectationsFile(null);
      return;
    }

    setExpectationsFile(file);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    await onSubmit({
      ref: ref.trim() || undefined,
      useAi,
      expectationsFile,
      expectationsText: expectationsText.trim() || undefined,
      concurrentUsers: toOptionalNumber(concurrentUsers),
      requestsPerSecond: toOptionalNumber(requestsPerSecond),
      targetLatencyMs: toOptionalNumber(targetLatencyMs),
      availabilityPercent: toOptionalNumber(availabilityPercent),
      dataVolume: dataVolume.trim() || undefined,
      growthHorizonMonths: toOptionalNumber(growthHorizonMonths),
    });
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      dir="rtl"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="بستن"
        onClick={onClose}
      />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-base-300 bg-base-100 p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <BeakerIcon className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-base-content">
                تحلیل آمادگی و معماری پروژه
              </h2>
              <p className="mt-1 text-sm text-base-content/55">{repository.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-square btn-sm rounded-xl"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 space-y-5">
          <Input
            label="Branch، Tag یا Commit"
            value={ref}
            onChange={(event) => setRef(event.target.value)}
            placeholder={repository.defaultBranch || 'main'}
            hint="در صورت خالی بودن، شاخه پیش‌فرض مخزن تحلیل می‌شود."
            dir="ltr"
            className="text-left"
          />

          <div className="rounded-3xl border border-base-300 bg-base-200/25 p-5">
            <div className="flex items-start gap-3">
              <DocumentArrowUpIcon className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
              <div>
                <h3 className="font-black text-base-content">انتظارات و معیارهای پذیرش پروژه</h3>
                <p className="mt-1 text-xs leading-6 text-base-content/55">
                  فایل انتظارات مبنای مقایسه پروژه، تشخیص شکاف‌ها و تعیین آمادگی خواهد بود.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <label className="form-control rounded-2xl border border-dashed border-base-300 bg-base-100 p-4">
                <span className="label-text text-sm font-black">فایل انتظارات</span>
                <input
                  type="file"
                  accept=".txt,.md,.markdown,.json,.yaml,.yml,.csv,.xml,.html,.htm,.log"
                  className="file-input file-input-bordered mt-3 w-full bg-base-100"
                  onChange={(event) => handleFileChange(event.target.files?.[0] || null)}
                />
                <span className="mt-2 text-[11px] leading-5 text-base-content/45">
                  فرمت‌های متنی تا ۵۱۲ کیلوبایت. برای PDF یا Word، متن را در بخش مقابل وارد کنید.
                </span>
                {expectationsFile ? (
                  <span className="mt-2 rounded-xl bg-success/10 px-3 py-2 text-xs font-bold text-success">
                    {expectationsFile.name}
                  </span>
                ) : null}
              </label>

              <label className="form-control">
                <span className="label-text text-sm font-black">توضیحات تکمیلی</span>
                <textarea
                  value={expectationsText}
                  onChange={(event) => setExpectationsText(event.target.value)}
                  className="textarea textarea-bordered mt-3 min-h-36 w-full rounded-2xl bg-base-100 leading-7"
                  placeholder="مثال: ثبت ۱۰ هزار کاربر، پاسخ زیر ۳۰۰ میلی‌ثانیه، دسترس‌پذیری ۹۹.۹٪، گزارش مدیریتی و کنترل دسترسی..."
                />
              </label>
            </div>
          </div>

          <div className="rounded-3xl border border-base-300 bg-base-200/25 p-5">
            <button
              type="button"
              onClick={() => setShowCapacityTargets((current) => !current)}
              className="flex w-full items-center justify-between gap-3 text-right"
            >
              <div className="flex items-start gap-3">
                <AdjustmentsHorizontalIcon className="mt-0.5 h-6 w-6 shrink-0 text-secondary" />
                <div>
                  <h3 className="font-black text-base-content">اهداف بار و ظرفیت</h3>
                  <p className="mt-1 text-xs leading-6 text-base-content/55">
                    برای ارزیابی فشار، اعداد هدف را وارد کنید؛ نتیجه بدون load test تخمینی خواهد بود.
                  </p>
                </div>
              </div>
              <span className="text-xs font-black text-primary">
                {showCapacityTargets ? 'بستن' : 'تکمیل اهداف'}
              </span>
            </button>

            {showCapacityTargets ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Input
                  label="کاربران همزمان"
                  type="number"
                  min="1"
                  value={concurrentUsers}
                  onChange={(event) => setConcurrentUsers(event.target.value)}
                  placeholder="1000"
                  dir="ltr"
                />
                <Input
                  label="درخواست در ثانیه"
                  type="number"
                  min="0"
                  step="0.01"
                  value={requestsPerSecond}
                  onChange={(event) => setRequestsPerSecond(event.target.value)}
                  placeholder="250"
                  dir="ltr"
                />
                <Input
                  label="تاخیر هدف (ms)"
                  type="number"
                  min="1"
                  value={targetLatencyMs}
                  onChange={(event) => setTargetLatencyMs(event.target.value)}
                  placeholder="300"
                  dir="ltr"
                />
                <Input
                  label="دسترس‌پذیری هدف (%)"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={availabilityPercent}
                  onChange={(event) => setAvailabilityPercent(event.target.value)}
                  placeholder="99.9"
                  dir="ltr"
                />
                <Input
                  label="افق رشد (ماه)"
                  type="number"
                  min="1"
                  value={growthHorizonMonths}
                  onChange={(event) => setGrowthHorizonMonths(event.target.value)}
                  placeholder="24"
                  dir="ltr"
                />
                <Input
                  label="حجم داده هدف"
                  value={dataVolume}
                  onChange={(event) => setDataVolume(event.target.value)}
                  placeholder="مثال: ۵۰ میلیون رکورد"
                />
              </div>
            ) : null}
          </div>

          <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-base-300 bg-base-200/35 p-4">
            <div className="flex items-start gap-3">
              <CpuChipIcon className="mt-1 h-5 w-5 shrink-0 text-primary" />
              <div>
                <span className="font-black text-base-content">تحلیل عمیق چندمرحله‌ای با OpenAI</span>
                <p className="mt-1 text-xs leading-6 text-base-content/55">
                  الزامات را استخراج می‌کند، فایل‌ها را در چند بخش بررسی می‌کند، یک reviewer مستقل ادعاهای بدون شواهد را حذف می‌کند و سپس گزارش فارسی نهایی را می‌سازد.
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              className="toggle toggle-primary mt-1"
              checked={useAi}
              onChange={(event) => setUseAi(event.target.checked)}
            />
          </label>

          <div className="rounded-2xl border border-warning/20 bg-warning/10 p-4 text-xs leading-6 text-base-content/65">
            این مرحله پروژه را اجرا یا load test نمی‌کند. تحلیل عمیق چند فراخوانی AI دارد و برای دقت بیشتر، هر نتیجه مهم باید به مسیر واقعی فایل متصل باشد. ظرفیت عددی همچنان فقط با تست بار تایید می‌شود.
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            انصراف
          </Button>
          <Button type="submit" isLoading={isSubmitting} loadingText="در حال ایجاد تحلیل...">
            شروع تحلیل
          </Button>
        </div>
      </form>
    </div>
  );
}
