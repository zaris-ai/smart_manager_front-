import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/layouts';
import { projectFinanceService } from '@/services/project-finance.service';
import { projectService } from '@/services/project.service';
import {
  getUserDisplayName,
  Project,
} from '@/types/project';
import {
  ProjectFinanceCashflowItem,
  ProjectFinanceFilters,
  ProjectFinanceForecastReportItem,
  ProjectFinanceFullReport,
  ProjectFinanceInvoiceReportItem,
  ProjectFinancePeopleReportItem,
  ProjectFinanceRecord,
  ProjectFinanceRecordPayload,
  ProjectFinanceSummary,
  ProjectFinanceType,
  getFinanceAttachmentId,
  getFinanceRecordId,
  isFinanceActualType,
  isFinanceForecastType,
  isFinanceInvoiceType,
  projectFinanceCurrencyLabels,
  projectFinanceStatusLabels,
  projectFinanceStatusOptions,
  projectFinanceTypeLabels,
  projectFinanceTypeOptions,
} from '@/types/project-finance';
import { confirmToast } from '@/utils/sonner-confirm';
import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentArrowUpIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  PencilSquareIcon,
  PlusIcon,
  ReceiptPercentIcon,
  TableCellsIcon,
  TrashIcon,
  UserGroupIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { FinanceRecordFormModal } from './FinanceRecordFormModal';

type FinanceTab =
  | 'summary'
  | 'records'
  | 'invoices'
  | 'forecasts'
  | 'cashflow'
  | 'people';

type SettleFormState = {
  amount: string;
  actualDate: string;
  title: string;
  description: string;
  managerNote: string;
};

type UploadFormState = {
  file: File | null;
  description: string;
};

type RejectFormState = {
  rejectionReason: string;
};

const emptySummary: ProjectFinanceSummary = {
  totalIncomeForecast: 0,
  totalExpenseForecast: 0,
  totalReceivableInvoices: 0,
  totalPayableInvoices: 0,
  totalActualReceipts: 0,
  totalActualPayments: 0,
  incomeAchievementPercent: 0,
  expenseRealizationPercent: 0,
  forecastProfit: 0,
  actualProfit: 0,
  profitVariance: 0,
  overdueReceivableAmount: 0,
  overduePayableAmount: 0,
  pendingApprovalAmount: 0,
  rejectedAmount: 0,
  recordsWithoutReasonCount: 0,
};

const formatMoney = (value?: number | null, currency = 'IRR'): string => {
  const amount = Number(value || 0);
  const formatted = new Intl.NumberFormat('fa-IR').format(amount);
  const label = projectFinanceCurrencyLabels[currency as keyof typeof projectFinanceCurrencyLabels] || currency;

  return `${formatted} ${label}`;
};

const formatNumber = (value?: number | null): string => {
  return new Intl.NumberFormat('fa-IR').format(Number(value || 0));
};

const formatPercent = (value?: number | null): string => {
  return `${new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 2 }).format(Number(value || 0))}%`;
};

const formatDate = (value?: string | null): string => {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('fa-IR').format(date);
};

const toDateInputValue = (value?: string | null): string => {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  return date.toISOString().slice(0, 10);
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  const candidate = error as {
    response?: {
      data?: {
        message?: string;
        error?: string;
      };
    };
    message?: string;
  };

  return (
    candidate?.response?.data?.message ||
    candidate?.response?.data?.error ||
    candidate?.message ||
    fallback
  );
};

const getBackendOrigin = (): string => {
  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1';

  return apiBaseUrl.replace(/\/api(?:\/v\d+)?\/?$/, '').replace(/\/$/, '');
};

