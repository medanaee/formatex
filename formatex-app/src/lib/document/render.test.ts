import { expect, it } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { renderHtml, MissingAssetsError } from "@formatex/html"
import { componentCatalog, type DocumentIR, type Node } from "@formatex/core"
import { DEFAULT_HTML_OPTIONS } from "@/lib/projects/htmlConfig"

const document = (): DocumentIR => ({ version: 1, file: "private.md", tokens: {}, settings: {}, children: [{ type: "paragraph", key: "p", at: { file: "private.md", line: 1, column: 1 }, source: [{ file: "private.md", start: 0, end: 4, utf16Start: 0, utf16End: 4, generated: false }], children: [{ type: "text", value: "Text", key: "t", at: { file: "private.md", line: 1, column: 1 }, source: [{ file: "private.md", start: 0, end: 4, utf16Start: 0, utf16End: 4, generated: false }] }] }] })

it("keeps source navigation data in preview and removes it entirely from standalone HTML", async () => {
  const options = { html: DEFAULT_HTML_OPTIONS }
  const preview = await renderHtml(document(), { ...options, preview: true })
  expect(preview.includes('id="fx-source-map"')).toBe(true)
  expect(preview.includes('data-fx-node="t"')).toBe(true)
  const exported = await renderHtml(document(), options)
  expect(exported.includes("private.md")).toBe(false)
  expect(exported.includes("fx-source-map")).toBe(false)
  expect(exported.includes("data-fx-node")).toBe(false)
})

it("lets an editable TSX component request SVG without importing app or Typst code", async () => {
  const input = document()
  input.children = [{ type: "component", name: "drawing", key: "diagram", at: { file: "main.md", line: 1, column: 1 } }]
  const options = { html: DEFAULT_HTML_OPTIONS, components: { drawing: 'export default function Drawing({node,context}) { return <section className="p-2">{context.graphic(node)}</section> }' } }
  await expect(renderHtml(input, options)).rejects.toMatchObject({ name: "MissingAssetsError", requests: [{ kind: "graphic", node: expect.objectContaining({ key: "diagram" }) }] })
  const output = await renderHtml(input, { ...options, assets: { diagram: '<svg viewBox="0 0 20 10"></svg>' } })
  expect(output.includes('viewBox="0 0 20 10"')).toBe(true)
  expect(output.includes(".p-2")).toBe(true)
  expect(MissingAssetsError).toBeDefined()
})


it("applies global and local settings, skips unnumbered headings and resolves equation aliases", async () => {
  const input = document()
  input.settings = { dir: "rtl", paragraph: { justify: true, "letter-spacing": 3 }, heading: { numbering: true }, html: { code: { "copy-button": false } } }
  const at = {file:"main.md",line:1,column:1}
  input.children = [
    {type:"heading",depth:2,key:"h",at,props:{id:"heading",_aliases:["title"]},children:[{type:"text",value:"Title",key:"ht",at}]},
    {type:"heading",depth:2,key:"skip",at,props:{numbering:false},children:[{type:"text",value:"Skip",key:"st",at}]},
    {type:"heading",depth:2,key:"next",at,children:[{type:"text",value:"Next",key:"nt",at}]},
    ...input.children,
    {type:"math",key:"eq",at,value:"x^2",props:{id:"eq"}},
    {type:"component",name:"ref",key:"r",at,props:{to:"eq"}},
    {type:"component",name:"ref",key:"rh",at,props:{to:"title"}},
    {type:"code",key:"c",at,value:"x",lang:"js"},
  ]
  const refDir = path.resolve("../formatex-core/components/ref")
  const refCatalog = componentCatalog({ ref: Object.fromEntries(fs.readdirSync(refDir).map(file => [file, fs.readFileSync(path.join(refDir, file), "utf8")])) })
  const html = await renderHtml(input,{html:{...DEFAULT_HTML_OPTIONS,toolbar:false},...refCatalog,nativeFonts:true})
  expect(html).toContain('text-align:justify;letter-spacing:0.03em')
  expect(html).toContain('<p style="text-align:justify;letter-spacing:0.03em" dir="rtl"')
  expect(html).toContain('<span class="fx-heading-number">۱ </span>Title')
  expect(html).toContain('<span class="fx-heading-number">۲ </span>Next')
  expect(html).toContain('class="fx-math fx-display-math fx-eq-end" dir="ltr"')
  expect(html).toContain('class="fx-eq-number">(۱)</span>')
  expect(html).toContain('href="#eq">(۱)</a>')
  expect(html).toContain('href="#heading">Title</a>')
  expect(html).not.toContain('class="fx-copy"')
  expect(html).toContain('.fx-doc { max-width: 54rem')
})

it("inserts an offline runtime verbatim even when it contains replacement patterns", async () => {
  const runtime = 'window.example = "$&";'
  const html = await renderHtml(document(),{html:DEFAULT_HTML_OPTIONS,runtime})
  expect(html).toContain(`<script>${runtime}</script>`)
})

it("keeps paired reference labels inside the generated link", async () => {
  const input=document(), at={file:"main.md",line:1,column:1}
  input.children=[{type:"heading",key:"heading",depth:2,at,props:{id:"target"},children:[{type:"text",key:"title",at,value:"Target title"}]},{type:"paragraph",key:"p",at,children:[{type:"component",name:"ref",key:"reference",at,props:{to:"target"},children:[{type:"strong",key:"label",at,children:[{type:"text",key:"label-text",at,value:"Custom label"}]}]}]}]
  const refDir = path.resolve("../formatex-core/components/ref")
  const refCatalog = componentCatalog({ ref: Object.fromEntries(fs.readdirSync(refDir).map(file => [file, fs.readFileSync(path.join(refDir, file), "utf8")])) })
  const html=await renderHtml(input,{html:DEFAULT_HTML_OPTIONS,...refCatalog})
  expect(html).toContain('href="#target"><strong>Custom label</strong></a>')
})

it("uses intrinsic inline SVG fallback only when the package has no TSX implementation", async () => {
  const input = document(); input.children=[{type:"component",name:"native",key:"native",at:{file:"part.md",line:7,column:3}}]
  await expect(renderHtml(input,{html:DEFAULT_HTML_OPTIONS,typOnly:["native"],schemas:{native:{kind:"inline",attrs:{}}}})).rejects.toMatchObject({requests:[{kind:"graphic",inline:true,bodyOnly:false}]})
  const html=await renderHtml(input,{html:DEFAULT_HTML_OPTIONS,typOnly:["native"],schemas:{native:{kind:"inline",attrs:{}}},assets:{native:'<svg viewBox="0 0 20 10"></svg>'}})
  expect(html).toContain('class="fx-graphic-inline"')
  expect(html).not.toContain("part.md")
})

it("attaches component execution errors to the original Markdown location", async () => {
  const input=document(); input.children=[{type:"component",name:"bad",key:"bad",at:{file:"part.md",line:7,column:3}}]
  await expect(renderHtml(input,{html:DEFAULT_HTML_OPTIONS,components:{bad:'export default function Bad() { throw new Error("Bad value") }'}})).rejects.toMatchObject({at:{file:"part.md",line:7,column:3}})
})

