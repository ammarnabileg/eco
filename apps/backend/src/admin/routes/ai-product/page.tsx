import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Sparkles } from "@medusajs/icons"
import { Badge, Button, Checkbox, Container, Heading, Input, Label, Select, Switch, Text, Textarea, toast } from "@medusajs/ui"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { sdk } from "../../lib/sdk"

type SpecField = { key: string; label_ar: string; unit?: string | null }
type Faq = { question_ar: string; answer_ar: string; question_en: string; answer_en: string }
type Content = {
  title_ar: string
  title_en: string
  subtitle_ar: string
  subtitle_en: string
  description_ar: string
  description_en: string
  highlights_ar: string[]
  highlights_en: string[]
  faq: Faq[]
  seo_title_ar: string
  seo_title_en: string
  seo_description_ar: string
  seo_description_en: string
  mpn: string | null
  warranty_months: number | null
}
type Draft = {
  source: { url: string; title: string } | null
  images: string[]
  category_id: string | null
  brand: { id: string; name: string } | null
  brand_suggested: string | null
  spec_fields: SpecField[]
  content: Content
  handle: string
  specs: Record<string, unknown>
  missing_specs: string[]
  addon_group_ids: string[]
  variants: { option_ar: string; option_en: string; values: string[] } | null
  questions: { question_ar: string; suggestion_ar: string }[]
  notes: string[]
}
type Video = { job_id: string; status: string; url?: string; error?: string } | null

const STEPS = ["المعلومات", "أسئلة وإضافات", "الصور", "المراجعة"] as const

const specText = (v: unknown) =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as { ar?: string }).ar ?? "" : Array.isArray(v) ? v.join("، ") : String(v)

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label size="small">{label}</Label>
      {children}
      {hint && (
        <Text size="xsmall" className="text-ui-fg-muted">
          {hint}
        </Text>
      )}
    </div>
  )
}

const Counter = ({ value, max }: { value: string; max: number }) => (
  <span className={value.length > max ? "text-ui-fg-error" : "text-ui-fg-muted"}>
    {value.length}/{max}
  </span>
)

