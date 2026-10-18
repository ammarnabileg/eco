import { incomingMessage } from "../client"
import { hashOtp, maskPhone, normalizePhone, orderText, otpMatches, parseReply } from "../messages"

describe("WhatsApp messages", () => {
  it("normalises Kuwaiti and international numbers", () => {
    expect(normalizePhone("5000 0000")).toBe("96550000000")
    expect(normalizePhone("+965 5000-0000")).toBe("96550000000")
    expect(normalizePhone("0096550000000")).toBe("96550000000")
    expect(normalizePhone("٥٠٠٠٠٠٠٠")).toBe("96550000000")
    expect(normalizePhone("123")).toBeNull()
    expect(maskPhone("96550001234")).toBe("+965 •••• 1234")
  })

  it("reads confirm and cancel replies, Arabic or Latin digits", () => {
    for (const t of ["1", "١", "نعم", " تأكيد ", "OK"]) expect(parseReply(t)).toBe("confirm")
    for (const t of ["2", "٢", "إلغاء", "الغاء"]) expect(parseReply(t)).toBe("cancel")
    expect(parseReply("متى يوصل الطلب؟")).toBeNull()
  })

  it("keeps only a keyed hash of the code, tied to the cart", () => {
    const hash = hashOtp("123456", "cart_1", "key")
    expect(hash).not.toContain("123456")
    expect(otpMatches("123456", "cart_1", "key", hash)).toBe(true)
    expect(otpMatches("123456", "cart_2", "key", hash)).toBe(false)
    expect(otpMatches("654321", "cart_1", "key", hash)).toBe(false)
  })

  it("writes the order summary with lines, total and the reply instructions", () => {
    const text = orderText({
      display_id: 1001,
      items: [{ title: "Tapo C200", quantity: 2, total: 25 }],
      shipping_total: 1.5,
      total: 26.5,
      address: "Salmiya",
      payment: "KNET",
    })
    expect(text).toContain("#1001")
    expect(text).toContain("Tapo C200 × 2 — 25.000 د.ك")
    expect(text).toContain("*26.500 د.ك*")
    expect(text).toContain("رد بـ *1*")
  })

  it("takes the sender of incoming messages, ignoring our own and groups", () => {
    const msg = (key: Record<string, unknown>, text = "1") => ({
      event: "messages.upsert",
      data: { key, message: { conversation: text } },
    })
    expect(incomingMessage(msg({ remoteJid: "96550000000@s.whatsapp.net" }))).toMatchObject({ phone: "96550000000", text: "1" })
    expect(incomingMessage(msg({ remoteJid: "abc@lid", remoteJidAlt: "96550000000@s.whatsapp.net" }))?.phone).toBe("96550000000")
    expect(incomingMessage(msg({ remoteJid: "96550000000@s.whatsapp.net", fromMe: true }))).toBeNull()
    expect(incomingMessage(msg({ remoteJid: "120363-123@g.us" }))).toBeNull()
    expect(incomingMessage({ event: "connection.update" })).toBeNull()
  })

  it("reads button taps from old and new WhatsApp clients as the button id", () => {
    const tap = (message: Record<string, unknown>) =>
      incomingMessage({ event: "messages.upsert", data: { key: { remoteJid: "96550000000@s.whatsapp.net" }, message } })?.text
    expect(tap({ buttonsResponseMessage: { selectedButtonId: "laly_confirm" } })).toBe("laly_confirm")
    expect(tap({ templateButtonReplyMessage: { selectedId: "laly_cancel" } })).toBe("laly_cancel")
    expect(tap({ interactiveResponseMessage: { nativeFlowResponseMessage: { paramsJson: '{"id":"laly_confirm"}' } } })).toBe("laly_confirm")
    expect(tap({ interactiveResponseMessage: { nativeFlowResponseMessage: { paramsJson: "not json" } } })).toBeUndefined()
    expect(parseReply("laly_confirm")).toBe("confirm")
    expect(parseReply("laly_cancel")).toBe("cancel")
  })
})
