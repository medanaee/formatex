import { describe, expect, it } from "vitest"
import { complete, maskCode, openTags, type CompletionEnv } from "./completion"
import { schema } from "./schema"

const env: CompletionEnv = { schema, language: "en", files: ["main.md", "images/ocean.svg", "images/a.png", "notes.txt"] }

/** Completes at the `|` in `text`. */
function at(text: string, override: Partial<CompletionEnv> = {}) {
  const pos = text.indexOf("|")
  const source = text.slice(0, pos) + text.slice(pos + 1)
  const result = complete(source, pos, { ...env, ...override })
  return result && { ...result, source, labels: result.options.map((o) => o.label) }
}

describe("tag names", () => {
  it("suggests the tags after a `<`", () => {
    const result = at("Hello <|")!
    expect(result.from).toBe(7)
    expect(result.labels).toEqual(expect.arrayContaining(["alert", "box", "img", "grid"]))
  })

  it("keeps the typed letters inside the replaced range", () => {
    const result = at("<ale|")!
    expect(result.source.slice(result.from, 4)).toBe("ale")
  })

  it("inserts the closing tag, and the required attributes", () => {
    const alert = at("<|")!.options.find((o) => o.label === "alert")!
    expect(alert.template).toBe("alert>${}</alert>")
    const img = at("<|")!.options.find((o) => o.label === "img")!
    expect(img.template).toBe('img src="${}">')
    const cite = at("<|")!.options.find((o) => o.label === "cite")!
    expect(cite.template).toContain('key="${}"')
  })

  it("does not repeat a `>` that is already there", () => {
    const alert = at("<al|>")!.options.find((o) => o.label === "alert")!
    expect(alert.template).toBe("alert")
  })

  it("describes the tag in the language of the interface", () => {
    expect(at("<|")!.options.find((o) => o.label === "alert")!.info).toBe("callout with icon")
    expect(at("<|", { language: "fa" })!.options.find((o) => o.label === "alert")!.info).toBe("هشدار با آیکون")
  })

  it("offers a scoped tag only inside its parent, and puts the parent's children first", () => {
    expect(at("<|")!.labels).not.toContain("item")
    expect(at("<grid cols=\"2\">\n<|")!.labels).toContain("item")
    // <grid> takes only <item>
    expect(at("<grid>\n<|")!.labels).toEqual(["item"])
    expect(at("<steps>\n<|")!.labels).toContain("step")
    expect(at("<steps>\n<|")!.labels).not.toContain("item")
  })

  it("offers only the child tags inside a tag that takes nothing else", () => {
    expect(at("<steps>\n<|")!.labels).toEqual(["step"])
    expect(at("<compare>\n<|")!.labels.sort()).toEqual(["cons", "pros"])
    expect(at("<chat>\n<|")!.labels.sort()).toEqual(["ai", "user"])
    expect(at("<grid>\n<|")!.labels).toEqual(["item"])
  })

  it("still offers everything inside a tag whose children are ordinary tags too", () => {
    const labels = at("<fig>\n<|")!.labels
    expect(labels).toEqual(expect.arrayContaining(["caption", "img", "alert", "box"]))
  })

  it("offers any tag inside a child of an exclusive tag, and a scoped tag nowhere else", () => {
    const inside = at("<steps>\n<step>\n<|")!.labels
    expect(inside).toEqual(expect.arrayContaining(["alert", "box", "img"]))
    expect(inside).not.toContain("step")
    expect(at("<box>\n<|")!.labels).not.toEqual(expect.arrayContaining(["step", "pros", "item"]))
  })

  it("stays silent after a closed tag and for a lone `<` in prose", () => {
    expect(at("<alert>x</alert> |")).toBeNull()
    expect(at("a < b|")).toBeNull()
  })
})

describe("attributes", () => {
  it("suggests the attributes of the tag", () => {
    const result = at("<alert |")!
    expect(result.labels).toEqual(expect.arrayContaining(["type", "color", "icon", "radius"]))
    expect(result.options.find((o) => o.label === "type")!.template).toBe('type="${}"')
  })

  it("leaves out the attributes already written", () => {
    const result = at('<alert type="info" |')!
    expect(result.labels).not.toContain("type")
    expect(result.labels).toContain("color")
  })

  it("completes a partly typed name", () => {
    const result = at('<alert ty|')!
    expect(result.source.slice(result.from)).toBe("ty")
  })

  it("puts the required attributes first", () => {
    const result = at("<img |")!
    expect(result.options.find((o) => o.label === "src")!.boost).toBeGreaterThan(0)
  })

  it("works across lines", () => {
    expect(at('<alert\n  type="tip"\n  |')!.labels).not.toContain("type")
  })
})

