# Large-document preview measurements, 2026-11-10

## Scope and reproduction

Measured the native Rust pipeline in **release mode** on Windows x64, Intel Core i5-11400H. This is not an Android or WebView rendering benchmark. Font discovery was warmed before the preview measurements; packages were already cached. The fixture has **80 sections, 24,116 whitespace-delimited words, 2,616 source lines, 196,716 UTF-8 bytes and 62 paged-output pages**. It mixes Persian and English prose, headings, lists, tables, equations, Python blocks, bold/italic text and alerts. It has no external downloads, image-heavy charts or Mermaid diagrams.

The ignored tests in [`compile_benchmark.rs`](../src-tauri/src/compile_benchmark.rs) generate the project and collect the results. From `formatex-app`, in PowerShell:

```powershell
$env:FORMATEX_BENCH_DIR = (Join-Path (Resolve-Path ..) 'out/performance-2026-11-10')
cargo test --release --manifest-path src-tauri/Cargo.toml --lib benchmark::large_preview_pipeline -- --ignored --nocapture
cargo test --release --manifest-path src-tauri/Cargo.toml --lib benchmark::trace_large_edit -- --ignored --nocapture
cargo test --release --manifest-path src-tauri/Cargo.toml --lib benchmark::regex_control -- --ignored --nocapture
```

Run the three tests separately, not concurrently. Set `FORMATEX_BENCH_SECTIONS` for the first test to change document size; the detailed trace/control tests expect the default fixture's section 40. Output includes the source project, HTML with and without embedded fonts, `release.json`, `regex-control.json` and a Perfetto/Chrome-compatible `html-edit-trace.json`. `typst-timing` is a dev dependency, already present transitively through Typst; normal app builds do not enable tracing.

## Actual pipeline timings

All numbers below are milliseconds. First-target build means the first compile of that output target in the process, not a completely cold OS/package cache. The paged path includes the app's `markers=1` input, page hashing, changed-page SVG generation, page maps, markers and JSON serialization. Edits are cumulative replacements in the first, middle and last sections. Page count remains unchanged.

| Paged preview | Compile | SVG | Hash/maps/markers/JSON | Total | Changed pages |
|---|---:|---:|---:|---:|---:|
| First build | 2344.8 | 221.8 | 47.8 | 2614.3 | 62 |
| Identical source | 36.0 | 0 | 0.6 | 36.7 | 0 |
| Edit at start | 1746.9 | 4.4 | 6.0 | 1757.3 | 1 |
| Edit in middle | 1483.8 | 3.6 | 4.5 | 1491.9 | 1 |
| Edit at end | 1451.5 | 3.3 | 4.5 | 1459.3 | 1 |

The first SVG payload is **26.1 MB**, or **29.0 MB** as the serialized preview response; single-page edit responses are **0.53–0.58 MB**. Rust JSON serialization is only 0.5–0.7 ms for edits. The initial payload still needs separate IPC/WebView image decoding/rendering measurements before claiming an end-to-end first-preview time.

| Current HTML path | First build | Identical source, new World | Edit at start | Edit in middle | Edit at end |
|---|---:|---:|---:|---:|---:|
| Without embedded fonts, total | 1852.9 | 3702.1 | 3895.1 | 3501.3 | 2018.3 |
| With embedded fonts, total | 1882.5 | 4755.0 | 9128.5 | 2537.8 | 1962.8 |

These are sequential observations, not a throughput or percentile study; the 9.1 s result is a large spike and is retained rather than omitted. In the font-enabled runs, HTML serialization takes **1.1–3.4 ms**, font subsetting/WOFF/base64 **75–143 ms**, and compilation **1754–8975 ms**. Disabling fonts does not consistently reduce compile time: the variations are inside compilation, not font processing. HTML grows from **0.313 MB** to **2.345 MB** when fonts are embedded. Cold font discovery took **4.60 s** on this machine, independently of per-edit times.

The profiler added to `render_html_profiled` logs World preparation, compilation, HTML serialization, fonts, total time and byte count. Total also includes cache eviction; individual stage sums need not equal total. It does not include Tauri delivery, React `srcDoc` assignment, browser layout, font loading, paint or OS scheduling before the command starts.

## Internal bottleneck and controlled confirmation

An independently traced small edit in a **retained HTML World** took **1193 ms** with tracing enabled. The largest exclusive costs were:

