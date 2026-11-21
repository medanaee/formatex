# Shared-core migration measurements (2026-11-12)

These measurements describe separate pipeline stages on the development machine, not app end-to-end latency or Android hardware performance. The accepted architecture and remaining gates are in [the staged plan](tasks/shared-core-pdf-html-plan.md).

## Shared Typst preparation/parser

The fixed bilingual large fixture has 80 sections and 196,716 source bytes; its IR is 1,575,048 bytes. Ordinary Markdown avoids expression/include evaluation when unnecessary, and absent deferred expressions skip that pass.

| Run | Cold | Warm repeated range |
| --- | ---: | ---: |
| Baseline | 3,175 ms | 2,812–2,951 ms |
| First fast-path measurement | 1,038 ms | 805–811 ms |
| Repeated fast-path measurement | 1,118.6 ms | 845.5–897.5 ms |
| Bytes transport only | 982.2 ms | 748.0–760.8 ms |
| Bytes transport plus protected-range index | 752.2 ms | 515.6–543.0 ms |

All repeated runs are retained to show variation and the sequence of changes. The latest warm samples are 527.9, 515.6, 529.6, 543.0 and 523.4 ms (`out/index-benchmark.log`); byte transport alone was 748.0–760.8 ms (`out/transport-benchmark.log`). The improvement cannot be attributed to transport alone. These timings cover core preparation/parser output, not PDF layout, font finishing, IPC or WebView painting.

The HTML host requests optional `transport=bytes`: Typst still invokes the Rust/WASM parser, but returns plugin JSON bytes without a Typst deserialize/reserialize round trip when SECTION context is unnecessary. SECTION-dependent content materializes/resolves the tree; compact JSON avoids deferred-marker newlines. The Rust parser merges protected Markdown ranges, uses a binary index and jumps protected regions. Four targeted pipeline tests pass, including inline SECTION. The final full native rerun now passes 66 tests with five ignored, including the SECTION-context regression. Cold IR size is 1,575,048 bytes; edited rounds are 1,575,030 bytes.

## Independent HTML rendering

The final `out/performance/html-timings.json` records cold rendering at **360.1 ms**, then five warm rounds at **97.8, 67.7, 158.2, 100.0 and 63.8 ms** (range **63.8–158.2 ms**). Each output is **783,497 bytes**. Font finishing, IPC and browser layout/paint are excluded. The full-demo offline HTML after native font subsetting is separately **1,992,581 bytes**; it is a different packaging measurement.

An earlier approximately 13 MB artifact was caused by JavaScript replacement-string `$&` expansion during runtime insertion. Callback replacement fixed it; pre-fix byte counts/timings are not the final renderer benchmark. The HTML viewer hydrates, but document content is static SSR; dynamic component event/state hydration and reactive live DSL variables are not implemented.

## Verification and limits

Parser: 9 passed. Frontend: 373 passed, including opt-in real full-demo SVG/assets integration and the large HTML benchmark. Native: 66 passed, 5 ignored. Typecheck and production build pass; lint reports nine existing warnings. The 24 PDF theme/feel matrix and mobile compile pass. Poppler renders of pages 10/14/15 were reviewed for grid, letter, choices and proof layout.

Browser harness checks at 360/768/1280 px covered Persian search, proof-square placement, real SVG, dark palette and feel/font changes, with no desktop overflow. Isolated bundled PDF/custom packages and relocated local standalone tooling pass. These establish named fixtures only: all component-property combinations, complete diagnostic/map/export fixtures, real Android native interaction and end-to-end hardware latency remain unverified gates.

### Browser worker dependency checkpoint

Core and standalone tooling now use `smol-toml` ^1.9.1 in browser and Node paths. The former TOML dependency pulled Node stream/global assumptions into the browser worker. The real IAB/Vite functional harness in `out/browser-worker` verifies `renderInWorker` with the large IR, a custom TSX component and manifest: success, 497,434-character HTML, no errors or warnings. This development-cold check includes dev module loading and is not a comparable speed benchmark. The final gates after smol-toml, bytes transport and protected-range indexing pass: frontend 373/373 including real integration and benchmark; production build passes without Node externalization warnings; native 66 passed/five ignored. The latest 24-combination PDF matrix also passes. The final bundle is 2,123,699 bytes with a 511,284-byte parser WASM; bundled full-demo PDF, relocated standalone tools/custom package and isolated one-file/custom package all compile. Offline font-finished HTML remains 1,992,581 bytes.
