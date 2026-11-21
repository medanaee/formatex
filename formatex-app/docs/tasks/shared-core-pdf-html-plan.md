# Shared Typst core with PDF and HTML backends

Status: accepted architecture implemented with named integration gates verified. Section 16 records current evidence; full component-property, map/diagnostic/export and real Android native interactive UI acceptance remains open. Earlier checkpoints are historical.

Date: 2026-11-12. Decision: [ADR 0013](../decisions/0013-shared-typst-core-pdf-html.md).

Starting point: restored main at `29c4d2a`. The user's prior backup at `586d41b` is outside this implementation and must remain untouched. Toolchain preparation, including installing a WASM target, is not an implemented document-pipeline milestone.

## 1. Non-negotiable architecture

One shared core runs **inside Typst**. It owns document preparation, expressions, configuration, parsing, semantics, IR and source provenance. A Rust parser based on `pulldown-cmark` is compiled to WASM and invoked by Typst; neither the app nor the HTML backend runs a JavaScript Markdown parser.

The output split occurs after the shared IR:

```text
External document snapshot
  Markdown, config, front matter, unsaved files, packages and assets
                  |
                  v
core, executed in Typst
  settings/vars -> expressions/includes -> mapped prepared text
  -> embedded Rust/WASM pulldown-cmark parser
  -> Formatex syntax/semantic normalization -> shared IR + source map
                  |
          +-------+-------+
          |               |
          v               v
pdf                       html
IR -> Typst components    IR -> React/TSX components
-> layout -> PDF/pages    -> Tailwind/shadcn/viewer -> HTML
          |
          +-- context-aware SVG graphics/fallback service --> html
```

Typst still executes `{{ ... }}` and handles paged typesetting. HTML owns browser layout and viewer controls. HTML does not receive Typst-generated document HTML, reparse Markdown, or reproduce the expression language in JavaScript.

## 2. Ownership and dependency direction

The target directories are named `formatex-core/`, `formatex-pdf/` and `formatex-html/`; internal paths below are implementation contracts to refine as code lands.

| Owner | Responsibility | Must not own |
| --- | --- | --- |
| core | Typst preparation, vars/settings, common preprocessing, Rust/WASM parser, IR/semantics/source maps, shared component folders/schema/docs | Browser layout, PDF layout implementation, app state or native UI |
| pdf | IR-to-Typst adapter, component/page layout, paged preview/PDF, graphic/SVG rendering | A second Markdown parser, duplicate settings/schema definitions |
| html | IR-to-React/TSX, Tailwind, shadcn-style document UI, viewer and offline HTML | Markdown parsing, `{{ }}` execution, app/Tauri/editor ownership |
| app | Editor snapshots, native service orchestration, files/packages, diagnostics, preview navigation and export delivery | Common document-language semantics or renderer internals |
| generated `formatex-typ/` | Standalone assembly of core + pdf, CLI entry point and `one.typ` bundler | Handwritten independent engine source or app HTML implementation |

The app synchronizes core, pdf and html **directly**, rather than treating the generated `formatex-typ/` tree as its upstream source. Dependency and build tooling must reflect that direction. Generated files need clear provenance and deterministic regeneration; normal development edits their owning source package.

## 3. Shared component folders

Shared packages belong to core:

```text
formatex-core/components/<name>/
  manifest.toml
  schema.json
  docs.json
  typst.typ
  html.tsx
  html.css
```

- `manifest.toml` identifies the component and references its schema/docs/available implementations and CSS. Spellings above are the agreed contract; do not introduce parallel `component.toml` / `typ.typ` conventions.
- `schema.json` is the common source for tag kinds, property types/defaults/domains, allowed values and scoped-child rules. Editor completion, validation and both outputs consume it.
- `docs.json` holds bilingual descriptions/examples separately from renderer code. It supplies authoring references and the app's generated skill.
- `typst.typ` implements the paged form; `html.tsx` implements the HTML form. They do not maintain separate copies of schema or docs data.
- `html.css` supplies component styling. Tailwind classes in TSX are supported through engine-owned compilation; generated export CSS is offline and has no reader-side Tailwind compiler/CDN dependency.

