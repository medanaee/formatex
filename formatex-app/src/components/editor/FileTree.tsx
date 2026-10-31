import { useEffect, useMemo, useRef, useState, type DragEvent, type KeyboardEvent, type MouseEvent } from "react"
import {
  ChevronRight,
  ClipboardPaste,
  Copy,
  Download,
  File as FileIcon,
  FileCode,
  FilePlus,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  Image as ImageIcon,
  Lock,
  MoreHorizontal,
  Pencil,
  Scissors,
  Settings2,
  Star,
  Trash2,
  Type,
  Upload,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { ResponsiveDialog } from "@/components/common/ResponsiveDialog"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { pickFiles } from "@/lib/files/saveFile"
import { baseName, CODE_EXTENSIONS, CONFIG_FILE, fileKindOf, nameProblem, parentOf, type FileKind, type FsEntry } from "@/lib/projects"
import { cn } from "@/lib/utils"
import { useEditorStore } from "@/stores/useEditorStore"

const UPLOAD_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "csv", "json", "bib", "txt", "md", "toml", "typ", ...CODE_EXTENSIONS]
/** What a drag carries between rows of the tree. */
const DRAG_TYPE = "application/x-formatex-paths"

type Dialog =
  | { type: "newFile"; parent: string }
  | { type: "newFolder"; parent: string }
  | { type: "rename"; entry: FsEntry }
  | { type: "delete"; paths: string[] }
  | null

function iconFor(entry: FsEntry, open: boolean) {
  if (entry.kind === "dir") return open ? FolderOpen : Folder
  const kind: FileKind = fileKindOf(entry.path)
  if (entry.path === CONFIG_FILE) return Settings2
  if (kind === "image") return ImageIcon
  if (kind === "font") return Type
  if (kind === "code") return FileCode
  if (kind === "markdown" || kind === "text" || kind === "typst" || kind === "toml") return FileText
  return FileIcon
}

/**
 * The files of the project, like Overleaf's. Click opens; Ctrl / Cmd + click toggles and Shift + click selects a range.
 * Drag rows onto a folder to move them (hold Ctrl / Alt to copy), and drop files from the computer to add them.
 * Ctrl + C / X / V copy, cut and paste; Delete removes the selection; F2 renames; Ctrl + A selects all.
 * Sits at the start edge of the editor (the right in Persian).
 */
