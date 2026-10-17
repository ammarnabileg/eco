# النشر على Coolify (v4)

النشر عبارة عن **موردين (Resources)** في نفس المشروع على Coolify:

| المورد | النوع | فيه إيه | الدومين (مثال) |
|---|---|---|---|
| **1. الباك إند** | Docker Compose من GitHub | Postgres + Redis + Meilisearch + Medusa (الـ API ولوحة الأدمن) | `https://api.laly.kw` (الأدمن على `/app`) |
| **2. الستورفرونت** | Application بـ Dockerfile من GitHub | Next.js | `https://laly.kw` |

**ليه موردين ومش واحد؟** الستورفرونت محتاج الـ Publishable key **وقت الـ build**، لأن قيم `NEXT_PUBLIC_*` بتتحط جوه كود المتصفح نفسه. والمفتاح ده مش موجود غير بعد ما الباك إند يشتغل أول مرة ويعمل الداتابيز. لو الاتنين في Compose واحد، أول نشر هيقع.

> اتجرب: الـ compose ده اتبنى واتشغّل بنفس قيم Coolify (متغيرات `SERVICE_*`)، وده اللي اشتغل:
> - الـ migrations والبيانات الأساسية.
> - إنشاء أدمن.
> - استيراد الـ 528 منتج.
> - إثراء المنتجات الـ 15.
> - البحث بالعربي من الـ endpoint الحقيقي (`كاميرا` = 340 نتيجة).
> - رفع صورة، وفضلت موجودة بعد إعادة إنشاء الكونتينر.
> - صفحات الستورفرونت.
>
> **اللي متجربش:** واجهة Coolify نفسها. أسماء الأزرار تحت ممكن تختلف شوية حسب الإصدار.

## المتطلبات

- سيرفر عليه Coolify، بـ **4GB رام على الأقل** (والأفضل 8GB). بناء لوحة الأدمن وNext.js بياكلوا رام، وMeilisearch وPostgres شغالين طول الوقت.
- دومينين، وكل واحد عليه A record لـ IP السيرفر: `api.laly.kw` و`laly.kw`.
- Coolify متوصل بالريبو `ammarnabileg/eco` عن طريق GitHub App، عشان كل push على `main` يعمل نشر لوحده.

---

## 1) الباك إند

1. **New Resource ← Docker Compose** (من الريبو، Private repository عن طريق GitHub App).
   - **Branch:** `main`
   - **Base Directory:** `/`
   - **Docker Compose Location:** `/docker-compose.coolify.yml`
2. في **Environment Variables**، القيم المطلوبة (من غيرها النشر مش هيبدأ):
   ```
   MEDUSA_BACKEND_URL=https://api.laly.kw
   STOREFRONT_URL=https://laly.kw
   ```
   - من غير `/` في الآخر.
   - الباقي اختياري، ويتملى لما المفاتيح تيجي: KlickPay، وTaly، وDeema، وQuickBooks، وS3. التفاصيل في `docs/PAYMENTS.md` و`docs/QUICKBOOKS.md`.
   - كلمات السر بتتولّد لوحدها (`SERVICE_PASSWORD_*`، و`SERVICE_HEX_64_QUICKBOOKS`) ومبتتغيرش بين النشرات. **متغيرهاش بعد أول نشر:**
     - تغيير باسورد Postgres بعد ما الداتابيز اتعملت هيقطع الاتصال.
     - تغيير مفتاح QuickBooks هيخلّيك تعمل ربط من جديد.
   ⚠️ **اتجرب فعلاً على Coolify 4.4.6:** الإصدار ده **مش بيمنع النشر** لو المتغيرين دول فاضيين، رغم إن الملف معلّم عليهم إنهم مطلوبين. علشان كده الباك إند نفسه بيرفض يشتغل من غيرهم، وبيكتب في الـ logs: `MEDUSA_BACKEND_URL must be set`. ولو قيم CORS طالعة `${...}` حرفياً، اكتبها صريحة:
   ```
   STORE_CORS=https://laly.kw
   ADMIN_CORS=https://api.laly.kw
   AUTH_CORS=https://api.laly.kw,https://laly.kw
   ```
3. على خدمة **backend** حط الدومين بالبورت الداخلي: `https://api.laly.kw:9000`. البورت ده بيقول لـ Coolify يوجّه لأنهي بورت جوه الكونتينر، لكن الزوار بيدخلوا على 443 عادي.
4. **Deploy.**
   - أول build بياخد من 5 لـ 10 دقايق.
   - الـ migrations والبيانات الأساسية بتتعمل لوحدها مع كل تشغيل: المتجر بالدينار، ومنطقة الكويت، وقناة البيع، وPublishable key، والشحن.
   - اتأكد: `https://api.laly.kw/health` لازم يرجّع `OK`.

