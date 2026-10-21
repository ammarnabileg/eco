import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { loadImage } from "../../../../workflows/ai-product/create"

// Serves an image from this backend's own address, so the studio's canvas can
// export it as PNG (the browser blocks exporting canvases that drew images
// from other sites without CORS). Admin only; public https or our storage.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const url = String(req.query.url ?? "")
  if (!/^https?:\/\//.test(url)) throw new MedusaError(MedusaError.Types.INVALID_DATA, "url is required")
  const image = await loadImage(url)
  res.setHeader("Content-Type", image.type)
  res.setHeader("Cache-Control", "private, max-age=3600")
  res.send(image.bytes)
}
