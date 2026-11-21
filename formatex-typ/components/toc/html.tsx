import { arabicScript, digits, flowDir, textOf } from "formatex"

function headingNumberParts(node) {
  const raw = String(node.props?._number ?? "")
  if (!raw) return []
  return raw.split(".").filter(Boolean).map(Number).filter(n => !Number.isNaN(n))
}

export default function Component({ node, context }) {
  const p = context.props(node)
  const docDir = flowDir(context.document.settings?.dir)
  const defaultDir = docDir === "ltr" || docDir === "rtl" ? docDir : (context.language === "fa" ? "rtl" : "ltr")
  const d = p.dir === "rtl" || p.dir === "ltr" || p.dir === "auto" ? p.dir : defaultDir
  const rtl = d === "rtl" || (d === "auto" && defaultDir === "rtl")
  const title = p.title ? String(p.title) : (d === "ltr" ? "Contents" : "فهرست مطالب")
  const nums = p.numbers === "rtl" || p.numbers === "ltr" || p.numbers === "auto"
    ? p.numbers
    : (d === "ltr" ? "ltr" : "rtl")
  const depthLimit = p.depth !== undefined && p.depth !== null && p.depth !== "" ? Math.max(1, Number(p.depth)) : null
  const showLeader = p.pages !== false && p.pages !== "false"
  const breakMode = String(p.break ?? "false")

  const headings = Array.from(new Set(context.targets.values())).filter(n => {
    if (n.type !== "heading") return false
    const hp = context.props(n)
    return hp.toc !== false && hp.toc !== "false"
  })

  const numberedPool = headings.filter(n => headingNumberParts(n).length > 0)
  const topPool = numberedPool.length ? numberedPool : headings
  const minLevel = topPool.length ? Math.min(...topPool.map(n => n.depth ?? 1)) : 1

  const visible = depthLimit === null
    ? headings
    : headings.filter(n => (n.depth ?? 1) - minLevel + 1 <= depthLimit)

  const breakCls = breakMode === "true"
    ? " fx-break-both"
    : breakMode === "before"
      ? " fx-break-before"
      : breakMode === "after"
        ? " fx-break-after"
        : ""

  return (
    <nav id={p.id ? String(p.id) : undefined} dir={d === "auto" ? defaultDir : d} className={`fx-toc${breakCls}`}>
      <header className="fx-toc-title">{title}</header>
      {visible.length === 0 ? (
        <p className="fx-toc-empty">{rtl ? "موردی یافت نشد." : "No headings found."}</p>
      ) : (
        <ul className="fx-toc-list">
          {visible.map(n => {
            const label = textOf(n).trim()
            const entryRtl = arabicScript(label)
            const entryDir = nums !== "auto" ? nums : (d === "auto" ? (entryRtl ? "rtl" : "ltr") : d)
            const faDigits = nums === "auto" ? entryRtl : nums === "rtl"
            const parts = headingNumberParts(n)
            const formattedNum = parts.length ? parts.map(part => digits(part, faDigits)).join(".") : ""
            const level = Math.max(0, (n.depth ?? 1) - minLevel)
            return (
              <li
                key={n.key}
                dir={entryDir}
                className={`fx-toc-item fx-toc-level-${Math.min(level, 4)}${level === 0 ? " fx-toc-top" : ""}`}
                style={{ paddingInlineStart: level > 0 ? `${(level * 1.25).toFixed(2)}em` : undefined }}
              >
                <a className="fx-toc-link" href={`#${n.props?.id}`}>
                  {formattedNum && <span className="fx-toc-num">{formattedNum}</span>}
                  <span className="fx-toc-label" dir={entryRtl ? "rtl" : "ltr"}>{label}</span>
                  {showLeader && <span className="fx-toc-leader" aria-hidden="true" />}
                </a>
              </li>
            )
          })}
        </ul>
      )}
    </nav>
  )
}
