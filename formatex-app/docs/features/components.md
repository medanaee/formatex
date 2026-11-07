# Feature: Components (user-defined tags)

Decision: [ADR 0007](../decisions/0007-component-library.md). Code: [`ComponentsPage`](../../src/routes/ComponentsPage.tsx), [`useComponentsStore`](../../src/stores/useComponentsStore.ts), [`useSchemaStore`](../../src/stores/useSchemaStore.ts), [`src/lib/components/`](../../src/lib/components), [`components.rs`](../../src-tauri/src/components.rs).

## What a component is

One Typst file, `components/<name>.typ`:

```typst
#import "/src/kit.typ": *       // everything a component needs: the template, the helpers, the packages

#let shout-tags = (                 // the code of each tag
  shout: (attrs, body) => text(weight: "bold", body),
)

#let shout-schema = (               // what autocomplete knows about it
  "shout": (
    kind: "inline",                 // inline | block | void
    description: (en: "Loud text", fa: "متن بلند"),
    attrs: (
      "size": (type: "length", default: "1em", doc: (en: "Text size", fa: "اندازهٔ متن")),
    ),
  ),
)
```

Also allowed: `<name>-docs = (en: (about: "..."), fa: (about: "..."), example: (en: "...", fa: "..."))`: what the tag is for (Markdown, both languages) and an example. The [Skill](skill.md) page builds a file for AI agents from it and from the schema; a component without it is described from its schema alone. The new-component template writes a starter.

Also allowed: `<name>-rules(doc)` (show rules for the whole document; order with `// rules-order: N`) and `<name>-scope` (names for the Markdown scope). Schema entries: `kind`, `description`, `attrs` (`type`: enum, color, string, number, length, path, bool, int, id; `values`, `default`, `required`, `doc`), `children`, `scoped`. See the built-in components for examples.

## Components of one project

Besides the library, a project can list Typst files of its own in the `components` setting (config.toml, or the front matter of a document; the two lists are added). A file is any `.typ` file of the project (not under `main.typ`, `src/`, `components/`, `tools/`), may define any number of unrelated tags and its name means nothing; `<x>-schema` and `<x>-docs` are optional (a schema gives autocomplete and attribute checks). The engine loads them (`formatex-typ/src/lib/local-components.typ`: a computed `import` and `dictionary(module)`), so the project also compiles with plain `typst compile`.

In the app:

- `project_schema` (`components.rs`, `schema_in`) compiles `tools/schema.typ` in the project's world, with the unsaved texts, so autocomplete knows the tags of the listed files that have a schema. `useEditorStore` asks for it after a compile when `config.toml`, the front matter or an open `.typ` file changed (and only while something sets `components`); `useSchemaStore` keeps `base` (the library) and `project`, and `schema` is the project's when there is one.
- An error raised inside a component file about a tag of the document is shown **twice** (`convert_all` in `compile.rs`): at the line of the tag in the Markdown file and at the line of the code in the component file. A listed file that does not exist is reported on `config.toml`.
- The visual settings of `config.toml` and of the front matter have a **Components** section of their own (`ComponentsSection` in `SettingsForm.tsx`, the list logic in `src/lib/editor/componentList.ts`): the listed files with the tags each gives (from the schema), a button to take one out, a menu of the project's other `.typ` files to add, and a warning on a listed file that is not in the project. The list is written on one line (`["a.typ", "b.typ"]`); an array over several lines is shown as it is and not rewritten.
- Not done: a screen that lists every component of the project (library and project) in one place.

## Mistakes inside `<typ>`

`<typ>` sets the code of its block with `eval`, and Typst puts a mistake in evaluated text at the `eval` call (a line of `components/typ.typ`), without the line in the block. `typ_blocks.rs` repairs that when a build fails there: it finds every `<typ>` of the project's Markdown files (not the ones shown inside a fenced code block of the document), builds each alone as `#import "/src/kit.typ": *` plus its code, and the block that fails gives real lines, which become lines of the Markdown file; an import of a file that is not there is told on its import line, and a `<typ src="...">` whose file is not there on its tag. A mistake inside a `src` file is named by Typst with its own file and line.

## The screen

- **List**: search, each component's name and tags, badges (*Custom*, *Modified*, a warning when it is invalid), and an **enable switch**. A disabled component is left out of the registry: its tags stop working everywhere.
- **Editor**: the component's Typst source (autosaved after a pause), save state, the enable switch and a `⋯` menu: **Revert to built-in** (a modified built-in) or **Delete** (a custom component).
- **New component**: a name (lowercase letters, digits, `-`) and a kind; creates a working template and opens it.
- **Problems** under the editor: errors of the last check, each with `components/<name>.typ:line` that jumps there (or to the other component at fault). A banner says when the library does not load.

### Phone / tablet / desktop
Desktop and tablet: list (288 px) beside the editor. Phone: the list, then the editor with a back button; the new-component dialog is a bottom sheet.

## What happens when you save

1. The file is written to `$APPDATA/components/<name>.typ` and the registry is regenerated.
2. The whole library is checked by compiling `tools/schema.typ`; problems are returned with their place.
3. If it loads, the schema is cached and the editor's autocomplete (`useSchemaStore`) is refreshed: **the new tag appears in `<` completion with its attributes and values**.
4. A problem in one component (no `-tags`, a tag declared twice) leaves that component out, with the reason on its row, and the rest keep working.

A mistake inside a tag's function body is not found by the check (nothing calls it yet); it appears as an ordinary problem in the preview when a document uses the tag, and clicking it opens the component.

## Files

- `$APPDATA/components/<name>.typ`: the user's components, and their versions of built-ins.
- `$APPDATA/components/manifest.json`: `disabled` names and the `origins` (`user`, later `store`).

## Browser

Components are kept in localStorage; the registry is not generated and nothing is checked (no compiler), so new tags do not reach autocomplete there.
