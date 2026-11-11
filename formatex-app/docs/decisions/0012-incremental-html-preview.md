# ADR 0012: Incremental live HTML preview separate from standalone export

## Status

Accepted.

## Date

2026-11-10.

## Context

Live HTML preview previously used the full export path after every editing pause. It created a fresh HTML world, repeated font-subset preparation, replaced the iframe document and could overlap obsolete requests while the hidden paged compiler also ran. Large-document profiling identified repeated preprocessing work and showed that retaining compilation and font data is useful independently of export portability.

The live preview needs to follow edits while retaining its viewer, scroll and loaded fonts. Export must continue producing a portable standalone file. Documents with custom scripts must still initialize correctly.

## Decision

- Add a dedicated live path: frontend `previewHtml()` invokes `preview_html`, which calls `render_preview_html`. It returns HTML, stage timings, `fontKey` and optional `fontCss`.
- Keep HTML and paged `ProjectWorld` instances in separate `kept_world_for` slots. Refresh files in place; rebuild the world when the main file, inputs, component generation, fonts or project root changes.
- Use `latestTaskQueue.ts` for one in-flight preview request and one replaceable latest snapshot, including across preview remounts. Adapt the delay between 120 and 250 ms. While HTML mode is active, skip hidden paged builds; returning to pages compiles the latest source.
- Cache reusable full WOFF font faces in `html_export.rs::preview_fonts` by weak `FontStore` identity, required family list and italic need. Return CSS only when its key differs from the frontend's known key. Keep font subsetting and embedding in standalone Export.
- Keep a sandboxed iframe mounted for ordinary edits. `htmlFrame.ts::splitHtml` separates `main.fx-doc` from the viewer shell; `initialFrame` and `frameBridge` initialize its message channel. Validate the source window and a per-document token before applying `fxPatch` main-content updates and optional font CSS. A reload uses a new token, so a message from an old shell cannot affect the new one.
- Preserve scroll, viewer controls and the font-style node for content-only edits. Dispatch `fx-content-updated` so the outline and code-copy controls refresh.
- Reload when the viewer shell signature changes, including theme, scripts, options or UI language. Also reload custom scripts inside main content and Raw Typst output without `main.fx-doc`; do not silently patch interactive documents without executing their initialization.

## Alternatives rejected

- Reusing standalone export unchanged for live edits: repeats portability work and reloads fonts and viewer state unnecessarily.
- One world shared between paged and HTML targets: changing the target invalidates the other preview's state.
- Starting a build for every queued snapshot: spends CPU on obsolete output and increases contention.
- Patching arbitrary script-bearing HTML: replacing script nodes does not safely reproduce document initialization.
- Applying messages based only on their shape: a source-window check and a per-document token are needed to reject stale frame traffic after reloads.

## Consequences

The document format, tags, front matter and `[html]` authoring settings stay unchanged. Preview and Export use different font-delivery strategies. Complete preview faces may cost more on the first load but can be reused by later edits; standalone files continue receiving subsets.

The persistent viewer bridge must refresh controls after content updates and retain a full-reload fallback. Native timing, browser layout/paint, viewport checks and Android behavior must be verified separately. Performance figures are recorded in the measurement reports rather than promised by this decision.
