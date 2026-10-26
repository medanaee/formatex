import { describe, expect, it } from "vitest"
import { attrValue, parseOpenTag, parseOptions, serializeOpenTag, serializeOptions, withAttr } from "./tagSyntax"

describe("tags", () => {
  it("reads the name and the attributes in order", () => {
    expect(parseOpenTag('<alert type="tip" icon=\'lightbulb\' radius=6>')).toEqual({
      name: "alert",
      attrs: [["type", "tip"], ["icon", "lightbulb"], ["radius", "6"]],
      selfClosing: false,
    })
  })

  it("reads a self-closing tag, a bare attribute and a tag across lines", () => {
    expect(parseOpenTag('<img src="a.png" />')).toMatchObject({ name: "img", selfClosing: true, attrs: [["src", "a.png"]] })
    expect(parseOpenTag("<toc break>")!.attrs).toEqual([["break", "true"]])
    expect(parseOpenTag('<box\n  color="blue"\n  radius="4">')!.attrs).toEqual([["color", "blue"], ["radius", "4"]])
  })

  it("is not fooled by a > inside a value, and rejects other text", () => {
    expect(parseOpenTag('<a href="x">')!.attrs).toEqual([["href", "x"]])
    expect(parseOpenTag("not a tag")).toBeNull()
    expect(parseOpenTag("</alert>")).toBeNull()
  })

  it("writes a tag back, quoting every value", () => {
    expect(serializeOpenTag({ name: "alert", attrs: [["type", "tip"]], selfClosing: false })).toBe('<alert type="tip">')
    expect(serializeOpenTag({ name: "img", attrs: [["src", "a b.png"]], selfClosing: true })).toBe('<img src="a b.png" />')
    expect(serializeOpenTag({ name: "badge", attrs: [], selfClosing: false })).toBe("<badge>")
  })

  it("round-trips a tag with a quote in a value", () => {
    const written = serializeOpenTag({ name: "a", attrs: [["title", 'say "hi"']], selfClosing: false })
    expect(parseOpenTag(written)!.attrs).toEqual([["title", 'say "hi"']])
  })
})

describe("option lines", () => {
  it("reads keys, quoted values and the #id shorthand", () => {
    expect(parseOptions('width=full caption="A table with spaces" #tbl-main')).toEqual([
      ["width", "full"],
      ["caption", "A table with spaces"],
      ["id", "tbl-main"],
    ])
  })

  it("writes them back: quotes only when needed, the id last as #id", () => {
    expect(serializeOptions([["id", "sec-a"], ["numbering", "false"], ["caption", "Two words"]])).toBe('{numbering=false caption="Two words" #sec-a}')
    expect(serializeOptions([])).toBe("")
  })

  it("keeps attributes it does not know, in order", () => {
    const attrs = parseOptions("future=1 fill=true")
    expect(serializeOptions(withAttr(attrs, "fill", "false"))).toBe("{future=1 fill=false}")
  })
})

describe("editing attributes", () => {
  it("sets, changes and removes", () => {
    let attrs = withAttr([], "type", "tip")
    attrs = withAttr(attrs, "icon", "star")
    attrs = withAttr(attrs, "type", "info")
    expect(attrs).toEqual([["type", "info"], ["icon", "star"]])
    expect(withAttr(attrs, "type", "")).toEqual([["icon", "star"]])
    expect(attrValue(attrs, "icon")).toBe("star")
    expect(attrValue(attrs, "nope")).toBe("")
  })
})
