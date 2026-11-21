# ADR 0013: Shared Typst core with PDF and HTML backends

## Status

Accepted target architecture. Implementation in progress; verified milestones and remaining gates are recorded in the linked plan/task board rather than inferred from acceptance of this decision.

## Date

2026-11-12.

## Context

The restored main baseline at `29c4d2a` runs Formatex preparation, Markdown conversion and PDF/HTML through the existing Typst engine. The user authorized a new separation that keeps one common document-language pipeline inside Typst while giving PDF and HTML independent output ownership. The prior user backup at `586d41b` is not part of this implementation and remains untouched.

The common parser is explicitly Rust/WASM `pulldown-cmark` invoked inside Typst. A JavaScript Markdown parser or app-only preparation service is not the accepted architecture. The existing Typst embedding in ADR 0005 remains useful; the Typst-document-HTML dependency in ADR 0012 is to be replaced at cutover while retaining its cache/scheduling principles.

## Decision

1. Core executes common preprocessing, vars/types, `{{ ... }}`, includes, configuration, parsing, IR/semantics and source maps in Typst. Typst invokes an embedded Rust/WASM pulldown-cmark parser; both backends consume the same resulting IR without reparsing source Markdown or repeating preparation.
2. Core owns shared component folders containing `manifest.toml`, `schema.json`, `docs.json`, `typst.typ`, `html.tsx` and `html.css`. Schema/docs are separate shared data. User packages are declared as folder paths in Markdown front matter.
3. PDF owns IR-to-Typst adaptation, component/page layout, paged preview/PDF and context-aware SVG generation. HTML owns IR-to-React/TSX, Tailwind, shadcn-style document UI and viewer. The app owns snapshots/native I/O/orchestration, not renderer or language semantics.
4. `formatex-typ/` becomes a generated/synchronized core+pdf standalone assembler. Its `one.typ` distribution embeds the parser WASM and required core/pdf data/code while keeping document inputs external. The app synchronizes core+pdf+html directly, not through that generated distribution.
5. One configuration uses shared root/tables with `[html]` / `[typ]` overrides. After defaults, precedence is project shared -> project output -> document shared -> document output -> local shared -> local output. HTML-only properties require the `html` prefix. Kebab-case access such as `setting.html.code.copy-button` remains valid Typst.
6. Preserve the existing document language: Markdown, tags, `{ ... }` properties/options and `{{ ... }}` programming. Define schema/parser/IR/component extension points explicitly; do not introduce MDX/JavaScript source or scattered output-specific grammar.
7. Core source provenance supports exact bidirectional preview mapping and diagnostics against original Markdown/include/expression spans. Output adapters preserve those associations; approximate text matching does not satisfy the exact-map requirement.
8. Export removes source maps, private source-file payloads, preview provenance/IPC and debug metadata while preserving semantic IDs/links and complete document assets. Export and preview use distinct packaging modes.
9. PDF resolves actual `PAGE` / `PAGES`; HTML reports an explicit original-source error for active page-dependent expressions. HTML may resolve section context from the shared IR. Deferred expressions retain source locations and cannot mutate ordinary document variables.
10. A Typst-only component uses an explicit context-aware SVG fallback in HTML. An HTML-only subtree is omitted from PDF without layout/counter/list artifacts; references to omitted targets need diagnostics. Existing implementation failures are not silently converted into fallback.
11. Preserve dependency-aware preparation/graphic/font caches, coherent revisions, bounded/latest-result scheduling and correct font/shaping behavior. Validate performance against fixed fixtures rather than assume separation is faster.

The detailed staged implementation and acceptance gates are in [the shared-core plan](../tasks/shared-core-pdf-html-plan.md).

## Alternatives rejected

- A JavaScript/remark Markdown parser feeding the outputs: the shared pipeline must execute in Typst using the agreed Rust/WASM parser.
- Keeping a permanent second Markdown parser in PDF or HTML: allows syntax, settings, source maps and document semantics to diverge.
- Rendering complete document HTML through Typst and wrapping it in React: does not give HTML ownership of document layout/components.
- Making the app or generated standalone tree the owner of core/pdf/html sources: reverses the accepted dependency direction.
- Shipping a one-file Typst distribution that still needs a parser sidecar or app checkout: does not meet the standalone bundling requirement.
- Treating continuous HTML as physical pages or retaining private preview/source payloads in export: violates the explicit page-value and clean-export contracts.

## Consequences

This is a cross-layer change: parser ABI, Typst preparation, schemas/packages, IR, PDF/HTML adapters, standalone assembly, app integration and exact mapping need separate verified milestones. Document meaning is shared while browser reflow and paged layout remain distinct.

The implementation must prove CLI/native plugin execution, source mapping through generated text/includes, every renderer-availability combination, isolated bundled PDF builds and offline export cleanliness. Existing caches and font fixes are preserved and measured. Guides and skills are updated when concrete contracts land; acceptance of this decision is not evidence of code completion, visual parity, Android behavior or a speedup.

## Verified implementation checkpoint (2026-11-12)

The shared Typst/WASM pipeline, folder packages, independent HTML engine, direct PDF IR adapter, app direct sync and isolated standalone tooling are implemented and tested. Parser tests: 9 passed; frontend: 373 passed; native: 66 passed/5 ignored; typecheck and production build pass. PDF matrix: 24 theme/feel combinations plus mobile compilation, with selected pages visually inspected. See the [plan checkpoint](../tasks/shared-core-pdf-html-plan.md#16-integration-and-verification-checkpoint-2026-11-12) and [measurement report](../shared-core-performance-2026-11-12.md).

HTML content remains static SSR with a hydrated React viewer, not arbitrary hydrated component events/state or live DSL variables. Complete component-property parity, the full map/diagnostic/export matrix and real Android native interactive UI remain separate acceptance gates. Root workspace installation uses the root lockfile; the generated standalone npm package is `@formatex/typ`, while PDF remains pure Typst.
