import { StateEffect, StateField } from "@codemirror/state"
import { EditorView } from "@codemirror/view"

/** Native range selection starts only after the menu's Select text action. */
export const enableTouchSelection = StateEffect.define<boolean>()

export const touchSelecting = StateField.define<boolean>({
  create: () => false,
  update(active, transaction) {
    for (const effect of transaction.effects) if (effect.is(enableTouchSelection)) return effect.value
    return transaction.selection?.main.empty || transaction.docChanged ? false : active
  },
  provide: (field) => EditorView.contentAttributes.from(field, (active) => ({
    "data-touch-selecting": String(active),
  })),
})

export const touchSelection = [
  touchSelecting,
  EditorView.theme({
    '.cm-content[data-touch-selecting="false"]': { userSelect: "none", WebkitUserSelect: "none" },
    '.cm-content[data-touch-selecting="true"]': { userSelect: "text", WebkitUserSelect: "text" },
  }),
  EditorView.domEventHandlers({
    selectstart(event, view) {
      if (view.state.field(touchSelecting)) return false
      event.preventDefault()
      return true
    },
  }),
]

/** Run after the modal menu releases focus, so Android can keep its native selection handles. */
export function selectByTouch(view: EditorView, position: number): void {
  const word = view.state.wordAt(position)
  const line = view.state.doc.lineAt(position)
  view.dispatch({
    effects: enableTouchSelection.of(true),
    selection: { anchor: word?.from ?? line.from, head: word?.to ?? line.to },
    scrollIntoView: true,
  })
  view.focus()
}
