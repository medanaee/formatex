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

## CI / release

- [x] `.github/workflows/ci.yml` and `release.yml`: a release is built when the version in `tauri.conf.json` goes up, or the latest release is rebuilt when a commit message has `[build]`
- [ ] Not run yet: push to GitHub and watch the first run; set the Android secrets (`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`)
- [ ] Desktop signing / notarization secrets

## Known issues

- None yet.
