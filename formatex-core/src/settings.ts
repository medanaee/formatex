import type { Data, Output, Settings } from "./model"

export type Domain = "shared" | Output
export interface Property { domain?: Domain; type?: string; default?: Data; values?: Data[]; required?: boolean; bare?: boolean }
export type Properties = Record<string, Property>
export const record = (value: unknown): value is Settings => value !== null && typeof value === "object" && !Array.isArray(value)

/** Renderer globals follow the same within-layer precedence as component properties. */
export function outputSettings(settings: Settings, backend: Output): Settings {
  const project = record(settings._project) ? settings._project : settings
  const document = record(settings._document) ? settings._document : {}
  return merge(project, record(project[backend]) ? project[backend] : {}, document, record(document[backend]) ? document[backend] : {}, { _project: project, _document: document })
}

/** Output overrides are applied within each layer, never after all local layers. */
export function merge(...layers: Settings[]): Settings {
  const out: Settings = Object.create(null)
  for (const layer of layers) for (const [key, value] of Object.entries(layer)) {
    if (["__proto__", "prototype", "constructor"].includes(key)) throw new Error(`Invalid configuration key: ${key}`)
    out[key] = record(out[key]) && record(value) ? merge(out[key], value) : value
  }
  return out
}

function expand(props: Settings): Settings {
  const out: Settings = Object.create(null)
  for (const [key, value] of Object.entries(props)) {
    const parts = key.split(".")
    let target = out
    for (const part of parts.slice(0, -1)) {
      if (["__proto__", "prototype", "constructor"].includes(part)) throw new Error(`Invalid property: ${key}`)
      if (!record(target[part])) target[part] = Object.create(null) as Settings
      target = target[part] as Settings
    }
    if (["__proto__", "prototype", "constructor"].includes(parts.at(-1)!)) throw new Error(`Invalid property: ${key}`)
    target[parts.at(-1)!] = value
  }
  return out
}

export function typed(value: Data, spec: Property, name: string): Data {
  if (spec.type === "bool" && typeof value === "string") {
    if (value !== "true" && value !== "false") throw new Error(`${name} must be true or false`)
    value = value === "true"
  }
  if (["int", "number"].includes(spec.type ?? "") && typeof value === "string") {
    if (!/^-?\d+(\.\d+)?$/.test(value)) throw new Error(`${name} must be a number`)
    value = Number(value)
  }
  if (spec.type === "int" && (typeof value !== "number" || !Number.isInteger(value))) throw new Error(`${name} must be an integer`)
  if (spec.type === "number" && (typeof value !== "number" || !Number.isFinite(value))) throw new Error(`${name} must be a number`)
  if (spec.type === "bool" && typeof value !== "boolean") throw new Error(`${name} must be true or false`)
  if (spec.type === "enum" && spec.values && !spec.values.some(v => String(v) === String(value))) throw new Error(`${name} must be one of ${spec.values.join(", ")}`)
  return value
}

export function resolve(output: Output, specs: Properties, layers: Settings[], strict = true): Settings {
  const result: Settings = Object.create(null)
  for (const [name, spec] of Object.entries(specs)) if (spec.default !== undefined && (spec.domain === undefined || spec.domain === "shared" || spec.domain === output)) result[name] = typed(spec.default, spec, name)
  for (const source of layers) {
    const layer = expand(source)
    const apply = (values: Settings, scope: Domain) => {
      for (const [name, value] of Object.entries(values)) {
        if (name === "html" || name === "typ") continue
        const shorthand = !specs[name] && value === true ? Object.entries(specs).find(([, spec]) => spec.bare && spec.values?.includes(name)) : undefined
        if (shorthand) {
          if (Object.hasOwn(values, shorthand[0])) throw new Error(`Duplicate property: ${shorthand[0]}`)
          apply({ [shorthand[0]]: name }, scope)
          continue
        }
        const spec = specs[name]
        if (!spec) { if (strict && !name.startsWith("_")) throw new Error(`Unknown property: ${name}`); if (scope === "shared" || scope === output) result[name] = value; continue }
        const domain = spec.domain ?? "shared"
        if (scope === "shared" && domain !== "shared") throw new Error(`${name} is only valid as ${domain}.${name}`)
        if (scope !== "shared" && domain !== "shared" && domain !== scope) throw new Error(`${name} is not available in ${scope}`)
        const converted = typed(value, spec, name)
        if (scope === "shared" || scope === output) result[name] = converted
      }
    }
    apply(layer, "shared")
    for (const scope of ["html", "typ"] as const) {
      if (layer[scope] !== undefined && !record(layer[scope])) throw new Error(`${scope} must be a table`)
      if (record(layer[scope])) apply(layer[scope], scope)
    }
  }
  for (const [name, spec] of Object.entries(specs)) if (spec.required && result[name] === undefined && (!spec.domain || spec.domain === "shared" || spec.domain === output)) throw new Error(`Missing property: ${name}`)
  return result
}

export function componentLayers(settings: Settings, name: string, local: Settings = {}): Settings[] {
  const component = (settings: Settings): Settings => {
    const shared = name !== "typ" && name !== "html" && record(settings[name]) ? settings[name] : {}
    const scoped: Settings = {}
    for (const output of ["html", "typ"] as const) {
      const root = settings[output]
      if (record(root) && record(root[name])) scoped[output] = root[name]
    }
    return merge(shared, scoped)
  }
  if (record(settings._project) || record(settings._document)) return [component(record(settings._project) ? settings._project : {}), component(record(settings._document) ? settings._document : {}), local]
  return [component(settings), local]
}