The component editor must expose the package's implementation, schema, docs, CSS and manifest files. Save/check/enable/override behavior needs coherent package revisions and source-specific errors. Do not silently fall back to an old component implementation when an existing new implementation fails.

User packages are declared as **folder paths in the Markdown front matter**:

```yaml
---
components:
  - extras/note
  - packages/course
---
```

The loader reads each folder's manifest and referenced files. Define path resolution, package identity/override rules, duplicate tags and invalid manifests explicitly. A folder name is not permission to read arbitrary files; project access stays with the host. Existing library/project package precedence must be tested rather than inherited accidentally from filesystem enumeration order.

## 4. One document language with explicit extension points

Preserve the author-facing language: Markdown, registered tags, `{ ... }` attribute/options syntax and `{{ ... }}` Typst programming expressions. Existing math, heading/equation labels, lists, tables, code, comments, references, citations, footnotes, includes and raw graphical blocks remain regression fixtures.

There is no MDX document mode, JavaScript expression syntax in Markdown or second HTML-specific document grammar. TSX is a component implementation language, not the document parser.

Extension points must be declared rather than implemented by scattered renderer regexes:

1. Package manifests/schema register tags, properties, body/scoped-child constraints and implementation availability.
2. The common parser/normalization contract identifies protected raw code, option blocks and registered structural nodes.
3. Versioned IR nodes and semantic passes define how an extension reaches both outputs and source maps.
4. Renderer/service interfaces define optional HTML/Typst implementations and explicit graphics requests.

A new syntax/node extension requires common-parser, schema/diagnostic, IR and both-backend coverage. Unsupported extensions produce source diagnostics; an HTML renderer must not reinterpret an unknown node by parsing its text again.

## 5. Typst preparation and the Rust/WASM parser

### 5.1 Preparation

Core captures one document revision and establishes shared settings, document metadata, `vars` and `var-types`. It executes ordinary `{{ ... }}` in Typst, expands includes at their execution positions, and preserves mutations, local scopes, nested generated Markdown and source provenance.

Protect inline/fenced code, math, comments, escaped braces and raw Typst/CeTZ/Lilaq source. Keep programming braces and property braces distinct. Skipped conditional branches must not perform includes/data reads or generate spurious diagnostics. Never execute a document expression/include a second time in a backend.

Not every Typst value is JSON. Define portable typed values and/or retained context references for lengths, colors and graphics evaluation; do not recreate arbitrary environments from display strings. Track file/data/config/package dependencies before introducing expression-result caches for mutable document state.

### 5.2 Parser plugin

Compile a Rust `pulldown-cmark` parser to a Typst-callable WASM plugin. Prove the actual Typst plugin ABI, encoding and error behavior before depending on it. The Typst core invokes the parser, normalizes its events/nodes with Formatex extensions and constructs the IR.

The parser must preserve source byte ranges and structural relationships for text, tags, attribute blocks, headings, tables, lists, math, links, footnotes and literal code. Custom syntax may use core scanners/normalizers around the common parser, but it must remain one authoritative grammar/IR path, shared by both outputs.

Test the same plugin bytes through the standalone CLI and embedded native Typst. Do not substitute remark, a browser Markdown library or an app-only Rust parse outside Typst as the production document path.

## 6. Settings contract

One `config.toml` holds common root/table values and output overrides under `[html]` / `[typ]`. Document front matter mirrors those namespaces; local tag/options properties use the same domain rules.

```toml
theme = "paper"

[code]
numbering = true

[html.code]
copy-button = true
numbering = false

[typ]
page = "desktop-a4"
```

An HTML-only property **must** use the `html` prefix, including local properties such as `html.copy-button`. It is invalid unprefixed or under `typ`. Typst-only properties use `typ`; shared properties may be common or overridden for an output. Validate domain, type, enum, required fields and duplicates using the shared schema.

After schema defaults, resolve exactly in this order:

1. Project shared values.
2. Project selected-output values.
3. Document shared values.
4. Document selected-output values.
5. Local shared values.
6. Local selected-output values.

Merge nested tables by key. A local shared value therefore wins over a project output override; local output wins over local shared. Attribute order is not a precedence rule.

