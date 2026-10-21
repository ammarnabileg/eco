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
import { CreateAiProduct, DraftAiProduct, EnhanceAiImage, ImportAiImages, PublishAiVideo, StartAiVideo } from "./admin/ai-products/validators"
import { AssistantChat, AssistantExecute } from "./admin/assistant/validators"
import { AdCopy, ApproveBanner, GenerateBackground, PublishSlide, SaveBanner } from "./admin/studio/validators"
import { SaveIntegration } from "./admin/integrations/validators"
import { SyncQuickbooks, UpdateQuickbooksSettings } from "./admin/quickbooks/validators"
import { guardBnplComplete, guardBnplSession } from "./store/carts/bnpl-guard"
import { guardLineItems } from "./store/carts/guards"
import { guardOtpComplete, guardOtpSession } from "./store/carts/otp-guard"
import { SendInboxMessage, SendOtp, SendProducts, TestWhatsapp, VerifyOtp } from "./store/whatsapp/validators"
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
      // The signature covers the exact bytes Intuit sent.
      method: ["POST"],
      matcher: "/hooks/quickbooks",
      bodyParser: { preserveRawBody: true },
    },
    { method: ["POST"], matcher: "/store/whatsapp/otp", middlewares: [validateAndTransformBody(SendOtp)] },
    { method: ["POST"], matcher: "/store/whatsapp/otp/verify", middlewares: [validateAndTransformBody(VerifyOtp)] },
    { method: ["POST"], matcher: "/admin/whatsapp/send-test", middlewares: [validateAndTransformBody(TestWhatsapp)] },
    { method: ["POST"], matcher: "/admin/whatsapp/products", middlewares: [validateAndTransformBody(SendProducts)] },
    {
      method: ["POST"],
      matcher: "/admin/whatsapp/conversations/:id/messages",
      middlewares: [validateAndTransformBody(SendInboxMessage)],
    },
    {
      method: ["POST"],
      matcher: "/admin/integrations/:key",
      middlewares: [validateAndTransformBody(SaveIntegration)],
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
    body("/admin/ai-products/draft", DraftAiProduct),
    body("/admin/ai-products/images/import", ImportAiImages),
    body("/admin/ai-products/images/enhance", EnhanceAiImage),
    body("/admin/ai-products/create", CreateAiProduct),
    body("/admin/ai-products/:id/video", StartAiVideo),
    body("/admin/ai-products/:id/video/publish", PublishAiVideo),
    body("/admin/studio/banners", SaveBanner),
    body("/admin/studio/banners/:id", SaveBanner),
    body("/admin/studio/banners/:id/approve", ApproveBanner),
    body("/admin/studio/slide", PublishSlide),
    body("/admin/studio/background", GenerateBackground),
    body("/admin/studio/copy", AdCopy),
    body("/admin/assistant/chat", AssistantChat),
    body("/admin/assistant/execute", AssistantExecute),
    body("/admin/quickbooks/settings", UpdateQuickbooksSettings),
    body("/admin/quickbooks/sync", SyncQuickbooks),
    {
      method: ["GET"],
      matcher: "/store/recommendations",
      middlewares: [authenticate("customer", ["session", "bearer"], { allowUnauthenticated: true })],
    },
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
      matcher: "/store/payment-collections/:id/payment-sessions",
      middlewares: [guardOtpSession, guardBnplSession],
    },
    {
      method: ["POST"],
      matcher: "/store/carts/:id/complete",
      middlewares: [guardOtpComplete, guardBnplComplete],
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
