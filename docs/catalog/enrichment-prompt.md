# Enrichment prompt (used for the 15-product pilot)

Give this to a writer or an AI agent together with a folder of
`<handle>.input.json` files from `export-enrichment-inputs.ts`. Split the
work by manufacturer, since each one has its own official source.

---

You write verified product content for "Laly by Brilliant Tech", an
electronics store in Kuwait (Arabic first, English second). For each
`<handle>.input.json` in the folder, write `<handle>.json`. Do not call store
APIs or change any other file.

## Sources (accuracy is everything)

- **Hikvision:** the official datasheet PDF on `assets.hikvision.com`. Search
  "<model> datasheet pdf site:hikvision.com", download it, and extract the
  text with `pdftotext -layout`. Hikvision's product pages usually return 403
  or render empty.
- **TP-Link / VIGI / Tapo / Mercusys:** the product page and its
  specifications section on `tp-link.com` (prefer `/ae/`, then `/en/` or
  `/uk/`). `curl -sL` works.
- **Kaspersky / Norton:** the vendor's own product pages.
- **Never invent a number.** If a spec is not in the official source, leave
  it out. Do not use resellers, Amazon, or brilliant-kw.com (its spec
  headings are wrong).
- If the store title or model differs from the official source (lens
  version, `/SL` variant, discontinued model, wrong resolution), say so in
  `notes`.

## Output `<handle>.json` (valid UTF-8 JSON)

```json
{
  "handle": "<from input>",
  "title_ar": "≤ 90 chars: type + key spec + brand + model",
  "title_en": "...",
  "subtitle_ar": "one line ≤ 110 chars, the main benefit",
  "subtitle_en": "...",
  "description_ar": "120–220 words, Modern Standard Arabic readable in Kuwait, paragraphs separated by \n\n",
  "description_en": "100–180 words",
  "highlights_ar": ["4–6 bullets"],
  "highlights_en": ["..."],
  "specs": { "<key from spec_fields>": "value of the right type" },
  "faq": [{ "question_ar": "", "answer_ar": "", "question_en": "", "answer_en": "" }],
  "seo_title_ar": "≤ 60 chars, includes the model",
  "seo_title_en": "≤ 60 chars",
  "seo_description_ar": "120–155 chars",
  "seo_description_en": "120–155 chars",
  "mpn": "official model",
  "source_url": "official URL used",
  "sources": ["all official URLs"],
  "notes": "data issues and uncertainties"
}
```

### Rules for `specs`

- Use only keys listed in `spec_fields`.
- `number`: a number, with no unit.
- `select`: one option `value`.
- `multiselect`: an array of option values.
- `boolean`: `true` or `false`.
- `text`: a short language-neutral string (`"2.8 mm"`, `"IP67"`), or
  `{"ar": "...", "en": "..."}` when it needs translating.

### Rules for the copy

- **Description:** what the product is, who it is for (homes, villas, shops,
  offices in Kuwait), what the key technologies do in plain words, and what
  else is needed with it (NVR, PoE switch, HDD, microSD, app).
- **Avoid:** prices, warranty promises, "the best in Kuwait", emojis.
- **Vocabulary:** use the words customers use (كاميرا مراقبة، رؤية ليلية
  ملونة، راوتر، مقوي، ميش، كيبل شبكة PoE). Keep brand and model names in
  Latin script.
- **FAQ:** 3–5 questions buyers actually ask (night range, does it work
  without an NVR, app, PoE, coverage for a villa, works with my fibre, how
  many devices). Answers are 1–3 sentences and must be grounded in the specs.

When done, validate each file with `python3 -m json.tool` and report a table:
handle, model, source, specs filled, notes.
