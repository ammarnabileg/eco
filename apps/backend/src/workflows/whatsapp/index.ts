import { createHmac } from "node:crypto"

import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { createStep, createWorkflow, StepResponse, WorkflowResponse } from "@medusajs/framework/workflows-sdk"

import { INTEGRATIONS_MODULE } from "../../modules/integrations"
import IntegrationsModuleService from "../../modules/integrations/service"
import { resolveIntegration, settingsKey } from "../../modules/integrations/store"
import { paymentMethodName } from "../../modules/quickbooks/mapping"
import { WHATSAPP_MODULE } from "../../modules/whatsapp"
import { EvolutionConfig, sendText } from "../../modules/whatsapp/client"
import {
  cancelRequestedText,
  confirmedText,
  hashOtp,
  maskPhone,
  newOtpCode,
  normalizePhone,
  orderText,
  otpMatches,
  otpText,
  parseReply,
  welcomeText,
} from "../../modules/whatsapp/messages"
import WhatsAppModuleService from "../../modules/whatsapp/service"

const wa = (c: MedusaContainer) => c.resolve<WhatsAppModuleService>(WHATSAPP_MODULE)

export type WhatsAppSettings = {
  active: boolean
  cfg: EvolutionConfig
  welcome: boolean
  order: boolean
  guestOtp: boolean
}

export async function whatsappSettings(container: MedusaContainer): Promise<WhatsAppSettings> {
  const svc = container.resolve<IntegrationsModuleService>(INTEGRATIONS_MODULE)
  const r = resolveIntegration("whatsapp", await svc.findRow("whatsapp"))
  const v = r.values
  return {
    active: r.active,
    cfg: { baseUrl: String(v.base_url ?? ""), instance: String(v.instance ?? ""), apiKey: String(v.api_key ?? "") },
    welcome: v.welcome !== "off",
    order: v.order !== "off",
    guestOtp: v.guest_otp !== "off",
  }
}

/** Shared secret Evolution sends back with each webhook call. */
export const whatsappWebhookToken = () =>
  createHmac("sha256", settingsKey()).update("whatsapp-webhook").digest("hex").slice(0, 40)

// --- welcome ---------------------------------------------------------------

export async function sendWelcome(container: MedusaContainer, customerId: string) {
  const settings = await whatsappSettings(container)
  if (!settings.active || !settings.welcome) return false
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "customer",
    fields: ["id", "first_name", "phone", "has_account"],
    filters: { id: customerId },
  })
  const customer = data[0] as { first_name?: string | null; phone?: string | null; has_account?: boolean } | undefined
  const phone = normalizePhone(customer?.phone)
  if (!customer?.has_account || !phone) return false
  await sendText(settings.cfg, phone, welcomeText(customer.first_name ?? null))
  return true
}

// --- order summary and confirmation ----------------------------------------

const saveOrderMessageStep = createStep(
  "save-order-message",
  async (input: { order_id: string; phone: string; status: "sent" | "failed"; error?: string | null }, { container }) => {
    const svc = wa(container)
    const [existing] = await svc.listWaOrderConfirmations({ order_id: input.order_id }, { take: 1 })
    if (existing) {
      return new StepResponse(existing, null)
    }
    const row = await svc.createWaOrderConfirmations(input)
    return new StepResponse(row, row.id)
  },
  async (id, { container }) => {
    if (id) await wa(container).deleteWaOrderConfirmations([id])
  }
)

export const saveOrderWhatsappWorkflow = createWorkflow(
  "save-order-whatsapp",
  (input: { order_id: string; phone: string; status: "sent" | "failed"; error?: string | null }) =>
    new WorkflowResponse(saveOrderMessageStep(input))
)

