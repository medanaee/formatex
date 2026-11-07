import { useEffect, useMemo, useRef, useState, type DragEvent, type KeyboardEvent, type MouseEvent } from "react"
import {
  ChevronRight,
  ClipboardPaste,
  Copy,
  Download,
  FilePlus,
  FolderOpen,
  FolderPlus,
  Lock,
  MoreHorizontal,
  Pencil,
  Scissors,
  Star,
  Trash2,
  Upload,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { ResponsiveDialog } from "@/components/common/ResponsiveDialog"
import { ActionItems, type MenuAction } from "@/components/common/ActionItems"
import { Button } from "@/components/ui/button"
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "@/components/ui/context-menu"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { droppedEntries, readDropped } from "@/lib/files/droppedFiles"
import { pickFiles } from "@/lib/files/saveFile"
import { isTauri } from "@/lib/platform"
import { revealFolder } from "@/lib/projects/storageMode"
import { FileIcon } from "@/components/common/FileIcon"
import { baseName, CODE_EXTENSIONS, CONFIG_FILE, FORMATEX_CONFIG, FORMATEX_DIR, fileKindOf, nameProblem, parentOf, type FsEntry } from "@/lib/projects"
import { cn } from "@/lib/utils"
import { useEditorStore } from "@/stores/useEditorStore"
import { useLibraryStore } from "@/stores/useLibraryStore"

const UPLOAD_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "pdf", "csv", "json", "bib", "txt", "md", "toml", "typ", ...CODE_EXTENSIONS]
/** What a drag carries between rows of the tree. */
const DRAG_TYPE = "application/x-formatex-paths"

type Dialog = { type: "delete"; paths: string[] } | null

/** What is being typed in the tree itself, as in VS Code: a new file or folder in a folder, or the new name of an entry. */
type Editing = { type: "newFile" | "newFolder"; parent: string } | { type: "rename"; path: string } | null

/**
 * The files of the project, like Overleaf's. Click opens; Ctrl / Cmd + click toggles and Shift + click selects a range.
 * Drag rows onto a folder to move them (hold Ctrl / Alt to copy), and drop files from the computer to add them.
 * Ctrl + C / X / V copy, cut and paste; Delete removes the selection; F2 renames; Ctrl + A selects all. A new file, a new folder
 * and a rename are typed in the row itself (Enter keeps the name, Escape drops it); only a delete asks.
 * Sits at the start edge of the editor (the right in Persian).
 */
