import { EditorSelection } from "@codemirror/state"
import type { EditorView } from "@codemirror/view"

/**
 * The editing commands of the format bar and the keyboard shortcuts, on a CodeMirror view. Each returns `true` (they are used
 * as key handlers). They work on the selection, or on the word at the cursor, and toggle: applying bold to bold text removes it.
 */

/** Wraps the selection in `mark` (`**` for bold). With nothing selected the word at the cursor is wrapped, else a placeholder. */
export function toggleWrap(view: EditorView, before: string, after = before): boolean {
  const { state } = view
  view.dispatch(
    state.changeByRange((range) => {
      let { from, to } = range
      if (from === to) {
        const word = state.wordAt(from)
        if (word) ({ from, to } = word)
      }
      const doc = state.doc
      const inside = doc.sliceString(from, to)
      const marked = doc.sliceString(Math.max(0, from - before.length), from) === before && doc.sliceString(to, to + after.length) === after
      // Already wrapped, just outside the selection: take the marks off
      if (marked) {
        return {
          changes: [
            { from: from - before.length, to: from },
            { from: to, to: to + after.length },
          ],
          range: EditorSelection.range(from - before.length, to - before.length),
        }
      }
      // Wrapped inside the selection: take them off
      if (inside.length >= before.length + after.length && inside.startsWith(before) && inside.endsWith(after)) {
        const core = inside.slice(before.length, inside.length - after.length)
        return { changes: { from, to, insert: core }, range: EditorSelection.range(from, from + core.length) }
      }
      const text = inside || ""
      return {
        changes: { from, to, insert: before + text + after },
        // With text: select it, inside the marks. Without: the cursor sits between the marks.
        range: EditorSelection.range(from + before.length, from + before.length + text.length),
      }
    })
  )
  view.focus()
  return true
}

/** Puts `prefix` at the start of every selected line, or takes it off when all of them have it. `prefix` may be a function of the line index. */
export function toggleLinePrefix(view: EditorView, prefix: (index: number) => string, matches: RegExp): boolean {
  const { state } = view
  const lines: { from: number; text: string }[] = []
  const seen = new Set<number>()
  for (const range of state.selection.ranges) {
    for (let pos = state.doc.lineAt(range.from).from; pos <= range.to; ) {
      const line = state.doc.lineAt(pos)
      if (!seen.has(line.from)) {
        seen.add(line.from)
        lines.push({ from: line.from, text: line.text })
      }
      pos = line.to + 1
    }
  }
  const allHave = lines.every((line) => matches.test(line.text))
  view.dispatch({
    changes: lines.map((line, index) => {
      const existing = matches.exec(line.text)
      if (allHave) return { from: line.from, to: line.from + (existing?.[0].length ?? 0) }
      // Replace another prefix of the same family (a heading level, a bullet) instead of stacking
      return { from: line.from, to: line.from + (existing?.[0].length ?? 0), insert: prefix(index) }
    }),
  })
  view.focus()
  return true
}

/** A heading of the given level on the current lines (another level is replaced); level 0, or the same level again, makes them plain. */
export function setHeading(view: EditorView, level: number): boolean {
  const { state } = view
  const lines: { from: number; text: string }[] = []
  const seen = new Set<number>()
  for (const range of state.selection.ranges) {
    for (let pos = state.doc.lineAt(range.from).from; pos <= range.to; ) {
      const line = state.doc.lineAt(pos)
      if (!seen.has(line.from)) {
        seen.add(line.from)
        lines.push({ from: line.from, text: line.text })
      }
      pos = line.to + 1
    }
  }
  const current = (text: string) => /^(#{1,6})\s+/.exec(text)?.[1].length ?? 0
  const plain = level === 0 || lines.every((line) => current(line.text) === level)
  view.dispatch({
    changes: lines.map((line) => ({
      from: line.from,
      to: line.from + (/^#{1,6}\s+/.exec(line.text)?.[0].length ?? 0),
      insert: plain ? "" : `${"#".repeat(level)} `,
    })),
  })
  view.focus()
  return true
}

export const toggleBullets = (view: EditorView) => toggleLinePrefix(view, () => "- ", /^\s*[-*+]\s+/)
export const toggleNumbers = (view: EditorView) => toggleLinePrefix(view, (index) => `${index + 1}. `, /^\s*\d+[.)]\s+/)
export const toggleQuote = (view: EditorView) => toggleLinePrefix(view, () => "> ", /^>\s?/)

/** Inserts text at the cursor (replacing the selection). `cursor` is where the cursor goes, counted from the start of the text. */
export function insertText(view: EditorView, text: string, cursor = text.length): boolean {
  const { from, to } = view.state.selection.main
  view.dispatch({ changes: { from, to, insert: text }, selection: { anchor: from + cursor }, scrollIntoView: true })
  view.focus()
  return true
}

export function insertLink(view: EditorView): boolean {
  const { from, to } = view.state.selection.main
  const label = view.state.doc.sliceString(from, to)
  const text = `[${label}](https://)`
  // With a label the cursor goes into the address; without, into the label
  return insertText(view, text, label ? text.length - 1 : 1)
}

export function insertCodeBlock(view: EditorView): boolean {
  const { from, to } = view.state.selection.main
  const code = view.state.doc.sliceString(from, to)
  const text = `\n\`\`\`\n${code}\n\`\`\`\n`
  return insertText(view, text, 5 + code.length)
}

/** A Markdown table of `rows` body rows and `columns` columns, with a header row. The cursor goes to the first header cell. */
export function insertTable(view: EditorView, rows: number, columns: number): boolean {
  const cell = (text: string) => ` ${text} `
  const header = `|${Array.from({ length: columns }, (_, c) => cell(`Column ${c + 1}`)).join("|")}|`
  const rule = `|${Array.from({ length: columns }, () => "---").join("|")}|`
  const body = Array.from({ length: rows }, () => `|${Array.from({ length: columns }, () => "  ").join("|")}|`)
  const { from } = view.state.selection.main
  const atLineStart = from === view.state.doc.lineAt(from).from
  const text = `${atLineStart ? "" : "\n"}${[header, rule, ...body].join("\n")}\n`
  return insertText(view, text, (atLineStart ? 0 : 1) + 2)
}
