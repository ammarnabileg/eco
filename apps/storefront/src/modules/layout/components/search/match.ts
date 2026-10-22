// Loose matching for Arabic and English names: ignores case, diacritics and
// the usual spelling variants (أ/إ/آ → ا, ة → ه, ى → ي).
export const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[ً-ٰٟ̀-ͯ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(new RegExp("[^\\p{L}\\p{N}]+", "gu"), " ")
    .trim()

export const matches = (name: string, query: string) => {
  const q = normalize(query)
  return q.length > 0 && normalize(name).includes(q)
}
