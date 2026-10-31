import { useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { EditorToolbar, type EditorTab } from "@/components/editor/EditorToolbar"
import { EditorSidebar } from "@/components/editor/EditorSidebar"
import { FormatBar } from "@/components/editor/FormatBar"
import { FileView } from "@/components/editor/FileView"
import { PreviewPane } from "@/components/editor/PreviewPane"
import { ProjectSettingsDialog } from "@/components/editor/ProjectSettingsDialog"
import { ResizeHandle } from "@/components/ui/resize-handle"
import { useSettingsStore } from "@/stores/useSettingsStore"
import { useWorkspaceStore } from "@/stores/useWorkspaceStore"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { useFormFactor } from "@/hooks/useFormFactor"
import type { DocumentItem } from "@/lib/db/types"
import { startFollowingTyping } from "@/lib/editor/followTyping"
import { cn } from "@/lib/utils"
import { useEditorStore } from "@/stores/useEditorStore"

/**
 * The editor environment: a full-screen workspace of its own (no app navigation), with the project's files, the editor and the
 * preview. On a desktop screen all three are side by side, the file tree at the start edge (the right in Persian). On a tablet
 * or phone the editor and the preview take turns (Edit / Preview), and the files open as a panel.
 */
export function EditorWorkspace({ doc }: { doc: DocumentItem }) {
  const { t, i18n } = useTranslation()
  const formFactor = useFormFactor()
  const wide = formFactor === "desktop"
  const tab = useWorkspaceStore((state) => state.tab)
  const filesSheet = useWorkspaceStore((state) => state.filesSheet)
  const settingsOpen = useWorkspaceStore((state) => state.settingsOpen)
  const panels = useSettingsStore((state) => state.panels)
  const setTab = (next: EditorTab) => useWorkspaceStore.getState().set({ tab: next })
  const setFilesSheet = (open: boolean) => useWorkspaceStore.getState().set({ filesSheet: open })
  const setSettingsOpen = (open: boolean) => useWorkspaceStore.getState().set({ settingsOpen: open })
  const row = useRef<HTMLDivElement>(null)
  const treeWidth = useSettingsStore((state) => state.treeWidth)
  const previewPercent = useSettingsStore((state) => state.previewPercent)
  const setTreeWidth = useSettingsStore((state) => state.setTreeWidth)
  const setPreviewPercent = useSettingsStore((state) => state.setPreviewPercent)

  // Dragging a handle: the side panel grows from the start edge, the preview from the end edge, in either direction of writing
  const rtl = i18n.dir() === "rtl"
  const dragTree = (x: number) => {
    const rect = row.current?.getBoundingClientRect()
    if (rect) setTreeWidth(rtl ? rect.right - x : x - rect.left)
  }
  const dragPreview = (x: number) => {
    const rect = row.current?.getBoundingClientRect()
    if (rect) setPreviewPercent(((rtl ? x - rect.left : rect.right - x) / rect.width) * 100)
  }

  // Going to a place in the text (a heading, a problem, a click in the preview) shows the editor, on a screen that shows one at a time
  const reveal = useEditorStore((state) => state.reveal)
  useEffect(() => {
    if (reveal) setTab("edit")
  }, [reveal])

  // The preview follows the text being edited
  useEffect(() => startFollowingTyping(), [])

  // The title bar shows the editor's menus and switches while this screen is up
  useEffect(() => {
    useWorkspaceStore.getState().set({ active: true, tab: "edit", filesSheet: false, settingsOpen: false })
    return () => useWorkspaceStore.getState().set({ active: false })
  }, [])

  useEffect(() => {
    void useEditorStore.getState().open(doc.id)
    return () => {
      void useEditorStore.getState().close()
    }
    // Only a different project reopens; a renamed title or a new main file is handled by the store
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.id])

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <EditorToolbar
        doc={doc}
        tab={wide ? undefined : tab}
        onTabChange={wide ? undefined : setTab}
        onToggleFiles={() => setFilesSheet(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <div ref={row} className="flex min-h-0 flex-1">
        {wide && panels.side && (
          <>
            <aside style={{ width: treeWidth }} className="shrink-0">
              <EditorSidebar />
            </aside>
            <ResizeHandle label={t("format.resizeFiles")} onDrag={dragTree} onNudge={(direction) => setTreeWidth(treeWidth + direction * (rtl ? -16 : 16))} />
          </>
        )}
        {wide ? (
          <>
            {/* A hidden panel stays mounted: the editor keeps its history and place, the preview its scroll */}
            <main className={cn("min-w-0 flex-1 flex-col", panels.editor ? "flex" : "hidden")}>
              <FormatBar />
              <div className="min-h-0 flex-1">
                <FileView />
              </div>
            </main>
            {panels.editor && panels.preview && <ResizeHandle label={t("format.resizePreview")} onDrag={dragPreview} onNudge={(direction) => setPreviewPercent(previewPercent + direction * (rtl ? 2 : -2))} />}
            <section style={panels.editor ? { width: `${previewPercent}%` } : undefined} className={cn("min-w-0", panels.editor ? "shrink-0" : "flex-1", !panels.preview && "hidden")}>
              <PreviewPane />
            </section>
          </>
        ) : (
          // Both stay mounted and laid out, one on top of the other: switching hides one (visibility, not display, so a scroll position
          // survives) instead of building the other from scratch, and each keeps its place, cursor and undo history
          <main className="relative min-w-0 flex-1">
            <div className={cn("absolute inset-0 flex flex-col", tab !== "edit" && "pointer-events-none invisible")} aria-hidden={tab !== "edit"}>
              <FormatBar />
              <div className="min-h-0 flex-1">
                <FileView />
              </div>
            </div>
            <div className={cn("absolute inset-0", tab !== "preview" && "pointer-events-none invisible")} aria-hidden={tab !== "preview"}>
              <PreviewPane onJumpToSource={() => setTab("edit")} />
            </div>
          </main>
        )}
      </div>

      {!wide && (
        <Sheet open={filesSheet} onOpenChange={setFilesSheet}>
          <SheetContent side={i18n.dir() === "rtl" ? "right" : "left"} showCloseButton={false} className="gap-0 p-0 pt-safe pb-safe">
            <SheetTitle className="sr-only">{t("editor.files")}</SheetTitle>
            <SheetDescription className="sr-only">{t("editor.files")}</SheetDescription>
            <EditorSidebar onOpen={() => setFilesSheet(false)} />
          </SheetContent>
        </Sheet>
      )}

      <ProjectSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  )
}
