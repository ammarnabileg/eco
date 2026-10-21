# AI Image Studio

Admin page **استوديو الصور** (`/app/studio`) builds marketing images for a product: a background from an image model, the
product's original photo on a white card, and the text and price drawn in the browser with the store's fonts. A finished
banner can be downloaded as PNG or put on the homepage as a hero slide.

## What each part does

| Part | Where | Notes |
|---|---|---|
| Background | `POST /admin/studio/background` → `aiGenerateImage` | Model from Integrations ← المساعد الذكي → `banner_model` (default `recraft/recraft-v4.1-flash`, text-only input). The prompt forbids text, numbers, logos and devices. Recorded in `ai_usage` as `image_generate`. |
| Ad copy (optional) | `POST /admin/studio/copy` | Text model, task `marketing_copy`. Headline/subtitle/button in Arabic and English; no prices or discounts in the copy. |
| Price | `GET /admin/studio/price?product_id=` | The store's own `calculated_price` in KWD: cheapest variant, sale price lists applied, with the price list's `ends_at`. |
| Canvas drawing | `src/admin/components/studio/design.ts` | Pure functions: layouts per size, wrapping and shrinking, RTL/LTR, price formatting, drawing, hit testing. Unit-tested. |
| Image proxy | `GET /admin/studio/image?url=` | Serves product photos and backgrounds from the backend's own address; without it the browser refuses to export the canvas. |
| Saved designs | table `ai_banner` | The whole design (`elements`), not only the PNG. Positions and sizes are fractions of the canvas. |
| Approve | `POST /admin/studio/banners/:id/approve` | Uploads the exported PNG and marks it approved, after the price checks below. |
| Homepage slide | `POST /admin/studio/slide` | Wide banner (1920×600) plus an optional phone version. Creates or updates a hero slide with `banner_url`/`banner_mobile_url`. |

Sizes: square 1080×1080, post 1080×1350, story 1080×1920, banner 1920×600.

## Price rules

The price on an image is always the store's price; staff can't type it.

1. Price, struck original price and discount badge are written from the snapshot (`applyPrice`); the editor shows them
   read-only.
2. On approval the server reads the numbers in the price texts (Arabic or Latin digits) and refuses if they differ from
   the snapshot, or if there is a price without a product.
3. On approval and again on publishing, the snapshot is compared with the price now. If it changed, the editor shows
   «حدّث السعر» and the server refuses.
4. A published slide takes the offer's `ends_at`, so it leaves the homepage when the offer ends.
5. The job `studio-stale-slides` (hourly, minute 17) switches off any studio slide whose price no longer matches, for
   example when an offer was ended early or the price was edited. The banner goes back to draft.

Any edit to a saved design makes it a draft again, so it must be exported and approved again.

## Fonts and Arabic

- Tajawal (Arabic) and Poppins (English) load from Google Fonts. The page waits for `document.fonts.load`, then
  `document.fonts.ready`, then checks with `document.fonts.check`.
- If a font is missing, export and download are blocked, so a fallback font can never end up in an approved image.
- Arabic lines are drawn with `direction = "rtl"`, English with `"ltr"`. Alignment is set explicitly for each line.
- The «أرقام عربية» switch writes ١٢٫٩٠٠ instead of 12.900.
- Verified in Chromium: mixed Arabic/English headlines, Arabic and Latin digits, all four sizes, and bilingual layouts.

## Product photos

- The original photo is drawn whole (contain, never cropped or stretched) inside a white card. The card can be turned
  off.
- The studio never changes the product's photo. Background removal or AI edits stay in the add-product wizard
  (`image_edit`), where the result is previewed and approved before use.

## Costs

- One background is one image call; text, layout and price changes cost nothing.
- Ad copy is one small text call, and only on request.
- Both appear on the AI usage panel of the assistant page.

## Deploying

- The backend has two migrations: `ai_banner`, plus `banner_url` and `banner_mobile_url` on hero slides.
- Redeploy the backend first, then the storefront, which renders banner slides as a full-width linked image with the
  phone version under 1024px.

## Tests

- `src/admin/components/studio/__tests__/design.unit.spec.ts`: layout, wrapping, fitting, digits, prices.
- `integration-tests/http/studio.spec.ts`: a fake OpenRouter for background and copy, the image proxy, sale price and
  its end date, approval refusing typed or old prices, publishing, and switching off a slide after a price change.