Keep kebab-case keys and the namespaced `setting` view. `{{ setting.html.code.copy-button }}` is valid Typst field access; do not rename it to camelCase or treat the hyphens as a reason to introduce a second expression language. Local props do not mutate the document-wide `setting` environment. Specify settings-expression cycles, operation/CLI overrides and default visibility without hiding them in backend-specific merge code.

## 7. IR and provenance contracts

The versioned shared IR must include:

- Stable node identity, kind, children/raw content and normalized typed properties.
- Original source file/ranges for nodes, text and properties, with mappings through include expansion and generated Markdown.
- Resolved configuration/tokens, dependency identities and revision identity.
- Labels, reference targets, logical numbering, heading hierarchy, list/figure/code inventories, citations/bibliography and footnotes/backlinks.
- Explicit deferred-expression records and the context/semantic bindings required by graphics.
- Structured diagnostics with original-source spans and optional implementation traces.

Define one offset convention at each boundary. `pulldown-cmark` byte ranges, Typst source offsets, editor UTF-16 positions and DOM text offsets must have tested conversions, including Persian, ZWNJ, emoji, combining characters and mixed-direction text.

Source maps are a core product requirement, not a later text-search heuristic. For expression-generated text, preserve both the generated range and its exact originating expression/provenance chain; do not pretend the output has a one-to-one source character when it does not. Repeated includes/identical paragraphs must retain distinct node occurrences.

Document semantics belong to core; HTML components and the PDF adapter do not invent competing counters or label resolution. Paged layout still owns actual physical page locations/numbers.

## 8. Deferred page/section values

- PDF resolves `PAGE` / `PAGES` with actual Typst layout.
- HTML emits an explicit original-source error for active expressions that require `PAGE` / `PAGES`; it does not invent a page count for a continuous document.
- HTML may resolve `SECTION` and `SECTION_NUMBER` from the IR's active heading/numbering context under documented shared rules.
- Keep deferred values out of ordinary string preparation until the required output context exists. Preserve source spans in content, settings and local property expressions.
- Deferred page expressions cannot mutate ordinary document variables.

Test these rules in paragraphs, captions, properties and nested components, not only a top-level example.

## 9. Output backends and availability rules

| Implementation | PDF | HTML |
| --- | --- | --- |
| Typst and TSX | Render `typst.typ` | Render `html.tsx` |
| Typst only | Render Typst | Context-aware Typst SVG fallback |
| HTML only | Omit the complete subtree | Render TSX |
| Neither | Invalid package | Invalid package |

Omitted PDF subtrees reserve no space, counters, TOC or list entries. References to omitted targets need explicit diagnostics. Preparation side effects follow the common execution contract; render omission must not introduce a second expression-execution policy.

An error in an existing TSX implementation is an error, not an excuse to silently choose SVG. Explicit graphics components may intentionally request SVG even when they have a TSX wrapper.

### 9.1 PDF

The PDF owner consumes the core IR, adapts it to Typst component/layout calls and produces paged preview/PDF. It preserves component options, direction, theme/feel/fonts, captions, references, header/footer/cover and actual page expressions. It does not parse the original Markdown or run common preparation again.

### 9.2 HTML

The HTML owner consumes the core IR through a documented transport API. React/TSX owns structure/layout, Tailwind, shadcn-style document UI and viewer controls. A React base shell and viewer runtime remain separate from privileged app code. The renderer must not import Tauri/editor/app stores or use the app as the owner of document layout.

Preview and offline export use the same rendering semantics. Define hydration and custom interactive-component capabilities explicitly; do not assume static TSX output preserves arbitrary event handlers. Readers receive packaged runtime/CSS/assets required by the supported interactions, without app privileges or parser/compiler services.

## 10. Graphics, assets and completion

SVG requests carry revision, node identity, effective props, prepared evaluation context, semantic bindings, available width, theme/fonts/packages and file dependencies. Results carry intrinsic dimensions/viewBox, diagnostics, dependency fingerprints and cache identity.

