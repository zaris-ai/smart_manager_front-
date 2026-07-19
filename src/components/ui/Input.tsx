import {
  ForwardedRef,
  InputHTMLAttributes,
  ReactNode,
  forwardRef,
  useId,
  useState,
} from 'react';
import { cn } from '@/utils/cn';
import {
  EyeIcon,
  EyeSlashIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      disabled,
      placeholder,
      id,
      dir = 'rtl',
      ...props
    },
    ref: ForwardedRef<HTMLInputElement>,
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    const [showPassword, setShowPassword] = useState(false);

    const isPassword = type === 'password';
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

    const hasStartIcon = Boolean(leftIcon);
    const hasEndAction = Boolean(rightIcon) || isPassword;

    return (
      <div className="form-control w-full text-right" dir="rtl">
        {label ? (
          <label htmlFor={inputId} className="mb-2 block">
            <span className="text-sm font-bold text-base-content/80">
              {label}
            </span>
          </label>
        ) : null}

        <div className="relative flex items-center">
          {hasStartIcon ? (
            <div className="pointer-events-none absolute right-4 top-1/2 z-10 flex h-5 w-5 -translate-y-1/2 items-center justify-center text-base-content/45">
              {leftIcon}
            </div>
          ) : null}

          <input
            id={inputId}
            ref={ref}
            type={inputType}
            dir={dir}
            disabled={disabled}
            placeholder={placeholder}
            aria-invalid={Boolean(error)}
            aria-describedby={error || hint ? `${inputId}-message` : undefined}
            className={cn(
              'input input-bordered h-12 min-h-12 w-full rounded-2xl bg-base-100 text-right text-[15px] font-medium text-base-content',
              'border-base-300 placeholder:text-base-content/35',
              'transition-all duration-200',
              'focus:border-primary focus:bg-base-100 focus:outline-none focus:ring-4 focus:ring-primary/10',
              'disabled:cursor-not-allowed disabled:bg-base-200 disabled:text-base-content/45',
              hasStartIcon ? 'pr-12' : 'pr-4',
              hasEndAction || error ? 'pl-12' : 'pl-4',
              error ? 'input-error border-error focus:border-error focus:ring-error/10' : '',
              className,
            )}
            {...props}
          />

          {isPassword ? (
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute left-2 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-base-content/45 transition hover:bg-base-200 hover:text-base-content"
              tabIndex={-1}
              aria-label={showPassword ? 'مخفی کردن رمز عبور' : 'نمایش رمز عبور'}
            >
              {showPassword ? (
                <EyeSlashIcon className="h-5 w-5" />
              ) : (
                <EyeIcon className="h-5 w-5" />
              )}
            </button>
          ) : rightIcon ? (
            <div className="pointer-events-none absolute left-4 top-1/2 z-10 flex h-5 w-5 -translate-y-1/2 items-center justify-center text-base-content/45">
              {rightIcon}
            </div>
          ) : error ? (
            <div className="pointer-events-none absolute left-4 top-1/2 z-10 flex h-5 w-5 -translate-y-1/2 items-center justify-center text-error">
              <ExclamationCircleIcon className="h-5 w-5" />
            </div>
          ) : null}
        </div>

        {error || hint ? (
          <div className="mt-2 min-h-5">
            <p
              id={`${inputId}-message`}
              className={cn(
                'text-xs leading-5',
                error
                  ? 'font-semibold text-error'
                  : 'font-medium text-base-content/55',
              )}
            >
              {error || hint}
            </p>
          </div>
        ) : null}
      </div>
    );
  },
);

Input.displayName = 'Input';

export default Input;