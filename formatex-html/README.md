# Formatex HTML engine

`@formatex/html` consumes the shared `DocumentIR` from `@formatex/core` and produces a complete offline HTML document. It owns React document rendering, editable TSX compilation, Tailwind generation, syntax highlighting, math rendering, and the React shell (toolbar, search, outline, zoom and reading progress).

The engine does not import the application, Tauri, the editor, or a native compiler. The host prepares the IR and supplies serializable package implementations, schemas, CSS, resolved image/text/SVG assets and optional theme/font tokens. Native font finishing and Typst graphics compilation remain host services. These services do not own document HTML layout.

```ts
import { renderHtml } from "@formatex/html"

const html = await renderHtml(documentIR, {
  html: { toolbar: true, outline: true, progress: true, copyCode: true, katexMath: true },
  uiLanguage: "fa",
  components: sourcesByTag,
  schemas: schemasByTag,
  assets: resolvedAssets,
  runtime: bundledRuntime,
})
```

`renderHtml` is asynchronous. Browser hosts can use `renderInWorker` from `@formatex/html/browser` with the same serializable arguments. The returned string includes static document content and required Tailwind CSS. The optional runtime hydrates the React document shell; it contains no application services. Math is already rendered in the returned document, so readers do not execute the KaTeX compiler. Hosts with native font delivery set `nativeFonts: true` and process the `fx-fonts` metadata; other hosts receive the required bundled KaTeX font families inline.

From the workspace root, run `npm run build --workspace @formatex/html` to build the standalone shell at `dist/runtime.js`, exported as `@formatex/html/runtime`. Run `npm run assets:math --workspace @formatex/html` after updating KaTeX to regenerate offline CSS/fonts and its license from the installed package.

The shared Typst/WASM core and separate HTML/PDF integration are verified on the full demo, including real SVG/assets, offline font finishing and the named test/build/browser fixtures. Complete component-property parity and real Android native interactive UI remain separate gates in the [implementation plan](../formatex-app/docs/tasks/shared-core-pdf-html-plan.md) and [task board](../formatex-app/docs/tasks/todo.md). Document content is static SSR; only the viewer shell hydrates. Arbitrary component events/state and live DSL variable reactivity are not implemented.

Install dependencies with `npm install` from the workspace root and use its lockfile. The four npm workspaces include the generated `@formatex/typ` standalone package; the PDF backend itself is pure Typst. See the [core](../formatex-core/README.md), [PDF](../formatex-pdf/README.md) and [measurement report](../formatex-app/docs/shared-core-performance-2026-11-12.md) for ownership and measured limits.

The real browser-worker harness verifies `renderInWorker` on a large IR with custom TSX and a manifest, producing 497,434 characters without errors/warnings. Its development module-loading time is not a comparable performance benchmark. Shared TOML parsing uses browser/Node-compatible `smol-toml`.

`alert`, `box`, `badge`, `kbd`, `code`, `theorem`, `exercise`, `fig`, `grid` and `steps` own their JSX and CSS, and `renderBuiltin` no longer draws them. Their padding, hairline and feel radii follow the PDF (12pt / 8pt insets, preset tints mixed in CSS, formal square corners). Standard Markdown (headings, lists, tables, quotes, fences, inline code and display math) is rendered in `src/markdown.tsx` with the same options and feel as the PDF. The other built-in `html.tsx` files still delegate to `renderBuiltin(node, context)` in `formatex-html/src/components.tsx`. Custom package TSX uses the same renderer API.

## Source responsibilities

