# AGENTS.md — Formatex App Core Agent Guidelines

This is the foundational operating manual for every AI agent working in this folder. Read it, and the documents it links, before proposing, modifying or creating any code or documentation.

---

## 1. Product Identity

**Formatex** turns Markdown (plus HTML-like tags) into a typeset, bilingual (Persian / English, RTL / LTR) PDF. The typesetting engine is a Typst project that lives in the sibling folder `../formatex-typ` of this repository (`main.typ`, `components/`, `src/`; set `FORMATEX_ENGINE` to use another path). **This folder (`formatex-app/`) is the cross-platform application around that engine**: a library of projects, an **editor** (CodeMirror with autocomplete from the engine's schema), a live **preview** (native Typst), a per-project file tree, per-project settings (`config.toml`), PDF export, and a **component library** where users edit the engine's components and define tags of their own (a store of components is planned).

Targets, in order of delivery:

1. **Desktop:** Windows, macOS, Linux (Tauri v2).
2. **Android** (Tauri v2 mobile).
3. **Web** (the same frontend in a browser; the app is structured for it from day one, see [ADR 0004](docs/decisions/0004-responsive-layout-and-platforms.md)).
4. iOS is possible with the same code and is not a target yet.

---

## 2. Form-Factor Philosophy: Phone, Tablet and Desktop Are All First-Class

> [!IMPORTANT]
> Every screen is designed for **three screen classes at once**: phone (< 640 px), tablet (640–1023 px) and desktop (≥ 1024 px). None is a "secondary adaptation".
> A feature is not done until it works, is reachable with a thumb on the phone layout, and uses the space on the desktop layout.

The classes, their navigation pattern and the helper that detects them are specified in [docs/features/responsive-layout.md](docs/features/responsive-layout.md). In code, use `useFormFactor()` (JS) or the Tailwind `sm:` / `lg:` prefixes (CSS); both use the same breakpoints.

---

## 3. Technology Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Native runtime** | Tauri v2 (Rust, edition 2024) | Desktop and Android now; iOS possible. Library crate `formatex_lib`. |
| **Typesetting** | Typst 0.15 as a Rust crate (`typst`, `typst-kit`, `typst-pdf`, `typst-svg`) | Native, embedded engine; SVG preview, PDF export ([ADR 0005](docs/decisions/0005-native-typst-engine.md)). |
| **Editor** | CodeMirror 6 | Markdown + TOML, per-line RTL / LTR, schema-driven autocomplete ([`src/lib/editor/`](src/lib/editor)). |
| **Frontend** | React 19 + TypeScript + Vite | Type-safe component layer; path alias `@/` → `src/`. |
| **Styling** | Tailwind CSS v4 + tw-animate-css | OKLCH design tokens in [`src/index.css`](src/index.css). |
| **UI components** | shadcn/ui (`radix-nova`, RTL on) + Radix UI + vaul | Source lives in [`src/components/ui/`](src/components/ui). |
| **Icons** | Lucide React | One stroke / size system. |
| **Routing** | TanStack Router (code-based) | Memory history inside the app, browser history on the web. |
| **State** | Zustand | In-memory stores; settings persisted through a safe localStorage wrapper. |
| **Database** | SQLite via `tauri-plugin-sql` | Behind a `Repository` interface; localStorage fallback in a browser. |
| **Files** | `tauri-plugin-fs` (`$APPDATA`) | A project is a folder of real files (`ProjectFs`); never BLOBs in SQLite. |
| **i18n** | i18next + react-i18next | `fa` (default, RTL) and `en` (LTR); typed keys. |
| **Theme** | `light` / `dark` / `system` | CSS variables switched by a `dark` class on `<html>`. |
| **Fonts (UI)** | Inter (Latin), Vazirmatn (Persian) | Bundled through `@fontsource`. |
| **Fonts (documents)** | System fonts on desktop, imported fonts (Android and any OS) | Read by the native compiler ([features/fonts.md](docs/features/fonts.md)). |
| **Tests** | Vitest + happy-dom, real SQLite through `node:sqlite` | `npm test`. |
| **Lint** | oxlint | `npm run lint`. |

Dependency changes follow [docs/agent-workflow.md](docs/agent-workflow.md).

---

## 4. Fundamental Rules for AI Agents

1. **DOCUMENTATION LANGUAGE RULE:** All documentation, Markdown files, code comments, commit messages and ADRs are written in **English**. The *product UI* is bilingual; the *repository* is English.
2. **NO NATIVE BROWSER CONTROLS:** never use raw `<select>`, checkboxes, radios, `<dialog>`, file inputs or default scrollbars. Use the shadcn/ui components in `src/components/ui/` (`Select`, `DropdownMenu`, `Switch`, `Dialog`, `Drawer`, `Popover`, `Tooltip`, `SegmentedControl`). Missing one? Add it with `npx shadcn@latest add <name>` and route its z-index through `LAYERS`.
3. **SEMANTIC COLOR TOKENS ONLY:** never write `bg-white`, `text-black`, hex or `rgb()` in a component. Use `bg-background`, `text-foreground`, `bg-muted`, `border-border`, `text-muted-foreground`, `bg-primary`, etc., so light and dark both work.
4. **NO HARD-CODED USER-FACING STRINGS:** every string goes through `useTranslation().t()` with the key present in **both** `fa.json` and `en.json` (a test enforces identical keys and placeholders).
5. **LOGICAL CSS PROPERTIES:** use `ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `border-s`, `border-e`, `rounded-s-*`, `text-start`. Never `ml-*`, `mr-*`, `left-*`, `right-*`, `text-left`. Directional icons get `rtl:rotate-180`.
6. **ADAPTIVE, TOUCH-SAFE LAYOUT:** no hover-only interactions, no fixed pixel widths that break at 360 px, touch targets ≥ 40 px (`h-10`/`size-10`; icon buttons at least `size-9`), and pages never handle safe-area insets themselves (the shell does: `pt-safe`, `pb-safe`, `ps-safe`, `pe-safe`).
7. **Z-INDEX ONLY THROUGH `LAYERS`:** import `LAYERS` from [`src/lib/layers.ts`](src/lib/layers.ts); never write `z-[123]`.
8. **PLATFORM CODE STAYS IN `src/lib/platform.ts`:** UI code asks for a capability or a form factor, never `navigator.userAgent`. Anything that exists only in the native app is loaded with a dynamic `import()` guarded by `isTauri()`, so the web build keeps working.
9. **STORAGE THROUGH THE REPOSITORY:** UI and stores never write SQL and never call the SQL plugin. Add an operation to `Repository`, implement it in `SqliteRepository` **and** `WebRepository`, and test it. Schema changes are **new numbered migrations**; never edit an applied one.
10. **COMPACT AND MINIMAL (MANDATORY):** every screen is dense, flat and quiet: small type (`text-xs` / `text-[13px]` in chrome), slim bars (`h-11` toolbars, `h-9` rows, `h-8` status bars), icon buttons with tooltips instead of text labels, no explanatory paragraphs, no shadows or gradients, one primary button per bar. The numbers and the checklist are in [docs/design-roles/guidelines.md](docs/design-roles/guidelines.md) §1; a change that adds chrome must remove or justify something.
11. **ENGINE FILES ARE READ-ONLY IN THE APP:** `engine/` is generated by `npm run engine:sync` from the Typst project in `../formatex-typ`. Never edit it; change the engine there and sync. A project can neither create nor shadow `main.typ`, `src/`, `components/`, `tools/` or `code-dark.tmTheme`. User components live in the app's component library ([ADR 0007](docs/decisions/0007-component-library.md)), never in `engine/`.
12. **AGENT SYNCHRONIZATION:** before finishing a session, update the relevant documents in `docs/` and log completed / pending work in [`docs/tasks/todo.md`](docs/tasks/todo.md).

---

## 5. Commands

```bash
npm install
npm run engine:sync    # copy the Typst engine from ../formatex-typ into engine/ (dev, build, test and typecheck run it)
npm run icons          # rebuild every icon from src/assets/icon.png (desktop, web) and maskable.png (Android)
npm run dev            # frontend only, in a browser (http://localhost:5173); no compiler there
npm run tauri:dev      # desktop app with hot reload
npm run android:init   # once per machine: generates src-tauri/gen/android
npm run android:dev    # Android emulator / device
npm run typecheck && npm run lint && npm test && npm run build   # the frontend gate
cargo check --manifest-path src-tauri/Cargo.toml                # the Rust gate
```

> [!NOTE]
> On Windows run `cargo` / `tauri` from **PowerShell or cmd**, not Git Bash: Git's `/usr/bin/link.exe` shadows the MSVC linker and the build fails with "extra operand" errors.

---

## 6. Documentation Directory Map (`docs/`)

- [`docs/AGENTS.md`](docs/AGENTS.md): how to navigate and maintain the documentation.
- [`docs/architecture.md`](docs/architecture.md): layers, data flow, routing, state, persistence, i18n, theming.
- [`docs/codebase-map.md`](docs/codebase-map.md): where everything lives.
- [`docs/agent-workflow.md`](docs/agent-workflow.md): task lifecycle, guardrails, ADR rules.
- [`docs/design-roles/`](docs/design-roles): UI/UX directives and the pre-delivery checklist.
- [`docs/features/`](docs/features): specifications (editor, components, fonts, app icons, responsive layout, storage, i18n and theming).
- [`docs/decisions/`](docs/decisions): Architecture Decision Records.
- [`docs/tasks/todo.md`](docs/tasks/todo.md): task board and roadmap.
- [`TAURI-APP-PLAYBOOK.md`](TAURI-APP-PLAYBOOK.md): the step-by-step recipe this skeleton was built from; reusable for other Tauri apps.
