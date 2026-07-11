const RoleHelpPanel = () => {
  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 text-right text-blue-950 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
      <h3 className="text-lg font-bold">راهنمای نقش‌ها و اتصال تلگرام</h3>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-900">
          <h4 className="font-bold">هیئت مدیره</h4>
          <p className="mt-2 text-sm leading-7 text-gray-600 dark:text-gray-300">
            هیئت مدیره دسترسی مشاهده‌ای و نظارتی دارد. این نقش می‌تواند وضعیت کلی پروژه‌ها، گزارش‌ها، فایل‌ها، وظایف و روند پیشرفت را مشاهده کند، اما امکان ایجاد، ویرایش، حذف، تخصیص وظیفه یا تغییر وضعیت عملیاتی را ندارد.
          </p>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-900">
          <h4 className="font-bold">مدیر</h4>
          <p className="mt-2 text-sm leading-7 text-gray-600 dark:text-gray-300">
            مدیر می‌تواند کاربران را ایجاد و ویرایش کند، پروژه تعریف کند، کاربران و کارشناسان را به پروژه و وظایف تخصیص دهد، یادداشت پیشرفت ثبت کند، فایل‌های پروژه را مدیریت کند و وضعیت اجرای پروژه‌ها را پیگیری کند.
          </p>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-900">
          <h4 className="font-bold">کارشناس</h4>
          <p className="mt-2 text-sm leading-7 text-gray-600 dark:text-gray-300">
            کارشناس فقط پروژه‌ها و وظایف تخصیص‌یافته به خودش را مشاهده می‌کند و می‌تواند گزارش، توضیح، فایل، عکس، ویس و وضعیت پیشرفت کارهای خودش را ثبت یا به‌روزرسانی کند.
          </p>
        </div>
      </div>

      <p className="mt-4 text-sm leading-7">
        اتصال تلگرام با کد یک‌بارمصرف انجام می‌شود. مدیر از صفحه «ربات تلگرام» برای کاربر کد می‌سازد و کاربر با لینک مستقیم یا دستور <span dir="ltr">/link CODE</span> حسابش را متصل می‌کند. شناسه‌های Telegram User ID و Chat ID به‌صورت دستی وارد نمی‌شوند.
      </p>
    </div>
  );
};

export default RoleHelpPanel;