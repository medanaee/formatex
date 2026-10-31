import { useRef, useState } from "react"
import { ChevronRight, CornerLeftUp, FileText, Folder, FolderOpen, MoreVertical } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "@/components/ui/context-menu"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { DocumentItem, FolderItem } from "@/lib/db/types"
import { hasFinePointer } from "@/lib/platform"
import { cn } from "@/lib/utils"
import { ActionItems, DROP_ROOT, LIBRARY_DRAG, useDropTarget, type DragPayload, type MenuAction } from "./LibraryCards"
import { useTouchDrag } from "./useTouchDrag"

/** One line of the table: a folder or a project, how deep it lies (the tree view indents by it). */
export type LibraryRow =
  | { kind: "folder"; folder: FolderItem; depth: number; items: number }
  | { kind: "doc"; doc: DocumentItem; depth: number }
  /** The `..` line that goes up to the folder above (`parent`; null is the top level). */
  | { kind: "up"; parent: string | null }

/** The columns: the name, how many items a folder holds (a wide screen), and when a project last changed; the last one is the menu. */
const COLUMNS = "grid-cols-[minmax(0,1fr)_2.25rem] sm:grid-cols-[minmax(0,1fr)_5rem_9rem_2.25rem]"

interface LibraryRowsProps {
  rows: LibraryRow[]
  /** The tree view: folders open and close in place; otherwise a folder opens as the page. */
  tree: boolean
  expanded: ReadonlySet<string>
  onToggle: (folder: string) => void
  onOpenFolder: (folder: string) => void
  /** Goes to the top level (the `..` line of a folder directly under it). */
  onOpenTop: () => void
  onOpenDoc: (doc: DocumentItem) => void
  folderActions: (folder: FolderItem) => MenuAction[]
  docActions: (doc: DocumentItem) => MenuAction[]
  /** Dropping on a folder (a string) or on the top level (`null`). */
  onDropItems: (target: string | null) => (payload: DragPayload) => void
  onTouchDrop: (payload: DragPayload, folder: string | null) => void
  menuLabel: string
  formatDate: (time: number) => string
}

/** `..`: opens the folder above, and what is dropped on it moves there. */
function UpRow({ parent, onOpenFolder, onOpenTop, onDropItems }: { parent: string | null; onOpenFolder: (folder: string) => void; onOpenTop: () => void; onDropItems: (target: string | null) => (payload: DragPayload) => void }) {
  const { t } = useTranslation()
  const drop = useDropTarget(onDropItems(parent))
  return (
    <div
      role="row"
      data-drop-folder={parent ?? DROP_ROOT}
      {...drop.props}
      className={cn("grid min-h-10 items-center gap-x-2 border-b border-border/60 px-4 text-[13px] select-none hover:bg-muted/50 data-[drop-over]:bg-primary/10 data-[drop-over]:ring-1 data-[drop-over]:ring-inset data-[drop-over]:ring-primary/40", COLUMNS, drop.over && "bg-primary/10 ring-1 ring-inset ring-primary/40")}
    >
      <div role="cell" className="flex min-w-0 items-center">
        <button type="button" onClick={() => (parent ? onOpenFolder(parent) : onOpenTop())} title={t("library.up")} aria-label={t("library.up")} className="flex min-w-0 flex-1 items-center gap-2 rounded py-1.5 text-start outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <CornerLeftUp className="size-4 shrink-0 text-muted-foreground rtl:-scale-x-100" />
          <span dir="ltr" className="font-semibold">
            ..
          </span>
        </button>
      </div>
    </div>
  )
}

