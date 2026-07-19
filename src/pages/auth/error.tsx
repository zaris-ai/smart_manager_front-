import { AuthLayout } from '@/components/layouts';
import Link from 'next/link';
import { useRouter } from 'next/router';

const errorMessages: Record<string, string> = {
  Configuration: 'تنظیمات احراز هویت صحیح نیست.',
  AccessDenied: 'شما اجازه دسترسی به این بخش را ندارید.',
  Verification: 'لینک ورود معتبر نیست یا منقضی شده است.',
  CredentialsSignin: 'نام کاربری یا رمز عبور اشتباه است.',
  RefreshAccessTokenError: 'نشست شما منقضی شده است. دوباره وارد شوید.',
};

export default function AuthErrorPage() {
  const router = useRouter();
  const error = typeof router.query.error === 'string' ? router.query.error : '';
  const message = errorMessages[error] || 'خطا در احراز هویت رخ داده است.';

  return (
    <AuthLayout
      title="خطا در ورود"
      subtitle="ورود به سامانه انجام نشد."
    >
      <div className="space-y-4 text-center" dir="rtl">
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {message}
        </div>

        <Link
          href="/auth/login"
          className="inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          بازگشت به صفحه ورود
        </Link>
      </div>
    </AuthLayout>
  );
}