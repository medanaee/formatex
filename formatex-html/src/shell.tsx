import { useEffect, useRef, useState } from "react"
import { List, Search, Minus, Plus, Palette, Shapes, X, ChevronDown, ChevronUp, Check, BookOpen, AlignLeft, Smile } from "lucide-react"
import { IconButton, SearchInput, ToolButton, Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "./ui"
import { LAYERS, messages, viewerMessages } from "./ui/messages"
import { trackReading, type ReadingTracker } from "./reading"

export interface ShellData {
  language: "fa" | "en"
  toolbar: boolean
  outline: boolean
  progress: boolean
  zoom?: number
  theme?: string
  feel?: string
  themes?: Record<string, Record<string, string | boolean>>
  feels?: Record<string, { radius: number; latin: string | string[]; persian: string | string[] }>
  headings: { id: string; text: string; depth: number }[]
}

/** React owns document chrome and layout; document nodes remain separately patchable. */
export function DocumentShell({ data, content }: { data: ShellData; content: string }) {
  const words = messages[data.language]
  const labels = viewerMessages[data.language]
  const direction = data.language === "fa" ? "rtl" : "ltr"
  const [outline, setOutline] = useState(false), [search, setSearch] = useState(false)
  const [query, setQuery] = useState(""), [zoom, setZoom] = useState(data.zoom ?? 100)
  const [theme, setTheme] = useState(data.theme ?? "paper"), [feel, setFeel] = useState(data.feel ?? "formal")
  const [menu, setMenu] = useState<"theme" | "feel" | null>(null)
  const [progress, setProgress] = useState(0)
  const [activeHeading, setActiveHeading] = useState(data.headings[0]?.id ?? "")
  const input = useRef<HTMLInputElement>(null)
  const reading = useRef<ReadingTracker | null>(null)
  const pinnedNote = useRef(false)
  const [footnote, setFootnote] = useState<{ id: string; html: string; dir: "rtl" | "ltr"; box: { top: number; left: number; width: number; height: number } } | null>(null)
  useEffect(() => {
    const saved = (window as unknown as { __fxViewerState?: Record<string, string> }).__fxViewerState
    if (saved?.theme && data.themes?.[saved.theme]) setTheme(saved.theme)
    if (saved?.feel && data.feels?.[saved.feel]) setFeel(saved.feel)
    if (saved?.zoom && Number.isFinite(Number(saved.zoom))) setZoom(Math.max(40, Math.min(300, Number(saved.zoom))))
    if (saved?.outline === "true") setOutline(true)
  }, [data])
  useEffect(() => {
    const root = document.documentElement, palette = data.themes?.[theme], typography = data.feels?.[feel]
    if (palette) { for (const [key, value] of Object.entries(palette)) if (typeof value === "string") root.style.setProperty(`--${key}`, value); root.classList.toggle("dark", !!palette.dark) }
    if (typography) { root.style.setProperty("--radius", `${typography.radius}px`); root.style.setProperty("--font-body", [typography.latin, typography.persian].flat().map(font => JSON.stringify(font)).join(",") + ",serif") }
    root.dataset.feel = feel
    const token = (window as unknown as { __fxPreviewToken?: string }).__fxPreviewToken
    if (token) for (const [key, value] of Object.entries({ theme, feel, zoom: String(zoom), outline: String(outline) })) parent.postMessage({ fxToken: token, fxViewerState: { key, value } }, "*")
  }, [theme, feel, zoom, outline, data])
  useEffect(() => {
    const tracker = trackReading(data.headings, data.toolbar ? 44 : 0, state => { setProgress(state.progress); setActiveHeading(state.heading) })
    reading.current = tracker
    return () => { tracker.destroy(); if (reading.current === tracker) reading.current = null }
  },[data.headings, data.toolbar, zoom, feel])
  useEffect(() => { if (search) input.current?.focus() }, [search])
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") { e.preventDefault(); setSearch(true) }
      if (e.key === "Escape") { setSearch(false); setOutline(false); setMenu(null) }
    }
    addEventListener("keydown", key); return () => removeEventListener("keydown", key)
  }, [])
  const find = (backwards = false) => {
    const browser = window as Window & { find?: (text: string, caseSensitive: boolean, backwards: boolean, wrap: boolean) => boolean }
    if (query) { reading.current?.resume(); browser.find?.(query, false, backwards, true) }
  }
  useEffect(() => {
    const copy = (event: MouseEvent) => {
      const button = (event.target as Element)?.closest?.(".fx-copy")
      const text = button?.closest(".fx-code")?.querySelector("code")?.textContent
      if (text !== undefined && text !== null) void navigator.clipboard.writeText(text)
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
  return <>
    {data.toolbar && <nav dir={direction} aria-label={words.toolbar} className={`fx-toolbar fx-chrome ${LAYERS.CHROME} select-none`}>
      {data.outline && <IconButton label={words.contents} aria-expanded={outline} onClick={() => setOutline(!outline)}><List /></IconButton>}
      <span className="fx-reading-status" role="progressbar" aria-label={labels.readingProgress} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}><bdi>{new Intl.NumberFormat(data.language, { style: "percent", maximumFractionDigits: 0 }).format(progress / 100)}</bdi><span>{labels.read}</span></span>
      <span className="fx-toolbar-spacer"/>
      <IconButton label={words.search} aria-expanded={search} onClick={() => setSearch(!search)}><Search /></IconButton>
      <span className="fx-toolbar-divider" role="separator"/>
      <IconButton label={words.smaller} onClick={() => setZoom(z => Math.max(60, z - 10))}><Minus /></IconButton>
      <ToolButton className="fx-zoom-value" title={words.resetZoom} onClick={() => setZoom(data.zoom ?? 100)}><bdi>{zoom}%</bdi></ToolButton>
      <IconButton label={words.larger} onClick={() => setZoom(z => Math.min(200, z + 10))}><Plus /></IconButton>
      <span className="fx-toolbar-divider" role="separator"/>
      <Popover open={menu === "theme"} onOpenChange={open=>setMenu(open?"theme":null)}>
        <PopoverTrigger asChild><IconButton label={words.theme}><Palette /></IconButton></PopoverTrigger>
        <PopoverContent align="end" dir={direction} aria-label={words.theme} className="fx-theme-menu">
          <header className="fx-menu-heading"><Palette/><strong>{words.theme}</strong><span>{labels.themeHint}</span></header>
          <div className="fx-theme-grid">{Object.entries(data.themes ?? {}).map(([name,palette])=><ToolButton key={name} className="fx-theme-option" size="auto" aria-pressed={theme===name} onClick={()=>{setTheme(name);setMenu(null)}}>
            <span className="fx-theme-swatch" style={{background:String(palette.bg??"var(--bg)"),color:String(palette.fg??"var(--fg)"),borderColor:String(palette.rule??"var(--rule)")}}><span style={{background:String(palette.accent??"var(--accent)")}}/><i/><i/>{theme===name&&<Check/>}</span>
            <span>{labels.themes[name as keyof typeof labels.themes]??name}</span>
          </ToolButton>)}</div>
        </PopoverContent>
      </Popover>
      <Popover open={menu === "feel"} onOpenChange={open=>setMenu(open?"feel":null)}>
        <PopoverTrigger asChild><IconButton label={words.feel}><Shapes /></IconButton></PopoverTrigger>
        <PopoverContent align="end" dir={direction} aria-label={words.feel} className="fx-feel-menu">
          <header className="fx-menu-heading"><Shapes/><strong>{words.feel}</strong><span>{labels.feelHint}</span></header>
          {Object.keys(data.feels??{}).map(name=>{const Icon=name==="formal"?BookOpen:name==="friendly"?Smile:AlignLeft;return <ToolButton key={name} className="fx-feel-option" aria-pressed={feel===name} onClick={()=>{setFeel(name);setMenu(null)}}><Icon/><span className="fx-feel-label">{words.feels[name as keyof typeof words.feels]??name}</span><span className="fx-feel-check">{feel===name&&<Check/>}</span></ToolButton>})}
        </PopoverContent>
      </Popover>
    </nav>}
    <form hidden={!search} role="search" dir={direction} className={`fx-search fx-chrome ${LAYERS.FLOATING}`} onSubmit={e => { e.preventDefault(); find() }}>
      <Search aria-hidden="true"/>
      <SearchInput ref={input} aria-label={words.search} placeholder={words.search} value={query} onChange={e => setQuery(e.target.value)} />
      <IconButton label={words.previous} onClick={() => find(true)}><ChevronUp /></IconButton>
      <IconButton label={words.next} onClick={() => find()}><ChevronDown /></IconButton>
      <IconButton label={words.close} onClick={() => setSearch(false)}><X /></IconButton>
    </form>
    {data.progress && <div className={`fx-reading-progress ${LAYERS.FLOATING}`} style={{ width: `${progress}%` }} />}
    <main className="fx-doc" style={{ fontSize: `${zoom}%` }} dangerouslySetInnerHTML={{ __html: content }} />
    {data.outline && <aside hidden={!outline} className={`fx-outline fx-chrome ${LAYERS.DRAWERS}`} dir={direction}><header className="fx-outline-heading"><List/><strong>{words.contents}</strong><span>{data.headings.length}</span><IconButton label={words.close} onClick={()=>setOutline(false)}><X/></IconButton></header><nav aria-label={words.contents}>{data.headings.map(h => <a key={h.id} href={`#${h.id}`} aria-current={activeHeading===h.id?"location":undefined} style={{ paddingInlineStart: `${.75+Math.max(0,h.depth-1)*.75}rem` }} onClick={event => {if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;reading.current?.select(h.id);setActiveHeading(h.id);if(matchMedia("(max-width: 767px)").matches)setOutline(false)}}>{h.text}</a>)}</nav></aside>}
    {footnote && <Popover open onOpenChange={open => { if (!open) { pinnedNote.current = false; setFootnote(null) } }} modal={false}>
      <PopoverAnchor asChild><span aria-hidden="true" style={{ position: "fixed", top: footnote.box.top, left: footnote.box.left, width: footnote.box.width, height: footnote.box.height, pointerEvents: "none" }} /></PopoverAnchor>
      <PopoverContent side="top" align="center" dir={footnote.dir} className="fx-fn-popover" onOpenAutoFocus={event => event.preventDefault()} onCloseAutoFocus={event => event.preventDefault()} onInteractOutside={event => { if (event.target instanceof Element && event.target.closest(".fx-fn")) event.preventDefault() }} dangerouslySetInnerHTML={{ __html: footnote.html }} />
    </Popover>}
  </>
}
