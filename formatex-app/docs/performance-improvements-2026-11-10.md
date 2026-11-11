# Live HTML and editor improvements, 2026-11-10

## Scope and comparison method

This report records the implementation following [the original large-document profiling report](performance-2026-11-10.md). The original report is historical: its observations and timings have not been rewritten as optimized results.

The native comparison uses the same generated bilingual fixture: 80 sections, 24,116 whitespace-delimited words, 2,616 source lines and 196,716 UTF-8 bytes, with 62 pages in the original paged output. It mixes Persian/English prose, headings, lists, tables, equations, code blocks and alerts. Native tests run in release mode on Windows x64, Intel Core i5-11400H, with cached packages and warmed font discovery. The benchmark measures native compilation, serialization and font preparation; it does not include the whole Tauri IPC-to-WebView paint path or Android execution.

The original font-enabled HTML edit runs had a median of **2537.8 ms** (range **1962.8–9128.5 ms**, including a recorded spike). The earlier in-memory regex-only experiment reduced warm compile median from **1200.6 to 264.2 ms** with byte-identical HTML. That isolated experiment is distinct from the complete live pipeline, which now also applies native list and document settings correctly.

## Native results after implementation

The final release run started after the separate Cargo release and PDF builds finished. Intermediate concurrent-load observations are not used as final results. Raw data is in `out/performance-after-2026-11-10/release.json`.

| Native backend measurement | Original pipeline | Implemented pipeline |
|---|---:|---:|
| Warm HTML edit median | 2537.8 ms, three edited snapshots | **363.2 ms**, four unique warm edits |
| Warm HTML edit range | 1962.8–9128.5 ms | **325.3–462.5 ms** |
| First live-preview packet with font CSS in the subtest | Not a separate live path | 740.0 ms |
| Warm paged edit median | 1491.9 ms | 584.6 ms |
| First paged target build | 2614.3 ms | 2203.9 ms |
| Identical-source paged request | 36.7 ms | 50.9 ms |

The observed warm HTML median is **6.99× faster**, about **86% less native backend time**, for this fixture. These are small sequential samples, not a latency-percentile study. The first live-preview packet includes reusable font CSS, but font discovery and the HTML world had already been warmed by earlier benchmark stages; 740 ms is not a cold process or application-start claim. The unchanged paged request was slightly slower in the final run, so the measurements do not imply that every operation improved.

The four live-edit totals were **325.2781, 346.6674, 379.7850 and 462.4567 ms** (median **363.2262 ms**). Compilation accounted for **311.8–445.2 ms**. Warm font-cache work took **0.0246–0.0313 ms** and sent **zero font CSS bytes**. The first live request sent **2,729,744 bytes** of reusable full-face font CSS; later edits reused its key rather than resending it. The HTML content itself was about 0.340 MB.

The paged edits took **584.6207, 528.4822 and 587.0323 ms**, with one changed page each. The original and final runs both produced 62 pages; page SVG generation remained around 3–4 ms per changed page.

An isolated regex-control rerun also passed byte-identical HTML assertions for all four paired sources. Its three warm baseline compiles were 1318.2, 1195.2 and 1261.0 ms (median **1261.0 ms**), versus 317.7, 253.7 and 271.2 ms with hoisted regexes (median **271.2 ms**), about **4.65× faster**. This rerun is separate from the historical 1200.6 → 264.2 ms control in the original report.

To reproduce the full pipeline run from `formatex-app` in PowerShell:

```powershell
$env:FORMATEX_BENCH_DIR = (Join-Path (Resolve-Path ..) 'out/performance-after-2026-11-10')
cargo test --release --manifest-path src-tauri/Cargo.toml --lib benchmark::large_preview_pipeline -- --ignored --nocapture
cargo test --release --manifest-path src-tauri/Cargo.toml --lib benchmark::regex_control -- --ignored --nocapture
```

Run without simultaneous PDF or Cargo builds when comparing results. Do not add these native times to the browser stage below and present the sum as measured end-to-end latency; those stages were sampled separately.

## Changes implemented

