# ADR 0008: Source position to preview position by text runs, not by Typst spans

- **Status:** Accepted
- **Date:** October 2026

## Context

Two editor features need to know where a line of the Markdown source is in the typeset pages: the preview **follows the text being edited**, and the editor's right-click menu has **Go to here in preview**. The preview is one SVG image per page ([ADR 0005](0005-native-typst-engine.md)). The reverse direction already exists: a click on a page finds the source line from the text runs the compiler reports per page (`links.rs` → `PageMap.texts`, `sourceLookup.ts`).

Options considered:

1. **Typst's own jump facilities** (`typst-ide` `jump_from_cursor` / `jump_to_source`). They work on **Typst** source and `Span`s. Here the Markdown is read by `cmarker` and rewritten by the engine's preprocessor, so the content that reaches the layout carries spans of the engine's own files, not of the Markdown (`mark-lines.typ` tags only tags, links and options with `@file:line`, for diagnostics). Using spans would need the engine to attach a Markdown position to every element it produces, through cmarker, for every block kind, and keep them stable across `<include>`: a large engine change that every new component would have to honour.
2. **A heuristic by block**: map by heading index, or the nearest preceding heading plus a proportional offset. Cheap, but wrong wherever the layout is not proportional to the source (images, tables, figures, page breaks, included files), which is where the user needs it most.
3. **Search the line's text among the text runs of the pages** (the reverse of the click-to-source lookup).

## Decision

Use option 3: `previewPlaceOf` (`src/lib/editor/previewLookup.ts`, pure and tested).

- The line under the cursor (or the nearest line with words, looking up to 8 lines away, the earlier first) is normalized like the click lookup (`normalizeText`). A text run of any page belongs to it when the run's words are in the line or in the two lines around it (a run may continue over a source line break). Order does not matter, so Typst's visual order of runs in right-to-left text is no problem, and punctuation, tags and Markdown marks are ignored.
- When the same words occur in several places, the place whose neighbourhood (runs within four lines of text) holds most of the words of the ±8 lines around the cursor wins. For the **main file**, the position in the file breaks ties and is the **approximate** fallback when nothing matches (the result says `approximate`; following ignores it, the menu uses it).
- In a long paragraph, the cursor's column chooses the run (visual line) it is in.
- Files brought in by `<include>` need nothing special: the text is searched in the output of the whole document, so an included file's line is found where it was placed. Only the position-in-file fallback does not apply to them.

**Following the typing** (`followTyping.ts`): the editor store records the last edit. The preview moves only **after the build that follows it has ended** (the pages on screen before it do not have the new text), never while a build runs or is about to run again, and only if the place is not already comfortably in view (15 %–80 % of the pane). A **manual scroll** of the preview (wheel, touch, scrollbar drag) pauses following for 4 s and drops a place not yet shown. A failed build, a non-Markdown file and the **Follow** toggle in the preview bar (setting `previewFollow`, on by default) also stop it.

**Go to here in preview**: the place of the last press in the editor is looked up; the preview is shown (its panel on a desktop window, its tab on a narrow one), scrolls to it and marks the line for a moment. The request goes through `usePreviewScrollStore`, so a hidden or still-empty pane applies it when it is ready.

## Alternatives Rejected

- Typst spans (option 1) and block heuristics (option 2), for the reasons above.
- Asking the compiler for the position (a Rust command per lookup): the text runs are already on the frontend, and the lookup is fast (a few thousand string searches).

## Consequences

- Like the click lookup, it is a heuristic. A line with no words of its own (an image, a tag-only line) lands on the nearest line with text; identical paragraphs far apart are told apart only by their neighbourhood; text that Typst changes a lot (hyphenation across runs, numbering, generated text) may not match, and then nothing moves (or, in the main file, the menu goes to the proportional position).
- While the user types, the edited line differs from the old pages; the runs of the other lines of the paragraph still match, and following waits for the rebuilt pages anyway.
- If the engine ever carries Markdown positions through to the layout, `previewPlaceOf` can be replaced behind the same function.
