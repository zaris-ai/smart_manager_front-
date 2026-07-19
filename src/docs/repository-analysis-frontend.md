# Repository Analysis Frontend

The frontend preserves the existing login, NextAuth configuration, and access-level behavior. It only extends the repository-analysis workflow.

## Analysis input

The start-analysis dialog supports:

- Branch, tag, or commit.
- UTF-8 expectations file.
- Supplementary expectations text.
- Concurrent-user target.
- Requests-per-second target.
- Latency target.
- Availability target.
- Data-volume target.
- Growth horizon.
- Optional OpenAI enhancement.

Supported uploads are TXT, Markdown, JSON, YAML, CSV, XML, HTML, and LOG up to 512 KB.

## Report sections

- Management summary
- Project readiness
- Capacity and pressure
- Observer code review
- Architecture
- Packages
- Repository structure
- Technical report

The overview and repository-detail pages surface the latest readiness score. Active runs continue to poll automatically.

## Interpretation rule

The UI explicitly distinguishes static architectural assessment from measured capacity. It never presents an estimated number of users as proven without load testing.

## تحلیل عمیق چندمرحله‌ای

در تحلیل‌های جدید، Backend فراداده `analysisQuality` را برمی‌گرداند. صفحه گزارش تب «کیفیت تحلیل» دارد و موارد زیر را نمایش می‌دهد:

- موتور تحلیل (`python_multi_pass`، fallback تک‌مرحله‌ای یا deterministic)
- نسخه pipeline
- مراحل اجراشده
- تعداد batchهای فایل
- تعداد KPIهای استخراج‌شده
- درصد KPIهای دارای evidence معتبر
- نتیجه reviewer مخالف
- تعداد ادعاهای حذف‌شده
- شواهد ناقص و مسیر فایل‌های مرجع

وجود این اطلاعات به معنی اجرای پروژه یا load test نیست؛ فقط قابلیت ممیزی گزارش AI را افزایش می‌دهد.
