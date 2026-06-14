import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const DAISYUI_THEME_VALUES = [
  'system',
  'light',
  'dark',
  'corporate',
  'business',
  'emerald',
  'winter',
  'nord',
  'cupcake',
  'bumblebee',
  'retro',
  'cyberpunk',
  'synthwave',
  'dracula',
  'night',
  'coffee',
  'dim',
  'luxury',
  'forest',
  'black',
  'halloween',
  'garden',
  'aqua',
  'lofi',
  'pastel',
  'fantasy',
  'wireframe',
  'cmyk',
  'autumn',
  'acid',
  'lemonade',
  'valentine',
  'sunset',
] as const;

export type DaisyTheme = (typeof DAISYUI_THEME_VALUES)[number];

export type DaisyThemeOption = {
  value: DaisyTheme;
  label: string;
  description: string;
};

export const DAISYUI_THEME_OPTIONS: DaisyThemeOption[] = [
  {
    value: 'system',
    label: 'سیستم',
    description: 'هماهنگ با تنظیمات دستگاه',
  },
  {
    value: 'light',
    label: 'Light',
    description: 'تم روشن استاندارد',
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'تم تاریک استاندارد',
  },
  {
    value: 'corporate',
    label: 'Corporate',
    description: 'رسمی و مناسب پنل مدیریتی',
  },
  {
    value: 'business',
    label: 'Business',
    description: 'تیره، جدی و سازمانی',
  },
  {
    value: 'emerald',
    label: 'Emerald',
    description: 'روشن و سبز',
  },
  {
    value: 'winter',
    label: 'Winter',
    description: 'روشن، تمیز و مدرن',
  },
  {
    value: 'nord',
    label: 'Nord',
    description: 'سرد، آرام و حرفه‌ای',
  },
  {
    value: 'cupcake',
    label: 'Cupcake',
    description: 'روشن و نرم',
  },
  {
    value: 'bumblebee',
    label: 'Bumblebee',
    description: 'روشن با تاکید زرد',
  },
  {
    value: 'retro',
    label: 'Retro',
    description: 'گرم و کلاسیک',
  },
  {
    value: 'cyberpunk',
    label: 'Cyberpunk',
    description: 'پررنگ و نمایشی',
  },
  {
    value: 'synthwave',
    label: 'Synthwave',
    description: 'تیره و نئونی',
  },
  {
    value: 'dracula',
    label: 'Dracula',
    description: 'تاریک و توسعه‌دهنده‌پسند',
  },
  {
    value: 'night',
    label: 'Night',
    description: 'تاریک و خوانا',
  },
  {
    value: 'coffee',
    label: 'Coffee',
    description: 'تیره و گرم',
  },
  {
    value: 'dim',
    label: 'Dim',
    description: 'تاریک ملایم',
  },
  {
    value: 'luxury',
    label: 'Luxury',
    description: 'تیره و لوکس',
  },
  {
    value: 'forest',
    label: 'Forest',
    description: 'تیره با حس سبز',
  },
  {
    value: 'black',
    label: 'Black',
    description: 'کاملاً تیره',
  },
  {
    value: 'halloween',
    label: 'Halloween',
    description: 'تیره و نارنجی',
  },
  {
    value: 'garden',
    label: 'Garden',
    description: 'روشن و طبیعی',
  },
  {
    value: 'aqua',
    label: 'Aqua',
    description: 'آبی و پرانرژی',
  },
  {
    value: 'lofi',
    label: 'Lofi',
    description: 'مینیمال',
  },
  {
    value: 'pastel',
    label: 'Pastel',
    description: 'نرم و روشن',
  },
  {
    value: 'fantasy',
    label: 'Fantasy',
    description: 'روشن و رنگی',
  },
  {
    value: 'wireframe',
    label: 'Wireframe',
    description: 'ساده و وایرفریم',
  },
  {
    value: 'cmyk',
    label: 'CMYK',
    description: 'روشن و چاپی',
  },
  {
    value: 'autumn',
    label: 'Autumn',
    description: 'گرم و پاییزی',
  },
  {
    value: 'acid',
    label: 'Acid',
    description: 'روشن و جسور',
  },
  {
    value: 'lemonade',
    label: 'Lemonade',
    description: 'روشن و زرد ملایم',
  },
  {
    value: 'valentine',
    label: 'Valentine',
    description: 'صورتی و نرم',
  },
  {
    value: 'sunset',
    label: 'Sunset',
    description: 'تیره و گرم',
  },
];

const DARK_DAISYUI_THEMES = new Set<DaisyTheme>([
  'dark',
  'business',
  'synthwave',
  'dracula',
  'night',
  'coffee',
  'dim',
  'luxury',
  'forest',
  'black',
  'halloween',
  'sunset',
]);

interface ThemeState {
  theme: DaisyTheme;
  setTheme: (theme: DaisyTheme) => void;
  toggleTheme: () => void;
}

export const isValidDaisyTheme = (value: unknown): value is DaisyTheme => {
  return (
    typeof value === 'string' &&
    DAISYUI_THEME_VALUES.includes(value as DaisyTheme)
  );
};

export const getSystemDaisyTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
};

export const isDarkDaisyTheme = (theme: DaisyTheme): boolean => {
  return DARK_DAISYUI_THEMES.has(theme);
};

export const resolveDaisyTheme = (theme: DaisyTheme): Exclude<DaisyTheme, 'system'> => {
  if (theme === 'system') return getSystemDaisyTheme();

  return theme;
};

export const applyDaisyTheme = (theme: DaisyTheme) => {
  if (typeof document === 'undefined') return;

  const resolvedTheme = resolveDaisyTheme(theme);

  document.documentElement.setAttribute('data-theme', resolvedTheme);

  if (isDarkDaisyTheme(resolvedTheme)) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',

      setTheme: (theme) => {
        applyDaisyTheme(theme);
        set({ theme });
      },

      toggleTheme: () => {
        const currentTheme = get().theme;

        const nextTheme: DaisyTheme =
          currentTheme === 'light'
            ? 'dark'
            : currentTheme === 'dark'
              ? 'system'
              : 'light';

        applyDaisyTheme(nextTheme);
        set({ theme: nextTheme });
      },
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: () => (state) => {
        applyDaisyTheme(state?.theme || 'system');
      },
    },
  ),
);

if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  mediaQuery.addEventListener('change', () => {
    const currentTheme = useThemeStore.getState().theme;

    if (currentTheme === 'system') {
      applyDaisyTheme('system');
    }
  });
}