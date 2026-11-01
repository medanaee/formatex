import { describe, expect, it } from "vitest"
import { schema, type Schema } from "@/lib/editor/schema"
import { brief, estimateTokens, generateSkill, skillComponents, SKILL_LEVELS, type SkillLanguage, type SkillLevel } from "@/lib/skill/generate"

const make = (level: SkillLevel, language: SkillLanguage = "en", components: ReadonlySet<string> | null = null) => generateSkill(schema, { level, language, components })

describe("skill generator", () => {
  it("lists every built-in component with docs", () => {
    const components = skillComponents(schema)
    expect(components.length).toBeGreaterThan(30)
    for (const component of components) {
      expect(component.docs, `${component.name} has docs`).not.toBeNull()
      expect(component.docs?.en.about.trim().length).toBeGreaterThan(20)
      expect(component.docs?.fa.about.trim().length).toBeGreaterThan(20)
    }
  })

  it("starts with front matter and ends with the checklist, in every size", () => {
    for (const level of SKILL_LEVELS) {
      const text = make(level)
      expect(text.startsWith("---\nname: formatex\ndescription: ")).toBe(true)
      expect(text).toContain("## Checklist")
      expect(text.trimEnd().split("\n").pop()).toMatch(/^- \[ \]/)
    }
  })

  it("grows with the level", () => {
    const sizes = SKILL_LEVELS.map((level) => make(level).length)
    for (let i = 1; i < sizes.length; i++) expect(sizes[i]).toBeGreaterThan(sizes[i - 1])
  })

  it("describes only the components chosen", () => {
    const text = make("standard", "en", new Set(["alert"]))
    expect(text).toContain("`<alert>`")
    expect(text).not.toContain("`<chart>`")
    expect(text).toContain('<alert type="warning">')
  })

  it("minimal names every tag once, with its attributes", () => {
    const text = make("minimal")
    expect(text).toMatch(/- `<alert>`: .*\(type, color, icon, radius\)/)
    expect(text).toContain("`<v />`")
  })

  it("writes Persian when asked, and both languages side by side", () => {
    const fa = make("standard", "fa")
    expect(fa).toContain("# نوشتن سند در فرمتکس")
    expect(fa).toContain("## فهرست بررسی")
    expect(fa).toContain("هشدار")
    const both = make("standard", "both")
    expect(both).toContain("# Writing documents in Formatex")
    expect(both).toContain("A colored callout")
    expect(both).toContain("کادر هشدار رنگی")
  })

  it("fences an example that holds fences with a longer fence", () => {
    const text = make("standard", "en", new Set(["tree"]))
    expect(text).toMatch(/\n(`{4,})markdown\n<tree/)
  })

  it("keeps a table cell on one line", () => {
    const text = make("full")
    for (const row of text.split("\n").filter((l) => l.startsWith("| `"))) expect(row.endsWith("|")).toBe(true)
  })

  it("works with a schema that has no components (an older engine)", () => {
    const older: Schema = { ...schema, components: undefined }
    const text = generateSkill(older, { level: "compact", language: "en", components: null })
    expect(text).toContain("`<alert>`")
  })

  it("includes the settings, the option lines and the themes", () => {
    const text = make("standard")
    expect(text).toContain("## Settings")
    expect(text).toContain("`theme`")
    expect(text).toContain("## Option lines")
    expect(text).toContain("Themes: light")
  })

  it("writes a tag as the engine spells it", () => {
    expect(make("compact")).toContain("### `<picHeader>`")
  })

  it("keeps the first sentence of a note, cut at a word when it is long", () => {
    expect(brief("One. Two.")).toBe("One.")
    expect(brief("word ".repeat(60), 40).endsWith("…")).toBe(true)
    expect(brief("word ".repeat(60), 40).length).toBeLessThanOrEqual(41)
  })

  it("estimates tokens", () => {
    expect(estimateTokens("a".repeat(400))).toBe(100)
  })
})
