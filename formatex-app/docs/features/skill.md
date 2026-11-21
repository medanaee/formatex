# Feature: Skill (a file for AI agents)

Code: [`SkillPage`](../../src/routes/SkillPage.tsx), [`src/lib/skill/generate.ts`](../../src/lib/skill/generate.ts) (the generator, pure and tested), [`src/lib/skill/text.ts`](../../src/lib/skill/text.ts) (the fixed text). The engine's side: every component's `<name>-docs` and the `components` entry of `tags.json` ([the engine's "Extending the template"](../../../formatex-typ/docs/doc_en.md)).

## What it is

The **Skill** destination of the side bar builds **one Markdown file**, `SKILL.md`, that teaches an AI agent (Claude Code, Codex, ...) to write documents for Formatex: what a project is, how to work, the rules that matter, every component with its attributes and an example, the `{...}` option lines, the settings (`config.toml` and front matter), the themes and feels, and a checklist. It is made from the **schema the app already holds** (`useSchemaStore`: the engine's `tags.json`, replaced in the desktop app by `engine_schema`, so **the user's own components are in it**) and the **docs of each component**.

The output is the file and nothing else: front matter (`name`, `description`), then the Markdown. No notes about how it was made.

## The screen

The file has up to **two sections**, each a card with its own switch, **size** and **language**; at least one stays on.

- **Writing documents** (on at the start): everything above. Its size (four cards, each with its token count): **Minimal** (the short rules, one line per tag with its attribute names, the keys of the settings), **Compact** (the full rules, each tag's attributes with type, values and default, an example), **Standard** (plus what each tag is for and its rules), **Full** (every note, every attribute described). Its language is English or Persian. Its **components**: every component, grouped (document, layout, figures and code, writing, your own), each a check box; *All* / *None*. A group `custom` holds components the app does not know by name.
- **Building components** (off at the start): how to build a shared six-file folder package (`manifest.toml`, `schema.json`, `docs.json`, `typst.typ`, `html.tsx`, `html.css`), declare its folder path in Markdown front matter, keep schema/docs data separate from Typst/PDF and TSX/HTML implementations, use the kit and document tokens, and report source errors. It also teaches shared/html/typ configuration precedence and valid `setting.*` access. The text is fixed in en/fa (`src/lib/skill/buildText.ts`): Minimal gives package/namespace/look rules; Compact adds JSON/schema/availability contracts; Standard adds Typst kit, HTML context and diagnostics; Full adds a complete package and usage. Tests preserve the level/language API, verify documented kit names and reject the old standalone-file/inline-schema teaching.
- **Preview** of the file (read-only) with its size, **Copy** and **Download** (`SKILL.md`, through `saveBytes`: the native "Save as" in the app, a download in a browser).

Nothing is stored: the screen starts with the writing section at Standard, English, all components, and the building section off.

## How it is built (`generateSkill(schema, { writing, building })`)

`head` (front matter + title; the description names each section that is on) + `writing` (`generateWriting`: `intro` (the project, how to work, the rules; shorter at *Minimal*) + `## Components` + `## Option lines` + `## Settings` + `outro` (common mistakes and the checklist; shorter at *Minimal*)) + `building` (`generateBuilding`). The language of the head is that of the first section that is on. Components come in the order of [`GROUPS`](../../src/lib/skill/generate.ts).

The fixed text is written once per language in `text.ts` (writing) and `buildText.ts` (building). The generated document skeleton nests header/footer under `typ`; paged keys at root and bare HTML-only properties are not taught as valid settings. Focused generator verification currently passes 19 tests. The writing text mirrors the engine's own writing skill (`formatex-typ/skills/bilingual-document-authoring/`): when a rule changes there, change it here.

## Where the docs of a component come from

`components/<name>.typ` exports `#let <name>-docs = (en: (about, more?), fa: (about, more?), example: (en, fa))`. `gen-registry.mjs` (and its port in `components.rs`) puts them in the generated registry as `component-docs`, with `component-tags`; `tools/schema.typ` exports both as `components` in the schema. A built-in component must have them; the new-component template of the app writes a starter, and a component without them still works (it is described from its schema).
