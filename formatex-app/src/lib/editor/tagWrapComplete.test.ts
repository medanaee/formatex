// @vitest-environment happy-dom
import { acceptCompletion, autocompletion, completionStatus, startCompletion } from "@codemirror/autocomplete"
import { EditorSelection, EditorState } from "@codemirror/state"
import { EditorView, runScopeHandlers } from "@codemirror/view"
import { describe, expect, it } from "vitest"
import { completionSource } from "./completionSource"
import { schema } from "./schema"
import { tagWrapOnType, wrapInTag } from "./tagWrap"

const NL = String.fromCharCode(10)
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function run(name: string, key = "", doc = "one two three", from = 4, to = 7) {
  const parent = document.createElement("div")
  document.body.appendChild(parent)
  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc,
      selection: EditorSelection.single(from, to),
      extensions: [tagWrapOnType(), autocompletion({ override: [completionSource(() => ({ schema, language: "en", files: [] }))], icons: false })],
    }),
  })
  view.dispatch(wrapInTag(view.state)!)
  for (const ch of name) {
    const head = view.state.selection.main.head
    view.dispatch({ changes: { from: head, insert: ch }, selection: EditorSelection.cursor(head + 1), userEvent: "input.type" })
  }
  startCompletion(view)
  await wait(400)
  const status = completionStatus(view.state)
  const accepted = key ? runScopeHandlers(view, new KeyboardEvent("keydown", { key, cancelable: true }), "editor") : acceptCompletion(view)
  await wait(20)
  const text = view.state.doc.toString()
  view.destroy()
  parent.remove()
  return { status, accepted, text }
}

describe("a tag name accepted from the list while wrapping", () => {
  it("is written into the closing tag", async () => {
    const plain = await run("kb")
    expect(plain.status).toBe("active")
    expect(plain.text).toBe("one <kbd>two</kbd> three")
    const withAttribute = await run("cit")
    expect(withAttribute.text).toContain("</cite>")
  })

  it("is written into the closing tag when the list is accepted with the Enter key", async () => {
    expect((await run("kb", "Enter")).text).toBe("one <kbd>two</kbd> three")
    // A selection over several lines, in a document with tags around it
    const doc = ["<alert type='tip'>", "first", "</alert>", "", "b c", "d", "", "end"].join(NL)
    const block = await run("kb", "Enter", doc, doc.indexOf("b c"), doc.indexOf("d" + NL + NL + "end") + 1)
    expect(block.text).toContain(["<kbd>", "b c", "d", "</kbd>"].join(NL))
  })
})
