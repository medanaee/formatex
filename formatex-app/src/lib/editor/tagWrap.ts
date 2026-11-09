import { EditorSelection, EditorState, Prec, StateEffect, StateField, type Extension, type TransactionSpec } from "@codemirror/state"
import { EditorView, keymap } from "@codemirror/view"

/** Where the name of a tag being written stands: right after its `<`, and right after the `</` of its closing tag. */
interface TagLink {
  open: number
  close: number
}

const startLink = StateEffect.define<TagLink>()
const endLink = StateEffect.define<null>()

const NAME_CHAR = /[\w-]/

/** The end of the tag name that starts at `from`. */
function nameEnd(doc: { sliceString: (from: number, to?: number) => string; length: number }, from: number): number {
  let end = from
  while (end < doc.length && NAME_CHAR.test(doc.sliceString(end, end + 1))) end++
  return end
}

/**
 * A tag whose name is being typed, with its closing tag: the closing tag follows the name as it changes (like a code editor's linked
 * editing of `<div></div>`), until the cursor leaves the name (a space, `>`, Tab, Enter or a click elsewhere).
 */
const linkField = StateField.define<TagLink | null>({
  create: () => null,
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(startLink)) return effect.value
      if (effect.is(endLink)) return null
    }
    if (!value) return null
    const open = tr.changes.mapPos(value.open, -1)
    const close = tr.changes.mapPos(value.close, -1)
    const head = tr.state.selection.main.head
    if (head < open || head > nameEnd(tr.newDoc, open)) return null
    return { open, close }
  },
})

/** Wraps the selection in a tag whose name is still to be typed: `<|>selection</>`; a selection over several lines puts the tags on lines of their own. */
export function wrapInTag(state: EditorState): TransactionSpec | null {
  const range = state.selection.main
  if (state.selection.ranges.length !== 1 || range.empty) return null
  const doc = state.doc
  const block = doc.lineAt(range.from).number !== doc.lineAt(range.to).number
  const opening = block ? "<>\n" : "<>"
  const closing = block ? "\n</>" : "</>"
  return {
    changes: [
      { from: range.from, insert: opening },
      { from: range.to, insert: closing },
    ],
    selection: EditorSelection.cursor(range.from + 1),
    // The closing name stands after `</`, which is after the line break too when the tags have lines of their own
    effects: startLink.of({ open: range.from + 1, close: range.to + opening.length + (block ? 3 : 2) }),
    userEvent: "input.wrap",
    scrollIntoView: true,
  }
}

/** Where the cursor goes to leave the name: after the `>` that closes the opening tag. */
function afterOpening(state: EditorState): number | null {
  const link = state.field(linkField, false)
  if (!link) return null
  const end = nameEnd(state.doc, link.open)
  return state.doc.sliceString(end, end + 1) === ">" ? end + 1 : end
}

/**
 * Typing `<` over a selection writes a tag around it, with the cursor in its name; what is typed there goes into the closing tag too.
 * Typing `>`, Tab or Enter leaves the name.
 */
export function tagWrapOnType(): Extension {
  return [
    linkField,
    // The closing tag takes the name of the opening one
    EditorState.transactionFilter.of((tr) => {
      const link = tr.startState.field(linkField, false)
      if (!link || !tr.docChanged) return tr
      const open = tr.changes.mapPos(link.open, -1)
      const close = tr.changes.mapPos(link.close, -1)
      const name = tr.newDoc.sliceString(open, nameEnd(tr.newDoc, open))
      const closeEnd = nameEnd(tr.newDoc, close)
      if (tr.newDoc.sliceString(close, closeEnd) === name || tr.newDoc.sliceString(close - 2, close) !== "</") return tr
      return [tr, { changes: { from: close, to: closeEnd, insert: name }, sequential: true }]
    }),
    EditorView.inputHandler.of((view, from, to, text) => {
      const main = view.state.selection.main
      if (text === "<" && from !== to && from === main.from && to === main.to) {
        const spec = wrapInTag(view.state)
        if (!spec) return false
        view.dispatch(spec)
        return true
      }
      // `>` typed in the name goes over the one that is already there
      if (text === ">" && from === to) {
        const target = afterOpening(view.state)
        if (target !== null && view.state.doc.sliceString(from, from + 1) === ">") {
          view.dispatch({ selection: EditorSelection.cursor(target), effects: endLink.of(null) })
          return true
        }
      }
      return false
    }),
    Prec.high(
      keymap.of([
        {
          key: "Tab",
          run: (view) => {
            const target = afterOpening(view.state)
            if (target === null) return false
            view.dispatch({ selection: EditorSelection.cursor(target), effects: endLink.of(null) })
            return true
          },
        },
        {
          key: "Enter",
          run: (view) => {
            const target = afterOpening(view.state)
            if (target === null) return false
            view.dispatch({ selection: EditorSelection.cursor(target), effects: endLink.of(null) })
            return true
          },
        },
        {
          key: "Escape",
          run: (view) => {
            if (!view.state.field(linkField, false)) return false
            view.dispatch({ effects: endLink.of(null) })
            return true
          },
        },
      ]),
    ),
  ]
}
