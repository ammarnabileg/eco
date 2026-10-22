"use client"

import { useT } from "@i18n/client"
import { resetOnboardingState } from "@lib/data/onboarding"
import { Button, Container, Text } from "@modules/common/components/ui"

const OnboardingCta = ({ orderId }: { orderId: string }) => {
  const t = useT()
  return (
    <Container className="max-w-4xl h-full bg-ui-bg-subtle w-full">
      <div className="flex flex-col gap-y-4 center p-4 md:items-center">
        <Text className="text-ui-fg-base text-xl">
          {t("order.onboarding_success")}
        </Text>
        <Text className="text-ui-fg-subtle text-small-regular">
          {t("order.onboarding_body")}
        </Text>
        <Button
          className="w-fit"
          size="large"
          onClick={() => resetOnboardingState(orderId)}
        >
          {t("order.onboarding_cta")}
        </Button>
      </div>
    </Container>
  )
}

export default OnboardingCta
