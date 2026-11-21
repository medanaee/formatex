# Formatex PDF backend

This pure Typst backend consumes the shared core DocumentIR through `typst/src/render.typ`. It owns IR-to-Typst adaptation, paged layout/PDF and context-aware graphics/SVG rendering. Common source evaluation, Markdown parsing, settings and source provenance remain in `formatex-core`; shared component implementations/contracts are in core's six-file package folders.

There is no separate PDF npm package. Install workspace dependencies at the repository root with `npm install`; run `npm run typ:sync` to build current core WASM and assemble core+PDF into the standalone `formatex-typ/` distribution. Compile documents through that distribution's `main.typ` or its locally generated one-file bundle, keeping document inputs external. The standalone local tools also work after relocation; sync requires the source owners to consume new changes.

The 24 theme/feel PDF matrix and mobile compilation, selected visual pages and isolated one-file/custom-package fixtures pass. These named checks do not certify every component/property or mapping/diagnostic case. See [the staged plan](../formatex-app/docs/tasks/shared-core-pdf-html-plan.md) for the complete acceptance matrix and [the performance report](../formatex-app/docs/shared-core-performance-2026-11-12.md) for stage-specific timings.
