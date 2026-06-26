# EIDOS — پلتفرم اشتراک ایده

## Stack
- **Backend:** Node.js + Express
- **Database:** MongoDB Atlas (رایگان)
- **Deploy:** Koyeb یا Render (رایگان)
- **Auth:** JWT + bcrypt
- **AI Assistant:** Google Gemini API

---

## ویژگی‌های جدید این نسخه

✅ **دستیار هوش مصنوعی برای پر کردن فرم ایده** — کاربر با دستیار چت می‌کند، دستیار سؤال می‌پرسد و فرم ۷ بخشی را خودکار پر می‌کند (قابل ویرایش)
✅ **پنل مدیریت** — آمار سایت، حذف ایده، پین کردن ایده
✅ **پین کردن ایده** — ایده‌های پین‌شده همیشه بالای فید (Latest و Trending) قرار می‌گیرند
✅ **جستجوی زنده** — جستجو بر اساس عنوان، نام کاربری، یا حوزه

---

## راهنمای راه‌اندازی رایگان

### ۱. MongoDB Atlas (دیتابیس رایگان)

1. به [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) بروید
2. **Free** → Create account
3. یک Cluster رایگان (M0 Free Tier) بسازید
4. روی **Connect** کلیک کنید → **Drivers** → Node.js
5. connection string را کپی کنید و در `.env` به‌عنوان `MONGODB_URI` بگذارید

---

### ۲. Google Gemini API (برای دستیار هوش مصنوعی)

1. به [aistudio.google.com/apikey](https://aistudio.google.com/apikey) بروید
2. با اکانت Google وارد شوید
3. روی **Create API key** کلیک کنید
4. کلید را کپی کنید و در `.env` به‌عنوان `GEMINI_API_KEY` بگذارید

> ⚠️ **نکته مهم:** نام مدل‌های Gemini مرتب به‌روزرسانی می‌شود. مقدار پیش‌فرض در این پروژه `gemini-2.0-flash` است؛ اگر در لاگ سرور خطای «model not found» دیدید، به [مستندات مدل‌های Gemini](https://ai.google.dev/gemini-api/docs/models) بروید و نام مدل فعلی را در `.env` به‌عنوان `GEMINI_MODEL` بگذارید.

> اگر `GEMINI_API_KEY` را خالی بگذارید، سایت کامل کار می‌کند اما دکمه «شروع چت» با دستیار خطای «در حال حاضر تنظیم نشده» می‌دهد — بقیه‌ی سایت (ثبت‌نام، ثبت ایده دستی، لایک، کامنت، پنل مدیریت) بدون مشکل کار می‌کند.

---

### ۳. GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/eidos.git
git push -u origin main
```

---

### ۴. Koyeb (هاست رایگان، بدون sleep)

1. به [koyeb.com](https://www.koyeb.com) بروید و با GitHub ثبت‌نام کنید
2. **Create App** → **GitHub** → ریپوی خود را انتخاب کنید
3. Koyeb خودکار Node.js را تشخیص می‌دهد؛ تنظیمات:
   - **Build command:** `npm install`
   - **Run command:** `npm start`
   - **Port:** `3000` (یا همان مقدار `PORT` در `.env`)
4. در بخش **Environment variables** اضافه کنید:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `GEMINI_API_KEY`
   - `GEMINI_MODEL` (اختیاری)
5. **Deploy** بزنید

### جایگزین: Render.com
اگر Koyeb را نخواستید، همان مراحل را در [render.com](https://render.com) با **New + → Web Service** تکرار کنید. توجه: پلن رایگان Render بعد از ۱۵ دقیقه بی‌استفاده‌بودن sleep می‌شود (فقط کندتر بیدار می‌شود، هزینه‌ای ندارد).

---

### ۵. ساخت ادمین اول

بعد از دیپلوی، یک حساب معمولی ثبت‌نام کنید، سپس در MongoDB Atlas:
1. به **Browse Collections** بروید
2. کالکشن `users` → کاربر خودتان را پیدا کنید
3. فیلد `isAdmin` را از `false` به `true` تغییر دهید

با ورود دوباره، لینک «پنل مدیریت» در نوار بالای سایت ظاهر می‌شود.

---

## ساختار فایل‌ها

```
eidos/
├── server.js
├── models/
│   ├── User.js
│   └── Idea.js          # شامل فیلدهای pinned و pinnedAt
├── routes/
│   ├── auth.js           # ورود/ثبت‌نام
│   ├── ideas.js          # CRUD + لایک + کامنت + پین
│   ├── users.js          # پروفایل کاربران
│   ├── ai.js             # دستیار هوش مصنوعی (Gemini)
│   └── admin.js          # آمار پنل مدیریت
├── middleware/
│   └── auth.js           # JWT + adminAuth
├── public/
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js         # شامل منطق چت AI و پنل ادمین
└── uploads/
```

---

## API Endpoints

| Method | Route | Auth | توضیح |
|--------|-------|------|-------|
| POST | /api/auth/register | - | ثبت‌نام |
| POST | /api/auth/login | - | ورود |
| GET | /api/ideas | - | لیست ایده‌ها (پشتیبانی از sort, search) |
| GET | /api/ideas/:id | - | یک ایده |
| POST | /api/ideas | ✓ | ثبت ایده |
| POST | /api/ideas/:id/like | ✓ | لایک |
| POST | /api/ideas/:id/comment | ✓ | کامنت |
| DELETE | /api/ideas/:id | ✓ admin/owner | حذف |
| POST | /api/ideas/:id/pin | ✓ admin | پین/برداشتن پین |
| GET | /api/users/:username | - | پروفایل |
| POST | /api/ai/chat | ✓ | چت با دستیار هوش مصنوعی |
| GET | /api/admin/stats | ✓ admin | آمار کلی سایت |

---

## نحوه‌ی کار دستیار هوش مصنوعی

1. کاربر روی «🤖 شروع چت» در فرم ثبت ایده کلیک می‌کند
2. در یک پنجره‌ی چت، ایده‌اش را با چند جمله توصیف می‌کند
3. دستیار (مدل Gemini) سؤالات کوتاه و هدفمند می‌پرسد تا اطلاعات ۲۱ فیلد فرم را جمع کند
4. هم‌زمان یک نوار پیشرفت نشان می‌دهد چند بخش از فرم تکمیل شده
5. با کلیک روی «رفتن به فرم»، مقادیر جمع‌آوری‌شده در فیلدهای واقعی فرم قرار می‌گیرد (با هایلایت سبز موقت) و کاربر می‌تواند هرکدام را ویرایش کند پیش از ثبت نهایی

تمام منطق پردازش زبان طبیعی و استخراج JSON سمت سرور (`routes/ai.js`) انجام می‌شود — کلید API هرگز در مرورگر کاربر قرار نمی‌گیرد.
