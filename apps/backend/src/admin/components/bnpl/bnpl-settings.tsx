import { Badge, Button, Container, Heading, Label, Select, Text, toast } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"

import { sdk } from "../../lib/sdk"

const GATEWAYS = [
  { key: "deema", label: "Deema" },
  { key: "taly", label: "Taly" },
] as const
type Rule = "inherit" | "allow" | "deny"

const readRules = (metadata: Record<string, unknown>) => {
  const bnpl = (metadata.bnpl ?? {}) as Record<string, unknown>
  return Object.fromEntries(
    GATEWAYS.map((g) => [g.key, bnpl[g.key] === "allow" || bnpl[g.key] === "deny" ? (bnpl[g.key] as Rule) : "inherit"])
  ) as Record<string, Rule>
}

/** Instalment settings (metadata.bnpl) of a product or a category. */
export function BnplSettings({
  kind,
  id,
  metadata,
}: {
  kind: "product" | "category"
  id: string
  metadata: Record<string, unknown> | null
}) {
  const queryClient = useQueryClient()
  const current = readRules(metadata ?? {})
  const [rules, setRules] = useState(current)
  useEffect(() => setRules(readRules(metadata ?? {})), [metadata])

  const { data: effective } = useQuery({
    queryKey: ["bnpl", id],
    queryFn: () =>
      sdk.client.fetch<{ products: Record<string, Record<string, boolean>> }>(`/admin/bnpl?product_ids=${id}`),
    enabled: kind === "product",
  })

  const save = useMutation({
    mutationFn: async (): Promise<unknown> => {
      const bnpl = Object.fromEntries(Object.entries(rules).filter(([, r]) => r !== "inherit"))
      // Merge so other metadata (SEO, importer, AI content) is kept.
      const next = { ...(metadata ?? {}), bnpl }
      return kind === "product"
        ? sdk.admin.product.update(id, { metadata: next })
        : sdk.admin.productCategory.update(id, { metadata: next })
    },
    onSuccess: () => {
      toast.success("تم حفظ إعدادات التقسيط")
      queryClient.invalidateQueries()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const dirty = GATEWAYS.some((g) => rules[g.key] !== current[g.key])
  const inheritLabel = kind === "product" ? "يرث من التصنيفات" : "يرث من التصنيف الأب"

  return (
    <Container className="flex flex-col gap-4">
      <div>
        <Heading level="h2">التقسيط</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          {kind === "product"
            ? "الإعداد الصريح للمنتج يحسم القرار. «يرث» = حسب تصنيفاته؛ لو أي تصنيف ممنوع يُمنع."
            : "ينطبق على كل منتجات التصنيف وتصنيفاته الفرعية، إلا اللي عليها إعداد صريح."}{" "}
          الافتراضي: ممنوع.
        </Text>
      </div>
      {GATEWAYS.map((g) => {
        const result = effective?.products?.[id]?.[g.key]
        return (
          <div key={g.key} className="flex items-center justify-between gap-4">
            <Label size="small" className="min-w-16">
              {g.label}
            </Label>
            <div className="flex items-center gap-3">
              {kind === "product" && result !== undefined && (
                <Badge size="2xsmall" color={result ? "green" : "grey"}>
                  {result ? "مؤهل حالياً" : "غير مؤهل حالياً"}
                </Badge>
              )}
              <Select value={rules[g.key]} onValueChange={(v) => setRules((r) => ({ ...r, [g.key]: v as Rule }))}>
                <Select.Trigger className="w-48">
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="inherit">{inheritLabel}</Select.Item>
                  <Select.Item value="allow">مسموح</Select.Item>
                  <Select.Item value="deny">ممنوع</Select.Item>
                </Select.Content>
              </Select>
            </div>
          </div>
        )
      })}
      <div className="flex justify-end">
        <Button size="small" variant="secondary" disabled={!dirty} isLoading={save.isPending} onClick={() => save.mutate()}>
          حفظ
        </Button>
      </div>
    </Container>
  )
}
