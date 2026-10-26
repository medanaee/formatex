# ADR 0004: Responsive Layout and Platform Abstraction

- **Status:** Accepted. Partly refined by [ADR 0006](0006-project-files-and-editor-environment.md): a `fullscreen` route (the editor) hides the navigation on every screen, not only on a phone.
- **Date:** October 2026

## Context

The app ships first on desktop and Android and later on the web. It must be fully usable on a phone, a tablet and a desktop window, in RTL and LTR, light and dark. Unlike Docium (tablet-first, phones show a "screen too small" notice), **no screen class is secondary here**.

## Decision

1. **Three screen classes** (phone < 640, tablet 640–1023, desktop ≥ 1024) defined once in `src/lib/formFactor.ts`, aligned with Tailwind's `sm` and `lg` breakpoints. `useFormFactor()` re-renders only when the class changes.
2. **One shell, three navigation patterns:** bottom bar (phone), icon rail (tablet), collapsible sidebar (desktop). A route may ask for the whole phone screen with `staticData.hideNavOnPhone`.
3. **One modal component** (`ResponsiveDialog`): bottom sheet on a phone, dialog elsewhere.
4. **Platform knowledge lives in `src/lib/platform.ts`** (`android | ios | desktop | web`, `isTauri()`). UI code asks for capabilities or form factors. Native-only modules are dynamically imported behind `isTauri()`.
5. **The shell owns safe areas** (`pt-safe`, `pb-safe`, `ps-safe`, `pe-safe` utilities over `env(safe-area-inset-*)`); `viewport-fit=cover` is set.
6. **Web-ready from the start:** browser history when not in Tauri, a `WebRepository`, no required native API at import time, pinch-zoom left enabled (`user-scalable=no` is *not* used).

## Alternatives Rejected

- **Blocking small screens** (Docium's guard): contradicts the requirement.
- **Separate phone / desktop component trees:** doubles maintenance; one tree with a few behavioral switches is enough.
- **Container queries everywhere:** useful later for panes; the shell-level decision is a viewport decision.

## Consequences

- Positive: every page is built once and works on all classes; adding web is mostly a storage backend and a Typst-WASM compiler.
- Trade-offs: each new feature must be checked at three widths; the editor will need a deliberate phone design (tabs for source / preview) rather than shrinking the desktop one.
