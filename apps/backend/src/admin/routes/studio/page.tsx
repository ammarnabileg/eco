import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Photo } from "@medusajs/icons"
import { Badge, Button, Container, Heading, Input, Label, Select, Switch, Text, Textarea, toast } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useRef, useState } from "react"

import {
  applyPrice,
  Box,
  Copy,
  defaultDesign,
  Design,
  drawDesign,
  hitTest,
  Lang,
  Language,
  loadFonts,
  Price,
  reflow,
  SizeKey,
  SIZES,
  TextEl,
} from "../../components/studio/design"
import { sdk } from "../../lib/sdk"

type Banner = {
  id: string
  title: string
  product_id: string | null
  background_url: string | null
  product_image_url: string | null
  canvas_width: number
  canvas_height: number
  elements: Design
  language: Language
  status: "draft" | "approved"
  output_url: string | null
  price_snapshot: Price | null
  slide_id: string | null
  updated_at: string
}
type Product = { id: string; title: string; thumbnail: string | null }

const API = String(import.meta.env.VITE_BACKEND_URL || "/").replace(/\/?$/, "/")
const STYLES = { tech: "تقني غامق", clean: "فاتح ونظيف", warm: "دافي", home: "بيت مريح" } as const
const ROLE_LABEL: Record<TextEl["role"], string> = {
  headline: "العنوان",
  subtitle: "الوصف",
  price: "السعر",
  was: "السعر قبل الخصم",
  badge: "شارة الخصم",
  button: "الزرار",
}
const PRICE_ROLES = new Set(["price", "was", "badge"])
const EMPTY_COPY: Record<Lang, Copy> = { ar: { headline: "", subtitle: "", button: "" }, en: { headline: "", subtitle: "", button: "" } }
const samePrice = (a: Price | null, b: Price | null) =>
  !a || !b ? a === b : Math.abs(a.amount - b.amount) < 0.0005 && Math.abs(a.original_amount - b.original_amount) < 0.0005

// Images are drawn through the backend's own address (see /admin/studio/image),
// otherwise the browser refuses to export the canvas.
async function fetchImage(url: string) {
  const res = await fetch(`${API}admin/studio/image?url=${encodeURIComponent(url)}`, { credentials: "include" })
  if (!res.ok) throw new Error(`تعذّر تحميل الصورة (${res.status})`)
  const img = new Image()
  img.src = URL.createObjectURL(await res.blob())
  await img.decode()
  return img
}

function useImage(url: string | null) {
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  useEffect(() => {
    let live = true
    setImg(null)
    if (url)
      fetchImage(url)
        .then((i) => live && setImg(i))
        .catch((e) => toast.error(e.message))
    return () => {
      live = false
    }
  }, [url])
  return img
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label size="small">{label}</Label>
      {children}
    </div>
  )
}

