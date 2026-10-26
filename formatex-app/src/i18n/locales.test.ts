import { describe, expect, it } from "vitest"
import enLocale from "./locales/en.json"
import faLocale from "./locales/fa.json"
import { LANGUAGES, SUPPORTED_LANGUAGES } from "./languages"

type Tree = { [key: string]: string | Tree }

/** `{ a: { b: "x" } }` becomes `{ "a.b": "x" }`. */
function flatten(tree: Tree, prefix = ""): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((out, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return typeof value === "string" ? { ...out, [path]: value } : { ...out, ...flatten(value, path) }
  }, {})
}

const placeholders = (text: string) => [...text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]).sort()

const en = flatten(enLocale)
const fa = flatten(faLocale)

describe("locales", () => {
  it("have exactly the same keys", () => {
    expect(Object.keys(fa).sort()).toEqual(Object.keys(en).sort())
  })

  it("use the same {{placeholders}} in every language", () => {
    for (const key of Object.keys(en)) expect(placeholders(fa[key]), key).toEqual(placeholders(en[key]))
  })

  it("have no empty strings", () => {
    for (const [key, value] of [...Object.entries(en), ...Object.entries(fa)]) expect(value.trim(), key).not.toBe("")
  })

  it("exist for every supported language", () => {
    expect(SUPPORTED_LANGUAGES.sort()).toEqual(["en", "fa"])
    for (const code of SUPPORTED_LANGUAGES) expect(["rtl", "ltr"]).toContain(LANGUAGES[code].dir)
  })
})
