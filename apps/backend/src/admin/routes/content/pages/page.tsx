import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Badge, Button, Container, Heading, Input, Label, Tabs, Text, Textarea, toast } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"

import { sdk } from "../../../lib/sdk"

type PageSummary = {
  slug: string
  label: string
  group: string
  title_ar: string | null
  is_published: boolean
  version: number
  published_at: string | null
  has_draft_changes: boolean
}
type Faq = { group_ar: string; group_en: string; q_ar: string; a_ar: string; q_en: string; a_en: string }
type Draft = {
  title_ar: string
  title_en: string
  summary_ar: string
  summary_en: string
  body_ar: string
  body_en: string
  faq: Faq[]
}
type Revision = { id: string; version: number; title_ar: string; published_by: string | null; created_at: string }

const EMPTY: Draft = { title_ar: "", title_en: "", summary_ar: "", summary_en: "", body_ar: "", body_en: "", faq: [] }
const EMPTY_FAQ: Faq = { group_ar: "", group_en: "", q_ar: "", a_ar: "", q_en: "", a_en: "" }
const date = (d: string | null) => (d ? new Date(d).toLocaleString("ar-KW", { dateStyle: "medium", timeStyle: "short" }) : "—")

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

const SYNTAX =
  "اكتب نص عادي. «## » في أول السطر = عنوان قسم (بيظهر في الفهرس)، «### » = عنوان فرعي، «- » = نقطة في قائمة، «1. » = قائمة مرقّمة، **كلام** = خط عريض، [النص](https://…) = لينك. سطر فاضي = فقرة جديدة. ممنوع HTML."