it("renders alert, box, badge, kbd and code with the PDF padding, tint and feel radii", async () => {
  const at = { file: "look.md", line: 1, column: 1 }
  const node = (partial: Pick<Node, "type" | "key"> & Partial<Node>): Node => ({ at, ...partial })
  const text = (key: string, value: string) => node({ type: "text", key, value })
  const input = document()
  input.file = "look.md"
  input.settings = { feel: "standard", dir: "rtl", code: { numbering: true, "caption-position": "above" } }
  input.tokens = { bg: "#ffffff", fg: "#1c1917", muted: "#78716c", accent: "#2563eb", secondary: "#0f766e", heading: "#1c1917", rule: "#e7e5e4", "code-bg": "#f6f8fa", "code-stroke": "#d0d7de", radius: 6, dark: false }
  input.children = [
    node({ type: "paragraph", key: "p", children: [
      text("t1", "Run "),
      node({ type: "component", name: "badge", key: "badge", props: { color: "green", icon: "check" }, children: [text("badge-text", "stable")] }),
      text("t2", " with "),
      node({ type: "component", name: "kbd", key: "kbd", children: [text("kbd-text", "Ctrl+C")] }),
    ] }),
    node({ type: "component", name: "alert", key: "alert", props: { type: "note" }, children: [node({ type: "paragraph", key: "alert-p", children: [text("alert-t", "A note")] })] }),
    node({ type: "component", name: "box", key: "box", props: { color: "blue" }, children: [node({ type: "paragraph", key: "box-p", children: [text("box-t", "Tinted")] })] }),
    node({ type: "component", name: "box", key: "plain", children: [text("plain-t", "Open")] }),
    node({ type: "component", name: "box", key: "hex", props: { color: "#dbeafe" }, children: [text("hex-t", "Hex")] }),
    node({ type: "code", key: "fence", lang: "py", value: "print(1)\nprint(2)\n", props: { highlight: "2" } }),
    node({ type: "code", key: "typ-fence", lang: "typst", value: "// note\n#let run(x: Box) = call(42, true, \"ok\")\n" }),
    node({ type: "code", key: "plain-fence", lang: "plaintext", value: "if true return 1\n" }),
    node({ type: "component", name: "code", key: "listing", props: { lang: "python", caption: "نمونه" }, children: [node({ type: "code", key: "listing-code", value: "x = 1\n", lang: "python" })] }),
  ]
  const packages: Record<string, Record<string, string>> = {}
  for (const name of ["alert", "box", "badge", "kbd", "code"]) {
    const directory = path.resolve("../formatex-core/components", name)
    packages[name] = Object.fromEntries(fs.readdirSync(directory).map(file => [file, fs.readFileSync(path.join(directory, file), "utf8")]))
  }
  const catalog = componentCatalog(packages)
  const html = await renderHtml(input, { html: { ...DEFAULT_HTML_OPTIONS, toolbar: false, outline: false, progress: false }, ...catalog, uiLanguage: "fa" })
  expect(html).toContain('data-feel="standard"')
  expect(html).toContain("--fx-space: 0.9")
  expect(html).toContain("--fx-syn-keyword: #a626a4")
  expect(html).toContain("--fx-syn-function: #4078f2")
  expect(html).toContain("--fx-radius-alert: 0.8em")
  expect(html).toContain("--fx-radius-box: 0.6em")
  expect(html).toContain("--fx-radius-kbd: 0.4em")
  expect(html).toContain("padding: calc(1.2em * var(--fx-space, 1))")
  expect(html).toContain("padding: calc(0.8em * var(--fx-space, 1))")
  expect(html).toContain('class="fx-alert fx-tint fx-alert-iconed"')
  expect(html).toContain("--fx-paint:#a855f7")
  expect(html).toContain('class="fx-alert-icon"')
  expect(html).toContain('class="fx-box fx-tint fx-box-stroke"')
  expect(html).toContain("--fx-paint:#3b82f6")
  expect(html).toContain('class="fx-box"')
  expect(html).toContain('class="fx-box fx-tint fx-tint-hex"')
  expect(html).toContain('class="fx-badge fx-tint"')
  expect(html).toContain('class="fx-kbd"')
  expect(html.match(/class="fx-kbd"/g)?.length).toBe(2)
  expect(html).toContain('class="fx-kbd-plus"')
  expect(html).toContain("Python")
  expect(html).toContain('class="fx-code-corner fx-code-corner-both"')
  expect(html).toContain('class="fx-code-badge"')
  expect(html).toContain('data-fa="\uf3e2"')
  expect(html).toContain("Font Awesome 7 Pro|Font Awesome 7 Brands")
  expect(html).toContain('<span class="hljs-comment">// note</span>')
  expect(html).toContain('<span class="hljs-keyword">let</span> <span class="hljs-title function_">run</span>(x: <span class="hljs-type">Box</span>) = <span class="hljs-title function_">call</span>(<span class="hljs-number">42</span>, <span class="hljs-literal">true</span>, <span class="hljs-string">"ok"</span>)')
  expect(html).toContain("if true return 1")
  expect(html).toContain('data-line="2"')
  expect(html).toContain("fx-code-highlight")
  expect(html).toContain("کد ۱")
  expect(html).toContain(": نمونه")
  expect(html.match(/<figcaption/g)?.length).toBe(1)
  expect(html).not.toContain("<header><span>Python</span>")
  if (process.env.FORMATEX_LOOK) fs.writeFileSync(path.resolve("../out/html-look.html"), html)
})

