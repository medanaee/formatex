import { Fragment } from "react"
import { Icon, digits, hueOf, resolveDir, textDir, textOf } from "formatex"

const PREFIXES: Record<string, { fa: string; en: string }> = {
  fig: { fa: "شکل", en: "Figure" },
  chart: { fa: "شکل", en: "Figure" },
  tree: { fa: "شکل", en: "Figure" },
  table: { fa: "جدول", en: "Table" },
  list: { fa: "فهرست", en: "List" },
  code: { fa: "کد", en: "Listing" },
  diff: { fa: "تغییرات", en: "Diff" },
  theorem: { fa: "قضیه", en: "Theorem" },
  lemma: { fa: "لم", en: "Lemma" },
  definition: { fa: "تعریف", en: "Definition" },
  corollary: { fa: "نتیجه", en: "Corollary" },
  example: { fa: "مثال", en: "Example" },
  remark: { fa: "نکته", en: "Remark" },
  exercise: { fa: "تمرین", en: "Exercise" },
}

function slugOf(id: string): string {
  return id.trim().toLowerCase().replace(/[^\p{L}\p{M}\p{N}_\- ]/gu, "").replace(/ /g, "-")
}

function referenceLabel(target: any, id: string, numbers: Map<string, number>, persian: boolean): string {
  if (!target) return id
  const val = numbers.get(target.key)
  if (target.type === "math") {
    const eqPersian = target.props?._eqDir === "rtl" || persian
    return val !== undefined ? `(${digits(val, eqPersian)})` : `(${id})`
  }
  if (target.type === "heading") {
    if (val !== undefined) {
      const n = digits(val, persian)
      return persian ? `بخش ${n}` : `Section ${n}`
    }
    return textOf(target) || id
  }
  const kind = target.name || target.type
  const prefix = PREFIXES[kind]
  if (prefix) {
    const name = persian ? prefix.fa : prefix.en
    return val !== undefined ? `${name} ${digits(val, persian)}` : name
  }
  return textOf(target) || id
}

export default function Component({ node, context }) {
  const p = context.props(node)
  const targetId = String(p.id ?? p.to ?? "")
  const target = context.targets.get(targetId) ?? context.targets.get(slugOf(targetId))
  const mode = String(p.mode ?? "inline") === "block" ? "block" : "inline"
  const iconName = String(p.icon ?? "circle-question")
  const rawColor = p.color ? String(p.color) : "accent"
  const paint = rawColor === "primary"
    ? { className: "fx-tint fx-tint-muted", style: {} }
    : hueOf(rawColor, "var(--accent)")

  const bodyText = textOf(node)
  const dir = mode === "inline"
    ? (p.dir === "rtl" || p.dir === "ltr"
      ? p.dir
      : (textDir(bodyText) ?? (node.props?._flow === "rtl" || node.props?._flow === "ltr"
        ? node.props._flow
        : (context.language === "fa" ? "rtl" : "ltr"))))
    : resolveDir(p.dir, bodyText, context.language)
  const persian = dir === "rtl"

  const title = p.title && String(p.title).trim()
    ? String(p.title)
    : referenceLabel(target, targetId, context.numbers, persian)
  const hrefId = target?.props?.id ? String(target.props.id) : (target ? slugOf(targetId) : targetId)
  const hasBody = bodyText.trim() !== ""

  if (mode === "block") {
    return (
      <div className={`fx-def-block ${paint.className}`} style={paint.style} dir={dir}>
        <div className="fx-def-head">
          <span className="fx-def-icon" aria-hidden="true"><Icon name={iconName} /></span>
          <a className="fx-def-title" href={`#${hrefId}`}>{title}</a>
        </div>
        {hasBody && <div className="fx-def-body">{context.children(node)}</div>}
      </div>
    )
  }

  const inlineBody = (node.children ?? []).map(child => (
    child.type === "paragraph"
      ? <Fragment key={child.key}>{context.children(child)}</Fragment>
      : <Fragment key={child.key}>{context.render(child)}</Fragment>
  ))

  return (
    <span className={`fx-def-inline ${paint.className}`} style={paint.style} dir={dir}>
      <span className="fx-def-icon" aria-hidden="true"><Icon name={iconName} /></span>
      <a className="fx-def-title" href={`#${hrefId}`}>{title}</a>
      {hasBody && <><span className="fx-def-colon">: </span><span className="fx-def-text">{inlineBody}</span></>}
    </span>
  )
}
