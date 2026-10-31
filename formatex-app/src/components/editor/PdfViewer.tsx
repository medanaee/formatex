import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronDown, ChevronUp, Minus, Plus } from "lucide-react"
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ZOOM_PRESETS } from "@/lib/previewZoom"
import { openProjectFs } from "@/lib/projects"
import { useEditorStore } from "@/stores/useEditorStore"

const MIN_ZOOM = 0.25
const MAX_ZOOM = 4
const GAP = 12

/** One page, drawn when it comes near the visible part of the scroller (a long document does not render all at once). */
function PdfPage({ doc, number, scale, root, size }: { doc: PDFDocumentProxy; number: number; scale: number; root: HTMLElement | null; size: { width: number; height: number } }) {
  const wrap = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [near, setNear] = useState(false)

  useEffect(() => {
    if (!wrap.current || !root) return
    const observer = new IntersectionObserver(([entry]) => setNear(entry.isIntersecting), { root, rootMargin: "800px 0px" })
    observer.observe(wrap.current)
    return () => observer.disconnect()
  }, [root])

  useEffect(() => {
    if (!near || !canvas.current) return
    let task: RenderTask | null = null
    let live = true
    void doc.getPage(number).then((page) => {
      if (!live || !canvas.current) return
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      const viewport = page.getViewport({ scale })
      const element = canvas.current
      element.width = Math.floor(viewport.width * ratio)
      element.height = Math.floor(viewport.height * ratio)
      element.style.width = `${Math.floor(viewport.width)}px`
      element.style.height = `${Math.floor(viewport.height)}px`
      const context = element.getContext("2d")
      if (!context) return
      task = page.render({ canvas: element, canvasContext: context, viewport, transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0] })
      task.promise.catch(() => {})
    })
    return () => {
      live = false
      task?.cancel()
    }
  }, [doc, number, scale, near])

  return (
    <div ref={wrap} data-page={number} style={{ width: size.width * scale, height: size.height * scale }} className="mx-auto shrink-0 bg-white ring-1 ring-border">
      <canvas ref={canvas} className="block" />
    </div>
  )
}

