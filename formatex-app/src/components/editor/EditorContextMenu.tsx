import { useRef, type ReactNode } from "react"
import { startCompletion } from "@codemirror/autocomplete"
import type { EditorSelection } from "@codemirror/state"
import { redo, selectAll, undo } from "@codemirror/commands"
import { Bold, Clipboard, Code, Copy, Italic, Link2, LocateFixed, MousePointer2, Redo2, Scissors, TextSelect, Undo2, Tags } from "lucide-react"
import { useTranslation } from "react-i18next"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuShortcut, ContextMenuTrigger } from "@/components/ui/context-menu"
import { copySelection, cutSelection, pasteClipboard } from "@/lib/editor/clipboard"
import { insertLink, insertText, toggleWrap } from "@/lib/editor/format"
import { previewPlaceForLine } from "@/lib/editor/previewPlace"
import { typstPlaceForOffset } from "@/lib/editor/typstIde"
import { desktopOs, hasFinePointer } from "@/lib/platform"
import { useEditorStore } from "@/stores/useEditorStore"
import { useEditorViewStore } from "@/stores/useEditorViewStore"
import { usePreviewScrollStore } from "@/stores/usePreviewScrollStore"
import { useSettingsStore } from "@/stores/useSettingsStore"
import { useWorkspaceStore } from "@/stores/useWorkspaceStore"
import { enableTouchSelection, selectByTouch } from "@/lib/editor/touchSelection"

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
  // The selection when the finger went down, to restore when the menu opens
  const selectionBefore = useRef<EditorSelection | null>(null)
  const afterClose = useRef<(() => void) | null>(null)
  const selecting = useEditorViewStore((state) => state.touchSelecting)

  /** Selects the word (or, on a blank, the line) under the last press: the start of selecting by touch, which a long press cannot do here. */
  const selectHere = () => {
    if (!view || !point.current) return
    const position = view.posAtCoords(point.current) ?? view.state.selection.main.head
    afterClose.current = () => selectByTouch(view, position)
  }

  const hasPages = useEditorStore((state) => state.pages.length > 0)
  const plainTypst = useEditorStore((state) => state.kind) === "typst"

  /** Shows the place of the last press in the typeset pages: the preview scrolls to it and marks it (on a narrow screen it comes up). */
  const goToPreview = async () => {
    const { activePath, texts, kind } = useEditorStore.getState()
    const source = activePath ? texts[activePath] : undefined
    if (!view || !activePath || source === undefined) return
    const position = (point.current && view.posAtCoords(point.current)) ?? view.state.selection.main.head
    const line = view.state.doc.lineAt(position)
    // Plain Typst: Typst itself says where the text was typeset; Formatex: the engine's markers
    const place = kind === "typst" ? await typstPlaceForOffset(activePath, position) : previewPlaceForLine(activePath, source, line.number, position - line.from)
    if (!place) return
    // A hidden preview comes up first: its panel on a wide window, its tab on a narrow one
    if (!useSettingsStore.getState().panels.preview) useSettingsStore.getState().setPanel("preview", true)
    useWorkspaceStore.getState().set({ tab: "preview" })
    usePreviewScrollStore.getState().show(place, true)
  }

  const keepFocus = {
    onCloseAutoFocus: (event: Event) => {
      event.preventDefault()
      const action = afterClose.current
      afterClose.current = null
      if (action) requestAnimationFrame(action)
    },
  }

  const run = (command: (target: NonNullable<typeof view>) => unknown) => () => {
    if (!view) return
    afterClose.current = () => {
      command(view)
      view.focus()
    }
  }

  return (
    <ContextMenu
      onOpenChange={(open) => {
        // A long press also made the system select a word and show its handles: the menu has its own Select, so put the selection back
        const before = selectionBefore.current
        if (open && touch && view && before) {
          // Keep an existing range for Cut/Copy; otherwise Paste belongs at the long-pressed position.
          const at = point.current && view.posAtCoords(point.current)
          view.dispatch({ selection: before.main.empty && at != null ? { anchor: at } : before })
        }
      }}
    >
      <ContextMenuTrigger asChild disabled={touch && selecting}>
        <div
          className="h-full"
          onPointerDownCapture={(event) => {
            point.current = { x: event.clientX, y: event.clientY }
            selectionBefore.current = view?.state.selection ?? null
          }}
        >
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
        <ContextMenuItem onSelect={run(cutSelection)}>
          <Scissors /> {t("menu.cut")} <ContextMenuShortcut>{mod}X</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onSelect={run(copySelection)}>
          <Copy /> {t("menu.copy")} <ContextMenuShortcut>{mod}C</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onSelect={run(pasteClipboard)}>
          <Clipboard /> {t("menu.paste")} <ContextMenuShortcut>{mod}V</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onSelect={run((target) => {
          if (touch) target.dispatch({ effects: enableTouchSelection.of(true) })
          selectAll(target)
        })}>
          <TextSelect /> {t("menu.selectAll")} <ContextMenuShortcut>{mod}A</ContextMenuShortcut>
        </ContextMenuItem>
        {plainTypst && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem disabled={!hasPages} onSelect={() => void goToPreview()}>
              <LocateFixed /> {t("menu.goToPreview")}
            </ContextMenuItem>
          </>
        )}
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
            <ContextMenuSeparator />
            <ContextMenuItem disabled={!hasPages} onSelect={() => void goToPreview()}>
              <LocateFixed /> {t("menu.goToPreview")}
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}
