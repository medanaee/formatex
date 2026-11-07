import { codeFolding, foldGutter, foldKeymap, foldService } from "@codemirror/language"
import type { Extension, Text } from "@codemirror/state"
import type { KeyBinding } from "@codemirror/view"
import { expressionFold } from "./variableSyntax"

/** How far below an opening tag its closing tag is looked for. */
const MAX_LINES = 5000

/**
 * The text a tag folds away, as in a code editor: a tag on a line of its own (`<alert type="info">`) folds the lines below it up to the
 * line before its closing tag, which stays visible (`</alert>`). The closing tag is the one that matches: tags of the same name inside are
 * counted. `null` when the line does not open a tag, the tag closes on the same line or has nothing to hide, or is never closed.
 */
export function tagFoldRange(doc: Text, lineNumber: number): { from: number; to: number } | null {
  const line = doc.line(lineNumber)
  const open = /^\s*<([A-Za-z][\w-]*)(?:\s[^<>]*)?>\s*$/.exec(line.text)
  if (!open || /\/>\s*$/.test(line.text)) return null
  const name = open[1]
  // Opening and closing tags of that name, in the order they stand: `<name ...>`, `<name ... />` (alone), `</name>`
  const tag = new RegExp(`<(/?)${name}(?=[\\s>/])[^<>]*?(/?)>`, "g")
  let depth = 1
  const last = Math.min(doc.lines, lineNumber + MAX_LINES)
  for (let n = lineNumber + 1; n <= last; n++) {
    tag.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = tag.exec(doc.line(n).text))) {
      if (match[1] === "/") depth--
      else if (match[2] !== "/") depth++
      if (depth === 0) return n - 1 > lineNumber ? { from: line.to, to: doc.line(n - 1).to } : null
    }
  }
  return null
}

const SVG = "http://www.w3.org/2000/svg"

/** The marker beside a line that can fold: a chevron, down when the lines are shown and to the end side when they are folded. */
function foldMarker(open: boolean): HTMLElement {
  const marker = document.createElement("span")
  marker.className = open ? "cm-fold-marker cm-fold-open" : "cm-fold-marker cm-fold-closed"
  const svg = document.createElementNS(SVG, "svg")
  svg.setAttribute("viewBox", "0 0 24 24")
  svg.setAttribute("width", "14")
  svg.setAttribute("height", "14")
  svg.setAttribute("fill", "none")
  svg.setAttribute("stroke", "currentColor")
  svg.setAttribute("stroke-width", "2.5")
  svg.setAttribute("stroke-linecap", "round")
  svg.setAttribute("stroke-linejoin", "round")
  const path = document.createElementNS(SVG, "path")
  path.setAttribute("d", "m9 18 6-6-6-6")
  svg.append(path)
  marker.append(svg)
  return marker
}

/** Tags fold and unfold with a marker beside the line (and Ctrl+Shift+[ / ]), like a code editor's blocks. Fenced code blocks, headings and lists fold through the Markdown language itself. */
export function tagFolding(): Extension {
  return [
    foldService.of((state, lineStart) => {
      const line = state.doc.lineAt(lineStart)
      return tagFoldRange(state.doc, line.number) ?? expressionFold(state.doc.toString(), line.from, line.to)
    }),
    codeFolding({ placeholderText: "⋯" }),
    foldGutter({ markerDOM: foldMarker }),
  ]
}

/** The keys that fold and unfold: Ctrl+Shift+[ and ], and all of them with Ctrl+Alt+[ and ]. */
export const tagFoldingKeymap: readonly KeyBinding[] = foldKeymap
