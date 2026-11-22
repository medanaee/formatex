import { markdown, markdownLanguage } from "@codemirror/lang-markdown"
import { ensureSyntaxTree } from "@codemirror/language"
import { EditorState } from "@codemirror/state"
import { describe, expect, it } from "vitest"
import { rawComponentMarkdown } from "./rawComponentMarkdown"

function parse(doc: string) {
  const state = EditorState.create({
    doc,
    extensions: [markdown({ base: markdownLanguage, extensions: rawComponentMarkdown })],
  })
  const tree = ensureSyntaxTree(state, doc.length, 1000)
  expect(tree).not.toBeNull()
  const names: string[] = []
  tree!.iterate({
    enter(node) {
      names.push(node.name)
    },
  })
  return { tree: tree!, names }
}

describe("rawComponentMarkdown", () => {
  it("keeps fenced backticks and blank lines inside <typ> from breaking Markdown below", () => {
    const doc = [
      "<align>",
      "",
      "<typ>",
      "```",
      '#import "@preview/cetz:0.3.4"',
      "",
      "content((0, 0))[done]",
      "```",
      "",
      "</typ>",
      "",
      "</align>",
      "",
      "## Next Section",
      "",
      "**normal bold**",
    ].join("\n")

    const { names } = parse(doc)
    expect(names).toContain("RawComponent")
    expect(names).not.toContain("FencedCode")
    expect(names).toContain("ATXHeading2")
    expect(names).toContain("StrongEmphasis")
  })

  it("handles <cetz>, <lilaq> and <tree> blocks as well as self-closing tags", () => {
    const doc = [
      '<cetz src="diagram.typ" />',
      "",
      "<tree>",
      "```",
      "src/",
      "",
      "  main.ts",
      "```",
      "</tree>",
      "",
      "*after*",
    ].join("\n")

    const { names } = parse(doc)
    expect(names.filter((name) => name === "RawComponent")).toHaveLength(1)
    expect(names).not.toContain("FencedCode")
    expect(names).toContain("Emphasis")
  })
})
