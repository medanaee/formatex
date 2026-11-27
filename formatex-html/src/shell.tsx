import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { List, Search, ZoomIn, Minus, Plus, Palette, Shapes, X, ChevronDown, ChevronUp, Check, BookOpen, AlignLeft, Smile, RotateCcw, Save, Globe } from "lucide-react"
import { IconButton, SearchInput, ToolButton, Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "./ui"
import { LAYERS, messages, viewerMessages } from "./ui/messages"
import { trackReading, type ReadingTracker } from "./reading"
import { Magnifier } from "./magnifier"

export interface ShellHeading { id: string; text: string; html?: string; depth: number }

export interface ShellData {
  language: "fa" | "en"
  toolbar: boolean
  outline: boolean
  progress: boolean
  magnifier?: boolean
  zoom?: number
  theme?: string
  feel?: string
  width?: ReadingWidth
  themes?: Record<string, Record<string, string | boolean>>
  feels?: Record<string, { radius: number; latin: string | string[]; persian: string | string[]; code?: string | string[] }>
  headings: ShellHeading[]
}

export type ReadingWidth = "narrow" | "standard" | "wide"
const DOC_WIDTHS: Record<ReadingWidth, string> = { narrow: "42rem", standard: "54rem", wide: "72rem" }
const FEEL_ORDER = ["formal", "standard", "friendly"]
export const FILE_STORAGE_PREFIX = "fx-viewer:v2:file:"
export const GLOBAL_STORAGE_KEY = "fx-viewer:v2:global"
export const TASK_STORAGE_PREFIX = "fx-tasks:v1:"

export function fileStorageKey(): string {
  try { return `${FILE_STORAGE_PREFIX}${window.location?.pathname || ""}` } catch { return FILE_STORAGE_PREFIX }
}

export function taskStorageKey(): string {
  try { return `${TASK_STORAGE_PREFIX}${window.location?.pathname || ""}` } catch { return TASK_STORAGE_PREFIX }
}

function readTaskState(): Record<string, boolean> {
  const token = (window as unknown as { __fxPreviewToken?: string }).__fxPreviewToken
  if (token) {
    const saved = (window as unknown as { __fxTaskState?: Record<string, boolean> }).__fxTaskState
    return saved && typeof saved === "object" ? { ...saved } : {}
  }
  try {
    const raw = window.localStorage.getItem(taskStorageKey())
    const parsed = raw ? JSON.parse(raw) as unknown : null
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, boolean> : {}
  } catch { return {} }
}

function writeTaskState(state: Record<string, boolean>) {
  const token = (window as unknown as { __fxPreviewToken?: string }).__fxPreviewToken
  if (token) {
    ;(window as unknown as { __fxTaskState?: Record<string, boolean> }).__fxTaskState = { ...state }
    parent.postMessage({ fxToken: token, fxTaskState: state }, "*")
    return
  }
  try {
    if (Object.keys(state).length === 0) window.localStorage.removeItem(taskStorageKey())
    else window.localStorage.setItem(taskStorageKey(), JSON.stringify(state))
  } catch {}
}

function persianDigits(value: number): string {
  return String(value).replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[Number(d)] ?? d)
}

function syncTaskProgress(scope: ParentNode) {
  const wraps = scope instanceof Element && scope.classList.contains("fx-task-wrap")
    ? [scope]
    : Array.from(scope.querySelectorAll(".fx-task-wrap"))
  for (const wrap of wraps) {
    const items = wrap.querySelectorAll("li.fx-task")
    const total = items.length
    let done = 0
    items.forEach(item => { if (item.getAttribute("data-checked") === "true") done += 1 })
    const pct = total > 0 ? Math.round((done / total) * 100) : 0
    const bar = wrap.querySelector(".fx-task-progress")
    if (bar) {
      bar.setAttribute("aria-valuemax", String(total))
      bar.setAttribute("aria-valuenow", String(done))
    }
    const fill = wrap.querySelector<HTMLElement>(".fx-task-progress-fill")
    if (fill) fill.style.width = `${pct}%`
    const label = wrap.querySelector(".fx-task-progress-text")
    if (label) {
      const fa = wrap.getAttribute("data-lang") === "fa"
      label.textContent = fa
        ? `${persianDigits(done)} از ${persianDigits(total)} (${persianDigits(pct)}٪)`
        : `${done} of ${total} (${pct}%)`
    }
  }
}

