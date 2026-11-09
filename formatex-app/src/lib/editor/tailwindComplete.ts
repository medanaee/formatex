import type { Suggestion } from "./completion"
import type { LocalizedText, TailwindCatalog } from "./schema"

const label = (text: LocalizedText, language: string): string => (language === "fa" ? text.fa || text.en : text.en)

/** Every class of the groups a tag takes, written out: a group's own classes, and each prefix with each value of its family. */
const cache = new WeakMap<TailwindCatalog, Map<string, Suggestion[]>>()

function classesOf(catalog: TailwindCatalog, groups: readonly string[], language: string): Suggestion[] {
  let byKey = cache.get(catalog)
  if (!byKey) cache.set(catalog, (byKey = new Map()))
  const key = `${language}:${groups.join(",")}`
  const found = byKey.get(key)
  if (found) return found
  const out: Suggestion[] = []
  const seen = new Set<string>()
  const add = (name: string, detail: string) => {
    if (seen.has(name)) return
    seen.add(name)
    out.push({ label: name, kind: "value", detail, template: name })
  }
  for (const group of catalog.groups) {
    if (!groups.includes(group.id)) continue
    const detail = label(group.label, language)
    for (const name of group.static) add(name, detail)
    for (const family of group.families) {
      const values = catalog.values[family.values] ?? []
      for (const prefix of family.prefixes) for (const value of values) add(prefix + value, detail)
    }
  }
  byKey.set(key, out)
  return out
}

/**
 * The Tailwind classes to offer at `cursor` in the value of a `tailwind` attribute (`value` is what is written of it so far, `valueStart`
 * where it begins): the classes of the groups the tag takes, for the word being typed; after a `dark:` the same, and the variants
 * themselves before one. `from` is where the word starts (after the last space or the last `:`).
 */
export function tailwindCompletion(catalog: TailwindCatalog, groups: readonly string[], valueStart: number, value: string, language: string): { from: number; options: Suggestion[] } {
  const space = Math.max(value.lastIndexOf(" "), value.lastIndexOf("\n"), value.lastIndexOf("\t"))
  const word = value.slice(space + 1)
  const colon = word.lastIndexOf(":")
  const options = classesOf(catalog, groups, language)
  if (colon >= 0) return { from: valueStart + space + 1 + colon + 1, options }
  const variants: Suggestion[] = catalog.variants.map((variant) => ({ label: `${variant}:`, kind: "keyword", detail: language === "fa" ? "حالت" : "variant", template: `${variant}:`, boost: -2 }))
  return { from: valueStart + space + 1, options: [...options, ...variants] }
}
