import { Badge } from "@modules/common/components/ui"

const PaymentTest = ({ className }: { className?: string }) => {
  return (
    <Badge color="orange" className={className}>
      <span className="font-semibold">تنبيه:</span> لأغراض الاختبار فقط.
    </Badge>
  )
}

export default PaymentTest
