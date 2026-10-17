# QuickBooks Online: ربط المحاسبة بالمتجر

المتجر هو المرجع. كل حاجة بتتنقل في اتجاه واحد: **المتجر ─► QuickBooks**. أي تعديل يدوي في QuickBooks مبيرجعش للمتجر.

| في المتجر | في QuickBooks | امتى |
|---|---|---|
| منتج (كل Variant) | Item من نوع NonInventory (المخزون بيتحسب في المتجر بس) | إضافة أو تعديل منتج أو Variant |
| طلب مدفوع (كي نت، بطاقة، Taly، Deema…) | Sales Receipt | `order.placed` |
| طلب مش مدفوع وقت الطلب (دفع عند الاستلام أو تحصيل يدوي) | Invoice | `order.placed` |
| تحصيل دفعة لطلب اتسجّل كـ Invoice | Payment مربوط بالـ Invoice | `payment.captured` |
| استرجاع (كامل أو جزئي) | Refund Receipt | `payment.refunded` |
| العميل | Customer (الاسم + الإيميل، عشان الأسماء في QuickBooks لازم تبقى مش متكررة) | مع أول طلب ليه |
| بوابة الدفع | Payment Method (KNET، Card، Apple Pay، Taly، Deema…) | مع أول طلب بيها |
| التوصيل، فرق التقريب، المرتجعات | Items من نوع Service: `Delivery / التوصيل`، `Rounding / فرق تقريب`، `Refunds / مرتجعات` | بتتعمل لوحدها أول مرة تتحتاج |

الكود:
- الموديول (الجداول، OAuth، الـ client، الـ mapping): `apps/backend/src/modules/quickbooks/`
- المزامنة: `apps/backend/src/workflows/quickbooks/`
- الأحداث: `apps/backend/src/subscribers/quickbooks-sync.ts`
- إعادة المحاولة: `apps/backend/src/jobs/quickbooks-retry.ts`
- صفحة الأدمن: Settings ← QuickBooks (`apps/backend/src/admin/routes/quickbooks/page.tsx`)

## ⚠️ الفلس الثالث: QuickBooks مبيقدرش يسجّله

ده مش اختيار مننا، ده من Intuit نفسها: **QuickBooks بيحفظ مبالغ السطور (Line.Amount) بخانتين عشريتين بس** (تقريب half-up)، وسعر الوحدة (UnitPrice) لحد 7 خانات. الدينار الكويتي 3 خانات، يعني طلب بـ `31.235 KWD` بيتسجّل في QuickBooks بـ `31.24`.

إحنا بنتعامل معاه كده:
1. سعر الوحدة بيروح كامل بالـ 3 خانات (`9.995`).
2. إجمالي كل سطر بيتقرّب لخانتين، بنفس طريقة QuickBooks بالظبط، عشان اللي بنبعته هو اللي هيتحفظ.
3. لو مجموع السطور طلع **أقل** من إجمالي الطلب (بعد تقريبه لخانتين)، بيتضاف سطر `Rounding / فرق تقريب` بالفرق (0.01 أو 0.02).
   ولو طلع **أكتر**، الفرق بيتشال من الخصم. والنتيجة إن إجمالي QuickBooks بيساوي إجمالي المتجر مقرّب لخانتين بالظبط.
4. الإجمالي الحقيقي بالـ 3 خانات بيتكتب في الـ Private Note بتاع القيد، ومعاه فرق الفلس. مثال: `total 31.235 KWD (QuickBooks rounds to 2 decimals: -0.005)`.
5. الاسترجاع بيتقرّب لخانتين، والمبلغ الحقيقي بيتكتب في وصف السطر.

**المعنى العملي:** الإيرادات في QuickBooks ممكن تفرق عن المتجر بحد أقصى نص فلس في كل طلب، والفرق ده متسجّل وواضح في كل قيد. لو المحاسب محتاج تطابق 100% مع البنك على مستوى الفلس، يبقى التسوية لازم تتعمل بهامش ±0.005 لكل عملية. ولو ده مش مقبول، يبقى QuickBooks مش البرنامج المناسب لعملة بـ 3 خانات.

## الإعداد (مرة واحدة)

