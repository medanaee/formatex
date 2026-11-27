---
name: typst-formatex-dev
description: Technical guide and developer reference for the project's bilingual (Persian/English) Typst + Markdown template — architecture, compilation, themes, feels, direction detection, config.toml settings, front matter, preprocessors, and extending template components. For end-user document authoring and component syntax, refer to docs/doc_en.md, docs/doc_fa.md, and the bilingual-document-authoring skill. Whenever configs or components are added or modified, docs/doc_en.md, docs/doc_fa.md, and skills/bilingual-document-authoring/ MUST be updated (using a subagent if possible).
---

# Typst Research Template

Content is written in Markdown (the file named by `source` in `config.toml`). The normal standalone PDF path now runs Typst preparation, the Rust/WASM pulldown-cmark parser inside Typst, shared DocumentIR and the direct PDF renderer; there is no cmarker parse in this normal path or JavaScript Markdown parser.

## Shared-core checkpoint, 2026-11-12

Owned sources are split into `formatex-core/` and `formatex-pdf/`; `formatex-typ/` is their generated/synchronized standalone assembly. `formatex-core/typst/src/document.typ` runs mapped expression/include evaluation and invokes `parser.wasm`; `formatex-pdf/typst/src/render.typ` consumes the IR. Run `node tools/sync.mjs` from `formatex-typ/` to regenerate through `formatex-core/tools/assemble.mjs`. Edit source owners, not generated source copies.

All 43 shared packages / 78 schema tags live in `formatex-core/components/<name>/` with `typst.typ`, `html.tsx`, `manifest.toml`, `schema.json`, `docs.json` and `html.css`. Schema/docs are shared data files; preparation reads the generated data catalog without loading the HTML renderer.

Nine Rust parser tests pass, including Unicode/source spans, Persian/Arabic list restarts and rich/fenced-code properties. Frontend integration: 373 passed; native: 66 passed/5 ignored; typecheck and production build pass, with nine existing lint warnings. The 24 PDF theme/feel builds plus mobile compile, selected PDF visual checks, 360/768/1280 px browser checks and isolated one-file/custom-package/relocated standalone tools are verified. Complete component-property parity, full map/diagnostic/export coverage and real Android native interactive UI remain separate gates. HTML content is static SSR with a hydrated React viewer shell; arbitrary component events/state and live variable/DSL reactivity are not implemented. See [the active plan](../../../formatex-app/docs/tasks/shared-core-pdf-html-plan.md).

`node tools/sync.mjs` builds the current core WASM and assembles core+pdf into this distribution. The local `tools/registry.mjs` is copied from core: `gen-registry`, `build-all`, `bundle` and `schema` run against this synced snapshot after relocation without sibling checkouts. Sync again to consume changed core/pdf sources. Install workspace dependencies from the workspace root; a relocated standalone snapshot can install its own tooling dependency. Document inputs remain external to the bundle.

Regression checkpoint (2026-11-12): paired custom references, semantic `[@key]` citations outside code/math, explicit ordered-marker restarts, nested PDF div/flex and lexical inline reference/definition direction are corrected. Parser regression suite: 11 passed; native direction regression and full-demo visual compilation pass without convergence warnings. The preceding full migration gate counts above are historical; current gates pass: parser 11, native 68/five ignored, frontend 372/two skipped plus one opt-in real integration, typecheck and build (existing bundle-size warnings). The final CLI matrix passes 25 cases (24 desktop theme/feel plus `mobile-20-9`) without warnings; inspected mobile cards/pills have equal widths. This checks page format, not real Android interaction. Standalone/app sync succeeds: 43 packages/78 tags. For an English section inside forced RTL, use `<dir ltr>` or `<dir to="ltr">` explicitly.

`alert`, `box`, `badge`, `kbd`, `code`, `theorem`, `exercise`, `fig`, `grid`, `steps`, `compare`, `progress`, `chat`, `docheader`, `letter`, `picheader`, `cover`, `tree`, `todo` and `diff` own their `html.tsx` / `html.css` and follow the PDF tint, padding and feel radii. They are no longer drawn by `renderBuiltin`. Standard Markdown is rendered in `formatex-html/src/markdown.tsx` with the PDF heading, list, table, quote, fence and equation options. The other built-in `html.tsx` files still delegate to `renderBuiltin(node, context)` in `formatex-html/src/components.tsx`. Package folders are editable extension points with shared contracts; extracting the remaining built-in renderers is still open. Custom package TSX uses the same renderer API.

## Files

