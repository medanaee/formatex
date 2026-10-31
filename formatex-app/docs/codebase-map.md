# Codebase Map & Quick Reference

A lookup table so nobody has to scan the tree. Keep it in sync when files move.

## Root

| Path | What |
| :--- | :--- |
| `AGENTS.md` | Agent constitution. |
| `TAURI-APP-PLAYBOOK.md` | Step-by-step recipe to build this skeleton (reusable). |
| `package.json` | Scripts and dependencies. |
| `vite.config.ts` | Vite: React, Tailwind, `@` alias, `__APP_VERSION__`, Tauri dev-host handling. |
| `components.json` | shadcn config (`radix-nova`, RTL on, Lucide). |
| `tsconfig*.json` | `tsconfig.app.json` (src), `tsconfig.node.json` (vite config). |
| `.oxlintrc.json` | Lint rules. |
| `.github/workflows/ci.yml` | Frontend gate + desktop builds on 3 OSes. |
| `scripts/sync-engine.mjs` | Copies the Typst engine from the sibling `../formatex-typ` folder into `engine/` and writes `engine/tags.json`. |
| `engine/` | Generated, git-ignored: `bundle/` (embedded by Rust), `config.toml` (default), `tags.json` (autocomplete). |
| `templates/main.md` | The starter document of a new project. |
| `scripts/make-icons.mjs` | Builds all icons from `src/assets/icon.png` (desktop, iOS, web) and `maskable.png` (Android). |
| `src/assets/` | The icon source images. |
| `public/` | Favicon, touch icon, web manifest. |

## `src/`

| Path | What |
| :--- | :--- |
| `main.tsx` | Entry: `initTheme()`, i18n, CSS, `StorageBoot` → `App`. |
| `App.tsx` | `TooltipProvider` + `RouterProvider`, installs the Android back button. |
| `router.tsx` | Route tree, router instance, type registration (`staticData.fullscreen`). |
| `index.css` | Tailwind + design tokens (OKLCH, light and `.dark`), fonts, safe-area utilities, scrollbars. |
| `globals.d.ts` | `__APP_VERSION__`. |

### `src/routes/` (pages)
`ComponentsPage` (the component library: list, Typst editor, new / revert / delete, enable), `LibraryPage` (grid of projects, create / delete; creating writes the starter files), `EditorPage` (the full-screen editor environment), `SettingsPage` (theme, language, fonts, about), `NotFoundPage`.

### `src/components/`
| Folder | Content |
| :--- | :--- |
| `layout/` | `AppShell`, `SideNav` (sidebar / rail), `BottomNav` (phone), `PageHeader`, `navItems.ts`. |
| `common/` | `StorageBoot` (boot screen + retry), `ResponsiveDialog` (sheet on phone, dialog elsewhere; `size="lg"` for an editor inside), `AppLogo`. |
| `editor/` | `EditorWorkspace` (layout per form factor), `EditorToolbar`, `CodeEditor` (CodeMirror 6), `FileTree` (+ name / delete dialogs), `FileView` (text / image / other), `DiagnosticList` (problems, shared with the Components screen), `PreviewPane` (SVG pages, problems), `ProjectSettingsDialog` (main file + config.toml), `FormatBar` (undo / redo, formatting, Source / Visual), `EditorSidebar` (Files / Tags tabs), `TagPalette` (tag tiles, drag or click to insert), `OptionsPopover` (settings form generated from the schema). |
| `settings/` | `FontsSettings` (imported and available fonts). |
| `ui/` | shadcn primitives: `button`, `dialog`, `drawer`, `dropdown-menu`, `input`, `label`, `popover`, `select`, `sheet`, `switch`, `textarea`, `tooltip`, plus `segmented-control`. |

### `src/hooks/`
`useFormFactor` (phone / tablet / desktop), `useIsPortrait`.

### `src/stores/`
`useSettingsStore` (theme, language, sidebar; persisted), `useLibraryStore` (projects in memory), `useEditorStore` (the open project: files, buffers, autosave, compile, export, problems), `useComponentsStore` (the component library screen), `useSchemaStore` (the tags autocomplete knows), `usePreviewScrollStore` (the place the preview is asked to show; last manual scroll).

