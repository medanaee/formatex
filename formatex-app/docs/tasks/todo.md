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
- [x] Project settings: the gear opens `config.toml` in the editor (the old settings dialog is gone; a key is reset with its reset button)
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

## Library views (done, checked in a browser, not yet in the native app)

- [x] The library has three views, chosen with a switch in the header (setting `libraryView`, kept between runs): the cards, a full-width **table** of the folder being shown (name, items, updated; the first row `..` goes up one folder and takes drops), and a **tree** (every folder from the top, opened and closed in place like the editor's file tree; its header is the top level to drop on). Rows have the same menu, drag and drop (mouse and finger) as the cards
- [ ] Not tried by touch; the tree's opened folders are forgotten when the page is left

## Overridden settings (done, tests pass; not yet tried by hand in the native app)

- [x] A config.toml key that the main file's front matter also sets gets a blue info icon in the visual editor and in the code editor's gutter, with a popover (the document's value, jump to its line); pure logic in `overrides.ts` (9 tests)
- [ ] Also compare with the front matter of the file being edited when it is not the main file (config.toml is the only file with the marks today, so nothing to compare yet)

## Main file from config.toml (done, checked in a browser, not yet in the native app)

- [x] The file a project typesets is the `source` of its `config.toml`, always (`useEditorStore.resolveMain`, `configSource.ts`); the library's stored `mainFile` is only a copy. A missing `source` or a file that does not exist is an error at that line of `config.toml`, with no fallback to `main.md`; the file tree stars the file `source` names; "Set as main file", a rename or a move of the main file, and a ZIP import write the line
- [ ] The Rust commands still take the main file as an argument (they are given what config.toml names); they could read it themselves

## Folder projects (done, tests pass; not yet tried by hand in the native app)

- [x] `documents.location` + `FolderProjectFs` (`.formatex/config.toml`), `project_set_root` in Rust (scope + compiler), Rust test; [ADR 0010](../decisions/0010-project-in-a-user-folder.md)
- [x] New-project dialog: in the app / in a folder (an existing folder is opened; `.formatex` is created with the chosen main file)
- [x] File menu: move to a folder (conflicts: replace / skip / keep both), move to the app (tick the files), show the folder; library badge; lost-folder screen
- [ ] Watch the folder for changes made outside the app
- [ ] Android (SAF) and web (File System Access API) folders
- [ ] A recent-folders list / "Open folder" shortcut outside the new-project dialog

## File icons (done)

- [x] The file tree uses the Material Icon Theme icons (the set VS Code users know) by extension, name and folder name; only the ~70 SVGs the app needs are copied (no dependency), `.formatex` keeps the Formatex mark

## PDF viewer (done, not yet tried with a real PDF in the native app)

- [x] `.pdf` files open in the editor area with pdf.js (`pdfjs-dist`, loaded on demand): lazy-drawn pages, previous / next, page box, zoom, fit width
- [ ] Text selection and search inside the PDF

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

## Skill for AI agents
- [x] Every engine component exports `<name>-docs` (what it is for in en and fa, key rules, an example): written for all 38 components in `formatex-typ/components/`; `gen-registry.mjs` requires it, `tools/schema.typ` checks it and exports `components` (tags + docs) in `tags.json`; the registry of `components.rs` generates the same lines (tested against the engine's own)
- [x] Skill page (`/skill`, side bar): size (minimal / compact / standard / full, with token counts), language (en / fa / both), the components to include, copy and download `SKILL.md`; `src/lib/skill/` generator and fixed text, tested
- [x] The new-component template writes a `-docs` starter
- [ ] Try the page in the desktop app (schema from `engine_schema`, so a user's own component with docs appears; `saveBytes` dialog) and read a generated skill with a real agent
- [ ] The docs of a user's component are only as good as the user writes them: no check beyond "the file loads"

## Page sizes and project components
- [x] Page sizes in the engine: `desktop-*` and `mobile-*` names, `custom` with `page-width` / `page-height` (a `length` field in the settings form); a custom page under 120 mm gets the phone rules (one column, own margins, no header center); `a4` / `mobile` still work
- [x] Skill page: two sections (writing documents, building components), each on / off with its own size and language; the `both` language is gone; `buildText.ts` and a test that the documented kit names exist in the engine
- [x] Components of one project: the `components` setting lists `.typ` files (any number of tags per file, any name); `local-components.typ` in the engine loads them, `project_schema` gives autocomplete, `convert_all` shows an error in both files
- [ ] Try in the desktop app: a project with `components`, autocomplete for a tag with a schema, an error raised in a component (two diagnostics), the Skill page's building section
- [x] The settings form has a Components section (config.toml and front matter): list, tags of each file, add from the project's `.typ` files, remove, missing-file warning
- [x] The file tree creates and renames in place (an inline field in the row), as in VS Code; only delete asks
- [ ] Try in the desktop app: new file / folder / rename in the tree (focus after the menu closes, a phone), and the Components section
- [x] The cursor entering an attribute value opens the list of its values to switch to (`completeValue`)
- [x] Project kinds: Formatex or Raw Typst ([features/project-kinds.md](../features/project-kinds.md)): `kind` in the library, a plain Typst compile (no engine), the new-project dialog with the kind, the switch from the library and the File menu
- [x] ZIP export / import keep the project kind (manifest `kind`), and a plain Typst import keeps `main.typ` and `src/`
- [x] Submenus of the dropdown menus are drawn in a portal, so a parent menu no longer cuts them off (the File menu's Main file and Project type)
- [x] Plain Typst tools: completions, click in the preview to the text, go to here in preview, follow typing (`typst-ide`, new dependency; `ide.rs`)
- [x] A mistake in the Typst of a `<typ>` block is shown on its own line of the Markdown file (`src-tauri/src/typ_blocks.rs`): Typst reports evaluated text at the engine's `eval`, so the app builds each block alone, as a small file with the kit, and turns its line into a Markdown line; a `<typ src>` file that is missing is told on its tag; a mistake inside a `src` file is named by Typst itself. At most 40 blocks are tried per failed build, and only a build that failed at `components/typ.typ` is looked at
- [x] Editor: tags fold and unfold (marker, keys); a bracket or quote typed over a selection wraps it (`tagFolding.ts`, `surround.ts`)
- [ ] Try in the desktop app: the fold markers next to line numbers in both directions, and a long document with many tags
- [x] Engine: a CeTZ label written as a string that is only a formula (`"$x_{n-1}$"`) is the formula (`latex-in-code`)
- [ ] Plain Typst: tooltips and go to definition; completions of package names; try it all in the desktop app (a long document, Persian text, an imported file)
- [ ] Raw Typst: try it in the desktop app (the dialog on a phone, a folder of `.typ` files)
- [ ] A screen listing every component of the project (library and project) in one place
- [x] The file tree has a right-click menu on a row (the same actions as its three-dot menu, built once by `ActionItems`) and on the empty part under the rows (new file / folder, upload, paste in the root)
- [x] Folder projects are live: the folder is watched (`watcher.rs`, new dependency `notify` 8), the list of files and the open files follow a change made outside the app, with a bar when both sides changed
- [x] Live folder safety: the editor's own writes are no longer taken for changes from outside (a false conflict could load a half-written or empty read), reads must agree twice, and a loss-like replacement can be undone with "Restore mine"
- [ ] Try the live folder in the desktop app: save a file from another editor, add and remove files, a git checkout of a branch, a change while typing (the bar)
- [x] Variables and code: `vars` (values) and `var-types` (rules: a list, `{ min, max }`, a type, json / data files) in the front matter or `[vars]`, and `{{ code }}` that is real Typst (`eval`) in the text, attribute values and the strings of the settings; `[ ... ]` is Markdown (with tags and `{{ }}` inside, to any depth); `let`, `if`, `for`, `json()`; `n += 1` changes a variable for what follows (includes see it); `PAGE`, `PAGES`, `SECTION`, `SECTION_NUMBER` run when the pages are made; `<if>` is gone (engine: `vars.typ`, `expr.typ`, `evaluate.typ`; a Rust test compiles one)
- [x] Editor for variables: colors for `{{ }}` over several lines (code, printed names, the values of the page), folding, autocomplete (variables, `setting.*` from the schema, quoted values after `==`), a *Variables* section in the settings screen (value + rule popover, `var-types`), an `fx` button on every attribute in the tag popover
- [ ] Try the variables in the desktop app: the colors in a long `{{ }}`, the Variables section in config.toml and in the front matter, the `fx` button in the tag popover, `PAGE` in a document, a data file, a build option for `var.name`
- [ ] Variables: errors of the Typst a `{{ }}` runs (a wrong type, a missing method) have no line (Typst cannot catch an error of `eval`); only names, brackets, rules and enum typos do. `<typ>` sees the variables as written, not as a `{{ }}` changed them. Rename a variable and completion of the keys of `var-types` are not done
- [x] Captions and numbering (engine): `[figure]`, `[table]`, `[code]`, `[list]` get `numbering` and `caption-position`; a figure is numbered by default, the others get a number as soon as they have a caption when their `numbering` is on; `numbering`, `caption-position` and `lof` / `lot` / `lol` per item; number only «شکل ۱», caption only, or «شکل ۱: توضیح»; one helper (`src/lib/captioned.typ`) for `<fig>`, tree, chart, tables, `<code>` and lists
- [x] `<p>` tag (font, size, weight, color, align, justify, line / letter / word spacing, indent, above / below, dir); `<hr>` with six line styles; `<digit>`; `[heading] max-numbering-level`
- [x] Comment fix: a `-->` inside a fenced block in a comment no longer ends it
- [x] Visual: the gear is always visible (headings, lists, equations, code, tables), `۱.` lists have it, display equations have a gear / `{#id}` chip, plain paragraphs have a gear on hover that wraps them in a `<p>`; typing `<` over a selection writes a tag around it with a linked closing name
- [ ] Try in the desktop app: the captions of every kind, `<p>` from the paragraph gear, `<` over a selection (a multi-line one, completion in the name), the equation gear, and a long comment with a code block in it
- [x] Bulleted lists: `guides = none | line | tree` (`[list]` and `{guides=...}` per list); every marker has the same width, so the levels of a nested list step by equal amounts (they did not: a bullet, a triangle and a dash are not equally wide)
- [x] Editor: indent guides behind every level of indentation
- [x] File tree: Save (a file as it is, a folder or a selection as a ZIP), Show in File Explorer for folder projects, and dropping a folder from the computer (it was only files)
- [ ] Try in the desktop app: Save on a file and a folder, Show in File Explorer on a file, a folder and the empty part, and dropping a folder (with sub-folders) from Explorer into the tree
- [x] Lists: two blank lines end a list (engine `list-attrs`, editor `listSplit.ts`), tree guides drawn as exact lines, indent guides only on the first row of a wrapped line
- [x] Outline click shows the heading in the preview; the main file can be renamed from the tree; images pasted from the clipboard go to `images/` (`.formatex/images/`) with a `<fig>` tag; files from the internet are downloaded once into `.cache/` with a sync button beside Export
- [ ] Try in the desktop app: paste a screenshot in the editor, in the tree and from the Paste menu; an `https://` image in `<img>`, `![]()` and `{{ json() }}` offline after the first compile, the sync button; the outline click scrolling the preview; renaming the main file
- [ ] Raw Typst preview feels slow in the desktop app: measured in release, the compile is about 320 ms cold and about 0 to 5 ms incremental, and an SVG page is about 400 KB (about 5 ms to make); next step is the time the preview footer shows, then rendering pages smaller or only the visible ones


## The `<counter>` tag (done, engine rendered and tests pass; not yet tried by hand in the native app)

- [x] Engine: `components/counter.typ`, a void tag `<counter of="ex" />` that steps a counter of its own and prints its number: `label` (`%1`, `%2`), `format` (the kinds of numbered lists, one or one per level; `format-number` in `src/lib/lists.typ`), `step`, `set`, `level`, `hide`; levels, `separator`, default `label` and `format` in `[counters.<name>]` of config.toml / `counters:` of the front matter; problems are said with their line
- [x] The editor completes it from the schema like every tag (icon `Hash` in `tagIcons.ts`)
- [ ] `[counters.<name>]` is not in the config schema (it has no support for tables named by the user, like `[themes.<name>]`), so the visual settings editor and the TOML completion do not know it
- [ ] Completing the value of `of` with the counter names already used in the document

## HTML export (experiment; written, not yet compiled or tried in the native app)

- [x] Engine: `--input target=html` (`html-mode` in `src/core.typ`) switches `main.typ` to `src/html/conf.typ` (language, stylesheet from the theme / feel / fonts, code blocks, tables, lists with `dir="auto"`); `src/html/tags.typ` gives alert, box, badge, kbd, icon, hr, ref, a, span / anchor (highlight, tailwind), fig, code, toc, lof / lot / lol an HTML form and draws every other tag as an inline picture (`html.frame`); `src/html/style.typ` has the CSS and the copy-button script
- [x] Rust: `export_html` (`compile.rs`) compiles with Typst's HTML feature (`ProjectWorld::new_html`), `html_export.rs` puts the fonts the page names (`<meta name="fx-fonts">`) in `@font-face` rules as base64 (whole files); tests for the font part
- [x] App: Export HTML dialog (`HtmlExportDialog.tsx`: copy button, fonts inside the file), toolbar icon and File menu item, `htmlExport` in the settings store
- [x] HTML export viewer (`formatex-typ/src/html/viewer.typ`): toolbar (zoom, theme, feel), reading-progress line, right-hand outline (drawer on phones); three switches in the dialog; SVG frames centered (`margin-inline: auto`). Not verified: `cargo check` (disk full on this machine); code colors / picture frames keep the original theme's colors when the reader switches theme (inverted when light/dark flips)
- [x] `[html]` table in config.toml (toolbar, progress, outline, copy-code, embed-fonts): the export dialog starts from it each time and can change it for one export; live HTML preview in the preview pane (`HtmlPreview.tsx`, a sandboxed iframe, globe button). Not done: click-to-source in the HTML preview; not tried in a running app
- [x] HTML output fixes: lists with `{numbers=abjad suffix=")"}` render (Typst's HTML export drops `align` with its content; ordered lists write their own labels), captioned tables get ids so `<ref>` works, `<picHeader>` has an HTML form, panels and badges mix their tints in CSS from a hue (a dark theme picked in the toolbar no longer leaves pastel boxes), viewer marks a changed theme / feel / zoom with a red dot and has "Back to default"; the preview keeps those choices across rebuilds. `formatex-typ/examples/demo.md` (+ `included.md`, `nested.md`, `references.bib`, `sample.py`, `images/`) is the test page for HTML, now with lists options, hr, p, digit, counter, anchor, old/new, chat, typ, lol. Not done: SVG pictures (charts, CeTZ, ...) keep the colors of the theme they were built with (inverted when light/dark flips)
- [ ] Not run: `cargo check` / `cargo test`, `npm run typecheck` / `lint` / `test`, and the dialog in the app
- [ ] Tags still pictures: cetz, chart, lilaq, tree, steps, compare, grid, def, theorem, todo, chat, diff, progress, picheader, ...; images in HTML (`<img>` data URIs), line numbers and highlighted lines of code, caption position of code
- [ ] A subset of the font glyphs instead of whole files; Android is not looked at
- [x] The HTML form of a tag now lives in its own component file (`<name>-html`, with `<name>-css`), collected by `gen-registry.mjs` and by `components.rs` into `html-impls` / `html-css` of the registry; `src/html/kit.typ` (imported by `src/kit.typ`) holds the shared helpers, `src/html/tags.typ` only the picture fallback (`html-adapt`); a project's own components can export them too (`src/lib/local-components.typ`). Not compiled yet
