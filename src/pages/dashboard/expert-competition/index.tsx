import ShamsiDateInput from '@/components/common/ShamsiDateInput';
import { UserAvatar } from '@/components/common';
import {
  DashboardPageHeader,
  SectionCard,
} from '@/components/common/DashboardUi';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import expertWorkReportService from '@/services/expert-work-report.service';
import type {
  ExpertLeaderboard,
  ExpertLeaderboardFilters,
  ExpertLeaderboardRow,
} from '@/types/expert-work-report';
import { getEntityLabel } from '@/types/expert-work-log';
import { formatShamsiFullDate } from '@/utils/shamsi-date';
import { withAuth } from '@/utils/withAuth';
import {
  ArrowPathIcon,
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  BoltIcon,
  CalendarDaysIcon,
  CheckBadgeIcon,
  ClockIcon,
  DocumentCheckIcon,
  FireIcon,
  FlagIcon,
  LockClosedIcon,
  MinusIcon,
  RocketLaunchIcon,
  SparklesIcon,
  StarIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

const EMPTY: ExpertLeaderboard = {
  period: {
    dateFrom: '',
    dateTo: '',
    previousDateFrom: '',
    previousDateTo: '',
    dayCount: 30,
  },
  scoring: {
    activeDaysWeight: 35,
    durationWeight: 30,
    entriesWeight: 15,
    deliverablesWeight: 10,
    progressWeight: 10,
    note: '',
  },
  summary: {
    expertCount: 0,
    activeExpertCount: 0,
    inactiveExpertCount: 0,
    averageScore: 0,
    totalDurationMinutes: 0,
    totalEntries: 0,
  },
  mostActive: null,
  leastActive: null,
  rows: [],
};

const toDateOnly = (date: Date) => date.toISOString().slice(0, 10);

const getPreset = (days: number): ExpertLeaderboardFilters => {
  const dateTo = new Date();
  const dateFrom = new Date(dateTo);
  dateFrom.setUTCDate(dateFrom.getUTCDate() - (days - 1));
  return { dateFrom: toDateOnly(dateFrom), dateTo: toDateOnly(dateTo) };
};

const formatDuration = (minutes: number) => {
  const value = Math.max(Number(minutes || 0), 0);
  const hours = Math.floor(value / 60);
  const rest = value % 60;
  if (!value) return '۰ دقیقه';
  if (hours && rest) {
    return `${hours.toLocaleString('fa-IR')} ساعت و ${rest.toLocaleString('fa-IR')} دقیقه`;
  }
  if (hours) return `${hours.toLocaleString('fa-IR')} ساعت`;
  return `${rest.toLocaleString('fa-IR')} دقیقه`;
};

const getLevelLabel = (row: ExpertLeaderboardRow) => {
  switch (row.level) {
    case 'champion':
      return 'لیگ قهرمانان';
    case 'high':
      return 'لیگ طلایی';
    case 'steady':
      return 'لیگ نقره‌ای';
    case 'low':
      return 'لیگ برنزی';
    default:
      return 'شروع رقابت';
  }
};

const getLevelTone = (row: ExpertLeaderboardRow) => {
  switch (row.level) {
    case 'champion':
      return 'border-warning/40 bg-warning/10 text-warning';
    case 'high':
      return 'border-success/40 bg-success/10 text-success';
    case 'steady':
      return 'border-info/40 bg-info/10 text-info';
    case 'low':
      return 'border-primary/30 bg-primary/10 text-primary';
    default:
      return 'border-base-300 bg-base-200 text-base-content/55';
  }
};

const RankMovement = ({ row }: { row: ExpertLeaderboardRow }) => {
  if (row.rankChange === null) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-base-content/45">
        <MinusIcon className="h-4 w-4" /> بدون مقایسه
      </span>
    );
  }
  if (row.rankChange > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-black text-success">
        <ArrowTrendingUpIcon className="h-4 w-4" />
        {row.rankChange.toLocaleString('fa-IR')} رتبه صعود
      </span>
    );
  }
  if (row.rankChange < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-black text-error">
        <ArrowTrendingDownIcon className="h-4 w-4" />
        {Math.abs(row.rankChange).toLocaleString('fa-IR')} رتبه افت
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold text-base-content/45">
      <MinusIcon className="h-4 w-4" /> بدون تغییر
    </span>
  );
};

