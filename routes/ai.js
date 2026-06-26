const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const FORM_FIELDS = [
  'title', 'domain', 'similarIdea',
  'description', 'problemSolved', 'importance', 'consequences',
  'solution', 'differentiator', 'prototype',
  'executionSteps', 'phases', 'duration', 'resources', 'budget',
  'audience', 'value', 'competitors',
  'challenges', 'riskManagement', 'futureVision'
];

const SYSTEM_PROMPT = `تو دستیار هوشمند پلتفرم «ایدوس» هستی. وظیفه تو این است که با گفت‌وگوی دوستانه و طبیعی به کاربر کمک کنی ایده‌اش را در یک فرم ۷ بخشی ساختاریافته بریزد.

روند کار:
1. ابتدا از کاربر بخواه ایده‌اش را در چند جمله کلی توصیف کند.
2. سپس با سؤالات کوتاه، یکی‌دو موضوع در هر نوبت (نه بیشتر)، اطلاعات لازم برای فیلدهای زیر را جمع‌آوری کن. لازم نیست به ترتیب باشد و هر فیلدی که کاربر کامل توضیح داد را دیگر سؤال نکن.
3. لحن تو باید گرم، کوتاه و فارسی روان باشد. سؤالات طولانی یا رسمی نپرس.
4. وقتی برای یک یا چند فیلد اطلاعات کافی جمع شد، آن‌ها را در یک بلوک JSON (دقیقاً با فرمت زیر) در انتهای پاسخت قرار بده. این بلوک هرگز به کاربر نشان داده نمی‌شود، فقط برای پر کردن فرم استفاده می‌شود.
5. متن خودِ JSON را در پاسخ معمولی تکرار نکن یا توضیح نده.

فیلدهای فرم (نام دقیق کلیدها در JSON):
- title: عنوان ایده
- domain: حوزه ایده (مثلاً آموزش، محیط زیست، فناوری)
- similarIdea: مقایسه با نمونه‌های مشابه قبلی
- description: شرح ایده در حداکثر ۵ خط
- problemSolved: مسئله‌ای که حل می‌کند
- importance: چرا این مسئله مهم است
- consequences: پیامد عدم اجرا
- solution: راه‌حل پیشنهادی چگونه عمل می‌کند
- differentiator: وجه تمایز ایده
- prototype: نمونه اولیه یا مدل آزمایشی
- executionSteps: مراحل اجرا به ترتیب
- phases: تعداد فازهای اجرا
- duration: مدت زمان هر فاز
- resources: منابع مالی، انسانی، فنی مورد نیاز
- budget: برآورد هزینه اولیه
- audience: مخاطب اصلی
- value: ارزش پیشنهادی برای مخاطب
- competitors: رقبا و تفاوت
- challenges: مهم‌ترین چالش‌های اجرا
- riskManagement: راهکار مدیریت چالش‌ها
- futureVision: چشم‌انداز ۵ ساله

فرمت دقیق بلوک انتهای پاسخ (فقط وقتی دیتای جدیدی برای فیلدی داری؛ اگر فیلدی هنوز معلوم نیست، در JSON نگذارش):
\`\`\`json
{"title": "...", "description": "..."}
\`\`\`

وقتی حس کردی اطلاعات کافی برای بیشتر فیلدهای مهم (به‌خصوص title، description، problemSolved، solution، audience) جمع شده، در پاسخ متنی به کاربر بگو که می‌تواند فرم را بررسی و تکمیل کند، اما همچنان آماده پاسخ به سؤالات بیشتر باش.

همیشه پاسخ‌هایت کوتاه، صمیمی و رو به جلو باشد — مثل یک هم‌فکر علاقه‌مند، نه یک فرم بازجویی.`;

function extractJsonBlock(text) {
  const match = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (!match) return { reply: text.trim(), formData: null };
  const jsonStr = match[1];
  const reply = text.replace(match[0], '').trim();
  try {
    const parsed = JSON.parse(jsonStr);
    const formData = {};
    for (const key of FORM_FIELDS) {
      if (parsed[key] !== undefined && parsed[key] !== null && parsed[key] !== '') {
        formData[key] = parsed[key];
      }
    }
    return { reply, formData: Object.keys(formData).length ? formData : null };
  } catch {
    return { reply, formData: null };
  }
}

// POST /api/ai/chat — { messages: [{role, content}], currentFormData: {...} }
router.post('/chat', auth, async (req, res) => {
  try {
    if (!GEMINI_API_KEY) {
      return res.status(503).json({ error: 'دستیار هوش مصنوعی در حال حاضر تنظیم نشده است' });
    }

    const { messages = [] } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'پیام نامعتبر است' });
    }

    // Build Gemini "contents" — map our roles to Gemini roles
    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const payload = {
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 800 }
    };

    const geminiRes = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('Gemini API error:', errText);
      return res.status(502).json({ error: 'خطا در ارتباط با دستیار هوش مصنوعی' });
    }

    const data = await geminiRes.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';

    if (!rawText) {
      return res.status(502).json({ error: 'پاسخی از دستیار دریافت نشد' });
    }

    const { reply, formData } = extractJsonBlock(rawText);
    res.json({ reply, formData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در پردازش درخواست' });
  }
});

module.exports = router;
