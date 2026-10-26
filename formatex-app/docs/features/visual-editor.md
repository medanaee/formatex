# Feature: Visual Editor, Tag Palette and Resizable Panels

Code: [`livePreview.ts`](../../src/lib/editor/livePreview.ts), [`OptionsPopover.tsx`](../../src/components/editor/OptionsPopover.tsx), [`TagPalette.tsx`](../../src/components/editor/TagPalette.tsx), [`EditorSidebar.tsx`](../../src/components/editor/EditorSidebar.tsx), [`resize-handle.tsx`](../../src/components/ui/resize-handle.tsx). Related: [editor](editor.md), [components](components.md).

## Visual view (live preview)

A **Source / Visual** switch at the end of the format bar (Markdown files only; the choice is remembered). The file is still plain text: Markdown with the engine's tags. The visual view only *draws* it, like Obsidian's live preview. **It is not MDX**: the engine reads Markdown and HTML-like tags, so the text never changes format, and the preview, export and every other tool keep working on the same source.

A line you are not on is drawn like the result; the line the cursor is on (or a selection) shows its source so you can edit it.

| Source | Drawn as |
| :--- | :--- |
| `## Title {#id fill=true}` | Sized heading, `##` hidden, the `{...}` as a small chip (a gear appears on hover when there is none) |
| `**bold**`, `*italic*`, `~~x~~`, `` `code` `` | Styled text without the marks |
| a Markdown link | The text as a link |
| `- item`, `> quote`, fenced code | Bullet, quote bar, shaded block |
| `$x^2$`, `$$ ... $$` | Typeset by **KaTeX** (the engine reads the same LaTeX) |
| a Markdown table (with its `{...}` line above) | A real table, with a gear for its settings |
| `<alert type="tip">...</alert>` | A chip (icon, name, main attributes, gear) and a tinted block with a coloured edge for what is inside; the closing tag is hidden |
| front matter | Muted source |

Clicking a chip, a table or a formula puts the cursor in it (showing the source). Nothing in the visual view changes the text unless you edit or use a gear.

A failure in the decorations never breaks editing: the layer catches its own errors and falls back to plain text.

## The settings popover

The gear on a tag, a heading or a table opens a popover whose **form is generated from the engine's schema** (so a user's own component gets one too):

- **enum** → a list; **bool** → true / false; **path** → the project's files (images first); **color, number, length, string, id** → a text field. A list's first entry clears the attribute (it shows the default when the schema has one).
- Required attributes come first and are marked; hovering a label shows the attribute's documentation.
- Attributes the schema does not know are kept and shown as text fields.
- **Every change is written into the source at once** (and the popover follows its own edits): a tag's opening tag is rewritten; a heading's ` {...}` is added, changed or removed; a table's `{...}` line above it is added, changed or removed.

Tags use quoted values (`type="tip"`), option lines use the engine's brace syntax (`{width=full caption="Two words" #id}`; the id is written `#id`). Reading and writing both live in [`tagSyntax.ts`](../../src/lib/editor/tagSyntax.ts) and [`applyOptions.ts`](../../src/lib/editor/applyOptions.ts) (tested).

## Side panel with tabs: Files | Tags

The panel at the start edge has a tab bar. **Files** is the project's file tree ([editor](editor.md)). **Tags** is the palette: a search box and a grid of tiles, an **icon with the name below**, for every tag of the engine and of the user's components. Tags that only make sense inside another (`<item>`, `<step>`, `<pros>`) are not tiles: they are offered inside their parent.

- **Drag a tile** into the text (source or visual view): the tag is written where you drop it. Block tags start on their own line, with the content between the opening and closing tag; required attributes become places to type.
- **Click or tap a tile** writes the tag at the cursor (the phone closes the panel).
- Tiles follow the component library: a new custom tag gets a tile (with a generic icon until one is mapped in [`tagIcons.ts`](../../src/lib/editor/tagIcons.ts)).

## Resizable panels

On a desktop-width window the side panel, the editor and the preview are separated by **drag handles**. Drag with the mouse (or a finger), or focus a handle and use the **arrow keys**. The side panel grows from the start edge (160–480 px), the preview from the end edge (20–70 % of the row); both work in right-to-left and left-to-right. The sizes are remembered.

### Phone / tablet / desktop
- **Desktop:** three panels with handles, tabs on the side panel, the Source / Visual switch in the format bar.
- **Tablet and phone:** Edit and Preview take turns, so there is nothing to resize; the side panel opens as a sheet with the same Files / Tags tabs; the Source / Visual switch is in the format bar (it scrolls sideways). Tapping a tile inserts it (no dragging).

## Limits (first version)

- Settings gears: tags, headings and tables. The `{...}` lines of lists, equations and inline spans are shown as source.
- Images are shown as source (an image tag in Markdown) in the visual view; the preview pane shows the real result.
- Tag chips are inline: a tag split over several lines is drawn as one chip; very large documents re-draw the whole view on each change.
