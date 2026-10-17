import Script from "next/script"

import type { PublicIntegrations } from "@lib/data/integrations"

// IDs come from the admin, so they are validated before they reach a script.
const CLARITY_ID = /^[a-z0-9]{6,20}$/i
const ADSENSE_CLIENT = /^ca-pub-\d{10,20}$/

/** Analytics and ads scripts for the integrations switched on in the admin. */
export default function IntegrationScripts({ integrations }: { integrations: PublicIntegrations }) {
  const clarity = integrations.clarity?.project_id
  const adsense = integrations.adsense?.client
  return (
    <>
      {clarity && CLARITY_ID.test(clarity) && (
        <Script id="ms-clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${clarity}");`}
        </Script>
      )}
      {adsense && ADSENSE_CLIENT.test(adsense) && (
        <Script
          id="google-adsense"
          async
          strategy="afterInteractive"
          crossOrigin="anonymous"
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsense}`}
        />
      )}
    </>
  )
}
