import type {
  ExpertLeaderboardRow,
  ExpertPerformanceRow,
  ExpertWorkReportDailyTrend,
  ExpertWorkReportProjectDistribution,
} from '@/types/expert-work-report';
import { getEntityLabel } from '@/types/expert-work-log';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const axisStyle = { fill: 'var(--app-base-content)', fontSize: 11, fontWeight: 700 };
const gridStroke = 'var(--app-border-soft)';

const formatDate = (value: string) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('fa-IR', { month: 'short', day: 'numeric' }).format(date);
};

const formatHours = (minutes: number) => Number((Number(minutes || 0) / 60).toFixed(1));

export const DailyPerformanceChart = ({ data }: { data: ExpertWorkReportDailyTrend[] }) => {
  const rows = data.map((item) => ({
    date: formatDate(item.date),
    durationHours: formatHours(item.totalDurationMinutes),
    entryCount: item.entryCount,
  }));

  return (
    <div className="h-80 w-full" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 16, right: 12, left: 12, bottom: 8 }}>
          <CartesianGrid stroke={gridStroke} strokeDasharray="4 4" vertical={false} />
          <XAxis dataKey="date" tick={axisStyle} axisLine={false} tickLine={false} />
          <YAxis yAxisId="hours" tick={axisStyle} axisLine={false} tickLine={false} width={42} />
          <YAxis yAxisId="count" orientation="right" tick={axisStyle} axisLine={false} tickLine={false} width={36} />
          <Tooltip
            formatter={(value: any, name: any) =>
              name === 'durationHours'
                ? [`${Number(value).toLocaleString('fa-IR')} ساعت`, 'زمان کار']
                : [Number(value).toLocaleString('fa-IR'), 'تعداد گزارش']
            }
          />
          <Legend formatter={(value) => (value === 'durationHours' ? 'ساعت کار' : 'تعداد گزارش')} />
          <Line yAxisId="hours" type="monotone" dataKey="durationHours" stroke="#2563eb" strokeWidth={3} dot={{ r: 3 }} />
          <Line yAxisId="count" type="monotone" dataKey="entryCount" stroke="#16a34a" strokeWidth={2} dot={{ r: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export const ExpertRankingChart = ({ data }: { data: ExpertPerformanceRow[] }) => {
  const rows = data.slice(0, 10).map((item) => ({
    expert: getEntityLabel(item.expert, 'کارشناس نامشخص'),
    durationHours: formatHours(item.totalDurationMinutes),
    entries: item.totalEntries,
  }));

  return (
    <div className="h-80 w-full" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 24, left: 40, bottom: 8 }}>
          <CartesianGrid stroke={gridStroke} strokeDasharray="4 4" horizontal={false} />
          <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="expert" tick={axisStyle} axisLine={false} tickLine={false} width={110} />
          <Tooltip formatter={(value: any) => [`${Number(value).toLocaleString('fa-IR')} ساعت`, 'زمان کار']} />
          <Bar dataKey="durationHours" fill="#2563eb" radius={[0, 8, 8, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const ProjectDistributionChart = ({ data }: { data: ExpertWorkReportProjectDistribution[] }) => {
  const rows = data.slice(0, 10).map((item) => ({
    project: getEntityLabel(item.project, 'پروژه نامشخص'),
    durationHours: formatHours(item.totalDurationMinutes),
    entries: item.entryCount,
  }));

  return (
    <div className="h-80 w-full" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 12, right: 12, left: 12, bottom: 48 }}>
          <CartesianGrid stroke={gridStroke} strokeDasharray="4 4" vertical={false} />
          <XAxis dataKey="project" tick={axisStyle} angle={-25} textAnchor="end" interval={0} height={80} />
          <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
          <Tooltip formatter={(value: any) => [`${Number(value).toLocaleString('fa-IR')} ساعت`, 'زمان کار']} />
          <Bar dataKey="durationHours" fill="#0891b2" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};


export const ExpertLeaderboardChart = ({ data }: { data: ExpertLeaderboardRow[] }) => {
  const rows = data.slice(0, 10).map((item) => ({
    expert: getEntityLabel(item.expert, 'کارشناس نامشخص'),
    score: item.activityScore,
  }));

  return (
    <div className="h-96 w-full" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 24, left: 54, bottom: 8 }}>
          <CartesianGrid stroke={gridStroke} strokeDasharray="4 4" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tick={axisStyle} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="expert" tick={axisStyle} axisLine={false} tickLine={false} width={126} />
          <Tooltip formatter={(value: any) => [`${Number(value).toLocaleString('fa-IR')} از ۱۰۰`, 'امتیاز فعالیت']} />
          <Bar dataKey="score" fill="#7c3aed" radius={[0, 10, 10, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
