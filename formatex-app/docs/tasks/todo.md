# Task Board (`docs/tasks/todo.md`)

Update this file at the end of every session: tick what is done, add what you found.

## Done: Skeleton (M0)

- [x] Tauri v2 + React 19 + Vite + Tailwind v4 + shadcn/ui project, same stack as Docium
- [x] Design tokens (OKLCH), light / dark / system theme with no first-paint flash
- [x] i18n `fa` + `en`, typed keys, locale parity test, direction sync
- [x] Platform abstraction (`android | ios | desktop | web`), form factor (`phone | tablet | desktop`)
- [x] Responsive shell: bottom nav, icon rail, collapsible sidebar; safe areas
- [x] TanStack Router (memory history in app, browser history on web), Android back button
- [x] SQLite storage behind `Repository`, migrations, write queue, web fallback, tests on real SQLite
- [x] Library page (create, open, delete), editor placeholder, settings
- [x] Tauri Rust side, capabilities, icons, Android project generation verified, CI workflow
- [x] AGENTS.md, docs, step-by-step playbook

## Done: Editor (M1)

- [x] Native Typst engine in Rust: embedded engine, `World`, packages, fonts, `compile_project`, `export_pdf` ([ADR 0005](../decisions/0005-native-typst-engine.md)); a Rust test compiles the starter project end to end
- [x] Editor environment (fullscreen route): CodeMirror 6, Markdown + TOML, per-line RTL / LTR, theme from CSS variables
- [x] Autocomplete from `engine/tags.json`: tags, attributes, values, project files, closing tags, `{...}` options (33 tests)
- [x] Live SVG preview with problems list (click jumps to the line), last good pages kept
- [x] Project files: folder per project, Overleaf-style file tree, upload, rename, delete, main file, reserved engine names
- [x] Project settings: main file + the project's `config.toml` editor, reset to default
- [x] PDF export through the Save dialog
- [x] Fonts: system fonts on desktop, imported fonts (Android and any OS), Settings → Fonts
- [x] App icons: desktop / iOS / favicon from `icon.png`, Android adaptive icon from `maskable.png` (`npm run icons`)
- [x] Compact & minimal design rules with measurable values ([guidelines §1](../design-roles/guidelines.md))

## Done: Editing tools (M1c)

- [x] Undo / redo buttons (per-file history) and a format bar: bold, italic, strikethrough, code, headings, lists, quote, link, table, code block, insert tag
- [x] File tree: multi-select (Ctrl / Shift), drag and drop (move, copy with Ctrl / Alt, files from the computer), copy / cut / paste, multi-delete, keyboard shortcuts
- [x] Autocomplete respects child rules: scoped tags only inside their parent; tags that take only child tags offer only those
- [x] Preview: kept per-project Typst world, compile from unsaved text, only changed pages sent, stable images (no jump to page 1)

## Done: Visual editor (M1d)

- [x] Source / Visual switch: live preview of Markdown, tags as chips and tinted blocks, headings, tables, KaTeX math ([features/visual-editor.md](../features/visual-editor.md))
- [x] Settings popover generated from the schema for tags, headings and tables; every change is written into the source
- [x] Side panel tabs Files / Tags; tag tiles (icon + name) that drag into the editor or insert on click
- [x] Resizable panels with drag handles (mouse, touch, keyboard), sizes remembered, right-to-left aware

## Done: Settings schema and editor text (M1f)

- [x] Autocomplete for `config.toml` and the YAML front matter, from a schema defined in the engine (`src/lib/config-schema.typ`, exported as `config`)
- [x] Editor direction button (automatic / RTL / LTR) and Vazir Code as the Persian font of the editor

## Next: Visual editor, part two (M1e)

- [ ] Validate `config.toml` and front matter against the config schema (unknown keys, wrong values) and show the problems
- [ ] A form view for `config.toml` and the front matter generated from the same schema

- [ ] Gears for lists, equations and spans; images drawn in the visual view; a form to insert a tag with its attributes from the palette
- [ ] Edit a table's cells in place (add / remove rows and columns, align)
- [ ] Per-tag icons for custom components (an `icon` entry in the schema) and tile groups / favourites
- [ ] Draw only the visible part of very large documents
- [ ] Verify drag and drop of tiles and files inside the real Tauri window

