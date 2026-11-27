---
name: bilingual-document-authoring
description: Writes Markdown documents (and their config.toml settings) for a bilingual Persian/English document template that turns Markdown plus HTML-like components into a typeset PDF. Covers front matter (header, footer, bibliography), standalone cover tags, headings, lists, tables, math, figures, Mermaid diagrams, file trees, data charts, alerts, boxes, grids, steps, AI chat transcripts, code listings, citations, cross-references and theorem blocks. Use when asked to write, convert, translate or restructure a document, paper, report, thesis or notes into this template's Markdown format, or to choose its config settings.
---

# Writing documents for the bilingual Markdown template

You produce **content only**: one Markdown file (with a YAML front matter block at the top) and, when asked, a `config.toml`. Someone else compiles them into a PDF. You never need to know or touch how the template works inside.

## Renderer checkpoint, 2026-11-12

Markdown/tags/`{ ... }`/`{{ ... }}` remain the document language. The normal standalone PDF path now runs shared Typst preparation, an embedded Rust/WASM pulldown-cmark parser and direct IR rendering, without a JavaScript Markdown parser or cmarker parse. Shared component source folders belong to core and contain `manifest.toml`, `schema.json`, `docs.json`, `typst.typ`, `html.tsx` and `html.css`; the standalone engine tree is generated.

Nine Rust parser tests pass, including Unicode/source spans, Persian/Arabic list restarts and rich/fenced-code properties. Frontend integration: 373 passed; native: 66 passed/5 ignored; typecheck and production build pass, with nine existing lint warnings. The 24 PDF theme/feel builds plus mobile compile, selected PDF visual checks, 360/768/1280 px browser checks and isolated one-file/custom-package/relocated standalone tools are verified. Complete component-property parity, full map/diagnostic/export coverage and real Android native interactive UI remain separate gates. HTML content is static SSR with a hydrated React viewer shell; arbitrary component events/state and live variable/DSL reactivity are not implemented. See [the active plan](../../../formatex-app/docs/tasks/shared-core-pdf-html-plan.md).

Regression checkpoint (2026-11-12): paired custom references, semantic `[@key]` citations outside code/math, explicit ordered-marker restarts, nested PDF div/flex and lexical inline reference/definition direction are corrected. Parser regression suite: 11 passed; native direction regression and full-demo visual compilation pass without convergence warnings. The preceding full migration gate counts above are historical; current gates pass: parser 11, native 68/five ignored, frontend 372/two skipped plus one opt-in real integration, typecheck and build (existing bundle-size warnings). The final CLI matrix passes 25 cases (24 desktop theme/feel plus `mobile-20-9`) without warnings; inspected mobile cards/pills have equal widths. This checks page format, not real Android interaction. Standalone/app sync succeeds: 43 packages/78 tags. For an English section inside forced RTL, use `<dir ltr>` or `<dir to="ltr">` explicitly.

Files in this skill:
- [components.md](components.md): every component (tag) with all attributes. Read it before using a tag.
- [config.md](config.md): every setting in `config.toml` and in the front matter.
- [example.md](example.md): a complete sample document and a complete `config.toml`.

## What the template gives you

