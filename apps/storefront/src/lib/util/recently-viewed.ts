// Products a visitor opened, newest first, kept in a cookie so the server can
// personalise the homepage. Ids only; nothing personal.
export const VIEWED_COOKIE = "_laly_viewed"
export const VIEWED_MAX = 12

export const parseViewed = (value?: string | null) =>
  (value ?? "")
    .split(",")
    .filter((id) => /^prod_[A-Za-z0-9]+$/.test(id))
    .slice(0, VIEWED_MAX)

export const addViewed = (value: string | null | undefined, id: string) =>
  [id, ...parseViewed(value).filter((x) => x !== id)].slice(0, VIEWED_MAX).join(",")
