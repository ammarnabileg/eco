# الدفع: كي نت وبطاقات ومحافظ (KlickPay)، Taly، Deema

كل البوابات ماشية بنفس الطريقة، وده الكود المشترك في `apps/backend/src/modules/payment-redirect/base.ts`:

```text
العميل يختار طريقة الدفع ─► السيرفر يعمل checkout عند البوابة (المرجع = رقم جلسة الدفع)
        ─► تحويل العميل لصفحة البوابة ─► يدفع ─► يرجع للمتجر /api/payment-redirect
        ─► المتجر يكمّل الطلب ─► السيرفر يسأل البوابة: "اتدفع؟ وبكام؟"
        ─► لو اتدفع المبلغ كامل بس: يتعمل الطلب
```

**ضمانات الأمان:**
- رجوع العميل للمتجر ب`result=success` **مبيتصدّقش لوحده**. الطلب مبيتعملش غير لما الـ API بتاعة البوابة تأكد الدفع.
- لو المبلغ المدفوع أقل من إجمالي الطلب، الطلب **بيترفض**.
- رابط الرجوع لازم يبدأ بعنوان المتجر (`STOREFRONT_URL`)، عشان محدش يحوّل العميل لموقع تاني بعد الدفع.
- العميل اللي دفع وقفل الصفحة قبل ما يرجع: فيه Job كل 5 دقايق (`jobs/reconcile-redirect-payments.ts`) بيكمّل الطلبات اللي اتدفعت فعلاً.
- الـ Webhook دايماً بيرجع يسأل الـ API عن الحالة قبل ما يعمل أي حاجة. والـ Webhook اللي توقيعه غلط بيتجاهل.
- الاسترجاع الكامل والجزئي بيتعمل من الأدمن (Orders ← Refund) وبيروح لـ API البوابة على طول.

## التفعيل

1. حط مفاتيح البوابة في `.env` الخاص بالباك إند (التفاصيل في `.env.template`)، وأعد تشغيل السيرفر.
2. اربط البوابات بمنطقة الكويت:
   ```bash
   cd apps/backend && npx medusa exec ./src/scripts/setup-payments.ts
   ```
3. ادّي البوابة رابط الـ Webhook: `https://<api-domain>/hooks/payment/<provider>`

| البوابة | provider id في المتجر | رابط الـ Webhook |
|---|---|---|
| KlickPay كي نت | `pp_klickpay_knet` | `/hooks/payment/klickpay_knet` (رابط واحد لكل طرق KlickPay) |
| KlickPay بطاقات | `pp_klickpay_card` | نفس اللي فوق |
| KlickPay Apple Pay | `pp_klickpay_apple_pay` | نفس اللي فوق |
| Taly | `pp_taly_taly` | بيتبعت تلقائي في كل طلب (`postBackUrl`) |
| Deema | `pp_deema_deema` | `/hooks/payment/deema_deema` (بيتحط في بوابة Deema) |

---

## KlickPay (كي نت + Visa/Mastercard + Apple/Google/Samsung Pay)

- **المرجع:** "KlickPay API v3 Documentation v0.6".
- **الـ Staging:** `https://api.staging.klick-pay.com/v3`، وده الافتراضي.
- **الإنتاج:** الدوك مكتوب فيه إن `api.klick-pay.com/v3` **placeholder**. متحطوش في `KLICKPAY_BASE_URL` غير لما KlickPay يأكده كتابة.
- **الإعدادات:** `KLICKPAY_CLIENT_ID`، `KLICKPAY_CLIENT_SECRET`، `KLICKPAY_WEBHOOK_SECRET`، و`KLICKPAY_METHODS=knet,card,apple_pay`.
- **كارت الاختبار:** اختار "Knet Test Card [KNET1]"، والرقم `888888` + `0000000001`، وتاريخ الانتهاء 09/2030، والـ PIN `0000`.
- **التوقيع:** HMAC-SHA256 على الـ body الخام بالـ webhook secret، مع رفض أي طلب أقدم من 5 دقايق.
- **الاسترجاع:** لو رصيد محفظة التاجر عند KlickPay مش كفاية، الاسترجاع **بيتأجل** (`pending_collection`) لحد ما تشحن المحفظة، وبيتسجل في لوج الـ provider.

