# Settings reference

Shared-core checkpoint (2026-11-12): core configuration domains are enforced. Use shared root/tables plus `html` / `typ` output overrides; paged-only keys (page, margin, columns, header/footer and related keys) belong under `typ`, and HTML-only copy-button belongs under `[html.code]` or local `html.copy-button`. Root paged keys, bare HTML copy-button and old `[html] copy-code` are rejected. The source template is `formatex-core/config.toml`; standalone/app copies consume it. Shared-core app test/build integration passes; complete property/control, map/diagnostic/export fixtures and real Android native interaction remain separate gates. See [the active plan](../../../formatex-app/docs/tasks/shared-core-pdf-html-plan.md).

Settings live in two places:

| Where | Scope | Holds |
|-------|-------|-------|
| `config.toml` (project folder) | Every document in the project | Which file is compiled, theme, feel, page, margins, scale, text direction, columns, fonts, paragraphs, headings, list, table, equation and chat defaults |
| Front matter (YAML at the top of a `.md`) | That document only | Page header, footer, bibliography, and overrides of any `config.toml` setting except `source` |

After schema defaults, precedence is project shared -> project selected output -> document shared -> document selected output -> local shared -> local selected output. Merge tables by key: `font: {latin: Lexend}` changes only the Latin font. Keep one config with common root/tables and `html` / `typ` overrides; use `{{ setting.html.code.copy-button }}` without changing kebab-case. Local props do not mutate global `setting`.

