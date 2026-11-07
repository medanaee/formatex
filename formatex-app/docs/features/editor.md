# Feature: Editor, Preview and Project Files

Decisions: [ADR 0005](../decisions/0005-native-typst-engine.md) (native Typst), [ADR 0006](../decisions/0006-project-files-and-editor-environment.md) (projects are folders, the editor is its own environment). Code: [`src/components/editor/`](../../src/components/editor), [`useEditorStore`](../../src/stores/useEditorStore.ts), [`src/lib/editor/`](../../src/lib/editor), [`src/lib/projects/`](../../src/lib/projects), [`src-tauri/src/`](../../src-tauri/src).

## What the user gets

- A **separate environment** (`/editor/$documentId`, `fullscreen`): no app navigation, its own toolbar.
- A **file tree** like Overleaf's: folders, create file / folder, rename, delete, upload images and data, mark the main Markdown file (★). It sits at the **start edge** (the right in Persian). Rows can be multi-selected, dragged into folders, copied, cut and pasted, and files can be dropped from the computer (see below).
- A **code editor** (CodeMirror 6) for Markdown and TOML with **autocomplete from the engine's schema**, **undo / redo** and a **format bar** above it.
- A **live preview** of the typeset pages (SVG) with a status bar: pages, time, errors and warnings; a click on a problem jumps to its line.
- **Project settings**: the project's `config.toml` (the user pastes or edits their own). The gear in the toolbar and File > Settings open it in the editor like any file (the visual settings panel, or the source): there is no settings dialog. The main file is chosen with the star menu of the file tree or the `source` key. **The main file is the `source` of that file**, as it is for the engine on the command line: no file has a special name (`main.md` is only what a new project starts with), the star in the file tree marks the file `source` names, and "Set as main file" writes it there. A missing `source`, or one that names a file not in the project, is an error on that line of `config.toml` (the preview keeps its last pages and nothing falls back to another file). `src/lib/projects/configSource.ts` reads and writes the line; renaming or moving the main file rewrites it; a ZIP whose config names no `source` gets the one it was exported with.
- **Export PDF** through the native Save dialog.

## Layout

On a desktop-width window the three panels are separated by **drag handles** and the side panel has **Files / Tags** tabs; the editor also has a **Visual** view. See [visual-editor.md](visual-editor.md).

### Desktop (≥ 1024 px)
Side panel (Files / Tags tabs) · editor · preview, side by side, with resizable handles. The side panel can be hidden with the files button.

### Tablet (640–1023 px)
One pane at a time: **Edit / Preview** switch in the toolbar. The files button opens the tree as a side panel at the start edge.

### Phone (< 640 px)
Same as tablet. The toolbar keeps icons only; the export button loses its label. Dialogs are bottom sheets.

## Toolbar (one row, `h-11`)
Back · title (editable) · save state icon · [Edit / Preview on narrow screens] · files · settings · **Export PDF** (the one filled button).

## Format bar and undo / redo

One slim bar (`h-10`, scrolls sideways on a narrow screen) above the editor. For every text file: **Undo** and **Redo** (disabled when there is nothing to do; each file keeps its own history while it is open; Ctrl / ⌘ + Z and Y or Shift + Z work as usual). For Markdown also:

| Tool | Does | Shortcut |
| :--- | :--- | :--- |
| Bold, Italic, Strikethrough, Code | Wrap the selection (or the word at the cursor); applying it again takes the marks off | Ctrl / ⌘ + B, I |
| Heading ▾ | Heading 1–4 or a plain paragraph on the current lines; another level replaces the first | |
| Bulleted / numbered list, Quote | Toggle the prefix on every selected line | |
| Link | `[text](https://)` with the cursor in the address | |
| Table | Rows × columns popover; inserts a Markdown table with a header | |
| Code block | A fenced block around the selection | |
| Insert tag | Types `<` and opens the tag suggestions | |

The commands are pure functions on the editor view ([`format.ts`](../../src/lib/editor/format.ts), tested in `format.test.ts`). On a phone the bar sits above the editor in the Edit tab.

## File tree: selection, drag and drop, clipboard

