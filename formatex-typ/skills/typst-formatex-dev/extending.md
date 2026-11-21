# Adding a theme, feel or component without breaking the template

Read this **before** creating or changing a color theme, a feel or a component. The template is used for Persian (RTL) and English (LTR) at once, on 8 themes × 3 feels × 2 page sizes. Something that looks right in one combination can easily break another. Every rule below comes from a real bug.

## Shared source ownership checkpoint

Core now owns `formatex-core/components/<name>/` packages containing `typst.typ`, `html.tsx`, `manifest.toml`, `schema.json`, `docs.json` and `html.css`. Keep schema/docs as shared JSON data, not duplicate renderer declarations. Regenerate the standalone distribution with `node tools/sync.mjs` from `formatex-typ/`; edit the core/pdf source owners rather than generated source copies.

The normal document path invokes Rust/WASM pulldown-cmark inside Typst and feeds shared IR to independent PDF/HTML backends. Nine Rust parser tests pass, including Unicode/source spans, Persian/Arabic list restarts and rich/fenced-code properties. Frontend integration: 373 passed; native: 66 passed/5 ignored; typecheck and production build pass, with nine existing lint warnings. The 24 PDF theme/feel builds plus mobile compile, selected PDF visual checks, 360/768/1280 px browser checks and isolated one-file/custom-package/relocated standalone tools are verified. Complete component-property parity, full map/diagnostic/export coverage and real Android native interactive UI remain separate gates. HTML content is static SSR with a hydrated React viewer shell; arbitrary component events/state and live variable/DSL reactivity are not implemented. See [the active plan](../../../formatex-app/docs/tasks/shared-core-pdf-html-plan.md).

`node tools/sync.mjs` builds the current core WASM and assembles core+pdf into this distribution. The local `tools/registry.mjs` is copied from core: `gen-registry`, `build-all`, `bundle` and `schema` run against this synced snapshot after relocation without sibling checkouts. Sync again to consume changed core/pdf sources. Install workspace dependencies from the workspace root; a relocated standalone snapshot can install its own tooling dependency. Document inputs remain external to the bundle.

For the internals (helpers, tag mechanics) see [reference.md](reference.md); for the user-facing syntax see [SKILL.md](SKILL.md).

## Where things live

| What | File | Object |
|------|------|--------|
| Color themes | `src/themes.typ` | `themes` dictionary |
| Feels (radii, table style, default fonts) | `src/core.typ` | `feels` dictionary |
| Config / front matter / `<include>`, direction detection | `src/core.typ` | `config`, `text-dir`, `content-dir`, `expand-includes` |
| Page, header, footer, cover | `src/page.typ` and `components/cover/typst.typ` | Page/header/footer helpers; the `<cover>` component invokes standalone cover layout at its body position |
| Code / quote / table / heading styling | `src/conf.typ` | `conf` |
| What every file imports | `src/prelude.typ` | template names + `@preview` packages |
| What a component imports | `src/kit.typ` | the prelude plus the helper libraries (`basics`, `colors`, `widgets`, `refs`, `lists`, `mitex`, `latex-code`) |
| Tag / attribute schema for editors | `tools/export-schema.mjs` | `dist/tags.json` |
| Components (`<alert>`, `<fig>`, ...) | `formatex-core/components/<name>/` | `typst.typ`/`html.tsx` implementations, `html.css`, `manifest.toml`, shared `schema.json` and `docs.json` |
| Registry of all components | `components/_registry.typ` | **generated** by `tools/gen-registry.mjs`; do not edit |
| Helpers used by several components | `src/lib/*.typ` | `tag`, `untag`, `parse-length`, `root-path`, `reference-text`, ... |
| Source preprocessors | `src/preprocess/*.typ` | chain in `pipeline.typ` |
| `{...}` option lines (tables, headings, lists, equations, spans) | `src/lib/option-schema.typ` | `option-schemas` (keys, types, values, defaults, where each may stand); the code reads its allowed keys through `option-keys`, and `export-schema.mjs` writes it under `options` in `dist/tags.json` |
| Color presets for components | `src/core.typ` (`color-presets`), `src/lib/colors.typ` | `tinted`, `resolve-color`; `box-types` lives in `components/alert/typst.typ` |
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
| `steps` | `<steps>` marker style: `"square"`, `"soft"` or `"solid"` (`"solid"` = the `"soft"` colours and strokes on round markers) | A new value needs a branch in the `steps` component (`components/steps/typst.typ`). |
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

Create a folder in `formatex-core/components/<name>/` for a built-in, or a project-local folder declared in the document's `components` front matter for a user package. Do not register a legacy standalone `.typ` component or put schema/docs declarations inline in an implementation.

### Shared package contract

Every package contains these six files:

| File | Responsibility |
| --- | --- |
| `manifest.toml` | Name/version and `typ`, `html`, `css`, `schema`, `docs` paths |
| `schema.json` | Shared tag kinds, descriptions, attributes/types/defaults and parent/child rules |
| `docs.json` | Shared English/Persian component explanations and examples |
| `typst.typ` | Typst tag implementations, importing `/src/kit.typ` as needed |
| `html.tsx` | HTML implementation using the independent engine's component API |
| `html.css` | Component-owned CSS, using theme/feel variables and logical layout properties |