### بعد أول نشر (مرة واحدة): من Terminal الخاص بخدمة backend في Coolify

```sh
# 1. حساب الأدمن
npx medusa user -e you@laly.kw -p 'كلمة-سر-قوية'

# 2. التصنيفات (36)، وقوالب المواصفات، والبراندات، ومجموعات الإضافات
npx medusa exec ./src/scripts/catalog/setup-catalog.js

# 3. المنتجات من CSV بتاع Botble. ارفع الملف في أي مكان فيه رابط مباشر
#    (R2، أو Google Drive برابط تحميل، ...) وبعدين نزّله جوه الكونتينر:
wget -O /tmp/products.csv 'https://رابط-مباشر-للملف.csv'
IMPORT_DRY_RUN=1 npx medusa exec ./src/scripts/catalog/import-botble.js /tmp/products.csv   # تجربة من غير حفظ
npx medusa exec ./src/scripts/catalog/import-botble.js /tmp/products.csv
rm /tmp/products.csv

# 4. المحتوى المعتمد للمنتجات
npx medusa exec ./src/scripts/catalog/apply-enrichment.js data/enrichment/pilot

# 5. بعد ما مفاتيح بوابات الدفع تتحط وتعمل Redeploy: اربطها بمنطقة الكويت
npx medusa exec ./src/scripts/setup-payments.js
```

- الأوامر دي بتشتغل على **ملفات JS المترجمة** (`.js`) جوه الإيميج، مش ملفات `.ts`.
- كلها آمنة لو اتعادت: المنتج اللي موجود بيتخطّى، مش بيتكرر.
- **الـ Publishable key:** من الأدمن `https://api.laly.kw/app` ← Settings ← Publishable API Keys ← مفتاح "Storefront" ← انسخه.

---

## 2) الستورفرونت

1. **New Resource ← Application** من نفس الريبو.
   - **Build Pack:** `Dockerfile`
   - **Base Directory:** `/`
   - **Dockerfile Location:** `/apps/storefront/Dockerfile`
   - **Ports Exposes:** `8000`
   - **Domain:** `https://laly.kw`
2. **Environment Variables**: علّم عليهم كلهم إنهم **Build Variable / Available at build time**، لأنهم بيتحطوا في الكود وقت الـ build:
   ```
   NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_...        # من الخطوة اللي فاتت
   NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://api.laly.kw
   NEXT_PUBLIC_BASE_URL=https://laly.kw
   NEXT_PUBLIC_DEFAULT_REGION=kw
   NEXT_PUBLIC_DEEMA_WIDGET_KEY=                    # الـ Public key من Deema (مش الـ API key)
   NEXT_PUBLIC_DEEMA_WIDGET_URL=https://widget.deema.me   # في الإنتاج
   ```
   ⚠️ أي تغيير في `NEXT_PUBLIC_*` محتاج **Redeploy** (build جديد)، مش Restart بس.
3. **Deploy.** وبعدها اتأكد إن `https://laly.kw` بيفتح على `/kw`.

---

## 3) بعد ما الاتنين يشتغلوا

**المفاتيح كلها من الأدمن:** صفحة **التكاملات** (`/app/integrations`). فيها:
- **الدفع:** KlickPay وTaly وDeema.
- **المحاسبة:** QuickBooks.
- **التسويق:** Google Merchant (كود التحقق)، وGoogle AdSense (Publisher ID، و`/ads.txt` بيتعمل لوحده)، وMicrosoft Clarity.

أي تغيير هنا مش محتاج Redeploy.

⚠️ **المفاتيح بتتشفّر بـ `SETTINGS_ENCRYPTION_KEY`.** لو مش متحدد، الكود بيستخدم `QUICKBOOKS_ENCRYPTION_KEY` اللي Coolify بيولّده. **متغيرش القيمة دي أبداً بعد ما تحفظ أي مفاتيح**، لأن لو اتغيرت مش هيبقى ممكن تقرا المفاتيح المحفوظة، وهتضطر تدخلها كلها من جديد.

- **روابط الـ Webhooks اللي بتتحط عند البوابات:**
  - KlickPay: `https://api.laly.kw/hooks/payment/klickpay_knet` (وبنفس الشكل لكل طريقة دفع)
  - Taly: `https://api.laly.kw/hooks/payment/taly_taly`
  - Deema: `https://api.laly.kw/hooks/payment/deema_deema`
  
  التفاصيل في `docs/PAYMENTS.md`.