Contents: [HTML output language](#html-output-language) · [config.toml](#configtoml) · [Front matter basics](#front-matter-basics) · [Header](#header) · [Footer](#footer) · [Cover migration](#cover-migration) · [Bibliography](#bibliography) · [Per-heading overrides](#per-heading-overrides) · [Choosing settings](#choosing-settings)

---

## HTML output language

HTML math is selected with `[html] math = "katex"` (default) or `"native"`; `[html] width = "standard"` (default; `"narrow"`, `"standard"`, or `"wide"`) sets the reading column width; `--input html-math=native` overrides math for one build. KaTeX's rendered HTML, CSS and WOFF2 fonts are embedded offline only when the document contains KaTeX math markers. No CDN or other network resource is needed. Export HTML directly uses the `[html]` settings in `config.toml` and front matter.

The independent HTML renderer receives `uiLanguage: "fa" | "en"` from its host. The app passes its current interface language for preview/export, independently of the document's language/direction. This controls viewer toolbar, menus, outline and copy controls. The former Typst `--input html-ui-lang`/`target=html` route is superseded; use the app export or the `formatex-html` API. `uiLanguage` is not a document configuration key.

The app's live HTML preview reuses compilation and font data and updates the existing page when possible. This does not introduce a setting or a different document format: use the same Markdown, tags, front matter and `[html]` options for preview and export. The standalone Export command keeps font-subset embedding when `embed-fonts` is enabled.

Native HTML blocks use the merged document `dir`: `auto` retains per-block detection, while `rtl` / `ltr` stay forced across main content, lists, tables, quotes and alerts. `[paragraph]` justification and line/letter/word spacing, table `head-align` / `body-align`, and heading look settings apply to HTML as well. Heading `max-level` is relative to the top outlined heading. Global `[list]` settings and local `{...}` list options share their numbering/marker behavior between PDF and HTML; unordered markers are text, while `guides` remain PDF-only drawings. Task lists render as animated SVG checkboxes that are interactive when `editable=true` (updating any `progress=true` bar live), persisting per-file state in `localStorage` (`fx-tasks:v1:<pathname>`) in standalone HTML and in viewer state during live preview.

`[html] toolbar = true` also provides the viewer's Find magnifier, reachable on a phone or with Ctrl / Cmd + F. It searches rendered document text literally and case-insensitively across text nodes, with previous/next and a localized count; Enter / Shift + Enter move between matches and Escape closes it. Script/style text and code-copy controls are excluded, and live content updates refresh the results. It does not replace source-editor find/replace. Native HTML word spacing uses percentages where supported, with an `em` fallback for older browsers.

When `[html] toolbar = true`, `[html] magnifier = true` (default) also adds a magnifying glass (loupe) button to the HTML viewer toolbar. Clicking it shows a movable magnifying glass over the document (`Shift`/`Alt` + scroll wheel adjusts lens magnification; `Escape` exits). Set `magnifier = false` in `config.toml` or `html: { magnifier: false }` in front matter to hide/disable it.

## config.toml

TOML syntax. **All top-level keys must come before the first `[section]`.** A complete file with every key (values shown are the defaults unless noted):

```toml
# Markdown file to compile (relative to the project folder). Only settable here.
source = "doc.md"

# Color theme. Light: paper, sepia, ocean, sage. Dark: midnight, nord, zinc, dracula.
theme = "paper"

# Overall feel: corner rounding, table style, default fonts.
#   formal   = square corners, academic rules on tables, plain header rule
#   standard = slightly rounded
#   friendly = very rounded, casual
feel = "formal"

# desktop-a4 (default), desktop-a3, desktop-a4-landscape, desktop-a5, desktop-a6, desktop-b4, desktop-b5, desktop-letter,
# desktop-legal, desktop-tabloid, desktop-square; for phones mobile-16-9, mobile-18-9, mobile-20-9, mobile-21-9
# (110 mm wide, one column, header center hidden); or "custom" with page-width / page-height (mm, cm, in, pt).
# A custom page narrower than 120 mm gets the phone rules too. Old names "a4" and "mobile" still work.
# page-width = "148mm"
# page-height = "210mm"

# Page margins: "narrow" (15 mm sides), "normal" (about 25 mm), "wide" (35 mm sides)

# Size of everything on the page in percent; page size and margins stay. 90 = denser, 115 = larger.
scale = 100

# Text direction: "auto" = every paragraph, heading, list, cell, ... follows its own first letter;
# "rtl" / "ltr" force that direction on everything (code stays left-to-right)
dir = "auto"

# Text columns (1, 2, ...) and which column fills first: "rtl" (right first), "ltr", "auto"

[typ]
page = "desktop-a4"
margin = "normal"
columns = 1
column-dir = "rtl"

[font]
# Leave out to use the feel's fonts. Any installed (or app-bundled) font name.
# latin = "Lexend"            # English text
# persian = "Vazirmatn"       # Persian text
# code = "Anonymous Pro"      # code (default: Anonymous Pro in formal, Vazir Code in standard/friendly)

[paragraph]
justify = false        # true = lines flush on both sides
letter-spacing = 0     # extra space between letters, % of font size (2 looser, -2 tighter)
line-spacing = 100     # gap between lines, % of normal (150 airier, 80 tighter)
word-spacing = 100     # width of spaces, % of normal (85 tighter)

[heading]
numbering = true       # automatic heading numbers (default false)
number-prefix = ""     # text before the number: "(" with number-suffix ")" -> «(۱) مقدمه»
number-suffix = ""     # text after the number: "" -> «۱ مقدمه», "." -> «۱. مقدمه», " -" -> «۱ - مقدمه»
underline = false      # rule below the heading
fill = false           # tinted background behind the heading
max-level = 2          # deepest level that gets underline/fill: 1 = sections, 2 = also subsections
color = ""             # Tailwind color (blue, orange, ..., optionally blue-700), hex, or "" = theme color

[list]
numbers = "auto"       # auto | fa | en | fatxt | rome | abc | abjad | alefba
prefix = ""            # text before the number: "(" with suffix ")" -> «(۱)»
suffix = "."           # text after the number: "." ")" "-" ":" ""
# marker = "disc,circle,dash"   # bullets, one per nesting level (default Typst's • ‣ –)
# indent = "1em"                # extra indent of every list (default none)

[table]
width = "auto"         # "full" = full text width, "auto" = content width
align = "center"       # where auto-width tables sit: center | left | right
span = "column"        # multi-column documents: "column" or "all" (float across all columns)

[equation]
numbering = "labelled" # "labelled" = only $$ or %% with {#id}, "all" = every display equation, "none"

[chat]
style = "auto"         # auto (from the feel) | transcript | assistant | bubbles
user-name = ""         # "" = «شما» / "You"
ai-name = ""           # "" = «هوش مصنوعی» / "AI"
user-icon = "user"     # Font Awesome names
ai-icon = "robot"
user-color = ""        # preset or hex; "" = theme accent
ai-color = ""          # "" = theme secondary color
frame = true           # frame around the whole chat
width = "80%"          # widest bubble: % of the line or a length
```

### Keys in detail

| Key | Values | Default | Effect |
|-----|--------|---------|--------|
| `source` | file name | `doc_en.md` | The Markdown file that is compiled. Not allowed in front matter. |
| `theme` | `paper`, `sepia`, `ocean`, `sage`, `midnight`, `nord`, `zinc`, `dracula` | `paper` | Page, text, heading and accent colors. |
| `feel` | `formal`, `standard`, `friendly` | `formal` | Corner rounding of every element, table style, step markers, default fonts. `formal` is fully square and always uses a plain ruled header. |
| `typ.page` | `desktop-a4`, `desktop-a3`, `desktop-a4-landscape`, `desktop-a5`, `desktop-a6`, `desktop-b4`, `desktop-b5`, `desktop-letter`, `desktop-legal`, `desktop-tabloid`, `desktop-square`, `mobile-16-9`, `mobile-18-9`, `mobile-20-9`, `mobile-21-9`, `custom` | `desktop-a4` | Page size. `mobile-*` and a `custom` page narrower than 120 mm are phone pages (one column, own margins, no header `center`). `a4` / `mobile` still work. |
| `page-width`, `page-height` | length (`148mm`, `6in`, `420pt`) | `210mm`, `297mm` | Size of a `custom` page, 40–5000 mm. |
| `components` | list of paths, or paths separated by commas | none | Typst files of the project that define tags of its own (any number of tags per file, any file name, anywhere in the project). In the front matter they are added to those of `config.toml`. Only the `.typ` files named here are loaded. |
| `typ.margin` | `narrow`, `normal`, `wide` | `normal` | Page margins (scale with the page). Ignored on phone pages. |
| `scale` | number (percent) | `100` | Scales text, spacing, corners and rules together. |
| `dir` | `auto`, `rtl`, `ltr` | `auto` | Text direction. `auto`: each block follows its own first letter. `rtl` / `ltr`: everything is forced to that direction, English or Persian alike: paragraphs, headings (Persian digits in `rtl`), lists, tables (column order flips) and cells, quotes, captions and their label («شکل» / "Figure"), alerts, boxes, steps, badges, toc/lof/lot entries, the bibliography, and the header and footer when their own `dir` is `auto` (the `<cover>` tag resolves in its surrounding direction context); also the column order when `column-dir = "auto"`. Code stays LTR; `<cetz>` labels, Mermaid diagrams and `<kbd>` keep their own direction. Usually set in front matter (`dir: rtl`); for one part of a document use `<dir>` (components.md). |
| `typ.columns` | integer ≥ 1 | `1` | Text columns. The cover is always one column; `<docheader>` spans all columns; a phone page forces 1. |
| `typ.column-dir` | `rtl`, `ltr`, `auto` | `auto` | Column order. Use `rtl` for Persian documents and `ltr` for English ones (set it in the front matter if the project default doesn't match). |
| `[font] latin` / `persian` / `code` | font name | from the feel | Fonts. Latin is tried first for each character, then Persian. |
| `[paragraph] justify` | `true` / `false` | `false` | Justified text. Tables and code are never justified. |
| `[paragraph] letter-spacing` | number | `0` | Persian letters stay joined. |
| `[paragraph] line-spacing` | number ≥ 0 | `100` | |
| `[paragraph] word-spacing` | number | `100` | |
| `[heading] numbering` | `true` / `false` | `false` | Persian headings get Persian digits, English ones Latin digits. Numbering is continuous; starting headings at `##` gives `1`, `1.1` (not `0.1`). |
| `[heading] number-prefix` | text | `""` | Shown before the number in the heading itself (not in the TOC or references). |
| `[heading] number-suffix` | text | `""` | Shown after the number in the heading itself (not in the TOC or references). |
| `[heading] underline` | `true` / `false` | `false` | |
| `[heading] fill` | `true` / `false` | `false` | |
| `[heading] max-level` | integer | `2` | Counted from the document's top heading level. |
| `[heading] color` | preset, hex, `""` | `""` | Base color of heading text, rule and tint (only for headings that get underline/fill). |
| `[list] numbers` | `auto`, `fa`, `en`, `fatxt`, `rome`, `abc`, `abjad`, `alefba` | `auto` | Numbers of numbered lists, at every nesting level. `auto` = Persian digits in an RTL list, Latin in an LTR one (the list's first letter, or a forced `dir`); `fa` ۱ ۲ ۳; `en` 1 2 3; `fatxt` Persian words (یک، دو، … بیست و یک, up to thousands); `rome` I II III; `abc` a b c; `abjad` الف ب ج د … (28 letters); `alefba` الف ب پ ت … (32 letters). Past the letters, Persian digits. |
| `[list] prefix` | text | `""` | Before the number: `"("` with `suffix` `")"` gives «(۱)». |
| `[list] suffix` | text | `"."` | After the number: `"."` «۱.», `")"` «۱)», `"-"`, `":"`, `""`. |
| `[list] marker` | character or name, comma-separated per level | Typst's (• ‣ –) | Bullets of unnumbered lists. Names: `disc` •, `circle` ◦, `square` ▪, `dash` –, `triangle` ‣, `arrow` →, `check` ✓, `star` ★, `none`. `"disc,circle,dash"` = one per nesting level. |
| `[list] indent` | length (`"1.5em"`, `"5mm"`, bare number = pt) | none | Extra indent of every list. |
| `[table] width` / `align` / `span` | see above | `auto` / `center` / `column` | Defaults; a `{...}` line above a table overrides them. |
| `[equation] numbering` | `labelled`, `all`, `none` | `labelled` | |
| `[chat] style` | `auto`, `transcript`, `assistant`, `bubbles` | `auto` | Look of every `<chat>`. `auto`: `formal` → `transcript`, `standard` → `assistant`, `friendly` → `bubbles`. |
| `[chat] user-name` / `ai-name` | text | `""` | `""` = «شما» / "You" and «هوش مصنوعی» / "AI" by the chat's language. |
| `[chat] user-icon` / `ai-icon` | Font Awesome name | `user` / `robot` | Avatar icons. |
| `[chat] user-color` / `ai-color` | preset or hex | `""` | `""` = the theme's accent / secondary color. |
| `[chat] frame` | `true` / `false` | `true` | Frame around the whole chat. |
| `[chat] width` | percent or length | `"80%"` | Widest a bubble gets. |
| `[chat] title` / `dir` | as on `<chat>` | none / `auto` | Accepted too, but usually set per chat. Every `[chat]` key is overridden by the same attribute on a `<chat>` tag (components.md). |
| `[html] math` | `katex`, `native` | `katex` | Pre-rendered KaTeX HTML vs native browser MathML. |
| `[html] width` | `narrow`, `standard`, `wide` | `standard` | Reading column width (`42rem`, `54rem`, `72rem`). |
| `[html] magnifier` | `true` / `false` | `true` | Magnifying glass (loupe) button in the HTML viewer toolbar (requires `[html] toolbar = true`; `Shift`/`Alt` + scroll wheel adjusts magnification, `Escape` exits). Set `html: { magnifier: false }` in front matter to disable per document. |

Fonts per feel (used unless `[font]` sets them): `formal` New Computer Modern + XB Niloofar (code: `Anonymous Pro`); `standard` Inter + IRANSans (code: `Vazir Code`); `friendly` Lexend + Pelak (code: `Vazir Code`). `Vazir Code` is bundled in the app for both PDF and HTML, and Persian text inside inline code and code blocks automatically falls back to `Vazir Code` in every feel (including `formal` and custom `[font] code` overrides). Only name fonts the user has installed or that the app bundles. In the app's HTML embedding, an installed exact family such as `CMU Serif` wins over alias fallbacks. If an alias is needed because the family is missing, the fallback is registered under the requested CSS family name; this does not change the formal feel's default.

HTML selects regular/bold faces by nearest weight per required style, including real CMU Serif regular faces at weight 500. Stock NewCM uses browser-compatible quadratic-outline copies only for HTML embedding, preserving metrics and shaping; the original PDF font selection remains unchanged. This requires no different authoring syntax or font setting.

---

## Front matter basics

```yaml
---
# any config.toml setting except source, for this document only:
theme: ocean
feel: formal
dir: rtl          # auto | rtl | ltr
typ:
  columns: 2
  header: ...
  footer: ...
heading:
  numbering: true
  number-suffix: "."
paragraph:
  justify: true
list:
  numbers: abjad
  suffix: ")"
chat:
  ai-name: "دستیار پژوهشی"

bibliography: ...
---
```

- Must be the very first thing in the file, between two `---` lines.
- **Quote** any text containing `{`, `: ` or ` #`: `end: "صفحه {page} از {pages}"`. Unquoted, `{` starts a YAML table and `#` starts a comment.
- Lists: `["الف", "ب"]` or one `- item` per line.
- An empty value (`color:`) means the default.
- A document has a header only if it has `typ.header`; `enabled: false` inside turns it off while keeping the settings. A cover is a `<cover>` block in the body.
- Booleans are `true` / `false`.

## Header

```yaml
typ:
  header:
    style: line                       # minimal | line | band | double
    start: "عنوان کوتاه سند"          # start side (right in RTL)
    center: ""
    end: "صفحه {page} از {pages}"
    dir: auto                         # rtl | ltr | auto (the document's dir, else from the header text)
    skip-first-page: true             # no header on page 1 (default true)
    digits: auto                      # fa | en | auto (Persian when the text is RTL)
    # logo: images/logo.png           # small logo before the start text
    # enabled: false
```

| Style | Look |
|-------|------|
| `minimal` | Text only |
| `line` | Text with a rule below |
| `band` | Shaded strip |
| `double` | Accent bar above, rule below |

The `formal` feel always draws `line`.

Placeholders in `start`, `center`, `end`:

| Placeholder | Value |
|-------------|-------|
| `{page}` | Current page counter; the body page immediately after a `<cover>` starts again at 1 |
| `{pages}` | Final page counter value; with a cover at the beginning, this is the number of body pages |
| `{section}` | Current top-level section title |
| `{section-number}` | Its number (empty when numbering is off) |

- `{section}` cells stay empty before the first section (e.g. on the contents page).
- A cell made only of placeholders has no letters: set `digits: fa` for Persian digits.
- `center` is hidden on a phone page.

## Footer

Without `typ.footer` every page shows a plain centered page number. With it:

```yaml
typ:
  footer:
    style: plain                # plain | line (rule above)
    start: ""                   # start side
    center: "{page}"
    end: ""
    digits: fa                  # fa | en | auto
    dir: auto                   # rtl | ltr | auto (the document's dir, else from the footer text)
    skip-first-page: false      # default false
    # enabled: false            # no footer and no page number at all
```

- Same placeholders as the header. Every key is optional: `footer: { center: "صفحه {page} از {pages}" }` is enough.
- `start` and `end` sit at the sides only when both are set; otherwise everything is centered.
- The cover never gets a footer.

## Cover migration

A cover is body content, not a config/front-matter setting. Place `<cover ...></cover>` where its page belongs; the [component reference](components.md#cover-standalone-cover-page) lists every attribute and the optional Markdown body. The default is `frame="false"`, and attributes are explicit or use declared `{{ }}` values; top-level readonly metadata does not automatically fill the tag.

**Breaking change:** remove old `cover:` / `[cover]` settings and move their fields to the tag. Old cover configuration and CLI switches have no effect; remove the tag to omit the cover. A PDF cover is one unnumbered, header/footer-free, single-column page and resets the following body page to 1. Native HTML uses the effective page height with internal scrolling for extra information. `<dir>` around the tag affects its automatic direction.

## Bibliography

```yaml
bibliography:
  file: examples/references.bib   # BibTeX file, relative to this .md file (start with / for project root; default: /examples/references.bib)
  style: ieee              # any CSL style name: ieee, apa, chicago-author-date, harvard-cite-them-right, ...
  title: "منابع"           # heading of the reference list ("References" for English)
  dir: auto                # auto = each entry in its own language's direction; ltr | rtl
```

Every key is optional (defaults: `examples/references.bib`, `ieee`, «منابع», and the document's `dir`). Attributes on `<bibliography>` override these.

## Per-heading overrides

Any heading can override `numbering`, `number-prefix`, `number-suffix`, `toc`, `underline`, `fill` and `color` for itself, in braces at the end of its line (with or without an `#id`):

```markdown
## سپاسگزاری {numbering=false}
## پیشگفتار {numbering=false toc=false}
## جمع‌بندی {#sec-summary fill=true underline=false color=purple}
### یادداشت {number-suffix="." color="#0f766e"}
```

- Booleans are `true` / `false`; quote values with spaces.
- An unnumbered heading does not use up a number.
- `toc=false` leaves the heading out of `<toc>` and the header's `{section}`; it stays in the text.
- Setting `fill` or `underline` on a heading styles it even if it is deeper than `max-level`.
- `max-level` cannot be set per heading.

---

## Choosing settings

| Document | Suggested settings |
|----------|--------------------|
| Persian thesis | `feel = "formal"`, `theme = "paper"`, heading numbering on, `[list] numbers = "fa"` (or `abjad` for item lists), `<cover>` before the contents, `<toc break="true">`, `<lof>`, `<lot break="after">`, `[paragraph] justify = true` |
| Conference-style paper | `feel = "formal"`, `typ: {columns: 2}`, `[typ] column-dir = "rtl"` (Persian), `<docheader>` instead of a cover, `span=all` on wide tables and `span="all"` on wide `<fig>` / `<grid>` / `<code>`, `scale` 85–95 |
| Technical report / tutorial | `feel = "standard"`, header `style: band` or `line`, alerts and steps where useful |
| Reading on a phone | `page = "mobile-20-9"` |
| Slides-like handout or casual notes | `feel = "friendly"`, any theme |

Dark themes (`midnight`, `nord`, `zinc`, `dracula`) are for screen reading; use a light theme for print.
