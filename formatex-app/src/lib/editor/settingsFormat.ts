import { getValue as tomlGet, removeKey as tomlRemove, setValue as tomlSet, tomlString, type TomlValue } from "./tomlEdit"
import { getValue as yamlGet, removeKey as yamlRemove, setValue as yamlSet, yamlString } from "./yamlEdit"

/** One setting's value as read from a file. */
export type SettingValue = TomlValue

/**
 * How a settings form reads and writes one file format: `config.toml` and the YAML front matter of a document have the same keys
 * (the engine's config schema) and differ only in how a line is written. The text is that of the whole file (TOML) or of the front
 * matter without its `---` lines (YAML); a table is a `[table]` or a block `table:`.
 */
export interface SettingsFormat {
  get(text: string, table: string, key: string): SettingValue | undefined
  /** `literal` is a value written by `string()` or a bare number / boolean. */
  set(text: string, table: string, key: string, literal: string): string
  remove(text: string, table: string, key: string): string
  string(value: string): string
}

export const TOML_FORMAT: SettingsFormat = { get: tomlGet, set: tomlSet, remove: tomlRemove, string: tomlString }
export const YAML_FORMAT: SettingsFormat = { get: yamlGet, set: yamlSet, remove: yamlRemove, string: yamlString }
