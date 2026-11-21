import React, { type ReactNode } from "react"
import { renderToStaticMarkup, renderToString } from "react-dom/server"
import { transform } from "sucrase"
import { DocumentError, textOf, type DocumentIR, type Node, type Settings } from "@formatex/core"
import { componentLayers, resolve, outputSettings, type Properties } from "@formatex/core"
import { renderBuiltin, renderFootnote, graphicTags, type RenderContext } from "./components"
import { renderFence, renderHeading, renderList, renderMath, renderParagraph, renderQuote, renderTable } from "./markdown"
import * as Kit from "./kit"
import css from "./generated/style"
import { DocumentShell, type ShellData } from "./shell"
import * as DocumentUI from "./ui"
import * as JsxRuntime from "react/jsx-runtime"
import type { TagSpec } from "@formatex/core"
import { prepareMath } from "./math"
import { MissingAssetsError, type AssetRequest } from "./assets"

const compiled = new Map<string, (props: { node: Node; context: RenderContext }) => ReactNode>()

export function compileComponent(source: string): (props: { node: Node; context: RenderContext }) => ReactNode {
  const cached = compiled.get(source)
  if (cached) return cached
  const code = transform(source, { transforms: ["typescript", "jsx", "imports"], jsxRuntime: "automatic", production: true }).code
  const exports: Record<string, unknown> = {}
  const require = (name: string) => {
    if (name === "react") return React
    if (name === "react/jsx-runtime") return JsxRuntime
    if (name === "formatex") return { renderBuiltin, ...DocumentUI, ...Kit }
    if (name === "formatex/ui") return DocumentUI
    throw new Error(`Unsupported component import: ${name}`)
  }
  new Function("require", "exports", "module", code)(require, exports, { exports })
  if (typeof exports.default !== "function") throw new Error("A component must export a default function")
  const component = exports.default as (props: { node: Node; context: RenderContext }) => ReactNode
  if (compiled.size >= 64) compiled.delete(compiled.keys().next().value!)
  compiled.set(source, component)
  return component
}

function LocatedComponent({component: Component,node,context}:{component:ReturnType<typeof compileComponent>;node:Node;context:RenderContext}) {
  try { return Component({node,context}) }
  catch (error) { throw new DocumentError(error instanceof Error ? error.message : String(error),node.at) }
}

export interface RenderOptions {
  assets?: Record<string, string>
  components?: Record<string, string>
  uiLanguage?: "fa" | "en"
  html: { copyCode: boolean; toolbar: boolean; outline: boolean; progress: boolean; katexMath: boolean; embedFonts?: boolean }
  /** Host supplies the required fonts after rendering, instead of inline full fonts. */
  nativeFonts?: boolean
  runtime?: string
  schemas?: Record<string, TagSpec>
  css?: string
  operationProps?: Record<string, Settings>
  typOnly?: string[]
  preview?: boolean
}

