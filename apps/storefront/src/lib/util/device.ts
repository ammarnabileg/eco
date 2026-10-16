import { headers } from "next/headers"
import { userAgent } from "next/server"

export type Device = "mobile" | "desktop"

// Server-side device detection from the User-Agent. Pages render a layout
// built for the device; both layouts stay responsive, so a wrong guess (or a
// resized window) still renders correctly. Tablets get the desktop layout.
export async function getDevice(): Promise<Device> {
  const ua = userAgent({ headers: await headers() })
  return ua.device.type === "mobile" ? "mobile" : "desktop"
}
