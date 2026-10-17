import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

type LinkSide = { module: string; key: string }

export type LinkSpec = {
  from: LinkSide & { id: string }
  to: LinkSide
  /** Field on the "from" entity that lists the linked records, e.g. "brand". */
  entity: string
  field: string
  /** The link was defined with `to` as its first module. */
  reversed?: boolean
}

// Ids currently linked to `from.id`.
export async function linkedIds(container: MedusaContainer, spec: LinkSpec): Promise<string[]> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: spec.entity,
    fields: [`${spec.field}.id`],
    filters: { id: spec.from.id },
  })
  const linked = (data[0] as Record<string, unknown> | undefined)?.[spec.field]
  const list = Array.isArray(linked) ? linked : linked ? [linked] : []
  return list
    .map((row) => (row as { id?: string } | null)?.id)
    .filter((id): id is string => Boolean(id))
}

/**
 * Makes `from` linked to exactly `toIds`, returning the previous ids so a step
 * can restore them on compensation.
 */
export async function replaceLinks(
  container: MedusaContainer,
  spec: LinkSpec,
  toIds: string[]
): Promise<string[]> {
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const previous = await linkedIds(container, spec)
  const wanted = new Set(toIds)
  // Link calls must name the modules in the order the link was defined.
  const pair = (toId: string) => {
    const from = [spec.from.module, { [spec.from.key]: spec.from.id }] as const
    const to = [spec.to.module, { [spec.to.key]: toId }] as const
    return Object.fromEntries(spec.reversed ? [to, from] : [from, to])
  }
  const removed = previous.filter((id) => !wanted.has(id))
  const added = toIds.filter((id) => !previous.includes(id))
  if (removed.length) {
    await link.dismiss(removed.map(pair))
  }
  if (added.length) {
    await link.create(added.map(pair))
  }
  return previous
}
