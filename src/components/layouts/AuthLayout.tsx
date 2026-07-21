import { UserAvatar } from '@/components/common';
import { ROUTES } from '@/config/constants';
import {
  ArrowRightIcon,
  ChartBarSquareIcon,
  ClipboardDocumentCheckIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  title,
  subtitle,
  showBackButton = false,
}) => {
  return (
    <div className="min-h-screen bg-base-200 text-base-content" dir="rtl">
      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="flex items-center justify-center px-4 py-8 sm:px-6 lg:px-12">
          <div className="w-full max-w-md">
            <div className="mb-6 flex items-center justify-between">
              <Link
                href={ROUTES.HOME}
                className="inline-flex items-center gap-3 rounded-2xl bg-base-100 px-4 py-3 shadow-sm transition hover:shadow-md"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-content">
                  آ
                </span>
                <span>
                  <span className="block text-lg font-extrabold text-primary">
                    آوید
                  </span>
                  <span className="block text-xs text-base-content/55">
                    پنل مدیریت پروژه
                  </span>
                </span>
              </Link>
            </div>

            <div className="rounded-[2rem] border border-base-300 bg-base-100 p-6 shadow-xl shadow-base-content/5 sm:p-8">
              <div className="mb-7 text-right">
                {showBackButton ? (
                  <button
                    onClick={() => window.history.back()}
                    className="btn btn-ghost btn-sm mb-4 gap-2"
                    type="button"
                  >
                    <ArrowRightIcon className="h-4 w-4" />
                    بازگشت
                  </button>
                ) : null}

                <h1 className="text-2xl font-extrabold tracking-tight text-base-content">
                  {title}
                </h1>

                {subtitle ? (
                  <p className="mt-2 text-sm leading-7 text-base-content/60">
                    {subtitle}
                  </p>
                ) : null}
              </div>

              {children}

              <p className="mt-7 rounded-2xl bg-base-200 p-3 text-center text-xs leading-6 text-base-content/55">
                با ورود به سامانه، قوانین استفاده و سیاست حفظ حریم خصوصی را
                می‌پذیرید.
              </p>
            </div>
          </div>
        </section>

        <section className="relative hidden overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-secondary lg:block">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute -right-24 top-20 h-80 w-80 rounded-full border-[48px] border-white/30" />
            <div className="absolute -bottom-20 -left-20 h-96 w-96 rounded-full border-[56px] border-white/20" />
          </div>

          <div className="relative z-10 flex min-h-screen flex-col justify-center p-14 text-primary-content">
            <div className="max-w-xl">
              <div className="mb-8 inline-flex rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur">
                سیستم مدیریت کار، پروژه و گزارش روزانه
              </div>

              <div className="mb-9 flex items-center" dir="ltr" aria-label="اعضای تیم">
                {Array.from({ length: 7 }).map((_, index) => (
                  <UserAvatar
                    key={index}
                    size={index === 3 ? 'lg' : 'md'}
                    name={`عضو تیم ${index + 1}`}
                    className="-ml-3 border-4 border-white/80 shadow-xl first:ml-0"
                    eager
                  />
                ))}
              </div>

              <h2 className="text-5xl font-extrabold leading-tight drop-shadow-lg">
                مدیریت شفاف پروژه‌ها با یک تیم قابل مشاهده
              </h2>

              <p className="mt-6 text-lg leading-9 text-white/85">
                کاربران، پروژه‌ها، وظایف، فایل‌ها، تقویم و هشدارهای مدیریتی در
                یک پنل یکپارچه مدیریت می‌شوند.
              </p>

              <div className="mt-10 grid gap-4">
                <div className="flex items-center gap-3 rounded-2xl bg-white/15 p-4 backdrop-blur">
                  <UserGroupIcon className="h-6 w-6" />
                  <span className="font-semibold">مدیریت کاربران و نقش‌ها</span>
                </div>

                <div className="flex items-center gap-3 rounded-2xl bg-white/15 p-4 backdrop-blur">
                  <ClipboardDocumentCheckIcon className="h-6 w-6" />
                  <span className="font-semibold">ثبت وظایف و گزارش کار</span>
                </div>

                <div className="flex items-center gap-3 rounded-2xl bg-white/15 p-4 backdrop-blur">
                  <ChartBarSquareIcon className="h-6 w-6" />
                  <span className="font-semibold">داشبورد و تحلیل اجرایی</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AuthLayout;
