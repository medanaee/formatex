import { localized, type AttrSpec, type ComponentDocs, type ConfigSchema, type LocalizedText, type OptionKind, type Schema, type TagSpec } from "@/lib/editor/schema"
import { skillHead, skillIntro, skillOutro, type FixedLanguage } from "@/lib/skill/text"

/** How much the skill holds: from the names and attributes of the tags up to every note of every component. */
export type SkillLevel = "minimal" | "compact" | "standard" | "full"
export const SKILL_LEVELS: readonly SkillLevel[] = ["minimal", "compact", "standard", "full"]

/** The language of what the engine says about its components. `both` writes English first, then Persian. */
export type SkillLanguage = "en" | "fa" | "both"

export interface SkillOptions {
  level: SkillLevel
  language: SkillLanguage
  /** The components to describe; `null` is all of them. */
  components: ReadonlySet<string> | null
}

/** Where a component stands in the picker. */
export type ComponentGroup = "document" | "layout" | "figures" | "writing" | "custom"

const GROUPS: Record<string, ComponentGroup> = {
  docheader: "document",
  picheader: "document",
  toc: "document",
  "figure-lists": "document",
  citations: "document",
  footnotes: "document",
  ref: "document",
  links: "document",
  internal: "document",
  space: "document",
  lists: "document",
  align: "layout",
  dir: "layout",
  div: "layout",
  box: "layout",
  grid: "layout",
  alert: "layout",
  steps: "layout",
  compare: "layout",
  progress: "layout",
  fig: "figures",
  img: "figures",
  cetz: "figures",
  lilaq: "figures",
  chart: "figures",
  tree: "figures",
  code: "figures",
  diff: "figures",
  typ: "figures",
  theorem: "writing",
  def: "writing",
  todo: "writing",
  exercise: "writing",
  letter: "writing",
  chat: "writing",
  kbd: "writing",
  badge: "writing",
  icon: "writing",
}

export const COMPONENT_GROUPS: readonly ComponentGroup[] = ["document", "layout", "figures", "writing", "custom"]

export interface SkillComponent {
  name: string
  tags: string[]
  group: ComponentGroup
  docs: ComponentDocs | null
}

/** The components of a schema, for the picker and the generator: those the engine lists, else the tags themselves, one by one. */
export function skillComponents(schema: Schema): SkillComponent[] {
  const known = schema.components
  const out: SkillComponent[] = known
    ? Object.entries(known).map(([name, info]) => ({ name, tags: info.tags, group: GROUPS[name] ?? "custom", docs: info.docs }))
    : Object.keys(schema.tags).map((tag) => ({ name: tag, tags: [tag], group: GROUPS[tag] ?? "custom", docs: null }))
  // A component without tags (the lists) is a section of the manual all the same; the order follows the groups
  const order = Object.keys(GROUPS)
  const rank = (name: string): number => (order.includes(name) ? order.indexOf(name) : order.length)
  return out.sort((a, b) => COMPONENT_GROUPS.indexOf(a.group) - COMPONENT_GROUPS.indexOf(b.group) || rank(a.name) - rank(b.name) || a.name.localeCompare(b.name))
}

/** About four characters make a token; the number is for a display, not a bill. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

// ---- small helpers -----------------------------------------------------------------------------------------------------------

const languagesOf = (language: SkillLanguage): FixedLanguage[] => (language === "both" ? ["en", "fa"] : [language])

/** A one-line text in the languages asked for: `en / fa` for both. */
function line(text: LocalizedText | undefined, language: SkillLanguage): string {
  if (!text) return ""
  const parts = languagesOf(language).map((lang) => localized(text, lang).replace(/\s*\n\s*/g, " ").trim())
  return [...new Set(parts.filter(Boolean))].join(" / ")
}

const cell = (text: string): string => text.replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " ")