it("renders standard Markdown with PDF numbering, lists, tables, quotes and fences", async () => {
  const at = { file: "md.md", line: 1, column: 1 }
  const text = (key: string, value: string): Node => ({ type: "text", key, value, at })
  const input = document()
  input.settings = {
    feel: "standard", dir: "rtl",
    heading: { numbering: true, "number-suffix": ".", underline: true, fill: true, "max-level": 1, color: "blue" },
    list: { numbering: true, guides: "tree" },
    table: { numbering: true, width: "full", "head-align": "center" },
    equation: { numbering: "labelled" },
  }
  input.tokens = { bg: "#fff", fg: "#1c1917", muted: "#78716c", accent: "#2563eb", secondary: "#0f766e", heading: "#1c1917", rule: "#e7e5e4", "code-bg": "#f6f8fa", "code-stroke": "#d0d7de", radius: 6, dark: false }
  input.children = [
    { type: "heading", depth: 2, key: "h1", at, children: [text("h1t", "مقدمه")] },
    { type: "heading", depth: 3, key: "h2", at, props: { numbering: false, underline: true }, children: [text("h2t", "فرعی")] },
    { type: "paragraph", key: "p", at, children: [text("pt", "متن "), { type: "inlineCode", key: "ic", at, value: "x" }] },
    { type: "list", key: "ol", at, ordered: true, props: { numbers: "abjad", caption: "حروف" }, children: [
      { type: "listItem", key: "i1", at, children: [text("i1t", "یک")] },
      { type: "listItem", key: "i2", at, children: [text("i2t", "دو")] },
    ] },
    { type: "list", key: "ul", at, ordered: false, children: [
      { type: "listItem", key: "u1", at, children: [text("u1t", "bullet")] },
      { type: "listItem", key: "u2", at, children: [
        text("u2t", "nested"),
        { type: "list", key: "ul2", at, ordered: false, children: [{ type: "listItem", key: "u3", at, children: [text("u3t", "child")] }] },
      ] },
    ] },
    { type: "blockquote", key: "q", at, children: [{ type: "paragraph", key: "qp", at, children: [text("qt", "نقل قول")] }] },
    { type: "thematicBreak", key: "hr", at },
    { type: "table", key: "tb", at, props: { caption: "داده‌ها" }, align: ["left", "right"], children: [
      { type: "tableRow", key: "tr1", at, children: [
        { type: "tableCell", key: "th1", at, children: [text("th1t", "نام")] },
        { type: "tableCell", key: "th2", at, children: [text("th2t", "Value")] },
      ] },
      { type: "tableRow", key: "tr2", at, children: [
        { type: "tableCell", key: "td1", at, children: [text("td1t", "الف")] },
        { type: "tableCell", key: "td2", at, children: [text("td2t", "1")] },
      ] },
    ] },
    { type: "code", key: "fence", at, lang: "python", value: "def greet(name):\n    return f\"سلام {name}\"\n", props: { highlight: "1" } },
    { type: "math", key: "eq", at, value: "E = mc^{2}", props: { id: "eq" } },
  ]
  const fnDir = path.resolve("../formatex-core/components/footnotes")
  const fnCatalog = componentCatalog({ footnotes: Object.fromEntries(fs.readdirSync(fnDir).map(file => [file, fs.readFileSync(path.join(fnDir, file), "utf8")])) })
  const html = await renderHtml(input, { html: { ...DEFAULT_HTML_OPTIONS, toolbar: false, outline: false, progress: false }, ...fnCatalog, uiLanguage: "fa" })
  expect(html).toContain('<span class="fx-heading-number">۱. </span>مقدمه')
  expect(html).toContain("fx-heading-rule")
  expect(html).toContain("fx-heading-fill")
  expect(html).toContain("fx-heading-ink")
  expect(html).toContain("--fx-heading-ink:#3b82f6")
  expect(html).not.toContain("</span>فرعی")
  expect(html).toContain(">فرعی</h3>")
  expect(html).toContain('class="fx-inline-code"')
  expect(html).toContain(">الف.</span>")
  expect(html).toContain(">ب.</span>")
  expect(html).toContain("فهرست ۱")
  expect(html).toContain(": حروف")
  expect(html).toContain('class="fx-list fx-guides-tree" dir="rtl"')
  expect(html).toContain('class="fx-quote"')
  expect(html).toContain('class="fx-rule"')
  expect(html).toContain("fx-table-lined")
  expect(html).toContain("جدول ۱")
  expect(html).toContain(": داده‌ها")
  expect(html).toContain("Python")
  expect(html).toContain("E = mc")
  expect(html).toContain("fx-code-highlight")
  expect(html).toContain('class="fx-math fx-display-math fx-eq-end" dir="ltr"')
  expect(html).toContain('class="fx-eq-number">(۱)</span>')
  expect(html).not.toContain("<header><span>Python</span>")
  await expect(renderHtml({ ...input, children: [{ type: "component", name: "alert", key: "a", at, children: [text("at", "x")] }] }, { html: DEFAULT_HTML_OPTIONS })).rejects.toThrow("No HTML implementation for <alert>")
  if (process.env.FORMATEX_LOOK) fs.writeFileSync(path.resolve("../out/html-markdown.html"), html)
})

it("renders theorem, exercise, figure, grid and steps from their own files", async () => {
  const at = { file: "tags.md", line: 1, column: 1 }
  const text = (key: string, value: string): Node => ({ type: "text", key, value, at })
  const input = document()
  input.settings = { feel: "standard", dir: "rtl" }
  input.tokens = { bg: "#fff", fg: "#1c1917", muted: "#78716c", accent: "#2563eb", secondary: "#0f766e", heading: "#1c1917", rule: "#e7e5e4", "code-bg": "#f6f8fa", "code-stroke": "#d0d7de", radius: 6, dark: false }
  input.children = [
    { type: "component", name: "theorem", key: "th", at, props: { title: "فیثاغورس" }, children: [text("tht", "رابطه")] },
    { type: "component", name: "exercise", key: "ex", at, props: { points: 2 }, children: [
      text("ext", "سؤال"),
      { type: "component", name: "answer", key: "an", at, children: [text("ant", "جواب")] },
    ] },
    { type: "component", name: "fig", key: "fg", at, children: [
      { type: "component", name: "caption", key: "cap", at, children: [text("capt", "نما")] },
      { type: "image", key: "im", at, url: "pic.png", alt: "pic" },
    ] },
    { type: "component", name: "grid", key: "gd", at, props: { cols: 2 }, children: [
      { type: "component", name: "item", key: "it", at, children: [text("itt", "خانه")] },
    ] },
    { type: "component", name: "steps", key: "st", at, children: [
      { type: "component", name: "step", key: "s1", at, props: { title: "آغاز" }, children: [text("s1t", "کار")] },
    ] },
  ]
  const packages: Record<string, Record<string, string>> = {}
  for (const name of ["theorem", "exercise", "fig", "grid", "steps"]) {
    const directory = path.resolve("../formatex-core/components", name)
    packages[name] = Object.fromEntries(fs.readdirSync(directory).map(file => [file, fs.readFileSync(path.join(directory, file), "utf8")]))
  }
  const html = await renderHtml(input, { html: { ...DEFAULT_HTML_OPTIONS, toolbar: false }, ...componentCatalog(packages), uiLanguage: "fa", assets: { "pic.png": "data:image/png;base64,xx" } })
  expect(html).toContain("fx-theorem-boxed")
  expect(html).toContain("قضیه ۱")
  expect(html).toContain("(فیثاغورس)")
  expect(html).toContain("fx-exercise-standard")
  expect(html).toContain("تمرین ۱")
  expect(html).toContain("۲ نمره")
  expect(html).toContain("fx-exercise-answer")
  expect(html).toContain("fx-fig")
  expect(html).toContain("شکل ۱")
  expect(html).toContain('class="fx-grid"')
  expect(html).toContain("fx-steps-soft")
  expect(html).toContain("fx-step-mark")
  expect(html).toContain(">۱</span>")
  await expect(renderHtml({ ...input, children: [{ type: "component", name: "theorem", key: "th", at, children: [text("x", "x")] }] }, { html: DEFAULT_HTML_OPTIONS })).rejects.toThrow("No HTML implementation for <theorem>")
  if (process.env.FORMATEX_LOOK) fs.writeFileSync(path.resolve("../out/html-tags.html"), html)
})

it("opens a footnote above its number instead of listing notes at the end", async () => {
  const at = { file: "fn.md", line: 1, column: 1 }
  const text = (key: string, value: string): Node => ({ type: "text", key, value, at })
  const input = document()
  input.settings = { dir: "rtl" }
  input.tokens = { bg: "#fff", fg: "#1c1917", muted: "#78716c", accent: "#2563eb", secondary: "#0f766e", heading: "#1c1917", rule: "#e7e5e4", "code-bg": "#f6f8fa", "code-stroke": "#d0d7de", radius: 6, dark: false }
  input.children = [
    { type: "paragraph", key: "p", at, children: [
      text("w", "واژه"),
      { type: "footnoteReference", key: "r", at, identifier: "a" },
      text("gap", " و "),
      { type: "component", name: "fn", key: "f", at, props: { en: "Artificial Intelligence" }, children: [text("term", "هوش")] },
      text("tail", " در متن."),
    ] },
    { type: "footnoteDefinition", key: "d", at, identifier: "a", children: [{ type: "paragraph", key: "dp", at, children: [text("dt", "متن پاورقی")] }] },
  ]
  const fnDir = path.resolve("../formatex-core/components/footnotes")
  const fnCatalog = componentCatalog({ footnotes: Object.fromEntries(fs.readdirSync(fnDir).map(file => [file, fs.readFileSync(path.join(fnDir, file), "utf8")])) })
  const html = await renderHtml(input, { html: { ...DEFAULT_HTML_OPTIONS, toolbar: false, outline: false, progress: false }, ...fnCatalog, uiLanguage: "fa" })
  expect(html).toContain("واژه")
  expect(html).toContain('class="fx-fn-pop" role="note" dir="rtl"')
  expect(html).toContain("متن پاورقی")
  expect(html).toContain(">۱</button>")
  expect(html).toContain("هوش")
  expect(html).toContain('class="fx-fn-pop" role="note" dir="ltr"')
  expect(html).toContain("Artificial Intelligence")
  expect(html).toContain(">۲</button>")
  expect(html).toContain(".fx-fn:hover .fx-fn-pop")
  expect(html).not.toContain("doc-endnotes")
  expect(html).not.toContain("↩")
  if (process.env.FORMATEX_LOOK) fs.writeFileSync(path.resolve("../out/html-fn.html"), html)
})