const resolveFileUrl = (fileUrl: string): string => {
  if (!fileUrl) return '#';
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl;

  return `${getBackendOrigin()}${fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`}`;
};

const getRecordDisplayType = (record: ProjectFinanceRecord): string => {
  return record.typeLabel || projectFinanceTypeLabels[record.type] || record.type;
};

const getRecordDisplayStatus = (
  status?: string,
  statusLabel?: string,
): string => {
  return statusLabel || projectFinanceStatusLabels[status as keyof typeof projectFinanceStatusLabels] || status || '—';
};

const statusBadgeClass: Record<string, string> = {
  draft: 'badge-ghost',
  submitted: 'badge-info',
  approved: 'badge-primary',
  rejected: 'badge-error',
  partially_achieved: 'badge-warning',
  achieved: 'badge-success',
  overdue: 'badge-error',
  cancelled: 'badge-ghost',
};

const typeBadgeClass: Record<ProjectFinanceType, string> = {
  income_forecast: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200',
  expense_forecast: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-200',
  receivable_invoice: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-200',
  payable_invoice: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-200',
  actual_receipt: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-200',
  actual_payment: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-200',
};

const tabItems: Array<{ key: FinanceTab; label: string; icon: typeof BanknotesIcon }> = [
  { key: 'summary', label: 'خلاصه مالی', icon: BanknotesIcon },
  { key: 'records', label: 'رکوردها', icon: TableCellsIcon },
  { key: 'invoices', label: 'گزارش فاکتورها', icon: ReceiptPercentIcon },
  { key: 'forecasts', label: 'گزارش پیش‌بینی‌ها', icon: ClockIcon },
  { key: 'cashflow', label: 'جریان نقدی', icon: ArrowDownTrayIcon },
  { key: 'people', label: 'عملکرد افراد', icon: UserGroupIcon },
];

const ProgressBar = ({ value }: { value?: number | null }) => {
  const normalized = Math.max(Math.min(Number(value || 0), 100), 0);

  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-base-300">
      <div className="h-full rounded-full bg-primary" style={{ width: `${normalized}%` }} />
    </div>
  );
};

const SummaryCard = ({
  title,
  value,
  description,
  icon: Icon,
  tone = 'primary',
}: {
  title: string;
  value: string;
  description?: string;
  icon: typeof BanknotesIcon;
  tone?: 'primary' | 'success' | 'warning' | 'error' | 'info';
}) => {
  const toneClass: Record<string, string> = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    error: 'bg-error/10 text-error',
    info: 'bg-info/10 text-info',
  };

  return (
    <div className="rounded-3xl border border-base-300 bg-base-100 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-base-content/55">{title}</div>
          <div className="mt-3 text-2xl font-black text-base-content">{value}</div>
          {description ? (
            <div className="mt-2 text-xs leading-6 text-base-content/55">{description}</div>
          ) : null}
        </div>

        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${toneClass[tone]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
};

const EmptyBox = ({ title, description }: { title: string; description?: string }) => {
  return (
    <div className="rounded-3xl border border-dashed border-base-300 bg-base-100 p-10 text-center">
      <DocumentTextIcon className="mx-auto h-12 w-12 text-base-content/30" />
      <h3 className="mt-4 text-lg font-black text-base-content">{title}</h3>
      {description ? <p className="mt-2 text-sm leading-7 text-base-content/55">{description}</p> : null}
    </div>
  );
};

export const ProjectFinancePage = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const projectId = typeof router.query.id === 'string' ? router.query.id : '';

  const role = String(session?.user?.role || '').toLowerCase();
  const canManage = role === 'manager' || role === 'admin';

  const [project, setProject] = useState<Project | null>(null);
  const [records, setRecords] = useState<ProjectFinanceRecord[]>([]);
  const [report, setReport] = useState<ProjectFinanceFullReport>({
    summary: emptySummary,
    invoices: [],
    forecasts: [],
    cashflow: [],
    people: [],
  });
  const [activeTab, setActiveTab] = useState<FinanceTab>('summary');
  const [filters, setFilters] = useState<ProjectFinanceFilters>({
    page: 1,
    limit: 100,
    search: '',
    type: '',
    status: '',
    direction: '',
  });

  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ProjectFinanceRecord | null>(null);

  const [settleTarget, setSettleTarget] = useState<ProjectFinanceRecord | null>(null);
  const [settleForm, setSettleForm] = useState<SettleFormState>({
    amount: '',
    actualDate: toDateInputValue(new Date().toISOString()),
    title: '',
    description: '',
    managerNote: '',
  });
  const [settling, setSettling] = useState(false);

  const [rejectTarget, setRejectTarget] = useState<ProjectFinanceRecord | null>(null);
  const [rejectForm, setRejectForm] = useState<RejectFormState>({
    rejectionReason: '',
  });
  const [rejecting, setRejecting] = useState(false);

  const [uploadTarget, setUploadTarget] = useState<ProjectFinanceRecord | null>(null);
  const [uploadForm, setUploadForm] = useState<UploadFormState>({
    file: null,
    description: '',
  });
  const [uploading, setUploading] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const summary = report.summary || emptySummary;

  const loadFinanceWorkspace = async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      const [projectResponse, recordsResponse, reportResponse] = await Promise.all([
        projectService.getProject(projectId),
        projectFinanceService.listRecords(projectId, filters),
        projectFinanceService.getFullReport(projectId),
      ]);

      setProject(projectResponse);
      setRecords(recordsResponse.items || []);
      setReport(reportResponse);
    } catch (err) {
      toast.error(getErrorMessage(err, 'خطا در دریافت اطلاعات مالی پروژه'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!router.isReady) return;

    loadFinanceWorkspace();
  }, [router.isReady, projectId]);

  const filteredRecords = useMemo(() => {
    const search = String(filters.search || '').trim().toLowerCase();

    return records.filter((record) => {
      const matchesSearch =
        !search ||
        String(record.title || '').toLowerCase().includes(search) ||
        String(record.invoiceNumber || '').toLowerCase().includes(search) ||
        String(record.counterparty?.name || '').toLowerCase().includes(search);

      const matchesType = !filters.type || record.type === filters.type;
      const matchesStatus = !filters.status || record.status === filters.status;
      const matchesDirection = !filters.direction || record.direction === filters.direction;

      return matchesSearch && matchesType && matchesStatus && matchesDirection;
    });
  }, [filters, records]);

  const overdueRecords = useMemo(() => {
    return records.filter((record) => record.status === 'overdue' && record.remainingAmount > 0);
  }, [records]);

  const openCreateModal = () => {
    setEditingRecord(null);
    setFormOpen(true);
  };

  const openEditModal = (record: ProjectFinanceRecord) => {
    setEditingRecord(record);
    setFormOpen(true);
  };

  const handleSaveRecord = async (payload: ProjectFinanceRecordPayload) => {
    if (!projectId) return;

    if (editingRecord) {
      await projectFinanceService.updateRecord(
        projectId,
        getFinanceRecordId(editingRecord),
        payload,
      );
    } else {
      await projectFinanceService.createRecord(projectId, payload);
    }

    toast.success(editingRecord ? 'رکورد مالی ویرایش شد.' : 'رکورد مالی ثبت شد.');
    await loadFinanceWorkspace();
  };

  const handleApprove = async (record: ProjectFinanceRecord) => {
    const confirmed = await confirmToast({
      title: 'تأیید رکورد مالی',
      description: `رکورد «${record.title}» تأیید شود؟`,
      confirmText: 'تأیید',
      variant: 'info',
    });

    if (!confirmed || !projectId) return;

    try {
      await projectFinanceService.approveRecord(projectId, getFinanceRecordId(record));
      toast.success('رکورد مالی تأیید شد.');
      await loadFinanceWorkspace();
    } catch (err) {
      toast.error(getErrorMessage(err, 'خطا در تأیید رکورد مالی'));
    }
  };

  const handleCancel = async (record: ProjectFinanceRecord) => {
    const confirmed = await confirmToast({
      title: 'لغو رکورد مالی',
      description: `رکورد «${record.title}» از گزارش‌های فعال حذف شود؟`,
      confirmText: 'لغو رکورد',
      variant: 'danger',
    });

    if (!confirmed || !projectId) return;

    try {
      await projectFinanceService.cancelRecord(projectId, getFinanceRecordId(record));
      toast.success('رکورد مالی لغو شد.');
      await loadFinanceWorkspace();
    } catch (err) {
      toast.error(getErrorMessage(err, 'خطا در لغو رکورد مالی'));
    }
  };

  const openSettleModal = (record: ProjectFinanceRecord) => {
    setSettleTarget(record);
    setSettleForm({
      amount: String(record.remainingAmount || record.finalAmount || ''),
      actualDate: toDateInputValue(new Date().toISOString()),
      title: '',
      description: '',
      managerNote: '',
    });
  };

  const submitSettle = async () => {
    if (!projectId || !settleTarget) return;

    try {
      setSettling(true);
      await projectFinanceService.settleRecord(
        projectId,
        getFinanceRecordId(settleTarget),
        {
          amount: Number(settleForm.amount || 0),
          actualDate: settleForm.actualDate || null,
          title: settleForm.title,
          description: settleForm.description,
          managerNote: settleForm.managerNote,
        },
      );

      setSettleTarget(null);
      toast.success('تحقق مالی ثبت شد.');
      await loadFinanceWorkspace();
    } catch (err) {
      toast.error(getErrorMessage(err, 'خطا در ثبت تحقق مالی'));
    } finally {
      setSettling(false);
    }
  };

  const openRejectModal = (record: ProjectFinanceRecord) => {
    setRejectTarget(record);
    setRejectForm({ rejectionReason: '' });
  };

  const submitReject = async () => {
    if (!projectId || !rejectTarget) return;

    if (!rejectForm.rejectionReason.trim()) {
      toast.error('برای رد رکورد مالی، دلیل رد الزامی است.');
      return;
    }

    try {
      setRejecting(true);
      await projectFinanceService.rejectRecord(projectId, getFinanceRecordId(rejectTarget), {
        rejectionReason: rejectForm.rejectionReason,
      });

      setRejectTarget(null);
      toast.success('رکورد مالی رد شد.');
      await loadFinanceWorkspace();
    } catch (err) {
      toast.error(getErrorMessage(err, 'خطا در رد رکورد مالی'));
    } finally {
      setRejecting(false);
    }
  };

  const openUploadModal = (record: ProjectFinanceRecord) => {
    setUploadTarget(record);
    setUploadForm({ file: null, description: '' });

    if (uploadInputRef.current) {
      uploadInputRef.current.value = '';
    }
  };

  const submitUpload = async () => {
    if (!projectId || !uploadTarget) return;

    if (!uploadForm.file) {
      toast.error('برای آپلود پیوست، انتخاب فایل الزامی است.');
      return;
    }

    try {
      setUploading(true);
      await projectFinanceService.uploadAttachment(projectId, getFinanceRecordId(uploadTarget), {
        file: uploadForm.file,
        description: uploadForm.description,
      });

      setUploadTarget(null);
      toast.success('پیوست مالی آپلود شد.');
      await loadFinanceWorkspace();
    } catch (err) {
      toast.error(getErrorMessage(err, 'خطا در آپلود پیوست مالی'));
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAttachment = async (
    record: ProjectFinanceRecord,
    attachmentId: string,
  ) => {
    const confirmed = await confirmToast({
      title: 'حذف پیوست مالی',
      description: 'این پیوست از رکورد مالی حذف شود؟',
      confirmText: 'حذف پیوست',
      variant: 'danger',
    });

    if (!confirmed || !projectId) return;

    try {
      await projectFinanceService.deleteAttachment(
        projectId,
        getFinanceRecordId(record),
        attachmentId,
      );
      toast.success('پیوست مالی حذف شد.');
      await loadFinanceWorkspace();
    } catch (err) {
      toast.error(getErrorMessage(err, 'خطا در حذف پیوست مالی'));
    }
  };

  const renderRecordActions = (record: ProjectFinanceRecord) => {
    const canSettle =
      !isFinanceActualType(record.type) &&
      record.status !== 'cancelled' &&
      record.status !== 'rejected' &&
      Number(record.remainingAmount || 0) > 0;

    const canApprove = canManage && ['draft', 'submitted'].includes(record.status);
    const canReject = canManage && !['rejected', 'cancelled', 'achieved'].includes(record.status);

    return (
      <div className="flex flex-wrap justify-end gap-1.5">
        <button className="btn btn-ghost btn-xs" onClick={() => openEditModal(record)}>
          <PencilSquareIcon className="h-4 w-4" />
          ویرایش
        </button>

        <button className="btn btn-ghost btn-xs" onClick={() => openUploadModal(record)}>
          <DocumentArrowUpIcon className="h-4 w-4" />
          پیوست
        </button>

        {canSettle ? (
          <button className="btn btn-success btn-xs" onClick={() => openSettleModal(record)}>
            <CheckCircleIcon className="h-4 w-4" />
            تحقق
          </button>
        ) : null}

        {canApprove ? (
          <button className="btn btn-primary btn-xs" onClick={() => handleApprove(record)}>
            تأیید
          </button>
        ) : null}

        {canReject ? (
          <button className="btn btn-warning btn-xs" onClick={() => openRejectModal(record)}>
            رد
          </button>
        ) : null}

        {canManage ? (
          <button className="btn btn-error btn-xs" onClick={() => handleCancel(record)}>
            <TrashIcon className="h-4 w-4" />
            لغو
          </button>
        ) : null}
      </div>
    );
  };

  const renderRecordsTable = (items: ProjectFinanceRecord[]) => {
    if (!items.length) {
      return (
        <EmptyBox
          title="رکورد مالی ثبت نشده است"
          description="برای شروع، پیش‌بینی دریافت، فاکتور، دریافت واقعی یا پرداخت واقعی ثبت کنید."
        />
      );
    }

    return (
      <div className="overflow-x-auto rounded-3xl border border-base-300 bg-base-100">
        <table className="table table-zebra min-w-[1100px]">
          <thead>
            <tr className="text-right">
              <th>رکورد</th>
              <th>نوع</th>
              <th>وضعیت</th>
              <th>مبلغ نهایی</th>
              <th>تحقق</th>
              <th>تاریخ مهم</th>
              <th>ثبت‌کننده</th>
              <th>پیوست</th>
              <th className="text-left">عملیات</th>
            </tr>
          </thead>

          <tbody>
            {items.map((record) => {
              const recordId = getFinanceRecordId(record);
              const mainDate = record.actualDate || record.dueDate || record.forecastDate || record.invoiceDate;

              return (
                <tr key={recordId}>
                  <td>
                    <div className="max-w-xs">
                      <div className="font-black text-base-content">{record.title}</div>
                      <div className="mt-1 text-xs leading-6 text-base-content/55">
                        {record.invoiceNumber ? `شماره فاکتور: ${record.invoiceNumber}` : record.description || 'بدون توضیح'}
                      </div>
                      {record.counterparty?.name ? (
                        <div className="mt-1 text-xs font-bold text-base-content/55">
                          طرف حساب: {record.counterparty.name}
                        </div>
                      ) : null}
                    </div>
                  </td>

                  <td>
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${typeBadgeClass[record.type]}`}>
                      {getRecordDisplayType(record)}
                    </span>
                  </td>

                  <td>
                    <span className={`badge ${statusBadgeClass[record.status] || 'badge-ghost'}`}>
                      {getRecordDisplayStatus(record.status, record.statusLabel)}
                    </span>
                  </td>

                  <td>
                    <div className="font-black text-base-content">
                      {formatMoney(record.finalAmount, record.currency)}
                    </div>
                    {record.remainingAmount > 0 ? (
                      <div className="mt-1 text-xs text-error">
                        مانده: {formatMoney(record.remainingAmount, record.currency)}
                      </div>
                    ) : null}
                  </td>

                  <td>
                    {isFinanceActualType(record.type) ? (
                      <span className="text-xs font-bold text-success">واقعی ثبت‌شده</span>
                    ) : (
                      <div className="min-w-36 space-y-2">
                        <div className="flex items-center justify-between gap-2 text-xs font-bold">
                          <span>{formatPercent(record.achievementPercent)}</span>
                          <span>{formatMoney(record.achievedAmount, record.currency)}</span>
                        </div>
                        <ProgressBar value={record.achievementPercent} />
                      </div>
                    )}
                  </td>

                  <td>{formatDate(mainDate)}</td>

                  <td>{getUserDisplayName(record.registeredById)}</td>

                  <td>
                    <span className="badge badge-outline">
                      {formatNumber(record.attachments?.length || 0)} فایل
                    </span>
                  </td>

                  <td className="text-left">{renderRecordActions(record)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderSummary = () => {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="پیش‌بینی دریافت"
            value={formatMoney(summary.totalIncomeForecast)}
            description={`تحقق: ${formatPercent(summary.incomeAchievementPercent)}`}
            icon={ArrowDownTrayIcon}
            tone="success"
          />
          <SummaryCard
            title="پیش‌بینی هزینه"
            value={formatMoney(summary.totalExpenseForecast)}
            description={`تحقق هزینه: ${formatPercent(summary.expenseRealizationPercent)}`}
            icon={BanknotesIcon}
            tone="warning"
          />
          <SummaryCard
            title="سود پیش‌بینی‌شده"
            value={formatMoney(summary.forecastProfit)}
            description={`سود واقعی: ${formatMoney(summary.actualProfit)}`}
            icon={ReceiptPercentIcon}
            tone="primary"
          />
          <SummaryCard
            title="فاکتورهای سررسید گذشته"
            value={formatMoney(summary.overdueReceivableAmount + summary.overduePayableAmount)}
            description={`${formatNumber(summary.recordsWithoutReasonCount)} مورد بدون دلیل عدم تحقق`}
            icon={ExclamationTriangleIcon}
            tone={summary.recordsWithoutReasonCount ? 'error' : 'info'}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl border border-base-300 bg-base-100 p-5 lg:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-base-content">تحقق درآمد و هزینه</h2>
                <p className="mt-1 text-sm text-base-content/55">
                  مقایسه پیش‌بینی‌ها با دریافت‌ها و پرداخت‌های واقعی پروژه.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm font-bold">
                  <span>تحقق دریافت‌ها</span>
                  <span>{formatPercent(summary.incomeAchievementPercent)}</span>
                </div>
                <ProgressBar value={summary.incomeAchievementPercent} />
                <div className="mt-2 grid gap-2 text-xs text-base-content/55 md:grid-cols-2">
                  <span>پیش‌بینی: {formatMoney(summary.totalIncomeForecast)}</span>
                  <span>واقعی: {formatMoney(summary.totalActualReceipts)}</span>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between text-sm font-bold">
                  <span>تحقق هزینه‌ها</span>
                  <span>{formatPercent(summary.expenseRealizationPercent)}</span>
                </div>
                <ProgressBar value={summary.expenseRealizationPercent} />
                <div className="mt-2 grid gap-2 text-xs text-base-content/55 md:grid-cols-2">
                  <span>پیش‌بینی: {formatMoney(summary.totalExpenseForecast)}</span>
                  <span>واقعی: {formatMoney(summary.totalActualPayments)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-base-300 bg-base-100 p-5">
            <h2 className="text-lg font-black text-base-content">هشدارهای مالی</h2>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-warning/10 p-4 text-warning">
                <div className="text-sm font-black">در انتظار تأیید</div>
                <div className="mt-1 text-xl font-black">{formatMoney(summary.pendingApprovalAmount)}</div>
              </div>
              <div className="rounded-2xl bg-error/10 p-4 text-error">
                <div className="text-sm font-black">ردشده</div>
                <div className="mt-1 text-xl font-black">{formatMoney(summary.rejectedAmount)}</div>
              </div>
              <div className="rounded-2xl bg-base-200 p-4 text-base-content">
                <div className="text-sm font-black">اختلاف سود واقعی با پیش‌بینی</div>
                <div className="mt-1 text-xl font-black">{formatMoney(summary.profitVariance)}</div>
              </div>
            </div>
          </div>
        </div>

        {overdueRecords.length ? (
          <div className="rounded-3xl border border-error/20 bg-error/5 p-5">
            <div className="mb-4 flex items-center gap-2 text-error">
              <ExclamationTriangleIcon className="h-5 w-5" />
              <h2 className="font-black">موارد محقق‌نشده یا سررسید گذشته</h2>
            </div>
            {renderRecordsTable(overdueRecords)}
          </div>
        ) : null}
      </div>
    );
  };

  const renderInvoiceReport = (items: ProjectFinanceInvoiceReportItem[]) => {
    if (!items.length) {
      return <EmptyBox title="فاکتوری ثبت نشده است" description="فاکتورهای دریافتنی و پرداختنی این پروژه اینجا گزارش می‌شوند." />;
    }

    return (
      <div className="overflow-x-auto rounded-3xl border border-base-300 bg-base-100">
        <table className="table table-zebra min-w-[1050px]">
          <thead>
            <tr className="text-right">
              <th>فاکتور</th>
              <th>طرف حساب</th>
              <th>مبلغ</th>
              <th>تحقق</th>
              <th>سررسید</th>
              <th>وضعیت</th>
              <th>دلیل عدم تحقق</th>
              <th>پیوست</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <div className="font-black">{item.title}</div>
                  <div className="mt-1 text-xs text-base-content/55">
                    {item.invoiceNumber || 'بدون شماره فاکتور'} · {item.typeLabel || projectFinanceTypeLabels[item.type]}
                  </div>
                </td>
                <td>{item.counterparty?.name || '—'}</td>
                <td>{formatMoney(item.finalAmount)}</td>
                <td>
                  <div className="min-w-36 space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span>{formatPercent(item.achievementPercent)}</span>
                      <span>{formatMoney(item.remainingAmount)} مانده</span>
                    </div>
                    <ProgressBar value={item.achievementPercent} />
                  </div>
                </td>
                <td>
                  <div>{formatDate(item.dueDate)}</div>
                  {item.delayDays > 0 ? (
                    <div className="mt-1 text-xs font-bold text-error">
                      {formatNumber(item.delayDays)} روز تأخیر
                    </div>
                  ) : null}
                </td>
                <td>
                  <span className={`badge ${statusBadgeClass[item.status] || 'badge-ghost'}`}>
                    {getRecordDisplayStatus(item.status, item.statusLabel)}
                  </span>
                </td>
                <td className="max-w-xs whitespace-normal text-xs leading-6">
                  {item.notAchievedReason || item.delayReason || '—'}
                </td>
                <td>{formatNumber(item.attachmentsCount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderForecastReport = (items: ProjectFinanceForecastReportItem[]) => {
    if (!items.length) {
      return <EmptyBox title="پیش‌بینی مالی ثبت نشده است" description="پیش‌بینی دریافت‌ها و هزینه‌ها مبنای محاسبه تحقق مالی پروژه هستند." />;
    }

    return (
      <div className="overflow-x-auto rounded-3xl border border-base-300 bg-base-100">
        <table className="table table-zebra min-w-[1000px]">
          <thead>
            <tr className="text-right">
              <th>پیش‌بینی</th>
              <th>مبلغ پیش‌بینی</th>
              <th>تحقق</th>
              <th>فاکتورهای مرتبط</th>
              <th>تراکنش‌های واقعی</th>
              <th>سررسید</th>
              <th>وضعیت</th>
              <th>دلیل انحراف</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <div className="font-black">{item.title}</div>
                  <div className="mt-1 text-xs text-base-content/55">
                    {item.typeLabel || projectFinanceTypeLabels[item.type]}
                  </div>
                </td>
                <td>{formatMoney(item.forecastAmount)}</td>
                <td>
                  <div className="min-w-36 space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span>{formatPercent(item.achievementPercent)}</span>
                      <span>{formatMoney(item.remainingAmount)} مانده</span>
                    </div>
                    <ProgressBar value={item.achievementPercent} />
                  </div>
                </td>
                <td>
                  <div>{formatNumber(item.linkedInvoicesCount)} فاکتور</div>
                  <div className="text-xs text-base-content/55">{formatMoney(item.linkedInvoicesAmount)}</div>
                </td>
                <td>
                  <div>{formatNumber(item.linkedActualTransactionsCount)} تراکنش</div>
                  <div className="text-xs text-base-content/55">{formatMoney(item.linkedActualTransactionsAmount)}</div>
                </td>
                <td>{formatDate(item.dueDate || item.forecastDate)}</td>
                <td>
                  <span className={`badge ${statusBadgeClass[item.status] || 'badge-ghost'}`}>
                    {getRecordDisplayStatus(item.status, item.statusLabel)}
                  </span>
                </td>
                <td className="max-w-xs whitespace-normal text-xs leading-6">
                  {item.varianceReason || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderCashflowReport = (items: ProjectFinanceCashflowItem[]) => {
    if (!items.length) {
      return <EmptyBox title="جریان نقدی برای نمایش وجود ندارد" description="با ثبت پیش‌بینی‌ها و تراکنش‌های واقعی، جریان نقدی ماهانه ساخته می‌شود." />;
    }

    return (
      <div className="overflow-x-auto rounded-3xl border border-base-300 bg-base-100">
        <table className="table table-zebra min-w-[950px]">
          <thead>
            <tr className="text-right">
              <th>ماه</th>
              <th>دریافت پیش‌بینی</th>
              <th>دریافت واقعی</th>
              <th>انحراف دریافت</th>
              <th>هزینه پیش‌بینی</th>
              <th>هزینه واقعی</th>
              <th>انحراف هزینه</th>
              <th>خالص پیش‌بینی</th>
              <th>خالص واقعی</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.month}>
                <td className="font-black">{item.month}</td>
                <td>{formatMoney(item.forecastIncome)}</td>
                <td>{formatMoney(item.actualIncome)}</td>
                <td className={item.incomeVariance < 0 ? 'text-error' : 'text-success'}>
                  {formatMoney(item.incomeVariance)}
                </td>
                <td>{formatMoney(item.forecastExpense)}</td>
                <td>{formatMoney(item.actualExpense)}</td>
                <td className={item.expenseVariance > 0 ? 'text-error' : 'text-success'}>
                  {formatMoney(item.expenseVariance)}
                </td>
                <td>{formatMoney(item.netForecast)}</td>
                <td className={item.netActual < item.netForecast ? 'text-warning' : 'text-success'}>
                  {formatMoney(item.netActual)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderPeopleReport = (items: ProjectFinancePeopleReportItem[]) => {
    if (!items.length) {
      return <EmptyBox title="گزارش عملکرد افراد وجود ندارد" description="بعد از ثبت رکورد مالی توسط اعضای پروژه، عملکرد هر فرد اینجا نمایش داده می‌شود." />;
    }

    return (
      <div className="overflow-x-auto rounded-3xl border border-base-300 bg-base-100">
        <table className="table table-zebra min-w-[850px]">
          <thead>
            <tr className="text-right">
              <th>فرد</th>
              <th>ثبت‌شده</th>
              <th>تأییدشده</th>
              <th>ردشده</th>
              <th>مبلغ ثبت‌شده</th>
              <th>مبلغ تأییدشده</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.userId || item.userName}>
                <td>
                  <div className="font-black">{item.userName}</div>
                  <div className="mt-1 text-xs text-base-content/55">{item.userRole || '—'}</div>
                </td>
                <td>{formatNumber(item.submittedRecords)}</td>
                <td>{formatNumber(item.approvedRecords)}</td>
                <td>{formatNumber(item.rejectedRecords)}</td>
                <td>{formatMoney(item.totalSubmittedAmount)}</td>
                <td>{formatMoney(item.totalApprovedAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderAttachmentsPanel = () => {
    const recordsWithAttachments = records.filter((record) => record.attachments?.length);

    if (!recordsWithAttachments.length) return null;

    return (
      <div className="rounded-3xl border border-base-300 bg-base-100 p-5">
        <h2 className="text-lg font-black text-base-content">پیوست‌های مالی</h2>
        <p className="mt-1 text-sm text-base-content/55">
          فایل‌های فاکتور، رسید، مستند پرداخت یا مدارک مالی ثبت‌شده در پروژه.
        </p>

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {recordsWithAttachments.map((record) => (
            <div key={getFinanceRecordId(record)} className="rounded-2xl border border-base-300 bg-base-200 p-4">
              <div className="font-black text-base-content">{record.title}</div>
              <div className="mt-3 space-y-2">
                {(record.attachments || []).map((attachment) => {
                  const attachmentId = getFinanceAttachmentId(attachment);

                  return (
                    <div key={attachmentId} className="flex items-center justify-between gap-3 rounded-xl bg-base-100 px-3 py-2 text-xs">
                      <a
                        href={resolveFileUrl(attachment.fileUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="min-w-0 truncate font-bold hover:text-primary"
                      >
                        {attachment.originalName || attachment.fileName}
                      </a>

                      {canManage ? (
                        <button
                          className="btn btn-ghost btn-xs text-error"
                          onClick={() => handleDeleteAttachment(record, attachmentId)}
                        >
                          حذف
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-24" dir="rtl">
          <span className="loading loading-spinner loading-lg" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6" dir="rtl">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <Link
              href={projectId ? `/dashboard/projects/${projectId}` : '/dashboard/projects'}
              className="mb-3 inline-flex items-center gap-2 text-sm text-base-content/55 hover:text-primary"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              بازگشت به جزئیات پروژه
            </Link>

            <h1 className="text-2xl font-black text-base-content">
              مالی پروژه {project?.title ? `«${project.title}»` : ''}
            </h1>

            <p className="mt-1 max-w-3xl text-sm leading-7 text-base-content/55">
              ثبت پیش‌بینی‌ها، فاکتورها، دریافت‌ها، پرداخت‌ها، دلایل عدم تحقق و گزارش کامل مالی پروژه.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button className="btn btn-ghost" onClick={loadFinanceWorkspace}>
              <ArrowPathIcon className="h-5 w-5" />
              بروزرسانی
            </button>

            <button className="btn btn-primary" onClick={openCreateModal}>
              <PlusIcon className="h-5 w-5" />
              رکورد مالی جدید
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="دریافت واقعی"
            value={formatMoney(summary.totalActualReceipts)}
            description={`از پیش‌بینی ${formatMoney(summary.totalIncomeForecast)}`}
            icon={ArrowDownTrayIcon}
            tone="success"
          />
          <SummaryCard
            title="پرداخت واقعی"
            value={formatMoney(summary.totalActualPayments)}
            description={`از پیش‌بینی ${formatMoney(summary.totalExpenseForecast)}`}
            icon={BanknotesIcon}
            tone="warning"
          />
          <SummaryCard
            title="فاکتورهای دریافتنی"
            value={formatMoney(summary.totalReceivableInvoices)}
            description={`سررسید گذشته: ${formatMoney(summary.overdueReceivableAmount)}`}
            icon={ReceiptPercentIcon}
            tone="info"
          />
          <SummaryCard
            title="فاکتورهای پرداختنی"
            value={formatMoney(summary.totalPayableInvoices)}
            description={`سررسید گذشته: ${formatMoney(summary.overduePayableAmount)}`}
            icon={DocumentTextIcon}
            tone="error"
          />
        </div>

        <div className="rounded-3xl border border-base-300 bg-base-100 p-3 shadow-sm">
          <div className="flex flex-wrap gap-2">
            {tabItems.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.key;

              return (
                <button
                  key={tab.key}
                  className={`btn btn-sm rounded-2xl ${active ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === 'records' ? (
          <div className="rounded-3xl border border-base-300 bg-base-100 p-5">
            <div className="grid gap-3 lg:grid-cols-5">
              <input
                className="input input-bordered bg-base-100 lg:col-span-2"
                placeholder="جستجو در عنوان، شماره فاکتور یا طرف حساب"
                value={filters.search || ''}
                onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              />

              <select
                className="select select-bordered bg-base-100"
                value={filters.type || ''}
                onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value as ProjectFinanceType | '' }))}
              >
                <option value="">همه نوع‌ها</option>
                {projectFinanceTypeOptions.map((type) => (
                  <option key={type} value={type}>
                    {projectFinanceTypeLabels[type]}
                  </option>
                ))}
              </select>

              <select
                className="select select-bordered bg-base-100"
                value={filters.status || ''}
                onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as any }))}
              >
                <option value="">همه وضعیت‌ها</option>
                {projectFinanceStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {projectFinanceStatusLabels[status]}
                  </option>
                ))}
              </select>

              <button className="btn btn-neutral" onClick={loadFinanceWorkspace}>
                <ArrowPathIcon className="h-5 w-5" />
                اعمال فیلتر
              </button>
            </div>
          </div>
        ) : null}

        {activeTab === 'summary' ? renderSummary() : null}
        {activeTab === 'records' ? renderRecordsTable(filteredRecords) : null}
        {activeTab === 'invoices' ? renderInvoiceReport(report.invoices || []) : null}
        {activeTab === 'forecasts' ? renderForecastReport(report.forecasts || []) : null}
        {activeTab === 'cashflow' ? renderCashflowReport(report.cashflow || []) : null}
        {activeTab === 'people' ? renderPeopleReport(report.people || []) : null}

        {renderAttachmentsPanel()}

        <FinanceRecordFormModal
          open={formOpen}
          record={editingRecord}
          records={records}
          canManage={canManage}
          onClose={() => setFormOpen(false)}
          onSubmit={handleSaveRecord}
        />

        {settleTarget ? (
          <dialog className="modal modal-open" dir="rtl">
            <div className="modal-box max-w-2xl bg-base-100">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black">ثبت تحقق مالی</h3>
                  <p className="mt-1 text-sm leading-7 text-base-content/55">
                    برای «{settleTarget.title}» دریافت یا پرداخت واقعی ثبت کنید.
                  </p>
                </div>
                <button className="btn btn-ghost btn-sm btn-circle" onClick={() => setSettleTarget(null)}>
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="form-control">
                  <span className="label label-text">مبلغ تحقق</span>
                  <input
                    type="number"
                    min={0}
                    className="input input-bordered bg-base-100"
                    value={settleForm.amount}
                    onChange={(event) => setSettleForm((current) => ({ ...current, amount: event.target.value }))}
                  />
                </label>

                <label className="form-control">
                  <span className="label label-text">تاریخ تحقق</span>
                  <input
                    type="date"
                    className="input input-bordered bg-base-100"
                    value={settleForm.actualDate}
                    onChange={(event) => setSettleForm((current) => ({ ...current, actualDate: event.target.value }))}
                  />
                </label>

                <label className="form-control md:col-span-2">
                  <span className="label label-text">عنوان تراکنش واقعی</span>
                  <input
                    className="input input-bordered bg-base-100"
                    value={settleForm.title}
                    placeholder="اگر خالی باشد، عنوان خودکار ساخته می‌شود."
                    onChange={(event) => setSettleForm((current) => ({ ...current, title: event.target.value }))}
                  />
                </label>

                <label className="form-control md:col-span-2">
                  <span className="label label-text">توضیحات</span>
                  <textarea
                    className="textarea textarea-bordered min-h-24 bg-base-100"
                    value={settleForm.description}
                    onChange={(event) => setSettleForm((current) => ({ ...current, description: event.target.value }))}
                  />
                </label>

                {canManage ? (
                  <label className="form-control md:col-span-2">
                    <span className="label label-text">یادداشت مدیر</span>
                    <textarea
                      className="textarea textarea-bordered min-h-20 bg-base-100"
                      value={settleForm.managerNote}
                      onChange={(event) => setSettleForm((current) => ({ ...current, managerNote: event.target.value }))}
                    />
                  </label>
                ) : null}
              </div>

              <div className="modal-action">
                <button className="btn btn-ghost" onClick={() => setSettleTarget(null)}>
                  انصراف
                </button>
                <button className="btn btn-success" disabled={settling} onClick={submitSettle}>
                  {settling ? <span className="loading loading-spinner loading-sm" /> : null}
                  ثبت تحقق
                </button>
              </div>
            </div>
          </dialog>
        ) : null}

        {rejectTarget ? (
          <dialog className="modal modal-open" dir="rtl">
            <div className="modal-box max-w-xl bg-base-100">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black">رد رکورد مالی</h3>
                  <p className="mt-1 text-sm leading-7 text-base-content/55">
                    دلیل رد برای «{rejectTarget.title}» الزامی است.
                  </p>
                </div>
                <button className="btn btn-ghost btn-sm btn-circle" onClick={() => setRejectTarget(null)}>
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <label className="form-control mt-5">
                <span className="label label-text">دلیل رد</span>
                <textarea
                  className="textarea textarea-bordered min-h-28 bg-base-100"
                  value={rejectForm.rejectionReason}
                  onChange={(event) => setRejectForm({ rejectionReason: event.target.value })}
                />
              </label>

              <div className="modal-action">
                <button className="btn btn-ghost" onClick={() => setRejectTarget(null)}>
                  انصراف
                </button>
                <button className="btn btn-warning" disabled={rejecting} onClick={submitReject}>
                  {rejecting ? <span className="loading loading-spinner loading-sm" /> : null}
                  رد رکورد
                </button>
              </div>
            </div>
          </dialog>
        ) : null}

        {uploadTarget ? (
          <dialog className="modal modal-open" dir="rtl">
            <div className="modal-box max-w-xl bg-base-100">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black">آپلود پیوست مالی</h3>
                  <p className="mt-1 text-sm leading-7 text-base-content/55">
                    فایل فاکتور، رسید یا مستندات مالی برای «{uploadTarget.title}» بارگذاری شود.
                  </p>
                </div>
                <button className="btn btn-ghost btn-sm btn-circle" onClick={() => setUploadTarget(null)}>
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-5 space-y-4">
                <label className="form-control">
                  <span className="label label-text">فایل</span>
                  <input
                    ref={uploadInputRef}
                    type="file"
                    className="file-input file-input-bordered w-full bg-base-100"
                    onChange={(event) => setUploadForm((current) => ({ ...current, file: event.target.files?.[0] || null }))}
                  />
                </label>

                <label className="form-control">
                  <span className="label label-text">توضیح پیوست</span>
                  <textarea
                    className="textarea textarea-bordered min-h-24 bg-base-100"
                    value={uploadForm.description}
                    onChange={(event) => setUploadForm((current) => ({ ...current, description: event.target.value }))}
                  />
                </label>
              </div>

              <div className="modal-action">
                <button className="btn btn-ghost" onClick={() => setUploadTarget(null)}>
                  انصراف
                </button>
                <button className="btn btn-primary" disabled={uploading || !uploadForm.file} onClick={submitUpload}>
                  {uploading ? <span className="loading loading-spinner loading-sm" /> : null}
                  آپلود پیوست
                </button>
              </div>
            </div>
          </dialog>
        ) : null}
      </div>
    </DashboardLayout>
  );
};