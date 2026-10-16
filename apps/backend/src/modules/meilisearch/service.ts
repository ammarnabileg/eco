import { createHash } from "crypto"

import { Logger, SearchTypes } from "@medusajs/framework/types"
import { AbstractSearchProviderService, MedusaError, projectDocument } from "@medusajs/framework/utils"

import { MeiliClient, MeiliTask } from "./client"
import { dateFields, planFields } from "./fields"
import { FieldLookup, filteredFields, toMeiliFilter } from "./filters"
import { ARABIC_STOP_WORDS, buildSynonyms, rewriteQuery } from "./language"
import { buildIndexSettings, MeilisearchProviderOptions } from "./settings"

type MeiliHit = Record<string, unknown> & {
  _rankingScore?: number
  _formatted?: Record<string, unknown>
}
type MeiliSearchResponse = {
  hits: MeiliHit[]
  estimatedTotalHits?: number
  totalHits?: number
  processingTimeMs: number
  facetDistribution?: Record<string, Record<string, number>>
  facetStats?: Record<string, { min: number; max: number }>
}
type MeiliQuery = Record<string, unknown> & { indexUid: string }

const LOCALES: Record<string, string> = { ar: "ara", en: "eng" }

/**
 * Meilisearch provider for the Medusa Search Module. Implements the same
 * contract as the built-in Postgres provider, so /store/search and the
 * InstantSearch adapter keep working unchanged. Adds Arabic tokenization,
 * Gulf-dialect and Arabic/English synonyms, typo tolerance, and optional
 * hybrid (semantic) search.
 */
export default class MeilisearchSearchService extends AbstractSearchProviderService {
  static identifier = "meilisearch"

  protected readonly client_: MeiliClient
  protected readonly options_: MeilisearchProviderOptions
  protected readonly logger_?: Logger
  protected featuresReady_?: Promise<void>
  protected settingsReady_ = new Map<string, Promise<void>>()
  protected vocabulary_: Set<string>