export function FileTree({ onOpen }: { /** Called after a file is chosen (a phone closes the drawer). */ onOpen?: () => void }) {
  const { t } = useTranslation()
  const files = useEditorStore((state) => state.files)
  const activePath = useEditorStore((state) => state.activePath)
  const mainFile = useEditorStore((state) => state.mainFile)
  const plainTypst = useEditorStore((state) => state.kind) === "typst"
  const clipboard = useEditorStore((state) => state.clipboard)
  const store = useEditorStore.getState

  const projectId = useEditorStore((state) => state.projectId)
  // A project kept in a folder of the user's: its files can be shown in the file manager
  const location = useLibraryStore((state) => state.documents.find((doc) => doc.id === projectId)?.location) ?? null
  const canReveal = isTauri() && location !== null
  const reveal = (path: string) => {
    if (location === null) return
    const separator = location.includes("\\") ? "\\" : "/"
    // A folder project keeps its config.toml in `.formatex/`
    const real = !plainTypst && path === CONFIG_FILE ? FORMATEX_CONFIG : path
    void revealFolder(path === "" ? location : `${location.replace(/[\\/]+$/, "")}${separator}${real.split("/").join(separator)}`)
  }
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
  // Every folder starts closed when a project is opened (the folders are known only once its files are listed)
  const closedFor = useRef<string | null>(null)
  useEffect(() => {
    if (!projectId || closedFor.current === projectId || files.length === 0) return
    closedFor.current = projectId
    setCollapsed(new Set(files.filter((entry) => entry.kind === "dir").map((entry) => entry.path)))
  }, [projectId, files])
  const [dialog, setDialog] = useState<Dialog>(null)
  const [editing, setEditing] = useState<Editing>(null)
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
    () => files.filter((entry) => !entry.alias && !entry.path.split("/").slice(0, -1).some((_, index, parts) => collapsed.has(parts.slice(0, index + 1).join("/")))),
    [files, collapsed]
  )

  /** The rows to draw: the entries, and a row for the name being typed when something new is made (right under its folder). */
  const rows = useMemo(() => {
    const list: ({ entry: FsEntry } | { draft: "newFile" | "newFolder"; parent: string })[] = visible.map((entry) => ({ entry }))
    if (editing && editing.type !== "rename") {
      const at = editing.parent === "" ? -1 : list.findIndex((row) => "entry" in row && row.entry.path === editing.parent)
      list.splice(at + 1, 0, { draft: editing.type, parent: editing.parent })
    }
    return list
  }, [visible, editing])

  /** Starts typing a new file or folder in `parent`: the folder opens so the row shows. */
  const startNew = (type: "newFile" | "newFolder", parent: string) => {
    setCollapsed((previous) => {
      const next = new Set(previous)
      next.delete(parent)
      return next
    })
    setEditing({ type, parent })
  }

  // config.toml and .formatex belong to a Formatex project; in plain Typst they are only files, and only the main file is kept
  const locked = (path: string) => (plainTypst ? path === mainFile && mainFile !== "" : path === CONFIG_FILE || path === FORMATEX_CONFIG || path === FORMATEX_DIR || path === mainFile)
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
      if (entry && !locked(entry.path)) setEditing({ type: "rename", path: entry.path })
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
    // Files and folders from the computer. The entries of the drop are taken now: they cannot be read after anything is awaited
    const entries = droppedEntries(event.dataTransfer)
    const dropped = await readDropped(entries)
    if (dropped.length) {
      const added = await store().importTree(folder, dropped)
      setSelected(new Set(added))
    }
  }

  const rowFolder = (entry: FsEntry) => (entry.kind === "dir" ? entry.path : parentOf(entry.path))

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-sidebar text-sidebar-foreground select-none outline-none" tabIndex={0} onKeyDown={onKeyDown}>
      <div className="flex h-7 shrink-0 items-center gap-0.5 border-b border-sidebar-border ps-3 pe-1">
        <span className="flex-1 truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {chosen.length > 1 ? t("files.selected", { count: chosen.length }) : t("editor.files")}
        </span>
        <Button variant="ghost" size="icon-xs" onClick={() => startNew("newFile", targetFolder())} title={t("files.newFile")} aria-label={t("files.newFile")}>
          <FilePlus />
        </Button>
        <Button variant="ghost" size="icon-xs" onClick={() => startNew("newFolder", targetFolder())} title={t("files.newFolder")} aria-label={t("files.newFolder")}>
          <FolderPlus />
        </Button>
        <Button variant="ghost" size="icon-xs" onClick={() => void upload(targetFolder())} title={t("files.upload")} aria-label={t("files.upload")}>
          <Upload />
        </Button>
      </div>

      <ul
        className={cn("flex min-h-0 flex-1 flex-col overflow-y-auto py-0.5", dropTarget === "" && "bg-sidebar-accent/40")}
        role="tree"
        aria-multiselectable="true"
        onDragOver={(event) => dragOver(event, "")}
        // Only when the drag leaves the whole list: moving from row to row also fires it
        onDragLeave={(event) => !event.currentTarget.contains(event.relatedTarget as Node | null) && setDropTarget(null)}
        onDrop={(event) => void drop(event, "")}
        onClick={(event) => event.target === event.currentTarget && setSelected(new Set())}
      >
        {visible.length === 0 && <li className="p-4 text-center text-xs text-muted-foreground">{t("files.empty")}</li>}
        {rows.map((row) => {
          if ("draft" in row) {
            const depth = row.parent === "" ? 0 : row.parent.split("/").length
            return (
              <li key="__draft__" role="treeitem" aria-selected>
                <div className="flex h-6 items-center gap-1 pe-1 text-xs pointer-coarse:h-9" style={{ paddingInlineStart: `${depth * 10 + 6}px` }}>
                  <span className="w-3 shrink-0" />
                  <FileIcon path={row.draft === "newFolder" ? "folder" : "file.md"} kind={row.draft === "newFolder" ? "dir" : "file"} size={16} />
                  <InlineName
                    initial=""
                    parent={row.parent}
                    existing={new Set(files.map((file) => file.path))}
                    markdownByDefault={row.draft === "newFile"}
                    label={row.draft === "newFile" ? t("files.newFile") : t("files.newFolder")}
                    placeholder={row.draft === "newFile" ? t("files.namePlaceholder") : t("files.folderPlaceholder")}
                    onCancel={() => setEditing(null)}
                    onSubmit={async (name) => {
                      setEditing(null)
                      if (row.draft === "newFile") {
                        await store().createFile(row.parent, name)
                        onOpen?.()
                      } else await store().createFolder(row.parent, name)
                    }}
                  />
                </div>
              </li>
            )
          }
          const entry = row.entry
          const renaming = editing?.type === "rename" && editing.path === entry.path
          const depth = entry.path.split("/").length - 1
          const isDir = entry.kind === "dir"
          const isOpen = isDir && !collapsed.has(entry.path)
          const isMain = entry.path === mainFile
          const isSelected = selected.has(entry.path)
          const cut = clipboard?.mode === "cut" && clipboard.paths.includes(entry.path)
          const many = isSelected && chosen.length > 1
          const targetPaths = many ? chosen : [entry.path]
          const deletable = targetPaths.filter((path) => !locked(path))
          const actions: MenuAction[] = [
            ...(isDir && !many
              ? ([
                  { key: "newFile", label: t("files.newFile"), icon: <FilePlus />, onSelect: () => startNew("newFile", entry.path) },
                  { key: "newFolder", label: t("files.newFolder"), icon: <FolderPlus />, onSelect: () => startNew("newFolder", entry.path) },
                  { key: "upload", label: t("files.upload"), icon: <Upload />, onSelect: () => void upload(entry.path) },
                  "separator",
                ] as MenuAction[])
              : []),
            { key: "copy", label: t("files.copy"), icon: <Copy />, onSelect: () => store().setClipboard(targetPaths, "copy") },
            { key: "cut", label: t("files.cut"), icon: <Scissors />, disabled: deletable.length === 0, onSelect: () => store().setClipboard(deletable, "cut") },
            { key: "paste", label: t("files.paste"), icon: <ClipboardPaste />, disabled: !clipboard, onSelect: () => void paste(rowFolder(entry)) },
            { key: "save", label: t("files.save"), icon: <Download />, onSelect: () => void store().saveEntries(targetPaths) },
            ...(canReveal && !many ? ([{ key: "reveal", label: t("files.reveal"), icon: <FolderOpen />, onSelect: () => reveal(entry.path) }] as MenuAction[]) : []),
            "separator",
            ...(!many && !isDir && fileKindOf(entry.path) === (plainTypst ? "typst" : "markdown") && !isMain
              ? ([{ key: "main", label: t("files.setMain"), icon: <Star />, onSelect: () => store().setMainFile(entry.path) }] as MenuAction[])
              : []),
            ...(!many && !locked(entry.path) ? ([{ key: "rename", label: t("files.rename"), icon: <Pencil />, onSelect: () => setEditing({ type: "rename", path: entry.path }) }] as MenuAction[]) : []),
            deletable.length === 0
              ? { key: "delete", label: t("files.delete"), icon: <Lock />, disabled: true, onSelect: () => undefined }
              : { key: "delete", label: t("files.delete"), icon: <Trash2 />, destructive: true, onSelect: () => setDialog({ type: "delete", paths: deletable }) },
          ]
          return (
            <li key={entry.path} role="treeitem" aria-expanded={isDir ? isOpen : undefined} aria-selected={isSelected}>
              <ContextMenu>
              <ContextMenuTrigger asChild>
              <div
                draggable
                onContextMenu={() => !selected.has(entry.path) && setSelected(new Set([entry.path]))}
                onDragStart={(event) => dragStart(event, entry)}
                onDragEnd={() => setDropTarget(null)}
                onDragOver={(event) => dragOver(event, rowFolder(entry))}
                onDrop={(event) => void drop(event, rowFolder(entry))}
                className={cn(
                  "group flex h-6 items-center gap-1 pe-1 text-xs hover:bg-sidebar-accent/60 pointer-coarse:h-9 pointer-coarse:text-[13px]",
                  isSelected && "bg-sidebar-accent text-sidebar-accent-foreground",
                  (entry.path === activePath || (entry.path === FORMATEX_CONFIG && activePath === CONFIG_FILE)) && !isSelected && "bg-sidebar-accent/70",
                  isDir && dropTarget === entry.path && "bg-primary/10 ring-2 ring-inset ring-ring",
                  cut && "opacity-50"
                )}
                style={{ paddingInlineStart: `${depth * 10 + 6}px` }}
              >
                {renaming ? (
                  <div className="flex h-full min-w-0 flex-1 items-center gap-1">
                    {isDir ? <ChevronRight className={cn("size-3 shrink-0 text-muted-foreground", isOpen ? "rotate-90" : "rtl:rotate-180")} /> : <span className="w-3 shrink-0" />}
                    <FileIcon path={entry.path} kind={entry.kind} open={isOpen} size={16} />
                    <InlineName
                      initial={baseName(entry.path)}
                      parent={parentOf(entry.path)}
                      existing={new Set(files.map((file) => file.path).filter((path) => path !== entry.path))}
                      label={t("files.rename")}
                      onCancel={() => setEditing(null)}
                      onSubmit={async (name) => {
                        setEditing(null)
                        await store().rename(entry.path, name)
                      }}
                    />
                  </div>
                ) : (
                  <button type="button" onClick={(event) => void clickRow(event, entry)} className="flex h-full min-w-0 flex-1 items-center gap-1 text-start outline-none focus-visible:underline">
                    {isDir ? (
                      <ChevronRight className={cn("size-3 shrink-0 text-muted-foreground transition-transform", isOpen ? "rotate-90" : "rtl:rotate-180")} />
                    ) : (
                      <span className="w-3 shrink-0" />
                    )}
                    <FileIcon path={entry.path} kind={entry.kind} open={isOpen} size={16} />
                    <span dir="auto" className="truncate">{baseName(entry.path)}</span>
                    {isMain && <Star className="size-3 shrink-0 fill-current text-muted-foreground" aria-label={t("files.main")} />}
                  </button>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-xs" className="size-5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 pointer-coarse:size-7 pointer-coarse:opacity-100" aria-label={t("files.more")}>
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-48">
                    <ActionItems actions={actions} kind="dropdown" />
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              </ContextMenuTrigger>
              <ContextMenuContent className="min-w-48">
                <ActionItems actions={actions} kind="context" />
              </ContextMenuContent>
              </ContextMenu>
            </li>
          )
        })}
        {/* The empty part under the rows: a right click here is for the project's root */}
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <li role="none" className="min-h-6 flex-1" onClick={() => setSelected(new Set())} />
          </ContextMenuTrigger>
          <ContextMenuContent className="min-w-48">
            <ActionItems
              kind="context"
              actions={[
                { key: "newFile", label: t("files.newFile"), icon: <FilePlus />, onSelect: () => startNew("newFile", "") },
                { key: "newFolder", label: t("files.newFolder"), icon: <FolderPlus />, onSelect: () => startNew("newFolder", "") },
                { key: "upload", label: t("files.upload"), icon: <Upload />, onSelect: () => void upload("") },
                "separator",
                { key: "paste", label: t("files.paste"), icon: <ClipboardPaste />, disabled: !clipboard, onSelect: () => void paste("") },
                ...(canReveal ? (["separator", { key: "reveal", label: t("files.reveal"), icon: <FolderOpen />, onSelect: () => reveal("") }] as MenuAction[]) : []),
              ]}
            />
          </ContextMenuContent>
        </ContextMenu>
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

      <DeleteDialog dialog={dialog} onClose={() => setDialog(null)} />
    </div>
  )
}