const ScoreRing = ({ score }: { score: number }) => {
  const safeScore = Math.min(Math.max(Math.round(score || 0), 0), 100);
  return (
    <div className="relative flex h-40 w-40 items-center justify-center">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120" aria-hidden="true">
        <circle
          cx="60"
          cy="60"
          r="50"
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          className="text-base-100/20"
        />
        <circle
          cx="60"
          cy="60"
          r="50"
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          strokeLinecap="round"
          pathLength="100"
          strokeDasharray={`${safeScore} ${100 - safeScore}`}
          className="text-warning drop-shadow-[0_0_10px_rgba(251,191,36,0.65)] transition-all duration-700"
        />
      </svg>
      <div className="absolute text-center text-white">
        <div className="text-4xl font-black">{safeScore.toLocaleString('fa-IR')}</div>
        <div className="mt-1 text-xs font-bold text-white/65">از ۱۰۰ امتیاز</div>
      </div>
    </div>
  );
};

const PodiumCard = ({ row }: { row: ExpertLeaderboardRow }) => {
  const isFirst = row.rank === 1;
  const isSecond = row.rank === 2;
  const orderClass = isFirst ? 'order-1 md:order-2' : isSecond ? 'order-2 md:order-1' : 'order-3';
  const heightClass = isFirst ? 'md:min-h-[292px] md:-translate-y-5' : 'md:min-h-[250px]';
  const surfaceClass = isFirst
    ? 'border-warning/50 bg-gradient-to-b from-warning/25 via-base-100 to-base-100 shadow-[0_22px_55px_-30px_rgba(245,158,11,0.85)]'
    : isSecond
      ? 'border-info/35 bg-gradient-to-b from-info/12 to-base-100'
      : 'border-primary/30 bg-gradient-to-b from-primary/10 to-base-100';

  return (
    <div className={`${orderClass} ${heightClass} ${surfaceClass} relative overflow-hidden rounded-[2rem] border p-5 text-center transition hover:-translate-y-2 hover:shadow-xl`}>
      <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.28),transparent_68%)]" />
      <div className="relative mx-auto w-fit">
        <UserAvatar
          userId={row.expertId}
          name={getEntityLabel(row.expert)}
          size={isFirst ? 'xl' : 'lg'}
          eager={row.rank <= 3}
          className={isFirst ? 'border-4 border-warning shadow-lg' : 'border-4 border-base-100 shadow-md'}
        />
        <span className={`absolute -bottom-2 -left-2 flex items-center justify-center rounded-full border-2 border-base-100 font-black shadow ${isFirst ? 'h-9 w-9 bg-warning text-warning-content' : 'h-8 w-8 bg-primary text-primary-content'}`}>
          {isFirst ? <TrophyIcon className="h-5 w-5" /> : row.rank.toLocaleString('fa-IR')}
        </span>
      </div>
      <div className="relative mt-4 text-xs font-black text-base-content/45">رتبه {row.rank.toLocaleString('fa-IR')}</div>
      <div className="relative mt-2 text-lg font-black">{getEntityLabel(row.expert)}</div>
      <div className="relative mt-1 text-xs text-base-content/50">{row.expert?.profile?.jobTitle || 'کارشناس پروژه'}</div>
      <div className="relative mt-5 text-4xl font-black text-primary">{row.activityScore.toLocaleString('fa-IR')}</div>
      <div className="relative mt-1 text-xs font-bold text-base-content/45">امتیاز فعالیت</div>
      <div className="relative mt-4 flex justify-center"><RankMovement row={row} /></div>
    </div>
  );
};

