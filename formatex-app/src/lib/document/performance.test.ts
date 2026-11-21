import { it, expect } from "vitest"
import fs from "node:fs"
import { renderHtml } from "@formatex/html"
import type { DocumentIR } from "@formatex/core"
import { DEFAULT_HTML_OPTIONS } from "@/lib/projects/htmlConfig"

it.skipIf(!process.env.FORMATEX_DOCUMENT_BENCH)("measures actual large IR to standalone HTML", async () => {
  const input = JSON.parse(fs.readFileSync("../out/performance/large-document.json", "utf8")) as DocumentIR
  const rows = []
  for (let round = 0; round < 6; round++) {
    const document = structuredClone(input)
    document.children.push({type:"paragraph",key:"edit",at:{file:"main.md",line:1,column:1},children:[{type:"text",key:"edit-t",value:`Edit ${round}`,at:{file:"main.md",line:1,column:1}}]})
    const start = performance.now()
    const html = await renderHtml(document,{html:{...DEFAULT_HTML_OPTIONS,katexMath:true},nativeFonts:true,runtime:fs.readFileSync("../formatex-html/dist/runtime.js","utf8")})
    rows.push({round,renderMs:performance.now()-start,htmlBytes:Buffer.byteLength(html)})
    expect(html).toContain(`Edit ${round}`)
  }
  fs.writeFileSync("../out/performance/html-timings.json",JSON.stringify(rows,null,2))
  console.log("HTML_RENDER",JSON.stringify(rows))
},120000)
