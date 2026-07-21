import ShamsiDateInput from '@/components/common/ShamsiDateInput';
import { UserAvatar } from '@/components/common';
import {
  AdminStatCard,
  DashboardPageHeader,
  FilterBar,
  SectionCard,
} from '@/components/common/DashboardUi';
import { ExpertLeaderboardChart } from '@/components/expert-work-reports';
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
  ArrowDownIcon,
  ArrowPathIcon,
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  BriefcaseIcon,
  CalendarDaysIcon,
  ClockIcon,
  DocumentTextIcon,
  FireIcon,
  MagnifyingGlassIcon,
  MinusIcon,
  SparklesIcon,
  TrophyIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
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

const formatDuration = (minutes: number) => {
  const value = Number(minutes || 0);
  const hours = Math.floor(value / 60);
  const rest = value % 60;
  if (!value) return '۰ دقیقه';
  if (hours && rest) return `${hours.toLocaleString('fa-IR')} ساعت و ${rest.toLocaleString('fa-IR')} دقیقه`;
  if (hours) return `${hours.toLocaleString('fa-IR')} ساعت`;
  return `${rest.toLocaleString('fa-IR')} دقیقه`;
};

const toDateOnly = (date: Date) => date.toISOString().slice(0, 10);

const getPreset = (days: number): ExpertLeaderboardFilters => {
  const dateTo = new Date();
  const dateFrom = new Date(dateTo);
  dateFrom.setUTCDate(dateFrom.getUTCDate() - (days - 1));
  return { dateFrom: toDateOnly(dateFrom), dateTo: toDateOnly(dateTo) };
};

const getLevelLabel = (row: ExpertLeaderboardRow) => {
  switch (row.level) {
    case 'champion':
      return 'قهرمان فعالیت';
    case 'high':
      return 'بسیار فعال';
    case 'steady':
      return 'فعال پایدار';
    case 'low':
      return 'کم‌فعال';
    default:
      return 'بدون فعالیت ثبت‌شده';
  }
};

const getLevelClass = (row: ExpertLeaderboardRow) => {
  switch (row.level) {
    case 'champion':
      return 'badge-warning';
    case 'high':
      return 'badge-success';
    case 'steady':
      return 'badge-info';
    case 'low':
      return 'badge-ghost';
    default:
      return 'badge-error badge-outline';
  }
};

const RankChange = ({ row }: { row: ExpertLeaderboardRow }) => {
  if (row.rankChange === null) {
    return <span className="inline-flex items-center gap-1 text-xs text-base-content/40"><MinusIcon className="h-4 w-4" /> بدون مقایسه</span>;
  }
  if (row.rankChange > 0) {
    return <span className="inline-flex items-center gap-1 text-xs font-black text-success"><ArrowTrendingUpIcon className="h-4 w-4" /> {row.rankChange.toLocaleString('fa-IR')} رتبه صعود</span>;
  }
  if (row.rankChange < 0) {
    return <span className="inline-flex items-center gap-1 text-xs font-black text-error"><ArrowTrendingDownIcon className="h-4 w-4" /> {Math.abs(row.rankChange).toLocaleString('fa-IR')} رتبه افت</span>;
  }
  return <span className="inline-flex items-center gap-1 text-xs text-base-content/50"><MinusIcon className="h-4 w-4" /> بدون تغییر</span>;
};

