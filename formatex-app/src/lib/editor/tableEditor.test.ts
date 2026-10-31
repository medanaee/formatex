// @vitest-environment happy-dom
import { expect, it } from "vitest"
import { markdown, markdownLanguage } from "@codemirror/lang-markdown"
import { EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { livePreview } from "./livePreview"

it("adding a row or a column draws it at once", () => {
  const doc = "# T\n\n| a | b |\n| --- | --- |\n| 1 | 2 |\n\ntext\n"
  const host = document.createElement("div")
  document.body.append(host)
  const view = new EditorView({ parent: host, state: EditorState.create({ doc, selection: { anchor: doc.length }, extensions: [markdown({ base: markdownLanguage }), livePreview(() => ({ tags: {} }) as never, () => {})] }) })
  view.dom.querySelector<HTMLElement>(".cm-lp-table-addrow")?.click()
  expect(view.dom.querySelectorAll("tbody tr").length).toBe(2)
  view.dom.querySelector<HTMLElement>(".cm-lp-table-addcolumn")?.click()
  expect(view.dom.querySelectorAll("thead th").length).toBe(3)
  expect(view.dom.querySelectorAll("tbody tr:last-child td").length).toBe(3)
})
