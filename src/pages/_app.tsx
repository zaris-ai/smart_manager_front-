import type { AppProps } from 'next/app';
import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/providers';
import '@/styles/globals.css';

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps) {
  return (
    <SessionProvider session={session}>
      <ThemeProvider>
        <Component {...pageProps} />

        <Toaster
          position="top-center"
          richColors
          closeButton
          dir="rtl"
          toastOptions={{
            style: {
              direction: 'rtl',
              textAlign: 'right',
              fontFamily: 'var(--font-vazir)',
            },
          }}
        />
      </ThemeProvider>
    </SessionProvider>
  );
}