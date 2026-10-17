import { SearchTypes } from "@medusajs/framework/types"

import { planFields, weightOf } from "./fields"
import { ARABIC_STOP_WORDS, buildSynonyms } from "./language"

export type MeilisearchProviderOptions = {
  host: string
  apiKey: string
  /** Prepended to index names, so several environments can share one server. */
  indexPrefix?: string
  /** Extra phrase/word synonyms on top of the built-in Gulf/English list. */
  synonyms?: Record<string, string[]>
  /** Replaces the built-in Arabic stop words when set. */
  stopWords?: string[]
  /**
   * Optional embedder for hybrid (keyword + semantic) search, passed to
   * Meilisearch as-is, e.g. { source: "openAi", apiKey, model } or
   * { source: "rest", ... }. Off by default: small local models measured
   * worse than keyword + synonyms on this catalogue.
   */
  embedder?: Record<string, unknown> & { source: string }
  /** 0..1 share of semantic ranking in hybrid search when an embedder is set. */
  semanticRatio?: number
  requestTimeoutMs?: number
}

// Meilisearch index settings derived from a Medusa index definition.
export function buildIndexSettings(
  index: SearchTypes.ResolvedSearchIndexDefinition,
  options: MeilisearchProviderOptions
) {
  const fields = planFields(index.fields)
  const searchable = fields
    .filter((f) => weightOf(f.def) > 0)
    .sort((a, b) => weightOf(b.def) - weightOf(a.def))
    .map((f) => f.path)
  const filterable = new Set([
    index.primary_key,
    ...fields.filter((f) => f.def.filterable || f.def.facetable).map((f) => f.path),
  ])
  const sortable = fields.filter((f) => f.def.sortable).map((f) => f.path)
  const typo = index.settings?.typo_tolerance

  const embedder = options.embedder
    ? {
        default: {
          ...options.embedder,
          // What the model reads for each product: its searchable text.
          documentTemplate:
            options.embedder.documentTemplate ??
            searchable.map((path) => `{{doc.${path}}}`).join(" — "),
        },
      }
    : null

  return {
    searchableAttributes: searchable.length ? searchable : ["*"],
    filterableAttributes: [...filterable],
    sortableAttributes: sortable,
    displayedAttributes: ["*"],
    distinctAttribute: index.settings?.distinct_attribute ?? null,
    typoTolerance: {
      enabled: typo?.enabled ?? true,
      minWordSizeForTypos: {
        oneTypo: typo?.min_word_size_for_one_typo ?? 4,
        twoTypos: typo?.min_word_size_for_two_typos ?? 8,
      },
      disableOnAttributes: typo?.disabled_on_attributes ?? [],
    },
    // No localizedAttributes: declaring locales (ara, eng or both) stops
    // Arabic synonyms from reaching English documents ("مقوي" no longer finds
    // "Range extender"), and the catalogue is mostly English until the
    // Arabic content pass. Per-document detection handles mixed titles.
    localizedAttributes: null,
    synonyms: buildSynonyms(options.synonyms),
    stopWords: options.stopWords ?? ARABIC_STOP_WORDS,
    faceting: { maxValuesPerFacet: 500, sortFacetValuesBy: { "*": "count" } },
    pagination: { maxTotalHits: 5000 },
    embedders: embedder,
  }
}
