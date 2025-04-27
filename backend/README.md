# بک‌اند سامانه کاریاب ساختمان

این پروژه بک‌اند سامانه کاریاب ساختمان است که با Node.js، Express و MongoDB توسعه داده شده است.

## قابلیت‌ها

- ثبت‌نام و ورود کاربران (کارفرما و متخصص)
- مدیریت کارها (ایجاد، بروزرسانی، حذف)
- درخواست برای کار توسط متخصصان
- پذیرش متخصص برای کار توسط کارفرما
- سیستم پیام‌رسانی بین کاربران
- گفتگوی آنلاین با Socket.io

## پیش‌نیازها

- Node.js نسخه 14 یا بالاتر
- MongoDB

## نصب و راه‌اندازی

1. نصب وابستگی‌ها:
```
npm install
```

2. ایجاد فایل `.env` با محتوای زیر:
```
PORT=5174
MONGODB_URI=mongodb://localhost:27017/construction_job_platform
JWT_SECRET=YourVerySecretKeyHere123!@#
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
```

3. اجرای پروژه در محیط توسعه:
```
npm run dev
```

4. اجرای پروژه در محیط تولید:
```
npm start
```

## اتصال به فرانت‌اند

برای اتصال فرانت‌اند به بک‌اند، موارد زیر انجام شده است:

1. ایجاد فایل پیکربندی API در `src/api/config.js` برای تنظیم آدرس پایه API و اینترسپتورها
2. ایجاد سرویس‌های احراز هویت در `src/api/authService.js` برای عملیات‌های ورود و ثبت‌نام
3. به‌روزرسانی کامپوننت‌های Login و Register برای استفاده از سرویس‌های احراز هویت

برای اجرای کامل پروژه، ابتدا بک‌اند را با دستور `npm run dev` و سپس فرانت‌اند را با دستور مشابه اجرا کنید.

## ساختار API

### احراز هویت
- `POST /api/auth/register`: ثبت‌نام کاربر جدید
- `POST /api/auth/login`: ورود کاربر
- `GET /api/auth/me`: دریافت اطلاعات کاربر فعلی
- `PATCH /api/auth/updateMe`: بروزرسانی اطلاعات کاربر
- `PATCH /api/auth/updatePassword`: تغییر رمز عبور

### کارها
- `GET /api/jobs`: دریافت همه کارها
- `GET /api/jobs/:id`: دریافت جزئیات یک کار
- `POST /api/jobs`: ایجاد کار جدید (کارفرما)
- `PATCH /api/jobs/:id`: بروزرسانی کار (کارفرما)
- `DELETE /api/jobs/:id`: حذف کار (کارفرما)
- `POST /api/jobs/:id/apply`: درخواست برای کار (متخصص)
- `POST /api/jobs/:jobId/accept-specialist/:specialistId`: پذیرش متخصص (کارفرما)
- `PATCH /api/jobs/:id/complete`: تکمیل کار (کارفرما)

### کارفرمایان
- `GET /api/employers/my-jobs`: دریافت کارهای کارفرما

### متخصصان
- `GET /api/specialists/my-applications`: دریافت درخواست‌های کار متخصص
- `GET /api/specialists/my-jobs`: دریافت کارهای در حال انجام متخصص
- `GET /api/specialists/search`: جستجوی متخصصان

### پیام‌ها
- `POST /api/messages`: ارسال پیام جدید
- `GET /api/messages/unread-count`: دریافت تعداد پیام‌های خوانده نشده
- `GET /api/messages/conversations`: دریافت لیست گفتگوها
- `GET /api/messages/conversation/:userId`: دریافت پیام‌های بین دو کاربر 