export async function renderHtml(document: DocumentIR, options: RenderOptions): Promise<string> {
  document = { ...document, settings: outputSettings(document.settings, "html") }
  const requests = new Map<string, AssetRequest>()
  const backgrounds = new Map<string, string>()
  const math = await prepareMath(document.children, options.html.katexMath, options.nativeFonts ?? false)
  const numbers = new Map<string, number>(), targets = new Map<string, Node>(), counts = new Map<string, number>()
  const headingCounts: number[] = []
  const effective = (node: Node) => {
    const name = node.name ?? (node.type === "heading" ? "heading" : node.type === "code" ? "code" : node.type)
    const specs: Properties = { ...(document.options?.[name]?.attrs ?? {}), ...(options.schemas?.[name]?.attrs ?? {}) }
    if (name === "heading") {
      specs.numbering ??= { type: "bool", default: true }
      specs.underline ??= { type: "bool", default: false }
      specs.fill ??= { type: "bool", default: false }
      specs["max-level"] ??= { type: "int", default: 2 }
      specs["max-numbering-level"] ??= { type: "int", default: 6 }
      specs["number-prefix"] ??= { type: "string", default: "" }
      specs["number-suffix"] ??= { type: "string", default: "" }
    }
    if (name === "code") specs["copy-button"] = { domain: "html", type: "bool", default: options.html.copyCode }
    const local = Object.fromEntries(Object.entries(node.props ?? {}).filter(([k]) => !k.startsWith("_") && !(k === "id" && node.props?._generatedId)))
    const layers = componentLayers(document.settings, name, local)
    if (options.operationProps?.[name]) layers.splice(layers.length - 1, 0, options.operationProps[name])
    const resolved = resolve("html", specs, layers, !!options.schemas?.[name])
    if (node.props?._generatedId) resolved.id = node.props.id
    if (node.props?._dir !== undefined && local.dir === undefined && local["html.dir"] === undefined) resolved.dir = node.props._dir
    return resolved
  }
  const equationSettings = document.settings.equation
  const equationMode = equationSettings && typeof equationSettings === "object" && !Array.isArray(equationSettings) ? String((equationSettings as Settings).numbering ?? "labelled") : "labelled"
  let lastSpoken: "rtl" | "ltr" = String(document.settings.dir) === "rtl" ? "rtl" : "ltr"
  const walk = (nodes: Node[], inheritedDir = String(document.settings.dir ?? "auto"), owner?: Node, listDepth = 0) => { for (const node of nodes) {
    node.props ??= {}
    const policy = effective(node)
    node.props._dir = node.name === "dir" ? String(policy.to ?? "auto") : String(node.props.dir ?? node.props["html.dir"] ?? inheritedDir)
    if (node.type === "list") node.props._listDepth = listDepth
    if (node.props._dir === "rtl" || node.props._dir === "ltr") {
      lastSpoken = node.props._dir
      node.props._flow = node.props._dir
    } else if (["heading", "paragraph", "blockquote", "list", "table"].includes(node.type)) {
      const sample = textOf(node)
      if (/\p{L}/u.test(sample)) lastSpoken = Kit.arabicScript(sample) ? "rtl" : "ltr"
      node.props._flow = lastSpoken
    }
    if ((node.type === "footnoteReference" || node.name === "fn" || node.name === "footnote") && node.props._flow !== "rtl" && node.props._flow !== "ltr") node.props._flow = lastSpoken
    if (node.type === "footnoteReference") {
      const n = (counts.get("footnote") ?? 0) + 1
      counts.set("footnote", n)
      numbers.set(node.key, n)
    }
    if (node.type === "heading") {
      const depth = node.depth ?? 1
      node.props.id ??= textOf(node).trim().toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, "").replace(/\s+/g, "-")
      if (policy.numbering !== false && policy.numbering !== "false") {
        headingCounts[depth - 1] = (headingCounts[depth - 1] ?? 0) + 1
        headingCounts.length = depth
        for (let i = 0; i < depth; i++) if (headingCounts[i] === undefined) headingCounts[i] = 0
        const nums = headingCounts.slice(0, depth)
        while (nums.length > 1 && nums[0] === 0) nums.shift()
        node.props._number = nums.join(".")
      }
    }
    const kind = node.type === "math" ? "equation" : node.type === "table" || node.type === "code" || node.type === "list" ? node.type : node.name
    if (!(owner && ["cetz", "lilaq", "chart"].includes(kind ?? "")) && kind && ["table", "code", "list", "equation", "exercise", "theorem", "lemma", "definition", "corollary", "example", "remark", "counter", "fig", "chart", "cetz", "lilaq", "todo", "fn", "footnote"].includes(kind) && (kind !== "code" || Kit.codeIsNumbered(document.settings, node.props ?? {})) && (kind !== "table" || Kit.captionedNumber(document.settings, "table", node.props ?? {})) && (kind !== "list" || Kit.captionedNumber(document.settings, "list", node.props ?? {}))) {
      const counter = ["fn", "footnote"].includes(kind) ? "footnote" : ["fig", "chart", "cetz", "lilaq"].includes(kind) ? "figure" : kind
      const n = (counts.get(counter) ?? 0) + 1
      counts.set(counter, n); numbers.set(node.key, n)
      if (!node.props.id) { node.props._generatedId = true; node.props.id = `fx-${kind}-${n}` }
    }
    if (node.props.id && node.name !== "def") {
      if (targets.has(String(node.props.id))) throw new DocumentError(`Duplicate id: ${node.props.id}`, node.at)
      targets.set(String(node.props.id), node)
      for (const alias of (node.props._aliases as string[] | undefined) ?? []) {
        if (!targets.has(alias)) targets.set(alias, node)
      }
    }
    if (node.type === "math") {
      node.props._eqDir = lastSpoken
      const labelled = !!node.props.id && !node.props._generatedId
      if (equationMode === "all" || (equationMode === "labelled" && labelled)) {
        node.props._eqMode = equationMode === "all" ? "all" : "labelled"
        const eqNumber = numbers.get(node.key)
        if (eqNumber !== undefined) node.props._eqNumber = eqNumber
      }
    }
    if (node.children) walk(node.children, String(node.props._dir), node.name === "fig" ? node : owner, node.type === "list" ? listDepth + 1 : listDepth)
  } }
  walk(document.children)
  const outlined: Node[] = []
  const collectHeadings = (nodes: Node[]) => { for (const node of nodes) { if (node.type === "heading" && effective(node).toc !== false && effective(node).toc !== "false") outlined.push(node); if (node.children) collectHeadings(node.children) } }
  collectHeadings(document.children)
  const numberedHeadings = outlined.filter(node => { const policy = effective(node); return policy.numbering !== false && policy.numbering !== "false" })
  const headingPool = numberedHeadings.length ? numberedHeadings : outlined
  const headingTop = headingPool.length ? Math.min(...headingPool.map(node => node.depth ?? 1)) : 1
  const language = options.uiLanguage ?? "en"
  const c: RenderContext = {
    document, assets: options.assets ?? {}, numbers, targets, language,
    asset(path, text = false) {
      if (!path || /^(data:|blob:)/i.test(path)) return path
      const key = text ? `text:${path}` : path
      if (c.assets[key] !== undefined) return c.assets[key]
      requests.set(key, { kind: "asset", path, text })
      return ""
    },
    background(path) {
      const asset=c.asset(path)
      if (!asset) return "none"
      let name=backgrounds.get(asset)
      if (!name) { name=`--fx-image-${backgrounds.size}`; backgrounds.set(asset,name) }
      return `var(${name})`
    },
    graphic(node, graphicOptions) {
      const bodyOnly = graphicOptions?.bodyOnly ?? false
      const key = bodyOnly ? `${node.key}:body` : node.key
      const inline = options.schemas?.[node.name ?? ""]?.kind === "inline"
      const Tag = inline ? "span" : "div"
      if (c.assets[key] !== undefined) return <Tag className={inline ? "fx-graphic-inline" : "fx-graphic"} dangerouslySetInnerHTML={{ __html: c.assets[key] }} />
      requests.set(key, { kind: "graphic", node, key, bodyOnly, inline: inline || bodyOnly && ["cetz", "lilaq", "typ"].includes(node.name ?? "") })
      return null
    },
    props: effective,
    children(node) { return node.children?.map(child => <React.Fragment key={child.key}>{c.render(child)}</React.Fragment>) },
    render(node) {
      const children = () => c.children(node)
      const raw = () => { switch (node.type) {
        case "text": return node.value
        case "paragraph": return renderParagraph(node, c, effective(node))
        case "strong": return <strong>{children()}</strong>
        case "emphasis": return <em>{children()}</em>
        case "delete": return <del>{children()}</del>
        case "heading": return renderHeading(node, c, effective(node), headingTop)
        case "link": return <a href={safeUrl(node.url)} title={node.title ?? undefined}>{children()}</a>
        case "image": return <img src={c.asset(node.url ?? "")} alt={node.alt ?? ""} title={node.title ?? undefined} />
        case "inlineCode": return <code className="fx-inline-code" dir="ltr">{node.value}</code>
        case "code": return node.lang === "mermaid" ? c.graphic(node) : renderFence(node, c, effective(node))
        case "list": return renderList(node, c, effective(node))
        case "listItem": return <li>{c.children(node)}</li>
        case "blockquote": return renderQuote(node, c)
        case "break": return <br />
        case "thematicBreak": return <hr className="fx-rule" />
        case "table": return renderTable(node, c, effective(node))
        case "inlineMath": case "math": return renderMath(node, math.html[node.key] ?? "")
        case "footnoteReference": {
          const note = find(document.children, item => item.type === "footnoteDefinition" && item.identifier === node.identifier)
          const persian = node.props?._flow === "rtl"
          const value = c.numbers.get(node.key)
          const sample = note ? textOf(note) : ""
          const body = note ? (note.children ?? []).map(child => child.type === "paragraph" ? <span key={child.key} className="fx-fn-line">{c.children(child)}</span> : c.render(child)) : node.identifier
          return renderFootnote(`note-ref-${node.key}`, value === undefined ? "*" : Kit.digits(value, persian), body, sample && Kit.arabicScript(sample) ? "rtl" : "ltr")
        }
        case "footnoteDefinition": return null
        case "definition": return null
        case "linkReference": { const target = find(document.children, n => n.type === "definition" && n.identifier === node.identifier); return <a href={safeUrl(target?.url)}>{children()}</a> }
        case "component": {
          const source = options.components?.[node.name!]
          if (source) {
            try { return <LocatedComponent component={compileComponent(source)} node={node} context={c} /> }
            catch (error) { throw new DocumentError(error instanceof Error ? error.message : String(error),node.at) }
          }
          if (options.typOnly?.includes(node.name!)) { const Tag = options.schemas?.[node.name!]?.kind === "inline" ? "span" : "div"; return <Tag id={String(effective(node).id ?? "") || undefined}>{c.graphic(node)}</Tag> }
          if (c.assets[node.key]) return <div className="fx-graphic" dangerouslySetInnerHTML={{ __html: c.assets[node.key] }} />
          return renderBuiltin(node, c)
        }
        case "html": return null
        default: return children()
      } }
      const result = raw()
      if (!options.preview || !node.source?.length || result === null || result === undefined) return result
      if (React.isValidElement(result) && typeof result.type === "string") return React.cloneElement(result as React.ReactElement<Record<string, unknown>>, { "data-fx-node": node.key })
      const Tag = node.type === "component" && options.schemas?.[node.name!]?.kind === "block" ? "div" : "span"
      return <Tag data-fx-node={node.key} style={node.type === "text" ? undefined : { display: "contents" }}>{result}</Tag>
    },
  }
  const prepareCode = async (nodes: Node[]): Promise<void> => {
    for (const node of nodes) {
      if (node.type === "code" || node.name === "code") {
        const p = effective(node)
        const value = p.src ? c.asset(String(p.src), true) : node.value ?? node.children?.find(n => n.type === "code")?.value ?? ""
        const language = String(p.lang ?? node.lang ?? node.children?.find(n => n.type === "code")?.lang ?? "")
        c.assets[`code:${node.key}`] = JSON.stringify(await (await import("./highlight")).highlight(value.replace(/\n$/, ""), language))
      }
      if (node.children) await prepareCode(node.children)
    }
  }
  await prepareCode(document.children)
  const dir = String(document.settings.dir ?? "auto")
  const fontNames = (values: unknown[]): string[] => values.flat(Infinity).filter((value): value is string => typeof value === "string" && !!value)
  const font = fontNames([document.tokens.latin ?? "Inter", document.tokens.persian ?? "Vazirmatn"]).map(v => JSON.stringify(v)).join(",")
  const variables = Object.entries(document.tokens).filter(([k]) => ["bg", "fg", "muted", "accent", "secondary", "heading", "rule", "code-bg", "code-stroke"].includes(k)).map(([k, v]) => `--${k}:${v}`).join(";")
  const style = `:root{${variables};--font-body:${font},serif;--font-code:${fontNames([document.tokens.code ?? "monospace"]).map(v => JSON.stringify(v)).join(",")},monospace;--radius:${Number(document.tokens.radius ?? 0)}px}@layer formatex{${css}\n.fx-doc p{unicode-bidi:${dir === "auto" ? "plaintext" : "normal"}}\n${math.css}}` + (options.css ?? "")
  const data: ShellData = { language, toolbar: options.html.toolbar, outline: options.html.outline, progress: options.html.progress, zoom: Number(document.tokens.zoom ?? 1) * 100, theme: String(document.tokens["theme-name"] ?? document.settings.theme ?? "paper"), feel: String(document.tokens["feel-name"] ?? document.settings.feel ?? "formal"), themes: document.tokens.themes as ShellData["themes"], feels: document.tokens.feels as ShellData["feels"], headings: Array.from(new Set(targets.values())).filter(n => n.type === "heading" && effective(n).toc !== false && effective(n).toc !== "false").map(n => ({ id: String(n.props?.id), text: textOf(n), depth: n.depth ?? 1 })) }
  const content = renderToStaticMarkup(<>{document.children.map(n => <React.Fragment key={n.key}>{c.render(n)}</React.Fragment>)}</>)
  if (requests.size) throw new MissingAssetsError([...requests.values()])
  // Background images may recur in several headers. Embed each once, not once per element.
  const backgroundCss=backgrounds.size?`:root{${[...backgrounds].map(([asset,name])=>`${name}:url(${JSON.stringify(asset)})`).join(";")}}`:""
  const viewerFonts = options.html.toolbar ? Object.values(data.feels ?? {}).flatMap(feel => [feel.latin, feel.persian]) : []
  // The shell is hydrated: preserve React's text boundaries and useId markers.
  // Document components above remain static and independently patchable.
  const shell = renderToString(<DocumentShell data={data} content={content} />)
  const html = renderToStaticMarkup(<html lang={language} dir={dir} className={document.tokens.dark ? "dark" : undefined} data-feel={data.feel}><head><meta charSet="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><meta name="fx-fonts" content={fontNames([document.tokens.latin, document.tokens.persian, document.tokens.code, ...viewerFonts, ...math.families]).join("|")} /><style dangerouslySetInnerHTML={{ __html: style + backgroundCss }} /></head><body><div id="fx-shell" dangerouslySetInnerHTML={{ __html: shell }} /></body></html>)
  const payload = `<script id="fx-shell-data" type="application/json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`
  const runtime = options.runtime ? `<script>${options.runtime.replace(/<\/script/gi, "<\\/script")}</script>` : ""
  const sourceMap: Record<string, unknown> = {}
  if (options.preview) {
    const collect = (nodes: Node[]) => { for (const node of nodes) { if (node.source?.length) sourceMap[node.key] = { source: node.source, at: node.at, text: node.type === "text" ? node.value : undefined }; if (node.children) collect(node.children); if (node.rich) for (const rich of Object.values(node.rich)) collect(rich) } }
    collect(document.children)
  }
  const map = options.preview ? `<script id="fx-source-map" type="application/json">${JSON.stringify(sourceMap).replace(/</g, "\\u003c")}</script>` : ""
  const result = "<!doctype html>" + html.replace("</body>", () => `${payload}${map}${runtime}</body>`)
  const utilities = await (await import("./tailwind")).utilityCss(result)
  return result.replace("</head>", () => `<style data-fx-tailwind>${utilities}</style></head>`)
}

export const safeUrl = (url?: string): string => url && !/^\s*(javascript|vbscript):/i.test(url) ? url : ""
export function find(nodes: Node[], predicate: (node: Node) => boolean): Node | undefined {
  for (const node of nodes) { if (predicate(node)) return node; const child = node.children && find(node.children, predicate); if (child) return child }
}
export const needsGraphic = (node: Node) => node.type === "component" && graphicTags.has(node.name ?? "")

