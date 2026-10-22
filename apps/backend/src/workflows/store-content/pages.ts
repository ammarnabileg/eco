import { MedusaError } from "@medusajs/framework/utils"
import { createStep, createWorkflow, StepResponse, WorkflowResponse } from "@medusajs/framework/workflows-sdk"

import { STORE_CONTENT_MODULE } from "../../modules/store-content"
import StoreContentModuleService from "../../modules/store-content/service"

export type FaqItem = { group_ar?: string | null; group_en?: string | null; q_ar: string; a_ar: string; q_en?: string | null; a_en?: string | null }
export type PageDraftInput = {
  slug: string
  title_ar: string
  title_en?: string | null
  summary_ar?: string | null
  summary_en?: string | null
  body_ar?: string | null
  body_en?: string | null
  faq?: FaqItem[] | null
}

const service = (container: { resolve: <T>(key: string) => T }) =>
  container.resolve<StoreContentModuleService>(STORE_CONTENT_MODULE)

const storePageDraftStep = createStep(
  "store-page-draft",
  async (input: PageDraftInput, { container }) => {
    const svc = service(container)
    const data = {
      slug: input.slug,
      title_ar: input.title_ar,
      title_en: input.title_en ?? "",
      summary_ar: input.summary_ar ?? null,
      summary_en: input.summary_en ?? null,
      body_ar: input.body_ar ?? "",
      body_en: input.body_en ?? "",
      faq: (input.faq ?? null) as unknown as Record<string, unknown> | null,
      has_draft_changes: true,
    }
    const [existing] = await svc.listContentPages({ slug: input.slug }, { take: 1 })
    if (existing) {
      const row = await svc.updateContentPages({ id: existing.id, ...data })
      return new StepResponse(row, { created: null as string | null, before: existing as unknown as Record<string, unknown> | null })
    }
    const row = await svc.createContentPages(data)
    return new StepResponse(row, { created: row.id as string | null, before: null as Record<string, unknown> | null })
  },
  async (undo, { container }) => {
    if (!undo) return
    if (undo.created) await service(container).deleteContentPages([undo.created])
    if (undo.before) await service(container).updateContentPages(undo.before as never)
  }
)

export const savePageDraftWorkflow = createWorkflow("save-page-draft", (input: PageDraftInput) =>
  new WorkflowResponse(storePageDraftStep(input))
)

// Copies the draft into a new numbered revision and makes it the live one.
const releasePageStep = createStep(
  "release-page",
  async (input: { slug: string; user_id?: string | null }, { container }) => {
    const svc = service(container)
    const [page] = await svc.listContentPages({ slug: input.slug }, { take: 1 })
    if (!page) throw new MedusaError(MedusaError.Types.NOT_FOUND, "احفظ الصفحة الأول.")
    const faq = (page.faq as unknown as FaqItem[] | null) ?? []
    if (!page.title_ar.trim() || (!page.body_ar.trim() && !faq.length)) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "الصفحة فاضية: اكتب العنوان والمحتوى بالعربي قبل النشر.")
    }
    const version = page.version + 1
    const revision = await svc.createContentPageRevisions({
      page_id: page.id,
      slug: page.slug,
      version,
      title_ar: page.title_ar,
      title_en: page.title_en,
      summary_ar: page.summary_ar,
      summary_en: page.summary_en,
      body_ar: page.body_ar,
      body_en: page.body_en,
      faq: page.faq,
      published_by: input.user_id ?? null,
    })
    const row = await svc.updateContentPages({ id: page.id, version, is_published: true, has_draft_changes: false, published_at: new Date() })
    return new StepResponse(row, { revision: revision.id, before: page as unknown as Record<string, unknown> })
  },
  async (undo, { container }) => {
    if (!undo) return
    await service(container).deleteContentPageRevisions([undo.revision])
    await service(container).updateContentPages(undo.before as never)
  }
)

export const publishPageWorkflow = createWorkflow("publish-page", (input: { slug: string; user_id?: string | null }) =>
  new WorkflowResponse(releasePageStep(input))
)

const hidePageStep = createStep(
  "hide-page",
  async (slug: string, { container }) => {
    const svc = service(container)
    const [page] = await svc.listContentPages({ slug }, { take: 1 })
    if (!page) throw new MedusaError(MedusaError.Types.NOT_FOUND, "Page not found")
    const row = await svc.updateContentPages({ id: page.id, is_published: false })
    return new StepResponse(row, page.id)
  },
  async (id, { container }) => {
    if (id) await service(container).updateContentPages({ id, is_published: true })
  }
)

export const unpublishPageWorkflow = createWorkflow("unpublish-page", (input: { slug: string }) =>
  new WorkflowResponse(hidePageStep(input.slug))
)