function Row({ row, tree, expanded, onToggle, onOpenFolder, onOpenDoc, folderActions, docActions, onDropItems, onTouchDrop, menuLabel, formatDate }: LibraryRowsProps & { row: Exclude<LibraryRow, { kind: "up" }> }) {
  const { t } = useTranslation()
  const isFolder = row.kind === "folder"
  const name = isFolder ? row.folder.name : row.doc.title
  const actions = isFolder ? folderActions(row.folder) : docActions(row.doc)
  const payload: DragPayload = isFolder ? { docs: [], folders: [row.folder.id] } : { docs: [row.doc.id], folders: [] }
  const open = isFolder && tree && expanded.has(row.folder.id)
  const drop = useDropTarget(isFolder ? onDropItems(row.folder.id) : () => {})
  const host = useRef<HTMLDivElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  useTouchDrag(host, { label: name, onDrop: (folder) => onTouchDrop(payload, folder), onMenu: () => setMenuOpen(true) })

  const Icon = isFolder ? (open ? FolderOpen : Folder) : FileText
  const choose = () => (isFolder ? (tree ? onToggle(row.folder.id) : onOpenFolder(row.folder.id)) : onOpenDoc(row.doc))
  const updated = isFolder ? "" : formatDate(row.doc.updatedAt)
  const items = isFolder ? t("library.items", { count: row.items }) : ""

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={host}
          role="row"
          data-drop-folder={isFolder ? row.folder.id : undefined}
          onPointerDownCapture={(event) => {
            // The context menu opens by itself after a long press of a finger; here that is the row's own long press
            if (event.pointerType !== "mouse" && !(event.target as HTMLElement).closest("[data-slot=dropdown-menu-trigger]")) event.stopPropagation()
          }}
          draggable={hasFinePointer()}
          onDragStart={(event) => {
            event.dataTransfer.setData(LIBRARY_DRAG, JSON.stringify(payload))
            event.dataTransfer.effectAllowed = "move"
          }}
          {...(isFolder ? drop.props : {})}
          className={cn("group grid min-h-10 touch-pan-y items-center gap-x-2 border-b border-border/60 px-4 text-[13px] select-none hover:bg-muted/50 data-[armed]:bg-primary/10 data-[drop-over]:bg-primary/10 data-[drop-over]:ring-1 data-[drop-over]:ring-inset data-[drop-over]:ring-primary/40", COLUMNS, drop.over && "bg-primary/10 ring-1 ring-inset ring-primary/40")}
        >
          <div role="cell" className="flex min-w-0 items-center" style={{ paddingInlineStart: row.depth * 16 }}>
            {tree && (
              <button
                type="button"
                tabIndex={isFolder ? 0 : -1}
                disabled={!isFolder}
                onClick={() => isFolder && onToggle(row.folder.id)}
                title={open ? t("library.collapse") : t("library.expand")}
                aria-label={open ? t("library.collapse") : t("library.expand")}
                aria-expanded={isFolder ? open : undefined}
                className={cn("flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring", !isFolder && "invisible")}
              >
                <ChevronRight className={cn("size-3.5 transition-transform rtl:rotate-180", open && "rotate-90 rtl:rotate-90")} />
              </button>
            )}
            <button type="button" onClick={choose} className="flex min-w-0 flex-1 items-center gap-2 rounded py-1.5 text-start outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Icon className={cn("size-4 shrink-0", isFolder ? "text-[var(--syntax-link)]" : "text-muted-foreground")} />
              <span className="min-w-0">
                <span dir="auto" className={cn("block truncate", isFolder && "font-semibold")}>
                  {name}
                </span>
                <span className="block truncate text-[11px] text-muted-foreground sm:hidden">{isFolder ? items : updated}</span>
              </span>
            </button>
          </div>
          <div role="cell" className="hidden truncate text-xs text-muted-foreground sm:block">
            {items}
          </div>
          <div role="cell" className="hidden truncate text-xs text-muted-foreground sm:block">
            {updated}
          </div>
          <div role="cell">
            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="text-muted-foreground sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 data-[state=open]:opacity-100" title={menuLabel} aria-label={menuLabel}>
                  <MoreVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <ActionItems actions={actions} kind="dropdown" />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ActionItems actions={actions} kind="context" />
      </ContextMenuContent>
    </ContextMenu>
  )
}

/**
 * The library as a table (the folder being shown) or as a tree (every folder from the top, opened in place), like the file tree of
 * the editor. A row is draggable onto a folder row; in the tree the header is the top level, a place to drop things to take them out
 * of their folders.
 */
export function LibraryRows(props: LibraryRowsProps) {
  const { t } = useTranslation()
  const root = useDropTarget(props.onDropItems(null))
  return (
    <div role="table" className="w-full">
      <div
        role="row"
        data-drop-folder={props.tree ? DROP_ROOT : undefined}
        {...(props.tree ? root.props : {})}
        className={cn("sticky top-0 grid items-center gap-x-2 border-b border-border bg-background px-4 py-1.5 text-[11px] font-medium text-muted-foreground", COLUMNS, root.over && "bg-primary/10 ring-1 ring-inset ring-primary/40", "data-[drop-over]:bg-primary/10")}
      >
        <div role="columnheader" className={cn(props.tree && "ps-6")}>
          {t("library.colName")}
        </div>
        <div role="columnheader" className="hidden sm:block">
          {t("library.colItems")}
        </div>
        <div role="columnheader" className="hidden sm:block">
          {t("library.colUpdated")}
        </div>
        <div />
      </div>
      {props.rows.map((row) =>
        row.kind === "up" ? <UpRow key="up" parent={row.parent} onOpenFolder={props.onOpenFolder} onOpenTop={props.onOpenTop} onDropItems={props.onDropItems} /> : <Row key={row.kind === "folder" ? `f${row.folder.id}` : `d${row.doc.id}`} row={row} {...props} />
      )}
    </div>
  )
}
