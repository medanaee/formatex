/** Transport shared by the native preparation service and both document backends. */
export type Output = "html" | "typ"
export type Data = null | boolean | number | string | Data[] | { [key: string]: Data }
export type Settings = { [key: string]: Data }
export interface Location { file: string; line: number; column: number }
export interface Node {
  type: string
  value?: string
  name?: string
  depth?: number
  ordered?: boolean
  start?: number | null
  checked?: boolean | null
  url?: string
  title?: string | null
  alt?: string
  lang?: string | null
  meta?: string | null
  identifier?: string
  align?: (string | null)[]
  props?: Settings
  rich?: Record<string, Node[]>
  children?: Node[]
  at: Location
  source?: import("./source").SourceRange[]
  span?: [number, number]
  propSpans?: Record<string, import("./source").SourceRange[]>
  key: string
}
export interface DocumentIR {
  options?: Record<string, import("./index").TagSpec>
  packages?: Record<string, import("./packages").ComponentPackage>
  sources?: Record<string, string>
  segments?: { start: number; end: number; file: string; original: [number, number]; generated: boolean }[]
  version: 1
  file: string
  children: Node[]
  settings: Settings
  tokens: Settings
}
export class DocumentError extends Error {
  at: Location
  constructor(message: string, at: Location) {
    super(`${at.file}:${at.line}:${at.column}: ${message}`)
    this.name = "DocumentError"
    this.at = at
  }
}
export const textOf = (node: Node): string => node.value ?? node.children?.map(textOf).join("") ?? ""
