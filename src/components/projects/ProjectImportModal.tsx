import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { projectService } from '@/services/project.service';
import { ProjectImportResult } from '@/types/project';
import {
    ArrowDownTrayIcon,
    CheckCircleIcon,
    DocumentArrowUpIcon,
    ExclamationTriangleIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';

type ProjectImportModalProps = {
    open: boolean;
    onClose: () => void;
    onImported: () => Promise<void> | void;
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

        if (!selectedFile) {
            setError('ابتدا فایل اکسل را انتخاب کنید.');
            return;
        }

        try {
            setImporting(true);
            setError('');
            setResult(null);

            const response = await projectService.importProjectsFromExcel(selectedFile);

            setResult(response);
            setSelectedFile(null);

            await onImported();

            event.currentTarget.reset();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'خطا در ورود پروژه‌ها از اکسل');
        } finally {
            setImporting(false);
        }
    };

    if (!open) return null;

    return (
        <dialog className="modal modal-open" dir="rtl">
            <div className="modal-box max-w-4xl rounded-3xl bg-base-100 p-0 text-right">
                <div className="border-b border-base-300 px-6 py-5">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                <DocumentArrowUpIcon className="h-7 w-7" />
                            </div>

                            <div>
                                <h3 className="text-xl font-extrabold text-base-content">
                                    ورود گروهی پروژه‌ها از اکسل
                                </h3>
                                <p className="mt-1 text-sm leading-7 text-base-content/60">
                                    فایل اکسل باید شامل پروژه‌ها باشد. کاربران باید از قبل در سیستم
                                    وجود داشته باشند و با username در فایل مشخص شوند.
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
                    <div className="rounded-2xl border border-info/20 bg-info/5 p-4">
                        <div className="flex items-start gap-3">
                            <ArrowDownTrayIcon className="mt-1 h-5 w-5 shrink-0 text-info" />
                            <div>
                                <h4 className="font-bold text-base-content">قالب اکسل</h4>
                                <p className="mt-1 text-sm leading-7 text-base-content/60">
                                    ستون‌های اصلی: title، description، status، priority،
                                    start_date، due_date، owner_username، assigned_usernames
                                </p>

                                <Link
                                    href="/templates/projects-import-sample.xlsx"
                                    className="btn btn-info btn-sm mt-3"
                                    download
                                >
                                    دانلود نمونه اکسل
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
                            <span className="label label-text">فایل اکسل پروژه‌ها</span>
                            <input
                                type="file"
                                accept=".xlsx,.xls"
                                className="file-input file-input-bordered w-full"
                                onChange={(event) => {
                                    setSelectedFile(event.target.files?.[0] || null);
                                    setResult(null);
                                    setError('');
                                }}
                            />
                        </label>

                        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={handleClose}
                            >
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
                            <div className="mb-4 flex items-center gap-2">
                                <CheckCircleIcon className="h-6 w-6 text-success" />
                                <h4 className="font-extrabold text-base-content">
                                    نتیجه ورود اکسل
                                </h4>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-4">
                                <div className="rounded-2xl bg-base-100 p-4">
                                    <div className="text-xs text-base-content/55">کل ردیف‌ها</div>
                                    <div className="mt-1 text-2xl font-black">
                                        {result.totalRows}
                                    </div>
                                </div>

                                <div className="rounded-2xl bg-base-100 p-4">
                                    <div className="text-xs text-base-content/55">ایجاد شده</div>
                                    <div className="mt-1 text-2xl font-black text-success">
                                        {result.createdCount}
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
                                    <h5 className="mb-2 text-sm font-bold text-base-content">
                                        پروژه‌های ایجادشده
                                    </h5>

                                    <div className="max-h-44 overflow-y-auto rounded-2xl border border-base-300 bg-base-100">
                                        <table className="table table-sm">
                                            <thead>
                                                <tr>
                                                    <th>ردیف</th>
                                                    <th>عنوان</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {result.created.map((item) => (
                                                    <tr key={item.id}>
                                                        <td>{item.rowNumber}</td>
                                                        <td>{item.title}</td>
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

                                    <div className="max-h-56 overflow-y-auto rounded-2xl border border-error/20 bg-base-100">
                                        <table className="table table-sm">
                                            <thead>
                                                <tr>
                                                    <th>ردیف</th>
                                                    <th>عنوان</th>
                                                    <th>پیام</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {result.errors.map((item, index) => (
                                                    <tr key={`${item.rowNumber}-${index}`}>
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