- Standard Markdown: headings, bold, italic, lists, quotes, links, inline code, fenced code blocks, tables, `---` rules, LaTeX math (`$...$`, `$$...$$`) and Typst math (`%...%`, `%%...%%`).
- PDF preview clicks on a horizontal rule reveal its own `---` source line, and list word clicks preserve their source offsets after the first word. Preview-only mapping needs no extra author markup.
- Lists with Persian digits (`۱.`), Persian words, abjad / alphabet letters or Roman numerals, set for every list in `[list]` or for one list with a `{...}` line; a list can get a numbered caption («فهرست ۱») and be referenced. Task lists (`[ ]` / `[x]` / `[X]` or `- [ ]` / `- [x]`) support arbitrary nesting, optional progress bars, feel-matched vector checkboxes in PDF, and interactive animated checkboxes in HTML.
- Mermaid diagrams: a ` ```mermaid ` fenced block is drawn as a diagram in the theme's colors.
- Automatic text direction: Persian is right-to-left, English left-to-right, per paragraph. A `dir` setting or a `<dir>` tag can force one direction instead.
- Automatic numbering of headings, figures, tables, captioned lists, equations, code listings and theorems, in Persian or Latin digits to match the text.
- HTML-like components for figures, drawings, file trees, charts, callouts, boxes, layout, steps, conversations with an AI assistant, code listings, citations, references and theorem blocks.
- A page header, footer and bibliography configured in front matter, and a standalone `<cover>` block placed in the body.
- Experimental HTML output uses the same document. Its controls can use `--input html-ui-lang=fa|en` independently of the document's language and direction; the app supplies its interface language. See [config.md](config.md#html-output-language).
- HTML math supports `[html] math = "katex"` (default) or `"native"`, and reading width supports `[html] width = "standard"` (default; `"narrow"`, `"standard"`, `"wide"`). KaTeX's rendered HTML, CSS and fonts are embedded offline only when formulas need them; no CDN is required. Charts and drawings may retain Typst SVG output.
- Live HTML preview in the app reuses compilation/font data and updates its existing page when possible. Author the same Markdown, tags and settings for preview and export; standalone export still embeds font subsets when enabled.
- Native HTML honors merged document direction, paragraph spacing/justification, table row alignment, heading look relative to the top outlined heading, and global/local list numbering and markers. List guide drawings remain PDF-only. See [config.md](config.md#html-output-language).
- Text and structural tags use native HTML with their existing attributes, including cover, docheader, paragraph, letter, tree, exercise/answers, todos, layout, chat, comparison, diff, definitions and progress. Code retains line numbers and highlighted rows. Charts, CeTZ, Lilaq and arbitrary Typst drawings may remain SVG graphics.
- With the HTML toolbar on, its magnifier and Ctrl / Cmd + F open the viewer's literal, case-insensitive Find panel (previous/next and localized count, including on phones). It searches rendered document text, separately from source-editor find/replace.
- `[html] magnifier = true` (default) adds a magnifying glass (loupe) toggle button to the HTML viewer toolbar (`Shift`/`Alt` + mouse wheel adjusts lens zoom, `Esc` closes); set `false` to hide it.

## Workflow

1. Decide the document's main language. Write the front matter first (see the skeleton below).
2. Write the body with plain Markdown. Use a component **only when plain Markdown can't express it**: a numbered figure, a callout, side-by-side layout, a citation, a cross-reference, a theorem. Don't decorate for the sake of it.
3. Give an id to everything you reference later, and reference it with `<ref>`.
4. Check the result against the rules below and the checklist at the end.

## Skeleton

```markdown
---
typ:
  header:
    style: line
    start: "عنوان کوتاه سند"
    end: "{section}"
  footer:
    center: "{page}"
    digits: fa
bibliography:
  file: references.bib
  style: ieee
  title: "منابع"
---

<docheader title="عنوان کامل سند" subtitle="نام نویسنده"></docheader>

## مقدمه

متن ...

## روش {#sec-method}

متن ... (ارجاع: <ref to="sec-method"></ref>)

<bibliography></bibliography>
```

- The front matter must be the very first thing in the file, between two `---` lines. Leave it out entirely if the document needs no header, footer or bibliography.
- Top-level sections are `##`. `#` is not used for sections (the title goes in `<docheader>` or `<cover>`).

## Cover page

