import {
  configureStoreSearch,
  defineMiddlewares,
  validateAndTransformBody,
} from "@medusajs/framework/http"

import {
  CreateHeroSlide,
  CreateTrustBadge,
  UpdateHeroSlide,
  UpdateSiteSettings,
  UpdateTrustBadge,
} from "./admin/content/validators"

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
  ],
})