interface InlineNameProps {
  /** The text to start from: empty for something new, the current name for a rename. */
  initial: string
  /** The folder the name is in, and the paths that exist (the entry being renamed left out), to check the name. */
  parent: string
  existing: ReadonlySet<string>
  /** A new file without an extension is a Markdown file. */
  markdownByDefault?: boolean
  label: string
  placeholder?: string
  onSubmit: (name: string) => void | Promise<void>
  onCancel: () => void
}

/**
 * The name of a new entry, or of a rename, typed in the row of the tree. Enter (or leaving the field with a good name) keeps it,
 * Escape (or leaving it empty or unchanged) drops it; a name that cannot be used is shown in red under the field.
 */
function InlineName({ initial, parent, existing, markdownByDefault = false, label, placeholder, onSubmit, onCancel }: InlineNameProps) {
  const { t } = useTranslation()
  const [name, setName] = useState(initial)
  const input = useRef<HTMLInputElement>(null)
  const finished = useRef(false)
  const born = useRef(0)

  // The name is selected without its extension, so a rename keeps `.md`
  useEffect(() => {
    const field = input.current
    if (!field) return
    born.current = performance.now()
    field.focus()
    const dot = initial.lastIndexOf(".")
    field.setSelectionRange(0, dot > 0 ? dot : initial.length)
  }, [initial])

  const typed = name.trim()
  const finalName = markdownByDefault && typed && !typed.includes(".") ? `${typed}.md` : typed
  const plain = useEditorStore((state) => state.kind) === "typst"
  const problem = typed && finalName !== initial ? nameProblem(finalName, parent, existing, plain) : null

  const finish = (keep: boolean) => {
    if (finished.current) return
    if (keep && typed && finalName !== initial) {
      // A name that cannot be used keeps the field open; leaving it drops the name
      if (problem) return
      finished.current = true
      void onSubmit(finalName)
      return
    }
    finished.current = true
    onCancel()
  }

  return (
    <div className="relative min-w-0 flex-1">
      <Input
        ref={input}
        dir="auto"
        value={name}
        placeholder={placeholder}
        aria-label={label}
        aria-invalid={problem !== null}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          event.stopPropagation()
          if (event.key === "Enter") finish(true)
          else if (event.key === "Escape") finish(false)
        }}
        onBlur={(event) => {
          // The menu that started a new file gives the focus back to its button as it closes: the field takes it again
          if (event.timeStamp - born.current < 400) return void requestAnimationFrame(() => input.current?.focus())
          if (problem) {
            finished.current = true
            onCancel()
          } else finish(true)
        }}
        // Looks like the row's own text (same size and place, no box); only a continuous line under it shows that it is being edited
        className={cn("h-full w-full rounded-none border-0! bg-transparent! p-0 text-xs shadow-[inset_0_-1px_0_0_var(--info)]! ring-0! outline-none focus-visible:border-0! focus-visible:ring-0! aria-invalid:border-0! aria-invalid:ring-0! dark:bg-transparent! md:text-xs pointer-coarse:text-[13px]", problem && "text-destructive shadow-[inset_0_-1px_0_0_var(--destructive)]!")}
      />
      {problem && (
        <p role="alert" className="absolute start-0 top-full mt-0.5 max-w-full rounded-sm border border-destructive bg-popover px-1.5 py-0.5 text-[11px] whitespace-normal text-destructive">
          {t(`files.problem.${problem}`)}
        </p>
      )}
    </div>
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
