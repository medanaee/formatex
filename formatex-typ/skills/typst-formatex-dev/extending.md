# Adding a theme, feel or component without breaking the template

Read this **before** creating or changing a color theme, a feel or a component. The template is used for Persian (RTL) and English (LTR) at once, on 8 themes × 3 feels × 2 page sizes. Something that looks right in one combination can easily break another. Every rule below comes from a real bug.

For the internals (helpers, tag mechanics) see [reference.md](reference.md); for the user-facing syntax see [SKILL.md](SKILL.md).

## Where things live

| What | File | Object |
|------|------|--------|
| Color themes | `src/themes.typ` | `themes` dictionary |
| Feels (radii, table style, default fonts) | `src/core.typ` | `feels` dictionary |
| Config / front matter / `<include>`, direction detection | `src/core.typ` | `config`, `text-dir`, `content-dir`, `expand-includes` |
| Page, header, footer, cover | `src/page.typ` | `page-header`, `page-footer`, `cover-page` |
| Code / quote / table / heading styling | `src/conf.typ` | `conf` |
| What every file imports | `src/prelude.typ` | template names + `@preview` packages |
| Tag / attribute schema for editors | `tools/export-schema.mjs` | `dist/tags.json` |
| Components (`<alert>`, `<fig>`, ...) | `components/<name>.typ` | exports `<name>-tags` and `<name>-schema` (tags, attributes, allowed values) |
| Registry of all components | `components/_registry.typ` | **generated** by `tools/gen-registry.mjs`; do not edit |
| Helpers used by several components | `src/lib/*.typ` | `tag`, `untag`, `parse-length`, `root-path`, `reference-text`, ... |
| Source preprocessors | `src/preprocess/*.typ` | chain in `pipeline.typ` |
| `{...}` option lines (tables, headings, lists, equations, spans) | `src/lib/option-schema.typ` | `option-schemas` (keys, types, values, defaults, where each may stand); the code reads its allowed keys through `option-keys`, and `export-schema.mjs` writes it under `options` in `dist/tags.json` |
| Color presets for components | `src/core.typ` (`color-presets`), `src/lib/colors.typ` | `tinted`, `resolve-color`; `box-types` lives in `components/alert.typ` |
| One-file build | `tools/bundle.mjs` | writes `dist/formatex.typ` |
| Feature test document | `examples/demo.md` | one section per feature |
| Full build | `tools/build-all.mjs` | `--themes` / `--feels` defaults |

## Golden rules (all three kinds of change)

