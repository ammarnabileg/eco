# WhatsApp (Evolution API)

Customer messages through an Evolution API v2 instance (default server `https://webs.onz.one`).

## Setup
1. Admin → التكاملات → واتساب: fill the instance name and API key, switch it on, save.
2. Click **ضبط الـ Webhook تلقائياً**. This points the instance's `MESSAGES_UPSERT` webhook at
   `{BACKEND_URL}/hooks/whatsapp` with a secret `x-laly-token` header derived from `SETTINGS_ENCRYPTION_KEY`.
   Rotating that key means clicking the button again.
3. Send a test message from the same card.

## What it sends
| Event | Message | Toggle |
|---|---|---|
| `customer.created` | Welcome | `welcome` |
| `order.placed` | Order summary; the customer replies 1 to confirm or 2 to ask to cancel | `order` |
| Guest checkout | 6-digit code to the cart's shipping phone, required before payment | `guest_otp` |

- Replies are matched to the latest pending order message for that phone within 7 days. The status shows on the order page in the admin.
  A cancel reply does **not** cancel the order: staff follow up.
- OTP codes expire after 10 minutes and allow 5 attempts. Each cart can request 3 codes per 10 minutes and each phone 5 per hour.
  Only a keyed hash is stored. The server blocks payment sessions and order completion for unverified guests.
- Kuwaiti 8-digit numbers get the 965 prefix automatically.
- A gateway outage never blocks a sale.

## Interactive messages (toggle `interactive`, off by default)
Evolution sends buttons and cards through an unofficial WhatsApp Web session. They don't show on every client,
so test them first with the three test buttons in the admin, on Android and iPhone. Every interactive send falls back
to plain text if the gateway refuses it, and that text still works on its own (it includes "reply 1/2" and the links).

| Where | Interactive form |
|---|---|
| Order message | Reply buttons ✅ confirm / ❌ cancel (ids `laly_confirm` / `laly_cancel`) |
| Confirmed reply | URL button to the order page |
| Welcome | URL buttons: shop, my account |
| Guest code | Copy-code button |
| Product page (admin widget "إرسال على واتساب") | Card with image, price and a buy button (`POST /admin/whatsapp/products`, up to 10 products) |
| Abandoned cart | Cards of the cart items, with a link that reopens the cart (`/kw/cart/recover/{cart_id}`) |

Taps arrive in the webhook as `buttonsResponseMessage`, `templateButtonReplyMessage` or
`interactiveResponseMessage.nativeFlowResponseMessage` (old and new clients). The store reads all of them.

## Abandoned-cart reminder (toggle `cart_reminder`, off by default)
Every 30 minutes the `whatsapp-cart-reminders` job looks for carts idle for 2 to 24 hours. A cart qualifies if it has
items, has a shipping phone and has no order. Each cart gets one reminder at most, and each phone at most one a week.
A failed send is recorded and not retried, so a customer is never messaged twice.
PIX buttons are Brazil-only and are not used. Failures are logged and shown on the order.

## Inbox (admin → واتساب)
Every message sent or received is stored per customer phone (`wa_conversation`, `wa_message`), including automatic ones
(order, code, welcome, reminders), staff replies and failed sends with their error. Staff read and answer conversations
from the admin page; replies go out from the store number. The page refreshes every few seconds. Media from customers
shows as a label (📷 صورة، 🎤 رسالة صوتية …), and the media file itself is not stored. A conversation shows the
customer's last 5 orders, matched on the last 8 digits of the shipping phone. The gateway may deliver a message twice;
duplicates are ignored by message id.

Bulk campaigns are deliberately not built on Evolution: spreading marketing across several numbers does not prevent
bans, and a ban takes the order and code messages down with it.