/** A fence long enough to hold any fence inside the text. */
function fenced(text: string, info = "markdown"): string {
  const longest = Math.max(2, ...[...text.matchAll(/`{3,}/g)].map((match) => match[0].length))
  const ticks = "`".repeat(longest + 1)
  return `${ticks}${info}\n${text.replace(/\n+$/, "")}\n${ticks}`
}

function typeOf(spec: AttrSpec): string {
  if (spec.type === "enum" && spec.values?.length) return spec.values.join(" \\| ")
  if (spec.type === "bool") return "true \\| false"
  return spec.type
}

/** `type` (a | b; default x): the short form of one attribute, with no note. */
function attrShort(name: string, spec: AttrSpec): string {
  const type = spec.type === "enum" && spec.values?.length ? spec.values.join("|") : spec.type === "bool" ? "true|false" : spec.type
  const extras = [spec.required ? "required" : "", spec.default !== undefined && spec.default !== "" ? `default ${spec.default}` : ""].filter(Boolean)
  return `\`${name}\` (${type}${extras.length ? `; ${extras.join("; ")}` : ""})`
}

/** The first sentence of a note, cut at a word when it is long: what the standard size keeps of the notes. */
export function brief(text: string, limit = 150): string {
  const first = text.split(/(?<=[.!?؟])\s/)[0] ?? text
  if (first.length <= limit) return first
  const cut = first.slice(0, limit)
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), limit / 2))}…`
}

function attrTable(attrs: Record<string, AttrSpec>, language: SkillLanguage, short = false, label = "Attribute"): string[] {
  const entries = Object.entries(attrs)
  if (!entries.length) return []
  const rows = entries.map(([name, spec]) => {
    const note = short ? languagesOf(language).map((lang) => brief(localized(spec.doc, lang))).filter(Boolean).join(" / ") : line(spec.doc, language)
    return `| \`${name}\` | ${typeOf(spec)} | ${spec.default !== undefined && spec.default !== "" ? `\`${cell(spec.default)}\`` : spec.required ? "required" : ""} | ${cell(note)} |`
  })
  return [`| ${label} | Type | Default | Notes |`, "|---|---|---|---|", ...rows]
}

/** A tag as it is written in a document: the engine may spell it with capitals (`picHeader`) where its key is lowercase. */
const shown = (schema: Schema, tag: string): string => schema.tags[tag]?.display ?? tag
const openTag = (tag: string, spec: TagSpec | undefined): string => {
  const written = spec?.display ?? tag
  return spec?.kind === "void" ? `<${written} />` : `<${written}>`
}

// ---- components --------------------------------------------------------------------------------------------------------------

function exampleOf(docs: ComponentDocs, language: SkillLanguage, level: SkillLevel): string[] {
  const example = docs.example
  const pick = (lang: FixedLanguage): string => (typeof example === "string" ? example : lang === "fa" ? (example.fa ?? example.en) : example.en)
  const wanted = language === "both" ? (level === "full" ? (["en", "fa"] as const) : (["en"] as const)) : ([language] as const)
  const texts = [...new Set(wanted.map(pick))]
  return texts.flatMap((text) => ["Example:", "", fenced(text), ""])
}

function componentSection(schema: Schema, component: SkillComponent, options: SkillOptions): string {
  const { level, language } = options
  const lines: string[] = []
  const tags = component.tags.filter((tag) => schema.tags[tag])
  const title = tags.length ? tags.map((tag) => `\`<${shown(schema, tag)}>\``).join(", ") : `\`${component.name}\``
  const first = tags.length ? schema.tags[tags[0]] : undefined
  lines.push(`### ${component.name === tags[0] || !tags.length ? title : `${component.name}: ${title}`}`, "")
  const describe = (tag: string): string => line(schema.tags[tag]?.description, language)
  const docs = component.docs
  if (first && !docs) lines.push(describe(tags[0]), "")

  // The notes of the component: from the standard size up; every note of it at the full size
  if (docs && (level === "standard" || level === "full")) {
    for (const lang of languagesOf(language)) lines.push(docs[lang].about, "")
    if (level === "full") for (const lang of languagesOf(language)) if (docs[lang].more) lines.push(docs[lang].more as string, "")
  }
  for (const tag of tags) {
    const spec = schema.tags[tag]
    const kind = spec.kind === "void" ? "self-closing" : spec.kind
    const where = [
      spec.scoped ? `only inside ${(spec.parents ?? []).map((p) => `\`<${shown(schema, p)}>\``).join(", ") || "its parent"}` : "",
      spec.children?.length ? `may hold ${spec.children.map((c) => `\`<${shown(schema, c)}>\``).join(", ")}` : "",
    ].filter(Boolean)
    const traits = [kind, ...where].join("; ")
    if (level === "full") {
      // every attribute with its note
      lines.push(tags.length > 1 ? `**\`${openTag(tag, spec)}\`**: ${describe(tag)} (${traits})` : `${traits}.`, "")
      const table = attrTable(spec.attrs, language)
      if (table.length) lines.push(...table, "")
    } else {
      // what each tag takes, in a line: its attributes with their values and defaults
      const attrs = Object.entries(spec.attrs).map(([name, a]) => attrShort(name, a))
      if (tags.length > 1) lines.push(`- \`${openTag(tag, spec)}\` (${traits}): ${describe(tag)}${attrs.length ? `. Attributes: ${attrs.join(", ")}` : ""}`)
      else lines.push(`${traits.charAt(0).toUpperCase()}${traits.slice(1)}.${attrs.length ? ` Attributes: ${attrs.join(", ")}.` : ""}`)
    }
  }
  if (level !== "full") lines.push("")
  if (docs) lines.push(...exampleOf(docs, language, level))
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd()
}

/** The smallest size: one line per tag, with the names of its attributes. */
function minimalComponents(schema: Schema, components: SkillComponent[], language: SkillLanguage): string {
  const lines: string[] = []
  for (const component of components) {
    for (const tag of component.tags.filter((t) => schema.tags[t])) {
      const spec = schema.tags[tag]
      const attrs = Object.keys(spec.attrs)
      lines.push(`- \`${openTag(tag, spec)}\`: ${line(spec.description, language)}${attrs.length ? ` (${attrs.join(", ")})` : ""}`)
    }
  }
  return lines.join("\n")
}