const MetricProgress = ({
  label,
  value,
  weight,
  icon: Icon,
}: {
  label: string;
  value: number;
  weight: number;
  icon: typeof CalendarDaysIcon;
}) => {
  const safeValue = Math.min(Math.max(Math.round(value || 0), 0), 100);
  return (
    <div className="rounded-2xl border border-base-300 bg-base-100/80 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <div className="text-sm font-black">{label}</div>
            <div className="text-[11px] text-base-content/45">سهم {weight.toLocaleString('fa-IR')}٪ از امتیاز</div>
          </div>
        </div>
        <strong className="text-lg text-primary">{safeValue.toLocaleString('fa-IR')}٪</strong>
      </div>
      <progress className="progress progress-primary mt-3 h-2.5 w-full" value={safeValue} max="100" />
    </div>
  );
};

export const getServerSideProps = withAuth();

export default function ExpertCompetitionPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<ExpertLeaderboard>(EMPTY);
  const [filters, setFilters] = useState<ExpertLeaderboardFilters>(getPreset(30));
  const [draft, setDraft] = useState<ExpertLeaderboardFilters>(getPreset(30));
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (next: ExpertLeaderboardFilters, quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      setData(await expertWorkReportService.getExpertCompetitionLeaderboard(next));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'خطا در دریافت جدول رقابت کارشناسان');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(filters);
  }, [filters, load]);

  const currentExpertId = String(session?.user?.id || '');
  const currentRow = useMemo(
    () => data.rows.find((row) => row.expertId === currentExpertId) || null,
    [currentExpertId, data.rows],
  );

  const podium = useMemo(
    () => data.rows.filter((row) => row.totalEntries > 0 || row.totalDurationMinutes > 0).slice(0, 3),
    [data.rows],
  );

  const nextCompetitor = useMemo(() => {
    if (!currentRow || currentRow.rank <= 1) return null;
    return data.rows[currentRow.rank - 2] || null;
  }, [currentRow, data.rows]);

  const pursuer = useMemo(() => {
    if (!currentRow) return null;
    return data.rows[currentRow.rank] || null;
  }, [currentRow, data.rows]);

  const nearbyRows = useMemo(() => {
    if (!currentRow) return [];
    const from = Math.max(currentRow.rank - 3, 0);
    const to = Math.min(currentRow.rank + 2, data.rows.length);
    return data.rows.slice(from, to);
  }, [currentRow, data.rows]);

  const maxMetrics = useMemo(() => ({
    activeDays: Math.max(...data.rows.map((row) => row.activeDayCount), 0),
    duration: Math.max(...data.rows.map((row) => row.totalDurationMinutes), 0),
    entries: Math.max(...data.rows.map((row) => row.totalEntries), 0),
  }), [data.rows]);

  const scoreComponents = useMemo(() => {
    if (!currentRow) return null;
    return {
      activeDays: maxMetrics.activeDays ? (currentRow.activeDayCount / maxMetrics.activeDays) * 100 : 0,
      duration: maxMetrics.duration ? (currentRow.totalDurationMinutes / maxMetrics.duration) * 100 : 0,
      entries: maxMetrics.entries ? (currentRow.totalEntries / maxMetrics.entries) * 100 : 0,
      deliverables: currentRow.deliverableRatePercent,
      progress: currentRow.averageProgressPercent,
    };
  }, [currentRow, maxMetrics]);

  const badges = useMemo(() => {
    if (!currentRow) return [];
    return [
      {
        title: 'سکوی افتخار',
        description: 'قرار گرفتن بین سه کارشناس اول',
        earned: currentRow.rank <= 3,
        icon: TrophyIcon,
      },
      {
        title: 'صعودکننده',
        description: 'بهبود رتبه نسبت به بازه قبل',
        earned: Number(currentRow.rankChange || 0) > 0,
        icon: RocketLaunchIcon,
      },
      {
        title: 'حضور مستمر',
        description: 'حداقل ۵ روز فعال در بازه',
        earned: currentRow.activeDayCount >= 5,
        icon: FireIcon,
      },
      {
        title: 'خروجی‌محور',
        description: 'ثبت خروجی برای حداقل ۸۰٪ فعالیت‌ها',
        earned: currentRow.deliverableRatePercent >= 80,
        icon: CheckBadgeIcon,
      },
      {
        title: 'ثبت حرفه‌ای',
        description: 'ثبت حداقل ۱۰ فعالیت مستند',
        earned: currentRow.totalEntries >= 10,
        icon: DocumentCheckIcon,
      },
      {
        title: 'ده نفر برتر',
        description: 'حضور در جمع ده رتبه نخست',
        earned: currentRow.rank <= 10,
        icon: StarIcon,
      },
    ];
  }, [currentRow]);

  const applyPreset = (days: number) => {
    const next = getPreset(days);
    setDraft(next);
    setFilters(next);
  };

  const applyCustomRange = () => setFilters({ ...draft });

  const scoreGap = currentRow && nextCompetitor
    ? Math.max(nextCompetitor.activityScore - currentRow.activityScore + 1, 1)
    : 0;
  const leadGap = currentRow?.rank === 1 && pursuer
    ? Math.max(currentRow.activityScore - pursuer.activityScore, 0)
    : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <DashboardPageHeader
          eyebrow="لیگ کارشناسان"
          title="مسابقه عملکرد کارشناسان"
          description="جایگاه خود را ببینید، فاصله تا رتبه بعدی را بشناسید و با ثبت دقیق و صادقانه فعالیت‌ها، خروجی‌ها و پیشرفت واقعی پروژه‌ها در جدول صعود کنید."
          actions={
            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard/expert-work-logs" className="btn btn-primary rounded-2xl">
                <DocumentCheckIcon className="h-5 w-5" />
                ثبت فعالیت جدید
              </Link>
              <button
                type="button"
                className="btn btn-outline rounded-2xl"
                disabled={loading}
                onClick={() => void load(filters, true)}
              >
                <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                به‌روزرسانی
              </button>
            </div>
          }
        />

        <section className="relative overflow-hidden rounded-[2.25rem] border border-primary/25 bg-gradient-to-br from-slate-950 via-primary/90 to-indigo-950 p-5 text-white shadow-[0_28px_80px_-38px_rgba(79,70,229,0.95)] sm:p-7">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-warning/20 blur-3xl" />
          <div className="absolute -bottom-28 left-0 h-72 w-72 rounded-full bg-info/20 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.14),transparent_28%)]" />

          {currentRow ? (
            <div className="relative grid items-center gap-7 xl:grid-cols-[1.25fr_0.75fr]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-black backdrop-blur">
                    {getLevelLabel(currentRow)}
                  </span>
                  <RankMovement row={currentRow} />
                </div>
                <div className="mt-5 flex flex-wrap items-end gap-3">
                  <div className="text-sm font-bold text-white/60">رتبه فعلی شما</div>
                  <div className="text-7xl font-black tracking-tight">#{currentRow.rank.toLocaleString('fa-IR')}</div>
                  <div className="pb-2 text-sm font-bold text-white/55">از {data.summary.expertCount.toLocaleString('fa-IR')} کارشناس</div>
                </div>
                <div className="mt-5 flex items-center gap-4">
                  <UserAvatar
                    userId={currentRow.expertId}
                    name={getEntityLabel(currentRow.expert)}
                    size="lg"
                    eager
                    className="border-4 border-white/30 shadow-xl"
                  />
                  <div>
                    <div className="text-xs font-bold text-white/55">کارشناس حاضر در رقابت</div>
                    <h2 className="mt-1 break-words text-2xl font-black sm:text-3xl">{getEntityLabel(currentRow.expert)}</h2>
                  </div>
                </div>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-white/70">
                  {currentRow.rank === 1
                    ? pursuer
                      ? `شما صدرنشین هستید و ${leadGap.toLocaleString('fa-IR')} امتیاز با نزدیک‌ترین رقیب فاصله دارید. استمرار در ثبت فعالیت واقعی، جایگاه شما را حفظ می‌کند.`
                      : 'شما صدرنشین رقابت هستید. برای حفظ جایگاه، فعالیت‌ها و خروجی‌های واقعی پروژه را منظم ثبت کنید.'
                    : nextCompetitor
                      ? `برای عبور از ${getEntityLabel(nextCompetitor.expert)} و رسیدن به رتبه ${nextCompetitor.rank.toLocaleString('fa-IR')}، حدود ${scoreGap.toLocaleString('fa-IR')} امتیاز دیگر نیاز دارید.`
                      : 'فعالیت‌های خود را منظم ثبت کنید تا وارد رقابت رتبه‌ها شوید.'}
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: 'روز فعال', value: currentRow.activeDayCount.toLocaleString('fa-IR'), icon: CalendarDaysIcon },
                    { label: 'زمان ثبت‌شده', value: formatDuration(currentRow.totalDurationMinutes), icon: ClockIcon },
                    { label: 'فعالیت مستند', value: currentRow.totalEntries.toLocaleString('fa-IR'), icon: DocumentCheckIcon },
                    { label: 'نرخ خروجی', value: `${currentRow.deliverableRatePercent.toLocaleString('fa-IR')}٪`, icon: CheckBadgeIcon },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                      <item.icon className="h-5 w-5 text-warning" />
                      <div className="mt-3 text-lg font-black">{item.value}</div>
                      <div className="mt-1 text-xs font-bold text-white/55">{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col items-center justify-center rounded-[2rem] border border-white/15 bg-white/10 p-5 backdrop-blur-md">
                <ScoreRing score={currentRow.activityScore} />
                <div className="mt-3 text-center">
                  <div className="text-sm font-black">امتیاز رقابتی شما</div>
                  <div className="mt-1 text-xs leading-6 text-white/55">بر پایه استمرار، زمان، فعالیت، خروجی و پیشرفت مستند</div>
                </div>
                {nextCompetitor ? (
                  <div className="mt-5 w-full rounded-2xl bg-black/15 p-4 text-center">
                    <div className="text-xs font-bold text-white/55">هدف بعدی</div>
                    <div className="mt-1 font-black">عبور از رتبه {nextCompetitor.rank.toLocaleString('fa-IR')}</div>
                    <progress className="progress progress-warning mt-3 h-2.5 w-full" value={currentRow.activityScore} max={Math.max(nextCompetitor.activityScore + 1, 1)} />
                  </div>
                ) : (
                  <div className="mt-5 rounded-2xl bg-warning/15 px-5 py-3 text-center text-sm font-black text-warning">حفظ صدر جدول</div>
                )}
              </div>
            </div>
          ) : (
            <div className="relative py-12 text-center">
              <TrophyIcon className="mx-auto h-16 w-16 text-white/30" />
              <h2 className="mt-4 text-2xl font-black">رتبه شما هنوز محاسبه نشده است</h2>
              <p className="mt-2 text-white/60">پس از ثبت اولین فعالیت پروژه، جایگاه شما در جدول نمایش داده می‌شود.</p>
            </div>
          )}
        </section>

        <div className="rounded-3xl border border-base-300 bg-base-100 p-4 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="text-sm font-black">بازه رقابت</div>
              <p className="mt-1 text-xs text-base-content/50">رتبه‌ها با دوره قبلی هم‌اندازه مقایسه می‌شوند.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[7, 30, 90].map((days) => (
                  <button
                    key={days}
                    type="button"
                    className={`btn btn-sm rounded-xl ${data.period.dayCount === days ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => applyPreset(days)}
                  >
                    {days.toLocaleString('fa-IR')} روز اخیر
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-[190px_190px_auto]">
              <ShamsiDateInput label="از تاریخ" value={draft.dateFrom || ''} onChange={(value) => setDraft((current) => ({ ...current, dateFrom: value }))} />
              <ShamsiDateInput label="تا تاریخ" value={draft.dateTo || ''} onChange={(value) => setDraft((current) => ({ ...current, dateTo: value }))} />
              <button type="button" className="btn btn-outline self-end rounded-2xl" onClick={applyCustomRange}>اعمال بازه</button>
            </div>
          </div>
        </div>

        {podium.length ? (
          <SectionCard
            title="سکوی برترین‌های دوره"
            description="سه رتبه نخست براساس فعالیت‌های ثبت‌شده و مستند این بازه."
            actions={<span className="badge badge-warning badge-outline p-3 font-black"><TrophyIcon className="h-4 w-4" /> رقابت زنده</span>}
          >
            <div className="grid gap-4 pt-6 md:grid-cols-3 md:items-end">
              {podium.map((row) => <PodiumCard key={row.expertId} row={row} />)}
            </div>
          </SectionCard>
        ) : null}

        {currentRow && scoreComponents ? (
          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <SectionCard title="مسیر صعود شما" description="هر شاخص نشان می‌دهد در مقایسه با بهترین مقدار همین دوره کجا قرار دارید.">
              <div className="grid gap-3 sm:grid-cols-2">
                <MetricProgress label="استمرار روزهای فعال" value={scoreComponents.activeDays} weight={data.scoring.activeDaysWeight} icon={CalendarDaysIcon} />
                <MetricProgress label="زمان کار ثبت‌شده" value={scoreComponents.duration} weight={data.scoring.durationWeight} icon={ClockIcon} />
                <MetricProgress label="تعداد فعالیت‌ها" value={scoreComponents.entries} weight={data.scoring.entriesWeight} icon={BoltIcon} />
                <MetricProgress label="خروجی‌های مستند" value={scoreComponents.deliverables} weight={data.scoring.deliverablesWeight} icon={CheckBadgeIcon} />
                <div className="sm:col-span-2">
                  <MetricProgress label="پیشرفت گزارش‌شده" value={scoreComponents.progress} weight={data.scoring.progressWeight} icon={SparklesIcon} />
                </div>
              </div>
            </SectionCard>

            <SectionCard title="ماموریت رتبه بعدی" description="هدف‌های عملی برای بهتر شدن کیفیت ثبت عملکرد، نه افزایش مصنوعی ساعت یا گزارش.">
              <div className="space-y-3">
                {[
                  {
                    title: nextCompetitor ? `رسیدن به رتبه ${nextCompetitor.rank.toLocaleString('fa-IR')}` : 'حفظ رتبه نخست',
                    description: nextCompetitor
                      ? `${scoreGap.toLocaleString('fa-IR')} امتیاز تا عبور از نزدیک‌ترین رقیب فاصله دارید.`
                      : 'با استمرار در ثبت صادقانه فعالیت‌ها، فاصله خود را حفظ کنید.',
                    icon: FlagIcon,
                    completed: !nextCompetitor,
                  },
                  {
                    title: 'ثبت خروجی قابل تحویل',
                    description: currentRow.deliverableRatePercent >= 80
                      ? 'نرخ ثبت خروجی شما به سطح حرفه‌ای رسیده است.'
                      : `نرخ خروجی فعلی ${currentRow.deliverableRatePercent.toLocaleString('fa-IR')}٪ است؛ نتیجه ملموس هر فعالیت را ثبت کنید.`,
                    icon: CheckBadgeIcon,
                    completed: currentRow.deliverableRatePercent >= 80,
                  },
                  {
                    title: 'تداوم حضور در پروژه',
                    description: currentRow.activeDayCount >= 5
                      ? `${currentRow.activeDayCount.toLocaleString('fa-IR')} روز فعال در این دوره ثبت کرده‌اید.`
                      : 'ثبت فعالیت واقعی در روزهای کاری مختلف، امتیاز استمرار را افزایش می‌دهد.',
                    icon: FireIcon,
                    completed: currentRow.activeDayCount >= 5,
                  },
                ].map((mission) => (
                  <div key={mission.title} className={`flex gap-3 rounded-2xl border p-4 ${mission.completed ? 'border-success/25 bg-success/5' : 'border-base-300 bg-base-100'}`}>
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${mission.completed ? 'bg-success text-success-content' : 'bg-primary/10 text-primary'}`}>
                      <mission.icon className="h-6 w-6" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2 font-black">
                        {mission.title}
                        {mission.completed ? <CheckBadgeIcon className="h-5 w-5 text-success" /> : null}
                      </div>
                      <p className="mt-1 text-xs leading-6 text-base-content/55">{mission.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        ) : null}

        {nearbyRows.length ? (
          <SectionCard title="رقابت نزدیک شما" description="جایگاه شما در میان نزدیک‌ترین رتبه‌های جدول؛ اطلاعات خصوصی سایر کارشناسان نمایش داده نمی‌شود.">
            <div className="space-y-3">
              {nearbyRows.map((row) => {
                const isCurrent = row.expertId === currentExpertId;
                return (
                  <div key={row.expertId} className={`grid items-center gap-3 rounded-3xl border p-4 transition sm:grid-cols-[64px_1fr_120px_150px] ${isCurrent ? 'border-primary bg-primary/8 shadow-[0_14px_35px_-25px_rgba(79,70,229,0.9)]' : 'border-base-300 bg-base-100'}`}>
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-black ${isCurrent ? 'bg-primary text-primary-content' : row.rank <= 3 ? 'bg-warning/15 text-warning' : 'bg-base-200'}`}>
                      {row.rank.toLocaleString('fa-IR')}
                    </div>
                    <div className="flex min-w-0 items-center gap-3">
                      <UserAvatar
                        userId={row.expertId}
                        name={getEntityLabel(row.expert)}
                        size="sm"
                        className={isCurrent ? 'border-primary ring-2 ring-primary/20' : ''}
                      />
                      <div className="min-w-0">
                        <div className="break-words font-black">{getEntityLabel(row.expert)} {isCurrent ? <span className="text-primary">(شما)</span> : null}</div>
                        <div className="mt-1"><RankMovement row={row} /></div>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-base-content/45">امتیاز</div>
                      <strong className="text-2xl text-primary">{row.activityScore.toLocaleString('fa-IR')}</strong>
                    </div>
                    <div>
                      <div className="text-xs text-base-content/45">فعالیت این دوره</div>
                      <div className="mt-1 text-sm font-black">{row.activeDayCount.toLocaleString('fa-IR')} روز · {row.totalEntries.toLocaleString('fa-IR')} ثبت</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        ) : null}

        {currentRow ? (
          <SectionCard title="نشان‌های افتخار من" description="نشان‌ها با فعالیت واقعی و مستند آزاد می‌شوند و برای ایجاد انگیزه در استمرار طراحی شده‌اند.">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {badges.map((badge) => (
                <div key={badge.title} className={`relative overflow-hidden rounded-3xl border p-4 ${badge.earned ? 'border-warning/35 bg-gradient-to-br from-warning/15 to-base-100' : 'border-base-300 bg-base-200/45 opacity-70'}`}>
                  <div className="flex items-start gap-3">
                    <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${badge.earned ? 'bg-warning text-warning-content shadow-md' : 'bg-base-300 text-base-content/40'}`}>
                      {badge.earned ? <badge.icon className="h-7 w-7" /> : <LockClosedIcon className="h-6 w-6" />}
                    </span>
                    <div>
                      <div className="font-black">{badge.title}</div>
                      <p className="mt-1 text-xs leading-6 text-base-content/55">{badge.description}</p>
                      <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ${badge.earned ? 'bg-success/10 text-success' : 'bg-base-300 text-base-content/45'}`}>
                        {badge.earned ? 'دریافت شده' : 'قفل است'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        ) : null}

        <SectionCard
          title="جدول کامل لیگ"
          description="رتبه‌بندی عمومی فقط شاخص‌های رقابتی لازم را نشان می‌دهد و جزئیات گزارش سایر کارشناسان محرمانه باقی می‌ماند."
          actions={<span className="badge badge-primary badge-outline p-3 font-black">{data.rows.length.toLocaleString('fa-IR')} کارشناس</span>}
        >
          {data.rows.length ? (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>رتبه</th>
                    <th>کارشناس</th>
                    <th>امتیاز</th>
                    <th>لیگ</th>
                    <th>روز فعال</th>
                    <th>زمان ثبت‌شده</th>
                    <th>تغییر رتبه</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => {
                    const isCurrent = row.expertId === currentExpertId;
                    return (
                      <tr key={row.expertId} className={isCurrent ? 'bg-primary/8 font-bold' : ''}>
                        <td><span className={`flex h-10 w-10 items-center justify-center rounded-xl font-black ${row.rank <= 3 ? 'bg-warning/15 text-warning' : 'bg-base-200'}`}>{row.rank.toLocaleString('fa-IR')}</span></td>
                        <td>
                          <div className="flex items-center gap-3">
                            <UserAvatar
                              userId={row.expertId}
                              name={getEntityLabel(row.expert)}
                              size="sm"
                              className={isCurrent ? 'border-primary ring-2 ring-primary/20' : ''}
                            />
                            <div>
                              <div className="break-words font-black">{getEntityLabel(row.expert)} {isCurrent ? <span className="text-primary">(شما)</span> : null}</div>
                              <div className="text-xs text-base-content/45">{row.expert?.profile?.jobTitle || 'کارشناس پروژه'}</div>
                            </div>
                          </div>
                        </td>
                        <td><strong className="text-lg text-primary">{row.activityScore.toLocaleString('fa-IR')}</strong></td>
                        <td><span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${getLevelTone(row)}`}>{getLevelLabel(row)}</span></td>
                        <td>{row.activeDayCount.toLocaleString('fa-IR')} روز</td>
                        <td>{formatDuration(row.totalDurationMinutes)}</td>
                        <td><RankMovement row={row} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-16 text-center text-base-content/50">
              <TrophyIcon className="mx-auto h-14 w-14 opacity-25" />
              <p className="mt-3 font-black">برای این بازه اطلاعاتی وجود ندارد.</p>
            </div>
          )}
        </SectionCard>

        <div className="rounded-3xl border border-info/25 bg-info/5 p-5">
          <div className="flex gap-3">
            <SparklesIcon className="mt-0.5 h-6 w-6 shrink-0 text-info" />
            <div>
              <div className="font-black text-info">رقابت سالم، ثبت واقعی</div>
              <p className="mt-1 text-sm leading-7 text-base-content/60">
                این جدول کیفیت تخصصی، دشواری کار یا ارزش منابع انسانی را به‌تنهایی اندازه‌گیری نمی‌کند. امتیاز فقط از فعالیت‌های ثبت‌شده محاسبه می‌شود؛ بنابراین ساعت، پیشرفت و خروجی را دقیق و واقعی وارد کنید. آخرین فعالیت شما: {currentRow?.lastActivityAt ? formatShamsiFullDate(currentRow.lastActivityAt) : 'هنوز ثبت نشده'}.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
