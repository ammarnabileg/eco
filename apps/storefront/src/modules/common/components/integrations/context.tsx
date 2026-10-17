"use client"

import { createContext, useContext } from "react"

import type { PublicIntegrations } from "@lib/data/integrations"

const IntegrationsContext = createContext<PublicIntegrations>({})

export function IntegrationsProvider({
  value,
  children,
}: {
  value: PublicIntegrations
  children: React.ReactNode
}) {
  return <IntegrationsContext.Provider value={value}>{children}</IntegrationsContext.Provider>
}

export const useIntegrations = () => useContext(IntegrationsContext)
