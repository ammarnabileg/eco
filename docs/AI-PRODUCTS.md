# Adding a product with AI

Admin → منتج بالذكاء الاصطناعي. A four-step wizard; nothing is saved until the last step, and the product is
saved as a **draft** unless the admin switches "انشر" on.

1. **المعلومات:** name/model, brand, the manufacturer's official page (https), category (optional, the AI
   suggests one), price, notes. The specs or datasheet can be pasted instead of a link, for sites that block
   bots, e.g. Hikvision.
2. **أسئلة وإضافات:** add-on groups the AI suggests, pre-ticked; variants (colours or sizes) when the source shows
   them; the AI's questions to the owner. "حدّث المحتوى بالإجابات" rewrites the copy with the answers.
3. **الصور:**
   - The page's photos are listed. The chosen ones are copied into the store's storage, so they survive the vendor
     changing its site.
   - Any photo can be turned into a white-background version or a lifestyle shot by the image model. The prompt
     tells it to keep the product unchanged, but always check ports, buttons and logo before using the result.
4. **المراجعة:**
   - Every text field can be edited.
   - SEO lengths have counters.
   - The specs table shows what was found, and the keys that are missing from the source.
   - Then "حفظ كمسودة" or "إنشاء ونشر".

After creating, **"اعمل فيديو"** starts an image-to-video job from the main photo:
- The page polls it every 10 s.
- The finished video is copied into storage (`metadata.ai_video`).
- It shows on the storefront product page only after "اعرضه في المتجر" (`metadata.video_url`).

## Accuracy rules (in the prompt and enforced)
- **Facts come only from the source text.** With no source, specs stay empty and a warning is shown.
- **Specs are checked against the category's spec template** (`validateSpecs`). Keys the template doesn't have, or
  values of the wrong type, are dropped and listed in the warnings.
- **Suggestions are matched to what exists in the store:**
  - Add-on groups that don't exist are ignored.
  - A brand that doesn't exist is suggested, not created.
  - A category the AI picks is used only if it exists.
- **The handle is slugified** and made unique (`-2`, `-3`…).
- **Only public https pages are fetched**, private network addresses are refused, and pages and images have size
  limits.

## Models (Integrations → الذكاء الاصطناعي → المساعد الذكي)
| Job | Model |
|---|---|
| Text, specs, SEO, questions | The assistant's provider and model (Anthropic or OpenRouter) |
| Photo edits | `image_model` on OpenRouter (`POST /api/v1/images` with the photo as a data URL) |
| Video | `video_model` on OpenRouter (`POST /api/v1/videos`, polled, content downloaded with the key) |

Image and video always need the OpenRouter key, even when the text runs on Anthropic. Each step is billed on the
provider account; video is by far the most expensive.

## Endpoints
`POST /admin/ai-products/draft`, `/images/import`, `/images/enhance`, `/create`, `/:id/video` (start),
`GET /admin/ai-products/:id/video` (poll), `POST /admin/ai-products/:id/video/publish`.
