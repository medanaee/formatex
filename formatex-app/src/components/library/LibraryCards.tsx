import { useEffect, useId, useRef, useState, type CSSProperties, type DragEvent, type ReactNode, type RefObject } from "react"
import { FileText, MoreVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { DocumentItem } from "@/lib/db/types"
import { cachedThumbnail, requestThumbnail } from "@/lib/projectThumbnails"
import { hasFinePointer } from "@/lib/platform"
import { cn } from "@/lib/utils"
import { DROP_ROOT, useTouchDrag } from "./useTouchDrag"

/** The type a dragged card carries: the ids of the projects and folders being moved. */
export const LIBRARY_DRAG = "application/x-formatex-library"

export interface DragPayload {
  docs: string[]
  folders: string[]
}

export type MenuAction = { key: string; label: string; icon: ReactNode; onSelect: () => void; destructive?: boolean } | "separator"

/** The same list of actions as a right-click menu and as the three-dot menu of a card. */
export function ActionItems({ actions, kind }: { actions: MenuAction[]; kind: "context" | "dropdown" }) {
  const Item = kind === "context" ? ContextMenuItem : DropdownMenuItem
  const Separator = kind === "context" ? ContextMenuSeparator : DropdownMenuSeparator
  return (
    <>
      {actions.map((action, index) =>
        action === "separator" ? (
          <Separator key={`s${index}`} />
        ) : (
          <Item key={action.key} variant={action.destructive ? "destructive" : "default"} onSelect={action.onSelect}>
            {action.icon}
            {action.label}
          </Item>
        )
      )}
    </>
  )
}

export function readDrag(event: DragEvent): DragPayload | null {
  try {
    const raw = event.dataTransfer.getData(LIBRARY_DRAG)
    return raw ? (JSON.parse(raw) as DragPayload) : null
  } catch {
    return null
  }
}

/** Makes an element a place things can be dropped on; `onDropItems` gets what was dragged. */
export function useDropTarget(onDropItems: (payload: DragPayload) => void) {
  const [over, setOver] = useState(false)
  return {
    over,
    props: {
      onDragOver: (event: DragEvent) => {
        if (!event.dataTransfer.types.includes(LIBRARY_DRAG)) return
        event.preventDefault()
        event.dataTransfer.dropEffect = "move"
        setOver(true)
      },
      onDragLeave: () => setOver(false),
      onDrop: (event: DragEvent) => {
        setOver(false)
        const payload = readDrag(event)
        if (!payload) return
        event.preventDefault()
        event.stopPropagation()
        onDropItems(payload)
      },
    },
  }
}

interface CardShellProps {
  actions: MenuAction[]
  menuLabel: string
  payload: DragPayload
  /** Dropping on the card (a folder takes what is dropped). */
  onDropItems?: (payload: DragPayload) => void
  /** The name shown under a finger that drags the card. */
  label: string
  /** A finger dropped this card on a folder (`null`: the top level). */
  onTouchDrop: (payload: DragPayload, folder: string | null) => void
  /** Set on a folder: the id a finger drop is looked up by. */
  dropFolderId?: string
  className?: string
  children: ReactNode
}

/** A card of the library: draggable, with a right-click menu and a three-dot button that show the same actions. */
function CardShell({ actions, menuLabel, payload, onDropItems, label, onTouchDrop, dropFolderId, className, children }: CardShellProps) {
  const drop = useDropTarget(onDropItems ?? (() => {}))
  const card = useRef<HTMLLIElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  // A finger: a long press then a move drags the card, a long press alone shows the menu (the browser's own long-press drag and the
  // context menu's would both fight for the gesture, so the card handles it itself)
  useTouchDrag(card, { label, onDrop: (folder) => onTouchDrop(payload, folder), onMenu: () => setMenuOpen(true) })
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <li
          ref={card}
          data-drop-folder={dropFolderId}
          onPointerDownCapture={(event) => {
            // The context menu opens by itself after a long press of a finger; here that is the card's own long press
            if (event.pointerType !== "mouse" && !(event.target as HTMLElement).closest("[data-slot=dropdown-menu-trigger]")) event.stopPropagation()
          }}
          draggable={hasFinePointer()}
          onDragStart={(event) => {
            event.dataTransfer.setData(LIBRARY_DRAG, JSON.stringify(payload))
            event.dataTransfer.effectAllowed = "move"
          }}
          {...(onDropItems ? drop.props : {})}
          className={cn("group relative touch-pan-y rounded-xl border border-border bg-card text-card-foreground transition-colors select-none data-[armed]:scale-[0.97] data-[armed]:ring-2 data-[armed]:ring-primary/40 data-[drop-over]:border-primary data-[drop-over]:bg-primary/5 data-[drop-over]:ring-2 data-[drop-over]:ring-primary/40", drop.over && "border-primary bg-primary/5 ring-2 ring-primary/40", className)}
        >
          {children}
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="absolute end-1 top-1 bg-card/80 text-muted-foreground opacity-100 backdrop-blur-sm sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 data-[state=open]:opacity-100" title={menuLabel} aria-label={menuLabel}>
                <MoreVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <ActionItems actions={actions} kind="dropdown" />
            </DropdownMenuContent>
          </DropdownMenu>
        </li>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ActionItems actions={actions} kind="context" />
      </ContextMenuContent>
    </ContextMenu>
  )
}

