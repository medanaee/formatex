import { useEffect, useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { CompilerUnavailableError, previewHtml } from "@/lib/compiler"
import { isTauri } from "@/lib/platform"
import { CONFIG_FILE } from "@/lib/projects"
import { htmlOptionsFromConfig } from "@/lib/projects/htmlConfig"
import { initialFrame, splitHtml } from "@/lib/editor/htmlFrame"
import { htmlPreviewQueue, previewDelay } from "@/lib/editor/latestTaskQueue"
import { useEditorStore } from "@/stores/useEditorStore"
import { useWorkspaceStore } from "@/stores/useWorkspaceStore"
import { useHtmlSourceStore } from "@/stores/useHtmlSourceStore"
import { usePreviewScrollStore } from "@/stores/usePreviewScrollStore"
import { DocumentCompileError } from "@/lib/document/bridge"

async function openExternal(url: string): Promise<void> {
  if (!/^(https?:|mailto:)/i.test(url)) return
  if (isTauri()) {
    const { openUrl } = await import("@tauri-apps/plugin-opener")
    await openUrl(url)
  } else window.open(url, "_blank", "noopener,noreferrer")
}

/** Latest-only compilation; the sandbox keeps its document, fonts and viewer alive across content edits. */
export function HtmlPreview() {
  const { t, i18n } = useTranslation()
  const texts = useEditorStore((state) => state.texts)
  const projectId = useEditorStore((state) => state.projectId)
  const mainFile = useEditorStore((state) => state.mainFile)
  const kind = useEditorStore((state) => state.kind)
  const [page, setPage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [previewWidth, setPreviewWidth] = useState<"narrow" | "standard" | "wide" | undefined>(undefined)
  const sourceTarget = useHtmlSourceStore(state => state.target)
  const frame = useRef<HTMLIFrameElement>(null)
  const scroll = useRef(0)
  const viewer = useRef<Record<string, string>>({})
  const tasks = useRef<Record<string, boolean>>({})
  const [token] = useState(() => crypto.randomUUID())
  const frameToken = useRef(token)
  const signature = useRef("")
  const ready = useRef(false)
  const fonts = useRef({ key: "", css: "" })
  const duration = useRef(480)
  const serial = useRef(0)
  const identity = useRef("")
  const sample = useRef({ id: 0, started: 0, roundTripMs: 0, backendMs: 0, mode: "reload" })

  useEffect(() => {
    if (!projectId || !mainFile) return
    const nextIdentity = `${projectId}\0${mainFile}`
    if (identity.current !== nextIdentity) {
      identity.current = nextIdentity
      signature.current = ""
      ready.current = false
      scroll.current = 0
      viewer.current = {}
      tasks.current = {}
      setPreviewWidth(undefined)
      useWorkspaceStore.getState().set({ htmlElapsedMs: null })
      useHtmlSourceStore.setState({ available: false, target: null })
    }
    let valid = true
    const id = ++serial.current
    const cancel = htmlPreviewQueue.schedule(async () => {
      if (!valid) return
      setBusy(true)
      useWorkspaceStore.getState().set({ htmlBusy: true })
      const started = performance.now()
      try {
        const output = await previewHtml(projectId, mainFile, { ...htmlOptionsFromConfig(texts[CONFIG_FILE] ?? ""), graphicWidth: previewWidth }, texts, kind, fonts.current.key)
        duration.current = performance.now() - started
        if (!valid) return
        useWorkspaceStore.getState().set({ htmlElapsedMs: output.timings.total_ms })
        if (output.fontCss !== null) fonts.current = { key: output.fontKey, css: output.fontCss }
        const split = splitHtml(output.html)
        useEditorStore.setState({ diagnostics: [], ok: true })
        useHtmlSourceStore.setState({ available: !!split?.sourceMap })
        const patch = split && signature.current === split.signature && ready.current
        sample.current = { id, started, roundTripMs: duration.current, backendMs: output.timings.total_ms, mode: patch ? "patch" : "reload" }
        if (patch) {
          frame.current?.contentWindow?.postMessage({ fxToken: frameToken.current, fxPatch: split.content, fxSourceMap: split.sourceMap, fontCss: output.fontCss, id }, "*")
        } else {
          ready.current = false
          frameToken.current = `${token}-${id}`
          signature.current = split?.signature ?? ""
          setPage(initialFrame(output.html, fonts.current.css, frameToken.current, scroll.current, viewer.current, id, tasks.current))
        }
        setError(null)
      } catch (failure) {
        if (valid && failure instanceof DocumentCompileError) useEditorStore.setState({ diagnostics: failure.diagnostics, ok: false })
        if (valid) setError(failure instanceof CompilerUnavailableError ? t("editor.unavailable") : String((failure as Error)?.message ?? failure))
      } finally {
        if (valid) {
          setBusy(false)
          useWorkspaceStore.getState().set({ htmlBusy: false })
        }
      }
    }, signature.current ? previewDelay(duration.current) : 0)
    return () => { valid = false; cancel(); useWorkspaceStore.getState().set({ htmlBusy: false }) }
  }, [texts, projectId, mainFile, kind, i18n.language, t, token, previewWidth])

  useEffect(() => {
    if (!sourceTarget || busy || !ready.current) return
    frame.current?.contentWindow?.postMessage({ fxToken: frameToken.current, fxSourceReveal: sourceTarget }, "*")
  }, [sourceTarget, busy, page])

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || !event.data) return
      if (event.data.fxToken !== frameToken.current) return
      if (event.data.fxTaskState && typeof event.data.fxTaskState === "object" && !Array.isArray(event.data.fxTaskState)) {
        tasks.current = event.data.fxTaskState as Record<string, boolean>
        return
      }
      if (event.data.fxViewerState && typeof event.data.fxViewerState.key === "string") {
        const { key, value } = event.data.fxViewerState as { key: string; value: unknown }
        if (!["theme", "feel", "zoom", "outline", "width"].includes(key)) return
        if (value === "" || value === undefined) delete viewer.current[key]
        else viewer.current[key] = String(value)
        if (key === "width") {
          const next = value === "narrow" || value === "standard" || value === "wide" ? value : undefined
          setPreviewWidth(current => current === next ? current : next)
        }
        return
      }
      if (event.data.fxReady === true) {
        ready.current = true
        const target = useHtmlSourceStore.getState().target
        if (target) frame.current?.contentWindow?.postMessage({ fxToken: frameToken.current, fxSourceReveal: target }, "*")
      }
      else if (event.data.fxSource && typeof event.data.fxSource.path === "string" && typeof event.data.fxSource.offset === "number" && Number.isFinite(event.data.fxSource.offset)) {
        const { path, offset } = event.data.fxSource as { path: string; offset: number }
        const store = useEditorStore.getState()
        if (!store.files.some(file => file.path === path)) return
        void store.load(path).then(() => {
          const text = useEditorStore.getState().texts[path]
          if (text === undefined || offset < 0 || offset > text.length) return
          const before = text.slice(0, offset), line = before.split("\n").length, column = before.length - before.lastIndexOf("\n")
          void useEditorStore.getState().revealAt(path, line, column)
        })
      }
      else if (typeof event.data.fxPreviewScroll === "number") { scroll.current = event.data.fxPreviewScroll; usePreviewScrollStore.getState().manualScroll() }
      else if (typeof event.data.fxPreviewOpen === "string") void openExternal(event.data.fxPreviewOpen)
      else if (event.data.fxPainted === sample.current.id) {
        console.debug("[formatex] html-preview", { ...sample.current, endToEndMs: performance.now() - sample.current.started, applyAndPaintMs: event.data.elapsed })
      }
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [token])

  return (
    <div className="relative h-full min-h-0">
      {page !== null && <iframe ref={frame} title={t("htmlExport.preview")} srcDoc={page} sandbox="allow-scripts" className="block size-full border-0 bg-background" />}
      {page === null && !error && <p className="p-6 text-center text-xs text-muted-foreground">{mainFile ? t("editor.compiling") : t("editor.noPages")}</p>}
      {busy && <Loader2 className="absolute end-2 top-2 size-4 animate-spin text-muted-foreground" />}
      {error && <p className="absolute inset-x-2 bottom-2 break-words rounded-md border border-destructive/40 bg-background/95 p-2 text-xs text-destructive">{t("htmlExport.previewFailed")}: {error}</p>}
    </div>
  )
}
