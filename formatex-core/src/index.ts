export * from "./model"
export * from "./settings"
export * from "./source"
export * from "./packages"

export interface TagSpec {
  kind: string
  attrs: import("./settings").Properties
  children?: string[]
  scoped?: boolean
}

export const unfence = (text: string): string => text.trim().replace(/^(```|~~~)[^\n]*\n/, "").replace(/\n(```|~~~)\s*$/, "")
