import type { markdown } from "@codemirror/lang-markdown"
import { parseMixed } from "@lezer/common"
import type { BlockContext, Element, Line, MarkdownConfig } from "@lezer/markdown"
import { typstLanguage } from "./typstLanguage"

type MarkdownExtensions = NonNullable<Parameters<typeof markdown>[0]>["extensions"]

const TYPST_COMPONENTS = new Set(["typ", "cetz", "lilaq"])
const RAW_COMPONENTS = new Set(["typ", "cetz", "lilaq", "tree"])
const OPEN_RAW_RE = /^<(typ|cetz|lilaq|tree)(?=[\s>/])((?:"[^"\n]*"|'[^'\n]*'|[^<>])*)>/

function closingPattern(name: string): RegExp {
  return new RegExp(`</${name}(?=[\\s>])[^<>]*>`)
}

function matchRawOpen(line: Line): { name: string; length: number; rest: string } | null {
  const slice = line.text.slice(line.pos)
  const open = OPEN_RAW_RE.exec(slice)
  if (!open) return null
  const [, name, attrs] = open
  if (!RAW_COMPONENTS.has(name) || attrs.trimEnd().endsWith("/")) return null
  const rest = slice.slice(open[0].length)
  if (closingPattern(name).test(rest)) return null
  return { name, length: open[0].length, rest }
}

function parseRawComponent(cx: BlockContext, line: Line): boolean {
  const open = matchRawOpen(line)
  if (!open) return false
  const bodyNode = TYPST_COMPONENTS.has(open.name) ? "TypstCodeLine" : "RawTextLine"
  const from = cx.lineStart + line.pos
  const openTo = from + open.length
  const children: Element[] = [cx.elt("HTMLTag", from, openTo)]
  const bodyRanges: [number, number][] = []
  const pushBody = (start: number, end: number) => {
    if (end <= start) return
    const prev = bodyRanges.at(-1)
    if (prev && prev[1] === start) prev[1] = end
    else bodyRanges.push([start, end])
  }

  let hasBody = false
  if (open.rest.trim().length > 0) {
    pushBody(openTo, cx.lineStart + line.text.length)
    hasBody = true
  }

  const closeRe = closingPattern(open.name)
  while (cx.nextLine()) {
    for (const marker of line.markers) children.push(marker)
    const slice = line.text.slice(line.pos)
    const closeMatch = closeRe.exec(slice)
    if (closeMatch) {
      const closeFrom = cx.lineStart + line.pos + closeMatch.index
      const closeTo = closeFrom + closeMatch[0].length
      const contentFrom = cx.lineStart + line.basePos
      if (closeFrom > contentFrom && line.text.slice(line.basePos, line.pos + closeMatch.index).trim().length > 0) {
        if (hasBody) pushBody(cx.lineStart - 1, cx.lineStart)
        pushBody(contentFrom, closeFrom)
      }
      children.push(cx.elt("HTMLTag", closeFrom, closeTo))
      const afterClose = slice.slice(closeMatch.index + closeMatch[0].length)
      if (afterClose.trim().length > 0) {
        children.push(...cx.parser.parseInline(afterClose, closeTo))
      }
      cx.nextLine()
      break
    }
    if (hasBody) pushBody(cx.lineStart - 1, cx.lineStart)
    hasBody = true
    const contentFrom = cx.lineStart + line.basePos
    const contentTo = cx.lineStart + line.text.length
    if (contentTo > contentFrom) pushBody(contentFrom, contentTo)
  }

  for (const [start, end] of bodyRanges) children.push(cx.elt(bodyNode, start, end))
  children.sort((a, b) => a.from - b.from || a.to - b.to)
  cx.addElement(cx.elt("RawComponent", from, cx.prevLineEnd(), children))
  return true
}

/**
 * Keeps `<typ>`, `<cetz>`, `<lilaq>` and `<tree>` blocks out of CommonMark's HTML-block and fenced-code rules,
 * so fenced ``` inside them or blank lines never break syntax highlighting for the rest of the document.
 */
export const rawComponentMarkdown: MarkdownExtensions = {
  defineNodes: [
    { name: "RawComponent", block: true },
    { name: "TypstCodeLine" },
    { name: "RawTextLine" },
  ],
  parseBlock: [
    {
      name: "RawComponent",
      before: "HTMLBlock",
      parse: parseRawComponent,
      endLeaf: (_cx, line) => matchRawOpen(line) !== null,
    },
  ],
  wrap: parseMixed((node) => {
    if (node.name !== "RawComponent" || !node.node.getChild("TypstCodeLine")) return null
    return {
      parser: typstLanguage.parser,
      overlay: (child) => child.name === "TypstCodeLine",
    }
  }),
} satisfies MarkdownConfig
