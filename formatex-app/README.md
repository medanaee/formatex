# Formatex App

Cross-platform application around the Formatex Typst engine (Markdown + tags → typeset bilingual PDF).

**Targets:** Windows, macOS, Linux, Android (Tauri v2); web next. Phone, tablet and desktop layouts. Persian (RTL) and English (LTR). Light, dark and system themes.

## Stack

Tauri v2 · React 19 · TypeScript · Vite · Tailwind CSS v4 · shadcn/ui (Radix, vaul) · Lucide · TanStack Router · Zustand · SQLite (`tauri-plugin-sql`) · i18next · Vitest · oxlint.

## Quick start

```bash
npm install
npm run dev          # frontend in a browser: http://localhost:5173
npm run tauri:dev    # desktop app
```

Android (needs Android Studio, SDK, NDK, JDK 17 and the Rust Android targets; see the playbook, step 1):

```bash
npm run android:init   # once
npm run android:dev
```

> On Windows run `cargo` / `tauri` / `npm run tauri:*` from PowerShell or cmd, not Git Bash.

## Checks

```bash
npm run typecheck && npm run lint && npm test && npm run build
cargo check --manifest-path src-tauri/Cargo.toml
```

## Documentation

- [AGENTS.md](AGENTS.md): rules for AI agents (read first).
- [docs/](docs): architecture, decisions, specs, design rules, task board.
- [TAURI-APP-PLAYBOOK.md](TAURI-APP-PLAYBOOK.md): step-by-step recipe to build this kind of app from scratch.
