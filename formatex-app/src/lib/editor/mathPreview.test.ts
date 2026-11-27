// @vitest-environment happy-dom
import { EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { describe, expect, it } from "vitest"
import { livePreview } from "./livePreview"

function preview(doc: string) {
  const host = document.createElement("div")
  document.body.append(host)
  const view = new EditorView({
    parent: host,
    state: EditorState.create({
      doc,
      selection: { anchor: doc.length },
      extensions: [livePreview(() => ({ tags: {}, options: {} }) as never, () => {})],
    }),
  })
  return {
    host,
    destroy() {
      view.destroy()
      host.remove()
    },
  }
}

describe("live math preview", () => {
  it("draws a Typst equation with Typlet and a LaTeX equation with KaTeX", () => {
    const typst = preview("%% x^2 %%\n\nnext")
    expect(typst.host.querySelector(".typlet")).not.toBeNull()
    typst.destroy()
    const latex = preview("$$\nx^2\n$$\n\nnext")
    expect(latex.host.querySelector(".katex")).not.toBeNull()
    latex.destroy()
  })
})
