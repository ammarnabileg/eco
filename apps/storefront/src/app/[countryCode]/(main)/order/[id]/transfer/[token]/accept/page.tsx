import { acceptTransferRequest } from "@lib/data/orders"
import { getT } from "@i18n/server"
import { richText } from "@lib/util/rich-text"
import { Heading, Text } from "@modules/common/components/ui"
import TransferImage from "@modules/order/components/transfer-image"

export default async function TransferPage({
  params,
}: {
  params: { id: string; token: string }
}) {
  const { id, token } = params

  const { success, error } = await acceptTransferRequest(id, token)
  const t = await getT()

  return (
    <div className="flex flex-col gap-y-4 items-start w-full max-w-xl px-4 mx-auto mt-10 mb-20">
      <TransferImage />
      <div className="flex flex-col gap-y-6">
        {success && (
          <>
            <Heading level="h1" className="text-xl text-zinc-900">
              {t("order.transfer_accepted_title")}
            </Heading>
            <Text className="text-zinc-600">
              {richText(t("order.transfer_accepted_body"), {
                id: <span dir="ltr">{id}</span>,
              })}
            </Text>
          </>
        )}
        {!success && (
          <>
            <Text className="text-zinc-600">
              {t("order.transfer_accept_failed")}
            </Text>
            {error && (
              <Text className="text-red-500">
                {t("order.error_message", { error })}
              </Text>
            )}
          </>
        )}
      </div>
    </div>
  )
}
