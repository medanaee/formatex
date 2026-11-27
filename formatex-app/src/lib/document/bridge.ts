import { componentCatalog, type DocumentIR } from "@formatex/core"
import type { RenderOptions, AssetRequest } from "@formatex/html"
import type { HtmlExportOptions } from "@/lib/projects/htmlConfig"
import { htmlOptionsFromSettings } from "@/lib/projects/htmlConfig"
import type { Diagnostic, HtmlPreviewOutput } from "@/lib/compiler"

export type NativeInvoke = <T>(command: string, args: Record<string, unknown>) => Promise<T>
interface Prepared { ok: boolean; document?: DocumentIR; diagnostics?: Diagnostic[]; elapsedMs: number }

export class DocumentCompileError extends Error {
  diagnostics: Diagnostic[]
  constructor(diagnostics: Diagnostic[]) {
    super(diagnostics.map(diagnostic => `${diagnostic.path ?? ""}:${diagnostic.line ?? 1}:${diagnostic.column ?? 1}: ${diagnostic.message}`).join("\n"))
    this.name = "DocumentCompileError"; this.diagnostics = diagnostics
  }
}

async function render(document: DocumentIR, options: RenderOptions): Promise<string> {
  if (import.meta.env.MODE === "test") return (await import("@formatex/html")).renderHtml(document, options)
  return (await import("@formatex/html/browser")).renderInWorker(document, options)
}

export async function independentHtml(invoke: NativeInvoke, projectId: string, main: string, overrides: Record<string, string>, given: HtmlExportOptions, uiLanguage: "fa" | "en", knownFonts = "", path?: string, preview = false): Promise<HtmlPreviewOutput> {
  const started = performance.now()
  const prepared = await invoke<Prepared>("prepare_document", { projectId, main, overrides })
  if (!prepared.ok || !prepared.document) throw new DocumentCompileError(prepared.diagnostics ?? [])
  const document = prepared.document
  const options = htmlOptionsFromSettings(document.settings, given)
  if (preview) options.embedFonts = false
  const packages = await invoke<Record<string, Record<string, string>>>("component_packages", {})
  for (const [name, metadata] of Object.entries(document.packages ?? {})) {
    const files: Record<string, string> = {
      "manifest.toml": `name = ${JSON.stringify(name)}\ntyp = ${metadata.typ ? '"typst.typ"' : "false"}\nhtml = ${metadata.html ? '"html.tsx"' : "false"}\n`,
      "schema.json": JSON.stringify(metadata.schemas), "docs.json": JSON.stringify(metadata.docs),
    }
    // The Typst module is served by the native world; HTML only needs its presence for fallback policy.
    if (metadata.typ) files["typst.typ"] = "// Native implementation"
    if (metadata.html) files["html.tsx"] = await invoke<string>("document_asset", { projectId, path: metadata.html, text: true, overrides })
    if (metadata.css) files["html.css"] = await invoke<string>("document_asset", { projectId, path: metadata.css, text: true, overrides })
    packages[name] = files
  }
  const catalog = componentCatalog(packages)
  const assets: Record<string, string> = {}
  const runtime = (await import("@formatex/html/runtime?raw")).default
  const operationProps = given.operationOverrides?.copyCode === undefined ? undefined : { code: { html: { "copy-button": given.operationOverrides.copyCode } } }
  let html = ""
  for (let round = 0; round < 8; round++) {
    try {
      html = await render(document, { assets, html: options, uiLanguage, runtime, nativeFonts: true, preview, components: catalog.components, schemas: catalog.schemas, css: catalog.css, typOnly: catalog.typOnly, operationProps })
      break
    } catch (failure) {
      const requests = (failure as { requests?: AssetRequest[] }).requests
      if (!requests?.length || round === 7) {
        const at = (failure as {at?:{file:string;line:number;column:number}}).at
        if (at) throw new DocumentCompileError([{severity:"error",message:failure instanceof Error ? failure.message : String(failure),path:at.file,line:at.line,column:at.column,hints:[]}])
        throw failure
      }
      let cursor = 0
      await Promise.all(Array.from({ length: Math.min(2, requests.length) }, async () => {
        while (cursor < requests.length) {
          const request = requests[cursor++]
          if (request.kind === "asset") {
            const key = request.text ? `text:${request.path}` : request.path
            assets[key] = await invoke<string>("document_asset", { projectId, path: request.path, text: request.text, overrides })
          } else {
            const node = { ...request.node, props: { ...request.node.props } }
            if (request.bodyOnly) { delete node.props.caption; delete node.props.id; node.children = node.children?.filter(child => child.name !== "caption") }
            try { assets[request.key] = await invoke<string>("render_document_graphic", { projectId, main, node, inline: request.inline, widthPt: request.widthPt, overrides }) }
            catch (error) { throw new DocumentCompileError([{severity:"error",message:String(error),path:node.at.file,line:node.at.line,column:node.at.column,hints:[]}]) }
          }
        }
      }))
    }
  }
  const result = await invoke<HtmlPreviewOutput>("finish_document_html", { html, embedFonts: options.embedFonts, knownFonts, path, preview })
  result.timings.compile_ms = prepared.elapsedMs
  result.timings.total_ms = performance.now() - started
  return result
}
