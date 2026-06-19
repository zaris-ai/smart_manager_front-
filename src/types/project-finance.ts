import { PaginationState, UserReference } from './project';

export type ProjectFinanceType =
  | 'income_forecast'
  | 'expense_forecast'
  | 'receivable_invoice'
  | 'payable_invoice'
  | 'actual_receipt'
  | 'actual_payment';

export type ProjectFinanceDirection = 'income' | 'expense';

export type ProjectFinanceStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'partially_achieved'
  | 'achieved'
  | 'overdue'
  | 'cancelled';

export type ProjectFinanceCurrency = 'IRR' | 'USD' | 'EUR' | 'AED';

export type ProjectFinanceCounterparty = {
  name?: string;
  phone?: string;
  nationalIdOrEconomicCode?: string;
  address?: string;
};

export type ProjectFinanceAttachment = {
  id?: string;
  _id?: string;
  fileName: string;
  originalName: string;
  fileUrl: string;
  fileType?: string;
  fileSize?: number;
  uploadedBy?: UserReference | null;
  uploadedAt?: string;
  description?: string;
};

export type ProjectFinanceLinkedRecord = {
  id?: string;
  _id?: string;
  title?: string;
  invoiceNumber?: string;
  type?: ProjectFinanceType;
  typeLabel?: string;
  finalAmount?: number;
  achievedAmount?: number;
  remainingAmount?: number;
  achievementPercent?: number;
  status?: ProjectFinanceStatus;
  statusLabel?: string;
};

export type ProjectFinanceRecord = {
  id?: string;
  _id?: string;
  projectId: string;
  type: ProjectFinanceType;
  typeLabel?: string;
  direction: ProjectFinanceDirection;
  directionLabel?: string;
  status: ProjectFinanceStatus;
  statusLabel?: string;
  title: string;
  description?: string;
  amount: number;
  taxAmount?: number;
  discountAmount?: number;
  finalAmount: number;
  currency: ProjectFinanceCurrency;
  forecastDate?: string | null;
  dueDate?: string | null;
  actualDate?: string | null;
  invoiceNumber?: string;
  invoiceDate?: string | null;
  counterparty?: ProjectFinanceCounterparty;
  linkedForecastId?: string | ProjectFinanceLinkedRecord | null;
  linkedInvoiceId?: string | ProjectFinanceLinkedRecord | null;
  achievedAmount: number;
  remainingAmount: number;
  achievementPercent: number;
  notAchievedReason?: string;
  delayReason?: string;
  rejectionReason?: string;
  managerNote?: string;
  registeredById?: UserReference | null;
  approvedById?: UserReference | null;
  approvedAt?: string | null;
  attachments?: ProjectFinanceAttachment[];
  createdAt: string;
  updatedAt: string;
};

export type ProjectFinanceRecordPayload = {
  type: ProjectFinanceType;
  status?: ProjectFinanceStatus;
  title: string;
  description?: string;
  amount: number;
  taxAmount?: number;
  discountAmount?: number;
  currency?: ProjectFinanceCurrency;
  forecastDate?: string | null;
  dueDate?: string | null;
  actualDate?: string | null;
  invoiceNumber?: string;
  invoiceDate?: string | null;
  counterparty?: ProjectFinanceCounterparty;
  counterpartyName?: string;
  counterpartyPhone?: string;
  counterpartyNationalIdOrEconomicCode?: string;
  address?: string;
  linkedForecastId?: string | null;
  linkedInvoiceId?: string | null;
  notAchievedReason?: string;
  delayReason?: string;
  managerNote?: string;
};

export type ProjectFinanceSettlePayload = {
  amount: number;
  actualDate?: string | null;
  title?: string;
  description?: string;
  managerNote?: string;
};

export type ProjectFinanceRejectPayload = {
  rejectionReason: string;
};

export type ProjectFinanceListResponse = {
  items: ProjectFinanceRecord[];
  pagination: PaginationState;
};

export type ProjectFinanceSummary = {
  totalIncomeForecast: number;
  totalExpenseForecast: number;
  totalReceivableInvoices: number;
  totalPayableInvoices: number;
  totalActualReceipts: number;
  totalActualPayments: number;
  incomeAchievementPercent: number;
  expenseRealizationPercent: number;
  forecastProfit: number;
  actualProfit: number;
  profitVariance: number;
  overdueReceivableAmount: number;
  overduePayableAmount: number;
  pendingApprovalAmount: number;
  rejectedAmount: number;
  recordsWithoutReasonCount: number;
};

export type ProjectFinanceInvoiceReportItem = {
  id: string;
  invoiceNumber?: string;
  title: string;
  type: ProjectFinanceType;
  typeLabel?: string;
  direction: ProjectFinanceDirection;
  directionLabel?: string;
  counterparty?: ProjectFinanceCounterparty;
  finalAmount: number;
  achievedAmount: number;
  remainingAmount: number;
  achievementPercent: number;
  invoiceDate?: string | null;
  dueDate?: string | null;
  delayDays: number;
  status: ProjectFinanceStatus;
  statusLabel?: string;
  notAchievedReason?: string;
  delayReason?: string;
  registeredBy?: UserReference | null;
  approvedBy?: UserReference | null;
  attachmentsCount: number;
  attachments?: ProjectFinanceAttachment[];
  createdAt: string;
  updatedAt: string;
};

