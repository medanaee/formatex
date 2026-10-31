# ADR 0009: Exact source mapping through markers now, a source map later

- **Status:** Accepted. Stage 1 (block markers) is built; stage 2 (a source map in the conversion) is still to be evaluated.
- **Date:** October 2026

## Context

[ADR 0008](0008-source-to-preview-mapping.md) maps a Markdown line to a place in the preview, and [`sourceLookup.ts`](../../src/lib/editor/sourceLookup.ts) maps a click on the preview to a Markdown line, both by **searching text** among the text runs the compiler reports. That is a good guess, not a mapping. It fails when the text repeats: in a document of identical paragraphs (for example the word "October" on every line, with page breaks between) every candidate has the same words and the same neighbourhood, so only the position in the file breaks the tie, and that is often wrong. Every new kind of layout (tables, floating figures, user components) also needs re-checking.

The principled cause: Typst's own jump facilities (`typst-ide` `jump_from_cursor`, `jump_to_source`) work on `Span`s. The engine reads Markdown with `cmarker`, which (as far as we know; **to be verified in cmarker's source**) turns it into Typst code and evaluates it, so the spans of the resulting content point into generated text, not into the `.md` file. The link between Markdown positions and layout positions is lost in the Markdown to Typst step, not in layout.

## Decision

Replace the text search in two stages. Both directions (click on the preview, and "Go to here in preview" / following the typing) use the same data.

### Stage 1: block markers (built)

- The engine's preprocessor (where `mark-lines.typ` already writes `@file:line` for tags, links and options) puts an invisible marker at the start of every **block**: paragraph, heading, list item, table row, tag. The marker is `metadata` with a label that holds the file and the 1-based line, for example `<fx:main.md:12>`.
- The compiler (`links.rs`) reports, besides text runs and links, the list `(file, line, page, x, y)` of the markers, taken from Typst's introspector exactly as internal links are resolved today (`introspector().position`).
- The frontend maps:
  - **line to preview:** the nearest marker of the same file with a line at or before the cursor's line;
  - **click to line:** the nearest marker above the clicked point.
  Files brought in by `<include>` work because the file is part of the label.
- **Inside a block** (a long paragraph) the existing text search is kept, but only among the runs between this marker and the next, so identical text elsewhere no longer matters.
- Markers must not change the layout: only at block starts, never inside a sentence (no effect on spacing, ligatures or Persian letter joining). Components of the library must pass them through; a test compares a document with and without markers.
- The text search stays as the fallback when a page carries no markers (an older engine, a block kind without a marker).

#### As built

