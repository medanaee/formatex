# Formatex

Markdown (with HTML-like tags) to a typeset bilingual (Persian / English) PDF.

| Folder | What it is |
| :--- | :--- |
| [`formatex-typ/`](formatex-typ) | The Typst engine: `main.typ`, `src/`, `components/`, docs and the agent skills. Scripts in `tools/` are Node.js (`node tools/build-all.mjs`) and work the same on Windows, macOS and Linux; they need the [Typst CLI](https://typst.app). |
| [`formatex-app/`](formatex-app) | The cross-platform app (Tauri v2: desktop and Android) around the engine. `npm run engine:sync` copies `../formatex-typ` into it. See its `AGENTS.md`. |

## Releases

`.github/workflows/release.yml` builds Windows, macOS, Linux and one Android APK per ABI when the version in
`formatex-app/src-tauri/tauri.conf.json` goes up (a new release), or when a commit message contains `[build]` (the latest
release is rebuilt and its files replaced).
