# Feature: Skill (a file for AI agents)

Code: [`SkillPage`](../../src/routes/SkillPage.tsx), [`src/lib/skill/generate.ts`](../../src/lib/skill/generate.ts) (the generator, pure and tested), [`src/lib/skill/text.ts`](../../src/lib/skill/text.ts) (the fixed text). The engine's side: every component's `<name>-docs` and the `components` entry of `tags.json` ([the engine's "Extending the template"](../../../formatex-typ/docs/doc_en.md)).

## What it is

The **Skill** destination of the side bar builds **one Markdown file**, `SKILL.md`, that teaches an AI agent (Claude Code, Codex, ...) to write documents for Formatex: what a project is, how to work, the rules that matter, every component with its attributes and an example, the `{...}` option lines, the settings (`config.toml` and front matter), the themes and feels, and a checklist. It is made from the **schema the app already holds** (`useSchemaStore`: the engine's `tags.json`, replaced in the desktop app by `engine_schema`, so **the user's own components are in it**) and the **docs of each component**.

The output is the file and nothing else: front matter (`name`, `description`), then the Markdown. No notes about how it was made.

## The screen

- **Size** (four cards, each with its token count): **Minimal** (the short rules, one line per tag with its attribute names, the keys of the settings), **Compact** (the full rules, each tag's attributes with type, values and default, an example), **Standard** (plus each component's `about`: what it is for and its key rules, and brief notes on the settings), **Full** (plus every attribute described, the `more` notes of the components, full settings tables).
- **Language**: English, Persian, or both (English first). The fixed text follows it; with both it is English.
- **Components**: every component, grouped (document, layout, figures and code, writing, your own), each a check box; *All* / *None*. A skill can stay small by leaving components out. A group `custom` holds components the app does not know by name.
- **Preview** of the file (read-only) with its size, **Copy** and **Download** (`SKILL.md`, through `saveBytes`: the native "Save as" in the app, a download in a browser).

Nothing is stored: the screen starts at Standard, English, all components.

## How it is built (`generateSkill(schema, { level, language, components })`)

`head` (front matter + title) + `intro` (the project, how to work, the rules; shorter at *Minimal*) + `## Components` + `## Option lines` + `## Settings` + `outro` (common mistakes and the checklist; shorter at *Minimal*). Components come in the order of [`GROUPS`](../../src/lib/skill/generate.ts), the user's own last. A component without docs (an older engine, a user's component that has none) is described from the schema alone. Tags are written as the engine spells them (`display`: `picHeader`). Examples are fenced with a fence longer than any fence they contain.

The fixed text is written once per language in `text.ts`. It mirrors the engine's own writing skill (`formatex-typ/skills/bilingual-document-authoring/`): when a rule changes there, change it here.

## Where the docs of a component come from

`components/<name>.typ` exports `#let <name>-docs = (en: (about, more?), fa: (about, more?), example: (en, fa))`. `gen-registry.mjs` (and its port in `components.rs`) puts them in the generated registry as `component-docs`, with `component-tags`; `tools/schema.typ` exports both as `components` in the schema. A built-in component must have them; the new-component template of the app writes a starter, and a component without them still works (it is described from its schema).
