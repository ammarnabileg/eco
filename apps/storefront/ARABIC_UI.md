# Arabic UI conventions (storefront)

The storefront is Arabic-first and right-to-left (`<html lang="ar" dir="rtl">`).
English comes later through the same `_ar` / `_en` fields used by store content.

## Writing

- Clear Modern Standard Arabic with a Gulf-friendly tone. Short and direct.
- Digits are Latin (`74.900 د.ك`). Prices always go through `convertToLocale`.
- Keep product names, brands, SKUs, emails, and phone numbers as entered. Wrap
  them in `dir="ltr"` when they are Latin text inside Arabic sentences.

## RTL rules

Use logical Tailwind utilities, never physical ones:

| Avoid | Use |
|---|---|
| `ml-* mr-*` | `ms-* me-*` |
| `pl-* pr-*` | `ps-* pe-*` |
| `left-* right-*` | `start-* end-*` |
| `text-left text-right` | `text-start text-end` |
| `border-l border-r` | `border-s border-e` |
| `rounded-l rounded-r` | `rounded-s rounded-e` |

Directional icons (arrows, chevrons) need `rtl:-scale-x-100` or a rotation that
points the right way in RTL.

## Glossary

| English | Arabic |
|---|---|
| Cart | السلة |
| Checkout | إتمام الطلب |
| Order / Orders | الطلب / الطلبات |
| Subtotal | المجموع الفرعي |
| Shipping / Delivery | التوصيل |
| Taxes | الضرائب |
| Discount | الخصم |
| Promotion code | كود الخصم |
| Total | الإجمالي |
| Quantity | الكمية |
| Remove | حذف |
| Continue | متابعة |
| Edit | تعديل |
| Save | حفظ |
| Cancel | إلغاء |
| Sign in / Sign out | تسجيل الدخول / تسجيل الخروج |
| Create account | إنشاء حساب |
| Account | حسابي |
| Profile | الملف الشخصي |
| Addresses | العناوين |
| Shipping address | عنوان التوصيل |
| Billing address | عنوان الفاتورة |
| Payment | الدفع |
| Payment method | طريقة الدفع |
| Place order | تأكيد الطلب |
| First / Last name | الاسم الأول / اسم العائلة |
| Email | البريد الإلكتروني |
| Phone | رقم الهاتف |
| Password | كلمة المرور |
| Governorate | المحافظة |
| Area | المنطقة |
| Block | القطعة |
| Street | الشارع |
| Avenue (Jadda) | الجادة |
| Building / House | المبنى / المنزل |
| Floor | الدور |
| Apartment | الشقة |
| In stock / Out of stock | متوفر / غير متوفر |
| Add to cart | أضف للسلة |
| Order confirmed | تم تأكيد طلبك |
| Loading… | جاري التحميل… |

## Kuwait addresses

Kuwait has no postal codes in practice. Address fields map to Medusa as:

- `province`: governorate. Pick from العاصمة، حولي، الفروانية، مبارك الكبير، الأحمدي، الجهراء
- `city`: area (e.g. السالمية)
- `address_1`: block, street, avenue (القطعة، الشارع، الجادة)
- `address_2`: building, floor, apartment (المبنى، الدور، الشقة)
- `postal_code`: optional, hidden
- `phone`: required, Kuwaiti format `+965` followed by 8 digits
