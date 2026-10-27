import { StateEffect, StateField, type EditorState } from "@codemirror/state"
import { Decoration, EditorView, hoverTooltip, type DecorationSet, type Tooltip } from "@codemirror/view"

export interface Problem {
  /** 1-based. */
  line: number
  severity: "error" | "warning"
  message: string
}

/** Replaces the problems the editor marks (those of the file it shows). */
export const setProblems = StateEffect.define<readonly Problem[]>()

// The problem stays in the decoration's spec, for the tooltip: a `title` would be the browser's own box
const mark = (problem: Problem) => Decoration.line({ class: `cm-problem cm-problem-${problem.severity}`, problem })

/** The marked lines, as line decorations: they move with the text while it is edited, until the next compilation replaces them. */
export const problemField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(value, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(setProblems)) {
        const doc = transaction.state.doc
        const ranges = effect.value
          .filter((problem) => problem.line >= 1 && problem.line <= doc.lines)
          .map((problem) => ({ problem, from: doc.line(problem.line).from }))
          .sort((a, b) => a.from - b.from || (a.problem.severity === "error" ? -1 : 1))
          // One mark per line: the first (an error before a warning) stays
          .filter((entry, index, all) => index === 0 || entry.from !== all[index - 1].from)
          .map(({ problem, from }) => mark(problem).range(from))
        return Decoration.set(ranges)
      }
    }
    return transaction.docChanged ? value.map(transaction.changes) : value
  },
  provide: (field) => EditorView.decorations.from(field),
})

/** The lines marked now, with their severity (for the minimap). */
export function markedLines(state: EditorState): { line: number; severity: "error" | "warning" }[] {
  const out: { line: number; severity: "error" | "warning" }[] = []
  state.field(problemField, false)?.between(0, state.doc.length, (from, _to, value) => {
    out.push({ line: state.doc.lineAt(from).number, severity: value.spec.class.includes("-error") ? "error" : "warning" })
  })
  return out
}

export const problemTheme = EditorView.baseTheme({
  ".cm-problem-error": {
    backgroundColor: "color-mix(in oklab, var(--destructive) 16%, transparent)",
    boxShadow: "inset 2px 0 0 var(--destructive)",
  },
  ".cm-problem-warning": {
    backgroundColor: "color-mix(in oklab, var(--foreground) 7%, transparent)",
    boxShadow: "inset 2px 0 0 var(--muted-foreground)",
  },
})

const ICONS = {
  error: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
  warning: '<path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3"/><path d="M12 9v4M12 17h.01"/>',
}

/** A tooltip over a marked line (the whole line, also past its last letter): the problem's message, in the look of the app's menus. */
const problemTooltip = hoverTooltip(
  (view, pos): Tooltip | null => {
    const line = view.state.doc.lineAt(pos)
    const here: Problem[] = []
    view.state.field(problemField, false)?.between(line.from, line.from, (_from, _to, value) => {
      const problem = (value.spec as { problem?: Problem }).problem
      if (problem) here.push(problem)
    })
    const found = here[0]
    if (!found) return null
    return {
      pos: line.from,
      end: line.to,
      above: true,
      create() {
        const dom = document.createElement("div")
        dom.className = `cm-problem-tip cm-problem-tip-${found.severity}`
        const icon = document.createElement("span")
        icon.className = "cm-problem-tip-icon"
        icon.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[found.severity]}</svg>`
        const text = document.createElement("span")
        text.className = "cm-problem-tip-text"
        text.dir = "auto"
        text.textContent = found.message
        dom.append(icon, text)
        return { dom }
      },
    }
  },
  { hoverTime: 150 }
)

const tooltipTheme = EditorView.baseTheme({
  ".cm-tooltip.cm-tooltip-hover": {
    border: "none",
    background: "transparent",
    // Over the minimap and the panels of the editor
    zIndex: "400",
  },
  ".cm-problem-tip": {
    display: "flex",
    alignItems: "flex-start",
    gap: "6px",
    maxWidth: "min(420px, 70vw)",
    padding: "6px 10px",
    borderRadius: "10px",
    boxShadow: "0 0 0 1px color-mix(in oklab, var(--foreground) 10%, transparent), 0 6px 20px rgba(0, 0, 0, 0.18)",
    backgroundColor: "color-mix(in oklab, var(--popover) 72%, transparent)",
    backdropFilter: "blur(16px) saturate(1.5)",
    color: "var(--popover-foreground)",
    fontFamily: "Inter, Vazirmatn, system-ui, sans-serif",
    fontSize: "12px",
    lineHeight: "1.5",
  },
  ".cm-problem-tip-icon": { display: "inline-flex", flexShrink: "0", marginTop: "2px" },
  ".cm-problem-tip-error .cm-problem-tip-icon": { color: "var(--destructive)" },
  ".cm-problem-tip-warning .cm-problem-tip-icon": { color: "var(--muted-foreground)" },
  ".cm-problem-tip-text": { minWidth: "0", overflowWrap: "anywhere" },
})

export const problemExtension = [problemField, problemTheme, problemTooltip, tooltipTheme]
