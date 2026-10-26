import { useEffect, useRef, useState } from "react"
import { Link } from "@tanstack/react-router"
import { ArrowLeft, Check, CircleAlert, FileDown, Files, Loader2, Pencil, Settings2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { SegmentedControl } from "@/components/ui/segmented-control"
import type { DocumentItem } from "@/lib/db/types"
import { useEditorStore } from "@/stores/useEditorStore"
import { useLibraryStore } from "@/stores/useLibraryStore"

export type EditorTab = "edit" | "preview"

interface EditorToolbarProps {
  doc: DocumentItem
  /** Edit / Preview switch for screens too narrow to show both. */
  tab?: EditorTab
  onTabChange?: (tab: EditorTab) => void
  onToggleFiles: () => void
  onOpenSettings: () => void
}

/** The project's title as plain text with an edit button; editing turns it into a field with an underline (the only underlined field of the app). */
function EditableTitle({ title, onRename }: { title: string; onRename: (title: string) => void }) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(title)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) input.current?.select()
  }, [editing])

  const commit = () => {
    const next = draft.trim()
    if (next && next !== title) onRename(next)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={input}
        dir="auto"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit()
          if (event.key === "Escape") setEditing(false)
        }}
        aria-label={t("library.titleLabel")}
        className="h-7 min-w-16 flex-1 border-0 border-b border-foreground bg-transparent px-1 text-sm font-semibold outline-none sm:w-56 sm:flex-none"
      />
    )
  }
  return (
    <div className="flex min-w-0 flex-1 items-center gap-0.5 sm:flex-none">
      <span dir="auto" className="min-w-0 max-w-56 truncate px-1 text-sm font-semibold">
        {title}
      </span>
      <Button
        variant="ghost"
        size="icon-xs"
        className="text-muted-foreground"
        onClick={() => {
          setDraft(title)
          setEditing(true)
        }}
        title={t("common.rename")}
        aria-label={t("common.rename")}
      >
        <Pencil />
      </Button>
    </div>
  )
}

/** One compact row: back, title, save state, the Edit / Preview switch (narrow screens), files, settings and export. */
export function EditorToolbar({ doc, tab, onTabChange, onToggleFiles, onOpenSettings }: EditorToolbarProps) {
  const { t } = useTranslation()
  const saveState = useEditorStore((state) => state.saveState)
  const exportStatus = useEditorStore((state) => state.exportStatus)
  const exportMessage = useEditorStore((state) => state.exportMessage)
  const renameDocument = useLibraryStore((state) => state.renameDocument)

  const exporting = exportStatus === "working"
  const exportTitle = exportStatus === "error" ? `${t("editor.exportFailed")}: ${exportMessage}` : exportStatus === "done" ? t("editor.exported") : t("editor.export")

  return (
    <header className="flex h-10 shrink-0 items-center gap-1 border-b border-border bg-background px-1.5 select-none">
      <Button variant="ghost" size="icon-sm" asChild>
        <Link to="/" title={t("common.back")} aria-label={t("common.back")}>
          <ArrowLeft className="rtl:rotate-180" />
        </Link>
      </Button>

      <EditableTitle title={doc.title} onRename={(title) => renameDocument(doc.id, title)} />

      <span className="flex size-6 shrink-0 items-center justify-center text-muted-foreground" title={saveState === "saved" ? t("editor.saved") : saveState === "saving" ? t("editor.saving") : t("editor.saveFailed")} role="status">
        {saveState === "saving" ? <Loader2 className="size-3.5 animate-spin" /> : saveState === "error" ? <CircleAlert className="size-3.5 text-destructive" /> : <Check className="size-3.5" />}
      </span>

      <span className="hidden flex-1 sm:block" />

      {tab && onTabChange && (
        <SegmentedControl
          value={tab}
          onValueChange={onTabChange}
          label={t("editor.title")}
          compact
          options={[
            { value: "edit", label: t("editor.edit") },
            { value: "preview", label: t("editor.preview") },
          ]}
        />
      )}

      <Button variant="ghost" size="icon-sm" onClick={onToggleFiles} title={t("editor.files")} aria-label={t("editor.files")}>
        <Files />
      </Button>
      <Button variant="ghost" size="icon-sm" onClick={onOpenSettings} title={t("editor.settings")} aria-label={t("editor.settings")}>
        <Settings2 />
      </Button>
      <Button size="sm" disabled={exporting} onClick={() => void useEditorStore.getState().exportPdf()} title={exportTitle} aria-label={t("editor.export")} className="ms-0.5 sm:ms-1">
        {exporting ? <Loader2 className="animate-spin" data-icon="inline-start" /> : exportStatus === "error" ? <CircleAlert data-icon="inline-start" /> : <FileDown data-icon="inline-start" />}
        <span className="hidden sm:inline">{t("editor.export")}</span>
      </Button>
    </header>
  )
}