/** A PDF of the project, shown with pdf.js: pages in a scroller, a slim bar to go to a page and to zoom. */
export function PdfViewer({ path }: { path: string }) {
  const { t } = useTranslation()
  const projectId = useEditorStore((state) => state.projectId)
  const scroller = useRef<HTMLDivElement | null>(null)
  // The scroller as state too: the pages watch it for what is visible
  const [root, setRoot] = useState<HTMLDivElement | null>(null)
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null)
  const [failed, setFailed] = useState(false)
  /** Size of the first page at scale 1: the placeholder of every page until it is drawn, and the base of "fit width". */
  const [base, setBase] = useState<{ width: number; height: number } | null>(null)
  const [zoom, setZoom] = useState<number | "width" | "page">("width")
  const [box, setBox] = useState({ width: 0, height: 0 })
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (!projectId) return
    let live = true
    let loading: { destroy: () => Promise<void> } | null = null
    setDoc(null)
    setFailed(false)
    void (async () => {
      try {
        const pdfjs = await import("pdfjs-dist")
        const worker = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default
        pdfjs.GlobalWorkerOptions.workerSrc = worker
        const bytes = await (await openProjectFs(projectId)).readBytes(path)
        const task = pdfjs.getDocument({ data: bytes })
        loading = task
        const loaded = await task.promise
        if (!live) return
        const first = await loaded.getPage(1)
        const viewport = first.getViewport({ scale: 1 })
        setBase({ width: viewport.width, height: viewport.height })
        setPage(1)
        setDoc(loaded)
      } catch (error) {
        console.error("[formatex] could not open the PDF", error)
        if (live) setFailed(true)
      }
    })()
    return () => {
      live = false
      void loading?.destroy()
    }
  }, [projectId, path])

  useEffect(() => {
    const element = scroller.current
    if (!element) return
    const measure = () => setBox({ width: element.clientWidth, height: element.clientHeight })
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    measure()
    return () => observer.disconnect()
  }, [doc])

  const fitWidth = base && box.width > 0 ? Math.max((box.width - 24) / base.width, MIN_ZOOM) : 1
  const fitPage = base && box.height > 0 ? Math.max(Math.min(fitWidth, (box.height - 24) / base.height), MIN_ZOOM) : fitWidth
  const scale = zoom === "width" ? fitWidth : zoom === "page" ? fitPage : zoom / 100
  const percent = Math.round(scale * 100)
  const pages = doc?.numPages ?? 0

  const goTo = useCallback(
    (number: number) => {
      const target = Math.min(Math.max(number, 1), pages || 1)
      scroller.current?.querySelector<HTMLElement>(`[data-page="${target}"]`)?.scrollIntoView({ block: "start" })
      setPage(target)
    },
    [pages]
  )

  const onScroll = () => {
    const element = scroller.current
    if (!element) return
    let current = 1
    for (const child of element.querySelectorAll<HTMLElement>("[data-page]")) {
      if (child.offsetTop - element.offsetTop <= element.scrollTop + element.clientHeight / 3) current = Number(child.dataset.page)
      else break
    }
    setPage(current)
  }

  const step = (direction: 1 | -1) => setZoom(Math.min(Math.max(Math.round(percent * (direction > 0 ? 1.2 : 1 / 1.2)), MIN_ZOOM * 100), MAX_ZOOM * 100))

  if (failed) return <div className="flex h-full items-center justify-center p-6 text-center text-xs text-muted-foreground">{t("pdf.failed")}</div>

  return (
    <div dir="ltr" className="flex h-full min-h-0 min-w-0 flex-col bg-muted/40">
      <div className="flex h-8 shrink-0 items-center gap-1 border-b border-border bg-background px-2 text-xs text-muted-foreground select-none">
        <Button variant="ghost" size="icon-xs" disabled={!doc || page <= 1} onClick={() => goTo(page - 1)} title={t("preview.prevPage")} aria-label={t("preview.prevPage")}>
          <ChevronUp />
        </Button>
        <input
          key={page}
          defaultValue={doc ? page : ""}
          disabled={!doc}
          inputMode="numeric"
          aria-label={t("preview.page")}
          onKeyDown={(event) => {
            if (event.key === "Enter") goTo(Number(event.currentTarget.value) || page)
          }}
          onFocus={(event) => event.currentTarget.select()}
          className="h-5 w-9 rounded border border-border bg-transparent text-center text-foreground tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <span className="tabular-nums">/ {pages}</span>
        <Button variant="ghost" size="icon-xs" disabled={!doc || page >= pages} onClick={() => goTo(page + 1)} title={t("preview.nextPage")} aria-label={t("preview.nextPage")}>
          <ChevronDown />
        </Button>
        <span className="flex-1" />
        <Button variant="ghost" size="icon-xs" disabled={!doc || percent <= MIN_ZOOM * 100} onClick={() => step(-1)} title={t("preview.zoomOut")} aria-label={t("preview.zoomOut")}>
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
        <Button variant="ghost" size="icon-xs" disabled={!doc || percent >= MAX_ZOOM * 100} onClick={() => step(1)} title={t("preview.zoomIn")} aria-label={t("preview.zoomIn")}>
          <Plus />
        </Button>
      </div>
      <div
        ref={(element) => {
          scroller.current = element
          setRoot(element)
        }}
        onScroll={onScroll} className="flex min-h-0 flex-1 flex-col overflow-auto p-3" style={{ gap: GAP }}>
        {!doc && <span className="m-auto text-xs text-muted-foreground">{t("pdf.loading")}</span>}
        {doc && base && Array.from({ length: pages }, (_, index) => <PdfPage key={index} doc={doc} number={index + 1} scale={scale} root={root} size={base} />)}
      </div>
    </div>
  )
}