Write a block `<cover title="Title" author="Name"></cover>` in the body where the cover belongs; an optional Markdown body holds extra information. Attributes are explicit or use declared `{{ }}` values; metadata never automatically fills them. `frame` defaults to `false`, and `dir="auto"` respects the document and surrounding `<dir>`. The [component reference](components.md#cover-standalone-cover-page) lists every field. PDF makes one single-column page without header/footer/number and resets the next body page to 1. HTML keeps the effective page height and scrolls extra information internally.

**Breaking change:** old `cover:` front matter, `[cover]` settings and cover CLI switches have no effect. Move their fields to the tag; use `frame="true"` explicitly to preserve a framed cover, or remove the tag to omit it. Readonly document metadata is top-level only, with no cover fallback.

## Rules that matter most

### Direction (Persian / English)

- With the default `dir: auto`, every paragraph, heading, list item, table cell and caption takes its direction from its **first letter**: a Persian letter means RTL, any other letter means LTR. Code and math are skipped when finding the first letter.
- `dir: rtl` (or `ltr`) in the front matter forces one direction on the whole document, English text included; code stays LTR. `<dir to="rtl|ltr|auto">` does the same for one part (see [components.md](components.md#dir-text-direction-of-a-part)). Check `dir` in `config.toml`: if the project forces a direction that doesn't suit the document, set `dir:` in its front matter.
- **A Persian paragraph, heading or list item must start with a Persian word.** If it would start with an English word, a number in Latin form, code or a tag, rephrase it («زبان Python …» instead of «Python زبانی …»), or put an RLM mark (`&rlm;` or U+200F) at the very start: `&rlm;Python زبانی است …`, `## &rlm;Docker و Kubernetes`.
- In list items, the RLM goes **after** the marker: `- &rlm;Docker …`. A mark before `-` or `1.` breaks the list.
- An English paragraph inside a Persian document just starts with an English word; nothing else is needed. Force LTR with LRM (`&lrm;`) if needed.
- Content with no letters at all (a list of formulas) takes the direction of the block before it.

### Headings

- Headings are numbered automatically (when numbering is on). **Never type numbers into headings**: write `## مقدمه`, not `## ۱. مقدمه`.
- Give a heading an id by ending its line with `{#id}`: `## نتایج {#sec-results}`. The `{#id}` is not printed.
- Links inside a heading are left out of its automatic anchor: `### پلتفرم Papers With Code ([paperswithcode.com](https://paperswithcode.com))` can be referenced as `<ref to="پلتفرم-papers-with-code">` or `[...](#پلتفرم-papers-with-code)` without a `{#id}` (lowercase, punctuation removed, spaces → `-`). An explicit `{#id}` is still the most robust choice.
- The same braces can override the heading's look for that heading only: `## پیوست {#sec-app numbering=false toc=false}`, `## خلاصه {fill=true color=purple}`. See [config.md](config.md#per-heading-overrides).

### Components (tags)

- Write tags with an opening and a closing tag: `<alert type="tip"> ... </alert>`. Empty tags still need the closing tag: `<toc></toc>`, `<ref to="x"></ref>`.
- **Blank lines:** whenever a tag contains Markdown (paragraphs, bold, lists, headings, math blocks), leave an empty line after the opening tag and before the closing tag. Without them the Markdown is printed as raw text.
- Attribute values are always quoted strings: `radius="6"`, `break="true"`.
- Lengths: a bare number means points (`"12"`); `pt`, `mm`, `cm`, `in`, `em` work, `%` where noted.
- Colors: a preset name (`purple`, `blue`, `teal`, `green`, `yellow`, `red`, `pink`) or a hex string (`"#e0efff"`). Prefer presets: they adapt to every theme.
- Tags nest: a `<fig>` inside an `<item>`, a `<box>` inside a `<grid>`, an `<alert>` inside a `<step>`.
- Unknown HTML/XML tags (such as `<details>`, `<summary>`, `<b>`, etc., not registered in the component schema) are ignored gracefully rather than causing an error, and their inner Markdown/text renders normally.

### Ids and references

- Ids use letters, digits, `_ - . :`, no spaces. They must be unique. Use prefixes: `sec-`, `fig-`, `tbl-`, `list-`, `eq-`, `code-`, `thm-`, `def-`.
- Reference anything with an id using `<ref to="id"></ref>`. It prints «شکل ۱» / "Figure 1", «جدول ۲», «فهرست ۱», «رابطهٔ (۳)», «بخش ۴», «قضیه ۵», «کد ۱», following the language of the surrounding sentence. Text inside the tag replaces the label: `<ref to="thm-main">این قضیه</ref>`.
- An unknown id is an error. Never reference something you didn't define.

### Lists

- Numbered items may be typed with Persian digits: `۱.` or `۱)` work like `1.`; `۱-` is plain text. With the default `numbers = "auto"`, Persian lists get Persian digits anyway, so `1.` is fine too.
- Two numbered lists separated only by a blank line merge into one. Put a paragraph between them (or a `{...}` line above the second) to keep them apart.
- Don't type letters or words as numbers (`الف)`, `- یک.`); choose the style instead: `[list] numbers` in `config.toml` or front matter (`fa`, `en`, `fatxt`, `rome`, `abc`, `abjad`, `alefba`), or one `{...}` line directly above a single list:

  ```markdown
  {numbers=abjad suffix=")" caption="مراحل داوری" #list-review}
  1. خواندن مقاله
  2. ارسال تصمیم
  ```

  Options: `numbers`, `prefix`, `suffix`, `marker`, `indent`, `start=N` (numbered lists only), `caption="..."`, `#id`. With `caption` or `#id` the list is numbered «فهرست ۱» / "List 1" and `<ref>` can point at it. Details in [components.md](components.md#lists).
- **Task lists:** write bare `[ ] task`, `[x] task`, `[X] task` (no leading `- ` required) or standard `- [ ]` / `- [x]`, indented with `Tab` or spaces for nested subtasks. A `{...}` line above supports standard list options (`guides`, `caption`, `numbering`, `caption-position`, `indent`, `#id`) plus `color` (preset, `accent`, or hex), `strike=true|false` (default `true`, strikes/mutes completed labels without striking nested subtasks), `editable=true|false` (default `true`, interactive HTML toggling), and `progress=false|true` (default `false`, progress bar + counter). Details in [components.md](components.md#lists).

### Tables

- Plain Markdown tables. Align a column with its separator: `:---` left, `---:` right, `:---:` center.
- For a caption, a number, an id or a width, put one `{...}` line directly above the table:

  ```markdown
  {caption="نتایج آزمایش" #tbl-results}
  | روش | دقت |
  |-----|-----|
  | الف | ۹۵٪ |
  ```

  Options: `width=auto|full`, `cols="..."` (comma-separated per-column widths: `auto`, `%`, `fr` or plain positive numbers, `pt`/`mm`/`cm`/`in`/`em`/`px`; `%`/`fr`/numbers auto-expand to full width), `align=center|left|right|start|end`, `caption="..."`, `#id`, `span=column|all`, `head-align` / `body-align` = `center|left|right|start|end` (header row / other rows; override the `:---` colons). Details in [components.md](components.md#tables).
- In a two-column document, add `span=all` to tables too wide for one column. The same `span="all"` attribute works on `<fig>`, `<img>`, `<grid>`, `<code>`, `<tree>` and `<chart>` (wide figures, side-by-side figures, long code lines).
- Inside table cells: no literal `|` (use `\mid` in math), and for fractions write `$\displaystyle\frac{a}{b}$`.

### Math

- LaTeX syntax: inline `$a^2+b^2$`, display `$$ ... $$` on its own lines.
- Typst syntax: inline `%x^2+y^2%` (the formula touches both percent signs; `50%` and `% x %` stay text, and percent-encoded `%` inside URLs or Markdown link destinations like `%28...%29` is never treated as math) and display `%% ... %%` (spaces and line breaks inside are fine).
- Number a display equation by ending its closing line with `{#id}`: `$$E = mc^2$$ {#eq-energy}` or `%% E = m c^2 %% {#eq-energy}`. `{#id}` may also stand alone on the line right after the closing `$$` or `%%`.
- Common LaTeX works: `\frac`, `\sum`, `\int`, `\overset`, `\xrightarrow`, `\begin{cases}`, `\begin{array}{c}`, `\mathbb`, `\text{}`. Avoid `\textsc` and package-specific macros.

### Citations

- Put the BibTeX entries in the `.bib` file named in the front matter (`bibliography: file:`), and cite with `<cite key="key1"></cite>` or `<cite key="key1, key2"></cite>`.
- A document that cites must contain exactly one `<bibliography></bibliography>`, at the end. Every key must exist in the `.bib` file.

### Images

- Relative paths in a `.md` file resolve relative to that `.md` file's own folder (including inside `<include>`d files), for example `images/fig1.png`. Start a path with `/` (e.g. `/images/logo.svg`) to anchor it to the project root. Paths in `config.toml` remain relative to the project root. External files use `file://...` and remote assets use `https://...` where supported.
- A numbered figure is `<fig id="fig-x"> <img src="..."> <caption>...</caption> </fig>`; see [components.md](components.md#fig--caption-numbered-figure). Instead of `<img>`, a `<fig>` can hold a `<cetz>` drawing, a `<lilaq>` plot or a ` ```mermaid ` block.

### Diagrams

- For flowcharts, sequence, class, state, ER, pie and similar diagrams, prefer a ` ```mermaid ` block (see [components.md](components.md#mermaid-diagrams)); use `<cetz>` for custom geometric drawings.
- Quote Mermaid labels that contain Persian or spaces (`A["ورود مقاله"]`); `<br>` inside a quoted label forces a line break. Long labels wrap by themselves.
- Keep diagrams narrow (`TD` rather than long `LR` chains, few sequence participants): a diagram wider than the line is scaled down, text included.
- Size a diagram like an image with options on the fence line: ` ```mermaid width=60% ` or ` ```mermaid height="4cm" ` (only `width` / `height`). Inside `<fig>`, the `<fig>`'s `width` / `height` do the same.

## Component index

| Need | Use |
|------|-----|
| Title block at the top of the body (optionally with side images, several sized titles, extra text, a frame) | `<docheader title="..." subtitle="...">` or `<docheader color="..."><main><l-img/><title size="1">...` |
| Table of contents (`depth`, `pages`) / list of figures / tables / code listings | `<toc>`, `<lof>`, `<lot>`, `<lol>` |
| Callout (note, tip, warning, ...) | `<alert type="...">` |
| Tinted or bordered container | `<box color="...">` |
| Image | `<img src="...">` |
| Numbered figure with caption | `<fig id="..."> ... <caption>...</caption></fig>` |
| Flowchart, sequence, class, state, ER, pie diagram | ` ```mermaid ` block, alone or inside `<fig>` |
| Custom drawing from code | `<cetz>` with a ` ```typ ` block, usually inside `<fig>` |
| Data plot with real axes (lines, areas, scatter, bars) | `<lilaq>` with a ` ```typ ` block ending in `lq.diagram(...)`, usually inside `<fig>` |
| Anything Typst can do, written in Typst, or a `.typ` file with its own nested `#include`s | `<typ>` with a ` ```typ ` block (markup), or `<typ src="parts/x.typ"></typ>` |
| Folder / file structure (indented list or pasted `tree` output) | `<tree caption="...">` with a fenced code block |
| Bar, line, pie or donut chart from numbers | `<chart type="..." caption="...">` with a Markdown table (or `src="data.csv"`) |
| Side-by-side columns | `<grid cols="2">` + `<item>` |
| Center / left / right alignment | `<align>`, `<align to="left">` |
| Force the text direction of a part | `<dir to="rtl">`, `<dir ltr>`, `<dir auto>` |
| Citation, reference list | `<cite key="...">`, `<bibliography>` |
| Cross-reference | `<ref to="id">` |
| Code from a file, line ranges, highlighted lines, captioned listing | `<code ...>` |
| Compare two versions of code (changes found automatically) | `<diff>` + `<before>` / `<after>` |
| Link inside the document | `<a href="#id">text</a>` |
| Highlight a piece of text | `<span highlight="true">text</span>` or `[text]{highlight=true}` (`green` or a hex for another color) |
| Mark a piece of text as a reference target | `<span id="x">text</span>` or `[text]{#x}`, then `<ref to="x"></ref>` |
| Define a term / element with a badge or block | `<def id="x" mode="inline\|block" title="..." color="...">definition</def>` |
| Picture header with title and subtitle over the image | `<picHeader src="images/x.jpg" title="..." subtitle="..." height="60mm" />` |
| Keyboard shortcut, small label | `<kbd>Ctrl+S</kbd>`, `<badge color="green">stable</badge>` |
| Icon inside a sentence | `<icon name="check" color="green" />` |
| Vertical gap, page break | `<v size="2cm" />`, `<pagebreak />` (`to="odd"` for the next right-hand page) |
| Numbered procedure | `<steps>` + `<step title="...">` |
| Conversation with an AI assistant (prompts and answers) | `<chat title="...">` + `<user>` / `<ai>` messages; look from the feel or `style`, defaults in `[chat]` / front matter `chat:` |
| List with other numbers (abjad, words, Roman), a caption or an id | `{numbers=... caption="..." #id}` line above the list |
| Checklist / task list (with optional nesting, progress bar, interactive HTML) | `[ ]` / `[x]` (or `- [ ]` / `- [x]`), optionally with `{progress=true color=... strike=true editable=true}` above |
| Definition, theorem, lemma, corollary, example, remark, proof | `<definition>`, `<theorem>`, `<lemma>`, `<corollary>`, `<example>`, `<remark>`, `<proof>` |
| Split a long document into files | `<include src="chapters/x.md"></include>` |
| One source for several readers, or a value used in many places | `vars:` (values) and `var-types:` (rules: `audience: [student, teacher]`) in the front matter, then Typst in `{{ ... }}`: `{{ audience }}`, `{{ if draft { "Draft" } else { "Final" } }}`, and Markdown in `[ ... ]`: `{{ if audience == "teacher" [ ## Key ] else [ Hi ] }}` |

## Final checklist

- [ ] Front matter is first, between `---` lines; text containing `{`, `: ` or ` #` is quoted.
- [ ] Every Persian paragraph, heading and list item starts with a Persian letter (or RLM).
- [ ] No typed numbers in headings; list numbering styles come from `[list]` or a `{...}` line, not typed letters.
- [ ] Numbered lists meant to be separate are not separated by only a blank line.
- [ ] Blank lines inside every tag that contains Markdown (including each `<chat>`, `<user>` and `<ai>`, and around the code block of `<tree>` / the table of `<chart>`).
- [ ] Every `<ref to>` and `<a href="#...">` points at an id that exists; ids are unique.
- [ ] Every `<cite key>` exists in the `.bib` file, and `<bibliography>` appears once at the end.
- [ ] Image, data, code, and `<include>` paths resolve correctly relative to each `.md` file's folder (or start with `/` for the project root).
- [ ] In `<cetz>` drawings, boxed labels use `content(..., frame: "rect")` so the frame fits the text (see components.md), and a drawing's `<fig>` has no `height`.
- [ ] Mermaid labels with Persian text or spaces are quoted; a ` ```mermaid ` block inside `<fig>` has blank lines around it.
- [ ] Components are used only where plain Markdown is not enough.
