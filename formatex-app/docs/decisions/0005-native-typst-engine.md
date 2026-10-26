# ADR 0005: The Typst engine runs natively in the app (Rust, `typst` crate)

- **Status:** Accepted
- **Date:** October 2026

## Context

The app typesets documents with the Formatex engine: a Typst project (the sibling folder `formatex-typ/`: `main.typ`, `src/`, `components/`) that reads a Markdown file and a `config.toml`. The editor needs a live preview and PDF export on desktop (Windows, macOS, Linux) and Android; the web comes later. Earlier discussion weighed Typst-in-WASM everywhere against Typst native in Rust.

## Decision

1. **Typst runs natively in the Tauri backend** with the `typst` 0.15 crates (`typst`, `typst-layout`, `typst-pdf`, `typst-svg`, `typst-kit`). The frontend calls three commands: `compile_project`, `export_pdf`, and `fonts_list` / `fonts_reload`.
2. **The engine is embedded in the binary.** `npm run engine:sync` copies `main.typ`, `code-dark.tmTheme`, `src/**` and `components/**` of `../formatex-typ` to `engine/` (git-ignored); `include_dir!` embeds `engine/bundle`. A project folder holds only the user's files. The engine paths are engine-owned: a project can neither shadow nor create them (`engine.rs`, mirrored by `RESERVED_ROOTS` in `paths.ts`).
3. **One `World` per compilation** (`world.rs`) over typst-kit's `FileStore`: engine files from memory, other project paths from `$APPDATA/documents/<id>/`, `@preview/...` packages from the package cache. The Markdown file to typeset is passed as `sys.inputs.source`, which the engine already supports.
4. **The preview is SVG**, one document per page (`typst-svg`): vector, exact glyphs (no font needed in the WebView), no PDF renderer in the frontend. **Export is PDF** (`typst-pdf`) of the same compilation, saved through the native Save dialog.
5. **Packages** (`cmarker`, `mitex`, `cetz`, `lilaq`, `mmdr`, ...) come from the same cache the `typst` CLI uses on desktop (so they work offline once downloaded), from the app's cache folder on Android, and are downloaded from Typst Universe when missing, over rustls (`ureq`), so no OpenSSL is needed on Android.
6. **Fonts** (`fonts.rs`): fonts the user imported (`$APPDATA/fonts`), then the operating system's fonts (desktop), then Typst's embedded ones; on Android the system font folder is scanned as a fallback. Scanning runs in the background at startup.
7. **Diagnostics** are returned with project-relative path, line and column, so the editor can jump to them.
8. A **browser has no compiler yet**: `compileProject` throws `CompilerUnavailableError` and the preview says so. The web release will add a WebAssembly implementation behind the same functions.

## Alternatives Rejected

- **Typst-in-WASM everywhere:** one code path, but slower, memory-limited in mobile WebViews, no direct access to system fonts, and the three plugin-heavy packages would run nested.
- **Calling the `typst` CLI:** not available on Android; process management and no incremental compilation.
- **Embedding the whole parent repo (including `fonts/`, `examples/`, images):** bigger binary and font licensing problems (Font Awesome Pro, IRANSansX); the user's system or imported fonts are used instead.

## Consequences

- Measured on a development machine in a debug build: the first compilation of the starter project took ~6.5 s (font scan and package load), the second ~1 s. Release builds are faster; the preview is rebuilt after typing pauses (400 ms save debounce).
- The Rust build is large (typst, krilla, icu data): the first `cargo` build takes minutes; CI caches `src-tauri/target`.
- The engine must be synced (`npm run engine:sync`) before a Rust build; `build.rs` stops with that instruction when `engine/` is missing. Dev, build, test and typecheck run it automatically.
- Android builds of the crate were not verified on a device (see [todo](../tasks/todo.md)).