## Next: Editor polish (M1b)

- [ ] Multi-select on touch screens (long-press to select, then the menu acts on all)
- [ ] Undo / redo for file operations (rename, move, delete) as well as text
- [ ] Format bar: tag-specific tools (insert alert, box, figure with a form)
- [ ] Confirm drag and drop of files from the computer inside the real Tauri window (verified in the browser only)

- [ ] Check the font licenses (Font Awesome Pro, IRANSansX) before bundling any font; the app currently bundles none
- [ ] Android: compile the typst crates for `aarch64-linux-android` and test the preview on a device (memory, speed, `/system/fonts`); not verified yet
- [ ] Release-build timings of the first and later compilations on desktop and Android; decide whether a persistent `World` per project is needed
- [ ] Offline first run: ship the engine's Typst packages (`cmarker`, `mitex`, `cetz`, `lilaq`, `mmdr`, ...) with the app instead of downloading them
- [ ] Preview: zoom, page jump, scroll sync with the cursor; export of a page range
- [ ] Editor: tag hover docs, attribute validation (squiggles) from the schema, front-matter and `config.toml` key completion (needs a schema for them in the engine)
- [ ] Drag and drop of files onto the file tree; image paste
- [ ] Android: share sheet after export (the Save dialog is used today)
- [x] (done: `formatex-typ/tools/*.mjs`) Move `../tools/*.ps1` (registry generation, schema export, bundle) to something cross-platform; `engine:sync` already regenerates the schema with the `typst` CLI when it is installed
- [ ] Move `.github/workflows/ci.yml` to the repository root (GitHub reads only the root `.github`) with `working-directory: formatex-app`, and cache `src-tauri/target`

## Done: Components (M2)

- [x] Component library in Rust: built-in + user components, copy-on-write edit of built-ins, enable / disable, manifest with origins ([ADR 0007](../decisions/0007-component-library.md))
- [x] Registry generated by the app (port of `gen-registry.mjs`), checked equal to the engine's own; invalid components are left out and reported
- [x] Schema computed from the engine's `tools/schema.typ` and fed to autocomplete: new tags are completed as soon as the file is saved
- [x] Components screen: list, Typst editor, new from a template, revert, delete, problems with jump to line

## Next: Components, part two (M2b)

