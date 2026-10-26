import { useMemo, useState } from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import { Archive, ChevronRight, ClipboardPaste, Copy, CopyPlus, ExternalLink, FileText, FolderPlus, Pencil, Plus, Scissors, Trash2, Upload } from "lucide-react"
import { useTranslation } from "react-i18next"
import { PageHeader } from "@/components/layout/PageHeader"
import { ResponsiveDialog } from "@/components/common/ResponsiveDialog"
import { ActionItems, FolderCard, ProjectCard, useDropTarget, type DragPayload, type MenuAction } from "@/components/library/LibraryCards"
import { Button } from "@/components/ui/button"
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "@/components/ui/context-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { DocumentItem, FolderItem } from "@/lib/db/types"
import { saveBytes, pickFiles } from "@/lib/files/saveFile"
import { copyProjectFiles, deleteProjectFiles, initProject } from "@/lib/projects"
import { exportProjectZip, readProjectZip, writeImportedProject } from "@/lib/projects/zip"
import { cn } from "@/lib/utils"
import { useLibraryStore } from "@/stores/useLibraryStore"

type NameDialog = { kind: "folder"; folder?: FolderItem } | { kind: "document" } | { kind: "rename"; doc: DocumentItem }

/** A crumb of the folder path; a project or folder dropped on it is moved there. */
function Crumb({ label, current, onOpen, onDropItems }: { label: string; current: boolean; onOpen: () => void; onDropItems: (payload: DragPayload) => void }) {
  const drop = useDropTarget(onDropItems)
  return (
    <button type="button" onClick={onOpen} {...drop.props} className={cn("max-w-40 truncate rounded-md px-1.5 py-1 text-xs outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring", current ? "font-semibold text-foreground" : "text-muted-foreground", drop.over && "bg-primary/10 ring-2 ring-primary/40")}>
      {label}
    </button>
  )
}