export async function sendOrderMessage(container: MedusaContainer, orderId: string) {
  const settings = await whatsappSettings(container)
  if (!settings.active || !settings.order) return false
  const [already] = await wa(container).listWaOrderConfirmations({ order_id: orderId }, { take: 1 })
  if (already) return false
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "total",
      "shipping_total",
      "items.title",
      "items.quantity",
      "items.total",
      "shipping_address.phone",
      "shipping_address.address_1",
      "shipping_address.city",
      "customer.phone",
      "payment_collections.payments.provider_id",
    ],
    filters: { id: orderId },
  })
  const o = data[0] as unknown as {
    display_id: number
    total: number
    shipping_total: number
    items?: { title: string; quantity: number; total: number }[]
    shipping_address?: { phone?: string | null; address_1?: string | null; city?: string | null } | null
    customer?: { phone?: string | null } | null
    payment_collections?: { payments?: { provider_id: string }[] }[]
  }
  if (!o) return false
  const phone = normalizePhone(o.shipping_address?.phone) ?? normalizePhone(o.customer?.phone)
  if (!phone) return false
  const provider = o.payment_collections?.flatMap((pc) => pc.payments ?? [])[0]?.provider_id ?? null
  const text = orderText({
    display_id: o.display_id,
    items: (o.items ?? []).map((i) => ({ title: i.title, quantity: Number(i.quantity), total: Number(i.total) })),
    shipping_total: Number(o.shipping_total),
    total: Number(o.total),
    address: [o.shipping_address?.address_1, o.shipping_address?.city].filter(Boolean).join("، ") || null,
    payment: paymentMethodName(provider),
  })
  try {
    await sendText(settings.cfg, phone, text)
    await saveOrderWhatsappWorkflow(container).run({ input: { order_id: orderId, phone, status: "sent" } })
    return true
  } catch (error) {
    await saveOrderWhatsappWorkflow(container).run({
      input: { order_id: orderId, phone, status: "failed", error: (error as Error).message.slice(0, 500) },
    })
    throw error
  }
}

const recordReplyStep = createStep(
  "record-reply",
  async (input: { phone: string; text: string }, { container }) => {
    const reply = parseReply(input.text)
    if (!reply) return new StepResponse(null, null)
    const svc = wa(container)
    // The latest order still waiting for this number's answer.
    const [pending] = await svc.listWaOrderConfirmations(
      { phone: input.phone, status: "sent", created_at: { $gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) } },
      { take: 1, order: { created_at: "DESC" } }
    )
    if (!pending) return new StepResponse(null, null)
    const updated = await svc.updateWaOrderConfirmations({
      id: pending.id,
      status: reply === "confirm" ? "confirmed" : "cancel_requested",
      responded_at: new Date(),
    })
    return new StepResponse({ order_id: updated.order_id, status: updated.status, phone: input.phone }, pending.id)
  },
  async (id, { container }) => {
    if (id) await wa(container).updateWaOrderConfirmations({ id, status: "sent", responded_at: null })
  }
)

export const recordWhatsappReplyWorkflow = createWorkflow(
  "record-whatsapp-reply",
  (input: { phone: string; text: string }) => new WorkflowResponse(recordReplyStep(input))
)

export async function acknowledgeReply(
  container: MedusaContainer,
  result: { order_id: string; status: string; phone: string }
) {
  const settings = await whatsappSettings(container)
  if (!settings.active) return
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({ entity: "order", fields: ["display_id"], filters: { id: result.order_id } })
  const id = (data[0] as unknown as { display_id?: number } | undefined)?.display_id ?? ""
  await sendText(settings.cfg, result.phone, result.status === "confirmed" ? confirmedText(id) : cancelRequestedText(id))
}

// --- guest phone codes -----------------------------------------------------

const OTP_TTL_MS = 10 * 60 * 1000
const MAX_SENDS_PER_CART = 3 // per 10 minutes
const MAX_SENDS_PER_PHONE = 5 // per hour
const MAX_ATTEMPTS = 5

type CartForOtp = { id: string; phone: string | null; guest: boolean }

export async function cartForOtp(container: MedusaContainer, cartId: string): Promise<CartForOtp | null> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "cart",
    fields: ["id", "shipping_address.phone", "customer.has_account"],
    filters: { id: cartId },
  })
  const cart = data[0] as { id: string; shipping_address?: { phone?: string | null } | null; customer?: { has_account?: boolean } | null } | undefined
  if (!cart) return null
  return { id: cart.id, phone: normalizePhone(cart.shipping_address?.phone), guest: !cart.customer?.has_account }
}

