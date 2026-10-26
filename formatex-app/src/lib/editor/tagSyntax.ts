/**
 * Reading and writing the attributes of the engine's markup, for the visual editor's settings popover. Two spellings:
 *   a tag:          <alert type="tip" icon="lightbulb">     (every value quoted)
 *   an option line: {width=full caption="A table" #tbl-id}  (quoted only when it has to be; `#id` is the id)
 * Both keep the order they were written in and keep attributes the schema does not know.
 */

export type Attrs = [name: string, value: string][]

export interface OpenTag {
  name: string
  attrs: Attrs
  /** Written `<name ... />`. */
  selfClosing: boolean
}

const quoteTag = (value: string): string => (value.includes('"') && !value.includes("'") ? `'${value}'` : `"${value.replace(/"/g, "&quot;")}"`)
const quoteOption = (value: string): string => (/^[\w.%:+\-/]+$/.test(value) ? value : `"${value.replace(/"/g, '\\"')}"`)

/** Reads `name="a" b=c d` into ordered pairs; a bare word is an attribute with the value "true". */
function readAttrs(text: string, option: boolean): Attrs {
  const attrs: Attrs = []
  let i = 0
  const n = text.length
  while (i < n) {
    while (i < n && /[\s/]/.test(text[i])) i++
    if (i >= n) break
    if (option && text[i] === "#") {
      const start = ++i
      while (i < n && !/\s/.test(text[i])) i++
      attrs.push(["id", text.slice(start, i)])
      continue
    }
    const start = i
    while (i < n && !/[\s="'/>]/.test(text[i])) i++
    const name = text.slice(start, i)
    if (!name) {
      i++
      continue
    }
    if (text[i] !== "=") {
      attrs.push([name, "true"])
      continue
    }
    i++
    let value: string
    if (text[i] === '"' || text[i] === "'") {
      const quote = text[i++]
      const begin = i
      while (i < n && text[i] !== quote) i += text[i] === "\\" && option ? 2 : 1
      value = text.slice(begin, i).replace(/\\"/g, '"').replace(/&quot;/g, '"')
      i++
    } else {
      const begin = i
      while (i < n && !/\s/.test(text[i])) i++
      value = text.slice(begin, i)
    }
    attrs.push([name, value])
  }
  return attrs
}

/** `<alert type="tip">` → name and attributes; `null` when the text is not an opening tag. */
export function parseOpenTag(text: string): OpenTag | null {
  const match = /^<([A-Za-z][\w-]*)([\s\S]*?)(\/?)>$/.exec(text.trim())
  if (!match) return null
  return { name: match[1], attrs: readAttrs(match[2], false), selfClosing: match[3] === "/" }
}

export function serializeOpenTag(tag: OpenTag): string {
  const attrs = tag.attrs.map(([name, value]) => ` ${name}=${quoteTag(value)}`).join("")
  return `<${tag.name}${attrs}${tag.selfClosing ? " /" : ""}>`
}

/** The text between the braces of an option line. */
export function parseOptions(inner: string): Attrs {
  return readAttrs(inner, true)
}

/** `{width=full #tbl-id}`; empty string when there are no attributes. The `id` attribute is written `#id`, at the end. */
export function serializeOptions(attrs: Attrs): string {
  const plain = attrs.filter(([name]) => name !== "id").map(([name, value]) => `${name}=${quoteOption(value)}`)
  const id = attrs.find(([name]) => name === "id")?.[1]
  const parts = id ? [...plain, `#${id}`] : plain
  return parts.length ? `{${parts.join(" ")}}` : ""
}

/** Sets, changes or (with an empty value) removes an attribute, keeping the order of the others. */
export function withAttr(attrs: Attrs, name: string, value: string): Attrs {
  const exists = attrs.some(([key]) => key === name)
  if (value === "") return attrs.filter(([key]) => key !== name)
  return exists ? attrs.map(([key, old]) => (key === name ? [key, value] : [key, old])) : [...attrs, [name, value]]
}

/**
 * Gives a bare word its attribute: in `<align center>` the word `center` is a value of `to`, not an attribute `center`, when the
 * schema marks `to` as `bare`. Attributes the schema does not know, and words that are no value of a bare attribute, stay as they are.
 */
export function expandBare(attrs: Attrs, specs: Record<string, { bare?: boolean; values?: string[] }> | undefined): Attrs {
  if (!specs) return attrs
  const bareAttrs = Object.entries(specs).filter(([, spec]) => spec.bare && spec.values)
  if (bareAttrs.length === 0) return attrs
  return attrs.map(([name, value]) => {
    if (value !== "true" || name in specs) return [name, value]
    const owner = bareAttrs.find(([key, spec]) => spec.values!.includes(name) && !attrs.some(([other]) => other === key))
    return owner ? [owner[0], name] : [name, value]
  })
}

export const attrValue = (attrs: Attrs, name: string): string => attrs.find(([key]) => key === name)?.[1] ?? ""
