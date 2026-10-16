import { acceptTransferRequest } from "@lib/data/orders"
import { Heading, Text } from "@modules/common/components/ui"
import TransferImage from "@modules/order/components/transfer-image"

export default async function TransferPage({
  params,
}: {
  params: { id: string; token: string }
}) {
  const { id, token } = params

  const { success, error } = await acceptTransferRequest(id, token)

  return (
    <div className="flex flex-col gap-y-4 items-start w-full max-w-xl px-4 mx-auto mt-10 mb-20">
      <TransferImage />
      <div className="flex flex-col gap-y-6">
        {success && (
          <>
            <Heading level="h1" className="text-xl text-zinc-900">
              تم نقل الطلب!
            </Heading>
            <Text className="text-zinc-600">
              تم نقل الطلب <span dir="ltr">{id}</span> إلى المالك الجديد بنجاح.
            </Text>
          </>
        )}
        {!success && (
          <>
            <Text className="text-zinc-600">
              حدث خطأ أثناء قبول النقل. يرجى المحاولة مرة أخرى.
            </Text>
            {error && (
              <Text className="text-red-500">رسالة الخطأ: {error}</Text>
            )}
          </>
        )}
      </div>
    </div>
  )
}
