# System Architecture (`docs/architecture.md`)

## 1. Layers

```mermaid
graph TD
    subgraph UI["UI layer (React 19 + shadcn/ui + Tailwind v4)"]
        Shell[AppShell: side nav / rail / bottom nav]
        Pages[routes/: Library, Editor, Settings]
        Prims[components/ui + components/common]
    end

    subgraph State["State layer (Zustand)"]
        Settings[useSettingsStore: theme, language, sidebar]
        Library[useLibraryStore: documents in memory]
    end

    subgraph Data["Data layer (src/lib/db)"]
        Sync[sync.ts: diff + coalescing write queue]
        Repo[Repository interface]
        Sqlite[SqliteRepository]
        Web[WebRepository]
    end

    subgraph Native["Native layer (src-tauri, Rust)"]
        SQL[tauri-plugin-sql / SQLite]
        FS[tauri-plugin-fs / $APPDATA]
        Dialog[tauri-plugin-dialog]
    end

    Pages --> State
    Shell --> State
    Library --> Sync --> Repo
    Repo --> Sqlite --> SQL
    Repo --> Web
    Data --> FS
```

Rules of the layers: pages and components talk to **stores**; stores never await storage; `sync.ts` is the only code that moves data between a store and the `Repository`; only `src/lib/db/tauriBackend.ts` imports Tauri plugins for data.

### Editor and compile path

```
EditorWorkspace ── useEditorStore ── ProjectFs ── $APPDATA/documents/<id>/  (config.toml, *.md, images/)
      │                  │                                  ▲
      │                  └─ compileProject() ── invoke ── compile_project ── ProjectWorld ┘
      └─ CodeEditor ── completion.ts ◄── engine/tags.json        (typst 0.15, engine embedded in the binary)
```

The tags come from the **component library** (`components.rs`): built-in components plus the user's, a registry generated from them, and the schema computed by compiling the engine's `tools/schema.typ` ([ADR 0007](decisions/0007-component-library.md)).

The editor autosaves to the project folder; the native Typst engine ([ADR 0005](decisions/0005-native-typst-engine.md)) reads the same folder and returns SVG pages and diagnostics; export is PDF. In a browser the compiler is unavailable (`CompilerUnavailableError`) until a WebAssembly build exists. See [features/editor.md](features/editor.md).

### HTML preview and standalone export

The live HTML pipeline (`previewHtml` → `preview_html` → `render_preview_html`) keeps a separate incremental `ProjectWorld` slot through `kept_world_for`, so refreshing it cannot replace the world's paged-preview state. `latestTaskQueue.ts` coalesces edits into one latest pending snapshot while a build is running, including across preview remounts, and adapts its delay between 120 and 250 ms. HTML mode skips the hidden paged build; switching back requests pages for the latest source. Decision: [ADR 0012](decisions/0012-incremental-html-preview.md).

`html_export.rs::preview_fonts` caches reusable full WOFF faces by weak `FontStore` identity, required families and italic need; new font stores after import/reload invalidate previous entries. `fontKey` identifies the CSS, which is omitted from a preview response when the frontend already has it. The standalone Export path still subsets and embeds fonts for a portable file. This distinction keeps export preparation out of repeated live edits without changing document syntax or `[html]` settings.

`HtmlPreview` and `htmlFrame.ts` (`splitHtml`, `initialFrame`, `frameBridge`) keep a sandboxed iframe mounted. Parent and frame validate the source window and a per-document token before applying `fxPatch` main-content updates and optional font CSS. Scroll, viewer controls and the font node survive ordinary edits; `fx-content-updated` refreshes outline and copy controls. A changed viewer signature triggers a full reload, as do custom scripts in main content or Raw Typst output without `main.fx-doc`. This preserves initialization of custom interactive documents. Browser/WebView paint and device interaction checks remain separate from native compiler measurements.

### HTML rendering and math readiness

