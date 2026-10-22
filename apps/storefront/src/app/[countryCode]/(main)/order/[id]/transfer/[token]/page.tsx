import { getT } from "@i18n/server"
import { richText } from "@lib/util/rich-text"
import { Heading, Text } from "@modules/common/components/ui"
import TransferActions from "@modules/order/components/transfer-actions"
import TransferImage from "@modules/order/components/transfer-image"

export default async function TransferPage({
  params,
}: {
  params: { id: string; token: string }
}) {
  const { id, token } = params
  const t = await getT()
  const orderId = <span dir="ltr">{id}</span>

  return (
    <div className="flex flex-col gap-y-4 items-start w-full max-w-xl px-4 mx-auto mt-10 mb-20">
      <TransferImage />
      <div className="flex flex-col gap-y-6">
        <Heading level="h1" className="text-xl text-zinc-900">
          {richText(t("order.transfer_request_title"), { id: orderId })}
        </Heading>
        <Text className="text-zinc-600">
          {richText(t("order.transfer_request_body"), { id: orderId })}
        </Text>
        <div className="w-full h-px bg-zinc-200" />
        <Text className="text-zinc-600">
          {t("order.transfer_request_responsibility")}
        </Text>
        <Text className="text-zinc-600">
          {t("order.transfer_request_ignore")}
        </Text>
        <div className="w-full h-px bg-zinc-200" />
        <TransferActions id={id} token={token} />
      </div>
    </div>
  )
}