it("renders compare, progress, chat, docheader and letter from their own packages with PDF parity", async () => {
  const at = { file: "five.md", line: 1, column: 1 }
  const text = (key: string, value: string): Node => ({ type: "text", key, value, at })
  const para = (key: string, value: string): Node => ({ type: "paragraph", key, at, children: [text(`${key}-t`, value)] })
  const input = document()
  input.settings = { feel: "formal", dir: "rtl", chat: { "user-name": "" } }
  input.tokens = {
    bg: "#fff", fg: "#1c1917", muted: "#78716c", accent: "#2563eb", secondary: "#0f766e",
    heading: "#1c1917", rule: "#e7e5e4", "code-bg": "#f6f8fa", "code-stroke": "#d0d7de",
    radius: 6, dark: false, "feel-name": "standard",
  }
  input.children = [
    {
      type: "component", name: "docheader", key: "dh1", at,
      props: { title: "سربرگ", subtitle: "زیرعنوان" },
      rich: { title: [text("dh1-t", "سربرگ")], subtitle: [text("dh1-s", "زیرعنوان")] },
    },
    {
      type: "component", name: "docheader", key: "dh2", at,
      props: { border: "lt", "border-color": "orange", fill: "true", color: "blue" },
      children: [
        { type: "component", name: "l-img", key: "li", at, props: { src: "logo.png", height: "2cm" } },
        { type: "component", name: "r-img", key: "ri", at, props: { src: "logo.png", height: "2cm" } },
        { type: "component", name: "title", key: "dt", at, props: { size: "2" }, children: [para("dtp", "عنوان")] },
        { type: "component", name: "info", key: "di", at, children: [para("dip", "توضیح")] },
      ],
    },
    {
      type: "component", name: "docheader", key: "dh3", at,
      props: { border: "lrtb" },
      children: [{ type: "component", name: "title", key: "dt3", at, children: [para("dt3p", "کامل")] }],
    },
    {
      type: "component", name: "progress", key: "pr1", at,
      children: [{
        type: "list", key: "pr1-l", at, ordered: false,
        children: [
          { type: "listItem", key: "pr1-1", at, children: [text("pr1-1t", "طراحی: 100")] },
          { type: "listItem", key: "pr1-2", at, children: [text("pr1-2t", "پیاده‌سازی: 70")] },
        ],
      }],
    },
    {
      type: "component", name: "progress", key: "pr2", at, props: { style: "stars" },
      children: [{
        type: "list", key: "pr2-l", at, ordered: false,
        children: [{ type: "listItem", key: "pr2-1", at, children: [text("pr2-1t", "امتیاز: 4.5")] }],
      }],
    },
    {
      type: "component", name: "progress", key: "pr3", at, props: { style: "dots", color: "teal", values: "false" },
      children: [{
        type: "list", key: "pr3-l", at, ordered: false,
        children: [{ type: "listItem", key: "pr3-1", at, children: [text("pr3-1t", "Python: 2.5")] }],
      }],
    },
    {
      type: "component", name: "progress", key: "pr4", at, props: { value: "62", color: "pink" },
      children: [para("pr4-p", "Overall")],
    },
    {
      type: "component", name: "compare", key: "cmp1", at,
      children: [
        { type: "component", name: "pros", key: "pro1", at, children: [{ type: "list", key: "pro1-l", at, ordered: false, children: [{ type: "listItem", key: "pro1-i", at, children: [text("pro1-it", "سریع")] }] }] },
        { type: "component", name: "cons", key: "con1", at, children: [{ type: "list", key: "con1-l", at, ordered: false, children: [{ type: "listItem", key: "con1-i", at, children: [text("con1-it", "پیچیده")] }] }] },
      ],
    },
    {
      type: "component", name: "compare", key: "cmp2", at, props: { dir: "ltr" },
      children: [
        { type: "component", name: "pros", key: "pro2", at, props: { color: "teal" }, children: [{ type: "list", key: "pro2-l", at, ordered: false, children: [{ type: "listItem", key: "pro2-i", at, children: [text("pro2-it", "Clean")] }] }] },
        { type: "component", name: "cons", key: "con2", at, children: [{ type: "list", key: "con2-l", at, ordered: false, children: [{ type: "listItem", key: "con2-i", at, children: [text("con2-it", "Manual")] }] }] },
      ],
    },
    {
      type: "component", name: "chat", key: "ch1", at, props: { title: "مرور ادبیات" },
      children: [
        { type: "component", name: "user", key: "u1", at, children: [para("u1-p", "از کجا شروع کنم؟")] },
        { type: "component", name: "ai", key: "a1", at, children: [para("a1-p", "گام اول.")] },
      ],
    },
    {
      type: "component", name: "chat", key: "ch2", at,
      props: { style: "bubbles", frame: "false", "user-color": "purple", "ai-color": "teal", dir: "ltr" },
      children: [
        { type: "component", name: "user", key: "u2", at, props: { name: "Ali" }, children: [para("u2-p", "Hi")] },
        { type: "component", name: "ai", key: "a2", at, children: [para("a2-p", "Hello")] },
      ],
    },
    {
      type: "component", name: "letter", key: "lt1", at,
      props: { logo: "logo.png", org: "دانشگاه", number: "۱۲", date: "۱۴۰۵", to: "مدیر", subject: "درخواست", signer: "دکتر احمدی", cc: "آموزش؛ بایگانی" },
      children: [para("lt1-p", "متن نامه")],
    },
    {
      type: "component", name: "letter", key: "lt2", at,
      props: { dir: "ltr", greeting: "", subject: "Notice", signer: "Team" },
      children: [para("lt2-p", "Body")],
    },
  ]
  const packages: Record<string, Record<string, string>> = {}
  for (const name of ["compare", "progress", "chat", "docheader", "letter"]) {
    const directory = path.resolve("../formatex-core/components", name)
    packages[name] = Object.fromEntries(fs.readdirSync(directory).map(file => [file, fs.readFileSync(path.join(directory, file), "utf8")]))
  }
  const catalog = componentCatalog(packages)
  const html = await renderHtml(input, { html: { ...DEFAULT_HTML_OPTIONS, toolbar: false, outline: false, progress: false }, ...catalog, uiLanguage: "fa", assets: { "logo.png": "data:image/png;base64,xx" } })

  expect(html).toContain('data-feel="standard"')
  // docheader: selective corner radii + ghost image balancer + no forced radius on open ends
  expect(html).toContain("fx-docheader-filled")
  expect(html).toContain("fx-docheader-ghost")
  expect(html).toContain("border-top-left-radius:var(--fx-radius-box);border-top-right-radius:0;border-bottom-left-radius:0;border-bottom-right-radius:0")
  expect(html).toContain("border-top-left-radius:var(--fx-radius-box);border-top-right-radius:var(--fx-radius-box);border-bottom-left-radius:var(--fx-radius-box);border-bottom-right-radius:var(--fx-radius-box)")
  // progress: bar %, stars RTL clip-path & Persian digits, dots without values
  expect(html).toContain("fx-progress-mode-bar")
  expect(html).toContain("۷۰٪")
  expect(html).toContain("fx-progress-mode-stars")
  expect(html).toContain("۴٫۵ از ۵")
  expect(html).toContain("clip-path:inset(0 0 0 50%)")
  expect(html).toContain("fx-progress-mode-dots")
  expect(html).toContain("fx-progress-dot-on")
  expect(html).toContain("۶۲٪")
  // compare: default Persian/English titles and check/circle marks
  expect(html).toContain("fx-compare-pros")
  expect(html).toContain("مزایا")
  expect(html).toContain("معایب")
  expect(html).not.toContain("محدودیت‌ها")
  expect(html).toContain("Pros")
  expect(html).toContain("Cons")
  expect(html).toContain("fx-compare-mark-plain")
  expect(html).toContain("fx-compare-mark-circle")
  // chat: auto + bubbles + framed + frameless + speakers
  expect(html).toContain("fx-chat-auto fx-chat-framed")
  expect(html).toContain("مرور ادبیات")
  expect(html).toContain("هوش مصنوعی")
  expect(html).toContain("fx-chat-bubbles fx-chat-frameless")
  // letter: default greeting, no forced بسمه تعالی when heading omitted, explicit greeting="" removed, cc dash list
  expect(html).toContain("با سلام و احترام،")
  expect(html).not.toContain("بسمه تعالی")
  expect(html).toContain("fx-letter-cc-dash")
  expect(html).toContain("آموزش")
  expect(html).toContain("بایگانی")
  expect(html.match(/class="fx-letter-greeting"/g)?.length).toBe(1)

  for (const tag of ["compare", "progress", "chat", "docheader", "letter"]) {
    await expect(renderHtml({ ...input, children: [{ type: "component", name: tag, key: `bare-${tag}`, at }] }, { html: DEFAULT_HTML_OPTIONS })).rejects.toThrow(`No HTML implementation for <${tag}>`)
  }
})

