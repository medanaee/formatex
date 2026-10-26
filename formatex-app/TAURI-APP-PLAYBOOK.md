# Tauri v2 Cross-Platform App: Step-by-Step Playbook

A recipe for building the **skeleton** of a Tauri v2 app that runs on **Windows, macOS, Linux and Android** (iOS possible), is ready for the **web**, adapts to **phone / tablet / desktop** screens, supports **i18n (RTL + LTR)** and **light / dark** themes, and stores data in **SQLite**.

It is written so a person or an AI agent can follow it top to bottom. Every step ends with a **checkpoint**: do not continue until it passes. The finished reference implementation is this folder (`formatex-app/`); where a step says *reference*, open that file instead of re-deriving it.

> **Agent instructions:** execute the steps in order. After each step run its checkpoint command. If a checkpoint fails, fix it before moving on; do not stack steps on a broken base. Write all docs, comments and commit messages in English. Report at the end what you verified and what you could not.

---

## Step 0: Decide the inputs

Fill these in once. They replace the placeholders used below.

| Placeholder | Example (this project) | Notes |
| :--- | :--- | :--- |
| `<app-name>` | `formatex-app` | folder + npm name, kebab-case |
| `<ProductName>` | `Formatex` | window title, installer name |
| `<crate>` / `<crate_lib>` | `formatex` / `formatex_lib` | Rust package and library names |
| `<identifier>` | `com.formatex.org` | reverse-DNS, **cannot change after release** |
| `<prefix>` | `formatex` | storage keys: `<prefix>_app_settings`, `<prefix>.db` |
| Languages | `fa` (default, RTL), `en` | first one is the default |
| Screen classes | phone < 640, tablet 640–1023, desktop ≥ 1024 | aligned with Tailwind `sm` / `lg` |
| Targets now / later | Windows, macOS, Linux, Android / web, iOS | |

Decisions already made by this recipe (change only with a reason):

- **Same stack everywhere:** React 19 + TypeScript + Vite + Tailwind v4 + shadcn/ui (Radix) + Lucide + TanStack Router + Zustand + i18next + SQLite.
- **Platform knowledge in one file** (`platform.ts`); UI asks for capabilities or form factors.
- **Storage behind an interface** with a SQLite backend (app) and a localStorage backend (browser).
- **Docs are English**; the product UI is multilingual.

---

## Step 1: Install the toolchain

| Tool | Version | Why |
| :--- | :--- | :--- |
| Node.js | LTS (24+) | Vite, scripts, `node:sqlite` for tests |
| Rust | stable, ≥ 1.90 (edition 2024) | Tauri backend |
| Windows | MSVC Build Tools ("Desktop development with C++") + WebView2 | linker, WebView |
| macOS | Xcode Command Line Tools | |
| Linux | `libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev patchelf pkg-config` | WebKitGTK |
| Android | Android Studio, SDK Platform + Build-Tools, **NDK**, **JDK 17** | mobile builds |
| iOS (optional, macOS only) | Xcode | |

Environment variables for Android (Windows paths shown; adapt):

```text
JAVA_HOME    = C:\Program Files\Java\jdk-17.x
ANDROID_HOME = C:\Users\<you>\AppData\Local\Android\Sdk
NDK_HOME     = %ANDROID_HOME%\ndk\<version>
```

Rust targets:

```bash
rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
# iOS (macOS only): rustup target add aarch64-apple-ios aarch64-apple-ios-sim x86_64-apple-ios
```

> [!WARNING]
> **Windows + Git Bash:** Git's `/usr/bin/link.exe` shadows the MSVC linker and `cargo` fails with `link: extra operand ...`. Run `cargo`, `tauri` and `npm run tauri:*` from **PowerShell or cmd**.

**Checkpoint:** `node -v`, `npm -v`, `rustc --version`, `cargo --version` print versions; for Android `echo $ANDROID_HOME` / `$env:ANDROID_HOME` and `$env:NDK_HOME` are set and `rustup target list --installed` shows the four Android targets.

---

## Step 2: Create the project and install dependencies

```bash
mkdir <app-name> && cd <app-name>
```

