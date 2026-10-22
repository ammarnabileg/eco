# Image storage (Cloudflare R2)

Files uploaded from the admin (product images, the image studio, imports and exports) go through one provider,
`src/modules/file-media`. It reads its settings from **الإعدادات ← التكاملات ← تخزين الصور** on every upload:

- **Switched on:** files go to the R2 bucket, inside the chosen folder (default `laly/`). Their URLs are on the bucket's
  public domain.
- **Switched off:** files go to the server's disk under `./static`, served at `/static/...`. In Docker this folder must
  be a persistent volume.

Changes apply within about 15 seconds, without a redeploy. Files uploaded earlier keep their URLs and can still be
deleted. Old `S3_*` environment variables still work as defaults when the page was never saved.

## Setting up R2

1. Cloudflare → R2 → create a bucket for the store, or reuse an existing one. Each store keeps to its own folder.
2. Bucket → Settings → **Custom domain** (for example `media.lalykw.com`). This is the "رابط الصور العام". The
   `r2.dev` address works for testing, but Cloudflare rate-limits it.
3. R2 → **Manage API tokens** → create a token with *Object Read & Write*, limited to this bucket only. Copy the
   Access Key ID and Secret Access Key into the admin page. Never paste them in chat, tickets or `.env` files in git.
4. Endpoint: `https://<account-id>.r2.cloudflarestorage.com`. It is shown on the bucket page.
5. **CORS (only for product CSV imports).** The admin uploads the CSV straight to R2, so add a CORS rule to the bucket:

   ```json
   [{ "AllowedOrigins": ["https://api.lalykw.com"], "AllowedMethods": ["PUT"], "AllowedHeaders": ["*"] }]
   ```

## Options

| Option | Effect |
|---|---|
| أسماء الملفات | `slug`: Latin name plus a unique suffix (default). `uuid`: random. `original`: the original name (Arabic kept) plus a suffix. |
| تحويل الصور لـ WebP | JPG and PNG are stored as WebP at quality 82. The original is not kept. On by default, because the storefront serves images unoptimized. |
| أقصى عرض/طول | Larger photos are shrunk to fit (default 2000px). Smaller ones are not enlarged. |
| أقصى حجم للملف | Uploads above it are refused (default 20 MB). |

Not done on purpose:
- Watermarks.
- Thumbnails: cards load the full image. Add thumbnails only if page weight becomes a problem.

## If a key was exposed

Delete the token in Cloudflare (R2 → Manage API tokens), create a new one, and save the new keys in the admin. The
old key keeps working until it is deleted.

## Tests

- `src/modules/file-media/__tests__/process.unit.spec.ts`: names, WebP conversion, resizing, size limit.
- `integration-tests/http/media.spec.ts`: disk storage, then R2 through a stand-in S3 server (signed PUT and DELETE
  in the bucket folder), and that the secret never reaches the browser.
