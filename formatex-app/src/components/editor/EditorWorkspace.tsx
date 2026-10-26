import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { EditorToolbar, type EditorTab } from "@/components/editor/EditorToolbar"
import { EditorSidebar } from "@/components/editor/EditorSidebar"
import { FormatBar } from "@/components/editor/FormatBar"
import { FileView } from "@/components/editor/FileView"
import { PreviewPane } from "@/components/editor/PreviewPane"
import { ProjectSettingsDialog } from "@/components/editor/ProjectSettingsDialog"
import { ResizeHandle } from "@/components/ui/resize-handle"
import { useSettingsStore } from "@/stores/useSettingsStore"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { useFormFactor } from "@/hooks/useFormFactor"
import type { DocumentItem } from "@/lib/db/types"
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
  const [tab, setTab] = useState<EditorTab>("edit")
  const [treeOpen, setTreeOpen] = useState(true)
  const [filesSheet, setFilesSheet] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
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

  useEffect(() => {
    void useEditorStore.getState().open(doc.id, doc.mainFile)
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
        onToggleFiles={() => (wide ? setTreeOpen((open) => !open) : setFilesSheet(true))}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <div ref={row} className="flex min-h-0 flex-1">
        {wide && treeOpen && (
          <>
            <aside style={{ width: treeWidth }} className="shrink-0">
              <EditorSidebar />
            </aside>
            <ResizeHandle label={t("format.resizeFiles")} onDrag={dragTree} onNudge={(direction) => setTreeWidth(treeWidth + direction * (rtl ? -16 : 16))} />
          </>
        )}
        {wide ? (
          <>
            <main className="flex min-w-0 flex-1 flex-col">
              <FormatBar />
              <div className="min-h-0 flex-1">
                <FileView />
              </div>
            </main>
            <ResizeHandle label={t("format.resizePreview")} onDrag={dragPreview} onNudge={(direction) => setPreviewPercent(previewPercent + direction * (rtl ? 2 : -2))} />
            <section style={{ width: `${previewPercent}%` }} className="min-w-0 shrink-0">
              <PreviewPane />
            </section>
          </>
        ) : (
          <main className="flex min-w-0 flex-1 flex-col">
            {tab === "edit" && <FormatBar />}
            <div className="min-h-0 flex-1">{tab === "edit" ? <FileView /> : <PreviewPane onJumpToSource={() => setTab("edit")} />}</div>
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
