// Search vocabulary for a Kuwaiti electronics store. Meilisearch already folds
// Arabic spelling variants (أ/إ/آ → ا, ة → ه, ى → ي, diacritics, tatweel), so
// this list only covers what normalization cannot: dialect words, Arabic ↔
// English product terms, transliterated brand names, and phrases customers type.
// Synonyms are expanded both ways where listed in both directions.

const GROUPS: string[][] = [
  // Networking
  ["راوتر", "router", "مودم", "modem", "رواتر"],
  ["مقوي", "مقوي شبكة", "extender", "range extender", "مقوي واي فاي", "مقوي نت"],
  ["واي فاي", "wifi", "wi-fi", "وايرلس", "wireless", "لاسلكي"],
  ["نت", "انترنت", "إنترنت", "internet", "راوتر", "مقوي"],
  ["كيبل", "كابل", "سلك", "cable"],
  ["سويتش", "switch", "موزع"],
  ["mesh", "ميش", "شبكة ميش"],
  // Surveillance
  ["كاميرا", "كاميره", "كام", "camera", "cam", "كاميرات"],
  ["كاميرا مراقبة", "cctv", "مراقبة", "سي سي تي في"],
  ["dvr", "جهاز تسجيل", "مسجل", "nvr"],
  ["هارد", "hdd", "hard disk", "هارديسك", "قرص صلب"],
  ["رؤية ليلية", "night vision", "انفرا ريد"],
  // Smart home and audio
  ["لمبة", "لمبه", "ليت", "bulb", "light", "اضاءة", "إضاءة"],
  ["ذكي", "ذكية", "smart"],
  ["سماعة", "سماعات", "headphones", "headset", "هيدفون", "earphones"],
  ["بلوتوث", "bluetooth", "لاسلكية"],
  // Brands as customers write them in Arabic
  ["hikvision", "هيك فيجن", "هيكفيجن", "هيك فيجين", "هايك فيجن"],
  ["tp-link", "tplink", "تي بي لينك"],
  ["tapo", "تابو"],
  ["d-link", "dlink", "دي لينك"],
  ["dahua", "داهوا"],
  ["ezviz", "ايزفيز"],
  ["jbl", "جي بي ال"],
  ["ubiquiti", "يوبيكويتي", "unifi", "يوني فاي"],
]

// Phrases that should land on a product type even though no title contains them.
const PHRASES: Record<string, string[]> = {
  "يقوي النت": ["راوتر", "مقوي"],
  "تقوية النت": ["راوتر", "مقوي"],
  "تقوية الواي فاي": ["راوتر", "مقوي"],
  "النت ضعيف": ["راوتر", "مقوي"],
  "مراقبة البيت": ["كاميرا", "مراقبة"],
  "كاميرا للحوش": ["كاميرا", "خارجية"],
  "كاميرا خارجية": ["bullet", "خارجية"],
  "حفظ التسجيلات": ["هارد", "dvr"],
  "تخزين التسجيلات": ["هارد", "dvr"],
}

// Meilisearch applies a multi-word synonym only when the whole query is that
// phrase. Customers wrap phrases in sentences ("شي يقوي النت في البيت"), so
// known phrases are rewritten to their product term before searching.
export function rewriteQuery(q: string, extra: Record<string, string[]> = {}): string {
  const phrases = Object.entries({ ...PHRASES, ...extra })
    .filter(([phrase]) => phrase.includes(" "))
    .sort(([a], [b]) => b.length - a.length)
  let out = ` ${q.trim().replace(/\s+/g, " ")} `
  for (const [phrase, targets] of phrases) {
    out = out.split(` ${phrase} `).join(` ${targets[0]} `)
  }
  return out.trim()
}

// Gulf/Arabic filler words that carry no product meaning in a query.
export const ARABIC_STOP_WORDS = [
  "في", "من", "على", "الى", "إلى", "عن", "مع", "و", "يا", "او", "أو",
  "شي", "شيء", "ابي", "أبي", "ابغى", "أبغى", "ابغي", "اريد", "أريد", "ودي",
  "عشان", "علشان", "حق", "حقت", "ممكن", "عندكم", "عندك", "فيه", "هل", "لو",
  "زين", "واجد", "اللي", "الي", "هذا", "هذي",
]

const isArabic = (term: string) => /^[؀-ۿ]/.test(term)

// Meilisearch matches synonyms on the word as typed, so Arabic single words
// also get their "ال" form (نت → النت).
const withArticle = (term: string) =>
  isArabic(term) && !term.includes(" ") && !term.startsWith("ال") ? [term, `ال${term}`] : [term]

export function buildSynonyms(extra: Record<string, string[]> = {}): Record<string, string[]> {
  const synonyms: Record<string, Set<string>> = {}
  const add = (from: string, to: string[]) => {
    for (const key of withArticle(from.toLowerCase())) {
      synonyms[key] ??= new Set()
      to.filter((t) => t.toLowerCase() !== key).forEach((t) => synonyms[key].add(t.toLowerCase()))
    }
  }
  for (const group of GROUPS) {
    for (const term of group) {
      add(term, group)
    }
  }
  for (const [phrase, targets] of Object.entries({ ...PHRASES, ...extra })) {
    add(phrase, targets)
  }
  return Object.fromEntries(Object.entries(synonyms).map(([k, v]) => [k, [...v]]))
}
