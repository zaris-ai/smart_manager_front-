import { Vazirmatn } from 'next/font/google';

/**
 * Vazir / Vazirmatn font from Google Font API through next/font.
 * The exported variable name is kept as `vazir`.
 */
export const vazir = Vazirmatn({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-vazir',
  display: 'swap',
  preload: true,
  fallback: ['Tahoma', 'Arial', 'sans-serif'],
});