- **Save** (the row menu and the right-click menu): a file is saved as it is, a folder (or several rows) as a ZIP that keeps the folder names, with the Save dialog (`saveEntries.ts`; the text being typed counts, not only what is on the disk).
- **Show in File Explorer** (a project kept in a folder, desktop app): on a row it shows that file or folder in the system's file manager; the empty part of the tree shows the project's folder.
- **Select:** click opens a file (or folds a folder); **Ctrl / ⌘ + click** adds or removes a row; **Shift + click** selects the range from the last clicked row; **Ctrl + A** selects all; **Esc** or a click on empty space clears.
- **Move:** drag rows onto a folder (or onto empty space for the root). Dragging a selected row drags the whole selection. Hold **Ctrl / Alt** to copy instead. A name that exists in the target gets ` 2`, ` 3`, ... A folder cannot go into itself, and engine names cannot be created at the root.
- **From the computer:** drop files **and folders** on a folder or on the tree; they are added there, a folder with everything in it (`.git`, `node_modules` and system files are left out, at most 5000 files; `readDropped` in `droppedFiles.ts`). A name that exists gets ` 2`, and the engine's own names at the top of a Formatex project are never taken. (`dragDropEnabled` is off in `tauri.conf.json`, so the window passes ordinary HTML5 drops to the page; with it on, WebView2 blocks drags inside the page.)
- **Clipboard:** **Ctrl / ⌘ + C / X / V** copy, cut and paste (into the selected folder, or the folder of the selected file). Cut rows are dimmed until pasted. The `⋯` menu of a row has Copy, Cut and Paste for touch screens.
- **New file, new folder and rename are typed in the tree itself**, as in VS Code: a row with a text field opens (under its folder; the folder opens for it), **Enter** keeps the name (a new file with no extension becomes `.md`), **Escape** drops it, leaving the field with a good name keeps it and a name that cannot be used is shown in red under the field. The field is `InlineName` in `FileTree.tsx`. A menu that started it gives the focus back to its button as it closes, so the field takes the focus again for its first 400 ms.
- **Switching a value that is already written**: when the cursor goes into the value of an attribute of a known tag (`kind="la|tte"`, by a click or a key along the line), the list opens with every value the attribute takes, the one written now first; a choice replaces the whole value, quotes kept. Typing there still filters. Up / Down belong to the list while it is open, so a move to another line by key does not open it. `completeValue` in `completion.ts`; `CodeEditor.tsx` opens the list.
- **A project in a folder of the user's is live**: the native app watches the folder while the project is open (`src-tauri/src/watcher.rs`, the `notify` crate; `.git` and `node_modules` are left out) and sends `project-changed` with the paths that changed and whether the list of files did, after a quiet moment of 200 ms. `onExternal` in `useEditorStore` reads the list of files again when it changed; an open file takes the text on disk, unless that is only what the editor wrote itself (`written`) or equal to what it shows; when the editor has typing waiting to be saved, a bar over the editor asks "load the new one / keep mine" (`conflicts`, `resolveConflict`); a file the document may use changed (an image, an included chapter, a `.typ`) builds the preview again; an open file that was removed is closed. A project in the app's own storage is not watched (only the app writes there). Safeguards: the editor's own writes are known from the moment they start (`writing`, `written`), because a write is several events on disk, the first of them with the file empty or half written; a text on disk is taken only when two reads a moment apart agree (`stableRead`), else it is looked at again when quiet; the bar of a conflict says how many lines each side has and warns when the file on disk is empty; and a text from disk that is empty or less than half as long (`shrankSuspiciously`) replaces the editor's only with a bar that puts the editor's text back (`replaced`, `restoreReplaced`), so loading from disk is never a loss.
- **Tags fold** in a Markdown file, as blocks do in a code editor: a tag alone on its line (`<alert type="info">`) has a marker beside it that hides the lines down to the line before its closing tag, which stays visible; tags of the same name inside are counted, so the right closing tag is found. Fenced code blocks, headings and lists fold through the Markdown language. Keys: Ctrl+Shift+[ fold, Ctrl+Shift+] unfold, Ctrl+Alt+[ and ] all of them (`tagFolding.ts`).
- **A bracket or a quote typed over a selection goes around it** instead of replacing it, as in VS Code: `(` `[` `{` `"` `'` `` ` `` and `$`; the text stays selected, so a second mark wraps it again; every cursor of a multi-selection does it (`surround.ts`, all file kinds).
- **Delete** removes the selection after a confirmation (the main file and `config.toml` are never removed); **F2** renames the selected row.
- Open files follow their moves: a moved or renamed file keeps its editor buffer, and, for the main file, the `source` in `config.toml` is updated.

Phone and tablet have no modifier keys: use the `⋯` menu (copy, cut, paste, rename, delete) and the buttons; multi-select with keyboard and mouse is a desktop feature.

## Autocomplete

Source of truth: the schema of the enabled components. It starts as `engine/tags.json` (`tags` and `options`, from `npm run engine:sync`) and, in the app, is replaced by `engine_schema` (computed from the component library), so **tags of the user's own components are completed too** ([features/components.md](components.md)). Pure logic in [`completion.ts`](../../src/lib/editor/completion.ts), tested in `completion.test.ts`; [`completionSource.ts`](../../src/lib/editor/completionSource.ts) adapts it to CodeMirror (snippets, boosts).

| Typed | Suggested |
| :--- | :--- |
| `<` + letters | Tags that fit where the cursor is. A `scoped` tag (`<item>`, `<step>`, `<pros>`, ...) is offered only directly inside its parent. Inside a tag that takes **only its own child tags** (every child is scoped: `<steps>`, `<grid>`, `<compare>`, `<diff>`, `<chat>`, `<docheader>`) only those children are offered. Inside tags whose children are ordinary tags too (`<fig>`, `<exercise>`) everything else is still offered, children first. Inserting writes the closing tag and the required attributes (`<img src="">`). |
| `<tag ` + letters | Attributes not yet used; required ones first; type shown as the detail, the doc as the description. |
| `<tag attr="` | Values of an `enum` / `bool` attribute; the **project's files** for a `path` attribute (images first for `<img>`); the default value otherwise. |
| `</` | The tags still open, innermost first. |
| `{` on a heading, table, list, equation or span | The engine's `{...}` options (`{width=full caption="..."}`), with their values. |

