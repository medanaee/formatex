/**
 * The Markdown file a project typesets is the `source` key of its `config.toml`, as it is for the engine on the command line. These
 * read and write that one line without a TOML parser: only a top-level `key = "string"` matters here.
 */

export interface ConfigSource {
  /** The path as written, `""` when the string is empty. */
  path: string
  /** 1-based line of the key in `config.toml`. */
  line: number
}

const KEY_LINE = /^(\s*source\s*=\s*)(?:"((?:[^"\\]|\\.)*)"|'([^']*)')/
const TABLE_LINE = /^\s*\[/

const unescape = (text: string): string => text.replace(/\\(["\\])/g, "$1")
const escape = (text: string): string => text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')

/** Where the top level of the file ends: the first `[table]` line (its keys are not the project's own). */
function topLevelEnd(lines: string[]): number {
  const table = lines.findIndex((line) => TABLE_LINE.test(line))
  return table < 0 ? lines.length : table
}

/** The `source` of a `config.toml`, or `null` when it has none. */
export function sourceOf(config: string): ConfigSource | null {
  const lines = config.split("\n")
  const end = topLevelEnd(lines)
  for (let index = 0; index < end; index++) {
    const match = KEY_LINE.exec(lines[index].replace(/\r$/, ""))
    if (match) return { path: match[2] !== undefined ? unescape(match[2]) : (match[3] ?? ""), line: index + 1 }
  }
  return null
}

/** `config` with its `source` set to `path`: the line is changed where it is (its comment stays), or added at the top. */
export function withSource(config: string, path: string): string {
  const lines = config.split("\n")
  const end = topLevelEnd(lines)
  const value = `"${escape(path)}"`
  for (let index = 0; index < end; index++) {
    const line = lines[index]
    const match = KEY_LINE.exec(line.replace(/\r$/, ""))
    if (match) {
      lines[index] = match[1] + value + line.slice(match[0].length)
      return lines.join("\n")
    }
  }
  const newline = config.includes("\r\n") ? "\r\n" : "\n"
  return `source = ${value}${newline}${config}`
}