/** Whether this cart still needs a verified phone before paying. */
export async function otpStatus(container: MedusaContainer, cartId: string) {
  const settings = await whatsappSettings(container)
  const cart = await cartForOtp(container, cartId)
  if (!cart || !settings.active || !settings.guestOtp || !cart.guest) {
    return { required: false, verified: true, phone: null as string | null }
  }
  const verified = cart.phone
    ? (await wa(container).listWaOtps({ cart_id: cartId, phone: cart.phone, verified_at: { $ne: null } }, { take: 1 })).length > 0
    : false
  return { required: true, verified, phone: cart.phone ? maskPhone(cart.phone) : null }
}

const createOtpStep = createStep(
  "create-otp",
  async (input: { cart_id: string; phone: string; code: string }, { container }) => {
    const svc = wa(container)
    const since = (ms: number) => ({ $gte: new Date(Date.now() - ms) })
    const [, byCart] = await svc.listAndCountWaOtps({ cart_id: input.cart_id, created_at: since(OTP_TTL_MS) }, { take: 1 })
    const [, byPhone] = await svc.listAndCountWaOtps({ phone: input.phone, created_at: since(3600 * 1000) }, { take: 1 })
    if (byCart >= MAX_SENDS_PER_CART || byPhone >= MAX_SENDS_PER_PHONE) {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Too many codes requested. Try again in a few minutes.")
    }
    const row = await svc.createWaOtps({
      cart_id: input.cart_id,
      phone: input.phone,
      code_hash: hashOtp(input.code, input.cart_id, settingsKey()),
      expires_at: new Date(Date.now() + OTP_TTL_MS),
    })
    return new StepResponse(row.id, row.id)
  },
  async (id, { container }) => {
    if (id) await wa(container).deleteWaOtps([id])
  }
)

export const createGuestOtpWorkflow = createWorkflow(
  "create-guest-otp",
  (input: { cart_id: string; phone: string; code: string }) => new WorkflowResponse(createOtpStep(input))
)

/** Sends a code to the cart's shipping phone (never to a number the client picks). */
export async function sendGuestOtp(container: MedusaContainer, cartId: string) {
  const settings = await whatsappSettings(container)
  const cart = await cartForOtp(container, cartId)
  if (!settings.active || !settings.guestOtp) {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "WhatsApp verification is off")
  }
  if (!cart?.phone) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Add a valid phone number to the shipping address first")
  }
  const code = newOtpCode()
  await createGuestOtpWorkflow(container).run({ input: { cart_id: cartId, phone: cart.phone, code } })
  await sendText(settings.cfg, cart.phone, otpText(code))
  return { phone: maskPhone(cart.phone) }
}

const verifyOtpStep = createStep(
  "verify-otp",
  async (input: { cart_id: string; code: string }, { container }) => {
    const svc = wa(container)
    const cart = await cartForOtp(container, input.cart_id)
    const [otp] = cart?.phone
      ? await svc.listWaOtps(
          { cart_id: input.cart_id, phone: cart.phone, verified_at: null, expires_at: { $gt: new Date() } },
          { take: 1, order: { created_at: "DESC" } }
        )
      : []
    if (!otp || otp.attempts >= MAX_ATTEMPTS) {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "The code expired. Request a new one.")
    }
    if (!otpMatches(input.code, input.cart_id, settingsKey(), otp.code_hash)) {
      await svc.updateWaOtps({ id: otp.id, attempts: otp.attempts + 1 })
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Wrong code")
    }
    await svc.updateWaOtps({ id: otp.id, verified_at: new Date() })
    return new StepResponse(true, otp.id)
  },
  async (id, { container }) => {
    if (id) await wa(container).updateWaOtps({ id, verified_at: null })
  }
)

export const verifyGuestOtpWorkflow = createWorkflow(
  "verify-guest-otp",
  (input: { cart_id: string; code: string }) => new WorkflowResponse(verifyOtpStep(input))
)
