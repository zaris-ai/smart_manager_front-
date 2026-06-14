import { LoginForm } from '@/components/auth';
import { AuthLayout } from '@/components/layouts';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

const LoginPage = () => {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/dashboard');
    }
  }, [status, router]);

  return (
    <AuthLayout
      title="ورود به پنل مدیریتی آوید"
      subtitle="برای ورود، نام کاربری و رمز عبور خود را وارد کنید."
    >
      <LoginForm />
    </AuthLayout>
  );
};

export default LoginPage;