```toml
name = "note"
version = "1.0.0"
typ = "typst.typ"
html = "html.tsx"
css = "html.css"
schema = "schema.json"
docs = "docs.json"
```

```yaml
---
components:
  - components/note
---
```

Copy a small current core package as the implementation shape reference. Keep schema/docs JSON as the only shared contract source; Typst imports that JSON, and HTML/editor use the same data. Tag ownership must be unique, and scoped child tags must have declared parents. Keep helper names unique for one-file bundling. Use `root-path` for project-supplied Typst paths.

### Rendering and registration

`typst.typ` exports the package's tag dictionary. Optional shared rules/scope must follow the current core loader contract, not a cmarker scope. `html.tsx` exports the HTML implementation; built-ins can delegate to the engine's `renderBuiltin` helper, while custom TSX uses the supplied node/context. Do not import app stores, Tauri, editor modules or app aliases. The engine supplies only serializable package/data/assets across the worker boundary.

Tailwind utilities in `html.tsx` are supported: the worker compiles rendered class candidates to static required CSS using the bundled theme, without a CDN or reader-side Tailwind compiler. Use semantic colors, logical utilities, responsive classes and the `.dark` variant. Content is static SSR; event handlers/state are not hydrated. Only the viewer shell hydrates.

Core's Typst/WASM parser creates mapped IR; neither renderer reparses Markdown. A Typst-only component uses explicit graphics/SVG fallback in HTML. HTML-only subtrees are omitted in PDF; references to omitted content require diagnostics. Verify these cases rather than silently swallowing an implementation error.

After built-in changes, run `node tools/sync.mjs` from `formatex-typ/`: it builds current parser WASM and assembles core+PDF. The local registry/tooling then reads that synced snapshot. App sync consumes core+pdf+html directly. Test custom folders through both outputs and through isolated one-file PDF assembly. Add a representative example, inspect phone/tablet/desktop HTML and affected PDF pages, then synchronize both guides and authoring/developer skills.

## Typst pitfalls

Each of these has broken this template before:

- **Shadowing built-ins.** `let content = ...` makes every `type(x) == content` check false; `let align = ...`, `let box = ...`, `let text = ...` break later calls the same way. Use descriptive names (`directed-content`, `icon-cell`).
- **Keywords as tag names.** A tag named like a Typst keyword (`include`, `import`, `set`, `show`, `let`, `if`, `for`, `return`, `context`, ...) must be a quoted key in both `<name>-tags` and `<name>-schema`: `"include": (attrs, body) => ...`.
- **`set` / `show` inside an `if { }` block only apply inside that block.** Branch inside the closure instead: `show x: it => if cond { ... } else { it }`.
- **Definition order.** A module-level function can only use names defined above it (e.g. `page-name` must come before `page-header`).
- **`context` is required** for `measure`, `query`, `state.get()`, `counter.get()`, `here()`, and for reading `text.dir`.
- **Show rules and recursion.** A `show table` rule that rebuilds the table triggers itself again; guard it (see `table-has-widths`).
- **Trailing breaks.** Markdown bodies often end with `parbreak` / spaces; strip them when something must follow the last line (the proof's ∎, code's empty last line).
- **Strings are double-quoted only.** `'text'` is not Typst ("the character `'` is not valid in code", then dozens of follow-up errors). A string holding attribute quotes escapes them (`"<x a=\"1\">"`) or is a raw block (`` `<x a="1">`.text ``); the `example:` of a `-docs` is where this goes wrong. Persian digits and `٪` are valid only inside strings and content, never in code; `75%` is a ratio, `"75%"` a string; a one-item array is `(x,)`.
- **`em` vs `pt`.** `parse-length` can return an `em` length, and `1.8em > 3pt` fails ("cannot compare 1.8em with 3pt"). Resolve it in a `context { }` with `.to-absolute()` before comparing or adding it to other lengths.
- **Arguments are per function.** `clip` is an argument of `block` / `box`, not of `rect` ("unexpected argument: clip").
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
| Component | `schema.json` and `docs.json` in `formatex-core/components/<name>/`, "Components" section of `docs/doc_en.md` and `docs/doc_fa.md`, SKILL.md component section, `skills/bilingual-document-authoring/components.md`, `reference.md` if it adds a helper or a mechanism, "Common mistakes" if it has a trap |
| New `{...}` option | the group in `src/lib/option-schema.typ` (the key list in the code follows it), the code that applies it, "Table options" / "Heading look" / "Lists" in `docs/doc_en.md` / `docs/doc_fa.md`, `skills/bilingual-document-authoring/components.md` |
| New config key | `config.toml` (commented, with default) or, if per document, the front matter docs; "Configuration" in `docs/doc_en.md` / `docs/doc_fa.md`; SKILL.md config block; `skills/bilingual-document-authoring/config.md` |

> [!IMPORTANT]
> **Subagent Delegation Requirement:**
> Whenever possible, launch a dedicated subagent (via `invoke_subagent`, e.g. role `Documentation & Skill Synchronizer`) to apply the required documentation updates across `docs/doc_en.md`, `docs/doc_fa.md`, and `skills/bilingual-document-authoring/`. This ensures thorough dual-language documentation in English and Persian while keeping the primary agent focused on core template implementation.

Write the docs in the style already there: what it does, the syntax, a table of attributes with defaults, then short bullets of rules. Comments in code only state constraints the code cannot show.