- [ ] Component store: manifest format, server API, install / update / remove, review or signing, dependencies between components (origin `store` is already recorded)
- [ ] Import / export a component or a set as a file (share without a store)
- [ ] Visual builder for simple tags (alias of an existing tag with preset attributes, attribute table) that writes the Typst
- [ ] Live preview of a component inside the Components screen (render a sample use)
- [ ] Hover docs for tags and attributes; squiggles for unknown attributes in documents
- [ ] Check that tag-function bodies work (run each component's example, if it declares one)
- [ ] Check whether `../src/preprocess/` depends on a fixed list of tag names

## Next: Platform (M3)

- [ ] Android: test on a real device (WebView version, keyboard / IME with Persian, file access)
- [ ] Android back button closes dialogs / drawers first (overlay stack in `androidBack.ts`)
- [ ] Web build: SQLite-WASM on OPFS behind `Repository`; deploy target; PWA decision
- [ ] CSP: replace `"csp": null` in `tauri.conf.json` with a real policy
- [ ] Code signing / notarization secrets in CI; Android release signing
- [ ] iOS (optional): `tauri ios init` on a Mac, test

## Editor round (done, not yet tested in the native app)

- [x] Preview: links (external via `tauri-plugin-opener`, internal jump) and click-to-source from compiler maps (`src-tauri/src/links.rs`, `sourceLookup.ts`)
- [x] Sidebar: Outline tab; sticky headings (3 levels) and minimap in the editor; themes are a global Settings section (stored in app settings, appended to config.toml at compile time)
- [x] Visual editor: bare attributes (`<align center>`, schema `bare: true`), gear on lists and fenced code, length number + unit fields, color field with presets and picker, hex swatches in the text
- [x] `config.toml` visual settings screen (`ConfigPanel`); custom themes in the engine (`[themes.<name>]`, `src/core.typ`)
- [x] Settings sections in the side bar, compact nav / toolbar / title bar, editable project title, colored logo
- [ ] Click-to-source is heuristic (text search); check long documents and repeated phrases
- [ ] The minimap and sticky headings are not adapted for RTL scrollbars on every platform

## Source to preview (done, not yet tested by hand in the native app)

- [x] Preview follows the typing: after the build that follows an edit it scrolls to the cursor's line; waits out builds, pauses 4 s after a manual scroll, toggle in the preview bar (`previewFollow`) ([ADR 0008](../decisions/0008-source-to-preview-mapping.md), `previewLookup.ts`, `followTyping.ts`, 11 tests)
- [x] Editor menu: **Go to here in preview** (scrolls and marks the line; brings the preview up on a narrow screen or when its panel is hidden)
- [ ] Heuristic (text search): check long documents, repeated phrases, tables and figures in the native app; text that Typst changes (numbering, hyphenation across runs) does not match
- [ ] A line with no words (image, bare tag) goes to the nearest line with text; the engine could carry Markdown positions to the layout for an exact mapping
- [x] Exact mapping to the block, both directions ([ADR 0009](../decisions/0009-exact-source-mapping.md) stage 1): invisible `fx-mark` markers from `mark-lines.typ` (preview builds only), reported by `links.rs`, used by `markerLookup.ts` for the menu, following and clicks (a click opens the right `<include>`d file); text search only inside the block. Layout checked on `doc_en.md` / `doc_fa.md` with and without markers
- [x] A click on the preview goes to the clicked word inside a paragraph (column from the x inside the run, reversed for RTL; `sourcePlaceAt`, `normalizeWithMap`); exact words from glyph advances in `links.rs` are not done
- [ ] Try the markers by hand in `tauri:dev` on a long multi-file document (click, right-click menu, typing); look for blocks without markers (tables inside tags, nested lists, `<steps>` and other components) and for a layout change in a component of the library
- [ ] ADR 0009 stage 2: a source map in the Markdown to Typst conversion (cmarker returns only a string that is `eval`ed, so it cannot carry positions; it would have to be forked or replaced)

## Library round (done, not yet tested in the native app)

- [x] Own context menus everywhere (editor, library cards, text fields); the browser menu never shows (`TextFieldMenu`, `EditorContextMenu`, `ui/context-menu.tsx`)
- [x] Library: folders (migration 3), copy / cut / paste, duplicate, drag and drop onto folders and the path bar, three-dot menu, first-page thumbnails (`project_preview` command, `projectThumbnails.ts`)
- [ ] Thumbnails are typeset one at a time and kept in memory only; consider caching them on disk
- [ ] Drag and drop is mouse-only; touch uses cut / paste

## Themes through the engine (done)

- [x] The user's themes (app settings) are handed to Rust (`themes_set`), which writes `<app data>/themes.json` and serves a generated `src/themes.typ` (built-in + user themes); the schema carries `themes` and the values of `theme`, so autocomplete and selects need no special case (`src-tauri/src/themes.rs`, `components.rs`)
- [x] Removed: the `config.toml` injection at compile time and `engine/themes.json`
- [ ] Not tested in the running app yet (the Rust test covers schema + compile)

## ZIP and Android

- [x] Export a project as ZIP (card menu) and import one (header, background menu): `lib/projects/zip.ts`, `fflate`; unsafe paths and engine paths are dropped, size limits
- [x] Android full screen (status and navigation bars hidden, swipe shows them): `scripts/android-immersive.mjs`, run by `npm run android:patch` and by the release workflow
- [ ] Android file access (picker, save dialog, content:// URIs) still needs a real-device test

## Editor fixes round (done, needs a check on a phone)

- [x] Edit / Preview on a narrow screen: both stay mounted, so each keeps its scroll, cursor and undo history
- [x] `<code>` followed at once by a fence works (engine step `code-tag-spacing.typ`); the wrap gear writes blank lines
- [x] New projects no longer start with `dir: auto` in the front matter (it overrode `dir` of config.toml)
- [x] The tag palette drags again (a `preventDefault` on mousedown stopped it)
- [x] Touch: "Select text" item in the editor menu (a long press opens the menu, the item selects the word); library cards: a long press then a move drags, a long press alone opens the menu (`useTouchDrag.ts`)
- [x] Sticky headings are a real panel (text starts below it), with level icons, compact
- [x] The front matter is a settings panel in the visual editor (`SettingsForm`, `yamlEdit.ts`, `FrontMatterPanel`), the same form as config.toml
- [ ] Not tried on a real phone: touch selection, touch drag in the library

## Editable tables (done)

- [x] Tables of the visual editor are edited in place (`tableEditor.ts`): type in a cell, Tab / Enter move, Tab in the last cell adds a row, a bar adds / removes rows and columns at the cell, plus strips after the last row and column; every change is written back as an aligned GFM table (`markdownTable.ts`)
- [ ] Not tried by touch; `contenteditable="plaintext-only"` needs a current WebView (Chrome 105+)

## Code files in the project (done, not yet tried in the native app)

- [x] `.py` and other source files (`CODE_EXTENSIONS` in `paths.ts`: Python, JS / TS, C family, Java, Go, Rust, shell, SQL, CSS, XML, and more, plus `Dockerfile` / `Makefile`) are file kind `code`: listed with a code icon, opened as text in the editor (always left-to-right) with that language's colors from `@codemirror/legacy-modes` (`codeLanguages.ts`), uploadable, and kept as text in ZIP import
- [ ] Languages without a mode there (for example `.php`, `.vb`, `.asm`, `.tex`, `.log`, `.bat`) open as plain text

## CI / release

- [x] `.github/workflows/ci.yml` and `release.yml`: a release is built when the version in `tauri.conf.json` goes up, or the latest release is rebuilt when a commit message has `[build]`
- [ ] Not run yet: push to GitHub and watch the first run; set the Android secrets (`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`)
- [ ] Desktop signing / notarization secrets

## Known issues

- None yet.

## Title bar panels and menus
- [x] The title bar (desktop app) switches the side panel, the editor and the preview on and off; the last of editor / preview cannot be hidden; hidden panels stay mounted (history and scroll kept). A narrow window: the switches change the tab / open the files
- [x] File / Edit / View menus after the app name (settings, export, close; undo, clipboard, find; panels, visual editor, zoom); on the web they sit in the editor toolbar
- [x] Preview toolbar: page number box with previous / next, zoom out / in / fit, Ctrl+wheel zoom (stored)
- [x] Sticky headings never showed: the layout was read inside an update (threw); now read in the measure phase
- [x] Selecting Persian text in a left-to-right editor: the editor now knows about the isolated runs (`bidiIsolatedRanges`), so clicks and drags land where the browser drew the text
- [x] Menus (context, File / Edit / View) are frosted glass; the editor is its own stacking context, so its sticky panel (z-index 300) no longer paints over menus
- [x] Preview click to source: runs are searched in the whole text (over line breaks), repeats are settled by the neighbouring runs, then by position
- [ ] The click-to-source change is only unit-tested: try it in the desktop app on a document with repeated phrases
- [x] Preview zoom: the number opens a menu (fit width, fit page, 50-300%); steps (+/-, Ctrl+wheel) start from the size shown, also out of a fit mode
- [x] Problems in the user's text carry their line, from the code that finds them: every file is marked when it is read (`formatex-typ/src/preprocess/mark-lines.typ`: `_at` in tags, `md-at` in `{...}` lines, a `check-label` before `[text](#id)`), and the asserts of `wrap-tags`, tables, lists, headings, the components and `<ref>` / `<a>` say `@path:line message`; `compile.rs` reads that mark into the diagnostic's path and line (and drops Typst's own placeless duplicate of a missing label)
- [x] More lines: colors and lengths (`parse-length` / `resolve-color` / `pick-hue` / `chart-number` take `attrs:`), `<div>` tailwind classes (`at:`), mermaid options (the fence line is marked), `[text]{...}` spans, settings in config.toml and the front matter (`setting-at` finds the key's line in the front matter, else in config.toml), and an id defined twice for `[text](#id)`
- [ ] Still without a line: Typst's own `label occurs multiple times` for tags that are not `[text](#id)`, values given only as `--input`, a cell of a `<chart>` table (the `<chart>` line is given), and a new assert in a helper must take `attrs:` / `at:` like the others
- [x] `formatex-typ/src/kit.typ`: one import for a component (the prelude and every helper library); all built-in components, the new-component template and the docs use it. A name defined in two libraries would silently win by order: keep them distinct