function readStorage(key: string): Record<string, string> | null {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) as Record<string, string> : null
  } catch { return null }
}

function writeStorage(key: string, state: Record<string, string>) {
  try { window.localStorage.setItem(key, JSON.stringify(state)) } catch {}
}

function clearStorage(key: string) {
  try { window.localStorage.removeItem(key) } catch {}
}

interface HtmlScrollAnchor {
  element: HTMLElement | null
  ratio: number
  anchorY: number
  progress: number
}

function findAnchorElement(root: HTMLElement, anchorY: number): HTMLElement | null {
  let current: HTMLElement = root
  while (true) {
    let best: HTMLElement | null = null
    let bestDist = Infinity
    for (let i = 0; i < current.children.length; i++) {
      const child = current.children[i]
      if (!(child instanceof HTMLElement)) continue
      const rect = child.getBoundingClientRect()
      if (rect.height <= 0 || rect.width <= 0) continue
      if (rect.top <= anchorY && rect.bottom >= anchorY) {
        best = child
        bestDist = 0
        break
      }
      const dist = rect.top > anchorY ? rect.top - anchorY : anchorY - rect.bottom
      if (dist < bestDist) {
        bestDist = dist
        best = child
      }
    }
    if (!best) break
    const display = window.getComputedStyle(best).display
    if (display.startsWith("inline")) break
    current = best
    if (bestDist > 0) break
  }
  return current === root ? null : current
}

function captureHtmlScrollAnchor(root: HTMLElement | null, inset: number, pivotY?: number): HtmlScrollAnchor | null {
  if (!root || window.scrollY <= 1) return null
  const anchorY = pivotY ?? (inset + Math.max(0, window.innerHeight - inset) / 2)
  const scrollable = document.documentElement.scrollHeight - window.innerHeight
  const progress = scrollable > 0 ? Math.max(0, Math.min(1, window.scrollY / scrollable)) : 0
  const element = findAnchorElement(root, anchorY)
  if (!element) return { element: null, ratio: 0, anchorY, progress }
  const rect = element.getBoundingClientRect()
  const ratio = rect.height > 0 ? (anchorY - rect.top) / rect.height : 0
  return { element, ratio, anchorY, progress }
}

