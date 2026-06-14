import { Button, Input } from '@/components/ui';
import {
  LockClosedIcon,
  ShieldCheckIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { zodResolver } from '@hookform/resolvers/zod';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const loginSchema = z.object({
  username: z.string().trim().min(1, 'نام کاربری الزامی است.'),
  password: z.string().min(1, 'رمز عبور الزامی است.'),
});

type LoginFormData = z.infer<typeof loginSchema>;

function normalizeAuthError(error: string): string {
  if (error === 'CredentialsSignin') {
    return 'نام کاربری یا رمز عبور اشتباه است.';
  }

  if (error === 'RefreshAccessTokenError') {
    return 'نشست شما منقضی شده است. دوباره وارد شوید.';
  }

  return error || 'خطا در ورود به سامانه.';
}

const LoginForm: React.FC = () => {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    const toastId = toast.loading('در حال بررسی اطلاعات ورود...');

    try {
      setIsLoading(true);
      setError('');

      const result = await signIn('credentials', {
        username: data.username,
        password: data.password,
        redirect: false,
      });

      if (!result) {
        const message = 'پاسخی از سرویس احراز هویت دریافت نشد.';

        setError(message);
        toast.error(message, { id: toastId });
        return;
      }

      if (result.error) {
        const message = normalizeAuthError(result.error);

        setError(message);
        toast.error(message, { id: toastId });
        return;
      }

      toast.success('ورود با موفقیت انجام شد.', { id: toastId });

      await router.replace('/dashboard');
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'خطای غیرمنتظره‌ای رخ داده است. دوباره تلاش کنید.';

      setError(message);
      toast.error(message, { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };
  console.log('test', process.env.API_BASE_URL)
  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6 text-right"
      dir="rtl"
      noValidate
    >
      <div className="rounded-3xl border border-base-300 bg-base-200/60 p-4">
        <div className="flex items-start gap-4">
          <div className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheckIcon className="h-7 w-7" />
          </div>

          <div className="min-w-0">
            <h3 className="text-base font-extrabold text-base-content">
              ورود امن به پنل
            </h3>

            <p className="mt-2 text-sm leading-7 text-base-content/60">
              نام کاربری و رمز عبور را وارد کنید. نشست کاربر به صورت خودکار با
              Refresh Token تمدید می‌شود.
            </p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="alert alert-error items-start rounded-2xl text-right">
          <span className="leading-7">{error}</span>
        </div>
      ) : null}

      <div className="space-y-4">
        <Input
          {...register('username')}
          type="text"
          label="نام کاربری"
          placeholder="نام کاربری خود را وارد کنید"
          error={errors.username?.message}
          hint={!errors.username?.message ? 'مثال: admin' : undefined}
          leftIcon={<UserIcon className="h-5 w-5" />}
          autoComplete="username"
          autoFocus
        />

        <Input
          {...register('password')}
          type="password"
          label="رمز عبور"
          placeholder="رمز عبور خود را وارد کنید"
          error={errors.password?.message}
          leftIcon={<LockClosedIcon className="h-5 w-5" />}
          autoComplete="current-password"
        />
      </div>

      <Button
        type="submit"
        fullWidth
        isLoading={isLoading}
        loadingText="در حال ورود..."
        className="h-12 min-h-12 rounded-2xl text-base font-extrabold"
      >
        ورود به سامانه
      </Button>
    </form>
  );
};

export default LoginForm;