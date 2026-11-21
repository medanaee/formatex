import { expect, it } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { componentCatalog, type DocumentIR } from "@formatex/core"
import { renderHtml, type AssetRequest } from "@formatex/html"
import { DEFAULT_HTML_OPTIONS } from "@/lib/projects/htmlConfig"

/** Real CLI fixture, opt-in because it builds each diagram with the installed Typst engine. */
it.skipIf(!process.env.FORMATEX_DOCUMENT_INTEGRATION)("builds full-demo HTML with real SVG/image assets from the Typst-produced IR", async () => {
  const engine = path.resolve("../formatex-typ"), output = path.resolve("../out/pipeline")
  fs.mkdirSync(output, { recursive: true })
  const evaluate = spawnSync("typst", ["eval", '{ import "/src/document.typ": document-ir; document-ir }', "--root", ".", "--input", "source=examples/demo.md", "--input", "target=html", "--format", "json"], { cwd: engine, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 })
  expect(evaluate.status, evaluate.stderr.slice(0, 2000)).toBe(0)
  const document = JSON.parse(evaluate.stdout) as DocumentIR
  fs.writeFileSync(path.join(output, "document.json"), JSON.stringify(document))
  const packages: Record<string, Record<string, string>> = {}
  for (const folder of fs.readdirSync("../formatex-core/components", { withFileTypes: true }).filter(entry => entry.isDirectory())) {
    const directory = path.resolve("../formatex-core/components", folder.name)
    packages[folder.name] = Object.fromEntries(fs.readdirSync(directory).map(file => [file, fs.readFileSync(path.join(directory, file), "utf8")]))
  }
  const catalog = componentCatalog(packages), assets: Record<string, string> = {}
  let svgCount = 0, html = ""
  for (let round = 0; round < 8; round++) {
    try {
      html = await renderHtml(document, { html: { ...DEFAULT_HTML_OPTIONS, katexMath: true }, ...catalog, assets, nativeFonts: true, uiLanguage: "fa", runtime: fs.readFileSync("../formatex-html/dist/runtime.js", "utf8") })
      break
    } catch (error) {
      const requests = (error as { requests?: AssetRequest[] }).requests
      if (!requests) throw error
      for (const request of requests) {
        if (request.kind === "asset") {
          const file = path.join(engine, request.path.replace(/^\//, ""))
          const data = fs.readFileSync(file)
          assets[request.text ? `text:${request.path}` : request.path] = request.text ? data.toString("utf8") : `data:image/${file.endsWith(".svg") ? "svg+xml" : file.endsWith(".png") ? "png" : "jpeg"};base64,${data.toString("base64")}`
        } else {
          const node = { ...request.node, props: { ...request.node.props } }
          if (request.bodyOnly) { delete node.props.caption; delete node.props.id; node.children = node.children?.filter(child => child.name !== "caption") }
          const entry = path.join(engine, "out/graphic-fixture.typ"), svg = path.join(output, "graphic.svg")
          fs.writeFileSync(entry, `#import "/src/render.typ": render-document, conf, all-rules\n#show: conf\n#show: all-rules\n#set page(width:${request.inline ? "auto" : "600pt"},height:auto,margin:0pt,header:none,footer:none,numbering:none)\n#let node = json(bytes(${JSON.stringify(JSON.stringify(node))}))\n#render-document((children:(node,)))\n`)
          const result = spawnSync("typst", ["compile", entry, svg, "--root", ".", "--input", "source=examples/demo.md", "--input", "target=html", "--font-path", "../formatex-app/fonts"], { cwd: engine, encoding: "utf8" })
          expect(result.status, result.stderr.slice(0, 2400)).toBe(0)
          assets[request.key] = fs.readFileSync(svg, "utf8"); svgCount++
        }
      }
    }
  }
  fs.writeFileSync(path.join(output, "document.html"), html)
  const runtimeCode=fs.readFileSync("../formatex-html/dist/runtime.js","utf8")
  for(const language of ["fa","en"] as const) {
    const viewer=await renderHtml(document,{html:{...DEFAULT_HTML_OPTIONS,katexMath:true},...catalog,assets,nativeFonts:true,uiLanguage:language,runtime:runtimeCode})
    fs.writeFileSync(path.join(output,`viewer-${language}.html`),viewer)
  }
  const previewHtml=await renderHtml(document,{html:{...DEFAULT_HTML_OPTIONS,katexMath:true},...catalog,assets,nativeFonts:true,uiLanguage:"fa",runtime:runtimeCode,preview:true})
  fs.writeFileSync(path.join(output,"viewer-preview.html"),previewHtml)
  expect(html.length).toBeGreaterThan(1000)
  expect(html.includes('id="fx-source-map"')).toBe(false)
  expect(html.includes('class="katex"')).toBe(true)
  expect(svgCount).toBeGreaterThan(0)
  for (const graphic of Object.values(assets).filter(value => value.startsWith("<svg"))) expect(graphic.length).toBeGreaterThan(600)
  const runtime = /<script>([\s\S]*?)<\/script>/.exec(html)?.[1]
  expect(runtime).toBeTruthy()
  expect(() => new Function(runtime!)).not.toThrow()
  expect(html.length).toBeLessThan(2_000_000)
}, 180000)