it("renders picheader, cover, tree, todo and diff from their own packages and updates letter header layout", async () => {
  const at = { file: "next5.md", line: 1, column: 1 }
  const text = (key: string, value: string): Node => ({ type: "text", key, value, at })
  const para = (key: string, value: string): Node => ({ type: "paragraph", key, at, children: [text(`${key}-t`, value)] })
  const input = document()
  input.settings = { feel: "standard", dir: "rtl" }
  input.tokens = {
    bg: "#fff", fg: "#1c1917", muted: "#78716c", accent: "#2563eb", secondary: "#0f766e",
    heading: "#1c1917", rule: "#e7e5e4", "code-bg": "#f6f8fa", "code-stroke": "#d0d7de",
    radius: 6, dark: false, "feel-name": "standard",
  }
  input.children = [
    {
      type: "component", name: "cover", key: "cv1", at,
      props: { frame: "true", logo: "logo.png", institution: "دانشگاه نمونه", title: "معماری رندر", author: "علی", date: "۱۴۰۵" },
      children: [para("cv1-p", "توضیح جلد")],
    },
    {
      type: "component", name: "letter", key: "lt-h", at,
      props: { heading: "بسمه تعالی", org: "دانشگاه نمونه", number: "۱۲", date: "۱۴۰۵", to: "مدیر", subject: "موضوع", signer: "احمدی" },
      children: [para("lt-hp", "متن نامه")],
    },
    {
      type: "component", name: "picheader", key: "ph1", at,
      props: { src: "banner.jpg", title: "سربرگ تصویری", subtitle: "زیرعنوان", height: "55mm", "margin-x": "false" },
    },
    {
      type: "component", name: "tree", key: "tr1", at,
      props: { caption: "درخت پروژه" },
      children: [{ type: "code", key: "tr1-c", at, value: "root/\n  src/\n    main.ts  # نقطه ورود\n  README.md" }],
    },
    {
      type: "paragraph", key: "p-inline", at,
      children: [
        text("p1", "این "),
        { type: "component", name: "todo", key: "td1", at, props: { author: "علی" }, children: [text("td1-t", "بررسی شود")] },
        text("p2", " و "),
        { type: "component", name: "del", key: "dl1", at, children: [text("dl1-t", "قدیمی")] },
        text("p3", " "),
        { type: "component", name: "ins", key: "in1", at, children: [text("in1-t", "جدید")] },
      ],
    },
    {
      type: "component", name: "todo", key: "td2", at,
      children: [para("td2-p", "پاراگراف یادداشت")],
    },
    {
      type: "component", name: "todo", key: "td3", at,
      props: { type: "figure", height: "90" },
      children: [text("td3-t", "شکل موقت")],
    },
    { type: "component", name: "todos", key: "tds", at },
    {
      type: "component", name: "diff", key: "df1", at,
      props: { caption: "مقایسه کد", dir: "rtl" },
      children: [
        { type: "component", name: "before", key: "df1-b", at, children: [{ type: "code", key: "df1-bc", at, lang: "python", value: "a = 1\nb = 2" }] },
        { type: "component", name: "after", key: "df1-a", at, children: [{ type: "code", key: "df1-ac", at, lang: "python", value: "a = 1\nb = 3\nc = 4" }] },
      ],
    },
    {
      type: "component", name: "diff", key: "df2", at,
      props: { mode: "unified" },
      children: [
        { type: "component", name: "old", key: "df2-o", at, children: [{ type: "code", key: "df2-oc", at, lang: "ts", value: "const x = 1" }] },
        { type: "component", name: "new", key: "df2-n", at, children: [{ type: "code", key: "df2-nc", at, lang: "ts", value: "const x = 2" }] },
      ],
    },
  ]

  const packages: Record<string, Record<string, string>> = {}
  for (const name of ["picheader", "cover", "tree", "todo", "diff", "letter"]) {
    const directory = path.resolve("../formatex-core/components", name)
    packages[name] = Object.fromEntries(fs.readdirSync(directory).map(file => [file, fs.readFileSync(path.join(directory, file), "utf8")]))
  }
  const catalog = componentCatalog(packages)
  const html = await renderHtml(input, { html: { ...DEFAULT_HTML_OPTIONS, toolbar: false, outline: false, progress: false }, ...catalog, uiLanguage: "fa", assets: { "logo.png": "data:image/png;base64,xx", "banner.jpg": "data:image/jpeg;base64,yy" } })

  expect(html).toContain("fx-cover fx-cover-frame")
  expect(html).toContain("معماری رندر")
  expect(html).not.toContain("استاد راهنما")
  expect(html).toContain("نگارش:")
  expect(html.indexOf('class="fx-letter-heading"')).toBeGreaterThan(-1)
  expect(html.indexOf('class="fx-letter-heading"')).toBeLessThan(html.indexOf('class="fx-letter-header"'))
  expect(html).toContain("fx-picheader fx-picheader-bleed")
  expect(html).toContain("fx-picheader-scrim")
  expect(html).toContain("fx-tree-figure")
  expect(html).toContain("شکل ۱")
  expect(html).toContain("نقطه ورود")
  expect(html).toContain("fx-todo-inline")
  expect(html).toContain("fx-todo-block")
  expect(html).toContain("fx-todo-figure")
  expect(html).toContain("min-height:9em")
  expect(html).toContain("کارهای باقی‌مانده")
  expect(html).toContain("fx-todos-list")
  expect(html).toContain("fx-diff-del")
  expect(html).toContain("fx-diff-ins")
  expect(html).toContain("fx-diff-grid fx-diff-split")
  expect(html).toContain("--fx-diff-num-w:")
  expect(html).toContain("fx-diff-empty")
  expect(html).toContain("نسخه قبل")
  expect(html).toContain("نسخه بعد")
  expect(html).toContain("تغییرات ۱")
  expect(html).toContain("fx-diff-grid fx-diff-unified")
  expect(html).toContain("fx-diff-lang")
  expect(html).toContain("TypeScript")
  expect(html).toContain('data-fa="\ue840"')

  const hidden = document()
  hidden.settings = { dir: "rtl", todo: "hide" }
  hidden.tokens = input.tokens
  hidden.children = [
    para("hp", "متن"),
    { type: "component", name: "todo", key: "htd", at, children: [text("htd-t", "باید پنهان شود")] },
    { type: "component", name: "todos", key: "htds", at },
  ]
  const hiddenHtml = await renderHtml(hidden, { html: { ...DEFAULT_HTML_OPTIONS, toolbar: false, outline: false, progress: false }, ...catalog, uiLanguage: "fa" })
  expect(hiddenHtml).not.toContain("باید پنهان شود")
  expect(hiddenHtml).not.toContain("کارهای باقی‌مانده")

  for (const tag of ["picheader", "cover", "tree", "todo", "todos", "diff", "del", "ins"]) {
    await expect(renderHtml({ ...input, children: [{ type: "component", name: tag, key: `bare-${tag}`, at }] }, { html: DEFAULT_HTML_OPTIONS })).rejects.toThrow(`No HTML implementation for <${tag}>`)
  }
})