HTML owns the displayed graphic's position and reserved height; Typst owns its internal drawing. Keep captions/numbering in one owner to avoid duplicates, preserve aspect ratio, and namespace repeated SVG IDs. Use bounded scheduling and discard stale revisions. Cache by relevant context/dependencies, not only raw drawing text.

Export freezes one coherent revision and waits for all required graphics, fonts and math. Preserve current font-family resolution, Persian shaping, HTML-compatible serif behavior and dependency-aware caches. Font subsetting must retain shaping/layout dependencies and account for generated mathematical glyphs.

## 11. Exact preview maps; clean exports

Preview requires bidirectional mappings:

- Editor cursor/range -> exact IR occurrence -> rendered HTML text/node range or paged location.
- HTML click/selection -> mapped original Markdown/include/expression range.
- PDF click/location -> IR/source span, using the PDF adapter's emitted source associations.
- Component/parse/evaluation errors -> original Markdown tag/property/expression spans, with implementation-file detail when useful.

Keep the last valid view after failure, but never present an old revision's map as belonging to new content. Test repeated phrases, nested tags, multi-column PDF, tables, code, generated text, repeated includes and both text directions. Approximate text search cannot satisfy the exact-map acceptance gate.

Export uses a distinct render/packaging mode that removes source maps, original source-file payloads, preview-only provenance attributes, debug metadata and preview IPC/navigation code. Preserve semantic IDs/links and authored code listings as document content. A final exported file must not receive raw project snapshots or privileged preview bridges through a hydration payload.

Verify export cleanliness structurally and by searching for known fixture-only private map/source/IPC markers. A source-map option hidden in the UI is not sufficient evidence that payloads were removed.

## 12. Standalone assembler and one-file distribution

`formatex-typ/` becomes a generated/synchronized **core + pdf** standalone distribution. Its tools assemble the owned source modules and shared component data, with clear generated provenance.

The `one.typ` bundler must include the parser WASM payload as well as the necessary core/pdf code and schema data. Document/config/image/BibTeX inputs stay external. The single-file result must not depend on a parser sidecar, source repository checkout, app bundle or HTML renderer in order to compile external Markdown to PDF.

Prove the actual Typst loading/embedding mechanism and packaging limits rather than assuming raw WASM can be pasted into a code string. Test the generated `one.typ` after moving it to an isolated directory, with external documents/assets, includes, custom packages, Persian fonts and offline cached dependencies. Deterministic rebuilds and a package/plugin version fingerprint are required.

The app has separate sync/build entry points consuming core/pdf/html source owners directly. The generated standalone distribution is not an intermediate source dependency of the app.

## 13. Staged implementation and exit criteria

### Stage 0 — Baseline and contracts

Inventory existing syntax/components/options and known layout/source-map failures. Freeze representative Persian/English fixtures and cold/warm/per-edit benchmarks. Confirm core/pdf/html ownership, package schema, offset conventions, plugin ABI and IR versioning. Preserve `586d41b` without rewriting it.

Exit: reproducible baseline and explicit contracts. No feature completion is inferred from toolchain installation.

### Stage 1 — Rust/WASM parser called by Typst

Implement the pulldown-cmark parser plugin, source ranges and Typst wrapper; test Markdown and Formatex extension fixtures through Typst on CLI/native paths. Cover malformed tags/options, literal examples, raw graphics and Unicode offsets. Do not introduce a JS parser as a temporary production substitute.

Exit: the same WASM artifact is actually invoked inside Typst and produces mapped structural output, with useful source diagnostics.

### Stage 2 — Shared core preparation/settings/IR

Move common preprocessing, vars/types, document-order evaluation/includes and settings resolution into core. Produce typed/mapped prepared data, shared IR/semantics and deferred records. Test exact precedence/domain errors and `setting.html.code.copy-button`. Ensure one execution and coherent dependency/context identity.

Exit: core executes entirely through Typst and returns a versioned IR with original-source provenance; output-independent semantics are covered by fixtures.

### Stage 3 — Shared component packages

Move every built-in into the agreed core folder layout with manifest, separate schema/docs and two implementations/CSS where available. Update discovery, validation, editor schemas, package overrides and front-matter folder loading. Define file-edit/check behavior and implementation availability.