It is silent in front matter, fenced code and inline code. Descriptions follow the interface language (`en` / `fa`).

## Variables and code

The engine reads `vars` (values) and `var-types` (rules) from the front matter or `config.toml`, and `{{ code }}` in the text and in attribute values: Typst that sees the variables, with Markdown in its `[ ... ]` (`formatex-typ/src/lib/vars.typ`, `expr.typ`, `src/preprocess/evaluate.typ`; docs in `doc_en.md`, "Variables and code"). The app adds:

- **Colors.** [`variableMarks.ts`](../../src/lib/editor/variableMarks.ts), from the pure scanner `variableSyntax.ts` (a `{{ }}` may take several lines and hold `[ ... ]` texts of Markdown with `{{ }}` of their own), colors a printed name (`--syntax-var`, teal), code (`--syntax-cond`, magenta; the Markdown inside its brackets keeps the colors of Markdown) and the values of the page `PAGE`, `PAGES`, `SECTION`, `SECTION_NUMBER` (`--syntax-page`, amber). Inside an attribute value they also get a soft background, and code an outline, so a conditional property shows in a long tag. Code, math, comments and `\{{` are skipped (`maskText`).
- **Folding.** A `{{` that closes on a later line folds up to the line of its `}}` (`expressionFold`, with the tag folding).
- **Autocomplete.** In the code of a `{{ }}` (over several lines; not inside a `[ ]` text, where tags complete as usual): the variables of the document (`variables.ts` reads `vars` and `var-types`), the cover keys, the values of the page, every setting as `setting.theme` / `setting.chat.frame` (from the settings schema), and the keywords; after `==` / `!=` the values the variable lists in `var-types`, quoted.
- **Settings screen.** A *Variables* section beside *Components* (`VariablesSection.tsx`, config.toml and front matter): the value of each variable with a control of its kind (menu for a list, switch, number, data file, text), a popover for its rule (type, values it may have, range of a number) that writes `var-types`, add and remove. A value that is more than one line (a list, a table) is shown and not rewritten.
- **Tag popover.** Every attribute has an `fx` button: it turns the fixed value into `{{ if var { 'value' } else { 'value' } }}` (the first variable of the document) shown in the code color, and back to the first value.