| File | Responsibility |
| --- | --- |
| `src/index.ts` | Public renderer, component, UI, utility-CSS and asset exports. |
| `src/render.tsx` | Orchestrates async IR rendering, component compilation, math/assets, static content and complete offline HTML packaging. Renders `DocumentShell` with `renderToString` as its own hydration root inside the static outer document. |
| `src/components.tsx` | Built-in tag rendering and the render context: effective props, children, targets, numbering and asset/graphics access. |
| `src/assets.ts` | Serializable asset/graphics requests and missing-asset errors for the host. |
| `src/math.ts` | Export-time KaTeX HTML+MathML/native MathML rendering and offline math styling/font requirements. |
| `src/highlight.ts` | Syntax highlighting for code content. |
| `src/tailwind.ts` | Compiles rendered utility-class candidates against bundled theme data into required static CSS. |
| `src/browser.ts` | Browser worker API, including `renderInWorker`. |
| `src/render.worker.ts` | Worker message handling for rendering serializable IR/options/assets. |
| `src/shell.tsx` | React viewer composition/state: reading percentage, search/zoom, theme swatches, aligned feel rows and active flat outline. |
| `src/reading.ts` | Cached heading geometry, reading percentage and explicit outline destination tracking; resumes automatic tracking on reader scrolling, find or source navigation. |
| `src/client.tsx` | Hydrates the viewer shell and installs the optional preview bridge; arbitrary document component events/state remain static. |
| `src/preview.ts` | Host-token/source-map-guarded preview navigation and DOM word-range reveal/click mapping. Standalone output has neither source map nor active preview IPC. |
| `src/style.css` | Document/viewer CSS: responsive layout, colors, spacing, visual states and theme/feel variables. |
| `src/ui/index.tsx` | Composed viewer/document helpers: IconButton, ToolButton, SearchInput, optional Panel, ComponentHeader and Caption; re-exports Popover. |
| `src/ui/primitives.tsx` | Engine-owned shadcn-style Button/Input primitives without app imports. |
| `src/ui/popover.tsx` | Real Radix Popover wrapper (`radix-ui` ^1.8.1), including focus/dismissal behavior. |
| `src/ui/messages.ts` | Local Persian/English viewer labels and layer tokens. |
| `src/generated/style.ts` | Generated bundled stylesheet data; edit its source CSS and regenerate. |
| `src/generated/theme.ts` | Generated bundled Tailwind theme data. |
| `scripts/build.mjs` | Offline runtime build, exported through `@formatex/html/runtime`. |

## Component styling and viewer state

Use theme/feel CSS variables and semantic utility colors/radii when a component should respond immediately to viewer choices. Those CSS values change live in the browser. Values read from render-time context/effective props or document tokens are snapshots from SSR; switching the viewer theme/feel does not rerun arbitrary component TSX. Avoid baking snapshot colors or radii into inline styles when live switching is intended. This does not implement reactive DSL variables or arbitrary component hydration.

`Panel` is an optional styled `<section>` with background, border and rounding; use it for a visible surface. A plain `<section>` keeps ordinary document flow when no card/panel appearance is needed. Shared UI helpers are choices for presentation, not mandatory wrappers for every tag.

Actual IAB checks cover 360/768/1280 px, Persian/English, light/dark menus and outlines; the initially clipped theme grid was corrected. Rendering the viewer as its own `renderToString` hydration root fixes the earlier React 418 mismatch; a fresh-query browser run reports zero errors/warnings. The runtime includes the real Radix dependency (304,962 bytes raw); this is a size observation, not a performance claim. Document content remains static SSR.

Header backgrounds use `context.background(path)` to request host-resolved assets. A root CSS variable holds the resulting data URL once, avoiding duplicated offline image payloads. Final real integration verifies background packaging and an artifact below 2 MB; frontend 379 passed/one benchmark skipped, typecheck and build pass. The per-component JSX extraction follow-up remains open.


## Viewer reading state (2026-11-13)

The toolbar shows the localized percentage of document scroll completed instead of the first heading/title and document icon. This is scroll progress, not an estimate of comprehension. Phone layouts retain the percentage and hide only the accompanying word; tablet/desktop show both. All appearance options reserve the same trailing check slot and give their labels equal flexible width in either direction.

`reading.ts` caches heading positions and uses the last heading above a fixed reading line, with binary lookup on scroll. Explicit outline navigation pins the selected heading through intermediate smooth-scroll frames and bottom-clamped destinations. Wheel/touch/keyboard scrolling in the document resumes automatic tracking; scrolling the outline itself does not. Find and authenticated editor source-reveal navigation also release the pin. Content patches, main-size changes, font/image loading and resizing refresh geometry. Scroll callbacks are animation-frame throttled. Real-device Android interaction remains a separate check.


Verification for the reading-control fix: 380 frontend tests pass (one optional benchmark skipped), including real HTML integration and a regression for clicked destinations, dense headings, bottom-clamped scroll, keyboard resumption and layout patches. Typecheck, production build and engine sync pass. Browser checks at 360/768/1280 px cover Persian/English, light/dark, aligned labels, 0–100% progress without phone overflow, and manual outline resumption, without console warnings/errors.
