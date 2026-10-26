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
  kind: TagKind
  description: LocalizedText
  attrs: Record<string, AttrSpec>
  /** Tags that may stand inside this one. */
  children?: string[]
  /** Only meaningful inside a parent that lists it in `children` (<item> in <grid>). */
  scoped?: boolean
  parents?: string[]
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
