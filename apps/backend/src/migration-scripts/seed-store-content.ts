import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { createHeroSlideWorkflow } from "../workflows/store-content/hero-slides"
import { createTrustBadgeWorkflow } from "../workflows/store-content/trust-badges"
import { updateSiteSettingsWorkflow } from "../workflows/store-content/update-site-settings"

// Starting content from the approved design. Everything here is editable from
// the admin (Store content); review the commitments before launch.
export default async function seed_store_content({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  await updateSiteSettingsWorkflow(container).run({
    input: {
      address_ar: "حولي، شارع تونس — الكويت",
      address_en: "Hawally, Tunis St — Kuwait",
      hours_ar: "يومياً 9 ص - 10 م",
      hours_en: "Daily 9 AM - 10 PM",
    },
  })

  const badges = [
    { icon: "shield", title_ar: "ضمان سنتين", title_en: "2-Year Warranty", subtitle_ar: "على جميع المنتجات", subtitle_en: "On every product" },
    { icon: "ret", title_ar: "إرجاع 30 يوم", title_en: "30-Day Return", subtitle_ar: "استبدال بدون تعقيد", subtitle_en: "Hassle-free exchange" },
    { icon: "truck", title_ar: "توصيل سريع", title_en: "Fast Delivery", subtitle_ar: "لكل محافظات الكويت", subtitle_en: "All Kuwait governorates" },
    { icon: "wallet", title_ar: "دفع آمن", title_en: "Secure Payment", subtitle_ar: "كي نت وبطاقات ائتمان", subtitle_en: "KNET & credit cards" },
    { icon: "headset", title_ar: "دعم فني", title_en: "Expert Support", subtitle_ar: "فنيون جاهزون لخدمتك", subtitle_en: "Technicians on call" },
  ]
  for (const [rank, badge] of badges.entries()) {
    await createTrustBadgeWorkflow(container).run({ input: { ...badge, rank } })
  }

  const slides = [
    {
      title_ar: "أمان ذكي",
      title_en: "Smart security",
      highlight_ar: "لكل بيت في الكويت",
      highlight_en: "for every home in Kuwait",
      subtitle_ar: "كاميرات مراقبة وأنظمة حماية متكاملة — بيع وتركيب وصيانة، من الجهراء إلى الأحمدي.",
      subtitle_en: "CCTV and complete protection systems — sales, installation and maintenance, from Jahra to Ahmadi.",
      cta_url: "/categories/cctv",
    },
    {
      title_ar: "إنترنت أقوى",
      title_en: "Stronger Wi-Fi,",
      highlight_ar: "بدون نقاط ميتة",
      highlight_en: "zero dead zones",
      subtitle_ar: "راوترات وأنظمة Mesh تغطي كل زاوية في البيت والديوانية — سرعة ثابتة على كل الأجهزة.",
      subtitle_en: "Routers and mesh systems covering every corner of the house and diwaniya — stable speed on every device.",
      cta_url: "/categories/networking",
    },
    {
      title_ar: "بيتك الذكي",
      title_en: "Your smart home,",
      highlight_ar: "بضغطة واحدة",
      highlight_en: "one tap away",
      subtitle_ar: "إضاءة ومقابس وكاميرات ذكية تتحكم فيها من موبايلك — وأنت في الشاليه أو خارج الكويت.",
      subtitle_en: "Smart lighting, plugs and cameras you control from your phone — at the chalet or abroad.",
      cta_url: "/categories/smart-home",
    },
  ]
  for (const [rank, slide] of slides.entries()) {
    await createHeroSlideWorkflow(container).run({
      input: {
        ...slide,
        eyebrow_ar: "متجر كويتي متخصص بالتقنية والحماية",
        eyebrow_en: "Kuwaiti store for tech & security",
        cta_label_ar: "تسوّق الآن",
        cta_label_en: "Shop now",
        rank,
      },
    })
  }

  logger.info("Seeded store content.")
}