Create `package.json` (reference: `package.json`). Scripts:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "lint": "oxlint",
  "typecheck": "tsc -b",
  "preview": "vite preview",
  "test": "vitest run",
  "tauri": "tauri",
  "tauri:dev": "tauri dev",
  "tauri:build": "tauri build",
  "android:init": "tauri android init",
  "android:dev": "tauri android dev",
  "android:build": "tauri android build"
}
```

Dependencies (and why):

| Group | Packages |
| :--- | :--- |
| Native bridge | `@tauri-apps/api`, `@tauri-apps/plugin-sql`, `@tauri-apps/plugin-fs`, `@tauri-apps/plugin-dialog`; dev: `@tauri-apps/cli` |
| UI | `react`, `react-dom`, `radix-ui`, `vaul`, `lucide-react`, `class-variance-authority`, `clsx`, `cn`, `tailwind-merge`, `tw-animate-css`, `shadcn` |
| Styling | `tailwindcss`, `@tailwindcss/vite` |
| Fonts | `@fontsource/inter`, plus one font per script you support (e.g. `@fontsource/vazirmatn` for Persian) |
| Routing / state | `@tanstack/react-router`, `zustand` |
| i18n | `i18next`, `react-i18next` |
| Dev | `vite`, `@vitejs/plugin-react`, `typescript`, `vitest`, `happy-dom`, `oxlint`, `@types/react`, `@types/react-dom`, `@types/node` |

```bash
npm install
```

**Checkpoint:** `npm install` finishes with `found 0 vulnerabilities` (or only known ones) and `npx tauri --version` prints a 2.x version.

---

## Step 3: Configuration files

Create these (reference files in this folder):

1. **`vite.config.ts`**: React + Tailwind plugins, alias `@` → `src`, and the Tauri dev-server settings:

   ```ts
   const host = process.env.TAURI_DEV_HOST          // set by the Tauri CLI for mobile dev (Windows default, or `--host`)
   export default defineConfig({
     plugins: [react(), tailwindcss()],
     resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
     define: { __APP_VERSION__: JSON.stringify(pkg.version) },
     clearScreen: false,                             // do not hide Rust errors
     server: {
       port: 5173, strictPort: true,                 // tauri.conf.json devUrl must match
       host: host || "127.0.0.1",                    // IPv4 on purpose, see Appendix C
       hmr: host ? { protocol: "ws", host, port: 5174 } : undefined,
       watch: { ignored: ["**/src-tauri/**"] },
     },
   })
   ```

2. **`tsconfig.json`** (references), **`tsconfig.app.json`** (`strict`-style flags, `moduleResolution: bundler`, `jsx: react-jsx`, `paths: {"@/*": ["./src/*"]}`, `types: ["vite/client"]`), **`tsconfig.node.json`** (for `vite.config.ts`).
3. **`index.html`**: `lang`/`dir` on `<html>`, and this viewport (note `viewport-fit=cover` for notches and **no** `user-scalable=no`, which blocks accessibility zoom):

   ```html
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
   <meta name="color-scheme" content="light dark" />
   ```

   `<body class="bg-background text-foreground antialiased touch-manipulation">`
4. **`components.json`** (shadcn): `"style": "radix-nova"`, `"rtl": true`, `"iconLibrary": "lucide"`, `"tailwind": { "css": "src/index.css", "cssVariables": true }`, aliases `@/components`, `@/lib/utils`, `@/components/ui`, `@/lib`, `@/hooks`.
5. **`.oxlintrc.json`**: plugins `react`, `typescript`, `oxc`; rule `react/rules-of-hooks: error`.
6. **`.gitignore`**: `node_modules`, `dist`, `*.log`, `.DS_Store`, editor folders.

**Checkpoint:** `npx tsc -b` exits 0 (it may have nothing to check yet) and `npx oxlint` runs.

---

## Step 4: Folder layout

```text
<app-name>/
├── AGENTS.md  README.md  TAURI-APP-PLAYBOOK.md
├── docs/                      (Step 17)
├── src/
│   ├── main.tsx  App.tsx  router.tsx  index.css  globals.d.ts
│   ├── routes/                pages (one file per route)
│   ├── components/
│   │   ├── ui/                shadcn primitives (+ small app-wide ones)
│   │   ├── layout/            AppShell, SideNav, BottomNav, PageHeader
│   │   └── common/            StorageBoot, ResponsiveDialog, logo
│   ├── hooks/                 useFormFactor, useIsPortrait
│   ├── stores/                zustand stores
│   ├── i18n/                  index.ts, languages.ts, i18next.d.ts, locales/*.json
│   └── lib/                   platform, formFactor, theme, layers, history, androidBack, safeStorage, utils, db/
├── src-tauri/                 Cargo.toml, tauri.conf.json, capabilities/, src/, icons/, gen/ (generated)
└── .github/workflows/ci.yml
```

Rules: pages in `routes/`, never in `components/`; `lib/` has no React components; `db/` is the only place that knows SQL.

**Checkpoint:** the folders exist (`mkdir -p` them).

---

## Step 5: Design tokens, fonts, layers

**`src/index.css`** (reference):

1. Imports: `tailwindcss`, `tw-animate-css`, `shadcn/tailwind.css`, then the `@fontsource` weights (400/500/600/700) of each font.
2. `@custom-variant dark (&:is(.dark *));`
3. `@theme inline { --font-sans: 'Inter', 'Vazirmatn', system-ui, ...; --color-background: var(--background); ... }` mapping every token to a Tailwind color/radius.
4. `:root { --background: oklch(...); ... }` (light) and `.dark { ... }` (dark): `background, foreground, card, popover, primary, secondary, muted, accent, destructive, border, input, ring, sidebar*`.
5. `@layer base`: border/outline defaults, `html { color-scheme }` per theme, thin theme-aware scrollbars, `html, body, #root { height: 100%; overscroll-behavior: none }`.
6. Safe-area utilities (they are used by the shell):

   ```css
   @utility pt-safe { padding-top: env(safe-area-inset-top, 0px); }
   @utility pb-safe { padding-bottom: env(safe-area-inset-bottom, 0px); }
   @utility ps-safe { padding-inline-start: env(safe-area-inset-left, 0px); }
   @utility pe-safe { padding-inline-end: env(safe-area-inset-right, 0px); }
   ```

**`src/lib/layers.ts`**: one object of z-index tiers; popovers must sit **above** modals (a `Select` inside a `Dialog` is portalled to `<body>`):

```ts
export const LAYERS = {
  CONTENT: "z-0", CHROME: "z-10", FLOATING: "z-40",
  DRAWERS: "z-[60]", MODALS: "z-[70]", POPOVERS: "z-[80]", NOTIFICATIONS: "z-[100]",
} as const
```

**`src/lib/utils.ts`**: `export { cn } from "cn"`.

**Checkpoint:** `npx vite build` succeeds once `main.tsx` exists (do it after Step 12), or for now `npx tsc -b`.

---

## Step 6: UI primitives (shadcn)

1. Add the primitives you need with the CLI (it reads `components.json`):

   ```bash
   npx shadcn@latest add button dialog drawer input label popover sheet switch textarea select dropdown-menu tooltip --yes
   ```

2. **Patch what the CLI generates** (reference: `src/components/ui/*`):
   - Replace every `z-50` / `z-[..]` with a `LAYERS.*` tier (`dialog` → `MODALS`, `drawer`/`sheet` → `DRAWERS`, `popover`/`select`/`dropdown-menu`/`tooltip` → `POPOVERS`).
   - Replace hard-coded English strings (`"Close"`) with `t("common.close")` via `useTranslation()`.
   - Check logical properties (`start-*`, `end-*`, `ps-*`, `pe-*`); RTL-flip anything directional.
3. Add small app-wide primitives next to them, e.g. `segmented-control.tsx` (Radix `ToggleGroup`, a choice cannot be switched off).
4. Wrap the app once in `<TooltipProvider>`.

Rule for the rest of the project: **no raw `<select>`, checkbox, `<dialog>` or `alert()`**.

**Checkpoint:** `npx tsc -b` exits 0 and `npx oxlint` has no errors.

---

## Step 7: Platform and form factor

**`src/lib/platform.ts`** (reference): the only file that inspects the environment.

```ts
export type PlatformKind = "android" | "ios" | "desktop" | "web"
export const isTauri = () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window
export function platformKind(): PlatformKind {
  if (!isTauri()) return "web"
  const ua = navigator.userAgent
  if (/Android/i.test(ua)) return "android"
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios"
  return "desktop"
}
```

Also `desktopOs()` (shortcut labels) and `hasFinePointer()` (`matchMedia("(hover: hover) and (pointer: fine)")`, only to add extras, never to gate features).

**`src/lib/formFactor.ts`**: breakpoints that equal Tailwind's:

```ts
export type FormFactor = "phone" | "tablet" | "desktop"
export const BREAKPOINTS = { tablet: 640, desktop: 1024 } as const
export const formFactorFor = (w: number): FormFactor =>
  w >= BREAKPOINTS.desktop ? "desktop" : w >= BREAKPOINTS.tablet ? "tablet" : "phone"
```

**`src/hooks/useFormFactor.ts`**: `useSyncExternalStore` over two `matchMedia` queries, so components re-render only when the **class** changes, not on every resize pixel. Also copy `useIsPortrait`.

Rules: native-only modules are loaded with `await import(...)` behind `isTauri()`; UI never reads `navigator.userAgent`.

**Checkpoint:** a unit test checks `formFactorFor` at 639 / 640 / 1023 / 1024 (reference: `formFactor.test.ts`); `npm test` passes.

---

## Step 8: Internationalization

1. **`src/i18n/languages.ts`**: one table, direction included:

   ```ts
   export const LANGUAGES = { fa: { label: "فارسی", dir: "rtl" }, en: { label: "English", dir: "ltr" } } as const
   export type AppLanguage = keyof typeof LANGUAGES
   ```

   plus `SUPPORTED_LANGUAGES`, `DEFAULT_LANGUAGE`, `isSupportedLanguage()`, `directionOf()`.
2. **`src/i18n/index.ts`**: init `i18next` with `initReactI18next`, `fallbackLng: "en"`, `escapeValue: false`. Initial language = saved settings → browser language (if supported) → default. `applyLanguageSettings(lang)` sets `document.documentElement.dir` and `.lang`; call it at boot and on `languageChanged`.
3. **`src/i18n/locales/<lang>.json`**: nested keys (`common.*`, `nav.*`, one group per page).
4. **`src/i18n/i18next.d.ts`**: type the keys from `en.json`:

   ```ts
   declare module "i18next" {
     interface CustomTypeOptions { defaultNS: "translation"; resources: { translation: typeof enLocale } }
   }
   ```
5. **Locale test** (reference: `locales.test.ts`): identical keys, identical `{{placeholders}}`, no empty strings.

Rules: no hard-coded UI strings; logical CSS properties only (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `border-s/e`); `rtl:rotate-180` on directional icons; `dir="auto"` on user-entered text; dates via `Intl.DateTimeFormat(lang === "fa" ? "fa-IR" : "en-US")`.

**Checkpoint:** `npm test` (locale test passes) and `npx tsc -b` (a wrong `t("...")` key is a compile error).

---

## Step 9: Theme (light / dark / system)

1. **`src/lib/persistedSettings.ts`**: the storage key (`<prefix>_app_settings`) and `readPersistedSettings()` that **never throws** (so theme and language can be read before React starts).
2. **`src/lib/theme.ts`** (reference): `ThemePreference = "light" | "dark" | "system"`, `resolveTheme()`, `applyTheme()` (toggles the `dark` class on `<html>`), `watchSystemTheme()` (follows the OS live while the preference is `system`), `initTheme()` (reads the saved preference, applies it, starts watching).
3. **`src/main.tsx`** calls `initTheme()` **before** `createRoot(...).render(...)`: no light flash in dark mode.
4. **`src/lib/safeStorage.ts`**: zustand `persist` storage that falls back to memory and reports quota errors instead of throwing.
5. **`src/stores/useSettingsStore.ts`**: `theme`, `language`, `sidebarOpen`; actions call `applyTheme` / `applyLanguageSettings` / `i18n.changeLanguage`; `onRehydrateStorage` validates stored values and re-applies them.

**Checkpoint:** reference `theme.test.ts` (happy-dom) passes: explicit choice, `system` resolution, class toggling, early apply from storage, invalid stored value.

---

## Step 10: Responsive shell

**`src/components/layout/`** (reference):

- `navItems.ts`: the top-level destinations (`to`, Lucide `icon`, `labelKey`), rendered by both navs.
- `SideNav.tsx` (tablet / desktop): `compact` = icon rail (64 px), else a 224 px sidebar with labels; active link styled through TanStack's `data-[status=active]`; collapse button on desktop only (`rtl:rotate-180` on its icon).
- `BottomNav.tsx` (phone): `h-14` items, `pb-safe`.
- `PageHeader.tsx`: one row, `h-14`: `leading`, `title`, `actions`.
- `AppShell.tsx`: the layout:

  ```text
  phone   : [ page ] + [ BottomNav ]     (nav hidden if a route sets staticData.fullscreen)
  tablet  : [ rail ][ page ]
  desktop : [ sidebar | rail ][ page ]
  ```

  The root `div` is `h-dvh overflow-hidden pt-safe ps-safe pe-safe` (+ `pb-safe` when there is no bottom bar). The shell never scrolls; each page owns one `overflow-y-auto` region.

**`src/components/common/ResponsiveDialog.tsx`**: bottom sheet (vaul `Drawer`) on a phone, centered `Dialog` otherwise; use it for every short form and confirmation.

Page patterns: grids `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`; forms and settings `mx-auto max-w-xl`; touch targets ≥ 40 px (`size="lg"` buttons are `h-9`; use `h-10` for primary inputs).

**Checkpoint:** later (Step 15) the app is resized to 360 / 768 / 1280 px and shows bottom bar / rail / sidebar.

---

## Step 11: Storage (SQLite + web fallback)

Reference: `src/lib/db/*`. Build in this order:

1. **`types.ts`**: domain types, `SqlDriver { execute, select }` (one statement per call), `FileStore { put, get, remove, removeDir }`, and `Repository` (domain operations only: `loadX`, `saveX`, `deleteX`, `getMeta`, `setMeta`).
2. **`schema.ts`**: `MIGRATIONS: string[][]` (idempotent `CREATE ... IF NOT EXISTS`), `runMigrations(driver)` records `meta.schema_version`, refuses a database **newer** than the app. **Never edit an applied migration**, add a new one.
3. **`sqliteRepository.ts`**: implements `Repository` over a `SqlDriver` (`INSERT ... ON CONFLICT(id) DO UPDATE`).
4. **`webRepository.ts`**: implements the same interface over localStorage (`vite dev`, UI tests, the web build until SQLite-WASM).
5. **`tauriBackend.ts`**: `createTauriDriver()` (`Database.load("sqlite:<prefix>.db")`, `PRAGMA journal_mode = WAL`, `busy_timeout = 5000`, `synchronous = NORMAL`) and `TauriFileStore` over `plugin-fs` with `BaseDirectory.AppData`. Everything imported dynamically.
6. **`index.ts`**: `openStorage()` picks SQLite when `isTauri()`, else the web repository; it must share one in-flight open (React StrictMode runs effects twice).
7. **`writeQueue.ts`**: serial, coalescing queue (the latest write per key wins; a delete replaces a pending save; `flush()` runs all now).
8. **`sync.ts`**: `startPersistence()` opens the storage, hydrates the store, **then** subscribes (so loading is not written back); diffs documents by reference; debounces saves (~500 ms); flushes on `visibilitychange: hidden` and `pagehide`. Returns the same promise when called twice.
9. **Stores** (`useLibraryStore`) only change memory; they never await storage.
10. **`StorageBoot.tsx`**: shows a spinner while loading and an error with **Try again** on failure (never an empty library that looks like data loss); `main.tsx` renders `<StorageBoot><App/></StorageBoot>`.
11. **Tests** run the real SQL against `node:sqlite` in memory (`testDriver.ts`): migrations (create, rerun, too-new), repository CRUD (incl. Persian text), and the sync flow.

Rules: binaries are **files**, not BLOBs (BLOBs travel as JSON through the plugin IPC); single-statement writes (the plugin has no reliable cross-call transactions); new table = new migration + `Repository` method in **both** backends + test.

**Checkpoint:** `npm test` passes the db tests.

---

## Step 12: Routing and entry

1. **`src/lib/history.ts`**: memory history inside the app, browser history on the web:

   ```ts
   export const createAppHistory = () => isTauri() ? createMemoryHistory({ initialEntries: ["/"] }) : createBrowserHistory()
   ```
2. **`src/router.tsx`**: code-based routes; root route `component: AppShell`, `notFoundComponent`; per-route layout hints via `staticData`:

   ```ts
   declare module "@tanstack/react-router" {
     interface Register { router: typeof router }
     interface StaticDataRouteOption { fullscreen?: boolean }
   }
   ```
3. **`src/routes/*.tsx`**: one page per route (Library, Editor, Settings, NotFound). Pages use `PageHeader`, `ResponsiveDialog`, `t()`, logical classes and semantic tokens only.
4. **`src/lib/androidBack.ts`**: on Android, `onBackButtonPress` from `@tauri-apps/api/app` → `history.back()` if possible, else `exit(0)` (memory history leaves the WebView history empty, so the default back button would otherwise close the app). Installed once in `App.tsx`.
5. **`src/main.tsx`**: `initTheme()` → imports (`./i18n`, `./index.css`) → render `<StrictMode><StorageBoot><App/></StorageBoot></StrictMode>`.

**Checkpoint:** `npm run typecheck && npm run lint && npm test && npm run build` all pass.

---

## Step 13: Tauri (Rust) side

Reference: `src-tauri/`.

1. **`Cargo.toml`**:

   ```toml
   [package]
   name = "<crate>"
   edition = "2024"
   rust-version = "1.90"

   [lib]
   name = "<crate_lib>"
   crate-type = ["staticlib", "cdylib", "rlib"]     # mobile links the first two, `cargo test` uses rlib

   [build-dependencies]
   tauri-build = { version = "2", features = [] }

   [dependencies]
   serde = { version = "1.0", features = ["derive"] }
   serde_json = "1.0"
   log = "0.4"
   tauri = { version = "2", features = [] }
   tauri-plugin-log = "2"
   tauri-plugin-dialog = "2"
   tauri-plugin-fs = "2"
   tauri-plugin-sql = { version = "2", features = ["sqlite"] }
   ```
2. **`build.rs`**: `fn main() { tauri_build::build() }`.
3. **`src/main.rs`**: `#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]` and `<crate_lib>::run();`.
4. **`src/lib.rs`**: `#[cfg_attr(mobile, tauri::mobile_entry_point)] pub fn run()` registers the plugins (`dialog`, `fs`, `sql`), logging in debug builds, then `.run(tauri::generate_context!())`. Desktop-only modules/commands are added behind `#[cfg(desktop)]` so the mobile library still compiles.
5. **`tauri.conf.json`**: `productName`, `identifier`, `build` (`frontendDist: ../dist`, `devUrl: http://127.0.0.1:5173`, `beforeDevCommand: npm run dev`, `beforeBuildCommand: npm run build`), one window (`minWidth: 360`, `minHeight: 480` so the phone layout is reachable), `bundle.targets: "all"`, `bundle.android.debugApplicationIdSuffix: ".debug"`. A real **CSP** is a follow-up (`csp: null` for now).
6. **`capabilities/default.json`**: least privilege. Only the permissions a feature needs, with the filesystem scoped to exact folders:

   ```json
   {
     "identifier": "default", "windows": ["main"],
     "permissions": [
       "core:default", "dialog:allow-open", "dialog:allow-save",
       "fs:allow-write-file", "fs:allow-read-file", "fs:allow-read-dir", "fs:allow-mkdir", "fs:allow-remove", "fs:allow-exists",
       "sql:default", "sql:allow-execute",
       { "identifier": "fs:scope", "allow": [{ "path": "$APPDATA/documents/**" }, { "path": "$APPDATA/fonts/**" }] }
     ]
   }
   ```
7. **`src-tauri/.gitignore`**: `/target/` and `/gen/`.

Adding a native command later: `#[tauri::command] fn ...`, register it in `invoke_handler`, list it in `build.rs` (`AppManifest::new().commands(&[...])`) to get an `allow-<name>` permission, then add that permission to the capability.

**Checkpoint (from PowerShell/cmd on Windows):** `cargo check --manifest-path src-tauri/Cargo.toml` finishes with `Finished`.

---

## Step 14: Icons

Two source images in `src/assets/`, because the platforms treat icons differently:

- `icon.png` (512 px, with its own rounded shape): **Windows, macOS, Linux, iOS, favicon**. These draw exactly the image they are given.
- `maskable.png` (512 px, full-bleed, logo inside the central safe zone): **Android only**. Android masks the icon itself and cuts the outer part away, so the logo needs a lot of padding.

`scripts/make-icons.mjs` (reference) runs `tauri icon` twice (`icon.png` for everything; `maskable.png` with `-o <tmp>`, whose `android/` folder replaces the first run's) and copies the favicon, touch icon and maskable image to `public/`. Run it with `npm run icons`. Commit `src-tauri/icons/` (including `android/`, because `gen/` is generated), `public/` and `src/assets/`.

**Checkpoint:** `src-tauri/icons/icon.ico`, `icon.icns`, `android/mipmap-xxxhdpi/ic_launcher_foreground.png` (432 px, full-bleed) and `public/favicon-32.png` exist.

---

## Step 15: Run it on every target

```bash
npm run dev                # 1. browser: http://localhost:5173
npm run tauri:dev          # 2. desktop window (first run compiles Rust: minutes)
npm run android:init       # 3. once per machine: creates src-tauri/gen/android (git-ignored)
npm run android:dev        #    emulator or USB device with debugging on
```

Manual checks, in this order:

1. **Resize** the window (or browser) to ~360, ~768 and ~1280 px: bottom bar → icon rail → sidebar; the "New" button shows its label only from `sm`.
2. **Language:** Settings → switch fa/en: layout mirrors, `<html dir>` flips, fonts change, no overflowing text.
3. **Theme:** light / dark / system; reload in dark: no light flash.
4. **Data:** create a document, type, close the app (kill it), reopen: the data is there.
5. **Android:** back button goes back then exits; the keyboard does not hide the focused field; notch/home-indicator areas are padded.

If the Android device cannot reach the dev server, pass your LAN address: `npm run android:dev -- --host <your-ip>`. Release builds: `npm run tauri:build` (installers in `src-tauri/target/release/bundle/`), `npm run android:build`.

**Checkpoint:** all five manual checks pass.

---

## Step 16: Tests and CI

- **Unit tests** (`vitest run`): put `*.test.ts(x)` next to the code. UI tests start with `// @vitest-environment happy-dom`. Required: locale parity, schema/migrations, repository, sync, form factor, theme.
- **CI** (`.github/workflows/ci.yml`, reference): job `web` (`npm ci`, typecheck, lint, test, build on Ubuntu), job `desktop` on a matrix of `windows-latest`, `macos-latest`, `ubuntu-22.04` (Linux packages from Step 1, `rust-cache`, `cargo test --lib`, `npx tauri build`, upload bundles). Signing/notarization secrets are added later as `env:` of the build step.

**Checkpoint:** the four frontend commands pass locally; the workflow file is valid YAML.

---

## Step 17: Documentation and agent rules

Create the docs **before** the project grows (reference: `AGENTS.md`, `docs/`):

| File | Content |
| :--- | :--- |
| `AGENTS.md` | Product identity, form-factor philosophy, tech-stack table, the numbered **Fundamental Rules** (English docs; no native controls; semantic tokens; no hard-coded strings; logical CSS; touch/safe-area; `LAYERS`; platform code only in `platform.ts`; storage through `Repository`; sync docs and todo), commands, doc map |
| `docs/AGENTS.md` | Doc map and doc rules (English, sync on completion, immutable ADRs, relative links, three form factors per feature) |
| `docs/architecture.md` | Layers diagram, routing, state, persistence, i18n, theming, platforms |
| `docs/codebase-map.md` | File-by-file lookup |
| `docs/agent-workflow.md` | Task lifecycle, guardrails, when an ADR is required, definition of done |
| `docs/design-roles/AGENTS.md`, `guidelines.md` | Design pillars, pre-delivery checklist, adaptive layout, RTL, touch rules |
| `docs/decisions/0001…0004` | Stack · routing/state · storage · responsive layout & platforms |
| `docs/features/*.md` | One spec per feature with phone / tablet / desktop sections |
| `docs/tasks/todo.md` | Done / next / known issues |

**Checkpoint:** every relative link in `AGENTS.md` and `docs/` resolves.

---

## Step 18: Final acceptance checklist

Run and report each line as ✅ / ❌ / not verified:

```bash
npm run typecheck
npm run lint
npm test
npm run build
cargo check --manifest-path src-tauri/Cargo.toml     # from PowerShell/cmd on Windows
npx tauri android init --ci                          # proves the Android toolchain
```

- [ ] Browser, desktop window and Android emulator all open the app
- [ ] 360 / 768 / 1280 px layouts correct, no horizontal scroll
- [ ] fa (RTL) and en (LTR) both correct; locale test passes
- [ ] Light, dark and system themes correct; no flash on reload
- [ ] Data survives killing the app
- [ ] Android back button works; safe areas respected
- [ ] No hard-coded colors / strings / `z-` values / raw form controls (`grep` for `bg-white`, `text-black`, `ml-`, `mr-`, `z-\[`, `<select`)
- [ ] Docs and `tasks/todo.md` updated

---

## Appendix A: Making the web build real

The skeleton already uses browser history and a `WebRepository`. Before shipping a web release:

1. Replace `WebRepository` with SQLite-WASM on OPFS (same `Repository` interface) or IndexedDB.
2. Provide web equivalents for file open/save (`<input type=file>` through a styled button, `showSaveFilePicker` / download).
3. Keep every native API behind `isTauri()` + dynamic `import()`; `npm run build` output must run with no Tauri present.
4. Decide on PWA (manifest, service worker) and hosting; add a CSP.

## Appendix B: iOS

Same code. On a Mac: `rustup target add aarch64-apple-ios aarch64-apple-ios-sim`, `npx tauri ios init`, `npx tauri ios dev`. `platformKind()` already returns `"ios"`. Needs an Apple developer account for devices and the store.

## Appendix C: Pitfalls seen while building this skeleton

| Symptom | Cause / fix |
| :--- | :--- |
| `link: extra operand` while compiling build scripts on Windows | Git Bash's `link.exe` shadows MSVC. Use PowerShell/cmd. |
| Android app shows a blank page | Dev server unreachable: `strictPort` + `server.host` from `TAURI_DEV_HOST`; pass `--host <ip>` for physical devices. |
| Back button closes the app on the first press | Memory history leaves the WebView history empty: install the `onBackButtonPress` handler (Step 12). |
| Select/Dropdown opens *behind* a Dialog | Wrong z-index order: `POPOVERS` must be above `MODALS` (Step 5). |
| Light flash on start in dark mode | `initTheme()` must run before React renders (Step 9). |
| Library looks empty after a storage error | Never render the app before storage is ready; show the retry screen (Step 11). |
| Two subscriptions / double writes in dev | StrictMode runs effects twice: `openStorage()` and `startPersistence()` must return one shared promise. |
| `sqlx` plugin and transactions | One statement per call; design writes as independent, idempotent statements. |
| `tauri dev` hangs on "Running DevCommand" and no window opens | Vite listened on `::1` only (Node resolves `localhost` to IPv6 first) while the Tauri CLI waits on IPv4. Set `server.host` to `127.0.0.1` and `devUrl` to `http://127.0.0.1:5173`. |
| Pinch-zoom blocked on phones | Do not use `user-scalable=no` / `maximum-scale=1`. |
| Capability errors at runtime (`not allowed`) | Add the exact permission to `capabilities/default.json`; fs paths must be inside a declared scope. |

## Appendix D: Embedding a native engine (what the Formatex app did with Typst)

For an app whose core is a Rust library (a typesetter, a parser, a renderer) that must also run on Android:

1. **Keep the engine outside the app and embed a generated copy.** A script (`scripts/sync-engine.mjs`) copies the engine's files into a git-ignored `engine/`; `build.rs` stops with a clear message when it is missing; `include_dir!` embeds it. `dev`, `build`, `test` and `typecheck` run the script first (`predev`, `prebuild`, ...).
2. **Give the engine a virtual project root.** The user's files live in a folder under `$APPDATA`; engine-owned paths are served from memory and cannot be shadowed. The frontend and Rust validate the same reserved names.
3. **Expose three commands, not the library:** `compile`, `export`, and (if needed) resource listing. Run the work in `spawn_blocking`; return plain serializable structs; send binary results with `tauri::ipc::Response`.
4. **Share state once:** build an `Arc<Engine>` in `setup` (data dir, caches, fonts) and `manage` it. Warm slow things (font scan) in a background thread.
5. **Avoid OpenSSL:** choose rustls-based HTTP (`ureq` with `tls`) so Android needs no native TLS build.
6. **Test the engine in Rust**, end to end, with a real project: a `#[test]` that writes a project folder to the temp dir, compiles it, checks the output type, and checks that a mistake yields a diagnostic instead of a panic.
7. **Make the browser build honest:** the frontend wrapper throws a dedicated `CompilerUnavailableError` outside Tauri, and the UI says so; replace it with a WebAssembly build later without touching callers.
8. **Read the real API.** Native libraries change between versions (typst-kit 0.15 is a set of building blocks, unlike 0.14): open the crate sources in `~/.cargo/registry/src` instead of guessing.