it("renders chart, cetz, lilaq, typ and internal from their own packages with PDF parity", async () => {
  const at = { file: "cat3.md", line: 1, column: 1 }
  const text = (key: string, value: string): Node => ({ type: "text", key, value, at })
  const cell = (key: string, value: string): Node => ({ type: "tableCell", key, at, children: [text(`${key}-t`, value)] })
  const row = (key: string, values: string[]): Node => ({ type: "tableRow", key, at, children: values.map((v, i) => cell(`${key}-${i}`, v)) })
  const input = document()
  input.settings = { feel: "standard", dir: "rtl" }
  input.tokens = {
    bg: "#fff", fg: "#1c1917", muted: "#78716c", accent: "#2563eb", secondary: "#0f766e",
    heading: "#1c1917", rule: "#e7e5e4", "code-bg": "#f6f8fa", "code-stroke": "#d0d7de",
    radius: 6, dark: false, "feel-name": "standard",
  }
  input.children = [
    {
      type: "component", name: "cetz", key: "cz-solo", at,
      children: [{ type: "code", key: "cz-c", at, lang: "typ", value: "circle((0, 0), radius: 1)" }],
    },
    {
      type: "component", name: "fig", key: "fg-lq", at, props: { id: "fig-lq", width: "80%" },
      children: [
        { type: "component", name: "lilaq", key: "lq1", at, children: [{ type: "code", key: "lq-c", at, lang: "typ", value: "lq.diagram()" }] },
        { type: "component", name: "caption", key: "lq-cap", at, children: [text("lq-capt", "نمودار لیلاک")] },
      ],
    },
    {
      type: "component", name: "chart", key: "ch-bar", at,
      props: { caption: "ورودی‌ها", "y-title": "نفر", values: "true" },
      children: [{
        type: "table", key: "ch-bar-t", at,
        children: [
          row("r0", ["رشته", "۱۴۰۳", "۱۴۰۴"]),
          row("r1", ["کامپیوتر", "۱۲۰", "۱۵۰"]),
          row("r2", ["برق", "۹۰", "۹۵"]),
        ],
      }],
    },
    {
      type: "component", name: "chart", key: "ch-line", at,
      props: { type: "line", caption: "دقت مدل", "x-title": "دوره", unit: "%", values: "true" },
      children: [{
        type: "table", key: "ch-line-t", at,
        children: [
          row("lr0", ["دوره", "آموزش", "تست"]),
          row("lr1", ["۱", "۶۰", "۵۵"]),
          row("lr2", ["۲", "۸۰", "۷۵"]),
        ],
      }],
    },
    {
      type: "component", name: "chart", key: "ch-donut", at,
      props: { type: "donut", caption: "Time spent", values: "true", unit: "h", dir: "ltr" },
      children: [{
        type: "table", key: "ch-donut-t", at,
        children: [
          row("dr0", ["Task", "Hours"]),
          row("dr1", ["Coding", "14"]),
          row("dr2", ["Writing", "6"]),
        ],
      }],
    },
    {
      type: "component", name: "typ", key: "tp1", at,
      children: [{ type: "code", key: "tp1-c", at, lang: "typ", value: "== تیتر" }],
    },
    {
      type: "component", name: "listpages", key: "lp1", at,
      children: [{ type: "paragraph", key: "lp1-p", at, children: [text("lp1-t", "فهرست تک‌ستونی")] }],
    },
  ]

  const packages: Record<string, Record<string, string>> = {}
  for (const name of ["chart", "cetz", "lilaq", "typ", "internal", "fig"]) {
    const directory = path.resolve("../formatex-core/components", name)
    packages[name] = Object.fromEntries(fs.readdirSync(directory).map(file => [file, fs.readFileSync(path.join(directory, file), "utf8")]))
  }
  const catalog = componentCatalog(packages)
  const html = await renderHtml(input, {
    html: { ...DEFAULT_HTML_OPTIONS, toolbar: false, outline: false, progress: false },
    ...catalog,
    uiLanguage: "fa",
    assets: {
      "cz-solo:body": '<svg viewBox="0 0 40 40"></svg>',
      "lq1:body": '<svg viewBox="0 0 100 50"></svg>',
      "tp1:body": '<svg viewBox="0 0 200 30"></svg>',
    },
  })

  // Standalone <cetz> must NOT steal a figure number; <fig> gets شکل ۱, <chart> gets شکل ۲, شکل ۳, Figure 4
  expect(html).toContain('class="fx-cetz"')
  expect(html).toContain('class="fx-lilaq"')
  expect(html).toContain("--fx-fig-w:80%")
  expect(html).toContain('<span class="fx-fig-number">شکل ۱</span>: نمودار لیلاک')
  expect(html).toContain("fx-chart-svg-cartesian")
  expect(html).toContain('<span class="fx-fig-number">شکل ۲</span>: ورودی‌ها')
  expect(html).toContain('<span class="fx-fig-number">شکل ۳</span>: دقت مدل')
  expect(html).toContain("fx-chart-svg-round")
  expect(html).toContain("fx-chart-donut-total")
  expect(html).toContain("20h")
  expect(html).toContain('<span class="fx-fig-number">Figure 4</span>: Time spent')
  expect(html).toContain('class="fx-typ"')
  expect(html).toContain('class="fx-listpages"')

  const badInclude = document()
  badInclude.children = [{ type: "component", name: "include", key: "inc", at, props: { src: "part.md" } }]
  await expect(renderHtml(badInclude, { html: DEFAULT_HTML_OPTIONS, ...catalog })).rejects.toThrow('<include src="part.md"> must stand alone on its own line')

  for (const tag of ["chart", "cetz", "lilaq", "typ", "listpages", "include"]) {
    await expect(renderHtml({ ...input, children: [{ type: "component", name: tag, key: `bare-${tag}`, at }] }, { html: DEFAULT_HTML_OPTIONS })).rejects.toThrow(`No HTML implementation for <${tag}>`)
  }
})