**أسئلة لازم تتبعت لـ KlickPay قبل الإطلاق** (الدوك مش بيجاوبها):
1. رابط الإنتاج الرسمي.
2. شكل الـ body بتاع `POST /webhooks/config` و`POST /auth/renew`، ومدة صلاحية التوكن. حالياً الكود بيجدد التوكن كل ساعة أو لما يرجع 401.
3. هل webhooks الدفع (`payment.success`) فيها `client_reference`؟ لو أيوه، الربط بالطلب بيبقى فوري. لو لأ، الـ Job بيكمّل الطلب خلال 5 دقايق.
4. كارت اختبار للرفض.

## Taly (قسّمها على 3 أو 4)

- **المرجع:** docs.taly.io.
- **الـ Sandbox:** `https://api.dev-taly.io`، وده الافتراضي.
- **الإعدادات:** `TALY_USERNAME` و`TALY_PASSWORD` من الـ Partner Portal (تاب Keys)، أو بالإيميل من Partners@taly.io.
- **عميل اختبار:** الرقم `98009408` أو `98009406`، والـ OTP `811811`. الـ Apple Pay مبيشتغلش في الـ sandbox.
- **مفيش capture:** الطلب بيبقى `CONFIRMED` لما العميل يدفع أول قسط.
- **الإلغاء:** بيشتغل قبل التأكيد بس. بعد التأكيد، استخدم الاسترجاع.

**الحاجات اللي مش في الدوك:**
- شكل الـ Webhook وتوقيعه. عشان كده الكود بيتعامل مع الـ Webhook كتنبيه بس، ويرجع يسأل Taly عن الحالة.
- اسم حقل التوكن، وافترضنا `access_token`.
- رابط الإنتاج، والحد الأدنى والأقصى للطلب.

**اطلبهم من Taly.**

## Deema

- **المرجع:** docs.deema.me.
- **الـ Sandbox:** `https://sandbox-api.deema.me/api/merchant/v1`، وده الافتراضي.
- **الإنتاج:** `https://api.deema.me/api/merchant/v1`، وبيتحط في `DEEMA_BASE_URL`.
- **الإعدادات:** `DEEMA_API_KEY` من merchant.deema.me (أو sandbox-merchant). والـ Webhook header اللي بتختاره بنفسك في البوابة بيتحط في `DEEMA_WEBHOOK_HEADER` و`DEEMA_WEBHOOK_SECRET`.
- **الـ OTP في الـ sandbox:** `123456`.
- **كارت KNET للاختبار:** `8888880000000001`، تاريخ الانتهاء 09/30، والـ PIN 1234.
- **الحد الأدنى:** 1 د.ك.
- **متطلبات Deema قبل التفعيل:**
  - عملية ناجحة + إلغاء + استرجاع على الـ sandbox.
  - الـ Webhook شغال.
  - **الـ Widget ظاهر في الموقع.** بيتفعّل لما تحط `NEXT_PUBLIC_DEEMA_WIDGET_KEY` في الستورفرونت.
  - بعدها ابعت لـ support@deema.me.
- **Webhook Deema مش موقّع:** فيه header ثابت بس. عشان كده الكود بيتأكد من الـ header، وبعدين يرجع يسأل Deema عن الحالة.

---

## الاختبارات

- **وحدة:** `src/modules/payment-redirect/__tests__/payments.unit.spec.ts`. فيه توقيع KlickPay، وتحويل الحالات، ومقارنة المبلغ، ومرجع جديد لما الإجمالي يتغير، وتحويل المبالغ.
- **تكامل:** `integration-tests/http/payments.spec.ts`. بيشغّل سلة كاملة على كي نت ضد سيرفر KlickPay وهمي:
  - الطلب مبيتعملش قبل الدفع.
  - بيتعمل بعد الدفع والدفعة بتبقى `captured`.
  - لو المدفوع أقل من الإجمالي الطلب بيترفض.
  - الاسترجاع الجزئي بيوصل للبوابة بالمبلغ الصح.
  - الـ Webhook المزوّر بيتجاهل.