- **Engine** (`formatex-typ/src/preprocess/mark-lines.typ`, `fx-mark` in `src/core.typ`): only when `sys.inputs.markers == "1"` (the app's preview builds; a PDF export and the CLI do not set it, so their output is unchanged). The marker is `<!--raw-typst #fx-mark("file:line") -->`, which cmarker passes through as Typst (the engine already does this for ids), and `fx-mark` is `#metadata((fx: at))` with the label `<fx-mark>`.
- **Placement** (found by trial: a comment that opens a line starts an HTML block and the rest of the line is no longer Markdown): a paragraph, heading, table, quote, tag or code block gets the marker **on a line of its own above it**, when it follows a blank line and starts at an indent below 2; a **list item** gets it **right after the first word of its text** (a line between items would split the list; a comment that opens the text makes an HTML block; one at the end of the line would sit at the bottom of an item that wraps, so the mapping landed one item late). Only after a plain word that is followed by more text; an item that starts with markup, a task-list box or a single word is not marked and belongs to the block above it. Nothing is marked in the front matter, in fenced code, in a comment, or in indented continuation text.
- **Check:** `docs/doc_en.md` and `doc_fa.md` built with and without markers have the same pages; the pages are pixel-identical (one page of each differs only in how a run of text is split into glyph groups, with the same positions).
- **Compiler** (`links.rs`): `markers(document)` queries the label with the introspector and returns `(file, line, page, x, y)` in document order; `compile_project` sends the list with the pages and the frontend asks for `markers=1`.
- **Frontend** (`markerLookup.ts`): `placeFromMarkers` (line to place), `markerAt` + `lineFromMarker` (click to file and line). The runs between a marker and the next one are searched with `previewPlaceOf` / `sourceLineAt` (both take a `keep` filter for this). `previewPlace.ts` falls back to the whole-document search when there are no markers. A click now returns a file and a line, so it opens the right file of an `<include>`.
- **Inside a block** a click also gives a **column**: `sourcePlaceAt` finds the clicked run among the block's text, takes the place of the click inside the run from its x (from its right end for a right-to-left run) and goes to the start of the word there. A paragraph that is one long line of the source and wraps over several rows of the page thus gets a different column for each row and word. `normalizeWithMap` keeps where each normalized character came from, so tags, marks, diacritics and ZWNJ do not shift the column. Identical runs in one block are told apart by **reading order** (`readingOrder.ts`): page by page, row by row, and within a row from the right in a right-to-left row (Typst lists the runs of a line in visual order, so the first Persian word has the largest x) and from the left otherwise; the direction is that of the row's text, so an English word in a Persian sentence is read with the sentence. The k-th identical run is the k-th place of that text, in both directions (`sourcePlaceAt`, `previewPlaceOf`). Text with no source (numbers, "Figure 1") stays at the block's start. The word is an estimate from x (the compiler does not send the width of each glyph); exact words would need glyph advances in `links.rs`.
- **Reference line (measured):** a list item's marker is on the **baseline** of its first row; the marker of any other block (paragraph, heading, quote, table) is at the **top** of the block, a little above its first row. A text run's box (`links.rs`) starts 0.85 em above its baseline and is 1.25 em high, so the middle of an item's own row lies about 2 pt above its own marker. Comparing run centres with markers put every item's text in the block of the item before it (the preview was one item ahead). Runs and clicks are now compared by **baseline** (`0.68` of the box height, slack 1.5 pt), which is right for both kinds of marker; `markerAt` measures a click by the baseline of the row it is in. A Rust test checks the relation on a Persian list, heading, quote, nested list and table, and `markerLookup.test.ts` holds the numbers measured from the ten-item list.
- **Known limits:** the same file included twice has the same markers twice (the first is used); two columns are told apart only by the marker's own x in one row; code blocks and tables are located by their start (text search finds the row inside).

### Stage 2: a source map in the conversion (to evaluate)

- The principled solution is the one every transpiler uses: the Markdown to Typst step keeps the source offset of every node and emits a **source map** next to the generated Typst (generated offset to file and Markdown offset). Typst's own `jump_from_cursor` / `jump_to_source` then work on the generated text, and the map carries the result to Markdown. Both directions become exact down to the character, with no markers in the layout.
- It needs someone to own the conversion: a step in Rust (the app) or a change in `cmarker` itself, instead of the WebAssembly plugin running inside Typst. The cost is that the engine `formatex-typ` would no longer work alone with the `typst` CLI unless the conversion also ships as a tool beside it.
- Before deciding, read `cmarker`'s source: if it can pass source positions through (spans, labels, a callback), stage 2 becomes much smaller.

### Keeping the options open

The marker format and `previewPlaceOf` / `sourceLineAt` are the only parts a later source map has to replace; the callers (following, the context menu, click to source) do not change.

## Alternatives Rejected

- **Keeping the text search alone:** it cannot tell identical paragraphs apart.
- **Ordinal alignment** (the n-th occurrence of a text in the source is the n-th in the preview, like a diff): cheap and solves the "October" document, but breaks when layout order differs from source order (floating figures, columns, right-to-left tables). Acceptable only as a fallback.
- **Typst spans as they are:** they do not reach the Markdown (see Context).

## Consequences

- Stage 1 changes `formatex-typ` (preprocessor, components pass-through, a Rust field in `PageMap`), so it is synced with `npm run engine:sync`, and the engine's examples need a visual check for layout changes.
- Block precision is enough for scrolling and for placing the cursor on a clicked block; character precision (clicking a word in a long paragraph) stays with the text search inside the block until stage 2.
- Stage 2, if chosen, is a new ADR that supersedes the part of this one that it replaces.
