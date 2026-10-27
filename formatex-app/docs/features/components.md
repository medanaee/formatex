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

Also allowed: `<name>-rules(doc)` (show rules for the whole document; order with `// rules-order: N`) and `<name>-scope` (names for the Markdown scope). Schema entries: `kind`, `description`, `attrs` (`type`: enum, color, string, number, length, path, bool, int, id; `values`, `default`, `required`, `doc`), `children`, `scoped`. See the built-in components for examples.

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