### 1. تطبيق Intuit
1. ادخل [developer.intuit.com](https://developer.intuit.com) واعمل App، واختار scope **Accounting** (`com.intuit.quickbooks.accounting`).
2. في Keys & credentials ← Redirect URIs ضيف:
   ```
   https://<api-domain>/quickbooks/callback
   ```
   لازم يطابق الحرف بالحرف (http/https، والشرطة في الآخر). للتجربة المحلية: `http://localhost:9000/quickbooks/callback`.
3. انسخ Client ID وClient Secret. مفاتيح Development للـ sandbox، ومفاتيح Production للشركة الحقيقية. **Production محتاج Intuit توافق على التطبيق** (استبيان الـ App assessment).

### 2. المفاتيح: من الأدمن
ادخل **التكاملات ← المحاسبة ← QuickBooks Online**، وحط Client ID وClient Secret، واختار البيئة، وفعّل، واحفظ.
- مفتاح تشفير التوكنز **مش محتاج تدخله**: السيرفر بيولّده لوحده.
- الـ Redirect URI المطلوب بيظهر في نفس الكارت.

### أو: متغيرات السيرفر (`apps/backend/.env`)
```bash
QUICKBOOKS_CLIENT_ID=...
QUICKBOOKS_CLIENT_SECRET=...
QUICKBOOKS_ENVIRONMENT=sandbox        # أو production
QUICKBOOKS_REDIRECT_URI=              # فاضي = {MEDUSA_BACKEND_URL}/quickbooks/callback
QUICKBOOKS_ENCRYPTION_KEY=$(openssl rand -hex 32)
```
- التوكنز بتتخزن في الداتابيز **متشفرة** (AES-256-GCM) بالمفتاح ده. لو اتغيّر، لازم تعمل ربط من جديد.
- بعد التعديل، أعد تشغيل الباك إند. والـ migrations بتتعمل مع `medusa db:migrate` زي العادي.

### 3. الربط من الأدمن
Settings ← QuickBooks ← **ربط QuickBooks** ← تسجيل الدخول في Intuit ← اختيار الشركة ← ترجع لنفس الصفحة.

بعد الربط:
- حساب الإيرادات بيتختار لوحده (Sales of Product Income)، وحساب استلام المدفوعات كمان (Undeposited Funds). تقدر تغيّرهم من نفس الصفحة.
- مزامنة المنتجات الموجودة قبل الربط: المنتجات بتتزامن لوحدها عند أي تعديل، أو مع أول طلب فيه المنتج (الطلب بيعمل الـ Item لو مش موجود). ولو عايز تزامن الكل مرة واحدة:
  ```bash
  curl -X POST https://<api-domain>/admin/quickbooks/sync \
    -H "Authorization: Bearer <admin-token>" -H "Content-Type: application/json" \
    -d '{"products": ["prod_..."]}'
  ```

### 4. إعداد شركة QuickBooks نفسها (عند المحاسب)
- الشركة الكويتية بتستخدم النسخة الـ **Global** من QuickBooks Online. **العملة الأساسية (Home currency) لازم تتحدد KWD قبل تفعيل Multicurrency**، لأنها مبتتغيرش بعد التفعيل، وMulticurrency نفسه مبيتقفلش.
- لو العملة الأساسية مش KWD (مثلاً USD)، لازم Multicurrency يكون شغّال وKWD مضافة، وإلا كل القيود هترجع خطأ عملة. المتجر بيبعت `CurrencyRef: KWD` في كل قيد.
- الكويت مفيهاش ضريبة مبيعات، فالقيود بتروح من غير ضرائب.

## التجربة على Sandbox

**Intuit مبتوفرش Sandbox للكويت ولا للنسخة الـ Global.** الـ Sandboxes المتاحة: US (بيتعمل لوحده)، وPlus لـ UK/AU/CA/IN/FR.
الأقرب لينا:
1. My Hub ← Sandboxes ← Add ← QuickBooks Online **Plus** ← دولة **UK** (الدولة مبتتغيرش بعد كده).
2. في الـ sandbox: Settings ← Account and settings ← Advanced ← Currency ← فعّل Multicurrency، وضيف **KWD**.
3. ابدأ الربط من الأدمن وانت `QUICKBOOKS_ENVIRONMENT=sandbox`.

الـ sandbox ده بيختبر الربط والمزامنة والتقريب كويس، **لكن مبيختبرش شركة عملتها الأساسية KWD**. أول تجربة على شركة KWD حقيقية لازم تتراجع يدوي (أول 5–10 طلبات).

## الاعتمادية

- **مفيش طلب بيتسجّل مرتين.** كل create بيتبعت بـ `requestid` ثابت (`order-<id>`, `capture-<payment>`, `refund-<id>`, …). وQuickBooks بيرجّع نفس الرد لو نفس الطلب اتكرر. وكمان في جدول `qb_sync_record` بيتسجّل اللي اتبعت، والطلب اللي اتسجّل بيتخطّى.
- **مزامنة كل سجل بتتعمل مرة واحدة في نفس الوقت** (lock على مستوى الطلب أو الدفعة أو الاسترجاع). يعني الـ event والـ retry job مبيسجّلوش نفس الحاجة مع بعض.
- **QuickBooks واقف؟ البيع مبيقفش.** الفشل بيتسجّل على السجل، وفيه Job كل 15 دقيقة بيعيد المحاولة لحد 6 مرات. اللي فضل فاشل بيظهر في صفحة الأدمن بالخطأ، وفيه زرار "إعادة محاولة الطلبات".
- **التوكنز:** الـ Access token عمره ساعة، وبيتجدد لوحده قبل ما يخلص. التجديد بيتعمل تحت lock، لأن تجديدين مع بعض بيبوّظوا الـ refresh token (`invalid_grant`). والـ refresh token الجديد بيتخزن كل مرة. الـ Refresh token صالح 100 يوم من آخر استخدام، وأقصاه 5 سنين من أول ربط. الصفحة بتعرض "صلاحية الربط حتى".
- **حدود Intuit:** 500 طلب/دقيقة و10 طلبات/ثانية لكل شركة. ده أكتر بكتير من اللي متجرنا محتاجه.
- **ربط شركة تانية:** لو اتعمل ربط بشركة غير اللي قبلها (realm مختلف)، سجلات المزامنة القديمة بتتمسح، عشان أرقام QuickBooks القديمة بتاعة شركة تانية.
- **الفصل:** بيلغي الـ token عند Intuit وبيمسحه من الداتابيز.

## اللي مش موجود (عن قصد)

- **Webhooks من QuickBooks:** مش مستخدمة، لأن الاتجاه واحد (المتجر ← QuickBooks). لو احتجناها بعدين (مثلاً عشان نعرف إن المحاسب مسح قيد): Intuit دلوقتي بتبعت بصيغة CloudEvents، وموقّعة بـ `intuit-signature` (HMAC-SHA256 Base64 بالـ verifier token).
- **المخزون في QuickBooks:** الـ Items نوعها NonInventory. المخزون وتكلفة البضاعة (COGS) بيتحسبوا في المتجر بس. ولو المحاسب محتاج COGS في QuickBooks، ده تغيير كبير (Inventory items + تاريخ بداية مخزون + تكلفة كل منتج) ومحتاج قرار.
- **تعديل أو إلغاء طلب بعد تسجيله:** مبيتعدّلش القيد. الإلغاء اللي فيه استرجاع فلوس بيروح كـ Refund Receipt. أما الطلب اللي اتلغى من غير دفع (Invoice مفتوحة)، فلازم المحاسب يعمل Void ليها يدوي.

## مش متأكدين منه (لازم يتأكد في أول تجربة حقيقية)

- إن شركة عملتها الأساسية KWD بتتعامل مع التقريب بنفس طريقة الـ foreign currency (مفيش مصدر رسمي بيقول إنها مختلفة).
- إن `DocNumber` (`LALY-1001`) بيظهر زي ما هو. ده محتاج "Custom transaction numbers" يبقى شغّال في إعدادات الشركة، وإلا QuickBooks هيدّي رقم من عنده (والرقم بتاعنا موجود في الـ Private Note في الحالتين).
- الحد الأقصى لطول `DisplayName` للعميل (بنقصّه عند 500).

## الاختبارات

```bash
cd apps/backend
pnpm test:unit -- src/modules/quickbooks         # الـ mapping والتقريب والتشفير والـ OAuth state
DB_HOST=localhost DB_USERNAME=postgres DB_PASSWORD=postgres MEILISEARCH_HOST= \
  pnpm test:integration:http -- integration-tests/http/quickbooks.spec.ts
```
اختبارات الـ integration بتشغّل QuickBooks وهمي (OAuth وAPI) جوه نفس الـ process. بتغطي: الربط بـ state موقّع، والتوكنز المتشفرة، والطلب اللي بيتسجل مرة واحدة، وطلب بالفلوس، والتحصيل المتأخر كـ Payment، وتجديد التوكن.