| File | Role |
|------|------|
| `docs/doc_en.md`, `docs/doc_fa.md` | The user guide in English and Persian (the same content). `docs/doc_en.md` is the default `source`. |
| `main.typ` | Generated core document + PDF IR rendering entry point. |
| `../formatex-core/components/<name>/` | Shared source folder: `typst.typ`, `html.tsx`, `manifest.toml`, `schema.json`, `docs.json`, `html.css`; generated package copies/catalogs are not handwritten sources. |
| `src/lib/`, `src/preprocess/` | Helpers shared by several components (`tag`, `untag`, `tinted`, `parse-length`, `reference-text`, ...) and the source-text preprocessors. |
| `tools/sync.mjs` | Generates the core+pdf assembly through the core-owned assembler. The bundle tool embeds parser WASM, JSON and dark theme; use `node tools/bundle.mjs --out one.typ`. Isolated/full bundle coverage remains pending. |
| `tools/export-schema.mjs` | Writes `dist/tags.json`: every tag, attribute, allowed value and default (from each component's `<name>-schema`) and every component's docs (`<name>-docs`), for editor autocomplete. |
| `src/core.typ` | Config/front matter/`<include>` loading, theme, feels, fonts, paragraph settings, direction detection. |
| `src/page.typ` | Page size, margins, columns, header and footer; cover layout lives in `components/cover/typst.typ`. |
| `src/conf.typ` | `conf`: document show rules (equations, code, quotes, tables, headings, footnotes). |
| `config.toml` | Project-wide settings: `theme`, `feel`, `page`, `margin`, `scale`, `columns`, `[heading]` (numbering + look), `[font]`, `[paragraph]` (justify, letter/line/word spacing), `[list]`, `[table]`, `[equation]`, `[chat]`. |
| Front matter of each `.md` | Per-document settings: `header`, `footer`, `bibliography`, and overrides of any `config.toml` key (including each `heading` key). |
| `examples/references.bib` | BibTeX entries for `<cite>` / `<bibliography>` (the default `file`). |
| `examples/` | `demo.md` (full feature test; see below) and the files it uses (`included.md`, `nested.md`, `sample.py`, `chat.md`, `references.bib`). |
| `examples/demo.md` | Full feature test of every component and option (compile with `--input source=examples/demo.md`, or `node tools/build-all.mjs --source examples/demo.md` for all themes × feels). |
| `src/themes.typ` | The eight color palettes. |
| `code-dark.tmTheme` | Syntax-highlighting theme used automatically on dark themes. |
| `images/` | Images. Paths in Markdown are relative to the project root. |

App development commands `predev`, `prebuild`, `pretest` and `pretypecheck` run engine sync before their command. This does not watch later source edits; restart/rerun the command to sync again. Native embedded engine changes require a native rebuild. Renderer TSX must stay excluded from app React Fast Refresh instrumentation because its injected window preamble cannot run in the HTML worker.

## Compile

```powershell
typst compile main.typ                         # -> main.pdf
typst compile main.typ --input theme=dracula   # override the theme without editing config.toml
typst compile main.typ "out-{p}.png" --ppi 80  # per-page PNGs for visual checks
typst compile main.typ demo.pdf --input source=examples/demo.md   # render another Markdown file
```

Project scripts (`tools/`, run from anywhere):

```bash
node tools/build-all.mjs --source examples/demo.md   # every theme x feel -> out/ (regenerates the registry first)
node tools/gen-registry.mjs                          # after adding / renaming a component file, before a plain `typst compile`
node tools/bundle.mjs                                # one-file build -> dist/formatex.typ (compile with --root .)
node tools/export-schema.mjs                         # tag / attribute schema -> dist/tags.json
```

After any change, compile and look at the affected pages; Typst errors point to the file and line inside `components/` or `src/`.

## Text direction (automatic by default)

With `dir = "auto"` (default), do not set direction manually. Every paragraph, heading, list, table, table cell, and title gets its direction from its **first letter**: Arabic-script (Persian) → RTL, anything else → LTR. Code and math are ignored when finding the first letter. Content with no letters (e.g. a list of only formulas) inherits the direction of the previous block.

Forcing a direction:
- Top-level `dir = "auto" | "rtl" | "ltr"` in `config.toml`, front matter `dir: rtl`, or `--input dir=ltr` (precedence: `--input` > front matter > config). `rtl` / `ltr` force that direction on paragraphs, headings (number digits follow: Persian in rtl), lists, tables (column order flips), table cells, quotes, figure / table / code captions and their supplement («شکل» / "Figure"), alerts, steps, boxes, badges, toc / lof / lot entries, the bibliography's default `dir`, the page header / footer when their own `dir` is `auto` (the `<cover>` tag resolves in context), and the column order when `column-dir` is `auto`. Code blocks and inline code stay LTR; `<cetz>` labels, Mermaid diagrams and `<kbd>` keys keep their per-label direction.
- `<dir to="rtl|ltr|auto">` (or bare `<dir rtl>`, default `auto`) forces it for one part; `auto` restores per-block detection inside a forced document. Nestable, innermost wins. Header / footer ignore `<dir>`; the `<cover>` component resolves direction inside the surrounding `<dir>`. See the `<dir>` component below.
- Internals (`src/core.typ`): `doc-dir` (from `sys.inputs` / merged config, asserted), `named-dir(d)` (`"rtl"` → `rtl`, `"ltr"` → `ltr`, else `none`), `dir-stack` state pushed / popped by `<dir>`, `content-dir(body)` (needs `context`: innermost `<dir>` value, else `doc-dir`; if forced that direction, else `text-dir(body)`), `doc-text-dir(body)` (header / footer; only `doc-dir`, no state). `auto-dir` is always a `context` and uses `content-dir`; the `table.cell` and `quote` show rules are `context` and use `content-dir`; the global `set text(dir:)` uses `column-dir` when `column-count > 1` and it isn't `auto`, else `doc-dir` when forced, else `auto`. In `main.typ`, `resolve-dir` uses `content-dir` (call it inside `context`); toc / lof `entry-rtl`, `<badge>` and the `<code>` caption use `content-dir`; the `<alert>` icon layout is wrapped in `context`; `<bibliography>`'s default `dir` is `doc-dir`. New components that pick a direction must go through `content-dir` (inside `context`), not `text-dir`, or they will ignore `dir` / `<dir>`.

Directional marks count as the first letter and override detection:
- RLM (U+200F, or `&rlm;`) or ALM (U+061C) at the start → RTL with Persian digits.
- LRM (U+200E, or `&lrm;`) at the start → LTR.

Consequences for writing:
- A Persian paragraph or heading that starts with an English word becomes LTR. Put an RLM at its start (`‏Python در ...`, `## ‏Python و ...`).
- In list items put the mark **after** the marker (`- ‏Python ...`); a mark before `-` or `1.` breaks the list syntax.
- Quotes put their bar on the start side; Persian headings/figures get Persian digits.

## Global settings (`config.toml`)

For independent HTML output, `[html] math = "native"` or `"katex"` selects export-time math rendering. `formatex-html` owns offline CSS/fonts and renders math before returning HTML; no reader-side KaTeX compiler/bootstrap or CDN is shipped. Structural HTML belongs in each package's `html.tsx` / `html.css`, with shared JSON contracts. Tailwind utilities compile to static required CSS; drawings and Typst-only components retain explicit SVG fallback. See [the renderer reference](reference.md#html-rendering-math-and-fonts).

```toml
source = "doc_en.md"       # Markdown file main.typ compiles (default doc_en.md; --input source=... overrides; not settable in front matter)
theme = "ocean"            # light: paper, sepia, ocean, sage — dark: midnight, nord, zinc, dracula

[heading]
numbering = true           # automatic heading numbers on/off (old top-level `heading-numbering` still read as fallback)
number-prefix = ""         # text before the number: "(" with number-suffix ")" → «(۱) مقدمه»
number-suffix = "."        # text after the number: "" → «۱ مقدمه», "." → «۱. مقدمه»; headings only (toc, <ref>, {section-number} stay bare)
```

- When numbering is on, **never** type numbers into headings (`## 1. Intro` → `## Intro`). Persian headings get Persian digits (۱.۲), English ones Latin digits. Numbering is continuous across the whole document. Headings start at `##`; numbering skips the empty level so they are `1`, `1.1`, not `0.1`.
- Dark themes automatically switch code highlighting. Prefer the color presets (`purple`, `blue`, `teal`, `green`, `yellow`, `red`, `pink`) for `<alert color>` / `<box color>`: they are tinted from the active theme (`color-presets` + `tinted` in `main.typ`), so they work on every theme. Hex colors are used as given on light themes and toned down on dark ones.
- Components of a project: top-level `components` (config.toml and front matter, added together; a list, one path or comma-separated paths) names `.typ` files that define `<x>-tags` / `<x>-schema` / `<x>-docs` (any number of tags per file, file name irrelevant, schema and docs optional). `src/lib/local-components.typ` loads them with a computed `import` + `dictionary(module)` (no generated registry), checks names (not built in, not defined twice, lowercase) and gives `main.typ` the extra tags and `local-all-schemas` (a tag without a schema gets a default one so it still carries its `_at` line mark); `tools/schema.typ` adds those with a schema to the exported tags. Errors name the line of `config.toml` or the front matter that listed the file.
- Page size: top-level `page = "desktop-a4"` (default); `desktop-*` sizes for print/screen, `mobile-*` (110 mm wide) for phones, `custom` with `page-width` / `page-height` (mm, cm, in, pt); old names `a4` / `mobile` are aliases. A phone page (`mobile-*`, or custom narrower than `phone-max-width` = 120 mm) is `is-phone`: one column, own margins, no header `center`, docheader images in a row. `--input page=...` or `page:` in front matter. Sizes live in `page-sizes` in `src/page.typ`.
- Margins (not on phone pages): top-level `margin = "narrow" | "normal" | "wide"` (default `normal` = Typst's auto ≈ 25 mm; narrow 15/18 mm, wide 35/30 mm sides/top-bottom); `--input margin=...` or front matter `margin:`. Values in `margin-sizes` in `src/page.typ`; values are shares of the shorter page side; phone pages keep their own margins.
- Scale: top-level `scale = 100` (percent; `--input scale=...` or front matter `scale:`). `src/core.typ` turns it into `zoom` (a factor, exported to `main.typ`). Base sizes are `10pt * zoom` (text), `9pt * zoom` (tables), `8pt * zoom` (code blocks) and `9pt * zoom` (inline code) — the `show raw` rules in `src/core.typ`; every other fixed length is `Npt * zoom` or in `em`, so everything grows together while the page size and margins stay put. `parse-length` scales plain-pt attribute values; `cm` / `mm` / `%` stay physical.
- Columns: top-level `[typ] columns = 1` (default); usually `typ: {columns: 2}` in a document's front matter, or `--input columns=2`. Implemented as `set page(columns:)`; the cover is forced to one column, `<docheader>` becomes a parent-scoped float spanning all columns, a phone page always gets one column (`column-count` in `src/core.typ`). Column order: top-level `column-dir` = `rtl` (default in config.toml, right column first) / `ltr` / `auto` (document language); `--input column-dir=...` overrides. With several columns, a run of `<toc>` / `<lof>` / `<lot>` / `<lol>` lines (blank lines between) where any uses `break` is wrapped by the `list-pages` preprocessor in `<listpages>` = `page(columns: 1, ...)`; the run's outer breaks are removed (page() breaks already), inner ones kept.
- Direction: top-level `dir = "auto"` (default) / `"rtl"` / `"ltr"`; front matter `dir:` or `--input dir=...` override it. See "Text direction" above.
- Equations: `[equation] numbering = "labelled"` (only `$$...$$` or `%%...%%` with `{#id}` get a number), `"all"` or `"none"`.
- Lists: `[list]` with `numbers` (`auto` default = Persian digits in an RTL list, Latin in an LTR one; `fa`, `en`, `fatxt` Persian words, `rome`, `abc`, `abjad` 28 letters, `alefba` 32 letters; past the letters, Persian digits), `prefix` (default none), `suffix` (default `"."`), `marker` (character or `disc` / `circle` / `square` / `dash` / `triangle` / `arrow` / `check` / `star` / `none`; comma-separated = one per level; unset = Typst's) and `indent` (`parse-length`; unset = none). Front matter `list:` overrides key by key. See "Lists" under Standard Markdown.
- Chat: `[chat]` with `style` (`auto`), `user-name` / `ai-name` (`""` = «شما» / "You", «هوش مصنوعی» / "AI"), `user-icon` / `ai-icon` (`user` / `robot`), `user-color` / `ai-color` (`""` = theme accent / secondary), `frame` (`true`), `width` (`"80%"`); `title` and `dir` are accepted too. Front matter `chat:` overrides key by key; `<chat>` attributes win over both. See `<chat>` below.

### Overall feel (`feel`)

```toml
feel = "formal"   # formal | standard | friendly
```

Sets the default corner rounding of code blocks, inline code, the code badge, `<badge>`, `<kbd>`, `<alert>`, boxed theorem blocks, `<box>`, `<img>`, the cover frame and the `band` header, and the default fonts:

| Feel | Corners | Latin font | Persian font |
|------|---------|------------|--------------|
| `formal` | square everywhere (all radii 0) | New Computer Modern | XB Niloofar |
| `standard` | slightly rounded | Inter | IRANSans |
| `friendly` | very rounded | Lexend | Pelak |

Tables also follow the feel (`feel.table` in `src/core.typ`): `formal` = academic top/header/bottom rules, `standard` = light rounded frame + tinted bold header + thin row lines, `friendly` = rounded card + colored bold header + striped rows. Colors come from the theme (`secondary` tint for the header, `code-bg` for stripes, `code-stroke` for lines).

The header style also follows the feel when the feel sets `header` (`formal` forces `line`: text + rule below, no band/rounded strip); `standard` / `friendly` use the document's `header.style`. `--input header-style=...` still wins.

**Anything new (component, marker, header style) must fit all three feels: radii and shapes come from `feel.*`, and `formal` never gets a rounded corner.** Read [extending.md](extending.md) before adding one.

`latin` / `persian` in `[font]` override the feel's fonts. An explicit `radius` attribute on a tag still wins. Override per build with `--input feel=friendly`. It is a top-level key: keep it above the `[font]` table.

### Heading look (`[heading]`)

```toml
[heading]
underline = true   # rule below (default false)
fill = true        # tinted background (default false)
max-level = 2      # relative to the document's top heading level, like the numbers (default 2)
color = ""         # preset name, hex, or "" = theme.heading
```

Implemented by a `show heading` rule in `conf` (`src/conf.typ`): levels up to `max-level` are wrapped in a full-width block; text, rule (1pt) and tint all come from `heading-color`. Inset: with `fill` `(x: 0.85em, y: 0.7em)`, underline only `(bottom: 0.65em)`. Radius = `feel.heading` (0 / 5pt / 10pt); with `underline` the radius is `(top: r, bottom: 0pt)`. The top level is the shallowest numbered outlined heading (unnumbered titles like the bibliography's don't count). `color-presets` now live in `src/conf.typ` (imported by `main.typ`).

Per-heading overrides: `## Title {#id fill=true underline=false color=purple numbering=false number-prefix="(" number-suffix=")" toc=false}` (keys `heading-option-keys`; `#id` optional; booleans `true`/`false`). The shared parser records heading IDs/options and source spans in IR; output adapters apply the resulting outline/style semantics. Do not add legacy raw-comment heading preprocessors.

### Fonts (`[font]`)

```toml
[font]
latin = "New Computer Modern"   # English text (default: the feel's font)
persian = "Ray"                 # Persian text (default: the feel's font)
code = "Anonymous Pro"          # code blocks and inline code (default)
```

Any font listed by `typst fonts`; a missing key falls back to the default. Each character is taken from the first font that has it (Latin font first, then Persian), so a Persian font with Latin glyphs does not change English text.

### Paragraphs (`[paragraph]`)

```toml
[paragraph]
justify = false        # both edges flush (default false)
letter-spacing = 0     # % of the font size → text(tracking: v% em) (default 0)
line-spacing = 100     # % of Typst's normal 0.65em gap → par(leading:) (default 100)
word-spacing = 100     # % of the font's space → text(spacing:) (default 100)
```

Read in `src/conf.typ` (`paragraph-number`, `justify`) and applied in `conf` with `set text(spacing:, tracking:)` + `set par(justify:, leading:)`. All em-relative, so they follow `scale`. Code blocks and inline code reset `tracking: 0pt` and `par(justify: false)`; tables get `show table: set par(justify: false)` (narrow cells would get stretched gaps); code-block line gaps come from the grid's `row-gutter`, not `leading`. Typst keeps joined Persian letters joined under tracking. Front matter overrides key by key (`paragraph:`); an empty value means the default; wrong types assert.

### Front matter (per-document settings)

Each Markdown file may start with a YAML block between `---` lines (first thing in the file). It is parsed in `src/core.typ` (`front-matter`), merged over `config.toml` (`merge-config`: tables key by key, other values replaced) and stripped before rendering (`source-body`). The header, footer and bibliography live **only** here; `<cover>` is body content, not a setting; any `config.toml` key (`theme`, `feel`, `font`, `heading`, ...) can be overridden here for one document. `heading:` is merged key by key (`heading-key` / `heading-flag` in `src/core.typ`): an empty YAML value (`color:`) means the default, and booleans must be `true` / `false`.

- A `typ.header` table turns the header on; `enabled: false` inside turns it off. A cover appears only where a `<cover>` block is written in the body.
- Quote strings containing `{`, `: ` or ` #` (`end: "Page {page} of {pages}"`); unquoted `{` starts a YAML mapping.
- Precedence: `--input` > front matter > `config.toml`.

### Page header (`typ.header` in front matter)

```yaml
typ:
  header:
    style: line                     # minimal | line | band | double
    start: "پژوهش اقیانوس‌شناسی"    # start side (right in RTL); "" = empty
    center: ""
    end: "صفحه {page} از {pages}"   # placeholders, see below
    dir: auto                       # rtl | ltr | auto (from the header text)
    skip-first-page: true           # no header on page 1 (default true)
    # logo: images/logo.svg         # optional, shown before the start text
```

Placeholders in `start` / `center` / `end`:

| Placeholder | Value |
|-------------|-------|
| `{page}` | Current page number |
| `{pages}` | Total pages |
| `{section}` | Title of the current top-level section: the first one starting on the page, otherwise the last one before it |
| `{section-number}` | That section's number (empty when heading numbering is off) |

Example: `end = "{section-number}. {section}"`. A cell made only of placeholders takes its direction from the section title.

- When numbered headings exist, `{section}` only considers those (unnumbered titles like the bibliography's are skipped).
- A cell containing `{section}` / `{section-number}` is empty on pages before the first section.

Styles: `minimal` = text only, `line` = rule below, `band` = shaded strip, `double` = accent bar above + rule below. Page numbers in RTL header text use Persian digits; `digits: fa | en | auto` forces them.

### Page footer (`typ.footer` in front matter)

```yaml
typ:
  footer:
    style: line                 # plain | line (rule above); default plain
    start: "{section}"
    center: ""
    end: "— {page} —"           # same placeholders as the header
    digits: fa                  # fa | en | auto
    dir: auto
    skip-first-page: false      # default false
    # enabled: false            # no footer / page number at all
```

No `typ.footer` = Typst's plain centered page number (`footer: auto`). With it, `page-footer()` in `src/page.typ` (reuses `header-text`) replaces it; the cover sets `footer: none`. Side layout (start / center / end grid) only when both `start` and `end` are set in the settings; otherwise the non-empty cells are centered (decided from the settings, so an empty `{section}` doesn't move it). A placeholder-only cell has no direction, so use `digits: fa` for Persian digits. Override the style for one build with `--input header-style=band`. In `config.toml`, tables (`[heading]`, `[font]`, `[paragraph]`, `[list]`, `[table]`, `[equation]`, `[chat]`) must stay after the top-level keys (`source`, `theme`, `feel`, `page`, `margin`, `scale`, `columns`).

### `<cover>` component

`components/cover/typst.typ` registers the block tag and schema. Place it in the Markdown body at the desired position; it accepts optional `logo`, `institution`, `faculty`, `department`, `type`, `title`, `subtitle`, `author`, `supervisor`, `advisor`, `date`, `frame` (`false` by default) and `dir` (`auto` by default) attributes, plus an optional Markdown body for extra information.

```markdown
<cover title="عنوان پژوهش" author="نام نویسنده" frame="false" dir="auto">

اطلاعات تکمیلی

</cover>
```

Tag attributes are strings, not list literals (`author="A / B"` for several names); multiline information belongs in the optional body. Oversized PDF content is scaled down to stay on one page. The PDF is exactly one standalone single-column page, with no header/footer/printed number; it resets the page counter to 0 so the next body page is 1. HTML is a native section with the effective page height (A4: 297 mm; custom/mobile respected), responsive width and internally scrolling content. Frames use the theme and feel. Direction is resolved through `resolve-dir` inside `context`, including a surrounding `<dir>`.

**Breaking migration:** `cover:` front matter, `[cover]` config and the cover CLI switch no longer generate a page and have no effect. Move fields to tag attributes, explicitly keep `frame="true"` when required, and remove the tag to omit the cover. Attributes are explicit or use declared `{{ }}` values; readonly metadata comes only from top-level document metadata and is not inferred from the cover.

### Bibliography settings (`bibliography:` in front matter)

```yaml
bibliography:
  file: examples/references.bib
  style: ieee            # any Typst/CSL style: apa, chicago-author-date, harvard-cite-them-right, ...
  title: "منابع"
  dir: auto              # auto = each entry follows its own language; or ltr / rtl
```

Per-document only: the `<bibliography>` handler (`components/citations/typst.typ`) reads `front-matter` (not the merged `config`), so a `[bibliography]` table in `config.toml` is ignored. Every key is optional (defaults above; `file` defaults to `examples/references.bib`); tag attributes win; empty values mean the default.

## Standard Markdown

Headings, bold/italic, lists, tables, block quotes (`>`), horizontal rules (`---`), inline code, fenced code blocks (line-numbered), LaTeX math `$...$` / `$$...$$` (via mitex) and Typst math `%...%` / `%%...%%` (evaluated in math mode; inline delimiters touch the formula) all work normally.

Math goes through the `mitex` wrapper in `src/lib/mitex.typ`, which rewrites commands that mitex 0.2.7 converts to symbol names Typst 0.15 dropped (`mitex-fixes`: `\dashrightarrow` → ⇢, `\dashleftarrow` → ⇠). If a LaTeX command fails with "unknown symbol modifier", add it there. Unicode symbols can also be typed directly inside `$...$`. Inference rules work as `\frac{premises}{conclusion}` (use `\displaystyle` inside table cells, `\begin{array}{c} a \\ b \end{array}` for premises on two lines); labelled arrows as `\overset{m}{\rightsquigarrow}` or the stretchy `\xrightarrow{m}`. `\textsc` is not supported. See `paper.md` for a full example.

Tables are centered by default. Align columns with the separator row: `---:` right, `:---` left, `:---:` center (per column, overrides the default).

Per-table options: a `{...}` line directly above the table (blank line allowed):

```markdown
{width=full align=left span=all caption="فونت‌های هر حالت" #tbl-fonts}
| Feel | Latin |
|------|-------|
```

- `width`: `auto` (content width) or `full` (text width; columns sized browser-style from their natural widths).
- `align`: `center`, `left`, `right`.
- `head-align` / `body-align`: `center`, `left`, `right`, `start`, `end` (hyphenated like the other option keys; `table-option-keys` in `src/conf.typ`). Applied as `show table.cell[.where(y: 0)]: set table.cell(align: <value> + horizon)` around the table, so they win over the Markdown column colons.
- `span`: `column` (default) or `all`. With `columns` > 1, `all` wraps the table in `place(auto, scope: "parent", float: true)` so it floats to the top/bottom of a page across every column (`width` is then measured against the whole text width). No effect in one column. Use it for tables too wide for a column (`paper.md` does for its rule tables).
- Defaults come from `[table]` in `config.toml` (currently `width = "full"`, `align = "center"`, `span = "column"`), overridable in front matter; without `[table]` tables are `auto` + `center` + `column`.
- `caption` (quoted if it has spaces; no Markdown) and/or `#id` → numbered table, caption on top, «جدول ۱» / "Table 1" by the caption's language; `<ref to="tbl-fonts">` works.
- Unknown keys/values are compile errors. Lines inside fenced code blocks, or not followed by a table, are left alone.
- Internals: `table-attrs` (`src/preprocess/table-attrs.typ`) turns the line into `#state("table-options").update(...)`; the `show table` rule in `src/conf.typ` reads it, applies it to the next table and clears it (`table-full-width` rebuilds full-width tables with explicit column widths).

Lists: numbered items may be typed with Persian or Arabic-Indic digits (`۱.`, `۲)`); `۱-` stays text. Two numbered lists separated only by a blank line merge (CommonMark). Every list is styled from `[list]` (see Global settings). Per-list options: a `{...}` line directly above a list item (blank lines allowed):

```markdown
{numbers=abjad suffix=")" marker=dash indent=2em start=3 caption="مراحل کار" #list-steps}
1. ...
```

- `numbers` / `prefix` / `suffix` / `marker` / `indent` as in `[list]`, for this list and the lists nested in it. `start=N` sets the first number (numbered lists only).
- `caption` (quoted if it has spaces; no Markdown) and/or `#id` → numbered block with the caption below it, «فهرست ۱: ...» / "List 1: ..." by the caption's language (without a caption, the list's); the list stays start-aligned and may break across pages; `<ref to="list-steps">` → «فهرست ۱» / "List 1".
- Extent: up to the first line after a blank line that is neither indented nor an item; a list after only a blank line is merged into it. Unknown keys and `start` on a bulleted list are compile errors. A `{...}` line containing anything but options, or inside fenced code, is left alone.
- Internals (`src/preprocess/` and `src/lib/lists.typ`): `persian-list-numbers` rewrites `۱.` / `١)` at line start to ASCII digits (Markdown only knows ASCII), skipping fences. `list-attrs` wraps the list in `<!--raw-typst #list-block(opts)[ -->` … `<!--raw-typst ] -->` (`list-block` is in the cmarker `scope`); `start` is applied by rewriting the first item's number. `list-style(opts, body)` sets `enum(numbering: list-numbering(kind, suffix))`, `list(marker:)` and `indent`, each key from `opts`, else `list-config`; `#show: list-style.with((:))` applies the config to every list. `list-numbering` is a `context` function so `auto` reads `text.dir`. With `caption` / `id`, `list-block` builds `figure(kind: "list", supplement: فهرست / List, numbering: digits(n, d == rtl))`, direction from `content-dir(caption)`; `reference-text` handles kind `"list"`. Captioned lists are not in `<lof>` / `<lot>` / `<lol>`.

Including files: `<include src="chapters/intro.md"></include>` (or `<include src="..." />`) alone on a line, blank lines around it. The line is replaced with the file's text (front matter stripped; only the main file's settings count) before any other preprocessing, recursively, so numbering, TOC, ids and `<ref>` span all files. Paths are relative to the project root, except that one starting with `./` or `../` is relative to the file containing the `<include>` (`resolve-include` in `src/core.typ`); heading levels are not shifted. Inline use (inside a paragraph/list) and include loops are compile errors; inside fenced code it stays text. Internals: `expand-includes(text, chain)` in `src/core.typ` builds `source-body`; the `"include"` html handler (`components/internal.typ`) only exists to report misplaced tags.

Numbered equations: end a display equation with `{#id}` on the closing `$$` line (`$$e^{i\pi}+1=0$$ {#eq-euler}`, or a multi-line block whose last line is `$$ {#eq-x}`), or put `{#id}` alone on the next line (`equation-ids` pulls the previous line back in when it ends with `$$`). The number goes on the end side (left in RTL) with digits from the surrounding language: «(۱)» / "(1)"; `<ref to="eq-euler">` → «رابطهٔ (۱)» / "Equation (1)". Internals: `equation-ids` in `main.typ` inserts `#state("equation-next").update(id)` before the opening `$$` and labelled `metadata((equation-id: id))` after the closing one; the `show math.equation` rule in `src/core.typ` rebuilds the flagged equation with `numbering: equation-numbering` (unnumbered equations don't step the counter); `<ref>` resolves the metadata to the last equation before it.

A ` ```mermaid ` block is drawn as a diagram instead of shown as code (see Mermaid diagrams below). Fenced code blocks with a language (` ```python `) get a badge in the top-right corner with the language name and icon. Common aliases work (`py`, `js`, `ts`, `sh`, `yml`, `md`, ...). Unknown languages show the fence name with a generic code icon; no language = no badge. To add a language, extend `code-languages` (and `code-language-aliases`) in `src/core.typ` using a Font Awesome icon name.

## Components & Document Authoring

The full reference manual for all HTML-like components, including attributes, syntax rules, visual options, and examples, is maintained in the user guides and the document authoring skill:

- **English User Guide:** [docs/doc_en.md](../../docs/doc_en.md)
- **Persian User Guide:** [docs/doc_fa.md](../../docs/doc_fa.md)
- **Authoring Skill Components:** [components.md](../bilingual-document-authoring/components.md)
- **Authoring Skill Config:** [config.md](../bilingual-document-authoring/config.md)

### Available Components Index

| Category | Tags / Syntax | Purpose | Documentation Reference |
|---|---|---|---|
| **Document Structure** | `<cover>` | Standalone cover at its body position, optional Markdown information, frame off by default; native fixed-height HTML | [doc_en.md](../../docs/doc_en.md#cover-component) · [components.md](../bilingual-document-authoring/components.md#cover-standalone-cover-page) |
| **Document Structure** | `<docheader>`, `<main>`, `<title>`, `<l-img>`, `<r-img>`, `<info>` | Hierarchical title block: sized titles (1-3), left / right images, Markdown `<info>` below, optional theme-aware frame (`border` = sides as letters of `lrtb`, `fill`, colors via `color` / `border-color` / `fill-color`, which only pick colors); old title / subtitle / subtitle2 attributes still work, spanning columns | [doc_en.md](../../docs/doc_en.md#docheader-title-block) · [components.md](../bilingual-document-authoring/components.md#docheader-title-block) |
| **Document Structure** | `<picHeader>` | Full-width picture header with gradient, title, subtitle (`break`, `margin-x`, `margin-y`) | [doc_en.md](../../docs/doc_en.md#picheader-picture-header) · [components.md](../bilingual-document-authoring/components.md#picheader-picture-header) |
| **Outlines & Lists** | `<toc>`, `<lof>`, `<lot>`, `<lol>` | Table of contents, lists of figures, tables, code listings | [doc_en.md](../../docs/doc_en.md#toc-table-of-contents) · [components.md](../bilingual-document-authoring/components.md#toc-lof-lot-contents-and-lists) |
| **Callouts & Boxes** | `<alert>`, `<box>` | Colored callout with icon, theme-tinted styled container | [doc_en.md](../../docs/doc_en.md#alert-callout-with-icon) · [components.md](../bilingual-document-authoring/components.md#alert-callout) |
| **Figures & Visuals** | `<fig>`, `<img>`, `<caption>`, `<cetz>`, `<lilaq>`, `<typ>`, ````mermaid```` | Numbered figures, SVG/raster images, CeTZ code drawings, Lilaq data plots (`lq` + `theme` in scope, theme-colored axes), `<typ>` Typst markup or a `.typ` file set in place (`src` files are `include`d by Typst, so their nested includes work; a code block's relative include paths are rooted at the project), Mermaid diagrams | [doc_en.md](../../docs/doc_en.md#img-image) · [components.md](../bilingual-document-authoring/components.md#fig--caption-numbered-figure) |
| **Trees & Charts** | `<tree>`, `<chart>` | File/folder tree from an indented listing or `tree` output; bar/line/pie/donut chart from a Markdown table or CSV (both numbered figures with `caption` / `id`) | [doc_en.md](../../docs/doc_en.md#tree-file-and-folder-tree) · [components.md](../bilingual-document-authoring/components.md#tree-file-and-folder-tree) |
| **Layout & Direction** | `<div>` | Container styled by Tailwind-like classes: padding, margin, colors, text, rounding, borders, flex and gap | [doc_en.md](../../docs/doc_en.md#div-section) · [components.md](../bilingual-document-authoring/components.md#div-container-with-tailwind-style-classes) |
| **Layout & Direction** | `<grid>`, `<item>`, `<align>`, `<dir>` | Multi-column grid, horizontal alignment, localized text direction override | [doc_en.md](../../docs/doc_en.md#grid--item-columns) · [components.md](../bilingual-document-authoring/components.md#grid--item-columns) |
| **Code & Interactive** | `<code>`, `<kbd>`, `<badge>`, `<icon>`, `<v>`, `<pagebreak>`, `<a>` | Numbered code listing with line highlights, keyboard keys, inline badges, inline Font Awesome icons, styled links | [doc_en.md](../../docs/doc_en.md#code-code-from-a-file-line-ranges-highlights) · [components.md](../bilingual-document-authoring/components.md#code-code-listing) |
| **Procedures & Chat** | `<steps>`, `<step>`, `<chat>`, `<user>`, `<ai>` | Numbered step rail, AI chat conversation transcript (transcript, assistant, bubbles) | [doc_en.md](../../docs/doc_en.md#steps--step-numbered-steps) · [components.md](../bilingual-document-authoring/components.md#chat--user--ai-ai-conversation) |
| **Academic & Math** | `<cite>`, `<bibliography>`, `<ref>`, `<span>`, `<anchor>`, `<def>`, `<definition>`, `<theorem>`, `<lemma>`, `<corollary>`, `<example>`, `<remark>`, `<proof>` | Citations, references list, cross-references, numbered theorem environments | [doc_en.md](../../docs/doc_en.md#cite--bibliography-citations) · [components.md](../bilingual-document-authoring/components.md#theorem-blocks) |
| **Multi-file Modular** | `<include src="...">` | Modular Markdown file inclusion | [doc_en.md](../../docs/doc_en.md#including-other-markdown-files) · [components.md](../bilingual-document-authoring/components.md#include-split-into-files) |

### Engine & Template Development Notes

When working on the template engine itself:
- **Component registration:** Edit shared package folders under `formatex-core/components/` and their separate schema/docs JSON. `node tools/sync.mjs` in the generated distribution invokes the core assembler to generate catalogs/registry and the PDF sources. The normal entry point consumes IR directly; the package-folder registry is the current route, not a second normal parser path.
- **Parent/child communication:** Tags communicate via `tag(kind, attrs, body)` and `untag(body, kind)`.
- **Direction contracts:** Components must never hardcode direction; they must resolve direction via `resolve-dir()` or `content-dir(body)` inside `context`.
- **Radii & Feels:** Corners must strictly follow `feel.*` (in `formal` mode, every radius is `0pt`).
- For complete technical documentation on the engine internals, AST transformations, and extending the template, see [reference.md](reference.md) and [extending.md](extending.md).

## Mandatory Synchronization: Docs & Authoring Skill Updates

Whenever template changes are made — whether adding or changing a component, introducing a new configuration option in `config.toml` or front matter, or adding/altering themes and feels:

1. **Both Documentation Guides MUST Be Updated in Sync:**
   - [docs/doc_en.md](../../docs/doc_en.md) (English guide)
   - [docs/doc_fa.md](../../docs/doc_fa.md) (Persian guide)
   Both files are canonical user guides and must remain identical in content, structure, tables, and examples. Never update one without updating the other.

2. **The Authoring Skill (`bilingual-document-authoring`) MUST Be Updated:**
   - `skills/bilingual-document-authoring/components.md`: Update whenever tags, attributes, or tag behaviors change.
   - `skills/bilingual-document-authoring/config.md`: Update whenever `config.toml` keys, front-matter options, or default values change.
   - `skills/bilingual-document-authoring/SKILL.md`: Update the components index, rules, and checklist.
   - `skills/bilingual-document-authoring/example.md`: Update if standard patterns or skeletons are affected.

3. **Subagent Delegation Requirement:**
   - **Always use a subagent when possible** to perform documentation and authoring skill updates:
     When completing template or component code changes, launch a subagent (via `invoke_subagent`, e.g. with role `Documentation & Skill Synchronizer`) to inspect the modifications and update `docs/doc_en.md`, `docs/doc_fa.md`, and `skills/bilingual-document-authoring/` in parallel.
     This guarantees thorough dual-language documentation, prevents omission of authoring skill updates, and avoids cluttering the primary developer agent's context.

## Common mistakes

- Missing blank lines inside a tag → Markdown shows up as raw text.
- Typed heading numbers while `[heading] numbering = true` → doubled numbers.
- Two numbered lists with only a blank line between them → one list (and one `{...}` style). Separate them with a paragraph or a `{...}` line.
- `۱- item` is not a list item; use `۱.` or `۱)`.
- Image path relative to project root is correct (`images/x.svg`); absolute paths or URLs don't work (download the image into `images/`).
- Unknown `type` on `<alert>` or bad `align` on `<fig>` → compile error listing valid values.
- Units on `<alert radius>` (`"2mm"`) fail; use a plain number there.
- `<cite>` with a key missing from `references.bib`, or `<ref to>` with an unknown id → compile error.
- For Persian heading references, preserve ZWNJ and source spelling, and test the current shared-IR reference normalization; do not rely on legacy cmarker slug behavior.

## Extending the template

**Before creating or changing a theme, feel or component, read [extending.md](extending.md).** It lists what each theme/feel key controls, the direction and alignment rules a component must follow, known Typst pitfalls, the testing protocol (all themes × feels + mobile), and the mandatory documentation synchronization checklist (including subagent delegation). Template internals and helpers are in [reference.md](reference.md).
