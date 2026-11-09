import { useEffect, useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { CompilerUnavailableError, exportHtml } from "@/lib/compiler"
import { isTauri } from "@/lib/platform"
import { CONFIG_FILE } from "@/lib/projects"
import { htmlOptionsFromConfig } from "@/lib/projects/htmlConfig"
import { useEditorStore } from "@/stores/useEditorStore"

/** Rebuild this long after the last keystroke: the page is built by a full HTML compile, with its fonts. */
const DELAY_MS = 700

/**
 * The script put at the end of the page in the preview frame (the frame has no access to the app, so it talks by messages): it goes back to
 * where the reader was after a rebuild, reports the scroll position, and hands the links to other sites to the app.
 */
const frameScript = (scroll: number) =>
  `<script>(function(){var y=${Math.max(0, Math.round(scroll))};function go(){scrollTo({top:y,behavior:"instant"})}go();addEventListener("load",go);var t;addEventListener("scroll",function(){clearTimeout(t);t=setTimeout(function(){parent.postMessage({fxPreviewScroll:scrollY},"*")},120)},{passive:true});document.addEventListener("click",function(e){var a=e.target&&e.target.closest&&e.target.closest("a[href]");if(!a)return;var h=a.getAttribute("href")||"";if(/^(https?|mailto):/i.test(h)){e.preventDefault();parent.postMessage({fxPreviewOpen:h},"*")}})})()</script>`

async function openExternal(url: string): Promise<void> {
  if (isTauri()) {
    const { openUrl } = await import("@tauri-apps/plugin-opener")
    await openUrl(url)
  } else window.open(url, "_blank", "noopener,noreferrer")
}

/**
 * The live HTML page of the project, in a frame you can use like the exported file (the toolbar, the outline, the copy buttons). It is built
 * with the `[html]` settings of config.toml, and again a moment after you stop typing whenever the text changes.
 */
export function HtmlPreview() {
  const { t } = useTranslation()
  const texts = useEditorStore((state) => state.texts)
  const projectId = useEditorStore((state) => state.projectId)
  const mainFile = useEditorStore((state) => state.mainFile)
  const kind = useEditorStore((state) => state.kind)
  const [page, setPage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const frame = useRef<HTMLIFrameElement>(null)
  const scroll = useRef(0)
  // What the reader changed with the page's own toolbar (theme, feel, text size): kept here, so a rebuild does not undo it
  const viewer = useRef<Record<string, string>>({})
  const run = useRef(0)
  const built = useRef(false)

  useEffect(() => {
    if (!projectId || !mainFile) return
    const id = ++run.current
    // The first build is at once, the later ones wait for the typing to stop
    const timer = setTimeout(
      async () => {
        setBusy(true)
        try {
          const bytes = await exportHtml(projectId, mainFile, htmlOptionsFromConfig(texts[CONFIG_FILE] ?? ""), texts, kind)
          if (id !== run.current) return
          const html = new TextDecoder().decode(bytes)
          const at = html.lastIndexOf("</body>")
          const withScript = at < 0 ? html + frameScript(scroll.current) : html.slice(0, at) + frameScript(scroll.current) + html.slice(at)
          const head = withScript.indexOf("<head>")
          const state = `<script>window.__fxViewerState=${JSON.stringify(viewer.current).replace(/</g, "\\u003c")}</script>`
          setPage(head < 0 ? state + withScript : withScript.slice(0, head + 6) + state + withScript.slice(head + 6))
          built.current = true
          setError(null)
        } catch (failure) {
          if (id !== run.current) return
          setError(failure instanceof CompilerUnavailableError ? t("editor.unavailable") : String((failure as Error)?.message ?? failure))
        } finally {
          if (id === run.current) setBusy(false)
        }
      },
      built.current ? DELAY_MS : 0,
    )
    return () => clearTimeout(timer)
  }, [texts, projectId, mainFile, kind, t])

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || !event.data) return
      if (typeof event.data.fxPreviewScroll === "number") scroll.current = event.data.fxPreviewScroll
      else if (event.data.fxViewerState && typeof event.data.fxViewerState.key === "string") {
        const { key, value } = event.data.fxViewerState as { key: string; value: unknown }
        if (value === "" || value === undefined) delete viewer.current[key]
        else viewer.current[key] = String(value)
      }
      else if (typeof event.data.fxPreviewOpen === "string") void openExternal(event.data.fxPreviewOpen)
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [])

  return (
    <div className="relative h-full min-h-0">
      {page !== null && <iframe ref={frame} title={t("htmlExport.preview")} srcDoc={page} sandbox="allow-scripts" className="block size-full border-0 bg-background" />}
      {page === null && !error && <p className="p-6 text-center text-xs text-muted-foreground">{mainFile ? t("editor.compiling") : t("editor.noPages")}</p>}
      {busy && <Loader2 className="absolute end-2 top-2 size-4 animate-spin text-muted-foreground" />}
      {error && (
        <p className="absolute inset-x-2 bottom-2 break-words rounded-md border border-destructive/40 bg-background/95 p-2 text-xs text-destructive">
          {t("htmlExport.previewFailed")}: {error}
        </p>
      )}
    </div>
  )
}