const PodiumCard = ({ row, featured = false }: { row: ExpertLeaderboardRow; featured?: boolean }) => {
  const orderClass = row.rank === 1 ? 'order-1 xl:order-2' : row.rank === 2 ? 'order-2 xl:order-1' : 'order-3';

  return (
  <Link
    href={`/dashboard/expert-work-reports/${row.expertId}`}
    className={`${orderClass} group relative overflow-hidden rounded-[2rem] border p-5 text-center transition hover:-translate-y-1 hover:shadow-xl ${
      featured
        ? 'border-warning/45 bg-gradient-to-b from-warning/20 to-base-100 shadow-lg xl:-translate-y-5'
        : 'border-base-300 bg-base-100'
    }`}
  >
    <div className="relative mx-auto w-fit">
      <UserAvatar
        userId={row.expertId}
        name={getEntityLabel(row.expert)}
        size={featured ? 'xl' : 'lg'}
        eager={row.rank <= 3}
        className={featured ? 'border-4 border-warning shadow-lg' : 'border-4 border-base-100 shadow-md'}
      />
      <span className={`absolute -bottom-2 -left-2 flex items-center justify-center rounded-full border-2 border-base-100 font-black shadow ${featured ? 'h-9 w-9 bg-warning text-warning-content' : 'h-8 w-8 bg-primary text-primary-content'}`}>
        {featured ? <TrophyIcon className="h-5 w-5" /> : row.rank.toLocaleString('fa-IR')}
      </span>
    </div>
    <div className="mt-4 text-xs font-black text-base-content/45">رتبه {row.rank.toLocaleString('fa-IR')}</div>
    <h3 className="mt-2 break-words text-lg font-black group-hover:text-primary">{getEntityLabel(row.expert)}</h3>
    <p className="mt-1 text-xs text-base-content/50">{row.expert?.profile?.jobTitle || row.expert?.email || 'کارشناس پروژه'}</p>
    <div className="mt-4 text-4xl font-black text-primary">{row.activityScore.toLocaleString('fa-IR')}</div>
    <div className="mt-1 text-xs font-bold text-base-content/45">امتیاز از ۱۰۰</div>
    <div className="mt-4 flex justify-center"><RankChange row={row} /></div>
  </Link>
  );
};

export const getServerSideProps = withAuth();

