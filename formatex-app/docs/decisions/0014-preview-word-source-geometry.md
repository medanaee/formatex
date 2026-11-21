# ADR 0014: Preview word geometry from shared source provenance

## Status

Accepted; implementation and tests in progress. This extends the block-marker fallback in [ADR 0009](0009-exact-source-mapping.md) and the shared IR/provenance ownership in [ADR 0013](0013-shared-typst-core-pdf-html.md). It does not certify character-exact mapping for every rendered feature.

## Date

2026-11-12

## Context

Block markers distinguish many source locations but rely on text/context search inside a block. Repeated text, wrapping and mixed direction can make that search ambiguous. Shared IR already records source file, UTF-16 ranges, occurrence/node identity and generated provenance; preview should use it before searching displayed text.

## Decision

1. PDF preview emits `formatex-source:` annotations on ordinary IR text words. Typst's link frame rectangles split at visual lines/pages; native extraction places their geometry, node identity, original file/UTF-16 range and generated flag in `PageMap.sources`.
2. Internal annotations are removed from user-link lists. They exist only with preview source markers enabled; `markers=0` emits none. Exports must not expose preview annotations/private provenance.
3. PDF preview-to-source and source-to-preview use direct provenance first. Block/context/text search remains a fallback only when exact source geometry is absent. Shared core helpers define text-to-source conversion and half-open range containment.
4. HTML reverse lookup computes a DOM word `Range` at the source caret and scrolls/highlights that word's rectangle, rather than the whole text node. HTML click lookup also prefers source provenance over text search.
5. Initial scope is ordinary text and rich inline descendants. Raw code, math and generated component labels retain fallback unless finer mapping is added and tested. Generated output preserves its origin flag/span; do not invent a one-to-one character relation.
6. No new document language or author syntax is introduced. Core owns text/source helpers; output adapters provide geometry and the app owns navigation.

## Verification required

Test PDF wrapping/page splits, repeated words/includes, rich descendants, RTL/LTR, Unicode/UTF-16 and half-open boundaries. Test forward/reverse navigation at the same word, HTML word-range highlighting, and fallback cases explicitly. Assert internal annotations never become user links and are absent with `markers=0`/export. Check source geometry does not change layout or invalidate existing semantic links. Phone, tablet and desktop use the same provenance policy; actual touch/WebView interaction requires separate device evidence.

## Consequences

Direct provenance reduces search for supported text while preserving a usable fallback. It is word-level preview geometry, not a claim that raw code, math, generated labels or every component are exact. Record named test/visual gates before closing the implementation task.

## Implementation checkpoint

Word annotations are suppressed inside Markdown links, `ref`/`a`/`def` and custom Typst handlers because nested provenance links can steal real destination hit areas. These regions retain bounded context fallback to preserve user links. Raw code, math and generated component labels also retain fallback without finer geometry.

Targeted native provenance verification passes for ordinary bilingual repeated words with exact UTF-16 starts, included files, generated-expression origins and multiple visual rows. Glyph IDs, positions and advances match `markers=0` versus `1`; TextItem grouping can differ. PDF reverse lookup uses a cached per-page/per-file interval index. Fallback ranks ordered before/after context plus distance and removes the former first-200-occurrences cap; repeated RTL/LTR and >200-occurrence tests pass. Frontend checkpoint: 379 passed/one skipped including real Typst→IR→HTML integration and preview artifacts; typecheck/build pass, lint retains nine existing warnings. Native: 69 passed/five ignored, including unchanged actual user-link rectangles. The final payload-compaction/UTF-16 recomputation rerun also passes 69 tests/five ignored; this does not expand the exact-mapping scope. Final engine sync succeeds with 43 packages/78 tags. The PDF matrix passes 25 cases. Actual IAB 360/768/1280 px Persian/English light/dark viewer checks pass, including menus/outlines and a fresh hydration run with zero errors/warnings.

A real mobile HTML source reveal targeted word «تمدید» at source offset 18059; clicking the revealed word returned offset 18060 in the same correct Markdown file. The Range highlight covered only that word on its wrapped visual row. This verifies the named word/line case, not character-perfect mapping of every component. The viewer shell now uses an independent React SSR hydration root, eliminating the reproduced React 418 mismatch in a fresh-query browser run.