HTML preview and export share the engine's component-owned HTML/CSS handlers. Text and structural components use native elements when a handler is provided; charts, CeTZ, Lilaq and arbitrary Typst graphics may retain Typst SVG rendering. The app's retained HTML world and iframe content-patch path remain separate from paged compilation.

`[html] math` selects Typst-native math or offline KaTeX. `tools/bundle-katex.mjs` in the engine generates the compressed KaTeX bootstrap from source assets; it is included only when the output contains KaTeX math markers. `window.__fxMathReady` coordinates asynchronous rendering after initial load and `fx-content-updated`, and the iframe bridge awaits it before reporting paint. Exact requested font families are resolved before alias fallbacks, whose CSS declarations retain the requested family name. See [editor](features/editor.md) and [fonts](features/fonts.md).

HTML-only NewCM quadratic font assets in `src-tauri/web-fonts/` work around original CFF font rejection in the tested browser; they preserve metrics/shaping and do not replace PDF fonts. `scripts/prepare-html-serif.py` generates them with fontTools and carries the upstream notices. Measured payload sizes and verification boundaries are recorded in [the HTML update report](html-export-improvements-2026-11-11.md).

## 2. Routing

- **Library:** TanStack Router, code-based routes in [`src/router.tsx`](../src/router.tsx): `/`, `/editor/$documentId`, `/settings`.
- **History:** [`src/lib/history.ts`](../src/lib/history.ts) uses **memory history** inside the Tauri app (WebView URLs and the Android back stack do not mix) and **browser history** on the web (real URLs, reload, back button).
- **Shell:** the root route renders [`AppShell`](../src/components/layout/AppShell.tsx). A route can set `staticData: { fullscreen: true }` to be a full-screen environment with no navigation (the editor).
- **Android back button:** [`src/lib/androidBack.ts`](../src/lib/androidBack.ts) maps it to `history.back()`, and exits on the first screen.

## 3. State

- **Settings** ([`useSettingsStore`](../src/stores/useSettingsStore.ts)): theme preference, language, sidebar. Persisted to localStorage (`formatex_app_settings`) through [`safeStorage`](../src/lib/safeStorage.ts), which never throws and reports quota errors.
- **Domain data** ([`useLibraryStore`](../src/stores/useLibraryStore.ts)): documents, in memory. Persisted by `sync.ts`, not by the store.
- Stores are small and focused; components select the slice they need (`useStore((s) => s.x)`) to avoid re-renders.

## 4. Persistence

Details: [features/storage.md](features/storage.md) and [ADR 0003](decisions/0003-storage-and-database-architecture.md).

```
SQLite  formatex.db   (tauri-plugin-sql, app config dir)
├── meta        key / value (schema_version, ...)
└── documents   id, title, main_file, created_at, updated_at   (the library row of a project)
Files   $APPDATA/
├── documents/<id>/      the project: config.toml, main.md, images/, ... (ProjectFs)
└── fonts/               fonts the user imported
localStorage (UI preferences only): language, theme, sidebar
```

## 5. Internationalization

- `i18next` + `react-i18next`, set up in [`src/i18n/index.ts`](../src/i18n/index.ts). Languages are declared in [`languages.ts`](../src/i18n/languages.ts) with their direction; `applyLanguageSettings` sets `<html dir lang>`.
- Keys are **type-checked** against `en.json` ([`i18next.d.ts`](../src/i18n/i18next.d.ts)); a test checks `fa.json` and `en.json` have identical keys and placeholders.
- Details: [features/i18n-and-theming.md](features/i18n-and-theming.md).

## 6. Theming

Light / dark / system. Tokens are CSS variables in [`src/index.css`](../src/index.css); the `dark` class on `<html>` swaps them. `initTheme()` runs before React renders so the first paint is already correct.

## 7. Platforms

[`src/lib/platform.ts`](../src/lib/platform.ts) is the only place that knows where the app runs (`android`, `ios`, `desktop`, `web`). Native-only code is imported dynamically behind `isTauri()`. See [ADR 0004](decisions/0004-responsive-layout-and-platforms.md).