export default function ExpertLeaderboardPage() {
  const [data, setData] = useState<ExpertLeaderboard>(EMPTY);
  const [filters, setFilters] = useState<ExpertLeaderboardFilters>(getPreset(30));
  const [draft, setDraft] = useState<ExpertLeaderboardFilters>(getPreset(30));
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (next: ExpertLeaderboardFilters, quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      setData(await expertWorkReportService.getLeaderboard(next));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'خطا در دریافت رتبه‌بندی کارشناسان');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(filters);
  }, [filters, load]);

  const podium = useMemo(
    () => {
      const activeRows = data.rows.filter((item) => item.totalEntries > 0 || item.totalDurationMinutes > 0);
      return [activeRows[1], activeRows[0], activeRows[2]].filter(Boolean) as ExpertLeaderboardRow[];
    },
    [data.rows],
  );

  const applyPreset = (days: number) => {
    const next = getPreset(days);
    setDraft(next);
    setFilters(next);
  };

  const applyFilters = () => setFilters({ ...draft });
  const clearFilters = () => {
    const next = getPreset(30);
    setDraft(next);
    setFilters(next);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <DashboardPageHeader
          eyebrow="رقابت شفاف کارشناسان"
          title="جدول رتبه‌بندی فعالیت کارشناسان"
          description="رتبه‌بندی کارشناسان براساس استمرار حضور، زمان ثبت‌شده، تعداد فعالیت‌ها، خروجی مستند و پیشرفت گزارش‌شده. رتبه‌ها با بازه قبلی مقایسه می‌شوند و برای تحلیل دقیق‌تر به جزئیات هر کارشناس متصل هستند."
          actions={
            <button type="button" className="btn btn-outline rounded-2xl" disabled={loading} onClick={() => void load(filters, true)}>
              <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
              به‌روزرسانی
            </button>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AdminStatCard title="کارشناسان رتبه‌بندی‌شده" value={data.summary.expertCount.toLocaleString('fa-IR')} description={`${data.summary.activeExpertCount.toLocaleString('fa-IR')} کارشناس دارای فعالیت`} icon={UserGroupIcon} tone="primary" />
          <AdminStatCard title="میانگین امتیاز" value={`${data.summary.averageScore.toLocaleString('fa-IR')} از ۱۰۰`} description={`بازه ${data.period.dayCount.toLocaleString('fa-IR')} روزه`} icon={SparklesIcon} tone="info" />
          <AdminStatCard title="کل زمان ثبت‌شده" value={formatDuration(data.summary.totalDurationMinutes)} description={`${data.summary.totalEntries.toLocaleString('fa-IR')} فعالیت ثبت‌شده`} icon={ClockIcon} tone="success" />
          <AdminStatCard title="کارشناسان بدون فعالیت" value={data.summary.inactiveExpertCount.toLocaleString('fa-IR')} description="نیازمند بررسی تخصیص کار یا ثبت گزارش" icon={ArrowDownIcon} tone="warning" />
        </div>

        <FilterBar>
          <div className="mb-4 flex flex-wrap gap-2">
            {[7, 30, 90].map((days) => (
              <button key={days} type="button" className={`btn btn-sm rounded-xl ${data.period.dayCount === days && !draft.search ? 'btn-primary' : 'btn-ghost'}`} onClick={() => applyPreset(days)}>
                {days.toLocaleString('fa-IR')} روز اخیر
              </button>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <ShamsiDateInput label="از تاریخ" value={draft.dateFrom || ''} onChange={(value) => setDraft((current) => ({ ...current, dateFrom: value }))} />
            <ShamsiDateInput label="تا تاریخ" value={draft.dateTo || ''} onChange={(value) => setDraft((current) => ({ ...current, dateTo: value }))} />
            <label className="form-control xl:col-span-2">
              <span className="label label-text font-bold">جست‌وجوی کارشناس</span>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-base-content/40" />
                <input className="input input-bordered w-full bg-base-100 pr-11" value={draft.search || ''} onChange={(event) => setDraft((current) => ({ ...current, search: event.target.value }))} onKeyDown={(event) => event.key === 'Enter' && applyFilters()} placeholder="نام، ایمیل یا عنوان شغلی" />
              </div>
            </label>
            <div className="flex items-end gap-2">
              <button type="button" className="btn btn-primary flex-1 rounded-2xl" onClick={applyFilters}>اعمال</button>
              <button type="button" className="btn btn-ghost rounded-2xl" onClick={clearFilters}>پاک‌کردن</button>
            </div>
          </div>
        </FilterBar>

        {loading ? (
          <div className="grid gap-4 xl:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-80 animate-pulse rounded-[2rem] bg-base-200" />)}</div>
        ) : data.rows.length ? (
          <>
            {podium.length ? (
              <SectionCard title="سکوی برترین کارشناسان" description="سه رتبه اول بازه انتخاب‌شده؛ تغییر رتبه نسبت به بازه زمانی قبلی با طول مشابه محاسبه شده است.">
                <div className="grid items-end gap-4 pt-6 xl:grid-cols-3">
                  {podium.map((row) => <PodiumCard key={row.expertId} row={row} featured={row.rank === 1} />)}
                </div>
              </SectionCard>
            ) : null}

            <div className="grid gap-5 xl:grid-cols-[0.72fr_1.28fr]">
              <div className="space-y-5">
                {data.mostActive ? (
                  <SectionCard title="فعال‌ترین کارشناس" description="بالاترین امتیاز ترکیبی در بازه انتخاب‌شده.">
                    <Link href={`/dashboard/expert-work-reports/${data.mostActive.expertId}`} className="block rounded-3xl border border-success/30 bg-success/10 p-5 transition hover:-translate-y-1 hover:shadow-lg">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <UserAvatar
                            userId={data.mostActive.expertId}
                            name={getEntityLabel(data.mostActive.expert)}
                            size="lg"
                            className="border-4 border-success/25"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-black text-success">رتبه اول</div>
                            <div className="mt-1 break-words text-xl font-black">{getEntityLabel(data.mostActive.expert)}</div>
                            <div className="mt-1 text-xs text-base-content/55">{formatDuration(data.mostActive.totalDurationMinutes)} · {data.mostActive.activeDayCount.toLocaleString('fa-IR')} روز فعال</div>
                          </div>
                        </div>
                        <FireIcon className="h-12 w-12 shrink-0 text-success" />
                      </div>
                      <div className="mt-4 text-4xl font-black text-success">{data.mostActive.activityScore.toLocaleString('fa-IR')}</div>
                    </Link>
                  </SectionCard>
                ) : null}

                {data.leastActive ? (
                  <SectionCard title="کم‌فعال‌ترین کارشناس" description="این نتیجه باید همراه تخصیص پروژه، مرخصی و وضعیت ثبت گزارش بررسی شود.">
                    <Link href={`/dashboard/expert-work-reports/${data.leastActive.expertId}`} className="block rounded-3xl border border-warning/35 bg-warning/10 p-5 transition hover:-translate-y-1 hover:shadow-lg">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <UserAvatar
                            userId={data.leastActive.expertId}
                            name={getEntityLabel(data.leastActive.expert)}
                            size="lg"
                            className="border-4 border-warning/25"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-black text-warning">رتبه {data.leastActive.rank.toLocaleString('fa-IR')}</div>
                            <div className="mt-1 break-words text-xl font-black">{getEntityLabel(data.leastActive.expert)}</div>
                            <div className="mt-1 text-xs text-base-content/55">{formatDuration(data.leastActive.totalDurationMinutes)} · {data.leastActive.activeDayCount.toLocaleString('fa-IR')} روز فعال</div>
                            <div className="mt-2 text-xs font-bold text-warning">{data.leastActive.inactiveDays === null ? 'هیچ فعالیتی تاکنون ثبت نشده است' : `${data.leastActive.inactiveDays.toLocaleString('fa-IR')} روز از آخرین فعالیت`}</div>
                          </div>
                        </div>
                        <ArrowTrendingDownIcon className="h-12 w-12 shrink-0 text-warning" />
                      </div>
                      <div className="mt-4 text-4xl font-black text-warning">{data.leastActive.activityScore.toLocaleString('fa-IR')}</div>
                    </Link>
                  </SectionCard>
                ) : null}
              </div>

              <SectionCard title="مقایسه امتیاز ۱۰ کارشناس اول" description="امتیاز نرمال‌شده از ۱۰۰ برای مقایسه سریع؛ جزئیات خام در جدول پایین نمایش داده می‌شود.">
                <ExpertLeaderboardChart data={data.rows} />
              </SectionCard>
            </div>

            <SectionCard title="جدول کامل رتبه‌بندی" description="برای مشاهده پروژه‌ها، روند روزانه، توضیحات فعالیت و موانع هر کارشناس، ردیف او را باز کنید." actions={<span className="badge badge-primary badge-outline p-3 font-black">{data.rows.length.toLocaleString('fa-IR')} کارشناس</span>}>
              <div className="space-y-3">
                {data.rows.map((row) => (
                  <Link key={row.expertId} href={`/dashboard/expert-work-reports/${row.expertId}`} className="group grid gap-4 rounded-3xl border border-base-300 bg-base-100 p-4 transition hover:border-primary/40 hover:bg-primary/[0.03] hover:shadow-md md:grid-cols-[76px_1.4fr_1fr_1fr] xl:grid-cols-[76px_1.5fr_0.75fr_0.8fr_0.75fr_0.75fr_0.9fr] xl:items-center">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-black ${row.rank <= 3 ? 'bg-warning/20 text-warning' : 'bg-base-200 text-base-content'}`}>
                      {row.rank.toLocaleString('fa-IR')}
                    </div>
                    <div className="flex min-w-0 items-center gap-3">
                      <UserAvatar
                        userId={row.expertId}
                        name={getEntityLabel(row.expert)}
                        size="md"
                        className={row.rank <= 3 ? 'border-warning/40' : ''}
                      />
                      <div className="min-w-0">
                        <div className="break-words text-base font-black group-hover:text-primary">{getEntityLabel(row.expert)}</div>
                        <div className="mt-1 break-words text-xs text-base-content/50">{row.expert?.profile?.jobTitle || row.expert?.email || 'کارشناس پروژه'}</div>
                        <div className="mt-2"><RankChange row={row} /></div>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-base-content/45">امتیاز فعالیت</div>
                      <div className="mt-1 flex items-end gap-2"><strong className="text-2xl text-primary">{row.activityScore.toLocaleString('fa-IR')}</strong><span className={`badge badge-sm ${getLevelClass(row)}`}>{getLevelLabel(row)}</span></div>
                      <progress className="progress progress-primary mt-2 h-2 w-full" value={row.activityScore} max="100" />
                    </div>
                    <div><div className="text-xs text-base-content/45">زمان و استمرار</div><strong className="mt-1 block text-sm">{formatDuration(row.totalDurationMinutes)}</strong><span className="text-xs text-base-content/50">{row.activeDayCount.toLocaleString('fa-IR')} روز فعال</span></div>
                    <div><div className="text-xs text-base-content/45">فعالیت‌ها</div><strong className="mt-1 block text-lg">{row.totalEntries.toLocaleString('fa-IR')}</strong><span className="text-xs text-base-content/50">در {row.projectCount.toLocaleString('fa-IR')} پروژه</span></div>
                    <div><div className="text-xs text-base-content/45">نرخ خروجی</div><strong className="mt-1 block text-lg">{row.deliverableRatePercent.toLocaleString('fa-IR')}٪</strong><span className="text-xs text-base-content/50">پیشرفت {Math.round(row.averageProgressPercent).toLocaleString('fa-IR')}٪</span></div>
                    <div><div className="text-xs text-base-content/45">آخرین فعالیت</div><strong className="mt-1 block text-sm">{row.lastActivityAt ? formatShamsiFullDate(row.lastActivityAt) : 'بدون فعالیت'}</strong><span className="text-xs text-base-content/50">{row.inactiveDays === null ? 'بدون سابقه فعالیت' : `${row.inactiveDays.toLocaleString('fa-IR')} روز از آخرین ثبت`}</span><span className="mt-1 block text-xs font-black text-primary">مشاهده جزئیات</span></div>
                  </Link>
                ))}
              </div>
            </SectionCard>
          </>
        ) : (
          <div className="flex min-h-80 flex-col items-center justify-center rounded-3xl border border-dashed border-base-300 bg-base-100 text-center">
            <TrophyIcon className="h-14 w-14 text-base-content/20" />
            <p className="mt-4 font-black text-base-content/55">کارشناسی مطابق فیلترها پیدا نشد.</p>
          </div>
        )}

        <SectionCard title="فرمول امتیاز فعالیت" description={data.scoring.note || 'این امتیاز فقط میزان فعالیت ثبت‌شده را مقایسه می‌کند.'}>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {[
              { label: 'تداوم روزهای فعال', value: data.scoring.activeDaysWeight, icon: CalendarDaysIcon },
              { label: 'زمان ثبت‌شده', value: data.scoring.durationWeight, icon: ClockIcon },
              { label: 'تعداد فعالیت‌ها', value: data.scoring.entriesWeight, icon: DocumentTextIcon },
              { label: 'خروجی‌های مستند', value: data.scoring.deliverablesWeight, icon: BriefcaseIcon },
              { label: 'پیشرفت گزارش‌شده', value: data.scoring.progressWeight, icon: SparklesIcon },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl bg-base-200/60 p-4">
                <item.icon className="h-6 w-6 text-primary" />
                <div className="mt-3 text-sm font-black">{item.label}</div>
                <div className="mt-1 text-2xl font-black text-primary">{item.value.toLocaleString('fa-IR')}٪</div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </DashboardLayout>
  );
}
