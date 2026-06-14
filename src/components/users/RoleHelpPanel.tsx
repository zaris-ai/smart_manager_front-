const RoleHelpPanel = () => {
  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 text-right text-blue-950 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
      <h3 className="text-lg font-bold">راهنمای نقش‌ها</h3>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-900">
          <h4 className="font-bold">مدیر</h4>
          <p className="mt-2 text-sm leading-7 text-gray-600 dark:text-gray-300">
            مدیر می‌تواند کاربران را ایجاد و ویرایش کند، پروژه تعریف کند، کاربران را به پروژه و وظایف تخصیص دهد، یادداشت پیشرفت ثبت کند و فایل‌های پروژه را مدیریت کند.
          </p>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-900">
          <h4 className="font-bold">کارمند</h4>
          <p className="mt-2 text-sm leading-7 text-gray-600 dark:text-gray-300">
            کارمند فقط پروژه‌ها و وظایف تخصیص‌یافته به خودش را مشاهده می‌کند و می‌تواند وضعیت وظایف خودش را به‌روزرسانی کند.
          </p>
        </div>
      </div>

      <p className="mt-4 text-sm leading-7">
        در این نسخه، دسترسی‌ها ساده و عملیاتی هستند. دیگر نیازی به تعریف permission جداگانه یا access level نیست.
      </p>
    </div>
  );
};


export default RoleHelpPanel;