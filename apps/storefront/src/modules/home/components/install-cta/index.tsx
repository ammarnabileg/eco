import { getT } from "@i18n/server"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Icon from "@modules/laly/components/icon"

// Leads to the installation page and its booking form.
export default async function InstallCta(_: { whatsapp?: string | null }) {
  const t = await getT()

  return (
    <section className="content-container mt-10 small:mt-14">
      <div className="flex flex-col small:flex-row small:items-center gap-4 rounded-card bg-laly-deep text-white p-5 small:p-8">
        <span className="hidden small:flex w-14 h-14 rounded-2xl bg-white/10 text-laly-sand items-center justify-center shrink-0">
          <Icon name="wrench" size={26} />
        </span>
        <div className="flex-1">
          <h2 className="text-lg small:text-2xl font-extrabold">
            {t("home.install_title")}
          </h2>
          <p className="mt-1 text-[13px] small:text-sm text-[#B9D3D8]">
            {t("home.install_subtitle")}
          </p>
        </div>
        <LocalizedClientLink
          href="/installation"
          className="self-start small:self-auto inline-flex items-center rounded-btn bg-laly-sand hover:bg-laly-sand-d text-[#26200D] font-bold text-sm px-5 py-3 transition-colors"
        >
          {t("home.install_cta")}
        </LocalizedClientLink>
      </div>
    </section>
  )
}
