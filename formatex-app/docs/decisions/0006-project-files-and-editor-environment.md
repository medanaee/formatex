# ADR 0006: Projects are folders; the editor is a separate environment

- **Status:** Accepted
- **Date:** October 2026

## Context

A document is more than one text: it has a `config.toml`, Markdown files, images, and (later) data files. The user wants an Overleaf-like workspace: a file tree where they create files and upload images, an editor with autocomplete from the engine's schema, a live preview, and PDF export, each project with its own settings.

## Decision

1. **A project is a real folder** `$APPDATA/documents/<id>/` containing `config.toml`, a Markdown file (`main.md` at first), and an `images/` folder. The `documents` table keeps only the library row (title, dates, `main_file`); migration 2 adds `main_file`, and `documents.source` of migration 1 is no longer used.
2. **`ProjectFs`** (`src/lib/projects/types.ts`) is the editor's view of the files: list, read, write, create folder, rename, remove. The app backs it with `tauri-plugin-fs` (the native compiler reads the same files), a browser with localStorage. The capability allows `$APPDATA/documents/**` only.
3. **Project settings are the project's `config.toml`.** A settings dialog edits that very file (the user pastes their own), next to a selector for the main Markdown file. A new project starts from the engine's own `config.toml` with `source = "main.md"`.
4. **The editor is an environment of its own.** Its route sets `staticData.fullscreen`, so the shell shows no navigation around it on any screen; it has its own toolbar (back, title, save state, files, settings, export).
5. **Layout:** on a desktop screen the file tree (at the start edge, the right in Persian), the editor and the preview are side by side; on a tablet or phone the editor and the preview take turns (Edit / Preview) and the files open as a panel.
6. **Autocomplete comes from the engine's schema** (`engine/tags.json`, from the engine's `tools/schema.typ`): tags, attributes, enum values, project files for `path` attributes, closing tags, and the `{...}` option lines. The logic is pure (`src/lib/editor/completion.ts`) and tested; `completionSource.ts` adapts it to CodeMirror 6.
7. **Editing is autosaved** after a 400 ms pause; the preview is rebuilt after each save (serial, latest wins); a failed build keeps the last good pages on screen.

## Alternatives Rejected

- **Files as rows in SQLite:** the native compiler would need a virtual file system; images would be BLOBs. A folder is simpler and inspectable.
- **One big text per document (the earlier `source` column):** cannot hold images or a `config.toml`.
- **A modal editor inside the library shell:** the editor needs the whole screen, especially on a phone.

## Consequences

- A project can be zipped, exported or opened in the `typst` CLI by copying its folder next to the engine.
- Renaming or deleting files goes through the same path rules as the compiler (no `..`, no engine names).
- The web build needs an OPFS-backed `ProjectFs` and a WebAssembly compiler before the editor is useful there.