## Settings gears, paragraphs and wrapping in the visual view

- **The gear is always there** (quiet until the line is looked at) on headings, every list (bulleted, numbered, and numbered with Persian or Arabic digits such as `۱.`, which the Markdown parser does not know as a list but the engine does), display equations (`$$ ... $$ {#id}`), code blocks and tables, whether or not they have settings yet. A plain paragraph's gear shows when its line is hovered.
- **Paragraphs:** the gear of a paragraph that is not in a `<p>` opens the `<p>` settings (font, size, weight, color, alignment, spacing, direction). The first change wraps the paragraph: `<p size="16pt">`, a blank line, the text, a blank line, `</p>`. A paragraph already in a `<p>` has the gear of that tag's chip.
- **Wrapping a selection in a tag** (`tagWrap.ts`): with text selected, typing `<` writes `<>text</>` with the cursor in the name (a selection over several lines puts the tags on lines of their own). What is typed in the opening name goes into the closing one; a space, `>`, Tab, Enter or Escape leaves the name. Tag completion works in the name as usual. Markdown files only.
- **Comments:** a `<!-- -->` ends at the first `-->`, except inside a fenced block that stands in the comment (a mermaid arrow `A --> B` is code, not the end). The engine (`strip-comments`, `blank-comments`) and the editor (`blankComments`) use the same rule.

## Indent guides

A thin vertical line stands behind every level of indentation, in every file (Markdown lists, TOML, Typst), as in VS Code (`indentGuides.ts`). A line that wraps gets them on its first row only (`1lh` high): the rows below start at the edge, so a guide there would cross the text. A level is the editor's indent unit (two spaces; a tab counts as the tab size). A blank line between two indented lines carries the lines on. Persian lines draw them from the right. They are line backgrounds in `ch`, so they need the editor's monospace font.

## Settings the document overrides

The engine merges the front matter of the document over `config.toml` (`merge-config`), so a key set in both is read from the document and a change in `config.toml` does nothing. Both places where `config.toml` is edited say so for the **main file's** front matter: a blue info icon (`text-info`) in front of the key in the visual editor (`ConfigPanel`, via `SettingsForm`'s `overrides` prop) and in the gutter of the code editor (`overrideGutter.ts`). A mouse resting on the icon, or a tap, opens a popover that says the document sets the setting too, shows the document's value and jumps to its front-matter line. Keys are compared by dotted path (`heading.color`, `themes.ocean.bg`); a value set on a parent (`list: ...`) covers everything below it, while a block (`header:`) covers only the keys it lists. It follows both files live and does nothing for a missing or broken front matter. The logic is pure ([`overrides.ts`](../../src/lib/editor/overrides.ts), 9 tests). The file being edited is not compared (it is `config.toml` itself).

## Autocomplete for `config.toml` and the front matter

The settings files have their own schema, defined **in the engine next to the option schema**: [`src/lib/config-schema.typ`](../../../src/lib/config-schema.typ) (the `formatex` repository, one folder up). It has the same entry shape as a tag's attributes (`type`, `values`, `default`, `doc: (en, fa)`) and is exported by `tools/schema.typ` as `config` in `engine/tags.json`, so it reaches the app through `npm run engine:sync` and, in the app, through `engine_schema` like every other schema. Nothing in the editor lists a setting by hand: add or change a key in that file and the suggestions follow.

Two schemas come from it: `config` (config.toml: every document) and `front-matter` (one document, which can override anything in config.toml and also holds the header, footer, cover and bibliography). Keys that mean the same in both are written once.

| In | Typed | Suggested |
| :--- | :--- | :--- |
| `config.toml` | `[` | The tables: `font`, `paragraph`, `heading`, `table`, `list`, `chat`, `equation` |
| `config.toml` | a line start | The keys of the current table (or the top-level keys before any table), minus those already written there |
| `config.toml` | `key = ` | An enum's values (quoted for you, closing quote added only when missing), `true` / `false`, a suggested value or the default |
| front matter | a line start | The settings and the blocks (`header:`, `footer:`, `cover:`, `bibliography:`, ...) at the top level; the keys of a block when indented under it, minus those already there |
| front matter | `key: ` | The values of that key, by its schema |

