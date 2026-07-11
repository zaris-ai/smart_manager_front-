# اصلاح نوع formatter در Recharts LabelList

## مشکل

در نسخه فعلی Recharts، ورودی `LabelList.formatter` از نوع `RenderableText` است و علاوه بر `string` و `number` می‌تواند `boolean`، `null` یا `undefined` نیز باشد. بنابراین تابعی که فقط `string | number | null | undefined` می‌پذیرد با `LabelFormatter` سازگار نیست.

## راه‌حل

برای هر دو نمودار پروژه، نوع مشترک زیر استفاده شده است:

- `string | number | boolean | null | undefined`

مقادیر غیرعددی مانند `false`، `null` و `undefined` بدون نمایش برچسب برگردانده می‌شوند. رشته و عدد نیز قبل از نمایش به عدد تبدیل و با `Number.isFinite` اعتبارسنجی می‌شوند.

## فایل‌های اصلاح‌شده

- `src/components/project-charts/ProjectChartsPage.tsx`
- `src/pages/dashboard/projects/[id].tsx`
