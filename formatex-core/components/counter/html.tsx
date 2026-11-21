import { digits } from "formatex"

const stateByDoc = new WeakMap<object, { seen: Map<string, string>; counters: Map<string, number[]> }>()

const FA_WORDS: Record<number, string> = {
  0: "صفر", 1: "یک", 2: "دو", 3: "سه", 4: "چهار", 5: "پنج", 6: "شش", 7: "هفت", 8: "هشت", 9: "نه",
  10: "ده", 11: "یازده", 12: "دوازده", 13: "سیزده", 14: "چهارده", 15: "پانزده", 16: "شانزده", 17: "هفده", 18: "هجده", 19: "نوزده",
  20: "بیست", 30: "سی", 40: "چهل", 50: "پنجاه", 60: "شصت", 70: "هفتاد", 80: "هشتاد", 90: "نود",
}

const ABJAD = ["ا", "ب", "ج", "د", "ه", "و", "ز", "ح", "ط", "ی", "ک", "ل", "م", "ن", "س", "ع", "ف", "ص", "ق", "ر", "ش", "ت", "ث", "خ", "ذ", "ض", "ظ", "غ"]
const ALEFBA = ["الف", "ب", "پ", "ت", "ث", "ج", "چ", "ح", "خ", "د", "ذ", "ر", "ز", "ژ", "س", "ش", "ص", "ض", "ط", "ظ", "ع", "غ", "ف", "ق", "ک", "گ", "ل", "م", "ن", "و", "ه", "ی"]

function toRoman(num: number): string {
  if (num <= 0) return String(num)
  const map: [number, string][] = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]]
  let n = num, out = ""
  for (const [v, s] of map) {
    while (n >= v) { out += s; n -= v }
  }
  return out
}

function toAlpha(num: number): string {
  if (num <= 0) return String(num)
  let n = num, out = ""
  while (n > 0) {
    n -= 1
    out = String.fromCharCode(97 + (n % 26)) + out
    n = Math.floor(n / 26)
  }
  return out
}

function toFaWord(num: number): string {
  if (FA_WORDS[num] !== undefined) return FA_WORDS[num]
  if (num > 20 && num < 100) {
    const tens = Math.floor(num / 10) * 10
    const ones = num % 10
    return `${FA_WORDS[tens]} و ${FA_WORDS[ones]}`
  }
  return digits(num, true)
}

function formatCounter(kind: string, val: number, persian: boolean): string {
  switch (kind) {
    case "fa": return digits(val, true)
    case "en": return String(val)
    case "fatxt": return toFaWord(val)
    case "rome": return toRoman(val)
    case "abc": return toAlpha(val)
    case "abjad": return val >= 1 && val <= ABJAD.length ? ABJAD[val - 1] : digits(val, true)
    case "alefba": return val >= 1 && val <= ALEFBA.length ? ALEFBA[val - 1] : digits(val, true)
    case "auto":
    default:
      return digits(val, persian)
  }
}

function parseList(value: unknown): string[] {
  if (value === undefined || value === null) return []
  if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean)
  return String(value).split(",").map(s => s.trim()).filter(Boolean)
}

export default function Component({ node, context }) {
  const p = context.props(node)
  const of = String(p.of ?? p.name ?? "").trim()
  if (!of) return null

  let state = stateByDoc.get(context.document)
  if (!state) {
    state = { seen: new Map(), counters: new Map() }
    stateByDoc.set(context.document, state)
  }

  const cached = state.seen.get(node.key)
  if (cached !== undefined) {
    return cached === "" ? null : <span id={p.id ? String(p.id) : undefined} className="fx-counter">{cached}</span>
  }

  const configCounters = (context.document.settings?.counters ?? {}) as Record<string, Record<string, unknown>>
  const own = configCounters[of] ?? {}
  const levels = Math.min(9, Math.max(1, Number(own.levels ?? 1) || 1))
  const separator = String(own.separator ?? ".")
  const formats = parseList(p.format ?? own.format)
  const level = Math.min(levels, Math.max(1, Number(p.level ?? 1) || 1))
  const step = Math.max(0, Number(p.step ?? 1) || (p.step === 0 || p.step === "0" ? 0 : 1))
  const hasSet = p.set !== undefined && p.set !== null && String(p.set) !== ""
  const setTo = hasSet ? Number(p.set) : undefined
  const hidden = p.hide !== undefined && !["false", "no", "0", ""].includes(String(p.hide))

  const defaultLabel = Array.from({ length: levels }, (_, i) => `%${i + 1}`).join(separator)
  const label = String(p.label ?? own.label ?? defaultLabel)

  let values = state.counters.get(of) ?? []
  while (values.length < levels) values.push(0)
  values = [...values]

  if (setTo !== undefined && !Number.isNaN(setTo)) {
    values[level - 1] = setTo
  } else if (step > 0) {
    values[level - 1] += step
    for (let i = level; i < values.length; i += 1) values[i] = 0
  }
  state.counters.set(of, values)

  if (hidden || label === "") {
    state.seen.set(node.key, "")
    return null
  }

  const flow = node.props?._flow === "rtl" || node.props?._flow === "ltr"
    ? node.props._flow
    : (context.language === "fa" ? "rtl" : "ltr")
  const persian = flow === "rtl"

  const formatOf = (i: number) => formats.length === 0 ? "auto" : (formats[i] ?? formats[formats.length - 1])
  const written = Array.from({ length: levels }, (_, i) => formatCounter(formatOf(i), values[i] ?? 0, persian))
  const output = label.replace(/%([1-9])/g, (_, d) => written[Number(d) - 1] ?? "")
  state.seen.set(node.key, output)

  return <span id={p.id ? String(p.id) : undefined} className="fx-counter">{output}</span>
}