export function LibraryPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const store = useLibraryStore()
  const { documents, folders, folderId, clipboard } = store

  const [nameDialog, setNameDialog] = useState<NameDialog | null>(null)
  const [name, setName] = useState("")
  const [deleting, setDeleting] = useState<{ doc?: DocumentItem; folder?: FolderItem } | null>(null)
  /** A zip that could not be saved or read: what went wrong, shown in a dialog. */
  const [problem, setProblem] = useState<string | null>(null)

  // The calendar follows the language: Persian dates in fa, Gregorian in en
  const formatDate = new Intl.DateTimeFormat(i18n.language === "fa" ? "fa-IR" : "en-US", { dateStyle: "medium" })

  const current = folders.find((folder) => folder.id === folderId) ?? null
  const here = current?.id ?? null
  const shownFolders = useMemo(() => folders.filter((folder) => (folder.parentId ?? null) === here).sort((a, b) => a.name.localeCompare(b.name)), [folders, here])
  const shownDocs = useMemo(() => documents.filter((doc) => (doc.parentId ?? null) === here), [documents, here])
  const path = useMemo(() => {
    const chain: FolderItem[] = []
    for (let next = current, guard = 0; next && guard < 100; guard++) {
      chain.unshift(next)
      next = folders.find((folder) => folder.id === next?.parentId) ?? null
    }
    return chain
  }, [current, folders])

  const countIn = (id: string) => documents.filter((doc) => doc.parentId === id).length + folders.filter((folder) => folder.parentId === id).length
  const open = (doc: DocumentItem) => void navigate({ to: "/editor/$documentId", params: { documentId: doc.id } })
  const drop = (target: string | null) => (payload: DragPayload) => store.move(payload.docs, payload.folders, target)

  /** A copy of a project: its record, then its files (the record is listed at once, the files follow). */
  const duplicate = async (doc: DocumentItem, target: string | null) => {
    const copy = store.duplicateDocument(doc.id, target === (doc.parentId ?? null) ? t("library.copySuffix") : "")
    if (!copy) return
    if (target !== (doc.parentId ?? null)) store.move([copy.id], [], target)
    if (copy.title.endsWith(" ")) store.renameDocument(copy.id, copy.title.trim())
    try {
      await copyProjectFiles(doc.id, copy.id)
    } catch (error) {
      console.error("[formatex] could not copy the project files", error)
    }
  }

  const exportZip = async (doc: DocumentItem) => {
    try {
      const bytes = await exportProjectZip(doc.id, doc.title, doc.mainFile)
      await saveBytes(bytes, `${doc.title.replace(/[\\/:*?"<>|]+/g, "_").trim() || "project"}.zip`, "application/zip")
    } catch (error) {
      setProblem(String((error as Error)?.message ?? error))
    }
  }

  const importZip = async () => {
    try {
      const [picked] = await pickFiles({ extensions: ["zip"], multiple: false })
      if (!picked) return
      const project = readProjectZip(picked.data, picked.name.replace(/\.zip$/i, "") || t("library.untitled"))
      const doc = store.createDocument(project.title, here)
      await writeImportedProject(doc.id, project)
      store.setMainFile(doc.id, project.mainFile)
    } catch (error) {
      setProblem(String((error as Error)?.message ?? error))
    }
  }

  const paste = () => {
    if (!clipboard) return
    if (clipboard.mode === "cut") {
      store.move(clipboard.docs, clipboard.folders, here)
      store.setClipboard(null)
    } else {
      for (const id of clipboard.docs) {
        const doc = documents.find((item) => item.id === id)
        if (doc) void duplicate(doc, here)
      }
    }
  }

  const docActions = (doc: DocumentItem): MenuAction[] => [
    { key: "open", label: t("library.open"), icon: <ExternalLink />, onSelect: () => open(doc) },
    { key: "rename", label: t("common.rename"), icon: <Pencil />, onSelect: () => (setName(doc.title), setNameDialog({ kind: "rename", doc })) },
    "separator",
    { key: "duplicate", label: t("library.duplicate"), icon: <CopyPlus />, onSelect: () => void duplicate(doc, doc.parentId ?? null) },
    { key: "zip", label: t("library.exportZip"), icon: <Archive />, onSelect: () => void exportZip(doc) },
    { key: "copy", label: t("menu.copy"), icon: <Copy />, onSelect: () => store.setClipboard({ docs: [doc.id], folders: [], mode: "copy" }) },
    { key: "cut", label: t("menu.cut"), icon: <Scissors />, onSelect: () => store.setClipboard({ docs: [doc.id], folders: [], mode: "cut" }) },
    "separator",
    { key: "delete", label: t("common.delete"), icon: <Trash2 />, destructive: true, onSelect: () => setDeleting({ doc }) },
  ]

  const folderActions = (folder: FolderItem): MenuAction[] => [
    { key: "open", label: t("library.open"), icon: <ExternalLink />, onSelect: () => store.openFolder(folder.id) },
    { key: "rename", label: t("common.rename"), icon: <Pencil />, onSelect: () => (setName(folder.name), setNameDialog({ kind: "folder", folder })) },
    { key: "cut", label: t("menu.cut"), icon: <Scissors />, onSelect: () => store.setClipboard({ docs: [], folders: [folder.id], mode: "cut" }) },
    "separator",
    { key: "delete", label: t("common.delete"), icon: <Trash2 />, destructive: true, onSelect: () => setDeleting({ folder }) },
  ]

  const backgroundActions: MenuAction[] = [
    { key: "new", label: t("library.new"), icon: <Plus />, onSelect: () => (setName(""), setNameDialog({ kind: "document" })) },
    { key: "folder", label: t("library.newFolder"), icon: <FolderPlus />, onSelect: () => (setName(""), setNameDialog({ kind: "folder" })) },
    { key: "import", label: t("library.importZip"), icon: <Upload />, onSelect: () => void importZip() },
    ...(clipboard ? ["separator" as const, { key: "paste", label: t("menu.paste"), icon: <ClipboardPaste />, onSelect: paste }] : []),
  ]

  const submitName = async () => {
    const value = name.trim()
    const dialog = nameDialog
    setNameDialog(null)
    setName("")
    if (!dialog) return
    if (dialog.kind === "folder") {
      if (dialog.folder) store.renameFolder(dialog.folder.id, value || dialog.folder.name)
      else if (value) store.createFolder(value, here)
    } else if (dialog.kind === "rename") {
      if (value) store.renameDocument(dialog.doc.id, value)
    } else {
      const doc = store.createDocument(value || t("library.untitled"), here)
      try {
        await initProject(doc.id)
      } catch (error) {
        // The editor starts an empty project from the template when it finds no files
        console.error("[formatex] could not create the project files", error)
      }
      open(doc)
    }
  }

  const dialogTitle = nameDialog?.kind === "document" ? t("library.new") : nameDialog?.kind === "folder" ? (nameDialog.folder ? t("common.rename") : t("library.newFolder")) : t("common.rename")
  const empty = shownDocs.length === 0 && shownFolders.length === 0

  return (
    <>
      <PageHeader
        title={t("library.title")}
        actions={
          <div className="flex items-center gap-1.5">
            {clipboard && (
              <Button variant="outline" size="sm" onClick={paste} title={t("menu.paste")} aria-label={t("menu.paste")}>
                <ClipboardPaste data-icon="inline-start" />
                <span className="hidden sm:inline">{t("menu.paste")}</span>
              </Button>
            )}
            <Button variant="outline" onClick={() => void importZip()} title={t("library.importZip")} aria-label={t("library.importZip")}>
              <Upload data-icon="inline-start" />
              <span className="hidden sm:inline">{t("library.importZip")}</span>
            </Button>
            <Button variant="outline" onClick={() => (setName(""), setNameDialog({ kind: "folder" }))} title={t("library.newFolder")} aria-label={t("library.newFolder")}>
              <FolderPlus data-icon="inline-start" />
              <span className="hidden sm:inline">{t("library.newFolder")}</span>
            </Button>
            <Button onClick={() => (setName(""), setNameDialog({ kind: "document" }))}>
              <Plus data-icon="inline-start" />
              <span className="hidden sm:inline">{t("library.new")}</span>
              <span className="sr-only sm:hidden">{t("library.new")}</span>
            </Button>
          </div>
        }
      />

      {path.length > 0 && (
        <nav aria-label={t("library.path")} className="flex shrink-0 items-center gap-0.5 overflow-x-auto border-b border-border px-3 py-1" dir="auto">
          <Crumb label={t("library.title")} current={false} onOpen={() => store.openFolder(null)} onDropItems={drop(null)} />
          {path.map((folder, index) => (
            <span key={folder.id} className="flex items-center gap-0.5">
              <ChevronRight className="size-3 text-muted-foreground rtl:rotate-180" />
              <Crumb label={folder.name} current={index === path.length - 1} onOpen={() => store.openFolder(folder.id)} onDropItems={drop(folder.id)} />
            </span>
          ))}
        </nav>
      )}

      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className="flex-1 overflow-y-auto p-3 sm:p-4" onDragOver={(event) => event.preventDefault()} onDrop={(event) => path.length > 0 && event.preventDefault()}>
            {empty ? (
              <div className="flex h-full flex-col items-center justify-center gap-1 text-center text-muted-foreground">
                <FileText className="mb-2 size-10 stroke-1" />
                <div className="text-sm font-medium text-foreground">{t(current ? "library.emptyFolder" : "library.empty")}</div>
                <div className="text-xs">{t("library.emptyHint")}</div>
              </div>
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                {shownFolders.map((folder) => (
                  <FolderCard
                    key={folder.id}
                    id={folder.id}
                    name={folder.name}
                    subtitle={t("library.items", { count: countIn(folder.id) })}
                    previews={documents.filter((doc) => doc.parentId === folder.id).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3)}
                    menuLabel={t("library.actions")}
                    actions={folderActions(folder)}
                    onOpen={() => store.openFolder(folder.id)}
                    onDropItems={drop(folder.id)}
                  />
                ))}
                {shownDocs.map((doc) => (
                  <ProjectCard
                    key={doc.id}
                    doc={doc}
                    subtitle={t("library.updatedAt", { date: formatDate.format(doc.updatedAt) })}
                    menuLabel={t("library.actions")}
                    actions={docActions(doc)}
                    href={<Link to="/editor/$documentId" params={{ documentId: doc.id }} aria-label={doc.title} draggable={false} className="absolute inset-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring" />}
                  />
                ))}
              </ul>
            )}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ActionItems actions={backgroundActions} kind="context" />
        </ContextMenuContent>
      </ContextMenu>

      <ResponsiveDialog
        open={nameDialog !== null}
        onOpenChange={(next) => !next && setNameDialog(null)}
        title={dialogTitle}
        footer={
          <>
            <Button variant="outline" size="lg" onClick={() => setNameDialog(null)}>
              {t("common.cancel")}
            </Button>
            <Button size="lg" onClick={() => void submitName()}>
              {nameDialog?.kind === "rename" || (nameDialog?.kind === "folder" && nameDialog.folder) ? t("common.save") : t("common.create")}
            </Button>
          </>
        }
      >
        <div className="grid gap-2">
          <Label htmlFor="library-name">{nameDialog?.kind === "folder" ? t("library.folderName") : t("library.titleLabel")}</Label>
          <Input id="library-name" dir="auto" autoFocus value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void submitName()} className="h-10" />
        </div>
      </ResponsiveDialog>

      <ResponsiveDialog
        open={problem !== null}
        onOpenChange={(next) => !next && setProblem(null)}
        title={t("library.zipFailed")}
        description={problem ?? undefined}
        footer={
          <Button variant="outline" size="lg" onClick={() => setProblem(null)}>
            {t("common.close")}
          </Button>
        }
      />

      <ResponsiveDialog
        open={deleting !== null}
        onOpenChange={(next) => !next && setDeleting(null)}
        title={t("common.delete")}
        description={deleting?.doc ? t("library.deleteConfirm", { title: deleting.doc.title }) : deleting?.folder ? t("library.deleteFolderConfirm", { title: deleting.folder.name }) : undefined}
        footer={
          <>
            <Button variant="outline" size="lg" onClick={() => setDeleting(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              size="lg"
              onClick={() => {
                if (deleting?.doc) {
                  store.removeDocument(deleting.doc.id)
                  void deleteProjectFiles(deleting.doc.id)
                } else if (deleting?.folder) store.removeFolder(deleting.folder.id)
                setDeleting(null)
              }}
            >
              {t("common.delete")}
            </Button>
          </>
        }
      />
    </>
  )
}
