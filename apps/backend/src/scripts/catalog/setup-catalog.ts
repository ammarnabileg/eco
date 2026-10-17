import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import {
  createProductCategoriesWorkflow,
  updateProductCategoriesWorkflow,
} from "@medusajs/medusa/core-flows"

import { CATALOG_MODULE } from "../../modules/catalog"
import CatalogModuleService from "../../modules/catalog/service"
import { createAddonGroupWorkflow } from "../../workflows/catalog/addon-groups"
import { createBrandWorkflow } from "../../workflows/catalog/brands"
import {
  createSpecTemplateWorkflow,
  updateSpecTemplateWorkflow,
} from "../../workflows/catalog/spec-templates"
import { ADDON_GROUPS, BRANDS, CATEGORY_TREE, CategoryDef, SPEC_TEMPLATES } from "./catalog-data"

/**
 * Applies catalog-data.ts: the category tree, spec templates, brands and
 * add-on groups. Safe to re-run: it matches categories by handle, templates
 * by English name, brands by handle and add-on groups by English name.
 * Names, parents and template fields follow the file; descriptions and SEO
 * text are only filled when empty so admin edits survive; add-on prices are
 * never touched after the first run.
 *
 *   npx medusa exec ./src/scripts/catalog/setup-catalog.ts
 */
export default async function setupCatalog({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productModule = container.resolve(Modules.PRODUCT)
  const catalog = container.resolve<CatalogModuleService>(CATALOG_MODULE)

  // Categories, parents first.
  const ids = new Map<string, string>()
  const upsert = async (def: CategoryDef, parentId: string | null, rank: number) => {
    const [existing] = await productModule.listProductCategories(
      { handle: def.handle },
      { select: ["id", "name", "description", "metadata", "parent_category_id"] }
    )
    const metadata = {
      ...(existing?.metadata ?? {}),
      name_en: def.name_en,
      description_en: (existing?.metadata?.description_en as string | undefined) || def.description_en,
    }
    const data = {
      name: def.name_ar,
      handle: def.handle,
      description: existing?.description || def.description_ar,
      parent_category_id: parentId,
      is_active: true,
      is_internal: false,
      rank,
      metadata,
    }
    if (existing) {
      await updateProductCategoriesWorkflow(container).run({
        input: { selector: { id: existing.id }, update: data },
      })
      ids.set(def.handle, existing.id)
    } else {
      const { result } = await createProductCategoriesWorkflow(container).run({
        input: { product_categories: [data] },
      })
      ids.set(def.handle, result[0].id)
    }
    for (const [i, child] of (def.children ?? []).entries()) {
      await upsert(child, ids.get(def.handle)!, i)
    }
  }
  for (const [i, root] of CATEGORY_TREE.entries()) {
    await upsert(root, null, i)
  }
  logger.info(`Catalog: ${ids.size} categories in place`)

  // Spec templates.
  const templates = await catalog.listSpecTemplates({})
  for (const [rank, t] of SPEC_TEMPLATES.entries()) {
    const categoryIds = t.categories.map((handle) => {
      const id = ids.get(handle)
      if (!id) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Template "${t.name_en}" points at unknown category "${handle}"`
        )
      }
      return id
    })
    const input = {
      name_ar: t.name_ar,
      name_en: t.name_en,
      attributes: t.attributes,
      rank,
      category_ids: categoryIds,
    }
    const existing = templates.find((row) => row.name_en === t.name_en)
    if (existing) {
      await updateSpecTemplateWorkflow(container).run({ input: { ...input, id: existing.id } })
    } else {
      await createSpecTemplateWorkflow(container).run({ input })
    }
  }
  logger.info(`Catalog: ${SPEC_TEMPLATES.length} spec templates in place`)

  // Brands.
  const brands = await catalog.listBrands({})
  for (const [rank, b] of BRANDS.entries()) {
    if (!brands.some((row) => row.handle === b.handle)) {
      await createBrandWorkflow(container).run({ input: { ...b, rank } })
    }
  }

  // Add-on groups: created once, then owned by the admin.
  const groups = await catalog.listAddonGroups({})
  for (const [rank, g] of ADDON_GROUPS.entries()) {
    if (groups.some((row) => row.name_en === g.name_en)) {
      continue
    }
    await createAddonGroupWorkflow(container).run({
      input: {
        name_ar: g.name_ar,
        name_en: g.name_en,
        kind: g.kind,
        rank,
        options: g.options.map((opt, i) => ({ ...opt, price: 0, is_active: false, rank: i })),
      },
    })
  }
  logger.info(`Catalog: ${BRANDS.length} brands and ${ADDON_GROUPS.length} add-on groups in place`)
}
