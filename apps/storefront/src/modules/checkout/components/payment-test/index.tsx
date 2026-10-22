import { useT } from "@i18n/client"
import { Badge } from "@modules/common/components/ui"

const PaymentTest = ({ className }: { className?: string }) => {
  const t = useT()
  return (
    <Badge color="orange" className={className}>
      <span className="font-semibold">{t("checkout.test_notice_label")}</span>{" "}
      {t("checkout.test_notice")}
    </Badge>
  )
}

export default PaymentTest
