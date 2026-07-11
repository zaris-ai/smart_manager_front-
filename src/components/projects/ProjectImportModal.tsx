import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { projectService } from '@/services/project.service';
import { ProjectImportResult } from '@/types/project';
import {
  ArrowDownTrayIcon,
  CheckCircleIcon,
  DocumentArrowUpIcon,
  ExclamationTriangleIcon,
  FlagIcon,
  PencilSquareIcon,
  TableCellsIcon,
  UserGroupIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

type ProjectImportModalProps = {
  open: boolean;
  onClose: () => void;
  onImported: () => Promise<void> | void;
};

const getSheetLabel = (sheet?: string): string => {
  if (sheet === 'Projects') return 'پروژه‌ها';
  if (sheet === 'Phases') return 'فازها';

  return 'نامشخص';
};

export const ProjectImportModal = ({
  open,
  onClose,
  onImported,
}: ProjectImportModalProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<ProjectImportResult | null>(null);
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);

  const totalProjectRows = useMemo(() => {
    if (!result) return 0;

    return result.totalProjectRows ?? result.totalRows ?? 0;
  }, [result]);

  const resetState = () => {
    setSelectedFile(null);
    setResult(null);
    setError('');
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;

    if (!selectedFile) {
      setError('ابتدا فایل اکسل را انتخاب کنید.');
      return;
    }

    const normalizedFileName = selectedFile.name.toLowerCase();

    if (!normalizedFileName.endsWith('.xlsx') && !normalizedFileName.endsWith('.xls')) {
      setError('فقط فایل اکسل با پسوند xlsx یا xls قابل ورود است.');
      return;
    }

    try {
      setImporting(true);
      setError('');
      setResult(null);

      const response = await projectService.importProjectsFromExcel(selectedFile);

      setResult(response);
      setSelectedFile(null);

      if (response.createdCount > 0) {
        await onImported();
      }

      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ورود پروژه‌ها از اکسل');
    } finally {
      setImporting(false);
    }
  };

  if (!open) return null;

  return (
    <dialog className="modal modal-open" dir="rtl">
      <div className="modal-box max-w-5xl rounded-3xl bg-base-100 p-0 text-right">
        <div className="border-b border-base-300 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <DocumentArrowUpIcon className="h-7 w-7" />
              </div>

              <div>
                <h3 className="text-xl font-extrabold text-base-content">
                  ورود گروهی پروژه‌ها و فازها از اکسل
                </h3>
                <p className="mt-1 max-w-3xl text-sm leading-7 text-base-content/60">
                  اکسل فقط برای اطلاعات پروژه، زمان‌بندی و مالی است. مسئول پروژه، اعضا،
                  نقش‌ها و مسئولان فازها بعد از ورود و از داخل سامانه تعیین می‌شوند.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-ghost btn-sm btn-circle"
              onClick={handleClose}
              aria-label="بستن"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-info/20 bg-info/5 p-4">
              <div className="flex items-start gap-3">
                <TableCellsIcon className="mt-1 h-5 w-5 shrink-0 text-info" />
                <div>
                  <h4 className="font-bold text-base-content">شیت Projects</h4>
                  <p className="mt-1 text-sm leading-7 text-base-content/60">
                    ستون‌ها: title، description، status، priority، start_date و due_date
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <FlagIcon className="mt-1 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <h4 className="font-bold text-base-content">شیت Phases</h4>
                  <p className="mt-1 text-sm leading-7 text-base-content/60">
                    عنوان پروژه و فاز، ترتیب، تاریخ‌ها و مبالغ مالی ساده هر فاز ثبت می‌شود.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-warning/25 bg-warning/10 p-4">
            <div className="flex items-start gap-3">
              <UserGroupIcon className="mt-1 h-5 w-5 shrink-0 text-warning" />
              <div>
                <h4 className="font-bold text-base-content">افراد را در اکسل وارد نکنید</h4>
                <p className="mt-1 text-sm leading-7 text-base-content/65">
                  ستون‌های username، اعضا، نقش‌ها و مسئول فاز حذف شده‌اند. پس از ورود، از
                  صفحه ویرایش هر پروژه مسئول پروژه و مسئولان فازها را از فهرست کاربران فعال
                  انتخاب کنید.
                </p>

                <Link
                  href="/templates/projects-import-sample.xlsx"
                  className="btn btn-info btn-sm mt-3"
                  download
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  دانلود قالب جدید اکسل
                </Link>
              </div>
            </div>
          </div>

          {error ? (
            <div className="alert alert-error items-start">
              <ExclamationTriangleIcon className="h-5 w-5" />
              <span>{error}</span>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="form-control">
              <span className="label label-text">فایل اکسل پروژه‌ها و فازها</span>
              <input
                type="file"
                accept=".xlsx,.xls"
                className="file-input file-input-bordered w-full bg-base-100"
                onChange={(event) => {
                  setSelectedFile(event.target.files?.[0] || null);
                  setResult(null);
                  setError('');
                }}
              />
              {selectedFile ? (
                <span className="label-text-alt mt-2 text-base-content/55">
                  فایل انتخاب‌شده: {selectedFile.name}
                </span>
              ) : null}
            </label>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" className="btn btn-ghost" onClick={handleClose}>
                انصراف
              </button>

              <button
                type="submit"
                className="btn btn-primary min-w-40"
                disabled={importing || !selectedFile}
              >
                {importing ? (
                  <>
                    <span className="loading loading-spinner loading-sm" />
                    در حال ورود...
                  </>
                ) : (
                  <>
                    <DocumentArrowUpIcon className="h-5 w-5" />
                    ورود پروژه‌ها
                  </>
                )}
              </button>
            </div>
          </form>

          {result ? (
            <div className="rounded-3xl border border-base-300 bg-base-200/60 p-4">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2">
                  {result.createdCount > 0 ? (
                    <CheckCircleIcon className="h-6 w-6 text-success" />
                  ) : (
                    <ExclamationTriangleIcon className="h-6 w-6 text-warning" />
                  )}
                  <h4 className="font-extrabold text-base-content">نتیجه ورود اکسل</h4>
                </div>

                {result.staffingMode === 'post_import' ? (
                  <span className="badge badge-warning badge-outline rounded-xl px-3 py-3 text-xs font-black">
                    تخصیص افراد بعد از ورود
                  </span>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <div className="rounded-2xl bg-base-100 p-4">
                  <div className="text-xs text-base-content/55">ردیف پروژه</div>
                  <div className="mt-1 text-2xl font-black">{totalProjectRows}</div>
                </div>

                <div className="rounded-2xl bg-base-100 p-4">
                  <div className="text-xs text-base-content/55">ردیف فاز</div>
                  <div className="mt-1 text-2xl font-black">
                    {result.totalPhaseRows ?? 0}
                  </div>
                </div>

                <div className="rounded-2xl bg-base-100 p-4">
                  <div className="text-xs text-base-content/55">پروژه ایجادشده</div>
                  <div className="mt-1 text-2xl font-black text-success">
                    {result.createdCount}
                  </div>
                </div>

                <div className="rounded-2xl bg-base-100 p-4">
                  <div className="text-xs text-base-content/55">فاز ایجادشده</div>
                  <div className="mt-1 text-2xl font-black text-primary">
                    {result.createdPhaseCount ?? 0}
                  </div>
                </div>

                <div className="rounded-2xl bg-base-100 p-4">
                  <div className="text-xs text-base-content/55">رد شده</div>
                  <div className="mt-1 text-2xl font-black text-warning">
                    {result.skippedCount}
                  </div>
                </div>

                <div className="rounded-2xl bg-base-100 p-4">
                  <div className="text-xs text-base-content/55">خطادار</div>
                  <div className="mt-1 text-2xl font-black text-error">
                    {result.failedCount}
                  </div>
                </div>
              </div>

              {result.created.length ? (
                <div className="mt-4">
                  <div className="mb-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <h5 className="text-sm font-bold text-base-content">پروژه‌های ایجادشده</h5>
                    <span className="text-xs leading-6 text-base-content/55">
                      برای فعال شدن چرخه اجرایی، تخصیص‌ها را تکمیل کنید.
                    </span>
                  </div>

                  <div className="max-h-64 overflow-y-auto rounded-2xl border border-base-300 bg-base-100">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>ردیف</th>
                          <th>عنوان</th>
                          <th>فازها</th>
                          <th>وضعیت تخصیص</th>
                          <th>اقدام</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.created.map((item) => (
                          <tr key={item.id}>
                            <td>{item.rowNumber}</td>
                            <td className="font-bold">{item.title}</td>
                            <td>{item.phaseCount ?? 0}</td>
                            <td>
                              <span className="badge badge-warning badge-sm">
                                نیازمند تخصیص
                              </span>
                            </td>
                            <td>
                              <Link
                                href={`/dashboard/projects/${item.id}/edit`}
                                className="btn btn-primary btn-xs"
                              >
                                <PencilSquareIcon className="h-4 w-4" />
                                تکمیل افراد و مسئولیت‌ها
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              {result.errors.length ? (
                <div className="mt-4">
                  <h5 className="mb-2 text-sm font-bold text-error">
                    خطاها و ردیف‌های ردشده
                  </h5>

                  <div className="max-h-64 overflow-y-auto rounded-2xl border border-error/20 bg-base-100">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>شیت</th>
                          <th>ردیف</th>
                          <th>عنوان</th>
                          <th>پیام</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.errors.map((item, index) => (
                          <tr key={`${item.sheet || 'unknown'}-${item.rowNumber}-${index}`}>
                            <td>{getSheetLabel(item.sheet)}</td>
                            <td>{item.rowNumber}</td>
                            <td>{item.title || '—'}</td>
                            <td className="text-error">{item.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <form method="dialog" className="modal-backdrop">
        <button type="button" onClick={handleClose}>
          close
        </button>
      </form>
    </dialog>
  );
};