| Trace location | Exclusive ms | Calls | Interpretation |
|---|---:|---:|---|
| `src/preprocess/mark-lines.typ:48` | 743.8 | 18,516 | Inline-code/math replacement expression constructs regexes inside the per-line loop |
| `src/core.typ:402` | 53.6 | 3 | Full-source Latin-character matching for HTML language detection |
| `src/preprocess/table-attrs.typ:23` | 44.0 | 8,261 | Slices/searches the remaining lines before checking whether the current line has table attributes |
| `src/core.typ:401` | 34.7 | 3 | Full-source Arabic-character matching |
| `call plugin` | 30.7 | 1 | Markdown plugin execution |

`mark-lines`'s `markup-only` loop accounts for about **786 ms inclusive**; it runs twice, through document evaluation and line marking. Inclusive rows overlap and must not be added together. The regex-heavy expression alone consumes about **62%** of traced compilation time. This is substantially larger than Markdown plugin execution, HTML serialization or font processing.

The `regex_control` test changes **only its in-memory World**, hoisting those two regex constructions to module-level constants. It does not edit the engine files. After one warm-up, three edits measured:

| Controlled retained-World edit | Run 1 | Run 2 | Run 3 | Median |
|---|---:|---:|---:|---:|
| Original regex construction | 1200.6 | 1184.9 | 1203.5 | 1200.6 |
| Two regexes hoisted | 264.2 | 249.6 | 269.7 | 264.2 |

That is **4.54× faster compilation / 78% less compile time in this experiment**. Generated HTML is asserted byte-for-byte identical for every paired source. This is not a measured 4.54× speedup of the whole app: scheduling, fonts, IPC and browser repaint remain outside this comparison. The production engine has not yet received this optimization.

## Additional delays confirmed by code inspection

- `useEditorStore.ts` waits **120 ms** after the last edit before requesting paged compilation. Save is separate at **400 ms** and is not a mandatory extra 400 ms in front of compilation.
- `HtmlPreview.tsx` waits **700 ms** after the last edit, then calls the full export path, honoring `embed-fonts` (on by default). Even a 264 ms compiler would not produce sub-100 ms visible updates with this scheduler.
- `render_html` creates a new `ProjectWorld` on every invocation. A control that retains and refreshes it compiled an identical document in **24.8 ms** (84.4 ms total including serialization/cache eviction), and edited sources in **1311–1340 ms** before the regex experiment. Reuse helps but does not remove whole-document preprocessing.
- In HTML mode the paged compiler still runs: `edit()` schedules it unconditionally, and `PreviewPane` only hides the SVG area. Thus editing can request both output targets.
- HTML effect cleanup cancels only a timer. It rejects stale results with a generation number but does not cancel an already running Rust export or enforce a single in-flight export. Slow builds can overlap, process stale snapshots and compete with paged compilation. This behavior is established by code inspection; its precise contention cost was not measured here.
- Every HTML result replaces the iframe's `srcDoc`, causing a document/font/script reload. Browser layout/paint has not yet been measured and is an additional possible cost, not included in the backend results.

## Priority for optimization

1. Hoist/avoid repeated regex construction in `markup-only`; the controlled result gives the strongest direct evidence. Verify both guides, source markers, formulas, inline code and all relevant engine examples before shipping it.
2. Reuse a separate HTML World and serialize/coalesce preview requests; do not run a hidden paged build for every HTML-only edit.
3. Give live HTML preview its own lightweight font strategy instead of running standalone-export font preparation every time; retain full font embedding for exported artifacts.
4. Reduce/adapt the HTML debounce once obsolete concurrent work is prevented; measure iframe replacement, IPC and browser paint next.
5. Avoid scanning/slicing the entire remaining document for non-table-attribute lines, and avoid repeating full-source language-character matching.

No optimization of production scheduling, caching or the engine is included in this measurement task. Only timings, ignored diagnostic benchmarks and documentation were added.

## Verification

All three opt-in release diagnostics passed, including byte-identical HTML assertions in the regex control. The regular release Rust library suite passed (55 passed, 6 intentionally ignored), `cargo check` passed, and `git diff --check` passed. Frontend code was unchanged in this task; frontend tests were not rerun. Android interaction and WebView paint remain unmeasured.