Exit: the inventory accounts for every existing tag/option; no renderer owns a duplicate schema/docs registry.

### Stage 4 — PDF adapter and standalone assembly

Implement IR-to-Typst layout in pdf without source Markdown reparsing. Generate `formatex-typ/` from core+pdf and add `one.typ` with embedded parser WASM. Compile representative documents, all themes/feels and mobile; inspect affected pages.

Exit: direct and assembled/one-file PDF paths agree on semantics and source diagnostics; the moved one-file artifact works with external document inputs.

### Stage 5 — Independent HTML and SVG service

Implement React/TSX component coverage, Tailwind/shadcn/viewer and explicit graphic/Typst-only fallback. Wire context/dimensions/cache/completion; implement PDF omission of HTML-only subtrees and broken-reference diagnostics. Preserve fonts/math and offline packaging.

Exit: native text/structural HTML and intended SVG assets show correct inspected layouts; renderer availability combinations work without hidden Markdown parsing.

### Stage 6 — App integration and exact maps

Sync source owners directly. Connect saved/unsaved snapshots, package editing, prepared IR, both previews, exact bidirectional maps and Markdown diagnostics. Retain latest-result scheduling, cached assets, reader state and last valid results with correct revision identity.

Exit: editor/preview navigation is exact on the mapping fixtures and rejects stale results; phone/tablet/desktop interactions and both directions work.

### Stage 7 — Clean export, performance and cutover

Strip maps/source/preview IPC from offline output. Complete component/syntax/semantic coverage, standalone assembly and platform checks. Compare cold export, warm preview, text/math/diagram/component edits, memory and output bytes against the fixed baseline. Remove the superseded production parser/document-HTML paths only after parity gates pass; a second permanent parser is not an exit state.

Synchronize EN/FA guides and authoring/developer skills when concrete contracts land. Record actual behavior and remaining limits; do not publish the proposed API as already supported.

Exit: complete intended behavior with explicit validation evidence, one shared Typst pipeline, independent output ownership, clean exports and a reproducible standalone bundle.

## 14. Verification matrix and reporting

| Area | Required evidence |
| --- | --- |
| Parser | Typst invokes embedded pulldown-cmark WASM; no JS parser; syntax/raw-code/error/Unicode fixtures |
| Preparation | Vars/types, mutations/local scope, skipped branches, generated Markdown, include/data dependencies, no double execution |
| Settings | Every precedence layer, HTML-only prefix rejection, nested merging, duplicate/type/domain errors and valid kebab-case `setting` access |
| Semantics | Counters, references, headings/lists, equations, citations/bibliography, footnotes and omitted-target diagnostics |
| Components | Every package/tag/property; user front-matter folders; both/Typst-only/HTML-only/broken implementations |
| Mapping | Exact round trips and Markdown diagnostics across original/includes/generated content, UTF-8/UTF-16 and RTL/LTR |
| Graphics | Context, intrinsic height, captions, repeated SVG IDs, changed dependencies and stale-revision rejection |
| Export | Complete assets/fonts/math; no source-file/map/provenance/preview-IPC payload; valid semantic links |
| Standalone | Deterministic generated core+pdf distribution; isolated `one.typ` embeds WASM and uses external document inputs |
| Responsive | 360/768/1280 px, RTL/LTR/mixed text, light/dark and all feels; touch-safe UI |
| PDF | All theme/feel combinations, mobile, representative custom packages and visual inspection |
| Performance | Repeated comparable cold/warm/edit timings, cache hits/invalidation, memory and bytes; no unmeasured speedup claims |

Use relevant frontend and Rust gates as code lands. Report compiler/test success separately from visual approval, source-map correctness, full app/device behavior and measured performance. Each stage exit remains open until its full scope has evidence; the checkpoint below verifies only the named tests and fixture, not every stage gate.

## 15. Verified parser/core/PDF checkpoint, 2026-11-12

Work is on `codex/shared-core-renderers` from restored main; backups remain untouched. `formatex-core/parser/` now builds the Rust/WASM pulldown-cmark parser. At the initial checkpoint, five Rust tests passed for Markdown/tag nesting, protected code, math, UTF-8/UTF-16/source paths and settings namespaces.