/** React owns document chrome and layout; document nodes remain separately patchable. */
export function DocumentShell({ data, content }: { data: ShellData; content: string }) {
  const words = messages[data.language]
  const labels = viewerMessages[data.language]
  const direction = data.language === "fa" ? "rtl" : "ltr"
  const defaultZoom = data.zoom ?? 100
  const defaultTheme = data.theme ?? "paper"
  const defaultFeel = data.feel ?? "formal"
  const defaultWidth: ReadingWidth = data.width === "narrow" || data.width === "wide" ? data.width : "standard"
  const [outline, setOutline] = useState(false), [search, setSearch] = useState(false)
  const [loupe, setLoupe] = useState(false)
  const [query, setQuery] = useState(""), [zoom, setZoom] = useState(defaultZoom)
  const [theme, setTheme] = useState(defaultTheme), [feel, setFeel] = useState(defaultFeel)
  const [width, setWidth] = useState<ReadingWidth>(defaultWidth)
  const [menu, setMenu] = useState<"theme" | "feel" | null>(null)
  const [progress, setProgress] = useState(0)
  const [activeHeading, setActiveHeading] = useState(data.headings[0]?.id ?? "")
  const [lightbox, setLightbox] = useState<{ kind: "img"; src: string; alt: string } | { kind: "svg"; html: string; label: string } | null>(null)
  const [lightboxZoom, setLightboxZoom] = useState(100)
  const input = useRef<HTMLInputElement>(null)
  const docRef = useRef<HTMLElement>(null)
  const scrollAnchor = useRef<HtmlScrollAnchor | null>(null)
  const prevLayout = useRef({ zoom, width, feel })
  const reading = useRef<ReadingTracker | null>(null)
  const toolbarInset = data.toolbar ? 44 : 0
  const captureAnchor = (pivotY?: number) => {
    scrollAnchor.current = captureHtmlScrollAnchor(docRef.current, toolbarInset, pivotY)
  }
  const pinnedNote = useRef(false)
  const mounted = useRef(false)
  const savedTimer = useRef(0)
  const [hasGlobal, setHasGlobal] = useState(false)
  const [globalSaved, setGlobalSaved] = useState(false)
  const [footnote, setFootnote] = useState<{ id: string; html: string; dir: "rtl" | "ltr"; box: { top: number; left: number; width: number; height: number } } | null>(null)
  const zoomDirty = zoom !== defaultZoom
  const themeDirty = theme !== defaultTheme
  const feelDirty = feel !== defaultFeel
  const widthDirty = width !== defaultWidth
  const appearanceDirty = feelDirty || widthDirty
  const anyDirty = zoomDirty || themeDirty || appearanceDirty
  const applySaved = (saved: Record<string, string> | null | undefined) => {
    if (!saved) return
    if (saved.theme && data.themes?.[saved.theme]) setTheme(saved.theme)
    if (saved.feel && data.feels?.[saved.feel]) setFeel(saved.feel)
    if (saved.zoom && Number.isFinite(Number(saved.zoom))) setZoom(Math.max(40, Math.min(300, Number(saved.zoom))))
    if (saved.outline === "true" || saved.outline === "false") setOutline(saved.outline === "true")
    if (saved.width === "narrow" || saved.width === "standard" || saved.width === "wide") setWidth(saved.width)
  }
  const saveGlobal = () => {
    if (!data.toolbar || (window as unknown as { __fxPreviewToken?: string }).__fxPreviewToken) return
    writeStorage(GLOBAL_STORAGE_KEY, { theme, feel, zoom: String(zoom), outline: String(outline), width })
    setHasGlobal(true)
    setGlobalSaved(true)
    window.clearTimeout(savedTimer.current)
    savedTimer.current = window.setTimeout(() => setGlobalSaved(false), 1400)
  }
  const applyGlobal = () => {
    if (!data.toolbar || (window as unknown as { __fxPreviewToken?: string }).__fxPreviewToken) return
    const saved = readStorage(GLOBAL_STORAGE_KEY)
    if (!saved) { setHasGlobal(false); return }
    captureAnchor()
    applySaved(saved)
    setMenu(null)
  }
  const resetAll = () => {
    captureAnchor()
    setZoom(defaultZoom)
    setTheme(defaultTheme)
    setFeel(defaultFeel)
    setWidth(defaultWidth)
    setOutline(false)
    setMenu(null)
    if (data.toolbar && !(window as unknown as { __fxPreviewToken?: string }).__fxPreviewToken) clearStorage(fileStorageKey())
  }
  useLayoutEffect(() => {
    const root = document.documentElement, palette = data.themes?.[theme], typography = data.feels?.[feel]
    if (palette) { for (const [key, value] of Object.entries(palette)) if (typeof value === "string") root.style.setProperty(`--${key}`, value); root.classList.toggle("dark", !!palette.dark) }
    if (typography) {
      root.style.setProperty("--radius", `${typography.radius}px`)
      root.style.setProperty("--font-body", [typography.latin, typography.persian].flat().map(font => JSON.stringify(font)).join(",") + ",serif")
      if (typography.code) {
        const codeList = Array.from(new Set([typography.code, "Vazir Code"].flat().filter(Boolean)))
        root.style.setProperty("--font-code", codeList.map(font => JSON.stringify(font)).join(",") + ",monospace")
      }
    }
    root.style.setProperty("--fx-doc-width", DOC_WIDTHS[width])
    root.dataset.width = width
    root.dataset.feel = feel
    const layoutChanged = prevLayout.current.zoom !== zoom || prevLayout.current.width !== width || prevLayout.current.feel !== feel
    prevLayout.current = { zoom, width, feel }
    const anchor = scrollAnchor.current
    if (layoutChanged && anchor) {
      scrollAnchor.current = null
      if (anchor.element?.isConnected) {
        const rect = anchor.element.getBoundingClientRect()
        if (rect.height > 0) {
          const delta = rect.top + anchor.ratio * rect.height - anchor.anchorY
          if (Math.abs(delta) > 0.5) window.scrollTo({ top: Math.max(0, window.scrollY + delta), behavior: "instant" })
        }
      } else {
        const scrollable = document.documentElement.scrollHeight - window.innerHeight
        if (scrollable > 0) window.scrollTo({ top: Math.max(0, anchor.progress * scrollable), behavior: "instant" })
      }
    }
  }, [theme, feel, zoom, width, data])
  useEffect(() => {
    const snapshot = { theme, feel, zoom: String(zoom), outline: String(outline), width }
    const token = (window as unknown as { __fxPreviewToken?: string }).__fxPreviewToken
    if (token) {
      for (const [key, value] of Object.entries(snapshot)) parent.postMessage({ fxToken: token, fxViewerState: { key, value } }, "*")
    } else if (data.toolbar && mounted.current) {
      if (theme === defaultTheme && feel === defaultFeel && zoom === defaultZoom && width === defaultWidth && !outline) clearStorage(fileStorageKey())
      else writeStorage(fileStorageKey(), snapshot)
    }
  }, [theme, feel, zoom, outline, width, defaultTheme, defaultFeel, defaultZoom, defaultWidth, data])
  useEffect(() => {
    const token = (window as unknown as { __fxPreviewToken?: string }).__fxPreviewToken
    if (token) {
      applySaved((window as unknown as { __fxViewerState?: Record<string, string> }).__fxViewerState)
      mounted.current = true
      return
    }
    if (!data.toolbar) {
      mounted.current = true
      return
    }
    applySaved(readStorage(fileStorageKey()))
    setHasGlobal(readStorage(GLOBAL_STORAGE_KEY) !== null)
    mounted.current = true
    const onStorage = (event: StorageEvent) => {
      if (event.key === GLOBAL_STORAGE_KEY || event.key === null) setHasGlobal(readStorage(GLOBAL_STORAGE_KEY) !== null)
    }
    window.addEventListener("storage", onStorage)
    return () => { window.removeEventListener("storage", onStorage); window.clearTimeout(savedTimer.current) }
  }, [data])
  useEffect(() => {
    const tracker = trackReading(data.headings, data.toolbar ? 44 : 0, state => { setProgress(state.progress); setActiveHeading(state.heading) })
    reading.current = tracker
    return () => { tracker.destroy(); if (reading.current === tracker) reading.current = null }
  },[data.headings, data.toolbar, zoom, feel, width])
  useEffect(() => { if (search) input.current?.focus() }, [search])
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") { e.preventDefault(); setSearch(true) }
      if (e.key === "Escape") { setLightbox(null); setSearch(false); setOutline(false); setMenu(null); setLoupe(false) }
    }
    const wheel = (e: WheelEvent) => {
      if (!e.ctrlKey || !(window as unknown as { __fxPreviewToken?: string }).__fxPreviewToken) return
      e.preventDefault()
      scrollAnchor.current = captureHtmlScrollAnchor(docRef.current, toolbarInset, e.clientY)
      setZoom(z => e.deltaY < 0 ? Math.min(200, z + 10) : Math.max(60, z - 10))
    }
    const onScroll = () => { scrollAnchor.current = null }
    addEventListener("keydown", key)
    addEventListener("wheel", wheel, { passive: false })
    addEventListener("scroll", onScroll, { passive: true })
    return () => { removeEventListener("keydown", key); removeEventListener("wheel", wheel); removeEventListener("scroll", onScroll) }
  }, [toolbarInset])
  const find = (backwards = false) => {
    const browser = window as Window & { find?: (text: string, caseSensitive: boolean, backwards: boolean, wrap: boolean) => boolean }
    if (query) { reading.current?.resume(); browser.find?.(query, false, backwards, true) }
  }
  useEffect(() => {
    const applySavedTasks = () => {
      const saved = readTaskState()
      document.querySelectorAll<HTMLLIElement>("li.fx-task[data-task-id]").forEach(item => {
        const id = item.dataset.taskId
        if (!id || !(id in saved)) return
        const checked = !!saved[id]
        item.dataset.checked = String(checked)
        const box = item.querySelector<HTMLButtonElement>(":scope > .fx-checkbox")
        if (box) box.setAttribute("aria-checked", String(checked))
      })
      syncTaskProgress(document)
    }
    applySavedTasks()
    const onToggle = (event: MouseEvent) => {
      const button = (event.target as Element)?.closest?.("button.fx-checkbox")
      if (!(button instanceof HTMLButtonElement) || button.disabled) return
      const item = button.closest<HTMLLIElement>("li.fx-task")
      if (!item) return
      const next = item.dataset.checked !== "true"
      item.dataset.checked = String(next)
      button.setAttribute("aria-checked", String(next))
      const id = item.dataset.taskId
      if (id) {
        const saved = readTaskState()
        if (String(next) === item.dataset.defaultChecked) delete saved[id]
        else saved[id] = next
        writeTaskState(saved)
      }
      const wrap = item.closest(".fx-task-wrap")
      if (wrap) syncTaskProgress(wrap)
    }
    document.addEventListener("click", onToggle)
    document.addEventListener("fx-content-updated", applySavedTasks)
    return () => {
      document.removeEventListener("click", onToggle)
      document.removeEventListener("fx-content-updated", applySavedTasks)
    }
  }, [content])
  useEffect(() => {
    const copy = (event: MouseEvent) => {
      const button = (event.target as Element)?.closest?.(".fx-copy")
      const block = button?.closest(".fx-code")
      const lineNodes = block?.querySelectorAll(".fx-code-line")
      const text = lineNodes?.length
        ? Array.from(lineNodes, el => el.textContent ?? "").join("\n")
        : block?.querySelector("code")?.textContent
      if (text !== undefined && text !== null && button instanceof HTMLElement) {
        void navigator.clipboard.writeText(text)
        button.dataset.copied = "1"
        window.setTimeout(() => { if (button.dataset.copied === "1") delete button.dataset.copied }, 1400)
      }
    }
    document.addEventListener("click", copy); return () => document.removeEventListener("click", copy)
  }, [])
  useEffect(() => {
    document.documentElement.dataset.fxShell = "1"
    let timer = 0
    const footnoteOf = (target: EventTarget | null) => (target instanceof Element ? target.closest(".fx-fn") : null)
    const place = (id: string) => {
      const mark = document.getElementById(id)?.querySelector(".fx-fn-mark")
      if (!mark) return null
      const rect = mark.getBoundingClientRect()
      return { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
    }
    const show = (fn: Element) => {
      const pop = fn.querySelector(".fx-fn-pop")
      const box = fn.id ? place(fn.id) : null
      if (!pop || !box || !fn.id) return
      window.clearTimeout(timer)
      document.querySelectorAll(".fx-fn-mark[aria-expanded='true']").forEach(mark => mark.setAttribute("aria-expanded", "false"))
      fn.querySelector(".fx-fn-mark")?.setAttribute("aria-expanded", "true")
      const dir: "rtl" | "ltr" = pop.getAttribute("dir") === "rtl" ? "rtl" : "ltr"
      const next = { id: fn.id, html: pop.innerHTML, dir, box }
      setFootnote(current => current?.id === next.id ? current : next)
    }
    const hide = () => {
      pinnedNote.current = false
      document.querySelectorAll(".fx-fn-mark[aria-expanded='true']").forEach(mark => mark.setAttribute("aria-expanded", "false"))
      setFootnote(null)
    }
    const over = (event: PointerEvent) => {
      const fn = footnoteOf(event.target)
      if (fn) { show(fn); return }
      if (event.target instanceof Element && event.target.closest(".fx-popover")) window.clearTimeout(timer)
    }
    const out = (event: PointerEvent) => {
      if (pinnedNote.current) return
      const fn = footnoteOf(event.target)
      const next = event.relatedTarget
      if (fn && next instanceof Element && (fn.contains(next) || next.closest(".fx-popover"))) return
      if (fn || (event.target instanceof Element && event.target.closest(".fx-popover"))) timer = window.setTimeout(hide, 140)
    }
    const click = (event: MouseEvent) => {
      const fn = footnoteOf(event.target)
      if (!fn) return
      pinnedNote.current = true
      show(fn)
    }
    const reposition = () => setFootnote(current => current && place(current.id) ? { ...current, box: place(current.id)! } : current)
    document.addEventListener("pointerover", over)
    document.addEventListener("pointerout", out)
    document.addEventListener("click", click)
    window.addEventListener("scroll", reposition, true)
    window.addEventListener("resize", reposition)
    return () => {
      delete document.documentElement.dataset.fxShell
      window.clearTimeout(timer)
      document.removeEventListener("pointerover", over)
      document.removeEventListener("pointerout", out)
      document.removeEventListener("click", click)
      window.removeEventListener("scroll", reposition, true)
      window.removeEventListener("resize", reposition)
    }
  }, [])
  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element) || !target.closest(".fx-doc") || target.closest("a, button")) return
      const img = target.closest("img")
      if (img instanceof HTMLImageElement && img.src) {
        setLightbox({ kind: "img", src: img.currentSrc || img.src, alt: img.alt || "" })
        setLightboxZoom(100)
        return
      }
      const graphic = target.closest(".fx-graphic")
      const svg = graphic?.querySelector("svg:not(.fx-icon-svg)")
      if (graphic && svg) {
        const label = graphic.closest("figure")?.querySelector("figcaption")?.textContent?.trim() ?? ""
        setLightbox({ kind: "svg", html: svg.outerHTML, label })
        setLightboxZoom(100)
      }
    }
    document.addEventListener("click", onDocClick)
    return () => document.removeEventListener("click", onDocClick)
  }, [])
  return <>
    {data.toolbar && <nav dir={direction} aria-label={words.toolbar} className={`fx-toolbar fx-chrome ${LAYERS.CHROME} select-none`}>
      {data.outline && <IconButton label={words.contents} aria-expanded={outline} onClick={() => setOutline(!outline)}><List /></IconButton>}
      <span className="fx-reading-status" role="progressbar" aria-label={labels.readingProgress} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}><bdi>{new Intl.NumberFormat(data.language, { style: "percent", maximumFractionDigits: 0 }).format(progress / 100)}</bdi><span>{labels.read}</span></span>
      <span className="fx-toolbar-spacer"/>
      <IconButton label={words.search} aria-expanded={search} onClick={() => setSearch(!search)}><Search /></IconButton>
      {data.magnifier !== false && <IconButton label={words.magnifier} aria-pressed={loupe} onClick={() => setLoupe(v => !v)}><ZoomIn /></IconButton>}
      <span className="fx-toolbar-divider" role="separator"/>
      <IconButton label={words.smaller} onClick={() => { captureAnchor(); setZoom(z => Math.max(60, z - 10)) }}><Minus /></IconButton>
      <ToolButton className="fx-zoom-value" title={words.resetZoom} onClick={() => { captureAnchor(); setZoom(defaultZoom) }}><bdi>{zoom}%</bdi>{zoomDirty && <span className="fx-dirty-dot" aria-hidden="true" />}</ToolButton>
      <IconButton label={words.larger} onClick={() => { captureAnchor(); setZoom(z => Math.min(200, z + 10)) }}><Plus /></IconButton>
      <span className="fx-toolbar-divider" role="separator"/>
      <Popover open={menu === "theme"} onOpenChange={open=>setMenu(open?"theme":null)}>
        <PopoverTrigger asChild><IconButton label={words.theme}><Palette />{themeDirty && <span className="fx-dirty-dot" aria-hidden="true" />}</IconButton></PopoverTrigger>
        <PopoverContent align="end" dir={direction} aria-label={words.theme} className="fx-theme-menu">
          <header className="fx-menu-heading"><Palette/><strong>{words.theme}</strong><span>{labels.themeHint}{themeDirty && <span className="fx-menu-dot" aria-hidden="true" />}</span></header>
          <div className="fx-theme-grid">{Object.entries(data.themes ?? {}).map(([name,palette])=><ToolButton key={name} className="fx-theme-option" size="auto" aria-pressed={theme===name} onClick={()=>{setTheme(name);setMenu(null)}}>
            <span className="fx-theme-swatch" style={{background:String(palette.bg??"var(--bg)"),color:String(palette.fg??"var(--fg)"),borderColor:String(palette.rule??"var(--rule)")}}><span style={{background:String(palette.accent??"var(--accent)")}}/><i/><i/>{theme===name&&<Check/>}</span>
            <span>{labels.themes[name as keyof typeof labels.themes]??name}</span>
          </ToolButton>)}</div>
        </PopoverContent>
      </Popover>
      <Popover open={menu === "feel"} onOpenChange={open=>setMenu(open?"feel":null)}>
        <PopoverTrigger asChild><IconButton label={words.feel}><Shapes />{appearanceDirty && <span className="fx-dirty-dot" aria-hidden="true" />}</IconButton></PopoverTrigger>
        <PopoverContent align="end" dir={direction} aria-label={words.feel} className="fx-feel-menu">
          <header className="fx-menu-heading"><Shapes/><strong>{words.feel}</strong><span>{labels.feelHint}{feelDirty && <span className="fx-menu-dot" aria-hidden="true" />}</span></header>
          {[...FEEL_ORDER.filter(name => name in (data.feels ?? {})), ...Object.keys(data.feels ?? {}).filter(name => !FEEL_ORDER.includes(name))].map(name=>{const Icon=name==="formal"?BookOpen:name==="friendly"?Smile:AlignLeft;return <ToolButton key={name} className="fx-feel-option" aria-pressed={feel===name} onClick={()=>{captureAnchor();setFeel(name);setMenu(null)}}><Icon/><span className="fx-feel-label">{words.feels[name as keyof typeof words.feels]??name}</span><span className="fx-feel-check">{feel===name&&<Check/>}</span></ToolButton>})}
          <div className="fx-menu-divider" role="separator"/>
          <span className="fx-width-label">{labels.widthHint}{widthDirty && <span className="fx-menu-dot" aria-hidden="true" />}</span>
          <div className="fx-width-row">{(["narrow","standard","wide"] as const).map(option=><ToolButton key={option} className="fx-width-option" size="auto" aria-pressed={width===option} onClick={()=>{captureAnchor();setWidth(option)}}>{labels.widths[option]}</ToolButton>)}</div>
        </PopoverContent>
      </Popover>
      <span className="fx-toolbar-divider" role="separator"/>
      <IconButton label={labels.saveGlobal} onClick={saveGlobal}>{globalSaved ? <Check /> : <Save />}</IconButton>
      <IconButton label={labels.applyGlobal} disabled={!hasGlobal} onClick={applyGlobal}><Globe /></IconButton>
      <IconButton label={labels.resetAll} disabled={!anyDirty} onClick={resetAll}><RotateCcw /></IconButton>
    </nav>}
    <form hidden={!search} role="search" dir={direction} className={`fx-search fx-chrome ${LAYERS.FLOATING}`} onSubmit={e => { e.preventDefault(); find() }}>
      <Search aria-hidden="true"/>
      <SearchInput ref={input} aria-label={words.search} placeholder={words.search} value={query} onChange={e => setQuery(e.target.value)} />
      <IconButton label={words.previous} onClick={() => find(true)}><ChevronUp /></IconButton>
      <IconButton label={words.next} onClick={() => find()}><ChevronDown /></IconButton>
      <IconButton label={words.close} onClick={() => setSearch(false)}><X /></IconButton>
    </form>
    {data.progress && <div className={`fx-reading-progress ${LAYERS.FLOATING}`} style={{ width: `${progress}%` }} />}
    <main ref={docRef} className="fx-doc" style={{ fontSize: `${zoom}%` }} dangerouslySetInnerHTML={{ __html: content }} />
    {data.outline && <aside hidden={!outline} className={`fx-outline fx-chrome ${LAYERS.DRAWERS}`} dir={direction}><header className="fx-outline-heading"><List/><strong>{words.contents}</strong><span>{data.headings.length}</span><IconButton label={words.close} onClick={()=>setOutline(false)}><X/></IconButton></header><nav aria-label={words.contents}>{data.headings.map(h => <a key={h.id} href={`#${h.id}`} aria-current={activeHeading===h.id?"location":undefined} style={{ paddingInlineStart: `${.75+Math.max(0,h.depth-1)*.75}rem` }} onClick={event => {if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;reading.current?.select(h.id);setActiveHeading(h.id);if(matchMedia("(max-width: 767px)").matches)setOutline(false)}}>{h.html ? <span className="fx-outline-label" dangerouslySetInnerHTML={{ __html: h.html }} /> : h.text}</a>)}</nav></aside>}
    {footnote && <Popover open onOpenChange={open => { if (!open) { pinnedNote.current = false; setFootnote(null) } }} modal={false}>
      <PopoverAnchor asChild><span aria-hidden="true" style={{ position: "fixed", top: footnote.box.top, left: footnote.box.left, width: footnote.box.width, height: footnote.box.height, pointerEvents: "none" }} /></PopoverAnchor>
      <PopoverContent side="top" align="center" dir={footnote.dir} className="fx-fn-popover" onOpenAutoFocus={event => event.preventDefault()} onCloseAutoFocus={event => event.preventDefault()} onInteractOutside={event => { if (event.target instanceof Element && event.target.closest(".fx-fn")) event.preventDefault() }} dangerouslySetInnerHTML={{ __html: footnote.html }} />
    </Popover>}
    {data.toolbar && data.magnifier !== false && loupe && <Magnifier content={content} zoom={zoom} theme={theme} feel={feel} width={width} />}
    {lightbox && <div role="dialog" aria-modal="true" aria-label={labels.enlarge} dir={direction} className="fx-lightbox fx-chrome" onClick={e => { if (e.target === e.currentTarget) setLightbox(null) }}>
      <div className="fx-lightbox-bar">
        <span className="fx-lightbox-title">{lightbox.kind === "img" ? lightbox.alt : lightbox.label}</span>
        <IconButton label={words.smaller} onClick={() => setLightboxZoom(z => Math.max(50, z - 25))}><Minus /></IconButton>
        <ToolButton className="fx-lightbox-zoom" size="auto" title={words.resetZoom} onClick={() => setLightboxZoom(100)}><bdi>{lightboxZoom}%</bdi></ToolButton>
        <IconButton label={words.larger} onClick={() => setLightboxZoom(z => Math.min(300, z + 25))}><Plus /></IconButton>
        <IconButton label={words.close} onClick={() => setLightbox(null)}><X /></IconButton>
      </div>
      <div className="fx-lightbox-stage" onClick={e => { if (e.target === e.currentTarget) setLightbox(null) }}>
        <div className="fx-lightbox-content">
          {lightbox.kind === "img"
            ? <img src={lightbox.src} alt={lightbox.alt} style={lightboxZoom === 100 ? { maxWidth: "90vw", maxHeight: "82vh" } : { width: `${lightboxZoom * 0.85}vw` }} />
            : <div className="fx-lightbox-card" style={{ width: lightboxZoom === 100 ? "min(90vw, 1080px)" : `${lightboxZoom * 0.85}vw` }} dangerouslySetInnerHTML={{ __html: lightbox.html }} />}
        </div>
      </div>
    </div>}
  </>
}