0. **Every new thing must fit all three feels. This rule is not optional.** A component, header style, marker, frame or any other visual you add must look like it belongs in `formal`, `standard` **and** `friendly`, not just the feel you happened to test. In practice:
   - **`formal` is square everywhere.** No rounded corner, pill, circle-ish box or rounded line cap anywhere in formal; all its radii are `0pt`. A badge, key cap, alert or marker with even a 3pt corner in formal is a bug (the user has had to report this).
   - **`standard` is slightly rounded, `friendly` clearly rounded.** Take the radius from the matching `feel.*` key so the three differ automatically.
   - **If the shape itself differs per feel** (not just the radius), add a feel key with one value per feel, the way `table` (`rules` / `lined` / `card`), `header` and `steps` (`square` / `soft` / `solid`) do. Formal's value must be the most restrained: outlines and rules rather than fills and pills.
   - **Never write a literal radius** (`radius: 4pt`, `radius: 50%`, `cap: "round"`) unless it is inside a branch that only runs for a rounded feel.
   - **Look at the result in all three feels** before reporting success (see [Harmony with the feels](#harmony-with-the-feels) and the [Testing protocol](#testing-protocol)).
1. **No hard-coded colors.** Every color comes from `theme.*`, or from `tinted(...)` / `resolve-color(...)` from `src/lib/colors.typ`. A fixed `rgb("#...")` looks fine on the theme you test and is invisible or garish on the others.
2. **No hard-coded corner radii or fonts.** Radii come from `feel.*`; fonts from `latin-font` / `persian-font` / `code-font`. An explicit attribute (`radius="..."`) may override the feel; nothing else should.
3. **Never assume a direction.** No fixed `dir: rtl`, no "the icon goes on the left". Direction is detected per block from its first letter (see [Direction](#direction-the-most-common-source-of-bugs)).
4. **Never rename or remove** an existing tag, attribute, theme key, feel key or config key. Existing documents (`docs/doc_en.md`, `docs/doc_fa.md`, user files) stop compiling. Add, don't replace; if a value must change, keep the old one working.
5. **Validate input with `assert` and list the valid values** in the message, the way every existing component does:
   `assert(x in names, message: "<tag> x must be one of " + names.keys().join(", ") + ", got " + repr(x))`.
6. **Test on `examples/demo.md`, never on `docs/doc_en.md` / `docs/doc_fa.md`.** Those are the user guides (there is no README); document every change in both of them, with the same content in English and Persian.
7. **Build everything before reporting success**: `node tools/build-all.mjs --source examples/demo.md` (24 PDFs) plus one mobile build. Then look at the pages, not just the exit code (see [Testing protocol](#testing-protocol)).
8. **Mandatory Documentation & Authoring Skill Synchronization (Use Subagents):** Whenever any configuration option, component, theme, or feel is added or modified:
   - Both user guide documents (`docs/doc_en.md` and `docs/doc_fa.md`) MUST be updated in sync (both English and Persian, maintaining identical structure and completeness).
   - The second skill, `skills/bilingual-document-authoring/` (`components.md`, `config.md`, `SKILL.md`), MUST be updated so document authors know about the new components and configuration options.
   - **Delegate to a Subagent:** Whenever possible, use a dedicated subagent (`invoke_subagent`) to perform the updates across `docs/doc_en.md`, `docs/doc_fa.md`, and `skills/bilingual-document-authoring/` to keep development context focused and ensure meticulous dual-language accuracy.
9. **Every fixed length follows `scale`.** Write paddings, gaps, offsets, rule widths and font sizes in `em`, or as `Npt * zoom` (`inset: (x: 8pt * zoom)`, `stroke: 0.5pt * zoom + theme.rule`); feel radii already include `zoom`. A bare `8pt` stays the same size when the user sets `scale = 120` and breaks the proportions. Page size and margins are the only intentionally fixed lengths. Check with `--input scale=130`.

---

## Adding a color theme

### The keys (all nine are required)

A missing key is not caught where you define the theme; it fails later deep inside a component with `dictionary does not contain key "..."`. Copy an existing theme of the same brightness and change values; never delete a key.

| Key | Used for | Guidance |
|-----|----------|----------|
| `dark` | Switches code highlighting to `code-dark.tmTheme`; changes preset tint strengths (`tinted`), icon lightening vs darkening, and how hex colors are toned down | Must match the real brightness of `bg`. A wrong value gives unreadable code and garish alerts. |
| `bg` | Page fill; everything tinted (`tinted`, theorem fill, table header tint) is mixed toward it | Light: near-white or a soft tint. Dark: near-black or a deep tone, not necessarily pure `#000`. |
| `fg` | Body text, default CeTZ strokes, header text in `band` style | Contrast with `bg` about 7:1 or more. Avoid pure black on white: it is harsh (the user asked for this to be softened in `paper`). |
| `heading` | Headings, `<docheader>` title, cover title and institution, theorem/lemma bar, table header text | Clearly distinct from `fg` (hue or weight of color), still ≥ 4.5:1 on `bg`. |
| `muted` | Subtitles, quotes, code line numbers, header text, proof label, ∎, neutral `<alert>` | ≥ 4.5:1 on `bg`; it is used for real text, not decoration. |
| `accent` | Links, `<ref>`, citations, quote bar, definition/corollary bar, `double` header bar | Readable **as text** on `bg` (≥ 4.5:1), because references are colored text. |
| `secondary` | Soft background tints: table header row fill (mixed into `bg`: 8% in `standard`, 16% in `friendly`), highlighted code lines (16% over `code-bg`) | Usually the same as `accent`; a neutral gray when only a few things should carry color (`zinc`). Use it for new large tinted areas; keep `accent` for text and thin marks. |
| `rule` | `set line` stroke, `---` rules, header lines, cover frame, formal table rules, default `<box>` border | Visible but soft. On light themes avoid near-black. |
| `code-bg` | Code blocks, inline code, `band` header, striped rows of `card` tables, code badge | A small step from `bg` (a few % lightness). Too close and code blocks vanish, too far and they shout. |
| `code-stroke` | Code borders, inline code border, row lines of `lined` tables, table frame | One step beyond `code-bg`. |

### Things that depend on the palette but are not keys

- **Color presets** (`purple` ... `pink`) are fixed hues mixed toward `theme.bg`. They adapt automatically, but check them on the new `bg`: a strongly colored background (e.g. sepia) can make some presets muddy. If that happens, adjust `tinted`'s percentages for everyone rather than special-casing one theme.
- **Syntax highlighting**: light themes use Typst's default colors (made for white); dark themes use `code-dark.tmTheme`. A light theme with a strong tint or a dark theme with a light-ish `code-bg` may need checking.
- **Images** (`images/*.svg`) are not themed. Make sure the samples in `examples/demo.md` still read on the new background.

### Steps

1. Add the entry to `src/themes.typ` in the right group (light or dark), with a comment if it imitates something known (as `zinc` does).
2. Add the name to the theme comment in `config.toml`.
3. Add it to the `--themes` default in `tools/build-all.mjs`.
4. Update the counts and lists in the docs: `doc_en.md` / `doc_fa.md` (theme table, "eight themes", "24 PDFs" if the total changes), SKILL.md (theme list in the `config.toml` block, "eight palettes"). Search for `eight`, `24` and an existing theme name such as `dracula` to find every place.
5. Test: `node tools/build-all.mjs --themes <name> --source examples/demo.md`, then check code blocks, both table feels, all alert/box presets, theorem blocks, links, the `band` header, and the cover frame.

---

## Adding a feel

### The keys (all are required)

| Key | Controls | Notes |
|-----|----------|-------|
| `code` | Code block corners | The code badge's top-right corner reuses it so the badge sits flush. |
| `inline` | Inline code corners | Keep small; inline code is only one line tall. |
| `badge` | `<badge>` corners, code badge's bottom-left corner, `<kbd>` key caps (capped at 4pt) | `0pt` in formal. |
| `alert` | `<alert>` corners | `0pt` in formal. |
| `theorem` | Theorem block corners | **Threshold:** above `3pt` boxed theorems switch from a one-sided stroke to a separate pill-shaped bar. A one-sided stroke on a strongly rounded block bends into the corners and looks broken. `0pt` in formal. |
| `box` | `<box>` corners, and the frame of `lined` / `card` tables | |
| `image` | `<img>` corners | |
| `frame` | Cover page frame corners | |
| `band` | `band` header style corners | |
| `heading` | Corners of styled headings (`[heading] fill`) | With `underline` on, only the top corners use it; the bottom stays square under the rule. |
| `table` | `"rules"`, `"lined"` or `"card"` | Only these three exist. A new style means new branches everywhere `style ==` appears in `conf` (fills, strokes, header cells, inset, frame). Do all of them or reuse an existing style. |
| `header` | A header style forced by this feel (`"line"` in `formal`), or `none` to use the document's `header.style` | Must be one of `header-styles` or `none`. Precedence: `--input header-style` > feel `header` > front matter `style`. |
| `steps` | `<steps>` marker style: `"square"`, `"soft"` or `"solid"` (`"solid"` = the `"soft"` colours and strokes on round markers) | A new value needs a branch in the `steps` component (`components/steps.typ`). |
| `latin` / `persian` | Default fonts | `[font]` in `config.toml` overrides them. |

### Fonts

- **The font must be installed.** Run `typst fonts` and check the exact family name. A missing font is **not an error**: Typst warns `unknown font family` and silently falls back, so read the compile output for warnings.
- **Order matters.** Text uses `font: (latin-font, persian-font)`, and Typst takes each character from the first font that has it. If the Latin font also contains Arabic glyphs (many "universal" fonts do), it will render the Persian text too, and the Persian font is ignored. Pick a Latin font without Arabic glyphs, or accept that.
- **The Persian font must cover Persian, not just Arabic**: پ چ ژ گ ک ی, Persian digits ۰–۹, and ZWNJ (نیم‌فاصله). Test with the demo's Persian paragraphs, headings (Persian digits) and the cover.
- Check line height and baseline mixing: a Persian font with very tall ascenders can make mixed lines uneven. Look at mixed paragraphs and the alert icon alignment.

### Steps

1. Add the entry to `feels` in `src/core.typ` with **every** key.
2. Add it to the feel comment in `config.toml` with its radii character and fonts.
3. Add it to the `--feels` default in `tools/build-all.mjs`.
4. Update the feel tables in `doc_en.md`, `doc_fa.md` and SKILL.md (including the font table and table-style row).
5. Test: `node tools/build-all.mjs --feels <name> --source examples/demo.md` on all themes. Look at code blocks with badges, tables, theorem blocks, alerts, the cover, and the header.

---

## Adding a component

### Registration

- Create `components/<name>.typ`, then run `node tools/gen-registry.mjs` (`tools/build-all.mjs` does it). Nothing in `main.typ` changes.
  - The file starts with `#import "/src/prelude.typ": *` (the template's names and the `@preview` packages; add a package there if a component needs a new one) plus `#import "/src/lib/<file>.typ": *` for each shared helper file it uses and exports `#let <name>-tags = ( tag: (attrs, body) => ..., ... )` (closing `)` in column 0). Self-closing tags use `tag: ("void", attrs => ...)`.
  - **Schema (required for every tag):** also export `#let <name>-schema = ( "tag": (kind: "block" | "inline" | "void" | "mixed", description: (en: "...", fa: "..."), attrs: ( "name": (type: "enum" | "bool" | "int" | "number" | "length" | "string" | "path" | "color", values: (...) /* enum only */, default: "...", required: true, doc: (en: "...", fa: "...")) ), children: ("child-tag",), display: "camelCase" /* optional */) )`. The registry checks every attribute of every tag against it before your handler runs (enum, bool, int and number values, required attributes; unknown attributes pass), so a handler needs no `assert` for those. `tools\export-schema.mjs` writes the same data to `dist/tags.json` for editor autocomplete. Keep it in sync with the handler: a missing tag entry stops the build, a missing attribute only hides it from autocomplete.
  - Optional exports: `#let <name>-rules(doc) = { show ...; doc }` for document-wide show rules (a `#show` inside an imported file does not leak out; put `// rules-order: N` on the line above to order it, default 100), and `#let <name>-scope = (...)` merged into cmarker's scope.
  - A tag may be declared by one component only (the generator stops on duplicates). Child tags (`<caption>`, `<item>`) belong to the file of their parent.
  - Code needed by two or more components goes to `src/lib/`, never imported from another component. Private helpers keep a name unique across the project (prefix with the component name): the one-file bundle puts everything in one scope and `bundle.mjs` stops on a duplicate `#let`.
  - **Paths:** Typst resolves a path relative to the file that calls `image()` / `read()` / `csv()`, not to the project. Wrap every user-supplied path with `root-path(...)` (`src/lib/basics.typ`).
- Tag names are lowercase and must not clash with an existing key. Dictionary keys may equal Typst built-in names (`align`, `box`, `grid` exist); **local variables must not** (see [Typst pitfalls](#typst-pitfalls)).
- **Nesting in the schema:** list the tags that may stand inside a tag in its `children`; mark a tag that only makes sense inside such a parent with `scoped: true` (`<item>` in `<grid>`). `export-schema.mjs` derives every tag's `parents` from `children` and warns about a `scoped` tag nobody lists or a `children` entry that isn't a tag.
- Child tags (like `<caption>`, `<item>`) return `tag("kind", attrs, body)`; the parent collects them with `untag(body, "kind")` (direct children) or `find-tagged(body, "kind")` (nested, or after `.join()`).

### Markdown parsing (cmarker)

- A **block** component must be written with its opening tag on its own line and blank lines inside, otherwise the Markdown inside is not parsed. The docs repeat this; keep your examples in the same form.
- An **inline** component (like `<cite>`, `<ref>`) is used inside a paragraph. It must return inline content; a block inside a paragraph splits the paragraph.
- `body` is already-rendered Typst content. To inspect it use `.func()`, `.has("children")`, `.children`; a sequence is `[].func()`, a space is `[ ].func()`. Leading `parbreak`s and spaces are common; skip them (see the alert icon code).
- Markdown syntax inside attributes is **not** parsed (except where a component calls `cmarker.render` on it, like `<docheader>`).

### Attributes

- **All values are strings.** Convert with `parse-length` (bare number = pt; also `pt mm cm in em %`), `parse-ratio`, `int(...)`, `float(...)`, `== "true"`.
- **Bare attributes** (`<align right>`) arrive as keys with an empty value; support them only as a convenience next to an explicit form (`to="right"`).
- Defaults: `attrs.at("key", default: ...)`. If a project-wide default makes sense, read it from `config` (as tables read `[table]`), with the attribute taking precedence. Settings that only make sense per document (like `<bibliography>`'s) are read from `front-matter` instead and documented as front matter keys.
- Reuse the existing vocabularies: `align` values from `align-names`, colors through `resolve-color` (preset names or hex), `dir` as `rtl` / `ltr` / `auto` through `resolve-dir`, `id` for references.

### Harmony with the feels

Golden rule 0 applied to components. Before writing the drawing code, decide what the component looks like in each feel:

| | `formal` | `standard` | `friendly` |
|---|---|---|---|
| Corners | square (`0pt`) | small radius | large radius |
| Markers, dots, numbers | outlined squares, thin rules | soft tinted shapes | solid filled shapes |
| Lines and bars | thin, square caps | normal | thicker, may be rounded |
| Fills | none or very light | light tint | stronger tint |

- Read the radius from the closest existing key (`feel.badge` for small inline pills, `feel.box` for blocks, `feel.alert`, `feel.code`, ...). If none fits, add a new key to all three feels and document it in [the feel keys table](#the-keys-all-are-required).
- Capping a radius (`calc.min(feel.badge, 4pt)`) is fine; a floor (`calc.max(..., 2pt)`) is not, because it rounds formal.
- `50%` (circles, pills) and `cap: "round"` belong only in branches that run for rounded feels; see the `steps` component: formal and standard markers use `radius: feel.box` (square / rounded square), only friendly gets circles.
- Parts that join into one shape (consecutive highlighted code lines) stay square in every feel; rounding each piece leaves notches at the joins.
- Existing examples to copy: tables (`feel.table`), the page header (`feel.header`), `<steps>` (`feel.steps`), theorem blocks (stroke vs. pill bar by `feel.theorem`).

### Colors

- Container fill / border / icon: `resolve-color(name)` returns `(fill, border, icon)` for a preset or hex; `tinted(hue)` for a hue of your own. Both are theme-aware.
- Text inside a component stays `theme.fg` (or `heading` / `muted` / `accent` by role).
- Never put a light pastel fill on a dark theme or a dark fill on a light one; that is what `tinted` prevents.

### Direction (the most common source of bugs)

- Text direction is decided per paragraph, heading, list and table cell by the **first letter** (`text-dir`). Code and math are skipped. RLM (`&rlm;`) forces RTL, LRM forces LTR. A Persian paragraph that starts with an English word is LTR unless it starts with RLM; your examples in `examples/demo.md` must account for this.
- If the **layout** depends on direction (which side an icon, bar or number goes), compute it from the content: `is-rtl(body)` / `text-dir(body)`, or `resolve-dir(attrs.at("dir", default: "auto"), body)` inside `context`. Then `set text(dir: ...)` on the container.
- **Let Typst mirror for you.** Grid columns and `start` / `end` alignment flip automatically in RTL. Prefer `grid(columns: (auto, 1fr), icon, body)` under the right `text(dir:)` over `if rtl { right } else { left }`. Where a physical side is unavoidable (one-sided strokes), derive it from the direction as the theorem blocks do.
- **Full width.** A container narrower than its parent shrinks RTL paragraphs and pushes them to the left. Give blocks `width: 100%` and wrap the body in `block(width: 100%, body)`.
- **Inline components** run before the paragraph's direction is set, so `text.dir` is wrong there. Use `last-dir.get()` (inside `context`) for "the language of the surrounding sentence", as `<ref>` does.
- **Content without letters** (only math, only an image) has no direction; fall back to `last-dir.get()`.
- **Words and digits follow the direction**: Persian label + Persian digits (`digits(n, true)`) in RTL, English label + Latin digits in LTR (see «شکل ۱» / "Figure 1").
- **Mixed strings in a forced-direction line** (e.g. a Persian title inside an LTR row) need Unicode isolates `\u{2067}` (RLI) or `\u{2066}` (LRI) ... `\u{2069}` (PDI), as `<toc>` does.
- **CeTZ / positioned labels** are not paragraphs; give each one `text(dir: text-dir(label))`.

### Alignment

- If the component positions itself explicitly (`align(center, ...)`), it must follow an enclosing `<align>`: inside `context`, use `align(align-names.at(inherited-align("center")), ...)`, and accept all of `align-names` (`center left right start end`) in its own `align` attribute.
- Content inside a component inherits `<align>` automatically. If some part must not move (code lines, a number column), set its alignment explicitly, as the code block rule does with `set align(left)`.

### Vertical centering of icons and text

- Text boxes are measured from `top-edge` to `bottom-edge` (`cap-height` to `baseline` by default), not the glyph bounds. To center an icon on a line, give the icon `top-edge: "bounds", bottom-edge: "bounds"` and center it in a box whose height is the measured line (see the code badge and the `<alert>` icon). Top-aligning an icon against text is always visibly off.

### References, counters and state

- To make the component referenceable: place `[#metadata((my-kind: ...))#label(id)]` (or label a `figure`), and extend `reference-text` in `src/lib/refs.typ` so `<ref>` prints «... ۱» / "... 1". Do not attach a label to content cmarker already labelled (headings have slug labels): "content labelled multiple times".
- Counters: one per kind (`counter("theorem-" + kind)`), stepped where the element appears.
- State is global by its key string. Reset it after use (the `table-options` pattern), and use a stack for anything that can nest (the `align-stack` pattern: push before the body, pop after).

### Size and scaling

- Use `layout(region => ...)` when the component needs the available width, and `measure(...)` (inside `context`) for natural sizes.
- Never enlarge with `scale`: it scales the text too. Shrink only (`calc.min(1, ...)`), as `<fig>` does with drawings.
- Relative heights (`%`) inside an auto-height row resolve against the page, not the row. Measure the content and use absolute lengths (see the theorem pill bar).

---

## Typst pitfalls

Each of these has broken this template before:

- **Shadowing built-ins.** `let content = ...` makes every `type(x) == content` check false; `let align = ...`, `let box = ...`, `let text = ...` break later calls the same way. Use descriptive names (`directed-content`, `icon-cell`).
- **Keywords as tag names.** A tag named like a Typst keyword (`include`, `import`, `set`, `show`, `let`, `if`, `for`, `return`, `context`, ...) must be a quoted key in both `<name>-tags` and `<name>-schema`: `"include": (attrs, body) => ...`.
- **`set` / `show` inside an `if { }` block only apply inside that block.** Branch inside the closure instead: `show x: it => if cond { ... } else { it }`.
- **Definition order.** A module-level function can only use names defined above it (e.g. `page-name` must come before `page-header`).
- **`context` is required** for `measure`, `query`, `state.get()`, `counter.get()`, `here()`, and for reading `text.dir`.
- **Show rules and recursion.** A `show table` rule that rebuilds the table triggers itself again; guard it (see `table-has-widths`).
- **Trailing breaks.** Markdown bodies often end with `parbreak` / spaces; strip them when something must follow the last line (the proof's ∎, code's empty last line).
- **Parallel edits and compiles.** If you edit and compile in the same batch of tool calls, the compile may see the old file. Compile after the edits finish.

---

## Testing protocol

1. **Add a section to `examples/demo.md`** for the feature (or extend the matching section). Cover:
   - the default (no attributes) and every attribute value,
   - Persian **and** English content (and a Persian paragraph starting with an English word),
   - nesting where it makes sense: inside `<item>`, `<alert>`, `<align>`; with a table, code block or image inside,
   - error-prone edges: empty body, a single line, a long multi-line body.
2. **Compile and look**:
   ```powershell
   typst compile main.typ "$env:TEMP\t-{p}.png" --input source=examples/demo.md --ppi 80
   ```
   View the PNGs of the affected pages. For alignment details render at `--ppi 200` and crop.
3. **Build every combination**: `node tools/build-all.mjs --source examples/demo.md` must print `ok` 24 times. Then:
   `typst compile main.typ out\demo-mobile.pdf --input source=examples/demo.md --input page=mobile`.
4. **Inspect visually** at least: one light theme (`paper`) and one dark (`zinc` or `midnight`); **the new feature in each of the three feels** (formal must have no rounded corners at all); the mobile build.
5. **Read the compiler output** for warnings (fonts, deprecated features), not only the exit code.
6. **Clean up**: delete scratch `.md` files and temporary PNGs; leave `docs/doc_en.md`, `docs/doc_fa.md` and `config.toml` unchanged unless the task was to change them.

## Documentation checklist

| Change | Update |
|--------|--------|
| Any | `examples/demo.md` section; `docs/doc_en.md` and `docs/doc_fa.md`; `SKILL.md`; `skills/bilingual-document-authoring/` (`components.md` or `config.md`) |
| Theme | `src/themes.typ`, `config.toml` theme comment, `tools/build-all.mjs --themes`, theme counts and tables in `docs/doc_en.md` / `docs/doc_fa.md` / SKILL.md / `skills/bilingual-document-authoring/config.md` |
| Feel | `feels`, `config.toml` feel comment, `tools/build-all.mjs --feels`, feel tables in `docs/doc_en.md` / `docs/doc_fa.md` / SKILL.md / `skills/bilingual-document-authoring/config.md` |
| Component | `<name>-schema` in `components/<name>.typ`, "Components" section of `docs/doc_en.md` and `docs/doc_fa.md`, SKILL.md component section, `skills/bilingual-document-authoring/components.md`, `reference.md` if it adds a helper or a mechanism, "Common mistakes" if it has a trap |
| New `{...}` option | the group in `src/lib/option-schema.typ` (the key list in the code follows it), the code that applies it, "Table options" / "Heading look" / "Lists" in `docs/doc_en.md` / `docs/doc_fa.md`, `skills/bilingual-document-authoring/components.md` |
| New config key | `config.toml` (commented, with default) or, if per document, the front matter docs; "Configuration" in `docs/doc_en.md` / `docs/doc_fa.md`; SKILL.md config block; `skills/bilingual-document-authoring/config.md` |

> [!IMPORTANT]
> **Subagent Delegation Requirement:**
> Whenever possible, launch a dedicated subagent (via `invoke_subagent`, e.g. role `Documentation & Skill Synchronizer`) to apply the required documentation updates across `docs/doc_en.md`, `docs/doc_fa.md`, and `skills/bilingual-document-authoring/`. This ensures thorough dual-language documentation in English and Persian while keeping the primary agent focused on core template implementation.

Write the docs in the style already there: what it does, the syntax, a table of attributes with defaults, then short bullets of rules. Comments in code only state constraints the code cannot show.