/** The first page of a project as an image URL, typeset when the element comes into view (`undefined` while it is not known yet). */
function useThumbnail(doc: DocumentItem, host: RefObject<HTMLElement | null>): string | null | undefined {
  const [url, setUrl] = useState<string | null | undefined>(() => cachedThumbnail(doc))

  useEffect(() => {
    const cached = cachedThumbnail(doc)
    if (cached !== undefined) {
      setUrl(cached)
      return
    }
    const element = host.current
    if (!element) return
    let cancelled = false
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      observer.disconnect()
      void requestThumbnail(doc).then((next) => !cancelled && setUrl(next))
    })
    observer.observe(element)
    return () => {
      cancelled = true
      observer.disconnect()
    }
  }, [doc, host])

  return url
}

function Thumbnail({ doc }: { doc: DocumentItem }) {
  const host = useRef<HTMLDivElement>(null)
  const url = useThumbnail(doc, host)
  return (
    <div ref={host} className="flex aspect-[4/3] items-start justify-center overflow-hidden rounded-t-xl bg-muted/50">
      {url ? (
        // The page is white paper in either theme; it is cropped from the top like a cover
        <img src={url} alt="" draggable={false} className="h-auto w-3/5 bg-white shadow-xs ring-1 ring-border" />
      ) : (
        <FileText className="mt-8 size-9 stroke-1 text-muted-foreground" />
      )}
    </div>
  )
}

export function ProjectCard({ doc, subtitle, actions, menuLabel, href, onTouchDrop }: { doc: DocumentItem; subtitle: string; actions: MenuAction[]; menuLabel: string; href: ReactNode; onTouchDrop: (payload: DragPayload, folder: string | null) => void }) {
  return (
    <CardShell actions={actions} menuLabel={menuLabel} payload={{ docs: [doc.id], folders: [] }} label={doc.title} onTouchDrop={onTouchDrop}>
      {href}
      <Thumbnail doc={doc} />
      <div className="min-w-0 px-3 py-2">
        <div dir="auto" className="truncate text-[13px] font-semibold">
          {doc.title}
        </div>
        <div className="text-[11px] text-muted-foreground">{subtitle}</div>
      </div>
    </CardShell>
  )
}

const SHAPE = {
  back: "M8 14a7 7 0 0 1 7-7h21a7 7 0 0 1 5.4 2.6l3.6 4.4a3 3 0 0 0 2.3 1.1H89a7 7 0 0 1 7 7v50a7 7 0 0 1-7 7H15a7 7 0 0 1-7-7V14Z",
  front: "M8 34a7 7 0 0 1 7-7h74a7 7 0 0 1 7 7v38a7 7 0 0 1-7 7H15a7 7 0 0 1-7-7V34Z",
}

