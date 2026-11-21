# Formatex shared core

Core owns the common document-language pipeline and shared component contracts. `typst/src/document.typ` evaluates source-mapped preparation/settings/variables/includes inside Typst and invokes the embedded Rust/WASM pulldown-cmark parser in `parser/`. Both output backends consume its DocumentIR; neither reparses Markdown in JavaScript. `typst/src/evaluation.typ` supports optional bytes transport for the HTML host: parser JSON bytes skip Typst deserialize/reserialize when SECTION context is absent; SECTION-dependent content materializes and resolves the tree. This changes transport, not parser ownership or document semantics.

Shared packages live at `components/<name>/` and contain exactly `typst.typ`, `html.tsx`, `manifest.toml`, `schema.json`, `docs.json` and `html.css`. Schema/docs belong to core, not to duplicate renderer registries. User packages are declared as folder paths in Markdown front matter. The canonical configuration template is `config.toml`.

Most built-in `html.tsx` files currently delegate to `renderBuiltin(node, context)`; the corresponding JSX/behavior still lives centrally in `formatex-html/src/components.tsx`. Package folders are editable extension points with shared contracts, but this is not completed per-component JSX ownership. Extracting each built-in renderer into its own package remains open; custom package TSX already uses the independent renderer API.

From the workspace root, run `npm install`, then `npm run core:build` to build core. `cargo test --manifest-path formatex-core/parser/Cargo.toml` runs parser tests. `npm run typ:sync` rebuilds current core WASM and generates the standalone core+PDF distribution in `formatex-typ/`; edit source owners here and in `formatex-pdf/`, rather than generated copies. App sync consumes core/PDF/HTML directly. The root lockfile manages four npm workspaces; PDF itself is pure Typst.

The [shared-core plan](../formatex-app/docs/tasks/shared-core-pdf-html-plan.md) records verified integration separately from remaining component-property, map/diagnostic/export and real Android interactive UI gates. [Measurements](../formatex-app/docs/shared-core-performance-2026-11-12.md) cover individual stages, not full hardware latency.

TOML parsing uses `smol-toml` in browser and Node environments, avoiding Node stream/global dependencies in browser workers. A real browser-worker large-IR/custom-TSX/manifest functional check passes; it is not a renderer speed benchmark.
