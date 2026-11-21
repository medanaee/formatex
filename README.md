# Formatex

Markdown (with HTML-like tags) to a typeset bilingual (Persian / English) PDF.

| Folder | What it is |
| :--- | :--- |
| [`formatex-core/`](formatex-core) | Shared preparation/settings/IR and source maps; Rust/WASM pulldown-cmark runs inside Typst. Owns six-file component packages. |
| [`formatex-pdf/`](formatex-pdf) | Pure Typst IR-to-layout/PDF and graphics backend. |
| [`formatex-html/`](formatex-html) | Independent React/TSX/Tailwind HTML renderer and hydrated viewer shell; document content is static SSR. |
| [`formatex-typ/`](formatex-typ) | Generated core+PDF standalone distribution and locally runnable tools, docs and skills. Sync before consuming changed core sources. |
| [`formatex-app/`](formatex-app) | Tauri desktop/Android app; `engine:sync` consumes core+pdf+html directly. See its `AGENTS.md`. |
| [`formatex-landing/`](formatex-landing) | React/Vite landing page, deployed as Cloudflare Workers static assets. |

Run `npm install` from this workspace root using the root lockfile. The four npm workspaces are core, HTML, app and generated `@formatex/typ`; PDF has no npm package. `npm run typ:sync` builds core WASM and assembles the standalone snapshot. Its other tools operate on that snapshot without siblings; source documents/assets stay external. See [the implementation plan](formatex-app/docs/tasks/shared-core-pdf-html-plan.md) for verified milestones and remaining parity/platform gates.

## Releases

`.github/workflows/release.yml` builds Windows, macOS, Linux and one Android APK per ABI when the version in
`formatex-app/src-tauri/tauri.conf.json` goes up (a new release), or when a commit message contains `[build]` (the latest
release is rebuilt and its files replaced).


