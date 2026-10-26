import { describe, expect, it } from "vitest"
import { complete, type CompletionEnv } from "./completion"
import { completeToml, frontMatterEnd, inFrontMatter } from "./configCompletion"
import { schema } from "./schema"

const env: CompletionEnv = { schema, language: "en" }

/** Completes at the `|` in `text`, with the given completer. */
function at(text: string, run: typeof completeToml, override: Partial<CompletionEnv> = {}) {
  const pos = text.indexOf("|")
  const source = text.slice(0, pos) + text.slice(pos + 1)
  const result = run(source, pos, { ...env, ...override })
  return result && { ...result, source, labels: result.options.map((o) => o.label) }
}
const toml = (text: string, override?: Partial<CompletionEnv>) => at(text, completeToml, override)
const yaml = (text: string, override?: Partial<CompletionEnv>) => at(text, complete, override)

describe("the schema", () => {
  it("describes config.toml and the front matter", () => {
    expect(Object.keys(schema.config!.config.tables)).toEqual(expect.arrayContaining(["font", "paragraph", "heading", "table", "list", "chat", "equation"]))
    expect(Object.keys(schema.config!["front-matter"].tables)).toEqual(expect.arrayContaining(["header", "footer", "cover", "bibliography"]))
    expect(schema.config!.config.attrs.source).toBeDefined()
    expect(schema.config!["front-matter"].attrs.source).toBeUndefined()
  })
})

describe("config.toml", () => {
  it("suggests the top-level keys before any table, and none already written", () => {
    const result = toml('theme = "paper"\n|')!
    expect(result.labels).toEqual(expect.arrayContaining(["feel", "page", "margin", "scale", "dir", "columns", "source"]))
    expect(result.labels).not.toContain("theme")
    expect(result.options.find((o) => o.label === "feel")!.template).toBe('feel = "${}"')
    expect(result.options.find((o) => o.label === "scale")!.template).toBe("scale = ${}")
  })

  it("suggests the keys of the table the cursor is in", () => {
    const result = toml("[heading]\nnumbering = true\n|")!
    expect(result.labels).toEqual(expect.arrayContaining(["underline", "fill", "max-level", "color", "number-prefix"]))
    expect(result.labels).not.toContain("numbering")
    expect(result.labels).not.toContain("theme")
  })

  it("suggests table names after a [", () => {
    const result = toml("[|")!
    expect(result.labels).toEqual(expect.arrayContaining(["font", "heading", "list"]))
    expect(result.options.find((o) => o.label === "font")!.template).toBe("font]")
  })

  it("completes a partly typed table name and does not repeat the closing bracket", () => {
    expect(toml("[hea|")!.source.slice(toml("[hea|")!.from)).toBe("hea")
    expect(toml("[hea|]")!.options.find((o) => o.label === "heading")!.template).toBe("heading")
  })

  it("suggests the values of an enum, quoted when they are not yet", () => {
    const result = toml("theme = |")!
    expect(result.labels).toEqual(["paper", "sepia", "ocean", "sage", "midnight", "nord", "zinc", "dracula"])
    expect(result.options[0].template).toBe('"paper"')
  })

  it("closes the quote only when it is not there", () => {
    expect(toml('theme = "oc|')!.options.find((o) => o.label === "ocean")!.template).toBe('ocean"')
    expect(toml('theme = "oc|"')!.options.find((o) => o.label === "ocean")!.template).toBe("ocean")
  })

  it("suggests true and false for a boolean, without quotes", () => {
    const result = toml("[paragraph]\njustify = |")!
    expect(result.labels).toEqual(["true", "false"])
    expect(result.options[0].template).toBe("true")
  })

  it("knows the values of the nested tables", () => {
    expect(toml("[list]\nnumbers = |")!.labels).toContain("abjad")
    expect(toml("[chat]\nstyle = |")!.labels).toEqual(["auto", "transcript", "assistant", "bubbles"])
    expect(toml("[equation]\nnumbering = |")!.labels).toEqual(["labelled", "all", "none"])
  })

  it("is silent in a comment, for an unknown key and for a free-text value without a default", () => {
    expect(toml("# the them|")).toBeNull()
    expect(toml("nothing = |")).toBeNull()
    expect(toml("[font]\nlatin = |")).toBeNull()
  })

  it("describes a key in the language of the interface", () => {
    expect(toml("|")!.options.find((o) => o.label === "theme")!.info).toMatch(/Color theme/)
    expect(toml("|", { language: "fa" })!.options.find((o) => o.label === "theme")!.info).toMatch(/پالت/)
  })
})

describe("front matter", () => {
  it("finds the block", () => {
    expect(frontMatterEnd("---\na: 1\n---\nbody")).toBe(9)
    expect(frontMatterEnd("no front matter")).toBeNull()
    expect(inFrontMatter("---\na: 1\n---\nbody", 6)).toBe(true)
    expect(inFrontMatter("---\na: 1\n---\nbody", 16)).toBe(false)
  })

  it("suggests the settings and the blocks at the top level", () => {
    const result = yaml("---\n|")!
    expect(result.labels).toEqual(expect.arrayContaining(["theme", "feel", "dir", "header", "footer", "cover", "bibliography", "heading"]))
    expect(result.labels).not.toContain("source")
    expect(result.options.find((o) => o.label === "theme")!.template).toBe("theme: ")
    expect(result.options.find((o) => o.label === "header")!.template).toBe("header:\n  ${}")
  })

  it("leaves out keys that are already there", () => {
    const result = yaml("---\ntheme: ocean\nheader:\n  style: line\n|")!
    expect(result.labels).not.toContain("theme")
    expect(result.labels).not.toContain("header")
    expect(result.labels).toContain("cover")
  })

  it("suggests the keys of a block when indented under it", () => {
    const header = yaml("---\nheader:\n  |")!
    expect(header.labels).toEqual(expect.arrayContaining(["style", "start", "center", "end", "dir", "skip-first-page", "logo"]))
    expect(header.labels).not.toContain("theme")
    expect(header.labels).not.toContain("title")
    const cover = yaml("---\ncover:\n  type: x\n  |")!
    expect(cover.labels).toEqual(expect.arrayContaining(["title", "author", "supervisor", "frame"]))
    expect(cover.labels).not.toContain("type")
  })

  it("suggests the values of a key", () => {
    expect(yaml("---\ntheme: |")!.labels).toContain("midnight")
    expect(yaml("---\nheader:\n  style: |")!.labels).toEqual(["minimal", "line", "band", "double"])
    expect(yaml("---\nfooter:\n  style: |")!.labels).toEqual(["plain", "line"])
    expect(yaml("---\ncover:\n  frame: |")!.labels).toEqual(["true", "false"])
    expect(yaml("---\nbibliography:\n  style: |")!.labels).toEqual(expect.arrayContaining(["ieee", "apa"]))
  })

  it("completes a partly typed value", () => {
    const result = yaml("---\ntheme: mid|")!
    expect(result.source.slice(result.from)).toBe("mid")
  })

  it("works only inside the block, not in the document or in a comment", () => {
    expect(yaml("---\ntheme: ocean\n---\n|")).toBeNull()
    expect(yaml("---\n# the|")).toBeNull()
    expect(yaml("---\ntheme: ocean # mid|")).toBeNull()
  })
})
