import { Icon, arabicScript, codeCaptionPosition, codeIsNumbered, codeLanguage, digits, flowDir } from "formatex"

function marked(value, line) {
  return String(value ?? "").split(",").some(range => {
    const match = /^(\d+)(?:-(\d+))?$/.exec(range.trim())
    return !!match && line >= Number(match[1]) && line <= Number(match[2] ?? match[1])
  })
}

function sourceText(node, context, props) {
  if (props.src) return context.asset(String(props.src), true)
  if (node.value !== undefined) return String(node.value).replace(/^\s*(```|~~~)[^\n]*\n?/, "").replace(/\n?(```|~~~)\s*$/, "")
  const inner = node.children?.find(child => child.type === "code")
  return inner?.value ?? ""
}

export default function Component({ node, context }) {
  const p = context.props(node)
  const lang = codeLanguage(p.lang || node.lang || node.children?.find(child => child.type === "code")?.lang)
  const stored = context.assets[`code:${node.key}`]
  const lines = stored ? JSON.parse(stored) : sourceText(node, context, p).replace(/\n$/, "").split("\n").map(line => line.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;"))
  const range = /^(\d+)(?:-(\d+))?$/.exec(String(p.lines ?? ""))
  const first = Math.max(1, Number(range?.[1] ?? 1))
  const last = Number(range?.[2] ?? (range ? range[1] : 0))
  const shown = lines.slice(first - 1, last || undefined)
  const caption = p.caption ? String(p.caption) : ""
  const numbered = codeIsNumbered(context.document.settings, node.props ?? {}) && context.numbers.get(node.key) !== undefined
  const position = codeCaptionPosition(context.document.settings, p)
  const dir = flowDir(p.dir)
  const persian = dir === "rtl" || (dir !== "ltr" && (caption ? arabicScript(caption) : context.document.settings.dir === "rtl" || context.language === "fa"))
  const number = context.numbers.get(node.key)
  const label = persian ? "کد" : "Listing"
  const copy = p["copy-button"] !== false && p["copy-button"] !== "false"
  const copyLabel = context.language === "fa" ? "کپی" : "Copy"
  const wide = first + shown.length - 1 >= 100
  const captionNode = (numbered || caption) && (
    <figcaption className="fx-code-caption">
      {numbered && <span className="fx-code-number">{label} {digits(number, persian)}</span>}
      {numbered && caption ? ": " : ""}
      {caption}
    </figcaption>
  )
  return (
    <figure id={p.id ? String(p.id) : undefined} dir={dir} className="fx-code-figure">
      {position === "above" && captionNode}
      <div className={`fx-code${lang ? " fx-code-lang" : ""}${wide ? " fx-code-wide" : ""}`} dir="ltr">
        <div className="fx-code-frame">
          {lang ? (
            <div className="fx-code-badge">
              <Icon name="code" />
              <span>{lang}</span>
              {copy && <button type="button" className="fx-copy">{copyLabel}</button>}
            </div>
          ) : copy && <button type="button" className="fx-copy fx-copy-solo">{copyLabel}</button>}
          <pre><code>{shown.map((line, index) => <span key={index} className={`fx-code-line${marked(p.highlight, first + index) ? " fx-code-highlight" : ""}`} data-line={first + index} dangerouslySetInnerHTML={{ __html: line || " " }} />)}</code></pre>
        </div>
      </div>
      {position === "below" && captionNode}
    </figure>
  )
}