describe("values", () => {
  it("suggests the values of an enum and closes the quote", () => {
    const result = at('<alert type="|')!
    expect(result.labels).toEqual(["note", "info", "tip", "success", "warning", "danger", "important"])
    expect(result.options[0].template).toBe('note"')
  })

  it("does not add a quote that is already there", () => {
    expect(at('<alert type="|">')!.options[0].template).toBe("note")
  })

  it("suggests true and false for a boolean", () => {
    expect(at('<toc break="|')?.labels ?? at('<todo |')?.labels).toBeTruthy()
    const booleanTag = Object.entries(schema.tags).find(([, spec]) => Object.values(spec.attrs).some((a) => a.type === "bool"))!
    const [tag, spec] = booleanTag
    const attr = Object.entries(spec.attrs).find(([, a]) => a.type === "bool")![0]
    expect(at(`<${tag} ${attr}="|`)!.labels).toEqual(["true", "false"])
  })

  it("suggests the project's files for a path, images first for an image tag", () => {
    const result = at('<img src="|')!
    expect(result.labels).toEqual(expect.arrayContaining(["images/ocean.svg", "notes.txt"]))
    const boost = (label: string) => result.options.find((o) => o.label === label)!.boost
    expect(boost("images/a.png")).toBeGreaterThan(boost("notes.txt")!)
  })

  it("knows an unquoted value", () => {
    expect(at("<alert type=|")!.labels).toContain("warning")
  })

  it("suggests nothing for a free-text attribute", () => {
    expect(at('<alert icon="|')).toBeNull()
  })
})

describe("closing tags", () => {
  it("suggests the innermost open tag first", () => {
    const result = at("<box>\n<alert>\ntext\n</|")!
    expect(result.labels).toEqual(["alert", "box"])
  })

  it("skips tags that are already closed and void tags", () => {
    expect(at('<box><img src="a.png"><alert>x</alert>\n</|')!.labels).toEqual(["box"])
  })

  it("is silent when nothing is open", () => {
    expect(at("</|")).toBeNull()
  })
})

describe("option lines", () => {
  it("completes the options of a heading", () => {
    const result = at("## Summary {|")!
    expect(result.labels).toEqual(expect.arrayContaining(["numbering", "toc", "fill"]))
    expect(result.options.find((o) => o.label === "toc")!.template).toBe("toc=${}")
  })

  it("completes the options of a table from the `{...}` line above it", () => {
    const result = at("{|}\n| a | b |\n|---|---|\n")!
    expect(result.labels).toEqual(expect.arrayContaining(["width", "caption", "span"]))
  })

  it("completes the options of a list", () => {
    expect(at("{|\n- one\n- two")!.labels).toContain("numbers")
  })

  it("completes the values of an option", () => {
    const result = at("{width=|\n| a |\n")!
    expect(result.labels).toEqual(["auto", "full"])
  })

  it("leaves out the options already written", () => {
    expect(at("## T {fill=true |")!.labels).not.toContain("fill")
  })

  it("does not treat braces in prose or math as options", () => {
    expect(at("Some {|")).toBeNull()
    expect(at("$$ e^{|")).toBeNull()
  })
})

describe("code and front matter", () => {
  it("is silent in a fenced code block", () => {
    expect(at("```html\n<|")).toBeNull()
    expect(at("```\n<alert |")).toBeNull()
  })

  it("works again after the fence", () => {
    expect(at("```\ncode\n```\n<|")).not.toBeNull()
  })

  it("is silent in inline code", () => {
    expect(at("Use `<|")).toBeNull()
  })

  it("is silent in the front matter", () => {
    expect(at("---\ntitle: <|")).toBeNull()
    expect(at("---\ntitle: x\n---\n<|")).not.toBeNull()
  })
})

describe("helpers", () => {
  it("masks code but keeps offsets", () => {
    const text = "a `<x>` b\n```\n<y>\n```\n<z>"
    const masked = maskCode(text)
    expect(masked.length).toBe(text.length)
    expect(masked).not.toContain("<x>")
    expect(masked).not.toContain("<y>")
    expect(masked).toContain("<z>")
  })

  it("keeps the open tags in order", () => {
    expect(openTags("<box><alert>", 12, schema).map((t) => t.name)).toEqual(["box", "alert"])
    expect(openTags("<box><alert></alert>", 20, schema).map((t) => t.name)).toEqual(["box"])
  })
})
