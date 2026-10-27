import { useRef, type ReactNode } from "react"
import { startCompletion } from "@codemirror/autocomplete"
import { redo, selectAll, undo } from "@codemirror/commands"
import { Bold, Clipboard, Code, Copy, Italic, Link2, MousePointer2, Redo2, Scissors, TextSelect, Undo2, Tags } from "lucide-react"
import { useTranslation } from "react-i18next"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuShortcut, ContextMenuTrigger } from "@/components/ui/context-menu"
import { copySelection, cutSelection, pasteClipboard } from "@/lib/editor/clipboard"
import { insertLink, insertText, toggleWrap } from "@/lib/editor/format"
import { desktopOs, hasFinePointer } from "@/lib/platform"
import { useEditorViewStore } from "@/stores/useEditorViewStore"

/** The right-click menu of the text editor: history, clipboard, selection, and for Markdown the formatting tools. */
export function EditorContextMenu({ markdown, children }: { markdown: boolean; children: ReactNode }) {
  const { t } = useTranslation()
  const view = useEditorViewStore((state) => state.view)
  const canUndo = useEditorViewStore((state) => state.canUndo)
  const canRedo = useEditorViewStore((state) => state.canRedo)
  const mod = desktopOs() === "macos" ? "⌘" : "Ctrl+"
  // Where the finger or the mouse last went down: "Select" works from there
  const point = useRef<{ x: number; y: number } | null>(null)
  const touch = !hasFinePointer()

  /** Selects the word (or, on a blank, the line) under the last press: the start of selecting by touch, which a long press cannot do here. */
  const selectHere = () => {
    if (!view || !point.current) return
    const position = view.posAtCoords(point.current) ?? view.state.selection.main.head
    const word = view.state.wordAt(position)
    const line = view.state.doc.lineAt(position)
    view.dispatch({ selection: word ? { anchor: word.from, head: word.to } : { anchor: line.from, head: line.to }, scrollIntoView: true })
    view.focus()
  }

  const keepFocus = { onCloseAutoFocus: (event: Event) => event.preventDefault() }

  const run = (command: (target: NonNullable<typeof view>) => unknown) => () => {
    if (!view) return
    command(view)
    view.focus()
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="h-full" onPointerDownCapture={(event) => (point.current = { x: event.clientX, y: event.clientY })}>
          {children}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent {...keepFocus}>
        {touch && (
          <>
            <ContextMenuItem onSelect={selectHere}>
              <MousePointer2 /> {t("menu.select")}
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}
        <ContextMenuItem disabled={!canUndo} onSelect={run(undo)}>
          <Undo2 /> {t("format.undo")} <ContextMenuShortcut>{mod}Z</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem disabled={!canRedo} onSelect={run(redo)}>
          <Redo2 /> {t("format.redo")} <ContextMenuShortcut>{mod}Y</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={() => void (view && cutSelection(view))}>
          <Scissors /> {t("menu.cut")} <ContextMenuShortcut>{mod}X</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => void (view && copySelection(view))}>
          <Copy /> {t("menu.copy")} <ContextMenuShortcut>{mod}C</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => void (view && pasteClipboard(view))}>
          <Clipboard /> {t("menu.paste")} <ContextMenuShortcut>{mod}V</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onSelect={run(selectAll)}>
          <TextSelect /> {t("menu.selectAll")} <ContextMenuShortcut>{mod}A</ContextMenuShortcut>
        </ContextMenuItem>
        {markdown && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onSelect={run((v) => toggleWrap(v, "**"))}>
              <Bold /> {t("format.bold")} <ContextMenuShortcut>{mod}B</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem onSelect={run((v) => toggleWrap(v, "*"))}>
              <Italic /> {t("format.italic")} <ContextMenuShortcut>{mod}I</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem onSelect={run((v) => toggleWrap(v, "`"))}>
              <Code /> {t("format.code")}
            </ContextMenuItem>
            <ContextMenuItem onSelect={run((v) => insertLink(v))}>
              <Link2 /> {t("format.link")}
            </ContextMenuItem>
            <ContextMenuItem
              onSelect={run((v) => {
                insertText(v, "<")
                startCompletion(v)
              })}
            >
              <Tags /> {t("format.tag")}
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}
