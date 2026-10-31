# ADR 0010: A project can live in a folder of the user

## Status

Accepted.

## Context

Every project lived in the app's data directory. Users want to keep a document next to their other files (a git repository, a synced folder) and work in it like in a code editor.

## Decision

- `documents.location` (nullable absolute path) says where a project's files are; `NULL` keeps the old behaviour.
- A folder project keeps its own files in `<folder>/.formatex/` (`config.toml`); the compiler reads `config.toml` from there when `.formatex/config.toml` exists. Paths in the document are relative to the opened folder.
- `ProjectFs` has one more implementation (`FolderProjectFs` over `TauriProjectFs` with an absolute root), so the editor, the file tree and the settings stay unchanged.
- The compiler learns the folder through `project_set_root(project_id, root)`, which also opens the folder in the fs plugin's scope for the session; nothing outside registered folders can be compiled.
- Moving between the modes copies first and deletes the old copy only after every file was copied.
- Desktop only for now: Android (SAF) and the web (File System Access API) need other file layers.

## Consequences

The editor does not watch the folder for changes made outside the app. The `.formatex` folder is shown in the file tree (it is the user's folder), but cannot be renamed or deleted from there.