function Editor({ slug, onSaved }: { slug: string; onSaved: () => void }) {
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const page = useQuery({
    queryKey: ["content-page", slug],
    queryFn: () =>
      sdk.client.fetch<{ page: (Draft & { faq: Faq[] | null; version: number; is_published: boolean }) | null; definition: { label: string }; revisions: Revision[] }>(
        `/admin/content/pages/${slug}`
      ),
  })
  useEffect(() => {
    const p = page.data?.page
    setDraft(
      p
        ? {
            title_ar: p.title_ar ?? "",
            title_en: p.title_en ?? "",
            summary_ar: p.summary_ar ?? "",
            summary_en: p.summary_en ?? "",
            body_ar: p.body_ar ?? "",
            body_en: p.body_en ?? "",
            faq: (p.faq ?? []).map((f) => ({ ...EMPTY_FAQ, ...f })),
          }
        : { ...EMPTY, title_ar: page.data?.definition.label ?? "" }
    )
  }, [page.data])

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))
  const setFaq = (i: number, patch: Partial<Faq>) => set({ faq: draft.faq.map((f, j) => (j === i ? { ...f, ...patch } : f)) })

  const save = useMutation({
    mutationFn: () =>
      sdk.client.fetch(`/admin/content/pages/${slug}`, {
        method: "POST",
        body: {
          ...draft,
          summary_ar: draft.summary_ar || null,
          summary_en: draft.summary_en || null,
          faq: slug === "faq" ? draft.faq.filter((f) => f.q_ar.trim() && f.a_ar.trim()) : null,
        },
      }),
    onSuccess: () => {
      toast.success("اتحفظت المسودة. العملاء لسه شايفين النسخة المنشورة.")
      page.refetch()
      onSaved()
    },
    onError: (e: Error) => toast.error(e.message),
  })
  const publish = useMutation({
    mutationFn: async () => {
      await save.mutateAsync()
      return sdk.client.fetch(`/admin/content/pages/${slug}/publish`, { method: "POST" })
    },
    onSuccess: () => {
      toast.success("اتنشرت. بتظهر في المتجر خلال دقيقة.")
      page.refetch()
      onSaved()
    },
    onError: (e: Error) => toast.error(e.message),
  })
  const hide = useMutation({
    mutationFn: () => sdk.client.fetch(`/admin/content/pages/${slug}/unpublish`, { method: "POST" }),
    onSuccess: () => {
      toast.success("الصفحة اتخفت من المتجر")
      page.refetch()
      onSaved()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const current = page.data?.page
  return (
    <div className="flex flex-col gap-4">
      <Container className="flex flex-wrap items-center gap-3 px-6 py-4">
        <Heading level="h2">{page.data?.definition.label ?? slug}</Heading>
        {current?.is_published ? (
          <Badge size="2xsmall" color="green">
            منشورة — نسخة {current.version}
          </Badge>
        ) : (
          <Badge size="2xsmall" color="grey">
            مش منشورة
          </Badge>
        )}
        <div className="flex-1" />
        <Button variant="secondary" size="small" isLoading={save.isPending} onClick={() => save.mutate()}>
          حفظ المسودة
        </Button>
        {current?.is_published && (
          <Button variant="secondary" size="small" isLoading={hide.isPending} onClick={() => hide.mutate()}>
            إخفاء من المتجر
          </Button>
        )}
        <Button
          size="small"
          isLoading={publish.isPending}
          onClick={() => {
            if (window.confirm(`هتنشر النسخة ${(current?.version ?? 0) + 1} للعملاء. اتأكدت إن الكلام ده معتمد ومطابق لطريقة شغلنا الفعلية؟`)) publish.mutate()
          }}
        >
          نشر
        </Button>
      </Container>

      <Container className="flex flex-col gap-4 px-6 py-4">
        <Text size="small" className="text-ui-fg-subtle">
          الكلام هنا وعد للعميل: اكتب بس اللي بتطبّقه فعلاً (مدة الإرجاع، رسوم التوصيل، مدة الضمان). المسودة مش بتظهر للعملاء غير بعد «نشر».
        </Text>
        <Tabs defaultValue="ar">
          <Tabs.List>
            <Tabs.Trigger value="ar">عربي</Tabs.Trigger>
            <Tabs.Trigger value="en">English</Tabs.Trigger>
          </Tabs.List>
          {(["ar", "en"] as const).map((lang) => (
            <Tabs.Content key={lang} value={lang} className="flex flex-col gap-3 pt-4" dir={lang === "ar" ? "rtl" : "ltr"}>
              <Field label={lang === "ar" ? "العنوان *" : "Title"}>
                <Input value={draft[`title_${lang}`]} onChange={(e) => set({ [`title_${lang}`]: e.target.value })} />
              </Field>
              <Field label={lang === "ar" ? "مقدمة قصيرة (بتظهر تحت العنوان وفي جوجل)" : "Short summary"}>
                <Textarea rows={2} value={draft[`summary_${lang}`]} onChange={(e) => set({ [`summary_${lang}`]: e.target.value })} />
              </Field>
              <Field label={lang === "ar" ? "المحتوى" : "Content"} hint={lang === "ar" ? SYNTAX : undefined}>
                <Textarea
                  rows={18}
                  className="font-mono text-sm"
                  value={draft[`body_${lang}`]}
                  onChange={(e) => set({ [`body_${lang}`]: e.target.value })}
                />
              </Field>
            </Tabs.Content>
          ))}
        </Tabs>
      </Container>

      {slug === "faq" && (
        <Container className="flex flex-col gap-4 px-6 py-4">
          <div className="flex items-center justify-between">
            <Heading level="h3">الأسئلة ({draft.faq.length})</Heading>
            <Button variant="secondary" size="small" onClick={() => set({ faq: [...draft.faq, { ...EMPTY_FAQ, group_ar: draft.faq.at(-1)?.group_ar ?? "" }] })}>
              سؤال جديد
            </Button>
          </div>
          {draft.faq.map((f, i) => (
            <div key={i} className="grid gap-2 rounded-lg border p-3 md:grid-cols-2">
              <Input placeholder="المجموعة (مثلاً: التوصيل)" value={f.group_ar} onChange={(e) => setFaq(i, { group_ar: e.target.value })} />
              <Input dir="ltr" placeholder="Group (English)" value={f.group_en} onChange={(e) => setFaq(i, { group_en: e.target.value })} />
              <Input placeholder="السؤال *" value={f.q_ar} onChange={(e) => setFaq(i, { q_ar: e.target.value })} />
              <Input dir="ltr" placeholder="Question" value={f.q_en} onChange={(e) => setFaq(i, { q_en: e.target.value })} />
              <Textarea rows={3} placeholder="الإجابة *" value={f.a_ar} onChange={(e) => setFaq(i, { a_ar: e.target.value })} />
              <Textarea rows={3} dir="ltr" placeholder="Answer" value={f.a_en} onChange={(e) => setFaq(i, { a_en: e.target.value })} />
              <div className="flex gap-2 md:col-span-2">
                <Button variant="transparent" size="small" disabled={i === 0} onClick={() => set({ faq: draft.faq.map((x, j) => (j === i - 1 ? f : j === i ? draft.faq[i - 1] : x)) })}>
                  ↑ لفوق
                </Button>
                <div className="flex-1" />
                <Button variant="transparent" size="small" onClick={() => set({ faq: draft.faq.filter((_, j) => j !== i) })}>
                  حذف
                </Button>
              </div>
            </div>
          ))}
        </Container>
      )}

      <Container className="flex flex-col gap-2 px-6 py-4">
        <Heading level="h3">النسخ المنشورة</Heading>
        {(page.data?.revisions ?? []).length === 0 ? (
          <Text size="small" className="text-ui-fg-subtle">
            لسه ما اتنشرتش.
          </Text>
        ) : (
          (page.data?.revisions ?? []).map((r) => (
            <Text key={r.id} size="small">
              نسخة {r.version} — {date(r.created_at)}
            </Text>
          ))
        )}
      </Container>
    </div>
  )
}

const PagesPage = () => {
  const qc = useQueryClient()
  const [slug, setSlug] = useState<string | null>(null)
  const pages = useQuery({
    queryKey: ["content-pages"],
    queryFn: () => sdk.client.fetch<{ pages: PageSummary[] }>("/admin/content/pages"),
  })
  const list = pages.data?.pages ?? []
  useEffect(() => {
    if (!slug && list.length) setSlug(list[0].slug)
  }, [list, slug])

  return (
    <div className="grid gap-4 xl:grid-cols-[280px_1fr]" dir="rtl">
      <Container className="flex flex-col gap-1 px-3 py-4">
        <Heading level="h2" className="px-3 pb-2">
          الصفحات والسياسات
        </Heading>
        {list.map((p) => (
          <button
            key={p.slug}
            type="button"
            onClick={() => setSlug(p.slug)}
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-start text-sm ${p.slug === slug ? "bg-ui-bg-base-pressed" : "hover:bg-ui-bg-base-hover"}`}
          >
            <span className="flex-1">{p.label}</span>
            {p.is_published ? (
              <Badge size="2xsmall" color={p.has_draft_changes ? "orange" : "green"}>
                {p.has_draft_changes ? "تعديلات مش منشورة" : `v${p.version}`}
              </Badge>
            ) : (
              <Badge size="2xsmall" color="grey">
                مسودة
              </Badge>
            )}
          </button>
        ))}
      </Container>
      {slug && <Editor key={slug} slug={slug} onSaved={() => qc.invalidateQueries({ queryKey: ["content-pages"] })} />}
    </div>
  )
}

export const config = defineRouteConfig({
  label: "الصفحات والسياسات",
})

export default PagesPage
