import { Heading, Text } from "@modules/common/components/ui"
import TransferActions from "@modules/order/components/transfer-actions"
import TransferImage from "@modules/order/components/transfer-image"

export default async function TransferPage({
  params,
}: {
  params: { id: string; token: string }
}) {
  const { id, token } = params

  return (
    <div className="flex flex-col gap-y-4 items-start w-full max-w-xl px-4 mx-auto mt-10 mb-20">
      <TransferImage />
      <div className="flex flex-col gap-y-6">
        <Heading level="h1" className="text-xl text-zinc-900">
          طلب نقل الطلب <span dir="ltr">{id}</span>
        </Heading>
        <Text className="text-zinc-600">
          وصلك طلب لنقل ملكية طلبك (<span dir="ltr">{id}</span>). إذا كنت
          توافق على هذا الطلب، يمكنك قبول النقل بالضغط على الزر أدناه.
        </Text>
        <div className="w-full h-px bg-zinc-200" />
        <Text className="text-zinc-600">
          عند القبول، سيتولى المالك الجديد جميع المسؤوليات والصلاحيات المرتبطة
          بهذا الطلب.
        </Text>
        <Text className="text-zinc-600">
          إذا لم تتعرف على هذا الطلب أو كنت ترغب في الاحتفاظ بملكيته، فلا داعي
          لأي إجراء.
        </Text>
        <div className="w-full h-px bg-zinc-200" />
        <TransferActions id={id} token={token} />
      </div>
    </div>
  )
}