It is silent in comments and outside the `---` block (the rest of the file uses the tag autocomplete). The logic is pure ([`configCompletion.ts`](../../src/lib/editor/configCompletion.ts), 18 tests) and the `config.toml` code editor uses it too.

The engine's code does not read this schema: it documents the settings. When the engine gains or changes a setting, update `config-schema.typ` in the same change.

## Text direction and font of the editor

- **Direction button** in the format bar (after undo / redo): cycles **A** (automatic: every line follows its own first letter, so Persian and English lines both read correctly), **RTL** and **LTR** (the whole editor, gutter included, is forced to that direction). Remembered; applies to every text file.
- **Font:** a monospace Latin font first (`ui-monospace`, Cascadia Mono, Menlo, Consolas), then **Vazir Code** (bundled, public domain; [`src/assets/fonts`](../../src/assets/fonts)). The browser takes each character from the first font that has its glyph, so Latin comes from the monospace font and Persian (and any other character it lacks) from Vazir Code.

## Source to preview

Decision: [ADR 0008](../decisions/0008-source-to-preview-mapping.md). Logic: [`previewLookup.ts`](../../src/lib/editor/previewLookup.ts) (`previewPlaceOf`, tested), [`followTyping.ts`](../../src/lib/editor/followTyping.ts), [`usePreviewScrollStore`](../../src/stores/usePreviewScrollStore.ts).

- **Follow typing:** once the pages rebuilt after an edit arrive, the preview scrolls to the cursor's line (unless that is already in the middle part of the pane). It does not move while a build runs. Scrolling the preview by hand (wheel, touch, scrollbar) pauses it for 4 seconds. The locate button in the preview bar turns it off and on (remembered; on by default). It works for Markdown files, including files brought in with `<include>`.
- **Go to here in preview** (last item of a Markdown file's right-click menu): scrolls the preview to the place of the press and marks the line for a moment. It brings the preview up first when it is hidden (a hidden panel on desktop, the Preview tab on a narrow screen). Disabled while there are no pages.
- **Exact to the block:** the engine marks the start of every block of the source (`--input markers=1`, set by the preview only) and the compiler reports where each marker landed ([ADR 0009](../decisions/0009-exact-source-mapping.md)). A source line goes to the marker above it, a click on the preview to the marker above the click, so identical paragraphs and `<include>`d files are told apart; a click opens the right file. Inside the block the text search finds the row and, for a click, the word (the cursor goes to the start of the clicked word, even in a long paragraph that is one line of the source). Logic: [`markerLookup.ts`](../../src/lib/editor/markerLookup.ts) (tested), with [`previewLookup.ts`](../../src/lib/editor/previewLookup.ts) and [`sourceLookup.ts`](../../src/lib/editor/sourceLookup.ts) as the search; with no markers the search over the whole document answers (ADR 0008).

## Saving and compiling

1. Typing updates the store at once; a **400 ms pause** writes the file (`ProjectFs.writeText`).
2. After a save the project is compiled (`compile_project`). Compilations are serial and latest-wins: a change made while one runs triggers exactly one more.
3. A successful build replaces the pages. A failed build **keeps the last good pages** (dimmed) and lists the errors.
4. Export saves pending edits first, then `export_pdf`, then asks where to save (desktop and Android: native dialog; browser: download).

## Files and names

- Paths are project-relative with `/`. Names cannot contain `\ / : * ? " < > |`, cannot end with `.`, are at most 120 characters, and cannot be `main.typ`, `src`, `components` or `code-dark.tmTheme` at the top level (they belong to the engine).
- A new file without an extension becomes `.md`. An uploaded file whose name exists gets ` 2`, ` 3`, ... before the extension.
- The main file and `config.toml` cannot be deleted from the tree.

## Behavior without the app

In a browser there is no compiler: the preview says so, and the files live in localStorage. The editor, autocomplete and file tree still work, which is what the browser build is for during development.
