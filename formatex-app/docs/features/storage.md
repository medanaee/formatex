# Feature: Storage

Decision record: [ADR 0003](../decisions/0003-storage-and-database-architecture.md). Code: [`src/lib/db/`](../../src/lib/db).

## Layout

```
SQLite formatex.db  (app config directory)
├── meta       key TEXT PK, value TEXT          schema_version, future flags
└── documents  id PK, title, main_file, created_at, updated_at   index on updated_at   (`source` of migration 1 is unused)
Files $APPDATA/documents/<id>/   the project: config.toml, main.md, images/, ...   (ProjectFs, read by the compiler too)
      $APPDATA/fonts/            fonts the user imported
localStorage formatex_app_settings  (theme, language, sidebar)
```

## Where a project keeps its files (desktop)

A project is in the app's storage (`$APPDATA/documents/<id>/`, the default) or in a folder of the user (`documents.location`, an absolute path; migration 4). Decision: [ADR 0010](../decisions/0010-project-in-a-user-folder.md).

- **Folder mode:** the folder is opened like a VS Code workspace. Paths are relative to it; the project's own files live in `<folder>/.formatex/` (`config.toml`, which holds `source`, the main file). `.formatex` and its `config.toml` are shown in the file tree like any file (not deletable or renamable); clicking `.formatex/config.toml` opens the project's settings as `config.toml` (`FolderProjectFs` also lists a hidden alias entry `config.toml` for the editor). `.git` and `node_modules` are not listed.
- **Access:** `openProjectFs(id)` calls the Rust command `project_set_root` (it registers the folder for the native compiler and adds it to the file plugin's scope for this run). If the folder is gone, the editor shows a screen with "choose the folder again" / "remove from the library".
- **Creating:** the new-project dialog has *In the app / In a folder*. A folder that already has `.formatex/config.toml` is opened as it is; any other folder gets one (defaults, `source` = the Markdown file you pick, or a new `main.md`). Your own files are never changed.
- **Moving (File menu):** *Move to a folder…* copies the files in (files already there: replace / skip / keep both; `config.toml` goes to `.formatex/`), then deletes the app's copy. *Move to the app's storage…* copies the files you tick (and always `config.toml`; `source` is emptied if its file is not copied) and leaves the folder as it is. The pure planning is in `lib/projects/storagePlan.ts`.
- A duplicate of a folder project is always a project in the app. Web and Android do not offer folders yet.

## Flow

1. `main.tsx` renders `<StorageBoot>`, which calls `startPersistence()`.
2. `startPersistence()` → `openStorage()` (SQLite in Tauri, `WebRepository` otherwise; one shared open even under StrictMode) → `repo.loadDocuments()` → `useLibraryStore.hydrate()` → subscribe.
3. A component calls a store action (`createDocument`, `renameDocument`, `setMainFile`, ...). The store changes synchronously.
4. `sync.ts` sees `documents` change, diffs by object reference and schedules `saveDocument` / `deleteDocument` on the `WriteQueue` (500 ms debounce for saves).
5. The queue runs writes one at a time; `flushPersistence()` runs everything now (on `visibilitychange: hidden` and `pagehide`).
6. If opening fails, `StorageBoot` shows the error with **Try again** instead of an empty library.

## Adding data

1. Add a **new migration** to `MIGRATIONS` in `schema.ts` (never edit an old one).
2. Add the type and the operations to `Repository` (`types.ts`).
3. Implement them in `SqliteRepository` **and** `WebRepository`.
4. Add the store and hook it into `sync.ts` (or write through `repo` directly for rare writes).
5. Test with `createMemoryDriver()` (real SQLite) like `sqliteRepository.test.ts`.

## Behavior per form factor

Storage is identical on phone, tablet and desktop. Android keeps the database in the app's private storage; keep large exports as files, not rows.

## Known limits

- The web backend is localStorage (a few MB). Replace with SQLite-WASM on OPFS before the web release.
- A document is one `source` text; multi-file projects need a new schema (ADR).
