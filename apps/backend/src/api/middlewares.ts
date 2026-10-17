import {
  allowFields,
  authenticate,
  configureStoreSearch,
  defineMiddlewares,
  validateAndTransformBody,
} from "@medusajs/framework/http"

import {
  CreateAddonGroup,
  CreateBrand,
  CreateSpecTemplate,
  UpdateAddonGroup,
  UpdateBrand,
  UpdateProductCatalog,
  UpdateQuoteRequest,
  UpdateSpecTemplate,
} from "./admin/catalog/validators"

import {
  CreateHeroSlide,
  CreateTrustBadge,
  UpdateHeroSlide,
  UpdateSiteSettings,
  UpdateTrustBadge,
} from "./admin/content/validators"
import { SyncQuickbooks, UpdateQuickbooksSettings } from "./admin/quickbooks/validators"
import { guardLineItems } from "./store/carts/guards"
import { AddConfiguredItem, CreateQuoteRequest } from "./store/catalog/validators"

// Request them as stars: +brand.*,+product_detail.*,+addon_groups.options.*
const CATALOG_PRODUCT_FIELDS = ["brand", "product_detail", "addon_groups", "addon_groups.options"]

const body = (matcher: string, schema: Parameters<typeof validateAndTransformBody>[0]) => ({
  method: ["POST" as const],
  matcher,
  middlewares: [validateAndTransformBody(schema)],
})

export default defineMiddlewares({
  routes: [
    // The product index declares filterable `status` and `sales_channel_ids`, so
    // the route narrows it to published products in the key's sales channels.
    {
      method: ["POST"],
      matcher: "/store/search",
      middlewares: [
        configureStoreSearch({
          allowed_indexes: {
            product: true,
          },
        }),
      ],
    },
    {
      method: ["POST"],
      matcher: "/admin/content/settings",
      middlewares: [validateAndTransformBody(UpdateSiteSettings)],
    },
    {
      method: ["POST"],
      matcher: "/admin/content/hero-slides",
      middlewares: [validateAndTransformBody(CreateHeroSlide)],
    },
    {
      method: ["POST"],
      matcher: "/admin/content/hero-slides/:id",
      middlewares: [validateAndTransformBody(UpdateHeroSlide)],
    },
    {
      method: ["POST"],
      matcher: "/admin/content/trust-badges",
      middlewares: [validateAndTransformBody(CreateTrustBadge)],
    },
    {
      method: ["POST"],
      matcher: "/admin/content/trust-badges/:id",
      middlewares: [validateAndTransformBody(UpdateTrustBadge)],
    },
    // Catalog: brands, spec templates, add-ons, quotes, per-product data.
    body("/admin/catalog/brands", CreateBrand),
    body("/admin/catalog/brands/:id", UpdateBrand),
    body("/admin/catalog/spec-templates", CreateSpecTemplate),
    body("/admin/catalog/spec-templates/:id", UpdateSpecTemplate),
    body("/admin/catalog/addon-groups", CreateAddonGroup),
    body("/admin/catalog/addon-groups/:id", UpdateAddonGroup),
    body("/admin/catalog/quote-requests/:id", UpdateQuoteRequest),
    body("/admin/catalog/products/:id", UpdateProductCatalog),
    body("/store/carts/:id/configured-items", AddConfiguredItem),
    body("/admin/quickbooks/settings", UpdateQuickbooksSettings),
    body("/admin/quickbooks/sync", SyncQuickbooks),
    {
      method: ["POST"],
      matcher: "/store/quote-requests",
      middlewares: [
        authenticate("customer", ["session", "bearer"], { allowUnauthenticated: true }),
        validateAndTransformBody(CreateQuoteRequest),
      ],
    },
    {
      method: ["POST"],
      matcher: "/store/carts/:id/line-items",
      middlewares: [guardLineItems],
    },
    {
      method: ["POST"],
      matcher: "/store/carts/:id/line-items/:line_id",
      middlewares: [guardLineItems],
    },
    // Linked catalog data on the core product routes (?fields=+brand.*...).
    ...["/store/products", "/store/products/:id"].map((matcher) => ({
      matcher,
      middlewares: [allowFields(...CATALOG_PRODUCT_FIELDS)],
    })),
  ],
})
