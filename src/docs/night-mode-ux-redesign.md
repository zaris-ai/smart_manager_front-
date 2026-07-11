# Night Mode and Project Detail UX Redesign

## هدف
این مرحله برای بهبود خوانایی حالت شب، کاهش تضادهای ناهماهنگ رنگی، و بهتر شدن تجربه تب‌های صفحه جزئیات پروژه انجام شد.

## تغییرات اصلی

### 1. لایه اصلاح حالت شب
در `src/styles/globals.css` یک لایه محافظ اضافه شد تا کلاس‌های قدیمی مثل `bg-white`، `bg-gray-*`، `text-gray-*` و `border-gray-*` در حالت شب به رنگ‌های سازگار با DaisyUI تبدیل شوند. این کار باعث می‌شود صفحات قدیمی‌تر هم بدون بازنویسی کامل در Night Mode ظاهر قابل قبول‌تری داشته باشند.

### 2. سطح‌های بصری مشترک
کلاس‌های مشترک زیر اضافه شدند:

- `avid-dashboard-shell`
- `avid-glass-surface`
- `avid-tab-strip`
- `avid-tab-button`
- `avid-tab-button-active`
- `avid-health-meter`

این کلاس‌ها برای ساخت ظاهر یکدست‌تر در داشبورد، کارت‌ها، سایدبار، هدر و تب‌ها استفاده شده‌اند.

### 3. تب‌های صفحه جزئیات پروژه
تب‌های پیش‌فرض DaisyUI با ظاهر سفارشی RTL جایگزین شدند. هر تب اکنون شامل آیکن، عنوان، توضیح کوتاه و نشانگر تعداد/وضعیت است. همچنین فقط محتوای تب فعال نمایش داده می‌شود.

### 4. پیشنهاد تصمیم مدیریتی
در تب خلاصه مدیریتی یک کارت «پیشنهاد تصمیم مدیریتی» اضافه شد. این کارت بر اساس وضعیت پروژه، وظایف عقب‌افتاده، وظایف مسدود، نبود فاز یا نبود گزارش کار، اقدام بعدی مدیر را پیشنهاد می‌دهد.

### 5. بهبود Theme Toggle
گزینه‌های حالت شب توسعه داده شدند:

- حالت شب
- شب مدیریتی
- شب ملایم
- شب سازمانی

گزینه `night` به عنوان حالت پیشنهادی برای پنل مدیریتی اضافه شده است.

### 6. نمودارها در حالت شب
رنگ محور و خطوط شبکه نمودارهای Recharts به CSS Variableهای DaisyUI وابسته شد تا در حالت تاریک خواناتر باشند.

## فایل‌های اصلی تغییرکرده

- `src/styles/globals.css`
- `src/components/layouts/DashboardLayout.tsx`
- `src/components/dashboard/DashboardHeader.tsx`
- `src/components/dashboard/DashboardSidebar.tsx`
- `src/components/dashboard/SidebarMenu.tsx`
- `src/components/common/ThemeToggle.tsx`
- `src/stores/theme.store.ts`
- `src/pages/dashboard/projects/[id].tsx`
- `src/components/project-overview/ProjectOverviewPage.tsx`
- `src/components/project-charts/ProjectChartsPage.tsx`

## نکته اجرایی
برای بهترین ظاهر شب در پنل مدیریتی، از منوی تغییر تم گزینه «شب مدیریتی» را انتخاب کنید.
