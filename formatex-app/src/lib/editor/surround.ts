import { EditorSelection, type EditorState, type TransactionSpec } from "@codemirror/state"
import { EditorView } from "@codemirror/view"

/** What typed over a selection goes around it: the opening mark and the one that closes it. */
const PAIRS: Readonly<Record<string, string>> = { "(": ")", "[": "]", "{": "}", '"': '"', "'": "'", "`": "`", $: "$" }

/**
 * A selection stays and is wrapped when a bracket or a quote is typed over it, as in VS Code: `(` around `word` gives `(word)` with
 * `word` still selected, so a second mark wraps it again. `null` when nothing is selected or the key is not one of these marks.
 * Every selection of a multi-cursor is wrapped.
 */
export function surroundSelection(state: EditorState, typed: string): TransactionSpec | null {
  const close = PAIRS[typed]
  if (close === undefined || state.selection.ranges.every((range) => range.empty)) return null
  return {
    ...state.changeByRange((range) =>
      range.empty
        ? { range }
        : {
            changes: [
              { from: range.from, insert: typed },
              { from: range.to, insert: close },
            ],
            range: EditorSelection.range(range.from + typed.length, range.to + typed.length),
          }
    ),
    userEvent: "input.surround",
    scrollIntoView: true,
  }
}

/** The key press that would replace the selection wraps it instead. */
export const surroundOnType = EditorView.inputHandler.of((view, from, to, text) => {
  const main = view.state.selection.main
  if (from === to || from !== main.from || to !== main.to) return false
  const spec = surroundSelection(view.state, text)
  if (!spec) return false
  view.dispatch(spec)
  return true
})