- **QuickBooks:** الـ Redirect URI في تطبيق Intuit هو `https://api.laly.kw/quickbooks/callback`.
- **CORS:** بيتظبط لوحده من `MEDUSA_BACKEND_URL` و`STOREFRONT_URL`. لو ضفت دومين تاني للمتجر (مثلاً `www.laly.kw`)، حطه في `STORE_CORS` و`AUTH_CORS` مفصول بفاصلة، وكمان في `STOREFRONT_URL`. وده مهم لأن روابط الرجوع من بوابات الدفع بتتقارن بيه.

## الصور المرفوعة من الأدمن

- **الافتراضي:** بتتحفظ في volume اسمه `uploads` (`/app/static`)، وروابطها بتبقى `https://api.laly.kw/static/...`. الصور دي بتفضل موجودة بعد أي نشر جديد.
- **الأفضل للإنتاج:** Cloudflare R2. اعمل bucket وحط القيم دي، وبعدها اعمل Redeploy:
  ```
  S3_BUCKET=laly-uploads
  S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
  S3_FILE_URL=https://<public-bucket-domain>   # الدومين العام للـ bucket
  S3_ACCESS_KEY_ID=...
  S3_SECRET_ACCESS_KEY=...
  ```
  الصور اللي اترفعت قبل كده على الـ volume بتفضل شغالة بروابطها القديمة.

## ⚠️ النسخ الاحتياطي: مش متعمل لوحده

Postgres هنا خدمة جوه الـ Compose، يعني **مفيش backup تلقائي**. وده أهم حاجة تتظبط قبل أول طلب حقيقي. عندك اختيارين:

1. **Scheduled Task في Coolify** على خدمة `postgres`، يومياً:
   ```sh
   pg_dump -U "$POSTGRES_USER" -d medusa -Fc -f /backups/medusa-$(date +%a).dump
   ```
   ده بيحتفظ بـ 7 نسخ متغيرة (نسخة لكل يوم في الأسبوع) في volume اسمه `postgres-backups`، **جوه نفس السيرفر**. يحميك من غلطة بشرية، لكن مش من إن السيرفر نفسه يقع. لازم كمان تنسخهم برّا السيرفر، يعني على R2 أو S3.
2. **أو تنقل Postgres لمورد Database مستقل في Coolify.** ده عنده backup مجدول على S3/R2 من الواجهة. وفي الحالة دي `DATABASE_URL` بيتغير للرابط الداخلي بتاع المورد ده.

## التحديثات

- أي push على `main` بيعمل نشر لوحده، والـ migrations بتشتغل لوحدها قبل ما السيرفر يقوم.
- **متعملش scale للباك إند لأكتر من نسخة واحدة.** الـ migrations بتشتغل مع التشغيل، ونسختين مع بعض ممكن يتسابقوا عليها. لو احتجت أكتر من نسخة، اعمل نسخة `MEDUSA_WORKER_MODE=server` ونسخة `worker`، وده تغيير منفصل.
- الستورفرونت مبيتأثرش بنشر الباك إند، إلا لو فيه تغيير في الستورفرونت نفسه.

## مشاكل متوقعة

| العَرَض | السبب |
|---|---|
| Coolify حاطط دومين على **meilisearch** | امسحه. Meilisearch مينفعش يبقى ليه دومين عام، والدومين مكانه خدمة **backend** بس. |
| النشر مش بيبدأ: "required variable" | `MEDUSA_BACKEND_URL` أو `STOREFRONT_URL` فاضي. |
| الباك إند بيقع: `JWT_SECRET must be set` | اتغيّرت متغيرات `SERVICE_PASSWORD_64_*` لقيمة أقل من 32 حرف. |
| الدومين بيقول "No Available Server" | البورت مش مكتوب في الدومين (`:9000` للباك إند، `:8000` للستورفرونت). |
| الستورفرونت build بيفشل: `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | المتغير مش متعلّم إنه Build Variable. |
| الأدمن بيفتح لكن مبيعملش login | `ADMIN_CORS`/`AUTH_CORS` مش فيهم دومين الباك إند (الافتراضي بيحطه، إلا لو انت غيّرتهم). |
| بعد الدفع العميل بيرجع لصفحة خطأ | `STOREFRONT_URL` مش مطابق للدومين اللي العميل عليه. |
