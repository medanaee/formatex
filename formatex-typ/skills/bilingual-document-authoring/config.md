# Settings reference

Settings live in two places:

| Where | Scope | Holds |
|-------|-------|-------|
| `config.toml` (project folder) | Every document in the project | Which file is compiled, theme, feel, page, margins, scale, text direction, columns, fonts, paragraphs, headings, list, table, equation and chat defaults |
| Front matter (YAML at the top of a `.md`) | That document only | Page header, footer, cover page, bibliography, and overrides of any `config.toml` setting except `source` |

Front matter wins over `config.toml`. Sections (`heading`, `font`, `paragraph`, `list`, `table`, `equation`, `chat`) are merged key by key: `font: {latin: Lexend}` changes only the Latin font.

Contents: [config.toml](#configtoml) · [Front matter basics](#front-matter-basics) · [Header](#header) · [Footer](#footer) · [Cover](#cover) · [Bibliography](#bibliography) · [Per-heading overrides](#per-heading-overrides) · [Choosing settings](#choosing-settings)

---

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

# "a4" (print) or "mobile" (110 x 245 mm page for phones, one column, header center hidden)
page = "a4"

# A4 margins: "narrow" (15 mm sides), "normal" (about 25 mm), "wide" (35 mm sides)
margin = "normal"

# Size of everything on the page in percent; page size and margins stay. 90 = denser, 115 = larger.
scale = 100

# Text direction: "auto" = every paragraph, heading, list, cell, ... follows its own first letter;
# "rtl" / "ltr" force that direction on everything (code stays left-to-right)
dir = "auto"

# Text columns (1, 2, ...) and which column fills first: "rtl" (right first), "ltr", "auto"
columns = 1
column-dir = "rtl"

[font]
# Leave out to use the feel's fonts. Any installed font name.
# latin = "Lexend"            # English text
# persian = "Vazirmatn"       # Persian text
# code = "Anonymous Pro"      # code

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
numbering = "labelled" # "labelled" = only $$...$$ {#id}, "all" = every display equation, "none"

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
| `page` | `a4`, `mobile` | `a4` | Page size. |
| `margin` | `narrow`, `normal`, `wide` | `normal` | A4 margins. Ignored for `mobile`. |
| `scale` | number (percent) | `100` | Scales text, spacing, corners and rules together. |
| `dir` | `auto`, `rtl`, `ltr` | `auto` | Text direction. `auto`: each block follows its own first letter. `rtl` / `ltr`: everything is forced to that direction, English or Persian alike: paragraphs, headings (Persian digits in `rtl`), lists, tables (column order flips) and cells, quotes, captions and their label («شکل» / "Figure"), alerts, boxes, steps, badges, toc/lof/lot entries, the bibliography, and the header, footer and cover when their own `dir` is `auto`; also the column order when `column-dir = "auto"`. Code stays LTR; `<cetz>` labels, Mermaid diagrams and `<kbd>` keep their own direction. Usually set in front matter (`dir: rtl`); for one part of a document use `<dir>` (components.md). |
| `columns` | integer ≥ 1 | `1` | Text columns. The cover is always one column; `<docheader>` spans all columns; `mobile` forces 1. |
| `column-dir` | `rtl`, `ltr`, `auto` | `auto` | Column order. Use `rtl` for Persian documents and `ltr` for English ones (set it in the front matter if the project default doesn't match). |
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

Fonts per feel (used unless `[font]` sets them): `formal` New Computer Modern + XB Niloofar; `standard` Inter + IRANSans; `friendly` Lexend + Pelak. Code: Anonymous Pro. Only name fonts the user has installed.

---

## Front matter basics

```yaml
---
# any config.toml setting except source, for this document only:
theme: ocean
feel: formal
dir: rtl          # auto | rtl | ltr
columns: 2
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

header: ...
footer: ...
cover: ...
bibliography: ...
---
```

- Must be the very first thing in the file, between two `---` lines.
- **Quote** any text containing `{`, `: ` or ` #`: `end: "صفحه {page} از {pages}"`. Unquoted, `{` starts a YAML table and `#` starts a comment.
- Lists: `["الف", "ب"]` or one `- item` per line.
- An empty value (`color:`) means the default.
- A document has a header only if it has `header:`, and a cover only if it has `cover:`. `enabled: false` inside turns them off again while keeping the settings.
- Booleans are `true` / `false`.

## Header

```yaml
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
| `{page}` | Current page number (the cover is not counted) |
| `{pages}` | Total pages |
| `{section}` | Current top-level section title |
| `{section-number}` | Its number (empty when numbering is off) |

- `{section}` cells stay empty before the first section (e.g. on the contents page).
- A cell made only of placeholders has no letters: set `digits: fa` for Persian digits.
- `center` is hidden on the `mobile` page.

## Footer

Without `footer:` every page shows a plain centered page number. With it:

```yaml
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

## Cover

```yaml
cover:
  # logo: images/logo.png
  institution: "دانشگاه نمونه"
  faculty: "دانشکدهٔ مهندسی کامپیوتر"
  department: ""
  type: "پایان‌نامهٔ کارشناسی ارشد"   # document kind line
  title: "عنوان پژوهش"
  subtitle: ""
  author: "نام نویسنده"               # or a list: ["A", "B"]
  supervisor: "دکتر الف"              # or a list
  advisor: ""                          # or a list
  date: "مهر ۱۴۰۵"
  frame: true                          # border around the page
  dir: auto                            # rtl | ltr | auto (the document's dir, else from title and institution)
  # enabled: false
```

- The cover is a separate first page with no header or page number; page 1 is the page after it.
- Empty fields are left out.
- Field labels follow the cover's language: «نگارش / استاد راهنما / استاد مشاور» or "Author / Supervisor / Advisor".
- Use a cover for theses and formal reports. For papers and notes use `<docheader>` in the body instead.

## Bibliography

```yaml
bibliography:
  file: examples/references.bib   # BibTeX file, path from the project root (this is the default)
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
| Persian thesis | `feel = "formal"`, `theme = "paper"`, heading numbering on, `[list] numbers = "fa"` (or `abjad` for item lists), cover in front matter, `<toc break="true">`, `<lof>`, `<lot break="after">`, `[paragraph] justify = true` |
| Conference-style paper | `feel = "formal"`, `columns: 2`, `column-dir = "rtl"` (Persian), `<docheader>` instead of a cover, `span=all` on wide tables and `span="all"` on wide `<fig>` / `<grid>` / `<code>`, `scale` 85–95 |
| Technical report / tutorial | `feel = "standard"`, header `style: band` or `line`, alerts and steps where useful |
| Reading on a phone | `page = "mobile"` |
| Slides-like handout or casual notes | `feel = "friendly"`, any theme |

Dark themes (`midnight`, `nord`, `zinc`, `dracula`) are for screen reading; use a light theme for print.