const AiProductPage = () => {
  const [step, setStep] = useState(0)
  const [info, setInfo] = useState({ name: "", brand: "", category_id: "", source_url: "", source_text: "", price_kwd: "", notes: "" })
  const [draft, setDraft] = useState<Draft | null>(null)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [addons, setAddons] = useState<string[]>([])
  const [variants, setVariants] = useState<{ value: string; price: string; sku: string }[]>([])
  const [useVariants, setUseVariants] = useState(false)
  const [sku, setSku] = useState("")
  const [picked, setPicked] = useState<string[]>([])
  const [images, setImages] = useState<string[]>([])
  const [publish, setPublish] = useState(false)
  const [created, setCreated] = useState<{ id: string; handle: string } | null>(null)
  const [video, setVideo] = useState<Video>(null)
  const [videoLive, setVideoLive] = useState(false)

  const categories = useQuery({
    queryKey: ["ai-product-categories"],
    queryFn: () =>
      sdk.client.fetch<{ product_categories: { id: string; name: string }[] }>("/admin/product-categories", {
        query: { limit: 500, fields: "id,name" },
      }),
  })
  const addonGroups = useQuery({
    queryKey: ["/admin/catalog/addon-groups"],
    queryFn: () => sdk.client.fetch<{ addon_groups: { id: string; name_ar: string; kind?: string | null }[] }>("/admin/catalog/addon-groups"),
  })

  const runDraft = useMutation({
    mutationFn: (notes: string) =>
      sdk.client.fetch<{ draft: Draft }>("/admin/ai-products/draft", {
        method: "POST",
        body: {
          name: info.name,
          brand: info.brand || null,
          category_id: info.category_id || null,
          source_url: info.source_url || null,
          source_text: info.source_text || null,
          price_kwd: info.price_kwd ? Number(info.price_kwd) : null,
          notes: notes || null,
        },
      }),
    onSuccess: ({ draft }) => {
      setDraft(draft)
      setAddons(draft.addon_group_ids)
      setPicked(draft.images.slice(0, 6))
      if (draft.variants) {
        setUseVariants(true)
        setVariants(draft.variants.values.map((value) => ({ value, price: info.price_kwd, sku: "" })))
      }
      setStep(1)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const importImages = useMutation({
    mutationFn: () =>
      sdk.client.fetch<{ images: { source: string; url?: string; error?: string }[] }>("/admin/ai-products/images/import", {
        method: "POST",
        body: { urls: picked, handle: draft!.handle },
      }),
    onSuccess: ({ images: out }) => {
      const ok = out.filter((i) => i.url).map((i) => i.url as string)
      setImages((prev) => [...prev, ...ok.filter((u) => !prev.includes(u))])
      const failed = out.filter((i) => i.error).length
      if (failed) toast.warning(`${failed} صورة ما اتنسختش (الموقع رفض أو مش صورة)`)
      else toast.success(`اتنسخ ${ok.length} صورة`)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const enhance = useMutation({
    mutationFn: (v: { image_url: string; style: "white" | "lifestyle" }) =>
      sdk.client.fetch<{ url: string }>("/admin/ai-products/images/enhance", {
        method: "POST",
        body: { ...v, title: draft!.content.title_en || draft!.content.title_ar, handle: draft!.handle },
      }),
    onSuccess: ({ url }) => {
      setImages((prev) => [...prev, url])
      toast.success("اتعملت الصورة. راجعها كويس إن المنتج هو هو")
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const create = useMutation({
    mutationFn: () => {
      const d = draft!
      return sdk.client.fetch<{ product: { id: string; handle: string } }>("/admin/ai-products/create", {
        method: "POST",
        body: {
          handle: d.handle,
          status: publish ? "published" : "draft",
          category_id: d.category_id,
          brand_id: d.brand?.id ?? null,
          addon_group_ids: addons,
          price_kwd: Number(info.price_kwd),
          sku: sku || null,
          variants:
            useVariants && variants.length > 1
              ? { option_ar: d.variants?.option_ar ?? "النوع", values: variants.map((v) => ({ value: v.value, price_kwd: Number(v.price || info.price_kwd), sku: v.sku || null })) }
              : null,
          images,
          content: d.content,
          specs: d.specs,
          source_url: d.source?.url ?? null,
        },
      })
    },
    onSuccess: ({ product }) => {
      setCreated(product)
      toast.success(publish ? "المنتج اتنشر" : "المنتج اتحفظ كمسودة")
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const startVideo = useMutation({
    mutationFn: () => sdk.client.fetch<{ video: Video }>(`/admin/ai-products/${created!.id}/video`, { method: "POST", body: {} }),
    onSuccess: ({ video: v }) => setVideo(v),
    onError: (e: Error) => toast.error(e.message),
  })

  const publishVideo = useMutation({
    mutationFn: (publish: boolean) =>
      sdk.client.fetch(`/admin/ai-products/${created!.id}/video/publish`, { method: "POST", body: { publish } }),
    onSuccess: (_d, publish) => {
      setVideoLive(publish)
      toast.success(publish ? "الفيديو ظاهر في صفحة المنتج" : "الفيديو اتشال من المتجر")
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // Poll a running video job every 10 seconds.
  useEffect(() => {
    if (!created || !video || video.status === "completed" || video.status === "failed") return
    const t = setTimeout(() => {
      sdk.client
        .fetch<{ video: Video }>(`/admin/ai-products/${created.id}/video`)
        .then(({ video: v }) => setVideo(v))
        .catch((e: Error) => toast.error(e.message))
    }, 10_000)
    return () => clearTimeout(t)
  }, [created, video])

  const setContent = (patch: Partial<Content>) => setDraft((d) => (d ? { ...d, content: { ...d.content, ...patch } } : d))
  const answered = Object.entries(answers)
    .filter(([, a]) => a.trim())
    .map(([i, a]) => `${draft?.questions[Number(i)]?.question_ar} ${a}`)
  const canCreate = !!draft && images.length > 0 && Number(info.price_kwd) > 0 && !!draft.content.title_ar

  if (created) {
    return (
      <Container className="flex flex-col gap-4">
        <Heading level="h1">المنتج اتعمل</Heading>
        <Text>
          {publish ? "اتنشر في المتجر." : "اتحفظ كمسودة. راجعه من صفحة المنتج وانشره لما يكون جاهز."}
        </Text>
        <div className="flex gap-2">
          <Link to={`/products/${created.id}`}>
            <Button size="small">افتح المنتج</Button>
          </Link>
          <Button size="small" variant="secondary" onClick={() => window.location.reload()}>
            أضف منتج تاني
          </Button>
        </div>
        <div className="rounded-lg border border-ui-border-base p-4">
          <Text weight="plus">فيديو للمنتج (اختياري)</Text>
          <Text size="small" className="text-ui-fg-subtle">
            فيديو قصير من الصورة الرئيسية. بياخد كام دقيقة وتكلفته أعلى بكتير من الصور. راجعه قبل ما تستخدمه: لو المنتج اتغير شكله فيه ما تنشرهوش.
          </Text>
          {!video ? (
            <Button size="small" variant="secondary" className="mt-2" isLoading={startVideo.isPending} onClick={() => startVideo.mutate()}>
              اعمل فيديو
            </Button>
          ) : video.status === "completed" && video.url ? (
            <div className="mt-2 flex flex-col gap-2">
              <video src={video.url} controls className="max-h-80 rounded" />
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={videoLive} disabled={publishVideo.isPending} onCheckedChange={(on) => publishVideo.mutate(on)} />
                اعرضه في المتجر (بعد ما تتأكد إن المنتج في الفيديو هو هو)
              </label>
            </div>
          ) : video.status === "failed" ? (
            <Text size="small" className="mt-2 text-ui-fg-error">
              فشل: {video.error ?? "سبب غير معروف"}
            </Text>
          ) : (
            <Text size="small" className="mt-2">
              جاري عمل الفيديو… ({video.status}) الصفحة بتتحدث لوحدها.
            </Text>
          )}
        </div>
      </Container>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Container>
        <Heading level="h1">إضافة منتج بالذكاء الاصطناعي</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          الذكاء الاصطناعي بيقرأ صفحة الشركة الرسمية ويكتب الاسم والوصف والمواصفات والسيو بالعربي والإنجليزي، ويسألك عن الإضافات قبل
          الحفظ. المواصفات بتتاخد من المصدر بس. راجع كل حاجة قبل النشر.
        </Text>
        <div className="mt-3 flex flex-wrap gap-2">
          {STEPS.map((s, i) => (
            <Badge key={s} color={i === step ? "blue" : i < step ? "green" : "grey"}>
              {i + 1}. {s}
            </Badge>
          ))}
        </div>
      </Container>

      {step === 0 && (
        <Container className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="اسم المنتج / الموديل *">
            <Input value={info.name} onChange={(e) => setInfo({ ...info, name: e.target.value })} placeholder="TP-Link Archer AX55" />
          </Field>
          <Field label="الماركة">
            <Input value={info.brand} onChange={(e) => setInfo({ ...info, brand: e.target.value })} placeholder="TP-Link" />
          </Field>
          <Field label="رابط صفحة المنتج الرسمية" hint="من موقع الشركة نفسها (مش أمازون ولا موزع). منه بتتاخد المواصفات والصور.">
            <Input dir="ltr" value={info.source_url} onChange={(e) => setInfo({ ...info, source_url: e.target.value })} placeholder="https://www.tp-link.com/..." />
          </Field>
          <Field label="القسم" hint="لو سبته فاضي الذكاء الاصطناعي هيقترح قسم.">
            <Select value={info.category_id || undefined} onValueChange={(v) => setInfo({ ...info, category_id: v })}>
              <Select.Trigger>
                <Select.Value placeholder="اختيار تلقائي" />
              </Select.Trigger>
              <Select.Content>
                {(categories.data?.product_categories ?? []).map((c) => (
                  <Select.Item key={c.id} value={c.id}>
                    {c.name}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </Field>
          <Field label="السعر (د.ك) *">
            <Input type="number" step="0.001" dir="ltr" value={info.price_kwd} onChange={(e) => setInfo({ ...info, price_kwd: e.target.value })} />
          </Field>
          <Field label="ملاحظات للكاتب" hint="مثلاً: بنبيعه مع تركيب مجاني، أو ده الإصدار الأوروبي.">
            <Input value={info.notes} onChange={(e) => setInfo({ ...info, notes: e.target.value })} />
          </Field>
          <div className="md:col-span-2">
            <Field
              label="أو الصق المواصفات / الداتاشيت"
              hint="لو موقع الشركة بيرفض البوتات (زي Hikvision) الصق نص المواصفات هنا. بيتضاف للرابط لو الاتنين موجودين."
            >
              <Textarea rows={5} value={info.source_text} onChange={(e) => setInfo({ ...info, source_text: e.target.value })} />
            </Field>
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button disabled={info.name.trim().length < 2 || !(Number(info.price_kwd) > 0)} isLoading={runDraft.isPending} onClick={() => runDraft.mutate(info.notes)}>
              اكتب المنتج بالذكاء الاصطناعي
            </Button>
          </div>
          {runDraft.isPending && (
            <Text size="small" className="md:col-span-2 text-ui-fg-muted">
              بيقرا الصفحة ويكتب بالعربي والإنجليزي… ممكن ياخد دقيقة.
            </Text>
          )}
        </Container>
      )}

      {step === 1 && draft && (
        <Container className="flex flex-col gap-5">
          {draft.notes.length > 0 && (
            <div className="rounded-md border border-ui-tag-orange-border bg-ui-tag-orange-bg p-3">
              {draft.notes.map((n) => (
                <Text key={n} size="small">
                  ⚠ {n}
                </Text>
              ))}
            </div>
          )}

          <div>
            <Heading level="h2">هل فيه إضافات مع المنتج؟</Heading>
            <Text size="small" className="mb-2 text-ui-fg-subtle">
              الذكاء الاصطناعي علّم على اللي شايفه مناسب. العميل هيختار منها في صفحة المنتج.
            </Text>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {(addonGroups.data?.addon_groups ?? []).map((g) => (
                <label key={g.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={addons.includes(g.id)}
                    onCheckedChange={(on) => setAddons((a) => (on ? [...a, g.id] : a.filter((x) => x !== g.id)))}
                  />
                  {g.name_ar}
                  {draft.addon_group_ids.includes(g.id) && <Badge size="2xsmall" color="purple">مقترح</Badge>}
                </label>
              ))}
              {!addonGroups.data?.addon_groups.length && (
                <Text size="small" className="text-ui-fg-muted">
                  مفيش مجموعات إضافات لسه. اعملها من صفحة الكتالوج ← الإضافات.
                </Text>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <Switch checked={useVariants} onCheckedChange={setUseVariants} />
              <Heading level="h2">المنتج له أنواع (ألوان / مقاسات)؟</Heading>
            </div>
            {useVariants ? (
              <div className="mt-2 flex flex-col gap-2">
                {variants.map((v, i) => (
                  <div key={i} className="grid grid-cols-3 gap-2">
                    <Input placeholder="النوع (مثلاً أسود)" value={v.value} onChange={(e) => setVariants((vs) => vs.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
                    <Input type="number" step="0.001" dir="ltr" placeholder="السعر" value={v.price} onChange={(e) => setVariants((vs) => vs.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} />
                    <Input dir="ltr" placeholder="SKU" value={v.sku} onChange={(e) => setVariants((vs) => vs.map((x, j) => (j === i ? { ...x, sku: e.target.value } : x)))} />
                  </div>
                ))}
                <Button size="small" variant="secondary" className="self-start" onClick={() => setVariants((vs) => [...vs, { value: "", price: info.price_kwd, sku: "" }])}>
                  + نوع
                </Button>
              </div>
            ) : (
              <div className="mt-2 w-60">
                <Input dir="ltr" placeholder="SKU (اختياري)" value={sku} onChange={(e) => setSku(e.target.value)} />
              </div>
            )}
          </div>

          {draft.questions.length > 0 && (
            <div className="flex flex-col gap-3">
              <Heading level="h2">أسئلة من الذكاء الاصطناعي</Heading>
              {draft.questions.map((q, i) => (
                <Field key={i} label={q.question_ar} hint={q.suggestion_ar ? `اقتراح: ${q.suggestion_ar}` : undefined}>
                  <Input value={answers[i] ?? ""} onChange={(e) => setAnswers({ ...answers, [i]: e.target.value })} />
                </Field>
              ))}
              <Button
                size="small"
                variant="secondary"
                className="self-start"
                disabled={!answered.length}
                isLoading={runDraft.isPending}
                onClick={() => runDraft.mutate([info.notes, ...answered].filter(Boolean).join("\n"))}
              >
                حدّث المحتوى بالإجابات
              </Button>
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="secondary" onClick={() => setStep(0)}>
              رجوع
            </Button>
            <Button onClick={() => setStep(2)}>التالي: الصور</Button>
          </div>
        </Container>
      )}

      {step === 2 && draft && (
        <Container className="flex flex-col gap-5">
          <div>
            <Heading level="h2">صور من صفحة الشركة</Heading>
            <Text size="small" className="mb-2 text-ui-fg-subtle">
              اختار الصور الحقيقية للمنتج، وبعدين انسخها لمتجرك علشان ما تختفيش لو الشركة غيّرت موقعها.
            </Text>
            {draft.images.length ? (
              <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
                {draft.images.map((u) => (
                  <label key={u} className={`relative cursor-pointer rounded border-2 ${picked.includes(u) ? "border-ui-border-interactive" : "border-transparent"}`}>
                    <img src={u} alt="" className="aspect-square w-full rounded object-contain bg-white" loading="lazy" />
                    <Checkbox
                      className="absolute top-1 start-1"
                      checked={picked.includes(u)}
                      onCheckedChange={(on) => setPicked((p) => (on ? [...p, u] : p.filter((x) => x !== u)))}
                    />
                  </label>
                ))}
              </div>
            ) : (
              <Text size="small" className="text-ui-fg-muted">
                مفيش صور اتلاقت في الصفحة. ارفع الصور من صفحة المنتج بعد الحفظ.
              </Text>
            )}
            {draft.images.length > 0 && (
              <Button size="small" className="mt-2" disabled={!picked.length} isLoading={importImages.isPending} onClick={() => importImages.mutate()}>
                انسخ الصور المختارة ({picked.length})
              </Button>
            )}
          </div>

          <div>
            <Heading level="h2">صور المنتج ({images.length})</Heading>
            <Text size="small" className="mb-2 text-ui-fg-subtle">
              الأولى هي الصورة الرئيسية. ممكن تعمل منها نسخة بخلفية بيضا أو صورة تسويقية بالذكاء الاصطناعي. لازم تتأكد إن المنتج في الصورة الجديدة هو هو (المنافذ، الأزرار، اللوجو).
            </Text>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {images.map((u, i) => (
                <div key={u} className="flex flex-col gap-1 rounded border border-ui-border-base p-2">
                  <img src={u} alt="" className="aspect-square w-full rounded object-contain bg-white" />
                  {i === 0 ? (
                    <Badge size="2xsmall" color="green">الرئيسية</Badge>
                  ) : (
                    <Button size="small" variant="transparent" onClick={() => setImages((im) => [u, ...im.filter((x) => x !== u)])}>
                      اجعلها الرئيسية
                    </Button>
                  )}
                  <div className="flex flex-wrap gap-1">
                    <Button size="small" variant="secondary" disabled={enhance.isPending} onClick={() => enhance.mutate({ image_url: u, style: "white" })}>
                      خلفية بيضا
                    </Button>
                    <Button size="small" variant="secondary" disabled={enhance.isPending} onClick={() => enhance.mutate({ image_url: u, style: "lifestyle" })}>
                      صورة تسويقية
                    </Button>
                    <Button size="small" variant="transparent" onClick={() => setImages((im) => im.filter((x) => x !== u))}>
                      حذف
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {enhance.isPending && (
              <Text size="small" className="mt-2 text-ui-fg-muted">
                بيعمل الصورة… ممكن ياخد دقيقة.
              </Text>
            )}
          </div>

          <div className="flex justify-between">
            <Button variant="secondary" onClick={() => setStep(1)}>
              رجوع
            </Button>
            <Button disabled={!images.length} onClick={() => setStep(3)}>
              التالي: المراجعة
            </Button>
          </div>
        </Container>
      )}

      {step === 3 && draft && (
        <Container className="flex flex-col gap-4">
          {draft.source && (
            <Text size="small">
              المصدر:{" "}
              <a className="text-ui-fg-interactive" dir="ltr" href={draft.source.url} target="_blank" rel="noreferrer">
                {draft.source.title || draft.source.url}
              </a>
              {draft.brand ? ` · الماركة: ${draft.brand.name}` : draft.brand_suggested ? ` · الماركة "${draft.brand_suggested}" مش موجودة في الكتالوج، ضيفها من صفحة الكتالوج` : ""}
            </Text>
          )}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="الاسم بالعربي">
              <Input value={draft.content.title_ar} onChange={(e) => setContent({ title_ar: e.target.value })} />
            </Field>
            <Field label="الاسم بالإنجليزي">
              <Input dir="ltr" value={draft.content.title_en} onChange={(e) => setContent({ title_en: e.target.value })} />
            </Field>
            <Field label="سطر فرعي">
              <Input value={draft.content.subtitle_ar} onChange={(e) => setContent({ subtitle_ar: e.target.value })} />
            </Field>
            <Field label="Subtitle">
              <Input dir="ltr" value={draft.content.subtitle_en} onChange={(e) => setContent({ subtitle_en: e.target.value })} />
            </Field>
            <Field label="الوصف بالعربي">
              <Textarea rows={8} value={draft.content.description_ar} onChange={(e) => setContent({ description_ar: e.target.value })} />
            </Field>
            <Field label="Description">
              <Textarea dir="ltr" rows={8} value={draft.content.description_en} onChange={(e) => setContent({ description_en: e.target.value })} />
            </Field>
            <Field label="أهم المميزات (سطر لكل ميزة)">
              <Textarea rows={5} value={draft.content.highlights_ar.join("\n")} onChange={(e) => setContent({ highlights_ar: e.target.value.split("\n").filter((l) => l.trim()) })} />
            </Field>
            <Field label="Highlights (one per line)">
              <Textarea dir="ltr" rows={5} value={draft.content.highlights_en.join("\n")} onChange={(e) => setContent({ highlights_en: e.target.value.split("\n").filter((l) => l.trim()) })} />
            </Field>
            <Field label="عنوان السيو (عربي)" hint="حتى 60 حرف">
              <Input value={draft.content.seo_title_ar} onChange={(e) => setContent({ seo_title_ar: e.target.value })} />
              <Counter value={draft.content.seo_title_ar} max={60} />
            </Field>
            <Field label="SEO title (English)" hint="up to 60">
              <Input dir="ltr" value={draft.content.seo_title_en} onChange={(e) => setContent({ seo_title_en: e.target.value })} />
              <Counter value={draft.content.seo_title_en} max={60} />
            </Field>
            <Field label="وصف السيو (عربي)" hint="120 إلى 155 حرف">
              <Textarea rows={2} value={draft.content.seo_description_ar} onChange={(e) => setContent({ seo_description_ar: e.target.value })} />
              <Counter value={draft.content.seo_description_ar} max={155} />
            </Field>
            <Field label="SEO description (English)" hint="120-155">
              <Textarea dir="ltr" rows={2} value={draft.content.seo_description_en} onChange={(e) => setContent({ seo_description_en: e.target.value })} />
              <Counter value={draft.content.seo_description_en} max={155} />
            </Field>
            <Field label="رابط المنتج (handle)">
              <Input dir="ltr" value={draft.handle} onChange={(e) => setDraft({ ...draft, handle: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} />
            </Field>
          </div>

          <div>
            <Heading level="h2">المواصفات ({Object.keys(draft.specs).length})</Heading>
            <Text size="small" className="mb-2 text-ui-fg-subtle">
              من المصدر الرسمي بس. تقدر تعدّلها بعد الحفظ من خانة الكتالوج في صفحة المنتج.
            </Text>
            <table className="w-full text-sm">
              <tbody>
                {draft.spec_fields
                  .filter((f) => draft.specs[f.key] !== undefined)
                  .map((f) => (
                    <tr key={f.key} className="border-b border-ui-border-base">
                      <td className="py-1 text-ui-fg-subtle">{f.label_ar}</td>
                      <td className="py-1">
                        {specText(draft.specs[f.key])} {f.unit ?? ""}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {draft.missing_specs.length > 0 && (
              <Text size="xsmall" className="mt-1 text-ui-fg-muted">
                مش موجودة في المصدر: {draft.missing_specs.join("، ")}
              </Text>
            )}
          </div>

          {draft.content.faq.length > 0 && (
            <div>
              <Heading level="h2">أسئلة شائعة</Heading>
              {draft.content.faq.map((f, i) => (
                <div key={i} className="flex items-start justify-between gap-2 border-b border-ui-border-base py-1">
                  <Text size="small">
                    <b>{f.question_ar}</b> {f.answer_ar}
                  </Text>
                  <Button size="small" variant="transparent" onClick={() => setContent({ faq: draft.content.faq.filter((_, j) => j !== i) })}>
                    حذف
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ui-border-base pt-3">
            <Button variant="secondary" onClick={() => setStep(2)}>
              رجوع
            </Button>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={publish} onCheckedChange={setPublish} />
                انشر في المتجر على طول
              </label>
              <Button disabled={!canCreate} isLoading={create.isPending} onClick={() => create.mutate()}>
                {publish ? "إنشاء ونشر" : "حفظ كمسودة"}
              </Button>
            </div>
          </div>
        </Container>
      )}
    </div>
  )
}

export const config = defineRouteConfig({
  label: "منتج بالذكاء الاصطناعي",
  icon: Sparkles,
})

export default AiProductPage
