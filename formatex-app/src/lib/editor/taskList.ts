import type { ChangeSpec } from "@codemirror/state"
import type { EditorView, KeyBinding } from "@codemirror/view"

const TASK_LINE_RE = /^([ \t]*)(?:[-*+][ \t]+)?\[[ xX]\](?:[ \t]|$)/
const BARE_TASK_RE = /^([ \t]*)\[[ xX]\]([ \t]*)(.*)$/

function selectedLines(view: EditorView) {
  const seen = new Set<number>()
  const lines = []
  for (const range of view.state.selection.ranges) {
    const start = view.state.doc.lineAt(range.from).number
    const end = view.state.doc.lineAt(range.to).number
    for (let n = start; n <= end; n++) {
      if (seen.has(n)) continue
      seen.add(n)
      lines.push(view.state.doc.line(n))
    }
  }
  return lines
}

/** Indents task-list lines with a Tab at line start so `Tab` anywhere on a task turns it into a subtask. */
function indentTaskLine(view: EditorView): boolean {
  const lines = selectedLines(view)
  if (lines.length === 0 || !lines.every((line) => TASK_LINE_RE.test(line.text))) return false
  const changes: ChangeSpec[] = lines.map((line) => ({ from: line.from, insert: "\t" }))
  view.dispatch({ changes, userEvent: "input.indent" })
  return true
}

/** Outdents task-list lines by one Tab (or up to 2 leading spaces) on `Shift-Tab`. */
function outdentTaskLine(view: EditorView): boolean {
  const lines = selectedLines(view)
  if (lines.length === 0 || !lines.every((line) => TASK_LINE_RE.test(line.text))) return false
  const changes: ChangeSpec[] = []
  for (const line of lines) {
    if (line.text.startsWith("\t")) changes.push({ from: line.from, to: line.from + 1 })
    else if (line.text.startsWith("  ")) changes.push({ from: line.from, to: line.from + 2 })
    else if (line.text.startsWith(" ")) changes.push({ from: line.from, to: line.from + 1 })
  }
  if (changes.length === 0) return false
  view.dispatch({ changes, userEvent: "delete.dedent" })
  return true
}

/** Continues `[ ] ...` task lines on `Enter` with the same indentation; exits on an empty task line. */
function continueBareTask(view: EditorView): boolean {
  const { selection, doc } = view.state
  if (selection.ranges.length !== 1 || !selection.main.empty) return false
  const head = selection.main.head
  const line = doc.lineAt(head)
  const match = BARE_TASK_RE.exec(line.text)
  if (!match) return false
  const indent = match[1] ?? ""
  const afterMarker = line.from + indent.length + 3
  if (head < afterMarker) return false
  const rest = (match[3] ?? "").trim()
  if (!rest && head === line.to) {
    view.dispatch({ changes: { from: line.from, to: line.to, insert: "" }, selection: { anchor: line.from }, userEvent: "input" })
    return true
  }
  const insert = `\n${indent}[ ] `
  view.dispatch({ changes: { from: head, to: head, insert }, selection: { anchor: head + insert.length }, userEvent: "input" })
  return true
}

export const taskListKeymap: readonly KeyBinding[] = [
  { key: "Tab", run: indentTaskLine },
  { key: "Shift-Tab", run: outdentTaskLine },
  { key: "Enter", run: continueBareTask },
]
