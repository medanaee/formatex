import { arabicScript, digits, flowDir, textOf } from "formatex"

const LIST_META = {
  lof: { faTitle: "فهرست شکل‌ها", enTitle: "List of Figures", faLabel: "شکل", enLabel: "Figure" },
  lot: { faTitle: "فهرست جدول‌ها", enTitle: "List of Tables", faLabel: "جدول", enLabel: "Table" },
  lol: { faTitle: "فهرست کدها", enTitle: "List of Listings", faLabel: "کد", enLabel: "Listing" },
}

function itemCaption(node) {
  if (node.name === "fig") {
    const capNode = node.children?.find(ch => ch.name === "caption")
    return capNode ? textOf(capNode).trim() : String(node.props?.caption ?? "").trim()
  }
  return String(node.props?.caption ?? "").trim()
}

export default function Component({ node, context }) {
  const tag = node.name
  const meta = LIST_META[tag]
  if (!meta) return null
  const p = context.props(node)
  const docDir = flowDir(context.document.settings?.dir)
  const defaultDir = docDir === "ltr" || docDir === "rtl" ? docDir : (context.language === "fa" ? "rtl" : "ltr")
  const d = p.dir === "rtl" || p.dir === "ltr" || p.dir === "auto" ? p.dir : defaultDir
  const rtl = d === "rtl" || (d === "auto" && defaultDir === "rtl")
  const title = p.title ? String(p.title) : (d === "ltr" ? meta.enTitle : meta.faTitle)
  const nums = p.numbers === "rtl" || p.numbers === "ltr" || p.numbers === "auto" ? p.numbers : "auto"
  const showLeader = p.pages !== false && p.pages !== "false"
  const breakMode = String(p.break ?? "false")

  const entries = Array.from(new Set(context.targets.values())).filter(n => {
    const np = context.props(n)
    if (tag === "lof") {
      const hasNum = context.numbers.has(n.key)
      const cap = itemCaption(n)
      if (!hasNum && !cap) return false
      if (n.name === "fig") return np.lof !== false && np.lof !== "false"
      if (n.name === "tree" || n.name === "chart") return np.lof !== false && np.lof !== "false"
      return false
    }
    if (tag === "lot") {
      if (n.type !== "table") return false
      const hasNum = context.numbers.has(n.key)
      const cap = itemCaption(n)
      return (hasNum || !!cap) && np.lot !== false && np.lot !== "false"
    }
    if (tag === "lol") {
      if (n.type !== "code" && n.name !== "code") return false
      const hasNum = context.numbers.has(n.key)
      const cap = itemCaption(n)
      return (hasNum || !!cap) && np.lol !== false && np.lol !== "false"
    }
    return false
  })

  const breakCls = breakMode === "true"
    ? " fx-break-both"
    : breakMode === "before"
      ? " fx-break-before"
      : breakMode === "after"
        ? " fx-break-after"
        : ""

  return (
    <nav id={p.id ? String(p.id) : undefined} dir={d === "auto" ? defaultDir : d} className={`fx-figlist fx-figlist-${tag}${breakCls}`}>
      <header className="fx-figlist-title">{title}</header>
      {entries.length === 0 ? (
        <p className="fx-figlist-empty">{rtl ? "موردی یافت نشد." : "No items found."}</p>
      ) : (
        <ul className="fx-figlist-items">
          {entries.map(n => {
            const caption = itemCaption(n)
            const entryRtl = caption ? arabicScript(caption) : (n.props?._flow === "rtl" || rtl)
            const entryDir = d === "auto" ? (entryRtl ? "rtl" : "ltr") : d
            const faDigits = nums === "auto" ? entryRtl : nums === "rtl"
            const num = context.numbers.get(n.key)
            const numLabel = num !== undefined ? `${faDigits ? meta.faLabel : meta.enLabel} ${digits(num, faDigits)}` : ""
            return (
              <li key={n.key} dir={entryDir} className="fx-figlist-item">
                <a className="fx-figlist-link" href={`#${n.props?.id}`}>
                  {numLabel && (
                    <span className="fx-figlist-num">
                      {numLabel}{caption ? ":" : ""}
                    </span>
                  )}
                  {caption && <span className="fx-figlist-caption" dir={entryRtl ? "rtl" : "ltr"}>{caption}</span>}
                  {showLeader && <span className="fx-figlist-leader" aria-hidden="true" />}
                </a>
              </li>
            )
          })}
        </ul>
      )}
    </nav>
  )
}
