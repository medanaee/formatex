import { useEffect, useRef, useState, type MouseEvent } from "react"
import { useNavigate } from "@tanstack/react-router"
import { AlertCircle, AlertTriangle, ChevronDown, ChevronUp, Loader2, LocateFixed, Minus, Plus } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { stepZoom, ZOOM_PRESETS } from "@/lib/previewZoom"
import { useWorkspaceStore } from "@/stores/useWorkspaceStore"
import { DiagnosticList } from "@/components/editor/DiagnosticList"
import type { Diagnostic, PageLink, PageMap } from "@/lib/compiler"
import { lineFromMarker, markerAt } from "@/lib/editor/markerLookup"
import { sourcePlaceAt } from "@/lib/editor/sourceLookup"
import { isTauri } from "@/lib/platform"
import { CONFIG_FILE } from "@/lib/projects"
import { useSettingsStore } from "@/stores/useSettingsStore"
import { cn } from "@/lib/utils"
import { useEditorStore } from "@/stores/useEditorStore"
import { usePreviewScrollStore } from "@/stores/usePreviewScrollStore"

interface PageImage {
  url: string
  /** width / height of the page, so its box keeps its size while a new image loads (the scroll position stays). */
  ratio: number
}

/**
 * One image per page, kept by content hash: a page that did not change keeps its object URL, so its `<img>` is not touched and
 * the scroll position does not move. Only a changed page gets a new URL.
 */
function usePageImages(pages: { hash: string; svg: string; map: PageMap | null }[]): PageImage[] {
  const [cache] = useState(() => new Map<string, PageImage>())
  const images = pages.map((page) => {
    let image = cache.get(page.hash)
    if (!image) {
      const box = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(page.svg.slice(0, 400))
      image = { url: URL.createObjectURL(new Blob([page.svg], { type: "image/svg+xml" })), ratio: box ? Number(box[1]) / Number(box[2]) : 0.7 }
      cache.set(page.hash, image)
    }
    return image
  })
  useEffect(() => {
    const live = new Set(pages.map((page) => page.hash))
    for (const [hash, image] of cache) {
      if (!live.has(hash)) {
        URL.revokeObjectURL(image.url)
        cache.delete(hash)
      }
    }
  }, [pages, cache])
  useEffect(() => {
    const kept = cache
    return () => {
      kept.forEach((image) => URL.revokeObjectURL(image.url))
      kept.clear()
    }
  }, [cache])
  return images
}

async function openExternal(url: string): Promise<void> {
  if (isTauri()) {
    const { openUrl } = await import("@tauri-apps/plugin-opener")
    await openUrl(url)
  } else window.open(url, "_blank", "noopener,noreferrer")
}

/**
 * The typeset pages, and below them the compilation status with the list of problems. The pages are images, so links and clicks
 * come from the maps the compiler sends: a link opens its address or scrolls to its place; a click on text puts the editor's
 * cursor on that text in the source (`onJumpToSource` lets a narrow screen switch to the editor).
 */
