import { flowDir, resolveDir, textOf } from "formatex"

export default function Component({ node, context }) {
  const p = context.props(node)
  const given = String(p.dir ?? "auto")
  if (given !== "auto" && given !== "rtl" && given !== "ltr") {
    throw new Error(`<typ> dir must be auto, rtl or ltr, got "${given}"`)
  }
  const codeNode = node.children?.find(child => child.type === "code")
  const hasCode = !!(p.src || node.value !== undefined || codeNode)
  if (!hasCode) {
    throw new Error('<typ> needs a fenced code block of Typst inside it, or src="file.typ"')
  }
  const sample = String(node.value ?? codeNode?.value ?? textOf(node))
  const dir = flowDir(given) !== "auto"
    ? flowDir(given)
    : (node.props?._flow === "rtl" || node.props?._flow === "ltr"
        ? node.props._flow
        : resolveDir("auto", sample, context.language))
  return (
    <div id={p.id ? String(p.id) : undefined} dir={dir} className="fx-typ">
      {context.graphic(node, { bodyOnly: true })}
    </div>
  )
}
