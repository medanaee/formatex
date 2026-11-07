# Feature: project kinds (Formatex and Raw Typst)

A project is one of two kinds, chosen when it is made and changeable later (`DocumentItem.kind`, column `kind` of `documents`, migration 5; a project without one is Formatex).

| | Formatex | Raw Typst |
|---|---|---|
| What compiles it | the engine (`main.typ` + `sys.inputs.source`), the component library, `config.toml` | the Typst compiler alone: the main file is the entry, no engine, no `sys.inputs`, no `config.toml` read |
| The main file | the `source` of `config.toml` (a Markdown file) | a `.typ` file the app keeps in its library (`mainFile`; `""` is none, which is fine: the preview says to choose one) |
| First files (app storage) | `config.toml`, `main.md` | `main.typ` (imports the template and sets it) and `template.typ` (an empty `template(doc)`) |
| First files (a folder of the user's) | `.formatex/config.toml` (and `main.md` when new) | none |
| Editor | Markdown tools, tag palette, outline, settings panel | the file tree only; `.md` and `config.toml` are plain text; the gear chooses the main file |

## Where it lives

- Create: [`NewProjectDialog`](../../src/components/library/NewProjectDialog.tsx): name, two cards for the kind, two for the storage, and for a folder the main file (a Typst file or none for Raw Typst). `LibraryPage.createProject` makes the files.
- Change: the project's menu in the library (`kind.toTypst` / `kind.toFormatex`) and **File > Project type** in the editor. Both call `changeProjectKind` ([`projectKind.ts`](../../src/lib/projects/projectKind.ts)): going to Raw Typst touches no file (the Markdown files and `config.toml` stay, no main file is chosen); going to Formatex makes only what is missing (`config.toml`, `main.md`) and keeps what is there, so the main file is the `source` the existing config names.
- Compile: the commands `compile_project`, `project_preview` and `export_pdf` take `kind`; `compile_as(..., plain)` in `compile.rs` builds `ProjectWorld::plain`, whose loader serves only the editor's unsaved texts, the project's files and the packages.
- Editor state: `useEditorStore.kind`; `resolveMain` reads the library for Raw Typst; `setMainFile` keeps it there; `switchKind` changes the kind and opens the project again.

## Typst tools in the editor (plain Typst projects)

`src-tauri/src/ide.rs` runs `typst-ide` (the code behind the Typst web app and tinymist) on the project's world, with the editor's unsaved texts, so it sees what the build sees:

- **Completions** while typing, and on Ctrl+Space: functions and their arguments, variables defined in the file, imports, packages, labels, paths of project files. `typstCompletionSource` in [`typstIde.ts`](../../src/lib/editor/typstIde.ts); command `typst_complete`. Positions are UTF-16 in the editor and bytes in Typst; `ide.rs` converts.
- **Click in the preview to the text**: `typst_jump_from_click` looks the point up in the last build that worked (kept per project by `compile_as`) and answers a place in a file (also in an imported one); a click on blank paper finds nothing.
- **Text to the preview**: `typst_jump_to_cursor`. It serves "Go to here in preview" in the editor's right-click menu and **follow typing** (`followTyping.ts`, which waits for the build and then scrolls the preview).

Markdown projects keep the engine's block markers for this; the two do not mix.

## Not done

- ZIP: the manifest (`formatex-project.json`) carries `kind`; an import makes a project of that kind (a zip with no manifest that holds Typst and no Markdown is plain Typst; any other is Formatex). A plain Typst import keeps every name (no engine names are reserved) and writes no `config.toml`.
- Tooltips (the docs of a function under the cursor) and go to definition: `typst-ide` has both, nothing uses them yet.
- Completions of `@preview` package names (`IdeWorld::packages`) are not given.
- Try it in the desktop app: the new dialog on a phone, a folder of `.typ` files, switching in both directions.