export type ProjectFinanceForecastReportItem = {
  id: string;
  title: string;
  type: ProjectFinanceType;
  typeLabel?: string;
  direction: ProjectFinanceDirection;
  directionLabel?: string;
  forecastAmount: number;
  achievedAmount: number;
  remainingAmount: number;
  achievementPercent: number;
  forecastDate?: string | null;
  dueDate?: string | null;
  status: ProjectFinanceStatus;
  statusLabel?: string;
  linkedInvoicesCount: number;
  linkedInvoicesAmount: number;
  linkedActualTransactionsCount: number;
  linkedActualTransactionsAmount: number;
  varianceReason?: string;
  registeredBy?: UserReference | null;
  approvedBy?: UserReference | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectFinanceCashflowItem = {
  month: string;
  forecastIncome: number;
  actualIncome: number;
  incomeVariance: number;
  forecastExpense: number;
  actualExpense: number;
  expenseVariance: number;
  netForecast: number;
  netActual: number;
  netVariance: number;
};

export type ProjectFinancePeopleReportItem = {
  userId?: string;
  userName: string;
  userRole?: string;
  submittedRecords: number;
  approvedRecords: number;
  rejectedRecords: number;
  totalSubmittedAmount: number;
  totalApprovedAmount: number;
};

export type ProjectFinanceFullReport = {
  summary: ProjectFinanceSummary;
  invoices: ProjectFinanceInvoiceReportItem[];
  forecasts: ProjectFinanceForecastReportItem[];
  cashflow: ProjectFinanceCashflowItem[];
  people: ProjectFinancePeopleReportItem[];
};

export type ProjectFinanceFilters = {
  page?: number;
  limit?: number;
  search?: string;
  type?: ProjectFinanceType | '';
  status?: ProjectFinanceStatus | '';
  direction?: ProjectFinanceDirection | '';
  from?: string;
  to?: string;
  registeredById?: string;
};

export const projectFinanceTypeLabels: Record<ProjectFinanceType, string> = {
  income_forecast: 'پیش‌بینی دریافت',
  expense_forecast: 'پیش‌بینی هزینه',
  receivable_invoice: 'فاکتور دریافتنی',
  payable_invoice: 'فاکتور پرداختنی',
  actual_receipt: 'دریافت واقعی',
  actual_payment: 'پرداخت واقعی',
};

export const projectFinanceStatusLabels: Record<ProjectFinanceStatus, string> = {
  draft: 'پیش‌نویس',
  submitted: 'ثبت‌شده',
  approved: 'تأییدشده',
  rejected: 'ردشده',
  partially_achieved: 'بخشی محقق‌شده',
  achieved: 'محقق‌شده',
  overdue: 'سررسید گذشته',
  cancelled: 'لغوشده',
};

export const projectFinanceDirectionLabels: Record<ProjectFinanceDirection, string> = {
  income: 'درآمد / دریافت',
  expense: 'هزینه / پرداخت',
};

export const projectFinanceCurrencyLabels: Record<ProjectFinanceCurrency, string> = {
  IRR: 'ریال',
  USD: 'دلار',
  EUR: 'یورو',
  AED: 'درهم',
};

export const projectFinanceTypeOptions: ProjectFinanceType[] = [
  'income_forecast',
  'expense_forecast',
  'receivable_invoice',
  'payable_invoice',
  'actual_receipt',
  'actual_payment',
];

export const projectFinanceStatusOptions: ProjectFinanceStatus[] = [
  'draft',
  'submitted',
  'approved',
  'rejected',
  'partially_achieved',
  'achieved',
  'overdue',
  'cancelled',
];

export const projectFinanceCurrencyOptions: ProjectFinanceCurrency[] = [
  'IRR',
  'USD',
  'EUR',
  'AED',
];

export const isFinanceForecastType = (type?: ProjectFinanceType | ''): boolean => {
  return type === 'income_forecast' || type === 'expense_forecast';
};

export const isFinanceInvoiceType = (type?: ProjectFinanceType | ''): boolean => {
  return type === 'receivable_invoice' || type === 'payable_invoice';
};

export const isFinanceActualType = (type?: ProjectFinanceType | ''): boolean => {
  return type === 'actual_receipt' || type === 'actual_payment';
};

export const getFinanceRecordId = (
  record?: Pick<ProjectFinanceRecord, 'id' | '_id'> | null,
): string => {
  return record?.id || record?._id || '';
};

export const getFinanceAttachmentId = (
  attachment?: Pick<ProjectFinanceAttachment, 'id' | '_id'> | null,
): string => {
  return attachment?.id || attachment?._id || '';
};