`formatex-core/typst/src/document.typ` runs the source-mapped Typst evaluator, invokes `parser.wasm` inside Typst and exposes DocumentIR. Preparation does not load the HTML renderer. `formatex-pdf/typst/src/render.typ` consumes that IR directly, and the new `main.typ` imports core document preparation and PDF rendering without cmarker in the normal path.

All 43 shared packages (78 schema tags) now live under `formatex-core/components/<name>/` with `typst.typ`, `html.tsx`, `manifest.toml`, `docs.json`, `schema.json` and `html.css`. `formatex-typ/tools/sync.mjs` invokes `formatex-core/tools/assemble.mjs` to generate the core+pdf source assembly.

The existing full `examples/demo.md`, including its included/nested files, produces 261 root IR nodes and three source files through Typst evaluation, then compiles to a 903,229-byte PDF with zero errors. This validates that fixture's parser/core/PDF path; it does not establish complete syntax/component/layout parity, app integration or performance.

At this initial checkpoint, old physical files/bundle work, configuration migration, HTML/app integration and exact maps/export were still pending; the subsequent checkpoint below records verified bundle/sync/config progress. The later integration checkpoint in section 16 supersedes these initial pending integration/standalone items; complete property/map/diagnostic/export and real Android native interaction coverage remains separate.

### Subsequent bundle/configuration/native checkpoint (historical)

The initial bundle embedded parser WASM, component JSON contracts and the dark syntax theme (the byte count changed in subsequent rebuilds). The demo compiles through the bundle to a 903,229-byte PDF, matching the modular fixture's output size. This is the verified bundle fixture; isolated relocation/custom-package coverage and full parity gates remain separate.

App `engine:sync` now consumes core+pdf+html directly and passes, and native `cargo check` passes. `formatex-core/config.toml` is the source template; the standalone `formatex-typ/config.toml` is a consumer configuration. The template and four Markdown front matters have been moved to the `typ` namespace. Root paged keys are rejected, and `[html.code] copy-button` is enforced as HTML-only. Remaining configuration/default-control UI edges and complete app/HTML/source-bridge integration are still in progress.

The app's generated writing/building skill text now teaches six-file folder packages, separate shared JSON data, per-backend implementations, front-matter folder paths and shared/output/local settings. Its language/level APIs and kit-name exports remain unchanged; the focused skill-generator suite passes 19 tests. At that intermediate point, visual/performance and full parity gates were open; section 16 records subsequent named visual/performance evidence.

## 16. Integration and verification checkpoint, 2026-11-12

The architecture is implemented through the shared Typst pipeline and independent PDF/HTML backends. This checkpoint verifies the named fixtures and gates, not every component property or real-device interaction.

- Rust parser: **9 passed**, including Persian/Arabic list markers/restarts, exact rich-attribute offsets, fenced-code properties/spans and Unicode/source paths.
- Frontend: **373 passed**, including opt-in real full-demo SVG/assets integration and the large HTML benchmark. Native: **66 passed, 5 ignored**. Typecheck and production build pass; lint retains nine existing warnings.
- PDF: **24 theme/feel combinations passed**, mobile compiles, and Poppler renders of pages 10/14/15 were inspected for grids, letters, choices and proof layout.
- Browser harness: 360/768/1280 px checks covered Persian search, proof-square placement, real SVG graphics, dark palette and feel/font switching; desktop had no overflow. These do not establish Android native clipboard/selection or hardware performance.
- Standalone: isolated one-file PDF plus a custom six-file package passes. A relocated standalone tool bundle also works without sibling checkouts. `tools/registry.mjs` is copied from core at sync; `gen-registry`, `build-all`, `bundle` and `schema` use the local synced snapshot. `tools/sync.mjs` first builds the latest core WASM, then assembles core+pdf. Sync before building changed core sources; a standalone snapshot can install its own `smol-toml` dependency and run its local tools.
- HTML: the full-demo offline export is **1,992,581 bytes** after native font subsetting. Document content is static server-rendered HTML; the React viewer shell hydrates. Arbitrary TSX content events/state and live variable/DSL reactivity are not implemented.

