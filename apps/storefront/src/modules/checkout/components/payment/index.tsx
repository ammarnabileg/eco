"use client"
import { RadioGroup } from "@headlessui/react"
import {
  DEEMA_MIN_TOTAL,
  isRedirectGateway,
  isStripeLike,
  paymentInfoMap,
} from "@lib/constants"
import { intlLocale } from "@i18n/config"
import { useLocale, useT } from "@i18n/client"
import { initiatePaymentSession, startGatewayCheckout } from "@lib/data/cart"
import { gatewaySessionData } from "@lib/util/gateway-session"
import { convertToLocale } from "@lib/util/money"
import { CheckCircleSolid, CreditCard } from "@medusajs/icons"
import ErrorMessage from "@modules/checkout/components/error-message"
import WhatsappOtp from "@modules/checkout/components/whatsapp-otp"
import type { OtpStatus } from "@lib/data/whatsapp"
import PaymentContainer, {
  StripePaymentContainer,
} from "@modules/checkout/components/payment-container"
import Divider from "@modules/common/components/divider"
import {
  Button,
  Container,
  Heading,
  Text,
  clx,
} from "@modules/common/components/ui"
import { HttpTypes } from "@medusajs/types"
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation"
import { useCallback, useEffect, useState } from "react"

const Payment = ({
  cart,
  availablePaymentMethods,
  bnplHidden = false,
  otp,
}: {
  cart: HttpTypes.StoreCart
  availablePaymentMethods: { id: string }[]
  /** An instalment gateway was hidden because a product is not eligible. */
  bnplHidden?: boolean
  /** Guest phone check on WhatsApp. */
  otp?: OtpStatus
}) => {
  const activeSession = cart.payment_collection?.payment_sessions?.find(
    (paymentSession) => paymentSession.status === "pending"
  )

  const t = useT()
  const locale = useLocale()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentComplete, setPaymentComplete] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(
    activeSession?.provider_id ?? ""
  )

  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const { countryCode } = useParams() as { countryCode: string }

  const isOpen = searchParams.get("step") === "payment"
  const [phoneVerified, setPhoneVerified] = useState(!!otp?.verified)
  // Set by /api/payment-redirect when a gateway payment did not complete.
  const gatewayFailed = searchParams.get("error") === "payment_failed"

  // Deema does not take orders below its minimum.
  const methods = availablePaymentMethods?.filter(
    (m) =>
      !(m.id.startsWith("pp_deema_") && (cart.total ?? 0) < DEEMA_MIN_TOTAL)
  )

  const bnplNote = (providerId: string) => {
    if (providerId.startsWith("pp_taly_")) {
      const quarter = Math.round(((cart.total ?? 0) / 4) * 1000) / 1000
      return t("checkout.taly_note", {
        amount: convertToLocale({
          amount: quarter,
          currency_code: cart.currency_code,
          locale: intlLocale(locale),
        }),
      })
    }
    if (providerId.startsWith("pp_deema_")) {
      return t("checkout.deema_note")
    }
    return null
  }

  const setPaymentMethod = async (method: string) => {
    setError(null)
    setSelectedPaymentMethod(method)
    if (isStripeLike(method)) {
      await initiatePaymentSession(cart, {
        provider_id: method,
      })
    }
  }

  const paidByGiftcard = !!(
    (cart as unknown as Record<string, unknown>)?.gift_cards && ((cart as unknown as Record<string, unknown>)?.gift_cards as unknown[])?.length > 0 && cart?.total === 0
  )

  const paymentReady =
    (activeSession && (cart?.shipping_methods?.length ?? 0) !== 0) || paidByGiftcard

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams)
      params.set(name, value)

      return params.toString()
    },
    [searchParams]
  )

  const handleEdit = () => {
    router.push(pathname + "?" + createQueryString("step", "payment"), {
      scroll: false,
    })
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    try {
      const shouldInputPaymentDetails =
        isStripeLike(selectedPaymentMethod) && !activeSession

      const checkActiveSession =
        activeSession?.provider_id === selectedPaymentMethod

      if (isRedirectGateway(selectedPaymentMethod)) {
        // Checks the gateway accepts this order before the review step.
        const { error: gatewayError } = await startGatewayCheckout(
          cart,
          selectedPaymentMethod,
          gatewaySessionData(cart, countryCode, window.location.origin)
        )
        if (gatewayError) {
          setError(gatewayError)
          return
        }
      } else if (!checkActiveSession) {
        await initiatePaymentSession(cart, {
          provider_id: selectedPaymentMethod,
        })
      }

      if (!shouldInputPaymentDetails) {
        return router.push(
          pathname + "?" + createQueryString("step", "review"),
          {
            scroll: false,
          }
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    setError(null)
  }, [isOpen])

  return (
    <div className="bg-white">
      <div className="flex flex-row items-center justify-between mb-6">
        <Heading
          level="h2"
          className={clx(
            "flex flex-row text-3xl-regular gap-x-2 items-baseline",
            {
              "opacity-50 pointer-events-none select-none":
                !isOpen && !paymentReady,
            }
          )}
        >
          {t("checkout.payment")}
          {!isOpen && paymentReady && <CheckCircleSolid />}
        </Heading>
        {!isOpen && paymentReady && (
          <Text>
            <button
              onClick={handleEdit}
              className="text-laly-teal hover:text-laly-teal-d"
              data-testid="edit-payment-button"
            >
              {t("checkout.edit")}
            </button>
          </Text>
        )}
      </div>
      <div>
        <div className={isOpen ? "block" : "hidden"}>
          {gatewayFailed && (
            <div
              className="mb-4 rounded-xl border border-laly-red/30 bg-laly-red/5 p-4 text-sm text-laly-ink"
              role="alert"
              data-testid="payment-failed-message"
            >
              {t("checkout.payment_failed")}
            </div>
          )}
          {otp?.required && !phoneVerified && (
            <WhatsappOtp cartId={cart.id} phone={otp.phone} onVerified={() => setPhoneVerified(true)} />
          )}
          {!paidByGiftcard && methods?.length && (
            <>
              <RadioGroup
                value={selectedPaymentMethod}
                onChange={(value: string) => setPaymentMethod(value)}
              >
                {methods.map((paymentMethod) => (
                  <div key={paymentMethod.id}>
                    {isStripeLike(paymentMethod.id) ? (
                      <StripePaymentContainer
                        paymentProviderId={paymentMethod.id}
                        selectedPaymentOptionId={selectedPaymentMethod}
                        paymentInfoMap={paymentInfoMap}
                        setError={setError}
                        setPaymentComplete={setPaymentComplete}
                      />
                    ) : (
                      <PaymentContainer
                        paymentInfoMap={paymentInfoMap}
                        paymentProviderId={paymentMethod.id}
                        selectedPaymentOptionId={selectedPaymentMethod}
                      >
                        {bnplNote(paymentMethod.id) && (
                          <Text className="ps-9 text-xs text-laly-mut">
                            {bnplNote(paymentMethod.id)}
                          </Text>
                        )}
                      </PaymentContainer>
                    )}
                  </div>
                ))}
              </RadioGroup>
              {bnplHidden && (
                <p className="mt-2 text-xs text-laly-mut" data-testid="bnpl-hidden">
                  {t("checkout.bnpl_unavailable")}
                </p>
              )}
            </>
          )}

          {paidByGiftcard && (
            <div className="flex flex-col w-1/3">
              <Text className="txt-medium-plus text-ui-fg-base mb-1">
                {t("checkout.payment_method")}
              </Text>
              <Text
                className="txt-medium text-ui-fg-subtle"
                data-testid="payment-method-summary"
              >
                {t("checkout.gift_card")}
              </Text>
            </div>
          )}

          <ErrorMessage
            error={error}
            data-testid="payment-method-error-message"
          />

          <Button
            size="large"
            className="mt-6"
            onClick={handleSubmit}
            isLoading={isLoading}
            disabled={
              (!!otp?.required && !phoneVerified) ||
              (isStripeLike(selectedPaymentMethod) && !paymentComplete) ||
              (!selectedPaymentMethod && !paidByGiftcard)
            }
            data-testid="submit-payment-button"
          >
            {!activeSession && isStripeLike(selectedPaymentMethod)
              ? t("checkout.enter_payment_details")
              : t("checkout.continue_to_review")}
          </Button>
        </div>

        <div className={isOpen ? "hidden" : "block"}>
          {cart && paymentReady && activeSession ? (
            <div className="flex items-start gap-x-1 w-full">
              <div className="flex flex-col w-1/3">
                <Text className="txt-medium-plus text-ui-fg-base mb-1">
                  {t("checkout.payment_method")}
                </Text>
                <Text
                  className="txt-medium text-ui-fg-subtle"
                  data-testid="payment-method-summary"
                >
                  {paymentInfoMap[activeSession?.provider_id]
                    ? t(paymentInfoMap[activeSession.provider_id].titleKey)
                    : activeSession?.provider_id}
                </Text>
              </div>
              <div className="flex flex-col w-1/3">
                <Text className="txt-medium-plus text-ui-fg-base mb-1">
                  {t("checkout.payment_details")}
                </Text>
                <div
                  className="flex gap-2 txt-medium text-ui-fg-subtle items-center"
                  data-testid="payment-details-summary"
                >
                  <Container className="flex items-center h-7 w-fit p-2 bg-ui-button-neutral-hover">
                    {paymentInfoMap[selectedPaymentMethod]?.icon || (
                      <CreditCard />
                    )}
                  </Container>
                  <Text>
                    {isRedirectGateway(activeSession?.provider_id)
                      ? t("checkout.redirect_on_confirm")
                      : t("checkout.extra_step")}
                  </Text>
                </div>
              </div>
            </div>
          ) : paidByGiftcard ? (
            <div className="flex flex-col w-1/3">
              <Text className="txt-medium-plus text-ui-fg-base mb-1">
                {t("checkout.payment_method")}
              </Text>
              <Text
                className="txt-medium text-ui-fg-subtle"
                data-testid="payment-method-summary"
              >
                {t("checkout.gift_card")}
              </Text>
            </div>
          ) : null}
        </div>
      </div>
      <Divider className="mt-8" />
    </div>
  )
}

export default Payment
