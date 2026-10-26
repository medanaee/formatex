# ADR 0002: Routing & State (TanStack Router, Zustand)

- **Status:** Accepted
- **Date:** October 2026

## Context

The app has a few top-level destinations and nested detail routes (`/editor/$documentId`). It runs in a native WebView (no address bar, Android back stack) and later in a browser (URLs and reload matter). State is mostly UI state plus an in-memory copy of the library.

## Decision

1. **TanStack Router, code-based routes** in `src/router.tsx`. End-to-end typed paths and params (`Link to="/editor/$documentId"`), `staticData` for per-route layout hints (`hideNavOnPhone`).
2. **History is chosen at runtime** (`src/lib/history.ts`): memory history when `isTauri()`, browser history otherwise. The native app never touches WebView URLs; the web build gets real URLs and the browser's back button.
3. **Android back button** is wired to the router history (`src/lib/androidBack.ts`).
4. **Zustand** for client state: small stores, selector subscriptions, no provider tree. Persisted preferences use `persist` with a never-throwing storage (`safeStorage.ts`); domain data is *not* persisted by the store but by `src/lib/db/sync.ts` (ADR 0003).

## Alternatives Rejected

- **File-based routing:** needs a plugin and generated files; the route table is small and explicit routes are easier to read.
- **React Router:** weaker type safety for params and search.
- **Redux / Context:** more boilerplate / re-render cost for no gain here.

## Consequences

- Positive: typed navigation, a single route table, the same code in app and browser.
- Trade-offs: with memory history the app has no deep links yet (a native deep-link plugin would be a new ADR); open dialogs and drawers are not in the history, so Android back does not close them until an overlay stack exists (see todo).
