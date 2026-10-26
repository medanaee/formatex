import { useEffect, useRef, useState, type MouseEvent } from "react"
import { useNavigate } from "@tanstack/react-router"
import { AlertCircle, AlertTriangle, ChevronDown, ChevronUp, Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { DiagnosticList } from "@/components/editor/DiagnosticList"
import type { Diagnostic, PageLink, PageMap } from "@/lib/compiler"
import { sourceLineAt } from "@/lib/editor/sourceLookup"
import { isTauri } from "@/lib/platform"
import { CONFIG_FILE } from "@/lib/projects"
import { useSettingsStore } from "@/stores/useSettingsStore"
import { cn } from "@/lib/utils"
import { useEditorStore } from "@/stores/useEditorStore"

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

  const jumpToSource = (event: MouseEvent<HTMLDivElement>, index: number) => {
    const map = pages[index]?.map
    const { mainFile, texts } = useEditorStore.getState()
    const source = texts[mainFile]
    if (!map || source === undefined) return
    const rect = event.currentTarget.getBoundingClientRect()
    const line = sourceLineAt(source, pages.map((page) => page.map), index, ((event.clientX - rect.left) / rect.width) * map.width, ((event.clientY - rect.top) / rect.height) * map.height)
    if (line === null) return
    void useEditorStore.getState().revealAt(mainFile, line, 1)
    onJumpToSource?.()
  }

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
      <div ref={scroller} className="min-h-0 flex-1 overflow-auto">
        {status === "unavailable" ? (
          <p className="p-6 text-center text-xs text-muted-foreground">{t("editor.unavailable")}</p>
        ) : images.length === 0 ? (
          <p className="p-6 text-center text-xs text-muted-foreground">{status === "compiling" ? t("editor.compiling") : t("editor.noPages")}</p>
        ) : (
          <div className={cn("mx-auto flex max-w-3xl flex-col gap-3 p-3", !ok && "opacity-60")}>
            {images.map((image, index) => {
              const map = pages[index]?.map
              return (
                // The page is white paper in either theme; only its frame follows the theme. Keyed by position, so a rebuilt page
                // swaps its image in place instead of remounting the list
                <div key={index} ref={(el) => void (pageEls.current[index] = el)} className="relative cursor-text" onClick={(event) => jumpToSource(event, index)}>
                  <img src={image.url} alt={`${index + 1}`} style={{ aspectRatio: image.ratio }} className="block h-auto w-full rounded-sm bg-white shadow-xs ring-1 ring-border" draggable={false} />
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
