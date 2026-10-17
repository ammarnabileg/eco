import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto"

import { MedusaError } from "@medusajs/framework/utils"

// OAuth tokens give full access to the company's books, so they are never
// stored in clear text. The key comes from QUICKBOOKS_ENCRYPTION_KEY.

const keyFrom = (secret: string) => createHash("sha256").update(secret).digest()

export function encrypt(plain: string, secret: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", keyFrom(secret), iv)
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), data.toString("base64")].join(".")
}

export function decrypt(sealed: string, secret: string): string {
  const [version, iv, tag, data] = sealed.split(".")
  if (version !== "v1" || !iv || !tag || !data) {
    throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, "Unreadable QuickBooks token")
  }
  const decipher = createDecipheriv("aes-256-gcm", keyFrom(secret), Buffer.from(iv, "base64"))
  decipher.setAuthTag(Buffer.from(tag, "base64"))
  return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8")
}