const StudioPage = () => {
  const qc = useQueryClient()
  const [bannerId, setBannerId] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [product, setProduct] = useState<Product | null>(null)
  const [price, setPrice] = useState<Price | null>(null)
  const [currentPrice, setCurrentPrice] = useState<Price | null>(null)
  const [size, setSize] = useState<SizeKey>("banner")
  const [language, setLanguage] = useState<Language>("ar")
  const [arabicDigits, setArabicDigits] = useState(false)
  const [copy, setCopy] = useState(EMPTY_COPY)
  const [brief, setBrief] = useState("")
  const [style, setStyle] = useState<keyof typeof STYLES>("tech")
  const [bgPrompt, setBgPrompt] = useState("")
  const [design, setDesign] = useState<Design | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [status, setStatus] = useState<{ status: Banner["status"]; output_url: string | null; slide_id: string | null }>({
    status: "draft",
    output_url: null,
    slide_id: null,
  })
  const [fonts, setFonts] = useState<"loading" | "ready" | string>("loading")
  const [search, setSearch] = useState("")
  const [mobileId, setMobileId] = useState("")
  const [ctaUrl, setCtaUrl] = useState("")

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const boxes = useRef<Box[]>([])
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null)
  const background = useImage(design?.background.url ?? null)
  const productImage = useImage(design?.product.url ?? null)

  useEffect(() => {
    loadFonts()
      .then(() => setFonts("ready"))
      .catch((e: Error) => setFonts(e.message))
  }, [])

  const banners = useQuery({
    queryKey: ["studio-banners"],
    queryFn: () => sdk.client.fetch<{ banners: Banner[] }>("/admin/studio/banners"),
  })
  const products = useQuery({
    queryKey: ["studio-products", search],
    queryFn: () => sdk.admin.product.list({ q: search, limit: 6, fields: "id,title,thumbnail" }),
    enabled: search.trim().length > 1,
  })

  const measure = useCallback((font: string, s: string) => {
    const ctx = canvasRef.current?.getContext("2d")
    if (!ctx) return s.length * 10
    ctx.font = font
    return ctx.measureText(s).width
  }, [])

  const redraw = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d")
    if (!ctx || !design || fonts !== "ready") return
    boxes.current = drawDesign(ctx, design, { background, product: productImage })
    const box = boxes.current.find((b) => b.id === selected)
    if (box) {
      ctx.save()
      ctx.strokeStyle = "#3B82F6"
      ctx.setLineDash([12, 8])
      ctx.lineWidth = 3
      ctx.strokeRect(box.x - 6, box.y - 6, box.w + 12, box.h + 12)
      ctx.restore()
    }
  }, [design, background, productImage, selected, fonts])
  useEffect(redraw, [redraw])

  const update = (d: Design) => {
    setDesign(d)
    setStatus((s) => ({ ...s, status: "draft", output_url: null }))
  }

  const pickProduct = async (p: Product) => {
    setProduct(p)
    setSearch("")
    if (!title) setTitle(p.title)
    const { price: now } = await sdk.client.fetch<{ price: Price | null }>(`/admin/studio/price?product_id=${p.id}`)
    setPrice(now)
    setCurrentPrice(now)
    if (design) update(applyPrice({ ...design, product: { ...design.product, url: p.thumbnail } }, now))
  }

  const build = () => {
    const d = defaultDesign({
      size,
      language,
      copy,
      price,
      productUrl: product?.thumbnail ?? null,
      backgroundUrl: design?.background.url ?? null,
      arabicDigits,
    })
    update(reflow(d, measure))
    setSelected(null)
  }

  const aiCopy = useMutation({
    mutationFn: () =>
      sdk.client.fetch<{ copy: Record<Lang, Copy> }>("/admin/studio/copy", {
        method: "POST",
        body: { product_id: product?.id ?? null, brief: brief || null },
      }),
    onSuccess: ({ copy }) => setCopy(copy),
    onError: (e: Error) => toast.error(e.message),
  })

  const aiBackground = useMutation({
    mutationFn: () =>
      sdk.client.fetch<{ url: string }>("/admin/studio/background", {
        method: "POST",
        body: { size, style, prompt: bgPrompt || null },
      }),
    onSuccess: ({ url }) => {
      const base = design ?? reflow(defaultDesign({ size, language, copy, price, productUrl: product?.thumbnail ?? null, arabicDigits }), measure)
      update({ ...base, background: { ...base.background, url, overlay: Math.max(base.background.overlay, 0.35) } })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const save = async () => {
    if (!design) throw new Error("ابني التصميم الأول.")
    const body = {
      title: title.trim() || "تصميم بدون اسم",
      product_id: product?.id ?? null,
      background_url: design.background.url,
      product_image_url: design.product.url,
      canvas_width: SIZES[design.size].width,
      canvas_height: SIZES[design.size].height,
      elements: design,
      language: design.language,
      price_snapshot: price,
    }
    const { banner } = await sdk.client.fetch<{ banner: Banner }>(bannerId ? `/admin/studio/banners/${bannerId}` : "/admin/studio/banners", {
      method: "POST",
      body,
    })
    setBannerId(banner.id)
    qc.invalidateQueries({ queryKey: ["studio-banners"] })
    return banner
  }
  const saveMutation = useMutation({
    mutationFn: save,
    onSuccess: () => toast.success("اتحفظ"),
    onError: (e: Error) => toast.error(e.message),
  })

  const toBlob = () =>
    new Promise<Blob>((resolve, reject) => {
      if (fonts !== "ready") return reject(new Error(fonts === "loading" ? "الخطوط لسه بتتحمّل" : fonts))
      const canvas = canvasRef.current!
      // Export without the selection frame.
      const ctx = canvas.getContext("2d")!
      if (design) drawDesign(ctx, design, { background, product: productImage })
      canvas.toBlob((b) => {
        redraw()
        if (b) resolve(b)
        else reject(new Error("تعذّر تصدير الصورة"))
      }, "image/png")
    })

  const approve = useMutation({
    mutationFn: async () => {
      if (!samePrice(price, currentPrice)) throw new Error("السعر اتغيّر في المتجر. دوس «حدّث السعر» الأول.")
      const saved = await save()
      const blob = await toBlob()
      const file = new File([blob], `studio-${saved.id}.png`, { type: "image/png" })
      const { files } = await sdk.admin.upload.create({ files: [file] })
      return sdk.client.fetch<{ banner: Banner }>(`/admin/studio/banners/${saved.id}/approve`, {
        method: "POST",
        body: { output_url: files[0].url },
      })
    },
    onSuccess: ({ banner }) => {
      setStatus({ status: banner.status, output_url: banner.output_url, slide_id: banner.slide_id })
      qc.invalidateQueries({ queryKey: ["studio-banners"] })
      toast.success("اتعتمد واتصدّر")
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const download = async () => {
    try {
      const url = URL.createObjectURL(await toBlob())
      const a = document.createElement("a")
      a.href = url
      // Latin letters only: Chromium drops a non-Latin file name and saves "download".
      const slug = title.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60).toLowerCase()
      a.download = `laly-${slug || "banner"}-${design?.size ?? "image"}.png`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const publish = useMutation({
    mutationFn: () =>
      sdk.client.fetch<{ slide: { id: string } }>("/admin/studio/slide", {
        method: "POST",
        body: { banner_id: bannerId, mobile_banner_id: mobileId || null, cta_url: ctaUrl || null },
      }),
    onSuccess: ({ slide }) => {
      setStatus((s) => ({ ...s, slide_id: slide.id }))
      qc.invalidateQueries({ queryKey: ["studio-banners"] })
      toast.success("السلايد اتنشر في الصفحة الرئيسية")
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const remove = useMutation({
    mutationFn: (id: string) => sdk.client.fetch(`/admin/studio/banners/${id}`, { method: "DELETE" }),
    onSuccess: (_, id) => {
      if (id === bannerId) reset()
      qc.invalidateQueries({ queryKey: ["studio-banners"] })
    },
  })

  const reset = () => {
    setBannerId(null)
    setTitle("")
    setProduct(null)
    setPrice(null)
    setCurrentPrice(null)
    setDesign(null)
    setSelected(null)
    setCopy(EMPTY_COPY)
    setStatus({ status: "draft", output_url: null, slide_id: null })
  }

  const open = async (id: string) => {
    const { banner, current_price } = await sdk.client.fetch<{ banner: Banner; current_price: Price | null }>(`/admin/studio/banners/${id}`)
    setBannerId(banner.id)
    setTitle(banner.title)
    setDesign(banner.elements)
    setSize(banner.elements.size)
    setLanguage(banner.language)
    setArabicDigits(banner.elements.arabicDigits)
    setPrice(banner.price_snapshot)
    setCurrentPrice(current_price)
    setProduct(banner.product_id ? { id: banner.product_id, title: banner.title, thumbnail: banner.product_image_url } : null)
    setStatus({ status: banner.status, output_url: banner.output_url, slide_id: banner.slide_id })
    setSelected(null)
  }

  // Dragging: canvas pixels from the pointer, stored back as fractions.
  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const scale = e.currentTarget.width / rect.width
    return { x: (e.clientX - rect.left) * scale, y: (e.clientY - rect.top) * scale }
  }
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!design) return
    const p = point(e)
    const id = hitTest(boxes.current, p.x, p.y)
    setSelected(id)
    if (!id) return
    const { width: W, height: H } = SIZES[design.size]
    const el = id === "product" ? design.product : design.texts.find((t) => t.id === id)!
    drag.current = { id, dx: p.x / W - el.x, dy: p.y / H - el.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drag.current || !design) return
    const p = point(e)
    const { width: W, height: H } = SIZES[design.size]
    const x = Math.min(0.98, Math.max(-0.2, p.x / W - drag.current.dx))
    const y = Math.min(0.98, Math.max(-0.2, p.y / H - drag.current.dy))
    const id = drag.current.id
    update(
      id === "product"
        ? { ...design, product: { ...design.product, x, y } }
        : { ...design, texts: design.texts.map((t) => (t.id === id ? { ...t, x, y } : t)) }
    )
  }
  const onUp = () => {
    drag.current = null
  }

  const el = design?.texts.find((t) => t.id === selected) ?? null
  const setEl = (patch: Partial<TextEl>) =>
    design && el && update({ ...design, texts: design.texts.map((t) => (t.id === el.id ? { ...t, ...patch } : t)) })
  const priceChanged = !!currentPrice && !!price && !samePrice(price, currentPrice)
  const langs: Lang[] = language === "both" ? ["ar", "en"] : [language]
  const approvedOthers = (banners.data?.banners ?? []).filter((b) => b.status === "approved" && b.id !== bannerId)

  return (
    <div className="flex flex-col gap-4" dir="rtl">
      <Container className="flex items-center justify-between gap-4 px-6 py-4">
        <div>
          <Heading>استوديو الصور</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            خلفية بالذكاء الاصطناعي، صورة المنتج الأصلية في كارت أبيض، والنص والسعر بيتكتبوا هنا بخط المتجر. السعر بييجي من المتجر دايمًا.
          </Text>
        </div>
        <Button variant="secondary" size="small" onClick={reset}>
          تصميم جديد
        </Button>
      </Container>

      {fonts !== "ready" && (
        <Container className="px-6 py-3">
          <Text size="small" className={fonts === "loading" ? "text-ui-fg-subtle" : "text-ui-fg-error"}>
            {fonts === "loading" ? "جاري تحميل خطوط Tajawal و Poppins…" : fonts}
          </Text>
        </Container>
      )}

      <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
        <div className="flex flex-col gap-4">
          <Container className="flex flex-col gap-3 px-6 py-4">
            <Field label="اسم التصميم">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field label="المنتج">
              {product && (
                <div className="flex items-center gap-2">
                  {product.thumbnail && <img src={product.thumbnail} alt="" className="h-10 w-10 rounded object-contain" />}
                  <Text size="small" className="flex-1">
                    {product.title}
                  </Text>
                  <Button
                    variant="transparent"
                    size="small"
                    onClick={() => {
                      setProduct(null)
                      setPrice(null)
                      setCurrentPrice(null)
                      if (design) update(applyPrice({ ...design, product: { ...design.product, url: null } }, null))
                    }}
                  >
                    شيل
                  </Button>
                </div>
              )}
              <Input placeholder="ابحث باسم المنتج" value={search} onChange={(e) => setSearch(e.target.value)} />
              {(products.data?.products ?? []).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="hover:bg-ui-bg-base-hover rounded px-2 py-1 text-start text-sm"
                  onClick={() => pickProduct(p as Product)}
                >
                  {p.title}
                </button>
              ))}
              {price && (
                <Text size="small" className="text-ui-fg-subtle">
                  السعر في المتجر: {price.amount.toFixed(3)} د.ك
                  {price.original_amount > price.amount && ` (بدل ${price.original_amount.toFixed(3)})`}
                  {price.ends_at && ` — العرض لحد ${new Date(price.ends_at).toLocaleDateString("ar-KW")}`}
                </Text>
              )}
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="المقاس">
                <Select value={size} onValueChange={(v) => setSize(v as SizeKey)}>
                  <Select.Trigger>
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content>
                    {(Object.keys(SIZES) as SizeKey[]).map((k) => (
                      <Select.Item key={k} value={k}>
                        {SIZES[k].label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              </Field>
              <Field label="اللغة">
                <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
                  <Select.Trigger>
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="ar">عربي</Select.Item>
                    <Select.Item value="en">English</Select.Item>
                    <Select.Item value="both">الاتنين</Select.Item>
                  </Select.Content>
                </Select>
              </Field>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="digits"
                checked={arabicDigits}
                onCheckedChange={(on) => {
                  setArabicDigits(on)
                  if (design) update(applyPrice({ ...design, arabicDigits: on }, price))
                }}
              />
              <Label htmlFor="digits" size="small">
                أرقام عربية (١٢٫٩٠٠)
              </Label>
            </div>
          </Container>

          <Container className="flex flex-col gap-3 px-6 py-4">
            <Heading level="h3">النصوص</Heading>
            <Field label="فكرة الإعلان (اختياري)">
              <Textarea rows={2} value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="مثلاً: عرض نهاية الأسبوع، توصيل سريع" />
            </Field>
            <Button variant="secondary" size="small" isLoading={aiCopy.isPending} onClick={() => aiCopy.mutate()}>
              اقترح نصوص بالذكاء الاصطناعي
            </Button>
            {langs.map((lang) => (
              <div key={lang} className="flex flex-col gap-2" dir={lang === "ar" ? "rtl" : "ltr"}>
                <Text size="xsmall" weight="plus">
                  {lang === "ar" ? "عربي" : "English"}
                </Text>
                {(["headline", "subtitle", "button"] as const).map((k) => (
                  <Input
                    key={k}
                    placeholder={ROLE_LABEL[k]}
                    value={copy[lang][k]}
                    onChange={(e) => setCopy({ ...copy, [lang]: { ...copy[lang], [k]: e.target.value } })}
                  />
                ))}
              </div>
            ))}
            <Button size="small" onClick={build}>
              {design ? "أعد بناء التصميم من النصوص" : "ابني التصميم"}
            </Button>
          </Container>

          <Container className="flex flex-col gap-3 px-6 py-4">
            <Heading level="h3">الخلفية</Heading>
            <Field label="الستايل">
              <Select value={style} onValueChange={(v) => setStyle(v as keyof typeof STYLES)}>
                <Select.Trigger>
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  {(Object.keys(STYLES) as (keyof typeof STYLES)[]).map((k) => (
                    <Select.Item key={k} value={k}>
                      {STYLES[k]}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </Field>
            <Field label="وصف إضافي (اختياري، بالإنجليزي أفضل)">
              <Input value={bgPrompt} onChange={(e) => setBgPrompt(e.target.value)} placeholder="soft blue light, desk setup" />
            </Field>
            <Button variant="secondary" size="small" isLoading={aiBackground.isPending} onClick={() => aiBackground.mutate()}>
              ولّد خلفية
            </Button>
            {design && (
              <>
                <Field label="لون الخلفية">
                  <input
                    type="color"
                    value={design.background.color}
                    onChange={(e) => update({ ...design, background: { ...design.background, color: e.target.value } })}
                  />
                </Field>
                {design.background.url && (
                  <div className="flex items-center gap-2">
                    <Field label={`تغميق الخلفية ${Math.round(design.background.overlay * 100)}%`}>
                      <input
                        type="range"
                        min={0}
                        max={0.8}
                        step={0.05}
                        value={design.background.overlay}
                        onChange={(e) => update({ ...design, background: { ...design.background, overlay: Number(e.target.value) } })}
                      />
                    </Field>
                    <Button variant="transparent" size="small" onClick={() => update({ ...design, background: { ...design.background, url: null, overlay: 0 } })}>
                      شيل الخلفية
                    </Button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Switch
                    id="card"
                    checked={design.product.card}
                    onCheckedChange={(card) => update({ ...design, product: { ...design.product, card } })}
                  />
                  <Label htmlFor="card" size="small">
                    صورة المنتج في كارت أبيض
                  </Label>
                </div>
              </>
            )}
          </Container>
        </div>

        <div className="flex flex-col gap-4">
          {priceChanged && (
            <Container className="flex items-center justify-between gap-3 px-6 py-3">
              <Text size="small" className="text-ui-fg-error">
                سعر المنتج اتغيّر: التصميم فيه {price!.amount.toFixed(3)} والمتجر دلوقتي {currentPrice!.amount.toFixed(3)} د.ك.
              </Text>
              <Button
                size="small"
                onClick={() => {
                  setPrice(currentPrice)
                  if (design) update(applyPrice(design, currentPrice))
                }}
              >
                حدّث السعر
              </Button>
            </Container>
          )}

          <Container className="flex flex-col gap-3 px-6 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge size="2xsmall" color={status.status === "approved" ? "green" : "grey"}>
                {status.status === "approved" ? "معتمد" : "مسودة"}
              </Badge>
              {status.slide_id && (
                <Badge size="2xsmall" color="blue">
                  منشور كسلايد
                </Badge>
              )}
              <div className="flex-1" />
              <Button variant="secondary" size="small" disabled={!design} isLoading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
                حفظ
              </Button>
              <Button variant="secondary" size="small" disabled={!design || fonts !== "ready"} onClick={download}>
                تحميل PNG
              </Button>
              <Button size="small" disabled={!design || fonts !== "ready"} isLoading={approve.isPending} onClick={() => approve.mutate()}>
                اعتماد وتصدير
              </Button>
            </div>
            {design ? (
              <canvas
                ref={canvasRef}
                width={SIZES[design.size].width}
                height={SIZES[design.size].height}
                className="w-full touch-none rounded border"
                style={{ maxHeight: "70vh", objectFit: "contain", cursor: drag.current ? "grabbing" : "grab" }}
                onPointerDown={onDown}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerCancel={onUp}
              />
            ) : (
              <div className="text-ui-fg-subtle flex h-64 items-center justify-center rounded border border-dashed text-sm">
                اختار المنتج واكتب النصوص (أو اطلب اقتراح)، وبعدين «ابني التصميم».
                <canvas ref={canvasRef} width={10} height={10} className="hidden" />
              </div>
            )}
            {design && design.size !== size && (
              <Text size="xsmall" className="text-ui-fg-subtle">
                المقاس المختار اتغيّر؛ دوس «أعد بناء التصميم» علشان يتطبّق.
              </Text>
            )}
          </Container>

          {design && el && (
            <Container className="flex flex-col gap-3 px-6 py-4">
              <Heading level="h3">{ROLE_LABEL[el.role]}</Heading>
              {PRICE_ROLES.has(el.role) ? (
                <Text size="small" className="text-ui-fg-subtle">
                  {el.text} — بييجي من سعر المتجر ومش بيتكتب بإيدك.
                </Text>
              ) : (
                <Textarea rows={2} dir={el.lang === "ar" ? "rtl" : "ltr"} value={el.text} onChange={(e) => setEl({ text: e.target.value })} />
              )}
              <div className="grid grid-cols-3 gap-3">
                <Field label="الحجم">
                  <input type="range" min={0.02} max={0.16} step={0.005} value={el.size} onChange={(e) => setEl({ size: Number(e.target.value) })} />
                </Field>
                <Field label="العرض">
                  <input type="range" min={0.15} max={1} step={0.01} value={el.w} onChange={(e) => setEl({ w: Number(e.target.value) })} />
                </Field>
                <Field label="اللون">
                  <input type="color" value={el.color} onChange={(e) => setEl({ color: e.target.value })} />
                </Field>
              </div>
              <div className="flex gap-2">
                {(["start", "center", "end"] as const).map((a) => (
                  <Button key={a} variant={el.align === a ? "primary" : "secondary"} size="small" onClick={() => setEl({ align: a })}>
                    {a === "start" ? "بداية السطر" : a === "center" ? "وسط" : "نهاية السطر"}
                  </Button>
                ))}
                <div className="flex-1" />
                <Button
                  variant="danger"
                  size="small"
                  onClick={() => {
                    update({ ...design, texts: design.texts.filter((t) => t.id !== el.id) })
                    setSelected(null)
                  }}
                >
                  احذف العنصر
                </Button>
              </div>
            </Container>
          )}

          {design && selected === "product" && (
            <Container className="flex flex-col gap-3 px-6 py-4">
              <Heading level="h3">صورة المنتج</Heading>
              <Field label={`الحجم ${Math.round(design.product.w * 100)}%`}>
                <input
                  type="range"
                  min={0.15}
                  max={0.9}
                  step={0.01}
                  value={design.product.w}
                  onChange={(e) => {
                    const w = Number(e.target.value)
                    const h = (design.product.h * w) / design.product.w
                    update({ ...design, product: { ...design.product, w, h } })
                  }}
                />
              </Field>
              <Text size="xsmall" className="text-ui-fg-subtle">
                الصورة الأصلية للمنتج بتتعرض زي ما هي، من غير قص ولا تعديل.
              </Text>
            </Container>
          )}

          {bannerId && status.status === "approved" && design?.size === "banner" && (
            <Container className="flex flex-col gap-3 px-6 py-4">
              <Heading level="h3">استخدمه كسلايد في الصفحة الرئيسية</Heading>
              <Field label="نسخة الموبايل (تصميم معتمد تاني، اختياري)">
                <Select value={mobileId || "none"} onValueChange={(v) => setMobileId(v === "none" ? "" : v)}>
                  <Select.Trigger>
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="none">نفس البانر</Select.Item>
                    {approvedOthers.map((b) => (
                      <Select.Item key={b.id} value={b.id}>
                        {b.title} ({b.canvas_width}×{b.canvas_height})
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              </Field>
              <Field label="الرابط (فاضي = صفحة المنتج)">
                <Input dir="ltr" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="/products/..." />
              </Field>
              {price?.ends_at && (
                <Text size="small" className="text-ui-fg-subtle">
                  السلايد هيقف لوحده مع نهاية العرض ({new Date(price.ends_at).toLocaleString("ar-KW")}). ولو السعر اتغيّر قبلها، بيتقفل تلقائيًا خلال ساعة.
                </Text>
              )}
              <Button size="small" isLoading={publish.isPending} onClick={() => publish.mutate()}>
                {status.slide_id ? "حدّث السلايد" : "استخدمه كسلايد"}
              </Button>
            </Container>
          )}

          <Container className="flex flex-col gap-2 px-6 py-4">
            <Heading level="h3">التصاميم المحفوظة</Heading>
            {(banners.data?.banners ?? []).length === 0 && (
              <Text size="small" className="text-ui-fg-subtle">
                لسه مفيش.
              </Text>
            )}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {(banners.data?.banners ?? []).map((b) => (
                <div key={b.id} className={`flex flex-col gap-1 rounded border p-2 ${b.id === bannerId ? "border-ui-border-interactive" : ""}`}>
                  <button type="button" className="text-start" onClick={() => open(b.id)}>
                    {b.output_url ? (
                      <img src={b.output_url} alt={b.title} className="aspect-video w-full rounded object-contain" />
                    ) : (
                      <div className="bg-ui-bg-subtle aspect-video w-full rounded" />
                    )}
                    <Text size="small" className="truncate">
                      {b.title}
                    </Text>
                  </button>
                  <div className="flex items-center gap-1">
                    <Badge size="2xsmall" color={b.status === "approved" ? "green" : "grey"}>
                      {b.status === "approved" ? "معتمد" : "مسودة"}
                    </Badge>
                    {b.slide_id && (
                      <Badge size="2xsmall" color="blue">
                        سلايد
                      </Badge>
                    )}
                    <div className="flex-1" />
                    <Button variant="transparent" size="small" onClick={() => remove.mutate(b.id)}>
                      حذف
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Container>
        </div>
      </div>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "استوديو الصور",
  icon: Photo,
})

export default StudioPage
