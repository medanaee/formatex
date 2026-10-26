# ADR 0003: Storage (SQLite behind a Repository, files for binaries)

- **Status:** Accepted
- **Date:** October 2026

## Context

Documents, settings-like metadata and (later) user-defined tags must survive restarts and updates, on desktop and Android now and on the web later. localStorage alone is small (a few MB), can be evicted by the OS on mobile, and cannot hold binaries.

## Decision

1. **SQLite through `tauri-plugin-sql`** for structured data; file `formatex.db` in the app config directory, WAL mode, `busy_timeout`.
2. **A `Repository` interface** (`src/lib/db/types.ts`) with domain operations. Two backends: `SqliteRepository` (app) and `WebRepository` (localStorage, for `vite dev`, UI tests and the web build until it gets a real store). UI never writes SQL.
3. **Numbered, append-only migrations** (`src/lib/db/schema.ts`), idempotent statements, version in `meta.schema_version`, refuse a database newer than the app.
4. **Single-statement writes.** The SQL plugin has no reliable cross-call transactions.
5. **Binaries are files**, not BLOBs: `FileStore` over `tauri-plugin-fs` under `$APPDATA`, scoped by capability to `documents/` and `fonts/`. BLOBs would travel as JSON through the plugin's IPC.
6. **Stores stay in memory; `sync.ts` persists them**: a reference diff between store states, a coalescing, serial `WriteQueue` (latest write per key wins, a delete replaces a pending save), a debounce for typing, flush when the app is hidden.
7. **Tests run the real SQL** against `node:sqlite` in memory.

## Alternatives Rejected

- A custom Rust `rusqlite` command layer: more native code and permission plumbing for the same result.
- IndexedDB everywhere: no SQL, awkward to share logic with the native path.
- One row per keystroke / per edit: unnecessary until history / undo is designed.

## Consequences

- Positive: durable, queryable storage; identical domain code in app and browser; the schema is tested.
- Trade-offs: the web build needs a better backend (SQLite-WASM on OPFS) behind the same interface before it holds real work; a very large document is one row (`source` text), so a future project-folder model (many files per project) would be a new migration plus an ADR.