export function FileTree({ onOpen }: { /** Called after a file is chosen (a phone closes the drawer). */ onOpen?: () => void }) {
  const { t } = useTranslation()
  const files = useEditorStore((state) => state.files)
  const activePath = useEditorStore((state) => state.activePath)
  const mainFile = useEditorStore((state) => state.mainFile)
  const clipboard = useEditorStore((state) => state.clipboard)
  const store = useEditorStore.getState

  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
  const [dialog, setDialog] = useState<Dialog>(null)
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  const anchor = useRef<string | null>(null)
  /** The folder a drag is over (`""` is the root). */
  const [dropTarget, setDropTarget] = useState<string | null>(null)

  // Holding a drag over a closed folder opens it, so a file can be dropped deeper
  useEffect(() => {
    if (!dropTarget || !collapsed.has(dropTarget)) return
    const timer = window.setTimeout(() => {
      setCollapsed((previous) => {
        const next = new Set(previous)
        next.delete(dropTarget)
        return next
      })
    }, 600)
    return () => window.clearTimeout(timer)
  }, [dropTarget, collapsed])

  const visible = useMemo(
    () => files.filter((entry) => !entry.path.split("/").slice(0, -1).some((_, index, parts) => collapsed.has(parts.slice(0, index + 1).join("/")))),
    [files, collapsed]
  )

  const locked = (path: string) => path === CONFIG_FILE || path === mainFile
  /** Selected paths that still exist (a rename or delete may have removed some). */
  const chosen = visible.filter((entry) => selected.has(entry.path)).map((entry) => entry.path)
  /** Where a paste or an upload lands: the selected folder, else the folder of the selected file, else the root. */
  const targetFolder = (): string => {
    const first = files.find((entry) => entry.path === chosen[0])
    return !first ? "" : first.kind === "dir" ? first.path : parentOf(first.path)
  }

  const toggleFolder = (path: string) =>
    setCollapsed((previous) => {
      const next = new Set(previous)
      if (!next.delete(path)) next.add(path)
      return next
    })

  const upload = async (parent: string) => {
    const picked = await pickFiles({ extensions: UPLOAD_EXTENSIONS })
    if (picked.length === 0) return
    const added = await store().importFiles(parent, picked)
    if (added[0]) await store().select(added[0])
    onOpen?.()
  }

  const clickRow = async (event: MouseEvent, entry: FsEntry) => {
    if (event.ctrlKey || event.metaKey) {
      setSelected((previous) => {
        const next = new Set(previous)
        if (!next.delete(entry.path)) next.add(entry.path)
        return next
      })
      anchor.current = entry.path
      return
    }
    if (event.shiftKey && anchor.current) {
      const from = visible.findIndex((row) => row.path === anchor.current)
      const to = visible.findIndex((row) => row.path === entry.path)
      if (from >= 0 && to >= 0) {
        const [start, end] = from < to ? [from, to] : [to, from]
        setSelected(new Set(visible.slice(start, end + 1).map((row) => row.path)))
        return
      }
    }
    setSelected(new Set([entry.path]))
    anchor.current = entry.path
    if (entry.kind === "dir") return toggleFolder(entry.path)
    await store().select(entry.path)
    onOpen?.()
  }

  const paste = async (folder: string) => {
    const added = await store().paste(folder)
    if (added.length) setSelected(new Set(added))
  }

  const onKeyDown = (event: KeyboardEvent) => {
    // A key typed into a dialog or a rename field is not for the tree
    if ((event.target as HTMLElement).closest("input, textarea, [role=dialog]")) return
    const mod = event.ctrlKey || event.metaKey
    const key = event.key.toLowerCase()
    if (mod && key === "a") {
      event.preventDefault()
      setSelected(new Set(visible.map((entry) => entry.path)))
    } else if (mod && (key === "c" || key === "x")) {
      event.preventDefault()
      store().setClipboard(chosen.filter((path) => key === "c" || !locked(path)), key === "c" ? "copy" : "cut")
    } else if (mod && key === "v") {
      event.preventDefault()
      void paste(targetFolder())
    } else if (event.key === "Delete" && chosen.some((path) => !locked(path))) {
      event.preventDefault()
      setDialog({ type: "delete", paths: chosen.filter((path) => !locked(path)) })
    } else if (event.key === "F2" && chosen.length === 1) {
      event.preventDefault()
      const entry = files.find((row) => row.path === chosen[0])
      if (entry) setDialog({ type: "rename", entry })
    } else if (event.key === "Escape") {
      setSelected(new Set())
    }
  }

  // ----- drag and drop -----

  const dragStart = (event: DragEvent, entry: FsEntry) => {
    const paths = selected.has(entry.path) ? chosen : [entry.path]
    if (!selected.has(entry.path)) setSelected(new Set([entry.path]))
    event.dataTransfer.setData(DRAG_TYPE, JSON.stringify(paths))
    event.dataTransfer.effectAllowed = "copyMove"
  }

  const acceptsDrop = (event: DragEvent) => event.dataTransfer.types.includes(DRAG_TYPE) || event.dataTransfer.types.includes("Files")

  const dragOver = (event: DragEvent, folder: string) => {
    if (!acceptsDrop(event)) return
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = event.dataTransfer.types.includes(DRAG_TYPE) && !(event.ctrlKey || event.altKey) ? "move" : "copy"
    setDropTarget(folder)
  }

  const drop = async (event: DragEvent, folder: string) => {
    if (!acceptsDrop(event)) return
    event.preventDefault()
    event.stopPropagation()
    setDropTarget(null)
    const internal = event.dataTransfer.getData(DRAG_TYPE)
    if (internal) {
      const paths = JSON.parse(internal) as string[]
      const done = event.ctrlKey || event.altKey ? await store().copyEntries(paths, folder) : await store().moveEntries(paths, folder)
      if (done.length) setSelected(new Set(done))
      return
    }
    // Files from the computer
    const dropped = await Promise.all([...event.dataTransfer.files].map(async (file) => ({ name: file.name, data: new Uint8Array(await file.arrayBuffer()) })))
    if (dropped.length) {
      const added = await store().importFiles(folder, dropped)
      setSelected(new Set(added))
    }
  }

  const rowFolder = (entry: FsEntry) => (entry.kind === "dir" ? entry.path : parentOf(entry.path))

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-sidebar text-sidebar-foreground select-none outline-none" tabIndex={0} onKeyDown={onKeyDown}>
      <div className="flex h-9 shrink-0 items-center gap-0.5 border-b border-sidebar-border ps-3 pe-1">
        <span className="flex-1 truncate text-xs font-medium text-muted-foreground">
          {chosen.length > 1 ? t("files.selected", { count: chosen.length }) : t("editor.files")}
        </span>
        <Button variant="ghost" size="icon-lg" onClick={() => setDialog({ type: "newFile", parent: targetFolder() })} title={t("files.newFile")} aria-label={t("files.newFile")}>
          <FilePlus />
        </Button>
        <Button variant="ghost" size="icon-lg" onClick={() => setDialog({ type: "newFolder", parent: targetFolder() })} title={t("files.newFolder")} aria-label={t("files.newFolder")}>
          <FolderPlus />
        </Button>
        <Button variant="ghost" size="icon-lg" onClick={() => void upload(targetFolder())} title={t("files.upload")} aria-label={t("files.upload")}>
          <Upload />
        </Button>
      </div>

      <ul
        className={cn("min-h-0 flex-1 overflow-y-auto py-1", dropTarget === "" && "bg-sidebar-accent/40")}
        role="tree"
        aria-multiselectable="true"
        onDragOver={(event) => dragOver(event, "")}
        // Only when the drag leaves the whole list: moving from row to row also fires it
        onDragLeave={(event) => !event.currentTarget.contains(event.relatedTarget as Node | null) && setDropTarget(null)}
        onDrop={(event) => void drop(event, "")}
        onClick={(event) => event.target === event.currentTarget && setSelected(new Set())}
      >
        {visible.length === 0 && <li className="p-4 text-center text-xs text-muted-foreground">{t("files.empty")}</li>}
        {visible.map((entry) => {
          const depth = entry.path.split("/").length - 1
          const isDir = entry.kind === "dir"
          const isOpen = isDir && !collapsed.has(entry.path)
          const Icon = iconFor(entry, isOpen)
          const isMain = entry.path === mainFile
          const isSelected = selected.has(entry.path)
          const cut = clipboard?.mode === "cut" && clipboard.paths.includes(entry.path)
          const many = isSelected && chosen.length > 1
          const targetPaths = many ? chosen : [entry.path]
          const deletable = targetPaths.filter((path) => !locked(path))
          return (
            <li key={entry.path} role="treeitem" aria-expanded={isDir ? isOpen : undefined} aria-selected={isSelected}>
              <div
                draggable
                onDragStart={(event) => dragStart(event, entry)}
                onDragEnd={() => setDropTarget(null)}
                onDragOver={(event) => dragOver(event, rowFolder(entry))}
                onDrop={(event) => void drop(event, rowFolder(entry))}
                className={cn(
                  "group flex h-9 items-center gap-1 pe-1 text-[13px] hover:bg-sidebar-accent/60",
                  isSelected && "bg-sidebar-accent text-sidebar-accent-foreground",
                  entry.path === activePath && !isSelected && "bg-sidebar-accent/70",
                  isDir && dropTarget === entry.path && "bg-primary/10 ring-2 ring-inset ring-ring",
                  cut && "opacity-50"
                )}
                style={{ paddingInlineStart: `${depth * 12 + 8}px` }}
              >
                <button type="button" onClick={(event) => void clickRow(event, entry)} className="flex min-w-0 flex-1 items-center gap-1.5 text-start outline-none focus-visible:underline">
                  {isDir ? (
                    <ChevronRight className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", isOpen ? "rotate-90" : "rtl:rotate-180")} />
                  ) : (
                    <span className="w-3.5 shrink-0" />
                  )}
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <span dir="auto" className="truncate">{baseName(entry.path)}</span>
                  {isMain && <Star className="size-3 shrink-0 fill-current text-muted-foreground" aria-label={t("files.main")} />}
                </button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-xs" className="shrink-0 text-muted-foreground" aria-label={t("files.more")}>
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-48">
                    {isDir && !many && (
                      <>
                        <DropdownMenuItem onSelect={() => setDialog({ type: "newFile", parent: entry.path })}>
                          <FilePlus /> {t("files.newFile")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setDialog({ type: "newFolder", parent: entry.path })}>
                          <FolderPlus /> {t("files.newFolder")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => void upload(entry.path)}>
                          <Upload /> {t("files.upload")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem onSelect={() => store().setClipboard(targetPaths, "copy")}>
                      <Copy /> {t("files.copy")}
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={deletable.length === 0} onSelect={() => store().setClipboard(deletable, "cut")}>
                      <Scissors /> {t("files.cut")}
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={!clipboard} onSelect={() => void paste(rowFolder(entry))}>
                      <ClipboardPaste /> {t("files.paste")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {!many && !isDir && fileKindOf(entry.path) === "markdown" && !isMain && (
                      <DropdownMenuItem onSelect={() => store().setMainFile(entry.path)}>
                        <Star /> {t("files.setMain")}
                      </DropdownMenuItem>
                    )}
                    {!many && (
                      <DropdownMenuItem onSelect={() => setDialog({ type: "rename", entry })}>
                        <Pencil /> {t("files.rename")}
                      </DropdownMenuItem>
                    )}
                    {deletable.length === 0 ? (
                      <DropdownMenuItem disabled>
                        <Lock /> {t("files.delete")}
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem variant="destructive" onSelect={() => setDialog({ type: "delete", paths: deletable })}>
                        <Trash2 /> {t("files.delete")}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </li>
          )
        })}
      </ul>

      {dropTarget !== null && (
        <div className="pointer-events-none absolute inset-0 border-2 border-dashed border-ring/60" aria-hidden>
          <div className="absolute inset-x-2 bottom-2 flex items-center justify-center gap-1.5 rounded-lg border border-border bg-popover px-3 py-2 text-xs font-medium text-popover-foreground shadow-md">
            <Download className="size-3.5 shrink-0" />
            <span dir="auto" className="truncate">
              {t("files.dropInto", { folder: dropTarget === "" ? t("files.root") : baseName(dropTarget) })}
            </span>
          </div>
        </div>
      )}

      <NameDialog dialog={dialog} onClose={() => setDialog(null)} onOpen={onOpen} />
      <DeleteDialog dialog={dialog} onClose={() => setDialog(null)} />
    </div>
  )
}

function NameDialog({ dialog, onClose, onOpen }: { dialog: Dialog; onClose: () => void; onOpen?: () => void }) {
  const { t } = useTranslation()
  const files = useEditorStore((state) => state.files)
  const [name, setName] = useState("")
  const [shownFor, setShownFor] = useState<Dialog>(null)

  const relevant = dialog && dialog.type !== "delete" ? dialog : null
  // Start each opening with the right text: empty for new things, the current name for a rename
  if (relevant !== shownFor) {
    setShownFor(relevant)
    setName(relevant?.type === "rename" ? baseName(relevant.entry.path) : "")
  }
  if (!relevant) return null

  const parent = relevant.type === "rename" ? parentOf(relevant.entry.path) : relevant.parent
  const existing = new Set(files.map((file) => file.path))
  if (relevant.type === "rename") existing.delete(relevant.entry.path)
  const typed = name.trim()
  // A new file without an extension is a Markdown file
  const finalName = relevant.type === "newFile" && typed && !typed.includes(".") ? `${typed}.md` : typed
  const problem = typed ? nameProblem(finalName, parent, existing) : null

  const submit = async () => {
    if (!typed || problem) return
    const store = useEditorStore.getState()
    if (relevant.type === "newFile") {
      await store.createFile(parent, finalName)
      onOpen?.()
    } else if (relevant.type === "newFolder") await store.createFolder(parent, finalName)
    else await store.rename(relevant.entry.path, finalName)
    onClose()
  }

  const title = relevant.type === "newFile" ? t("files.newFile") : relevant.type === "newFolder" ? t("files.newFolder") : t("files.rename")

  return (
    <ResponsiveDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={title}
      footer={
        <>
          <Button variant="outline" size="lg" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button size="lg" disabled={!typed || problem !== null} onClick={() => void submit()}>
            {relevant.type === "rename" ? t("common.save") : t("common.create")}
          </Button>
        </>
      }
    >
      <div className="grid gap-1.5">
        <Input
          dir="auto"
          autoFocus
          value={name}
          placeholder={relevant.type === "newFile" ? t("files.namePlaceholder") : relevant.type === "newFolder" ? t("files.folderPlaceholder") : undefined}
          aria-label={t("files.name")}
          aria-invalid={problem !== null}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && void submit()}
          className="h-10"
        />
        <p className={cn("h-4 text-xs", problem ? "text-destructive" : "text-transparent")} role={problem ? "alert" : undefined}>
          {problem ? t(`files.problem.${problem}`) : "."}
        </p>
      </div>
    </ResponsiveDialog>
  )
}

function DeleteDialog({ dialog, onClose }: { dialog: Dialog; onClose: () => void }) {
  const { t } = useTranslation()
  const files = useEditorStore((state) => state.files)
  if (!dialog || dialog.type !== "delete") return null
  const { paths } = dialog
  const only = paths.length === 1 ? files.find((entry) => entry.path === paths[0]) : undefined
  const description =
    paths.length > 1
      ? t("files.deleteMany", { count: paths.length })
      : only?.kind === "dir"
        ? t("files.deleteFolderConfirm", { name: baseName(paths[0]) })
        : t("files.deleteConfirm", { name: baseName(paths[0]) })
  return (
    <ResponsiveDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={t("files.delete")}
      description={description}
      footer={
        <>
          <Button variant="outline" size="lg" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="destructive"
            size="lg"
            onClick={() => {
              void useEditorStore.getState().removeMany(paths)
              onClose()
            }}
          >
            {t("common.delete")}
          </Button>
        </>
      }
    />
  )
}
