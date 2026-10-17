import { getPublicIntegrations } from "@lib/data/integrations"

// AdSense requires /ads.txt naming the publisher; served only when AdSense
// is switched on in the admin.
export async function GET() {
  const client = (await getPublicIntegrations()).adsense?.client
  const pub = client?.match(/^ca-(pub-\d{10,20})$/)?.[1]
  if (!pub) {
    return new Response("Not found", { status: 404 })
  }
  return new Response(`google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=300" },
  })
}