it("renders toc, figure-lists, align, dir, div, paragraph, space, links, footnotes and lists from their own packages", async () => {
  const at = { file: "batch.md", line: 1, column: 1 }
  const text = (key: string, value: string): Node => ({ type: "text", key, value, at })
  const para = (key: string, value: string): Node => ({ type: "paragraph", key, at, children: [text(`${key}-t`, value)] })
  const cell = (key: string, value: string): Node => ({ type: "tableCell", key, at, children: [text(`${key}-t`, value)] })
  const row = (key: string, values: string[]): Node => ({ type: "tableRow", key, at, children: values.map((v, i) => cell(`${key}-${i}`, v)) })
  const input = document()
  input.settings = { feel: "standard", dir: "rtl", heading: { numbering: true }, table: { numbering: true }, code: { numbering: true } }
  input.tokens = {
    bg: "#fff", fg: "#1c1917", muted: "#78716c", accent: "#2563eb", secondary: "#0f766e",
    heading: "#1c1917", rule: "#e7e5e4", "code-bg": "#f6f8fa", "code-stroke": "#d0d7de",
    radius: 6, dark: false, "feel-name": "standard",
  }
  input.children = [
    { type: "component", name: "toc", key: "t1", at, props: { depth: 2, numbers: "rtl" } },
    { type: "component", name: "lof", key: "lf", at },
    { type: "component", name: "lot", key: "lt", at },
    { type: "component", name: "lol", key: "lc", at },
    { type: "heading", depth: 2, key: "h1", at, props: { id: "sec-1" }, children: [text("h1t", "فصل اول")] },
    { type: "heading", depth: 3, key: "h2", at, props: { id: "sec-1-1" }, children: [text("h2t", "زیرفصل")] },
    { type: "heading", depth: 4, key: "h3", at, props: { id: "sec-1-1-1" }, children: [text("h3t", "عمیق‌تر")] },
    {
      type: "component", name: "fig", key: "fg1", at, props: { id: "fig-1" },
      children: [
        { type: "image", key: "im1", at, url: "pic.png", alt: "pic" },
        { type: "component", name: "caption", key: "fg1-c", at, children: [text("fg1-ct", "تصویر نمونه")] },
      ],
    },
    {
      type: "table", key: "tb1", at, props: { id: "tbl-1", caption: "جدول نمونه" },
      children: [row("r0", ["ستون", "مقدار"]), row("r1", ["الف", "۱"])],
    },
    { type: "code", key: "cd1", at, lang: "python", value: "x = 1", props: { id: "code-1", caption: "کد نمونه" } },
    { type: "component", name: "align", key: "al1", at, props: { center: true }, children: [para("al1-p", "وسط‌چین")] },
    { type: "component", name: "dir", key: "dr1", at, props: { ltr: true }, children: [para("dr1-p", "Left to right")] },
    { type: "component", name: "div", key: "dv1", at, props: { tailwind: "flex gap-4 rounded-lg bg-blue-100 p-2" }, children: [para("dv1-p", "جعبه")] },
    {
      type: "component", name: "p", key: "pr1", at,
      props: { font: "Vazirmatn", size: "14pt", weight: "bold", color: "accent", justify: "true", "line-spacing": "150", "letter-spacing": "2", "word-spacing": "120", indent: "1.5em", above: "1em", below: "2em" },
      children: [para("pr1-p", "پاراگراف سفارشی")],
    },
    { type: "component", name: "v", key: "sp1", at, props: { size: "2cm", weak: "true" } },
    { type: "component", name: "pagebreak", key: "pb1", at, props: { to: "even" } },
    {
      type: "paragraph", key: "p-links", at,
      children: [
        { type: "component", name: "a", key: "a-ext", at, props: { href: "https://example.com" }, children: [text("a-et", "پیوند بیرونی")] },
        text("sp-a", " "),
        { type: "component", name: "a", key: "a-int", at, props: { href: "#sec-1" }, children: [text("a-it", "پیوند داخلی")] },
        text("sp-b", " "),
        { type: "component", name: "span", key: "sp-hl", at, props: { id: "hl-id", highlight: "teal" }, children: [text("sp-ht", "برجسته")] },
        text("sp-c", " "),
        { type: "component", name: "anchor", key: "anc-hl", at, props: { id: "anc-id", highlight: "true" }, children: [text("anc-ht", "لنگر")] },
        text("sp-d", " "),
        { type: "component", name: "fn", key: "fn-1", at, props: { en: "Note" }, children: [text("fn-1t", "واژه")] },
      ],
    },
    { type: "list", key: "ls1-l", at, ordered: false, props: { guides: "tree" }, children: [{ type: "listItem", key: "ls1-i", at, children: [text("ls1-it", "آیتم"), { type: "list", key: "ls1-sub", at, ordered: false, children: [{ type: "listItem", key: "ls1-si", at, children: [text("ls1-sit", "زیرآیتم")] }] }] }] },
  ]

  const packages: Record<string, Record<string, string>> = {}
  for (const name of ["toc", "figure-lists", "align", "dir", "div", "paragraph", "space", "links", "footnotes", "lists", "fig"]) {
    const directory = path.resolve("../formatex-core/components", name)
    packages[name] = Object.fromEntries(fs.readdirSync(directory).map(file => [file, fs.readFileSync(path.join(directory, file), "utf8")]))
  }
  const catalog = componentCatalog(packages)
  const html = await renderHtml(input, {
    html: { ...DEFAULT_HTML_OPTIONS, toolbar: false, outline: false, progress: false },
    ...catalog,
    uiLanguage: "fa",
    assets: { "pic.png": "data:image/png;base64,xx" },
  })

  // toc & figure-lists
  expect(html).toContain("فهرست مطالب")
  expect(html).toContain("fx-toc-leader")
  expect(html).toContain(">۱</span>")
  expect(html).toContain(">۱.۱</span>")
  expect(html).not.toContain("عمیق‌تر</a>")
  expect(html).toContain("فهرست شکل‌ها")
  expect(html).toContain("شکل ۱")
  expect(html).toContain("تصویر نمونه")
  expect(html).toContain("فهرست جدول‌ها")
  expect(html).toContain("جدول ۱")
  expect(html).toContain("فهرست کدها")
  expect(html).toContain("کد ۱")
  // align, dir, div, paragraph, space, links, footnotes, lists
  expect(html).toContain("fx-align fx-align-center")
  expect(html).toContain('class="fx-dir fx-dir-ltr"')
  expect(html).toContain("fx-div flex gap-4 rounded-lg bg-blue-100 p-2")
  expect(html).toContain(".bg-blue-100")
  expect(html).toContain("font-family:Vazirmatn;font-size:1.4em;font-weight:700;color:var(--accent);text-align:justify;text-indent:1.5em;margin-block-start:1em;margin-block-end:2em;line-height:1.63;letter-spacing:0.02em;word-spacing:20%")
  expect(html).toContain("fx-space fx-space-weak")
  expect(html).toContain("height:2cm")
  expect(html).toContain("fx-pagebreak fx-pagebreak-even")
  expect(html).toContain("fx-link fx-link-external")
  expect(html).toContain('href="#sec-1"')
  expect(html).toContain("fx-mark")
  expect(html).toContain('class="fx-fn-pop" role="note" dir="ltr">Note</span>')
  expect(html).toContain("fx-list fx-guides-tree")
  expect(html).not.toContain('class="fx-list fx-guides-none"')
  expect(html).toContain("آیتم")

  for (const tag of ["toc", "lof", "lot", "lol", "align", "dir", "div", "p", "v", "pagebreak", "a", "span", "anchor", "fn", "footnote"]) {
    await expect(renderHtml({ ...input, children: [{ type: "component", name: tag, key: `bare-${tag}`, at }] }, { html: DEFAULT_HTML_OPTIONS })).rejects.toThrow(`No HTML implementation for <${tag}>`)
  }
})