- **Preprocessing:** regex construction is moved out of per-line work, and repeated scans/searches are avoided where possible. Document syntax stays unchanged.
- **Incremental HTML worlds:** `kept_world_for` retains HTML and paged `ProjectWorld` instances in separate slots. Changed files refresh in place, with new worlds when the root, main file, inputs, component generation or fonts change.
- **Latest-only scheduling:** `latestTaskQueue.ts` allows one running preview and one replaceable latest pending snapshot, including across remounts. The delay adapts between 120 and 250 ms. HTML mode skips the hidden paged build; returning to pages compiles the latest source.
- **Reusable preview fonts:** `preview_html` / `render_preview_html` use `preview_fonts`, caching full WOFF faces by weak font-store identity, required families and italic need. `fontKey` allows CSS to be omitted once known. Standalone Export keeps font-subset embedding.
- **Persistent iframe:** `htmlFrame.ts` uses a validated source-window and per-document-token message channel to patch ordinary main content without replacing the viewer, font node or scroll position. `fx-content-updated` refreshes outline, copy and Find controls. Viewer-signature changes, custom scripts in main content and Raw Typst output without `main.fx-doc` reload the shell.
- **Native HTML settings:** merged `dir`, paragraph justification/spacing, table head/body alignment, heading look relative to the effective top outlined heading, and global/local list styles are applied to native blocks. Unordered markers are emitted as text. PDF guide drawings are deliberately excluded from native HTML lists.
- **Source navigation:** a virtual canvas minimap retains a fixed 2 px per source line, follows source scrolling and supports wheel, click and viewport dragging. Sticky top panels reserve its width; resizing into the phone layout removes it dynamically.
- **Find:** the first source toolbar icon and Ctrl / Cmd + F open the translated, touch-sized shadcn find/replace panel for all text kinds, including Raw Typst. The HTML viewer also has its own phone-accessible Find magnifier, literal case-insensitive matching across text nodes, previous/next, localized count and keyboard controls.
- **Sidebar:** selected links use transparent square rows with an accent border.

The architectural choice is recorded in [ADR 0012](decisions/0012-incremental-html-preview.md). The same Markdown, component tags, front matter and `[html]` authoring settings are used for preview and Export.

## Verification completed

- Frontend: **358 tests passed**; typecheck and production build passed. Lint completed with **nine pre-existing warnings** after removing the temporary browser harness.
- Browser source harness: a **4500-line** document at **1280 px** and **768 px** had no sticky/minimap overlap (`overlap=false`). Minimap geometry retained **9000 px** of content scale against a **558 px** viewport instead of compressing the whole document.
- At **360 px**, source Find selected `Line 3333` and the minimap was removed.
- The native HTML configuration regression passed for forced RTL, front-matter `auto`, paragraph spacing, list settings and table alignment.
- Rust: **57 tests passed, zero failed, six intentionally ignored**; `cargo check` passed.
- Engine: all **24** theme/feel demo PDFs and the mobile demo build passed. Page 5 was visually inspected in paper formal/standard/friendly, midnight standard and mobile: readable text, square formal styling and no clipping were observed.
- HTML browser cases passed in English/paper and Persian/dracula at target widths 360/768/1280 px (reported viewport widths 360/769/1281 px). Ordinary patches retained the same toolbar and font node, one toolbar, 80 code-copy controls, 81 outline links, scroll position 500 and zoom 1.1. Wrong-token messages were ignored. Find reported `1/1` or `۱/۱`, with one highlighted match; outline link radius was 0 px.

### Browser content patch and paint

These measurements start in the iframe when it receives the content patch and finish after fonts are ready and two animation frames have run. They include the live control refresh and observed browser load, but exclude native compilation and Tauri IPC. They are not whole-app end-to-end timings. The parent round trip is browser-frame messaging only.

| Viewer | Reported width | Patch and paint, ms | Browser parent round trip, ms |
|---|---:|---:|---:|
| English / paper | 360 | 164.7 | 231.6 |
| English / paper | 769 | 173.8 | 216.0 |
| English / paper | 1281 | 142.7 | 195.6 |
| Persian / dracula | 360 | 127.7 | 162.6 |
| Persian / dracula | 769 | 115.4 | 160.8 |
| Persian / dracula | 1281 | 174.0 | 229.6 |

Raw browser observations are in `out/performance-after-2026-11-10/browser-results.json`. All six cases passed. Native benchmark and browser measurements are separate observations; intermediate results taken while another Cargo/PDF build used the machine were not promoted to final native results.

## Limits and remaining checks

Real Android hardware interaction/performance and the complete Tauri IPC-to-WebView end-to-end timing are **not verified** by these native or browser-harness results. Browser source geometry checks do not prove native Android touch behavior. The first full-font preview can have a different cost from warm edits; export portability remains separately tested from cached live preview.