/** One of the pages that stick out of the folder: the first page of a project inside it. */
function FolderPage({ doc, style }: { doc: DocumentItem; style: CSSProperties }) {
  const host = useRef<HTMLDivElement>(null)
  const url = useThumbnail(doc, host)
  return (
    <div ref={host} style={style} className="absolute top-[5%] aspect-[0.72] w-[44%] overflow-hidden rounded-[3px] bg-white shadow-sm ring-1 ring-black/10">
      {url && <img src={url} alt="" draggable={false} className="h-full w-full object-cover object-top" />}
    </div>
  )
}

/**
 * A folder with some depth: a darker back with its tab, the first pages of up to three projects inside it sticking out, a lighter
 * front with a top highlight, and a soft shadow.
 */
function FolderGlyph({ docs, className }: { docs: DocumentItem[]; className?: string }) {
  const id = useId()
  const layout: CSSProperties[] =
    docs.length === 1
      ? [{ left: "28%", transform: "rotate(-3deg)" }]
      : docs.length === 2
        ? [
            { left: "14%", transform: "rotate(-8deg)" },
            { left: "42%", transform: "rotate(6deg)" },
          ]
        : [
            { left: "9%", top: "9%", transform: "rotate(-9deg)" },
            { left: "47%", top: "9%", transform: "rotate(9deg)" },
            { left: "28%", transform: "rotate(0deg)" },
          ]
  const layer = "pointer-events-none absolute inset-0 size-full"
  return (
    <div className={cn("relative aspect-[104/88]", className)}>
      <svg viewBox="0 0 104 88" fill="none" aria-hidden className={layer}>
        <defs>
          <linearGradient id={`${id}-back`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="currentColor" stopOpacity="0.75" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0.95" />
          </linearGradient>
          <filter id={`${id}-blur`} x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>
        <ellipse cx="52" cy="82" rx="38" ry="4" fill="black" opacity="0.28" filter={`url(#${id}-blur)`} />
        <path d={SHAPE.back} fill={`url(#${id}-back)`} />
      </svg>
      {docs.slice(0, 3).map((doc, index) => (
        <FolderPage key={doc.id} doc={doc} style={layout[index]} />
      ))}
      <svg viewBox="0 0 104 88" fill="none" aria-hidden className={layer}>
        <defs>
          <linearGradient id={`${id}-front`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="currentColor" stopOpacity="0.8" />
            <stop offset="1" stopColor="currentColor" />
          </linearGradient>
          <linearGradient id={`${id}-shine`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="white" stopOpacity="0.55" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={SHAPE.front} fill={`url(#${id}-front)`} />
        <path d="M8 34a7 7 0 0 1 7-7h74a7 7 0 0 1 7 7v10H8V34Z" fill={`url(#${id}-shine)`} />
        <path d="M15.5 27.5h73" stroke="white" strokeOpacity="0.6" strokeWidth="1" strokeLinecap="round" />
      </svg>
    </div>
  )
}

export function FolderCard({ id, name, subtitle, previews, actions, menuLabel, onOpen, onDropItems, onTouchDrop }: { id: string; name: string; subtitle: string; /** The projects inside, newest first; the first three show their first page. */ previews: DocumentItem[]; actions: MenuAction[]; menuLabel: string; onOpen: () => void; onDropItems: (payload: DragPayload) => void; onTouchDrop: (payload: DragPayload, folder: string | null) => void }) {
  return (
    <CardShell actions={actions} menuLabel={menuLabel} payload={{ docs: [], folders: [id] }} onDropItems={onDropItems} label={name} onTouchDrop={onTouchDrop} dropFolderId={id} className="self-start">
      <button type="button" onClick={onOpen} className="block w-full rounded-xl text-start outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <div className="flex aspect-[4/3] items-center justify-center rounded-t-xl bg-muted/50">
          <FolderGlyph docs={previews} className="w-1/2 min-w-20 max-w-32 text-[var(--syntax-link)] drop-shadow-sm transition-transform group-hover:scale-105" />
        </div>
        <div className="min-w-0 px-3 py-2">
          <div dir="auto" className="truncate text-[13px] font-semibold">
            {name}
          </div>
          <div className="text-[11px] text-muted-foreground">{subtitle}</div>
        </div>
      </button>
    </CardShell>
  )
}

export { DROP_ROOT }
