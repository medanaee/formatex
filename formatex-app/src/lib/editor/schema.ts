import raw from "../../../engine/tags.json"

/** Text in the languages of the interface. The engine writes both; a missing one falls back to English. */
export interface LocalizedText {
  en: string
  fa?: string
}

export type AttrType = "enum" | "color" | "string" | "number" | "length" | "path" | "bool" | "int" | "id"

export interface AttrSpec {
  type: AttrType
  values?: string[]
  default?: string
  required?: boolean
  /** `#` for an attribute written `#value` inside the `{...}` of an option line. */
  shorthand?: string
  /** An enum that may be written as its bare value: `<align center>` means `<align to="center">`. */
  bare?: boolean
  doc?: LocalizedText
}

export type TagKind = "block" | "inline" | "void"

export interface TagSpec {
  /** How the tag is written when that is not its lowercase key (`picHeader`). */
  display?: string
  kind: TagKind
  description: LocalizedText
  attrs: Record<string, AttrSpec>
  /** Tags that may stand inside this one. */
  children?: string[]
  /** Only meaningful inside a parent that lists it in `children` (<item> in <grid>). */
  scoped?: boolean
  parents?: string[]
}

/** What a component says about itself: what it is for in both languages, and a usage example (the engine's `<name>-docs`). */
export interface ComponentDocs {
  en: { about: string; more?: string }
  fa: { about: string; more?: string }
  /** Markdown that uses the component; one text for both languages, or one for each. */
  example: string | { en: string; fa?: string }
}

/** A component of the library: the tags it answers to, and its docs when it has them. */
export interface ComponentInfo {
  tags: string[]
  docs: ComponentDocs | null
}

export type OptionKind = "table" | "heading" | "list" | "equation" | "span"

export interface OptionSpec {
  where: LocalizedText
  syntax: string
  attrs: Record<string, AttrSpec>
}

/** A `[table]` of config.toml, or a block of the front matter (`header:`), with its keys. */
export interface ConfigTable {
  doc: LocalizedText
  attrs: Record<string, AttrSpec>
}

/** The keys of one settings file: top-level keys and its tables / blocks. */
export interface ConfigSchema {
  attrs: Record<string, AttrSpec>
  tables: Record<string, ConfigTable>
}

/** The engine's description of its tags and `{...}` option lines: `engine/tags.json`, written by `npm run engine:sync`. */
export interface Schema {
  tags: Record<string, TagSpec>
  /** The components (built-in and the user's) with their tags and docs. Older schemas do not have it. */
  components?: Record<string, ComponentInfo>
  options: Record<OptionKind, OptionSpec>
  /** The settings files: `config.toml` and the YAML front matter of a document. */
  config?: { config: ConfigSchema; "front-matter": ConfigSchema }
  /** Every theme with its colors as `#rrggbb`: the engine's and, in the app, the user's. */
  themes?: Record<string, { dark: boolean } & Record<string, string | boolean>>
  /** The names of the themes that are the user's (the app only). */
  customThemes?: string[]
}

export const schema = raw as unknown as Schema

export const localized = (text: LocalizedText | undefined, language: string): string => (text ? (language === "fa" ? text.fa || text.en : text.en) : "")