Install dependencies with `npm install` at the workspace root and its root lockfile. The four npm workspaces are `@formatex/core`, `@formatex/html`, `formatex-app` and `@formatex/typ`; the PDF backend is pure Typst, not another npm package. The app syncs source owners directly. The HTML engine owns its runtime build, offline math assets and independent UI primitives.

The [measurement report](../shared-core-performance-2026-11-12.md) records repeated core and HTML timings separately. Remaining acceptance gates include complete component/property and diagnostic/map fixture coverage, all renderer-availability/export cases and real Android native interactive UI. Keep broad stage exits open until their full matrix is verified; aggregate test/build success does not certify those cases.

### Later transport/index checkpoint

The HTML host can request `transport=bytes` from core evaluation. Typst still invokes the Rust parser; when SECTION context is unnecessary it forwards plugin JSON bytes without deserialize/reserialize. SECTION-dependent content materializes/resolves the tree, with compact JSON preserving deferred markers. Rust protected Markdown ranges are merged, binary-indexed and skipped as regions. Four targeted pipeline tests pass, including inline SECTION; the final full native rerun passes 66 tests with five ignored, including the SECTION-context regression. On the same fixture, byte transport alone measured cold 982.2 ms / warm 748.0–760.8 ms; bytes plus protected-range indexing measured cold 752.2 ms / warm 515.6–543.0 ms. See the report for all prior runs and scope exclusions.

### Browser worker dependency checkpoint

Core and standalone tooling now use `smol-toml` ^1.9.1 in browser and Node paths. The former TOML dependency pulled Node stream/global assumptions into the browser worker. The real IAB/Vite functional harness in `out/browser-worker` verifies `renderInWorker` with the large IR, a custom TSX component and manifest: success, 497,434-character HTML, no errors or warnings. This development-cold check includes dev module loading and is not a comparable speed benchmark. The final gates after smol-toml, bytes transport and protected-range indexing pass: frontend 373/373 including real integration and benchmark; production build passes without Node externalization warnings; native 66 passed/five ignored. The latest 24-combination PDF matrix also passes. The final bundle is 2,123,699 bytes with a 511,284-byte parser WASM; bundled full-demo PDF, relocated standalone tools/custom package and isolated one-file/custom package all compile. Offline font-finished HTML remains 1,992,581 bytes.

## 17. Post-migration regression checkpoint (2026-11-12)

A real app-Vite-config browser-worker reproduction isolated `window is not defined` to React Fast Refresh's injected renderer-TSX preamble. Excluding `formatex-html` from Refresh makes the same IAB functional harness succeed. The prior simplified worker harness did not exercise this app-config transform.

The shared parser now preserves paired `ref`/`cite` custom bodies and turns Pandoc-style `[@key]` into semantic citation IR outside protected code/math; eleven parser tests pass. An explicit ordered marker after blank-line separation starts another list if it disagrees with the expected next value; ordinary loose sequential items remain continuous.

PDF nested Tailwind div realization now recognizes nested/source metadata and excludes internal metadata as flex items. Equal `flex-1` widths, pill rows and cards are corrected. Paired custom-reference bodies survive PDF/HTML. Lexical paragraph/scope direction reaches refs and inline definitions; an English section in the forced-RTL demo explicitly uses `<dir ltr>`, preserving forced-global semantics. The native direction regression passes and the visually compiled full demo has no convergence warnings. Current regression gates pass: parser 11; native 68 passed/five ignored; frontend 372 passed/two skipped plus the opt-in real Typst→IR→HTML integration (one passed); typecheck and production build pass with existing bundle-size warnings. Native geometry confirms identical flex layout with source markers off/on, and full-demo English/flex visual compilation passes without convergence warnings. The final CLI matrix passes all 25 cases: 24 desktop theme/feel combinations plus `page=mobile-20-9`, with zero stderr/warnings. The mobile PNG confirms equal-width cards, pills and card layout; this is CLI page-format verification, not real Android interaction. Final standalone and app engine sync succeed with 43 packages/78 tags.

