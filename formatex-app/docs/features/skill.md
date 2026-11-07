# Feature: Skill (a file for AI agents)

Code: [`SkillPage`](../../src/routes/SkillPage.tsx), [`src/lib/skill/generate.ts`](../../src/lib/skill/generate.ts) (the generator, pure and tested), [`src/lib/skill/text.ts`](../../src/lib/skill/text.ts) (the fixed text). The engine's side: every component's `<name>-docs` and the `components` entry of `tags.json` ([the engine's "Extending the template"](../../../formatex-typ/docs/doc_en.md)).

## What it is

The **Skill** destination of the side bar builds **one Markdown file**, `SKILL.md`, that teaches an AI agent (Claude Code, Codex, ...) to write documents for Formatex: what a project is, how to work, the rules that matter, every component with its attributes and an example, the `{...}` option lines, the settings (`config.toml` and front matter), the themes and feels, and a checklist. It is made from the **schema the app already holds** (`useSchemaStore`: the engine's `tags.json`, replaced in the desktop app by `engine_schema`, so **the user's own components are in it**) and the **docs of each component**.

The output is the file and nothing else: front matter (`name`, `description`), then the Markdown. No notes about how it was made.

## The screen

The file has up to **two sections**, each a card with its own switch, **size** and **language**; at least one stays on.

- **Writing documents** (on at the start): everything above. Its size (four cards, each with its token count): **Minimal** (the short rules, one line per tag with its attribute names, the keys of the settings), **Compact** (the full rules, each tag's attributes with type, values and default, an example), **Standard** (plus what each tag is for and its rules), **Full** (every note, every attribute described). Its language is English or Persian. Its **components**: every component, grouped (document, layout, figures and code, writing, your own), each a check box; *All* / *None*. A group `custom` holds components the app does not know by name.
- **Building components** (off at the start): how to make a component of the project itself: what a component file defines (`<x>-tags`, optional `<x>-schema` and `<x>-docs`; any number of tags per file, any file name), how a project lists its files in `components`, what `/src/kit.typ` gives (`theme`, `zoom`, `feel`, the helpers), how errors are reported (`at-of`) and shown (in the Markdown file and in the component file), and a complete example. It is one fixed document in en and fa (`src/lib/skill/buildText.ts`), cut by size: Minimal (what and where), Compact (the schema and docs), Standard (the kit API and errors), Full (a complete file and the mistakes to avoid). A test checks that every name it documents is still defined by the engine.
- **Preview** of the file (read-only) with its size, **Copy** and **Download** (`SKILL.md`, through `saveBytes`: the native "Save as" in the app, a download in a browser).

Nothing is stored: the screen starts with the writing section at Standard, English, all components, and the building section off.

## How it is built (`generateSkill(schema, { writing, building })`)

`head` (front matter + title; the description names each section that is on) + `writing` (`generateWriting`: `intro` (the project, how to work, the rules; shorter at *Minimal*) + `## Components` + `## Option lines` + `## Settings` + `outro` (common mistakes and the checklist; shorter at *Minimal*)) + `building` (`generateBuilding`). The language of the head is that of the first section that is on. Components come in the order of [`GROUPS`](../../src/lib/skill/generate.ts).

The fixed text is written once per language in `text.ts` (writing) and `buildText.ts` (building). The writing text mirrors the engine's own writing skill (`formatex-typ/skills/bilingual-document-authoring/`): when a rule changes there, change it here.

## Where the docs of a component come from

`components/<name>.typ` exports `#let <name>-docs = (en: (about, more?), fa: (about, more?), example: (en, fa))`. `gen-registry.mjs` (and its port in `components.rs`) puts them in the generated registry as `component-docs`, with `component-tags`; `tools/schema.typ` exports both as `components` in the schema. A built-in component must have them; the new-component template of the app writes a starter, and a component without them still works (it is described from its schema).
