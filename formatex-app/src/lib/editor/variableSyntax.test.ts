import { describe, expect, it } from "vitest"
import { expressionAt, expressionFold, findExpressions, maskText } from "./variableSyntax"

const slice = (text: string, ranges: [number, number][]) => ranges.map(([a, b]) => text.slice(a, b))

describe("findExpressions", () => {
  it("finds a printed name", () => {
    const text = "Term {{ year }} of the course"
    const [found] = findExpressions(text)
    expect(found).toMatchObject({ from: 5, to: 15, plain: true, inTag: false })
    expect(slice(text, found.code)).toEqual([" year "])
  })

  it("tells a name from code", () => {
    expect(findExpressions("{{ setting.chat.frame }}")[0].plain).toBe(true)
    expect(findExpressions("{{ year + 1 }}")[0].plain).toBe(false)
    expect(findExpressions('{{ if draft { "a" } else { "b" } }}')[0].plain).toBe(false)
  })

  it("closes at the right braces, however many a block has", () => {
    const text = "{{ if a { b }}} after"
    const [found] = findExpressions(text)
    expect(text.slice(found.from, found.to ?? 0)).toBe("{{ if a { b }}}")
  })

  it("takes several lines, and splits the code from the Markdown in [ ]", () => {
    const text = ["{{", '  if audience == "teacher" [', "    ## Key", "    * item {{ level }}", "  ] else [ Hi ]", "}}"].join("\n")
    const found = findExpressions(text)
    expect(found).toHaveLength(2)
    const [outer, inner] = found
    expect(outer.to).toBe(text.length)
    expect(slice(text, outer.markdown)[0]).toContain("## Key")
    // A `{{ }}` inside the Markdown is its own expression, and not part of the text around it
    expect(slice(text, outer.markdown).join("")).not.toContain("{{ level }}")
    // The code does not include the Markdown
    expect(slice(text, outer.code).join("")).not.toContain("## Key")
    expect(text.slice(inner.from, inner.to ?? 0)).toBe("{{ level }}")
    expect(inner.plain).toBe(true)
  })

  it("does not read the brackets and quotes of code and strings", () => {
    const text = '{{ "a ] }} [" + x }} tail'
    const [found] = findExpressions(text)
    expect(text.slice(found.from, found.to ?? 0)).toBe('{{ "a ] }} [" + x }}')
  })

  it("knows an expression in the value of an attribute", () => {
    const line = '<alert type="{{ if d { \'a\' } else { \'b\' } }}" title="{{ course }}">'
    expect(findExpressions(line).map((f) => f.inTag)).toEqual([true, true])
    expect(findExpressions('<alert type="info"> {{ year }}')[0].inTag).toBe(false)
  })

  it("finds the values of the page", () => {
    const text = "{{ PAGE + 1 }} of {{ PAGES }}"
    const found = findExpressions(text)
    expect(found.map((f) => slice(text, f.page))).toEqual([["PAGE"], ["PAGES"]])
  })

  it("leaves code, math, comments and escaped braces alone", () => {
    expect(findExpressions("`{{ year }}`")).toEqual([])
    expect(findExpressions("$x^{{n}}$")).toEqual([])
    expect(findExpressions("\\{{ year }}")).toEqual([])
    expect(findExpressions("<!-- {{ year }} -->")).toEqual([])
    expect(findExpressions("```\n{{ year }}\n```")).toEqual([])
    expect(findExpressions("`a` {{ year }}")).toHaveLength(1)
  })

  it("keeps an unfinished expression while typing", () => {
    const [found] = findExpressions("{{ year")
    expect(found.to).toBeNull()
  })
})

describe("maskText", () => {
  it("keeps the length and the lines", () => {
    const text = "a `b` $c$ <!-- d -->\n```\ne\n```\n$$\nf\n$$ g"
    const masked = maskText(text)
    expect(masked.length).toBe(text.length)
    expect(masked.split("\n").length).toBe(text.split("\n").length)
    expect(masked).not.toMatch(/[bcdef]/)
  })
})

describe("expressionAt", () => {
  it("finds the expression the cursor is in, and the code before it", () => {
    const text = "text {{ if a [\n  x ] else { b"
    const at = expressionAt(text, text.length)
    expect(at?.code.trim()).toContain("else { b")
    expect(at?.inMarkdown).toBe(false)
  })

  it("tells the Markdown inside [ ]", () => {
    const text = "{{ if a [ some **text"
    expect(expressionAt(text, text.length)?.inMarkdown).toBe(true)
  })

  it("is none outside an expression", () => {
    expect(expressionAt("{{ a }} text", 12)).toBeNull()
    expect(expressionAt("text", 2)).toBeNull()
  })
})

describe("expressionFold", () => {
  it("folds the lines between the first line and the closing braces", () => {
    const text = "{{\n  x\n  y\n}}\nafter"
    expect(expressionFold(text, 0, 2)).toEqual({ from: 2, to: text.indexOf("}}") - 1 })
  })

  it("does not fold an expression on one line or a closing line right below", () => {
    expect(expressionFold("{{ a }}", 0, 7)).toBeNull()
    expect(expressionFold("{{ a\n}}", 0, 4)).toBeNull()
  })
})

describe("comments", () => {
  it("ends a comment at the first --> outside a fenced block inside it", () => {
    const text = "<!--\n{{ a }}\n```mermaid\nA --> B {{ b }}\n```\n-->\n{{ c }}"
    expect(findExpressions(text).map((f) => text.slice(f.from, f.to ?? 0))).toEqual(["{{ c }}"])
    expect(findExpressions("a <!-- {{ b }} --> {{ c }}").map((f) => f.plain)).toEqual([true])
    expect(findExpressions("`<!--` {{ c }} --> {{ d }}")).toHaveLength(2)
  })
})
