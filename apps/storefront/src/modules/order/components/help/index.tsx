import { Heading } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { getT } from "@i18n/server"

const Help = async () => {
  const t = await getT()
  return (
    <div className="mt-6">
      <Heading className="text-base-semi text-laly-ink">{t("order.need_help")}</Heading>
      <div className="text-base-regular text-laly-teal my-2">
        <ul className="gap-y-2 flex flex-col">
          <li>
            <LocalizedClientLink href="/contact" className="hover:text-laly-teal-d">
              {t("order.contact_us")}
            </LocalizedClientLink>
          </li>
          <li>
            <LocalizedClientLink href="/contact" className="hover:text-laly-teal-d">
              {t("order.returns_exchanges")}
            </LocalizedClientLink>
          </li>
        </ul>
      </div>
    </div>
  )
}

export default Help