// ---- settings and option lines -----------------------------------------------------------------------------------------------

function configSection(title: string, config: ConfigSchema, options: SkillOptions): string {
  const { level, language } = options
  const lines = [`### ${title}`, ""]
  const keys = (attrs: Record<string, AttrSpec>) => Object.entries(attrs)
  if (level === "minimal") {
    lines.push(`Keys: ${keys(config.attrs).map(([name]) => `\`${name}\``).join(", ")}. Tables: ${Object.keys(config.tables).map((name) => `\`${name}\``).join(", ")}.`)
    return lines.join("\n")
  }
  const withoutSource = (attrs: Record<string, AttrSpec>): Record<string, AttrSpec> =>
    attrs.source ? { ...attrs, source: { ...attrs.source, default: undefined } } : attrs
  const render = (all: Record<string, AttrSpec>): string[] => renderKeys(withoutSource(all))
  const renderKeys = (attrs: Record<string, AttrSpec>): string[] => (level === "compact" ? [keys(attrs).map(([name, spec]) => attrShort(name, spec)).join(", ") + "."] : attrTable(attrs, language, level === "standard", "Key"))
  if (Object.keys(config.attrs).length) lines.push(...render(config.attrs), "")
  for (const [name, table] of Object.entries(config.tables)) {
    lines.push(`**\`${name}\`**: ${line(table.doc, language)}`, "", ...render(table.attrs), "")
  }
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd()
}

const OPTION_TITLES: Record<OptionKind, string> = {
  table: "Tables",
  heading: "Headings",
  list: "Lists",
  equation: "Equations",
  span: "Text fragments",
}

function optionsSection(schema: Schema, options: SkillOptions): string {
  const { level, language } = options
  const lines = ["## Option lines `{...}`", "", "A line of options in braces changes one table, list, heading, equation or text fragment. Where it goes, and what it takes:", ""]
  for (const kind of Object.keys(schema.options) as OptionKind[]) {
    const spec = schema.options[kind]
    lines.push(`### ${OPTION_TITLES[kind] ?? kind}`, "", `${line(spec.where, language)}: \`${spec.syntax}\``, "")
    if (level === "minimal") continue
    lines.push(...(level === "compact" ? [Object.entries(spec.attrs).map(([name, a]) => attrShort(name, a)).join(", ") + ".", ""] : [...attrTable(spec.attrs, language, level === "standard", "Option"), ""]))
  }
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd()
}

function themesLine(schema: Schema): string {
  const themes = Object.entries(schema.themes ?? {})
  if (!themes.length) return ""
  const light = themes.filter(([, t]) => !t.dark).map(([name]) => `\`${name}\``)
  const dark = themes.filter(([, t]) => t.dark).map(([name]) => `\`${name}\``)
  const feels = schema.config?.config.attrs.feel?.values?.map((value) => `\`${value}\``) ?? []
  return [
    `Themes: light ${light.join(", ")}; dark ${dark.join(", ")}. Set with \`theme\` in \`config.toml\` or the front matter.`,
    feels.length ? `Feels (corner rounding, table style, fonts): ${feels.join(", ")}; set with \`feel\`.` : "",
  ]
    .filter(Boolean)
    .join("\n\n")
}

// ---- the whole skill ---------------------------------------------------------------------------------------------------------

/** One Markdown file: a head, the fixed introduction, the reference generated from the schema and the docs of the components, the checklist. */
export function generateSkill(schema: Schema, options: SkillOptions): string {
  const fixed: FixedLanguage = options.language === "fa" ? "fa" : "en"
  const all = skillComponents(schema)
  const chosen = options.components ? all.filter((component) => options.components?.has(component.name)) : all
  const parts: string[] = [skillHead(fixed).trimEnd(), skillIntro(fixed, options.level)]

  const reference: string[] = ["## Components", ""]
  if (options.level === "minimal") {
    reference.push("Every component is a tag, or a few. These are the tags with what they do and their attributes.", "", minimalComponents(schema, chosen, options.language))
  } else {
    const intro = chosen.length ? "The components of the library, by what they are for. Use these tags and attributes exactly." : "No components were chosen."
    reference.push(intro, "")
    for (const group of COMPONENT_GROUPS) {
      const members = chosen.filter((component) => component.group === group)
      if (!members.length) continue
      for (const component of members) reference.push(componentSection(schema, component, options), "")
    }
  }
  parts.push(reference.join("\n").trimEnd())

  if (schema.options && Object.keys(schema.options).length) parts.push(optionsSection(schema, options))

  const config = schema.config
  if (config) {
    const settings = ["## Settings", "", "Top-level keys come before the first `[table]` in `config.toml`. Front matter is YAML at the top of a Markdown file.", ""]
    settings.push(configSection("config.toml", config.config, options), "", configSection("Front matter", config["front-matter"], options))
    const themes = themesLine(schema)
    if (themes) settings.push("", themes)
    parts.push(settings.join("\n"))
  }

  parts.push(skillOutro(fixed, options.level))
  return parts.join("\n\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n"
}