  constructor({ logger }: { logger?: Logger }, options: MeilisearchProviderOptions) {
    super()
    if (!options?.host || !options?.apiKey) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Meilisearch provider needs `host` and `apiKey` (set MEILISEARCH_HOST and MEILISEARCH_API_KEY)"
      )
    }
    this.options_ = options
    this.logger_ = logger
    this.client_ = new MeiliClient(options.host.replace(/\/$/, ""), options.apiKey, options.requestTimeoutMs)
    this.vocabulary_ = new Set(Object.keys(buildSynonyms(options.synonyms)))
  }

  protected uid(physicalName: string) {
    return `${this.options_.indexPrefix ?? ""}${physicalName}`.replace(/[^A-Za-z0-9_-]/g, "_")
  }

  protected task(index: string, task: MeiliTask | undefined): SearchTypes.SearchTask {
    const uid = task?.taskUid ?? task?.uid
    return {
      id: uid === undefined ? undefined : String(uid),
      index,
      status: task?.status === "canceled" ? "failed" : (task?.status ?? "succeeded"),
      ...(task?.error ? { error: { message: task.error.message, code: task.error.code } } : {}),
    }
  }

  // CONTAINS / STARTS WITH filters are behind an experimental flag.
  protected ensureFeatures() {
    this.featuresReady_ ??= this.client_
      .request("PATCH", "/experimental-features", { containsFilter: true })
      .then(() => undefined)
      .catch((error: Error) => {
        this.featuresReady_ = undefined
        this.logger_?.warn(`Meilisearch: could not enable containsFilter: ${error.message}`)
      })
    return this.featuresReady_
  }

  protected get metaIndex_() {
    return this.uid("laly_search_meta")
  }

  // Medusa calls upsertIndex only when an index definition changes, not when
  // this provider's own settings (synonyms, stop words, embedder) change. A
  // fingerprint of the applied settings is kept in a small meta index and
  // compared once per process, so edits to the vocabulary reach the live index.
  protected ensureSettings(index: SearchTypes.ResolvedSearchIndexDefinition) {
    const uid = this.uid(index.physical_name)
    if (!this.settingsReady_.has(uid)) {
      const run = (async () => {
        const settings = buildIndexSettings(index, this.options_)
        const hash = createHash("sha256").update(JSON.stringify(settings)).digest("hex")
        const stored = await this.client_
          .request<{ hash?: string }>("GET", `/indexes/${this.metaIndex_}/documents/${uid}`)
          .catch(() => undefined)
        if (stored?.hash === hash) {
          return
        }
        await this.ensureFeatures()
        const task = await this.client_.request<MeiliTask>("PATCH", `/indexes/${uid}/settings`, settings)
        const done = await this.client_.waitForTask(task.taskUid!, 120_000)
        if (done.status !== "succeeded") {
          throw new MedusaError(
            MedusaError.Types.UNEXPECTED_STATE,
            `Meilisearch settings update failed for ${uid}: ${done.error?.message ?? done.status}`
          )
        }
        const meta = await this.client_.request<MeiliTask>(
          "PUT",
          `/indexes/${this.metaIndex_}/documents?primaryKey=id`,
          [{ id: uid, hash }]
        )
        await this.client_.waitForTask(meta.taskUid!)
        this.logger_?.info(`Meilisearch: applied settings to ${uid}`)
      })().catch((error) => {
        this.settingsReady_.delete(uid)
        this.logger_?.warn(`Meilisearch: ${(error as Error).message}`)
      })
      this.settingsReady_.set(uid, run)
    }
    return this.settingsReady_.get(uid)!
  }

  async waitForTask(task: SearchTypes.SearchTask, options?: { timeout_ms?: number }) {
    if (!task.id) {
      return task
    }
    const done = await this.client_.waitForTask(Number(task.id), options?.timeout_ms)
    return this.task(task.index ?? "", done)
  }

  async upsertIndex({ index }: { index: SearchTypes.ResolvedSearchIndexDefinition }) {
    await this.ensureFeatures()
    const uid = this.uid(index.physical_name)
    const exists = await this.client_.request("GET", `/indexes/${uid}`).then(
      () => true,
      (e: MedusaError) => (e.type === MedusaError.Types.NOT_FOUND ? false : Promise.reject(e))
    )
    if (!exists) {
      const created = await this.client_.request<MeiliTask>("POST", "/indexes", {
        uid,
        primaryKey: index.primary_key,
      })
      await this.client_.waitForTask(created.taskUid!)
    }
    this.settingsReady_.delete(uid)
    await this.ensureSettings(index)
    return this.task(index.physical_name, undefined)
  }

  async deleteIndex({ index }: { index: string }) {
    const task = await this.client_
      .request<MeiliTask>("DELETE", `/indexes/${this.uid(index)}`)
      .catch((e: MedusaError) => (e.type === MedusaError.Types.NOT_FOUND ? undefined : Promise.reject(e)))
    return this.task(index, task)
  }

  async listIndexes(): Promise<SearchTypes.SearchIndexInfo[]> {
    const prefix = this.options_.indexPrefix ?? ""
    const [{ results }, stats] = await Promise.all([
      this.client_.request<{ results: { uid: string; createdAt: string; updatedAt: string }[] }>(
        "GET",
        "/indexes?limit=1000"
      ),
      this.client_.request<{ indexes: Record<string, { numberOfDocuments: number }> }>("GET", "/stats"),
    ])
    return results
      .filter((i) => i.uid.startsWith(prefix) && i.uid !== this.metaIndex_)
      .map((i) => ({
        name: i.uid.slice(prefix.length),
        provider: MeilisearchSearchService.identifier,
        document_count: stats.indexes[i.uid]?.numberOfDocuments ?? 0,
        created_at: new Date(i.createdAt),
        updated_at: new Date(i.updatedAt),
      }))
  }

  async upsertDocuments({
    index,
    definition,
    documents,
  }: {
    index: string
    definition: SearchTypes.ResolvedSearchIndexDefinition
    documents: SearchTypes.SearchDocument[]
  }) {
    if (!documents.length) {
      return this.task(index, undefined)
    }
    await this.ensureSettings(definition)
    const dates = dateFields(planFields(definition.fields))
    // Dates are stored as epoch milliseconds so they filter and sort numerically.
    const prepared = documents.map((doc) => {
      const copy: Record<string, unknown> = { ...doc }
      for (const path of dates) {
        const value = copy[path]
        if (value instanceof Date) copy[path] = value.getTime()
        else if (typeof value === "string" && !Number.isNaN(Date.parse(value))) copy[path] = Date.parse(value)
      }
      return copy
    })
    const task = await this.client_.request<MeiliTask>(
      "PUT",
      `/indexes/${this.uid(index)}/documents?primaryKey=${encodeURIComponent(definition.primary_key)}`,
      prepared
    )
    return this.task(index, task)
  }

  async deleteDocuments({ index, filters }: SearchTypes.SearchDeleteDocumentsInput) {
    const filter = toMeiliFilter(filters)
    const task = filter
      ? await this.client_.request<MeiliTask>("POST", `/indexes/${this.uid(index)}/documents/delete`, { filter })
      : await this.client_.request<MeiliTask>("DELETE", `/indexes/${this.uid(index)}/documents`)
    return this.task(index, task)
  }

  async clearIndex({ index }: { index: string }) {
    const task = await this.client_.request<MeiliTask>("DELETE", `/indexes/${this.uid(index)}/documents`)
    return this.task(index, task)
  }

  async search(input: SearchTypes.ProviderSearchQuery): Promise<SearchTypes.SearchResult> {
    const [result] = await this.searchMany([input])
    return result
  }

  // Every query, plus its extra facet queries, goes out in one multi-search.
  async searchMany(inputs: SearchTypes.ProviderSearchQuery[]): Promise<SearchTypes.SearchResult[]> {
    // Not awaited: Meilisearch keeps serving with the previous settings while
    // an update is applied, so a search never waits on a re-index.
    inputs.forEach((input) => void this.ensureSettings(input.index))
    const plans = inputs.map((input) => this.plan(input))
    const queries = plans.flatMap((p) => p.queries)
    const { results } = await this.client_.request<{ results: MeiliSearchResponse[] }>("POST", "/multi-search", {
      queries,
    })

    let offset = 0
    const assembled = plans.map((p) => {
      const slice = results.slice(offset, offset + p.queries.length)
      offset += p.queries.length
      return p.assemble(slice)
    })

    // A long conversational query with no exact match ("شي يقوي النت في
    // البيت") falls back to its individual words, best score first.
    return Promise.all(
      assembled.map((result, i) => (result.hits.length || !plans[i].relaxable ? result : this.relaxed(inputs[i], result)))
    )
  }

  protected async relaxed(input: SearchTypes.ProviderSearchQuery, empty: SearchTypes.SearchResult) {
    // Stop words alone would become an empty query, which matches everything.
    const stop = new Set(this.options_.stopWords ?? ARABIC_STOP_WORDS)
    const words = rewriteQuery(input.q ?? "", this.options_.synonyms)
      .split(/\s+/)
      .filter((w) => w.length > 1 && !stop.has(w))
      .slice(0, 6)
    const perWord = await Promise.all(words.map((w) => this.searchMany([{ ...input, q: w }]).then(([r]) => r)))
    // Score = sum over words, so a product matching more of the words ranks
    // first. Store vocabulary (product types, brands) counts double: in
    // "راوتر في البيت" the router matters more than the house.
    const best = new Map<string, SearchTypes.SearchHit>()
    perWord.forEach((r, i) => {
      const weight = this.vocabulary_.has(words[i].toLowerCase()) ? 2 : 1
      for (const hit of r.hits) {
        const prev = best.get(hit.id)
        best.set(hit.id, { ...hit, score: (prev?.score ?? 0) + weight * (hit.score ?? 0) })
      }
    })
    if (!best.size) {
      return empty
    }
    const take = input.pagination?.take ?? 20
    const hits = [...best.values()].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, take)
    const facets = perWord.sort((a, b) => b.hits.length - a.hits.length)[0]?.facets
    return {
      hits,
      facets,
      metadata: { ...empty.metadata, count: best.size },
      provider_metadata: { relaxed: true },
    }
  }

  protected plan(input: SearchTypes.ProviderSearchQuery) {
    const index = input.index
    const uid = this.uid(index.physical_name)
    const fields = planFields(index.fields)
    const byPath = new Map(fields.map((f) => [f.path, f.def]))
    const dates = dateFields(fields)
    const lookup: FieldLookup = (path) => {
      const def = byPath.get(path)
      return def ? { isArray: !!def.array, isDate: def.type === "date" } : undefined
    }

    const options = input.search_options ?? {}
    const skip = input.pagination?.skip ?? 0
    const take = input.pagination?.take ?? 20
    const rawQ = input.q ?? (typeof input.filters?.q === "string" ? input.filters.q : undefined)
    const q = rawQ ? rewriteQuery(rawQ, this.options_.synonyms) : rawQ
    const filter = toMeiliFilter(input.filters, lookup)

    const sort = Object.entries(input.pagination?.order ?? {})
      .filter(([field]) => field !== "_score")
      .map(([field, dir]) => `${field}:${dir.toLowerCase()}`)

    const vector = options.vector
    const hybrid = vector
      ? { embedder: vector.field ?? "default", semanticRatio: vector.semantic_ratio ?? 0.5 }
      : this.options_.embedder && q && (this.options_.semanticRatio ?? 0) > 0
        ? { embedder: "default", semanticRatio: this.options_.semanticRatio }
        : undefined

    const highlight = options.highlight
    const highlightFields =
      highlight === true ? ["*"] : highlight && typeof highlight === "object" ? highlight.fields : undefined

    const facetRequests = (options.facets ?? []).map((f) =>
      typeof f === "string" ? ({ field: f, type: "value" } as const) : f
    )
    const valueFacets = facetRequests.filter((f) => !f.type || f.type === "value")
    const statsFacets = facetRequests.filter((f) => f.type === "stats")
    const rangeFacets = facetRequests.filter(
      (f): f is Extract<SearchTypes.SearchFacetRequest, { type: "range" }> => f.type === "range"
    )

    const retrieve = input.attributes_to_retrieve?.length
      ? Array.from(new Set([index.primary_key, ...input.attributes_to_retrieve]))
      : ["*"]

    const main: MeiliQuery = {
      indexUid: uid,
      q: vector?.query ?? q ?? "",
      ...(filter ? { filter } : {}),
      offset: skip,
      limit: take,
      ...(sort.length ? { sort } : {}),
      attributesToRetrieve: retrieve,
      showRankingScore: true,
      ...(options.attributes_to_search_on ? { attributesToSearchOn: options.attributes_to_search_on } : {}),
      // "frequency" drops the most common words first when nothing matches
      // every word, so the rare, specific one ("router") is kept.
      matchingStrategy:
        options.match_strategy === "all" ? "all" : options.match_strategy === "last" ? "last" : "frequency",
      ...(options.min_score !== undefined ? { rankingScoreThreshold: options.min_score } : {}),
      ...(options.distinct ? { distinct: options.distinct } : {}),
      ...(options.locales?.length ? { locales: options.locales.map((l) => LOCALES[l] ?? l) } : {}),
      ...(hybrid ? { hybrid } : {}),
      ...(vector?.value ? { vector: vector.value } : {}),
      ...(highlightFields
        ? {
            attributesToHighlight: highlightFields,
            highlightPreTag: (typeof highlight === "object" && highlight.pre_tag) || "<em>",
            highlightPostTag: (typeof highlight === "object" && highlight.post_tag) || "</em>",
            ...(typeof highlight === "object" && highlight.snippet
              ? {
                  attributesToCrop: highlightFields,
                  cropLength: typeof highlight.snippet === "object" ? highlight.snippet.length : 20,
                }
              : {}),
          }
        : {}),
      ...(valueFacets.length || statsFacets.length
        ? { facets: [...valueFacets, ...statsFacets].map((f) => f.field) }
        : {}),
    }

    // Disjunctive facets: a facet's counts ignore the filter on that facet,
    // so picking one category still shows the counts of the others.
    const filtered = filteredFields(input.filters)
    const disjunctive = options.disjunctive_facets
      ? valueFacets.filter((f) => filtered.has(f.field))
      : []
    const countQuery = (extraFilter: string | undefined, facets?: string[]): MeiliQuery => ({
      indexUid: uid,
      q: main.q,
      ...(extraFilter ? { filter: extraFilter } : {}),
      limit: 0,
      ...(main.matchingStrategy ? { matchingStrategy: main.matchingStrategy } : {}),
      ...(main.attributesToSearchOn ? { attributesToSearchOn: main.attributesToSearchOn } : {}),
      ...(main.hybrid ? { hybrid: main.hybrid } : {}),
      ...(facets ? { facets } : {}),
    })
    const disjunctiveQueries = disjunctive.map((f) =>
      countQuery(toMeiliFilter(input.filters, lookup, new Set([f.field])), [f.field])
    )
    const rangeQueries = rangeFacets.flatMap((f) =>
      f.ranges.map((range) => {
        const bound: Record<string, unknown> = {}
        if (range.from !== undefined) bound.$gte = range.from
        if (range.to !== undefined) bound.$lt = range.to
        const rangeFilter = toMeiliFilter({ [f.field]: bound }, lookup)
        return countQuery([filter, rangeFilter].filter(Boolean).map((p) => `(${p})`).join(" AND "))
      })
    )

    const queries = [main, ...disjunctiveQueries, ...rangeQueries]

    const toIso = (doc: Record<string, unknown>) => {
      for (const path of dates) {
        if (typeof doc[path] === "number") doc[path] = new Date(doc[path] as number).toISOString()
      }
      return doc
    }

    const assemble = (results: MeiliSearchResponse[]): SearchTypes.SearchResult => {
      const [res, ...extra] = results
      const disjunctiveResults = extra.slice(0, disjunctiveQueries.length)
      const rangeResults = extra.slice(disjunctiveQueries.length)
      const total = res.totalHits ?? res.estimatedTotalHits ?? res.hits.length

      const hits: SearchTypes.SearchHit[] = res.hits.map((hit) => {
        const { _rankingScore, _formatted, ...rest } = hit
        const document = toIso(retrieve[0] === "*" ? rest : projectDocument(rest, retrieve))
        const highlights = highlightFields && _formatted
          ? Object.fromEntries(
              Object.entries(_formatted)
                .filter(([k, v]) => v !== rest[k] && (typeof v === "string" || Array.isArray(v)))
                .map(([k, v]) => [k, (Array.isArray(v) ? v : [v]).map(String)])
            )
          : undefined
        return {
          id: String(rest[index.primary_key]),
          ...(options.include_score !== false && _rankingScore !== undefined ? { score: _rankingScore } : {}),
          document,
          ...(highlights && Object.keys(highlights).length ? { highlights } : {}),
        }
      })

      const facets: Record<string, SearchTypes.SearchFacetResult> = {}
      for (const f of valueFacets) {
        const fromDisjunctive = disjunctive.findIndex((d) => d.field === f.field)
        const distribution =
          (fromDisjunctive >= 0 ? disjunctiveResults[fromDisjunctive] : res).facetDistribution?.[f.field] ?? {}
        let values = Object.entries(distribution).map(([value, count]) => ({ value, count }))
        if ("query" in f && f.query) {
          const needle = f.query.toLowerCase()
          values = values.filter((v) => v.value.toLowerCase().includes(needle))
        }
        values.sort((a, b) =>
          "sort" in f && f.sort === "alpha" ? a.value.localeCompare(b.value, "ar") : b.count - a.count
        )
        const limit = ("limit" in f && f.limit) || 100
        facets[f.field] = {
          type: "value",
          values: values.slice(0, limit),
          ...(values.length > limit ? { other_count: values.length - limit } : {}),
        }
      }
      for (const f of statsFacets) {
        const stats = res.facetStats?.[f.field]
        facets[f.field] = stats
          ? { type: "stats", min: stats.min, max: stats.max, count: total }
          : { type: "stats", min: 0, max: 0, count: 0 }
      }
      let r = 0
      for (const f of rangeFacets) {
        facets[f.field] = {
          type: "range",
          ranges: f.ranges.map((range, i) => ({
            key: range.key ?? `${range.from ?? "*"}-${range.to ?? "*"}`,
            ...(range.from !== undefined ? { from: range.from } : {}),
            ...(range.to !== undefined ? { to: range.to } : {}),
            count: (() => {
              const res_ = rangeResults[r + i]
              return res_?.totalHits ?? res_?.estimatedTotalHits ?? 0
            })(),
          })),
        }
        r += f.ranges.length
      }

      return {
        hits,
        ...(facetRequests.length ? { facets } : {}),
        metadata: {
          skip,
          take,
          count: options.count === "none" ? null : total,
          ...(q ? { query: q } : {}),
          processing_time_ms: res.processingTimeMs,
        },
      }
    }

    const relaxable = !!q && !vector && skip === 0 && q.trim().split(/\s+/).length > 1
    return { queries, assemble, relaxable }
  }
}
