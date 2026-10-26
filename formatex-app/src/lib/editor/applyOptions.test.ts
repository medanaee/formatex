import { describe, expect, it } from "vitest"
import { editFor } from "./applyOptions"
import type { ConfigureRequest } from "./livePreview"

const anchor = {} as DOMRect
/** Applies an edit to a string, like the editor would. */
type Change = { from: number; to: number; insert: string }
const apply = (doc: string, edit: Change | Change[]) => {
  // Several changes are all written in the coordinates of the old text: apply them from the end
  const changes = Array.isArray(edit) ? [...edit].sort((a, b) => b.from - a.from) : [edit]
  return changes.reduce((text, change) => text.slice(0, change.from) + change.insert + text.slice(change.to), doc)
}

describe("a tag", () => {
  const request: ConfigureRequest = { kind: "tag", name: "alert", from: 0, to: 13, attrs: [["type", "tip"]], selfClosing: false, anchor }

  it("is rewritten with the new attributes, and keeps following its own edits", () => {
    const doc = '<alert type="tip">\nbody\n</alert>'
    const first = editFor({ ...request, to: 18 }, [["type", "info"], ["icon", "star"]], doc.length)
    const next = apply(doc, first.edit)
    expect(next).toBe('<alert type="info" icon="star">\nbody\n</alert>')
    // A second change replaces what the first wrote
    const second = editFor(first.next, [["type", "danger"]], next.length)
    expect(apply(next, second.edit)).toBe('<alert type="danger">\nbody\n</alert>')
  })
})

describe("a heading", () => {
  it("gets ` {...}` added at the end of the line, then changed, then removed", () => {
    let doc = "## Summary"
    let request: ConfigureRequest = { kind: "option", option: "heading", from: doc.length, to: doc.length, missing: true, attrs: [], anchor }
    let step = editFor(request, [["fill", "true"]], doc.length)
    doc = apply(doc, step.edit)
    expect(doc).toBe("## Summary {fill=true}")
    request = step.next
    step = editFor(request, [["fill", "true"], ["id", "sec"]], doc.length)
    doc = apply(doc, step.edit)
    expect(doc).toBe("## Summary {fill=true #sec}")
    request = step.next
    step = editFor(request, [], doc.length)
    doc = apply(doc, step.edit)
    expect(doc).toBe("## Summary")
    expect(step.next).toMatchObject({ missing: true })
  })
})

describe("a table", () => {
  const table = "| a | b |\n|---|---|\n| 1 | 2 |"

  it("gets a `{...}` line above it", () => {
    const request: ConfigureRequest = { kind: "option", option: "table", from: 0, to: 0, missing: true, attrs: [], anchor }
    const step = editFor(request, [["width", "full"]], table.length)
    expect(apply(table, step.edit)).toBe("{width=full}\n" + table)
  })

  it("has its `{...}` line rewritten and removed with its line break", () => {
    const doc = "{width=full}\n" + table
    const request: ConfigureRequest = { kind: "option", option: "table", from: 0, to: 12, missing: false, attrs: [["width", "full"]], anchor }
    const changed = editFor(request, [["width", "auto"], ["caption", "T"]], doc.length)
    expect(apply(doc, changed.edit)).toBe("{width=auto caption=T}\n" + table)
    const removed = editFor(request, [], doc.length)
    expect(apply(doc, removed.edit)).toBe(table)
  })
})

describe("a fenced code block", () => {
  it("is wrapped in a <code> tag by the first change, then the tag is rewritten", () => {
    const doc = "```js\nlet a\n```"
    const request: ConfigureRequest = { kind: "tag", name: "code", from: 0, to: 0, attrs: [], selfClosing: false, wrap: { from: 0, to: doc.length }, anchor }
    const first = editFor(request, [["highlight", "2"]], doc.length)
    const next = apply(doc, first.edit)
    expect(next).toBe('<code highlight="2">\n```js\nlet a\n```\n</code>')
    const second = editFor(first.next, [["highlight", "2"], ["caption", "Demo"]], next.length)
    expect(apply(next, second.edit)).toBe('<code highlight="2" caption="Demo">\n```js\nlet a\n```\n</code>')
  })
})

describe("a list", () => {
  it("gets a `{...}` line above it", () => {
    const doc = "- a\n- b"
    const request: ConfigureRequest = { kind: "option", option: "list", from: 0, to: 0, missing: true, attrs: [], anchor }
    expect(apply(doc, editFor(request, [["marker", "dash"]], doc.length).edit)).toBe("{marker=dash}\n- a\n- b")
  })
})