App `predev`, `prebuild`, `pretest` and `pretypecheck` run engine sync automatically. This is startup/command synchronization, not a filesystem watcher. Changing embedded native engine data requires rebuilding the native app. Complete property coverage and real Android interactive UI remain separate gates.

## 18. Word provenance mapping upgrade (in progress)

[ADR 0014](../decisions/0014-preview-word-source-geometry.md) defines preview-only PDF word annotations extracted from native Typst link frame rectangles into `PageMap.sources` (geometry/node/file/UTF-16 range/generated). Visual line/page splits come from the layout frames, rather than whole-block text search. Internal annotations are removed from user links and absent when `markers=0`; clean export must preserve that separation.

Frontend clicks and reverse navigation prefer direct shared provenance; context/block search is a fallback when no exact source is available. HTML reverse navigation computes a DOM word range at the source caret, scrolling/highlighting its word rectangle. Shared text/source helpers and half-open ranges must agree across boundaries. Initial scope is ordinary text plus rich inline descendants; raw code, math and generated component labels retain fallback unless finer mapping is added. No new language is introduced. This is an implementation checkpoint only; tests/visual/platform gates remain pending.

Word annotations are suppressed inside Markdown links, `ref`/`a`/`def` and custom Typst handlers because nested provenance links can steal real destination hit areas. These regions retain bounded context fallback to preserve user links. Raw code, math and generated component labels also retain fallback without finer geometry.

Targeted native provenance verification passes for ordinary bilingual repeated words with exact UTF-16 starts, included files, generated-expression origins and multiple visual rows. Glyph IDs, positions and advances match `markers=0` versus `1`; TextItem grouping can differ. PDF reverse lookup uses a cached per-page/per-file interval index. Fallback ranks ordered before/after context plus distance and removes the former first-200-occurrences cap; repeated RTL/LTR and >200-occurrence tests pass. Frontend checkpoint: 379 passed/one skipped including real Typst→IR→HTML integration and preview artifacts; typecheck/build pass, lint retains nine existing warnings. Native: 69 passed/five ignored, including unchanged actual user-link rectangles. The final payload-compaction/UTF-16 recomputation rerun also passes 69 tests/five ignored; this does not expand the exact-mapping scope. Final engine sync succeeds with 43 packages/78 tags. The PDF matrix passes 25 cases. Actual IAB 360/768/1280 px Persian/English light/dark viewer checks pass, including menus/outlines and a fresh hydration run with zero errors/warnings.

A real mobile HTML source reveal targeted word «تمدید» at source offset 18059; clicking the revealed word returned offset 18060 in the same correct Markdown file. The Range highlight covered only that word on its wrapped visual row. This verifies the named word/line case, not character-perfect mapping of every component. The viewer shell now uses an independent React SSR hydration root, eliminating the reproduced React 418 mismatch in a fresh-query browser run.

## 19. Component ownership clarification (2026-11-13)

`alert`, `box`, `badge`, `kbd`, `code`, `theorem`, `exercise`, `fig`, `grid`, `steps`, `compare`, `progress`, `chat`, `docheader`, `letter`, `picheader`, `cover`, `tree`, `todo` and `diff` own their JSX and CSS and are no longer drawn by `renderBuiltin`. Standard Markdown is rendered in `formatex-html/src/markdown.tsx`. The other built-in `html.tsx` files still delegate to `renderBuiltin(node, context)` in `formatex-html/src/components.tsx`. Package folders are editable extension points with shared contracts; extracting the remaining built-in renderers is still open. Custom package TSX uses the same renderer API.

A strengthened provenance fixture with 120 repetitions now spans multiple PDF pages; the full native suite passes 69 tests/five ignored. This is a named pagination test, not universal exact mapping.

A browser header-background 404 exposed a legacy `context.assets` fallback. Header backgrounds now resolve through `context.background(path)` host-asset requests; their data URL is emitted once via a root CSS variable. Final frontend verification passes 379 tests with one benchmark skipped, including real integration and an offline artifact-size assertion below 2 MB. Typecheck/build pass (`final-mapping-tests`, `final-mapping-typecheck`, `final-mapping-build` logs). Per-component JSX extraction remains an open follow-up, not an implemented or newly requested change.
