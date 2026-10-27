import { StateEffect, StateField, type EditorState } from "@codemirror/state"
import { Decoration, EditorView, type DecorationSet } from "@codemirror/view"

export interface Problem {
  /** 1-based. */
  line: number
  severity: "error" | "warning"
  message: string
}

/** Replaces the problems the editor marks (those of the file it shows). */
export const setProblems = StateEffect.define<readonly Problem[]>()

const mark = (problem: Problem) => Decoration.line({ class: `cm-problem cm-problem-${problem.severity}`, attributes: { title: problem.message } })

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

export const problemExtension = [problemField, problemTheme]
