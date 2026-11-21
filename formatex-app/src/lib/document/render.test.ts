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
  const html = await renderHtml(input,{html:{...DEFAULT_HTML_OPTIONS,toolbar:false},nativeFonts:true})
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
  const html=await renderHtml(input,{html:DEFAULT_HTML_OPTIONS})
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
  expect(html).toContain("--fx-radius-alert: 0.8em")
  expect(html).toContain("--fx-radius-box: 0.6em")
  expect(html).toContain("--fx-radius-kbd: 0.4em")
  expect(html).toContain("padding: 1.2em")
  expect(html).toContain("padding: 0.8em")
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
  expect(html).toContain('class="fx-code-badge"')
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
  const html = await renderHtml(input, { html: { ...DEFAULT_HTML_OPTIONS, toolbar: false, outline: false, progress: false }, uiLanguage: "fa" })
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
  const html = await renderHtml(input, { html: { ...DEFAULT_HTML_OPTIONS, toolbar: false, outline: false, progress: false }, uiLanguage: "fa" })
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