export function PreviewPane({ onJumpToSource }: { onJumpToSource?: () => void }) {
  const { t } = useTranslation()
  const pages = useEditorStore((state) => state.pages)
  const diagnostics = useEditorStore((state) => state.diagnostics)
  const status = useEditorStore((state) => state.compileStatus)
  const ok = useEditorStore((state) => state.ok)
  const elapsedMs = useEditorStore((state) => state.elapsedMs)
  const images = usePageImages(pages)
  const scroller = useRef<HTMLDivElement>(null)
  const pageEls = useRef<(HTMLDivElement | null)[]>([])

  const followLink = (link: PageLink) => {
    if (link.url) {
      void openExternal(link.url)
      return
    }
    const target = pageEls.current[(link.page ?? 1) - 1]
    const map = pages[(link.page ?? 1) - 1]?.map
    const box = scroller.current
    if (!target || !box) return
    const inPage = map ? (link.py / map.height) * target.getBoundingClientRect().height : 0
    box.scrollTo({ top: box.scrollTop + target.getBoundingClientRect().top - box.getBoundingClientRect().top + inPage - 16, behavior: "smooth" })
  }

  const jumpToSource = async (event: MouseEvent<HTMLDivElement>, index: number) => {
    const map = pages[index]?.map
    if (!map) return
    const rect = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * map.width
    const y = ((event.clientY - rect.top) / rect.height) * map.height
    const store = useEditorStore.getState()
    const maps = pages.map((page) => page.map)
    // The block the click is in comes from the engine's markers (any file of the project); the text search only finds the row in it
    const marker = markerAt(store.markers, index, x, y, maps)
    if (marker) {
      const source = await store.load(marker.file).catch(() => undefined)
      const place = source === undefined ? { line: marker.line, column: 1 } : lineFromMarker(store.markers, maps, marker, source, index, x, y)
      void store.revealAt(marker.file, place.line, place.column)
      onJumpToSource?.()
      return
    }
    // A build without markers: the text search over the whole document, in the main file
    const source = store.texts[store.mainFile]
    if (source === undefined) return
    const place = sourcePlaceAt(source, maps, index, x, y)
    if (place === null) return
    void store.revealAt(store.mainFile, place.line, place.column)
    onJumpToSource?.()
  }

  const follow = useSettingsStore((state) => state.previewFollow)
  const setFollow = useSettingsStore((state) => state.setPreviewFollow)
  const zoom = useSettingsStore((state) => state.previewZoom)
  const setZoom = useSettingsStore((state) => state.setPreviewZoom)
  const [current, setCurrent] = useState(1)

  // The size of the pane, for the two fit modes
  const [size, setSize] = useState({ w: 0, h: 0 })
  useEffect(() => {
    const box = scroller.current
    if (!box) return
    const measure = () => setSize({ w: box.clientWidth, h: box.clientHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(box)
    return () => observer.disconnect()
  }, [])
  // The width of a page in px: a percent of the readable width (the pane's, up to 48rem), the pane's width, or what fits its height
  const room = Math.max(size.w - 24, 0)
  const base = Math.min(room, 768)
  const ratio = images[0]?.ratio ?? 0.7
  const pageWidth = typeof zoom === "number" ? (base * zoom) / 100 : zoom === "width" ? room : Math.min(room, Math.max(size.h - 24, 0) * ratio)
  const percent = base > 0 ? (pageWidth / base) * 100 : 100
  useEffect(() => {
    if (base > 0) useWorkspaceStore.getState().set({ previewShown: percent })
  }, [percent, base])

  // The page at the top of the pane is the current one
  const markPage = () => {
    const box = scroller.current
    if (!box) return
    const edge = box.getBoundingClientRect().top + box.clientHeight / 3
    let found = 1
    pageEls.current.forEach((el, index) => {
      if (el && el.getBoundingClientRect().top <= edge) found = index + 1
    })
    setCurrent(found)
  }
  const goToPage = (page: number) => {
    const target = pageEls.current[Math.min(Math.max(page, 1), pages.length) - 1]
    const box = scroller.current
    if (!target || !box) return
    box.scrollTo({ top: box.scrollTop + target.getBoundingClientRect().top - box.getBoundingClientRect().top - 12, behavior: "smooth" })
  }
  const shownPage = Math.min(current, Math.max(pages.length, 1))

  // A place the editor asked for (following the typing, or "Go to here in preview"): scrolled to unless it is already well in view
  const target = usePreviewScrollStore((state) => state.target)
  const applied = useRef(0)
  useEffect(() => {
    const box = scroller.current
    const el = target ? pageEls.current[target.page] : null
    const map = target ? pages[target.page]?.map : null
    // A hidden pane has no size yet: the request waits until it has
    if (!target || target.id === applied.current || !box || box.clientHeight === 0 || !el || !map) return
    applied.current = target.id
    const rect = el.getBoundingClientRect()
    const scale = rect.height / map.height
    const top = rect.top - box.getBoundingClientRect().top + target.y * scale
    const bottom = top + Math.max(target.h * scale, 14)
    if (top < box.clientHeight * 0.15 || bottom > box.clientHeight * 0.8) box.scrollTo({ top: box.scrollTop + top - box.clientHeight / 3, behavior: "smooth" })
  }, [target, pages, size.w, size.h])

  // Ctrl + wheel (and a pinch on a touchpad) zooms the pages, not the whole window
  useEffect(() => {
    const box = scroller.current
    if (!box) return
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) {
        usePreviewScrollStore.getState().manualScroll()
        return
      }
      event.preventDefault()
      stepZoom(event.deltaY < 0 ? 1 : -1)
    }
    // Scrolling by hand: the wheel, a finger, or dragging the scrollbar (a press on the pane itself, not on a page)
    const onTouch = () => usePreviewScrollStore.getState().manualScroll()
    const onPress = (event: PointerEvent) => {
      if (event.target === box) usePreviewScrollStore.getState().manualScroll()
    }
    box.addEventListener("wheel", onWheel, { passive: false })
    box.addEventListener("touchmove", onTouch, { passive: true })
    box.addEventListener("pointerdown", onPress)
    return () => {
      box.removeEventListener("wheel", onWheel)
      box.removeEventListener("touchmove", onTouch)
      box.removeEventListener("pointerdown", onPress)
    }
  }, [])

  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  // A problem in a component of the library is fixed on the Components screen; one in a project file, in the editor
  const go = (diagnostic: Diagnostic) => {
    if (!diagnostic.path || !diagnostic.line) return
    // A problem in config.toml is read in its source, not in the settings screen
    if (diagnostic.path === CONFIG_FILE) useSettingsStore.getState().setConfigVisual(false)
    const component = /^components\/(.+)\.typ$/.exec(diagnostic.path)
    if (component) void navigate({ to: "/components/$name", params: { name: component[1] } })
    else void useEditorStore.getState().revealAt(diagnostic.path, diagnostic.line, diagnostic.column ?? 1)
  }

  const errors = diagnostics.filter((d) => d.severity === "error").length
  const warnings = diagnostics.length - errors
  // A failed build shows its problems on its own; a clean one stays quiet
  const showList = open || (!ok && diagnostics.length > 0 && errors > 0 && pages.length === 0)

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-muted/40">
      <div dir="ltr" className="flex h-8 shrink-0 items-center gap-1 border-b border-border bg-background px-2 text-xs text-muted-foreground select-none">
        <Button variant="ghost" size="icon-xs" disabled={pages.length === 0 || shownPage <= 1} onClick={() => goToPage(shownPage - 1)} title={t("preview.prevPage")} aria-label={t("preview.prevPage")}>
          <ChevronUp />
        </Button>
        <input
          key={shownPage}
          defaultValue={pages.length ? shownPage : ""}
          disabled={pages.length === 0}
          inputMode="numeric"
          aria-label={t("preview.page")}
          onKeyDown={(event) => {
            if (event.key === "Enter") goToPage(Number(event.currentTarget.value) || shownPage)
          }}
          onFocus={(event) => event.currentTarget.select()}
          className="h-5 w-9 rounded border border-border bg-transparent text-center text-foreground tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <span className="tabular-nums">/ {pages.length}</span>
        <Button variant="ghost" size="icon-xs" disabled={pages.length === 0 || shownPage >= pages.length} onClick={() => goToPage(shownPage + 1)} title={t("preview.nextPage")} aria-label={t("preview.nextPage")}>
          <ChevronDown />
        </Button>
        <span className="flex-1" />
        <Button variant={follow ? "secondary" : "ghost"} size="icon-xs" aria-pressed={follow} onClick={() => setFollow(!follow)} title={t("preview.follow")} aria-label={t("preview.follow")}>
          <LocateFixed />
        </Button>
        <Button variant="ghost" size="icon-xs" disabled={percent <= 30} onClick={() => stepZoom(-1)} title={t("preview.zoomOut")} aria-label={t("preview.zoomOut")}>
          <Minus />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger title={t("preview.zoom")} className="h-5 min-w-12 rounded px-1 text-center text-foreground tabular-nums outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-muted">
            {zoom === "width" ? t("preview.fitWidth") : zoom === "page" ? t("preview.fitPage") : `${zoom}%`}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-auto min-w-36">
            <DropdownMenuRadioGroup value={String(zoom)} onValueChange={(value) => setZoom(value === "width" || value === "page" ? value : Number(value))}>
              <DropdownMenuRadioItem value="width">{t("preview.fitWidth")}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="page">{t("preview.fitPage")}</DropdownMenuRadioItem>
              <DropdownMenuSeparator />
              {ZOOM_PRESETS.map((value) => (
                <DropdownMenuRadioItem key={value} value={String(value)}>
                  {value}%
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="ghost" size="icon-xs" disabled={percent >= 400} onClick={() => stepZoom(1)} title={t("preview.zoomIn")} aria-label={t("preview.zoomIn")}>
          <Plus />
        </Button>
      </div>
      <div ref={scroller} onScroll={markPage} className="min-h-0 flex-1 overflow-auto">
        {status === "unavailable" ? (
          <p className="p-6 text-center text-xs text-muted-foreground">{t("editor.unavailable")}</p>
        ) : images.length === 0 ? (
          <p className="p-6 text-center text-xs text-muted-foreground">{status === "compiling" ? t("editor.compiling") : t("editor.noPages")}</p>
        ) : (
          <div style={{ width: size.w > 0 ? pageWidth + 24 : "100%" }} className={cn("mx-auto box-border flex flex-col gap-3 p-3", !ok && "opacity-60")}>
            {images.map((image, index) => {
              const map = pages[index]?.map
              return (
                // The page is white paper in either theme; only its frame follows the theme. Keyed by position, so a rebuilt page
                // swaps its image in place instead of remounting the list
                <div key={index} ref={(el) => void (pageEls.current[index] = el)} className="relative cursor-text" onClick={(event) => void jumpToSource(event, index)}>
                  <img src={image.url} alt={`${index + 1}`} style={{ aspectRatio: image.ratio }} className="block h-auto w-full rounded-sm bg-white shadow-xs ring-1 ring-border" draggable={false} />
                  {map && target?.flash && target.page === index && (
                    // Marks the place the user asked for; a new request has a new id, which restarts the fade
                    <div
                      key={target.id}
                      style={{ position: "absolute", insetInline: 0, top: `${(target.y / map.height) * 100}%`, height: `${(Math.max(target.h, 12) / map.height) * 100}%` }}
                      className="preview-flash pointer-events-none rounded-xs bg-primary/25 ring-1 ring-primary/50"
                    />
                  )}
                  {map?.links.map((link, i) => (
                    // Boxes are in points from the page's physical top-left corner, like the image, whatever the interface direction
                    <a
                      key={i}
                      href={link.url ?? `#page-${link.page}`}
                      title={link.url ?? undefined}
                      onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        followLink(link)
                      }}
                      style={{ position: "absolute", left: `${(link.x / map.width) * 100}%`, top: `${(link.y / map.height) * 100}%`, width: `${(link.w / map.width) * 100}%`, height: `${(link.h / map.height) * 100}%` }}
                      className="cursor-pointer rounded-xs transition-colors hover:bg-primary/15"
                    />
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showList && diagnostics.length > 0 && <DiagnosticList diagnostics={diagnostics} onGo={go} className="max-h-[40%] shrink-0 border-t border-border" />}

      <div className="flex h-8 shrink-0 items-center gap-3 border-t border-border bg-background px-3 text-xs text-muted-foreground select-none">
        {status === "compiling" ? (
          <span className="flex items-center gap-1.5">
            <Loader2 className="size-3.5 animate-spin" /> {t("editor.compiling")}
          </span>
        ) : (
          <span>
            {pages.length > 0 && t("editor.pages", { count: pages.length })}
            {elapsedMs !== null && <span className="ms-2 tabular-nums">{(elapsedMs / 1000).toFixed(1)}s</span>}
          </span>
        )}
        <span className="flex-1" />
        {diagnostics.length > 0 ? (
          <button type="button" onClick={() => setOpen((value) => !value)} className="flex items-center gap-2 rounded px-1 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
            {errors > 0 && (
              <span className="flex items-center gap-1 text-destructive">
                <AlertCircle className="size-3.5" /> {t("editor.errors", { count: errors })}
              </span>
            )}
            {warnings > 0 && (
              <span className="flex items-center gap-1">
                <AlertTriangle className="size-3.5" /> {t("editor.warnings", { count: warnings })}
              </span>
            )}
            {showList ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
          </button>
        ) : (
          status === "idle" && pages.length > 0 && <span>{t("editor.noProblems")}</span>
        )}
      </div>
    </div>
  )
}
