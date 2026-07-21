# فرانت‌اند گزارش کار کارشناسان

## مسیر صفحه

```text
/dashboard/expert-work-logs
```

## تفکیک نقش‌ها

- نقش `expert` و مقدار قدیمی `employee` فقط به صفحه گزارش کار کارشناسی هدایت می‌شوند.
- نقش‌های مدیریتی `manager`، `board` و aliasهای مدیریتی فقط صفحات مدیریت را می‌بینند.
- کنترل دسترسی علاوه بر مخفی‌سازی منو، در `getServerSideProps` تمام صفحات داشبورد اعمال شده است.
- پس از ورود و هنگام ورود از صفحه اصلی، کاربر براساس نقش به صفحه صحیح هدایت می‌شود.

## فرایند صفحه کارشناسی

1. دریافت پروژه‌های قابل دسترس از `GET /expert-work-logs/projects`.
2. انتخاب پروژه و دریافت فازها و وظایف تخصیص‌یافته از `GET /expert-work-logs/projects/:projectId/context`.
3. ثبت فعالیت با تاریخ شمسی، عنوان، شرح، مدت، درصد پیشرفت، خروجی، مانع و گام بعدی.
4. نمایش گزارش‌ها به‌صورت timeline تفکیک‌شده براساس تاریخ.
5. نمایش نام پروژه و کارشناس برای هر فعالیت.
6. ویرایش و حذف فقط در صورت اعلام مجوز توسط backend.
7. فیلتر براساس پروژه، بازه تاریخ و عبارت جست‌وجو.

## فایل‌های اصلی

- `src/pages/dashboard/expert-work-logs/index.tsx`
- `src/components/expert-work-logs/ExpertWorkLogFormModal.tsx`
- `src/components/expert-work-logs/ExpertWorkLogTimeline.tsx`
- `src/services/expert-work-log.service.ts`
- `src/types/expert-work-log.ts`
- `src/utils/role-access.ts`
