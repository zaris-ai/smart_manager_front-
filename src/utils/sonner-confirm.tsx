import { toast } from 'sonner';
import {
    ExclamationTriangleIcon,
    ShieldExclamationIcon,
} from '@heroicons/react/24/outline';

type ConfirmToastVariant = 'danger' | 'warning' | 'info';

type ConfirmToastOptions = {
    title: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
    variant?: ConfirmToastVariant;
};

const getVariantClasses = (variant: ConfirmToastVariant) => {
    switch (variant) {
        case 'danger':
            return {
                iconBox: 'bg-error/10 text-error',
                confirmButton: 'btn-error',
            };
        case 'warning':
            return {
                iconBox: 'bg-warning/10 text-warning',
                confirmButton: 'btn-warning',
            };
        default:
            return {
                iconBox: 'bg-info/10 text-info',
                confirmButton: 'btn-info',
            };
    }
};

export const confirmToast = ({
    title,
    description,
    confirmText = 'تایید',
    cancelText = 'انصراف',
    variant = 'danger',
}: ConfirmToastOptions): Promise<boolean> => {
    return new Promise((resolve) => {
        const classes = getVariantClasses(variant);

        const toastId = toast.custom(
            (id) => (
                <div
                    className="w-[min(92vw,420px)] rounded-3xl border border-base-300 bg-base-100 p-4 text-right shadow-2xl"
                    dir="rtl"
                >
                    <div className="flex items-start gap-3">
                        <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${classes.iconBox}`}
                        >
                            {variant === 'danger' ? (
                                <ShieldExclamationIcon className="h-6 w-6" />
                            ) : (
                                <ExclamationTriangleIcon className="h-6 w-6" />
                            )}
                        </div>

                        <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-extrabold leading-7 text-base-content">
                                {title}
                            </h3>

                            {description ? (
                                <p className="mt-1 text-xs leading-6 text-base-content/60">
                                    {description}
                                </p>
                            ) : null}
                        </div>
                    </div>

                    <div className="mt-4 flex flex-row-reverse gap-2">
                        <button
                            type="button"
                            className={`btn btn-sm min-w-24 rounded-xl ${classes.confirmButton}`}
                            onClick={() => {
                                toast.dismiss(id);
                                resolve(true);
                            }}
                        >
                            {confirmText}
                        </button>

                        <button
                            type="button"
                            className="btn btn-ghost btn-sm min-w-20 rounded-xl"
                            onClick={() => {
                                toast.dismiss(id);
                                resolve(false);
                            }}
                        >
                            {cancelText}
                        </button>
                    </div>
                </div>
            ),
            {
                duration: Infinity,
            },
        );

        return toastId;
    });
};