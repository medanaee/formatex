export type ComponentKind = "inline" | "block"

/** Same rule as the Rust side: lowercase letters, digits and `-`, starting with a letter. */
export const COMPONENT_NAME = /^[a-z][a-z0-9-]{0,39}$/

export type ComponentNameProblem = "empty" | "invalid" | "exists"

export function componentNameProblem(name: string, existing: ReadonlySet<string>): ComponentNameProblem | null {
  if (!name) return "empty"
  if (!COMPONENT_NAME.test(name)) return "invalid"
  if (existing.has(name)) return "exists"
  return null
}

/**
 * The source of a new component: a working tag you can edit. `-tags` holds the code of each tag, `-schema` describes it for
 * autocomplete (and for checking the attributes written in a document).
 */
export function newComponentSource(name: string, kind: ComponentKind): string {
  const render = kind === "block" ? "block(width: 100%, inset: 8pt, stroke: 0.6pt, radius: 4pt, body)" : "text(weight: \"bold\", body)"
  return `// <${name}>: a tag of your own.
//   ${name}-tags    the code of each tag: (attrs, body) => content
//                   attrs: the attributes written on the tag (strings); body: what stands between <${name}> and </${name}>
//   ${name}-schema  what autocomplete knows about the tag: its kind, a description and its attributes
#import "/src/prelude.typ": *
#import "/src/lib/basics.typ": *

#let ${name}-tags = (
  ${name}: (attrs, body) => {
    ${render}
  },
)

#let ${name}-schema = (
  "${name}": (
    kind: "${kind}",
    description: (en: "A tag of my own", fa: "تگ دلخواه من"),
    attrs: (:),
    // An attribute: read it in the code above with attrs.at("size", default: "1em")
    // attrs: (
    //   "size": (type: "length", default: "1em", doc: (en: "Text size", fa: "اندازهٔ متن")),
    // ),
  ),
)
`
}