it("renders hr, icon, img, ref, def, counter, digit, and citations via custom package TSX/CSS", async () => {
  const input = document()
  const at = { file: "main.md", line: 1, column: 1 }
  const text = (key: string, value: string) => ({ type: "text" as const, key, at, value })
  const para = (key: string, value: string) => ({ type: "paragraph" as const, key, at, children: [text(`${key}-t`, value)] })
  input.settings.dir = "rtl"
  input.settings.language = "fa"
  input.settings.counters = {
    ex: { levels: 2, format: "fa,abc", label: "تمرین %1-%2" },
  }
  input.settings.bibliography = { file: "refs.bib", title: "مراجع", dir: "auto" }
  input.children = [
    { type: "component", name: "hr", key: "hr1", at, props: { style: "dashed", color: "accent", width: "60%", thickness: "2pt" } },
    { type: "component", name: "hr", key: "hr2", at, props: { style: "wavy", color: "teal" } },
    { type: "component", name: "hr", key: "hr3", at, props: { style: "dash-dot", color: "#2563eb" } },
    {
      type: "paragraph", key: "p-ic", at,
      children: [
        { type: "component", name: "icon", key: "ic1", at, props: { name: "check", color: "green", size: "1.2em", solid: "true" } },
        text("ic-sp", " "),
        { type: "component", name: "digit", key: "dg1", at, props: { type: "fa" }, children: [text("dg1-t", "سال 2026 و عدد 123")] },
      ],
    },
    { type: "component", name: "fig", key: "fg-ref", at, props: { id: "fig-1", numbering: true }, children: [{ type: "component", name: "img", key: "im1", at, props: { src: "a.png", alt: "A", width: "50%", radius: "12px", span: "all" } }, { type: "component", name: "caption", key: "fg-cap", at, children: [text("fg-ct", "نمودار")] }] },
    {
      type: "paragraph", key: "p-ref", at,
      children: [
        { type: "component", name: "ref", key: "rf1", at, props: { to: "fig-1" } },
        text("rf-sp", " و "),
        { type: "component", name: "def", key: "df1", at, props: { id: "fig-1", color: "teal" }, children: [text("df1-t", "توضیح شکل")] },
        text("df-sp", " و "),
        { type: "component", name: "cite", key: "ct1", at, props: { key: "knuth84", page: "12" } },
      ],
    },
    { type: "component", name: "def", key: "df2", at, props: { id: "fig-1", mode: "block", title: "تعریف بلوکی" }, children: [para("df2-p", "متن تعریف بلوکی")] },
    {
      type: "paragraph", key: "p-cnt", at,
      children: [
        { type: "component", name: "counter", key: "cnt1", at, props: { of: "ex", level: "1" } },
        text("cnt-sp", " / "),
        { type: "component", name: "counter", key: "cnt2", at, props: { of: "ex", level: "2" } },
        text("cnt-sp2", " / "),
        { type: "component", name: "counter", key: "cnt3", at, props: { of: "abj", format: "abjad", set: "3" } },
      ],
    },
    { type: "component", name: "bibliography", key: "bib1", at, props: { file: "refs.bib" } },
  ]

  const packages: Record<string, Record<string, string>> = {}
  for (const name of ["hr", "icon", "img", "ref", "def", "counter", "digit", "citations", "fig"]) {
    const directory = path.resolve("../formatex-core/components", name)
    packages[name] = Object.fromEntries(fs.readdirSync(directory).map(file => [file, fs.readFileSync(path.join(directory, file), "utf8")]))
  }
  const catalog = componentCatalog(packages)
  const html = await renderHtml(input, {
    html: { ...DEFAULT_HTML_OPTIONS, toolbar: false, outline: false, progress: false },
    ...catalog,
    uiLanguage: "fa",
    assets: {
      "a.png": "data:image/png;base64,xx",
      "text:refs.bib": `@book{knuth84, author={Donald E. Knuth}, title={The TeXbook}, publisher={Addison-Wesley}, year={1984}}`,
    },
  })

  expect(html).toContain("fx-hr-wrap")
  expect(html).toContain("fx-hr-wavy")
  expect(html).toContain("stroke-dasharray=\"8 4 2 4\"")
  expect(html).toContain("fx-icon-svg fx-icon-solid")
  expect(html).toContain("سال ۲۰۲۶ و عدد ۱۲۳")
  expect(html).toContain("fx-image fx-image-span-all")
  expect(html).toContain("border-radius:12px")
  expect(html).toContain('class="fx-ref" href="#fig-1">شکل ۱</a>')
  expect(html).toContain("fx-def-inline")
  expect(html).toContain("توضیح شکل")
  expect(html).toContain("fx-def-block")
  expect(html).toContain("تعریف بلوکی")
  expect(html).toContain("تمرین ۱-0")
  expect(html).toContain("تمرین ۱-a")
  expect(html).toContain(">ج</span>")
  expect(html).toContain('class="fx-cite" href="#bib-knuth84">[۱, 12]</a>')
  expect(html).toContain("fx-bibliography")
  expect(html).toContain("Donald E. Knuth")
  expect(html).toContain("The TeXbook")

  for (const tag of ["hr", "icon", "img", "ref", "def", "counter", "digit", "cite", "bibliography"]) {
    await expect(renderHtml({ ...input, children: [{ type: "component", name: tag, key: `bare-${tag}`, at }] }, { html: DEFAULT_HTML_OPTIONS })).rejects.toThrow(`No HTML implementation for <${tag}>`)
  }
})

it("supports tag-to-component dictionary exports in html.tsx alongside single default functions", async () => {
  const input = document()
  const at = { file: "main.md", line: 1, column: 1 }
  input.children = [
    {
      type: "component", name: "card", key: "c1", at,
      children: [{ type: "component", name: "card-head", key: "ch1", at, children: [{ type: "text", key: "t1", at, value: "Title" }] }],
    },
  ]
  const html = await renderHtml(input, {
    html: { ...DEFAULT_HTML_OPTIONS, toolbar: false, outline: false, progress: false },
    components: {
      card: `function Card({ node, context }) { return <section className="fx-card">{context.children(node)}</section> }\nfunction Head({ node, context }) { return <header className="fx-card-head">{context.children(node)}</header> }\nexport default { card: Card, "card-head": Head }`,
      "card-head": `function Card({ node, context }) { return <section className="fx-card">{context.children(node)}</section> }\nfunction Head({ node, context }) { return <header className="fx-card-head">{context.children(node)}</header> }\nexport default { card: Card, "card-head": Head }`,
    },
  })
  expect(html).toContain('<section class="fx-card"><header class="fx-card-head">Title</header></section>')
})