### `src/lib/`
| Path | What |
| :--- | :--- |
| `platform.ts` | `platformKind()`, `isTauri()`, `desktopOs()`, `hasFinePointer()`. |
| `formFactor.ts` | Breakpoints and `formFactorFor(width)`. |
| `theme.ts` | `applyTheme`, `initTheme`, `watchSystemTheme`. |
| `layers.ts` | `LAYERS` z-index tiers. |
| `history.ts` | Memory history in the app, browser history on the web. |
| `androidBack.ts` | Android back button handling. |
| `safeStorage.ts`, `persistedSettings.ts` | Never-throwing localStorage for zustand persist; early read of saved settings. |
| `utils.ts` | `cn()`. |
| `editor/` | `configCompletion.ts` (autocomplete for config.toml and the front matter), `livePreview.ts` (the visual view: decorations and widgets), `tagSyntax.ts` (read / write tag and `{...}` attributes), `applyOptions.ts` (the edit a popover change makes), `markdownTable.ts`, `format.ts` (format bar commands), `insertTag.ts`, `tagIcons.ts`, `typstLanguage.ts` (light Typst highlighter), `schema.ts` (types + `engine/tags.json`), `completion.ts` (pure autocomplete), `completionSource.ts` (CodeMirror adapter), `theme.ts` (editor look from CSS variables), `sourceLookup.ts` (click on a page → source line), `previewLookup.ts` (source line → place on a page), `followTyping.ts` (the preview follows the edit), `markerLookup.ts` (exact block mapping from the engine's markers), `previewPlace.ts` (markers first, text search as fallback). |
| `projects/` | `ProjectFs` (`types.ts`), `tauriProjectFs.ts`, `webProjectFs.ts`, `paths.ts` (names, kinds incl. `code` files such as `.py`, reserved paths; their colors come from `src/lib/editor/codeLanguages.ts`), `index.ts` (`openProjectFs`, `initProject`, `deleteProjectFiles`, default config). |
| `components/` | `api.ts` (the component commands; `componentsApi`), `template.ts` (name rule, new-component source), `webComponents.ts` (browser fallback). |
| `compiler/` | `compileProject`, `exportPdf`, `listFonts`, `reloadFonts` over Tauri `invoke`; `CompilerUnavailableError` in a browser. |
| `files/` | `saveFile.ts` (Save dialog / download, file picker), `fonts.ts` (import / remove fonts). |
| `db/` | `types.ts` (`Repository`, `SqlDriver`, `FileStore`, `DocumentItem`), `schema.ts` (migrations), `sqliteRepository.ts`, `webRepository.ts`, `tauriBackend.ts` (plugin driver + file store), `index.ts` (`openStorage`), `sync.ts` (store → storage), `writeQueue.ts`, `testDriver.ts` (tests only). |

### `src/i18n/`
`index.ts` (init, direction), `languages.ts` (language table), `i18next.d.ts` (typed keys), `locales/en.json`, `locales/fa.json`.

## `src-tauri/`

| Path | What |
| :--- | :--- |
| `Cargo.toml` | Crate `formatex`, lib `formatex_lib`, Tauri + plugins (dialog, fs, sql/sqlite, log) + `typst` 0.15 crates, `include_dir`, `ureq`. |
| `src/lib.rs` | `run()`: plugins, commands, setup; `mobile_entry_point`. Desktop-only modules go behind `#[cfg(desktop)]`. |
| `src/engine.rs` | The embedded engine (`engine/bundle`): which paths it owns, file lookup. |
| `src/world.rs` | `ProjectWorld`: the Typst `World` (engine + project files + packages + fonts). |
| `src/compile.rs` | Commands `compile_project`, `export_pdf`, `fonts_list`, `fonts_reload`; diagnostics; shared `Engine` state; tests that compile a real project. |
| `src/components.rs` | The component library: built-in + user components, registry generation, schema computation, the `component_*` and `engine_schema` commands. |
| `src/fonts.rs` | Font discovery: imported, system, embedded. |
| `src/packages.rs` | Typst Universe packages: cache + rustls downloader. |
| `src/main.rs` | Desktop entry. |
| `tauri.conf.json` | Product name, identifier `com.formatex.org`, window, bundle. |
| `capabilities/default.json` | Permissions of the main window. |
| `icons/` | Generated by `npm run icons`: desktop + iOS from `icon.png`, `android/` from `maskable.png` ([features/app-icons.md](features/app-icons.md)). |
| `gen/` | Generated Android / Apple projects (git-ignored). |
