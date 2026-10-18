import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

import { TestWhatsappType } from "../../../store/whatsapp/validators"
import { sendButtons, sendCarousel, sendText } from "../../../../modules/whatsapp/client"
import { kwd, normalizePhone, REPLY_CANCEL, REPLY_CONFIRM } from "../../../../modules/whatsapp/messages"
import { storefrontUrl, whatsappSettings } from "../../../../workflows/whatsapp"

// Sends one sample of each message type. No text fallback here: the admin
// should see whether the gateway and their phone accept buttons and cards.
export async function POST(req: MedusaRequest<TestWhatsappType>, res: MedusaResponse) {
  const settings = await whatsappSettings(req.scope)
  const phone = normalizePhone(req.validatedBody.phone)
  if (!settings.active || !phone) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, settings.active ? "Invalid phone number" : "Save and enable WhatsApp first")
  }
  const kind = req.validatedBody.kind
  if (kind === "text") {
    await sendText(settings.cfg, phone, "رسالة تجربة من متجر Laly ✅")
  } else if (kind === "buttons") {
    await sendButtons(settings.cfg, phone, {
      title: "تجربة الأزرار",
      description: "كده هتظهر رسالة الطلب للعميل. اضغط أي زرار للتجربة (مش هيأثر على أي طلب).",
      footer: "Laly",
      buttons: [
        { type: "reply", id: REPLY_CONFIRM, text: "✅ تأكيد الطلب" },
        { type: "reply", id: REPLY_CANCEL, text: "❌ إلغاء الطلب" },
      ],
    })
  } else {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity: "product",
      fields: ["title", "handle", "thumbnail", "variants.prices.amount", "variants.prices.currency_code"],
      filters: { status: "published" },
      pagination: { take: 20 },
    })
    const products = (data as unknown as {
      title: string
      handle: string
      thumbnail?: string | null
      variants?: { prices?: { amount: number; currency_code: string }[] }[]
    }[])
      .filter((p) => p.thumbnail?.startsWith("http"))
      .slice(0, 3)
    if (!products.length) throw new MedusaError(MedusaError.Types.INVALID_DATA, "No published product with an image to show")
    await sendCarousel(settings.cfg, phone, {
      body: "تجربة كروت المنتجات من Laly",
      cards: products.map((p) => {
        const price = (p.variants ?? []).flatMap((v) => v.prices ?? []).find((x) => x.currency_code === "kwd")?.amount
        return {
          body: p.title,
          footer: price != null ? kwd(Number(price)) : "Laly",
          imageUrl: p.thumbnail as string,
          buttons: [{ type: "url" as const, text: "🛒 اشتري الآن", url: storefrontUrl(`/products/${p.handle}`) }],
        }
      }),
    })
  }
  res.json({ sent: true, kind })
}
