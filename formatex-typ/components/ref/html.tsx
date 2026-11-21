import { digits, textOf } from "formatex"

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

function findTarget(targets: Map<string, any>, id: string) {
  return targets.get(id) ?? targets.get(slugOf(id))
}

function referenceLabel(target: any, id: string, numbers: Map<string, number>, persian: boolean): string {
  if (!target) return id
  const val = numbers.get(target.key)
  if (target.type === "math") {
    const eqPersian = target.props?._eqDir === "rtl" || persian
    return val !== undefined ? `(${digits(val, eqPersian)})` : `(${id})`
  }
  if (target.type === "heading") {
    return textOf(target) || id
  }
  const kind = target.name || target.type
  const prefix = PREFIXES[kind]
  if (prefix) {
    if (val !== undefined) return `${persian ? prefix.fa : prefix.en} ${digits(val, persian)}`
    if (target.props?.caption) return String(target.props.caption)
    return persian ? prefix.fa : prefix.en
  }
  return textOf(target) || id
}

export default function Component({ node, context }) {
  const p = context.props(node)
  const targetId = String(p.to ?? p.id ?? "")
  const target = findTarget(context.targets, targetId)
  const flow = node.props?._flow === "rtl" || node.props?._flow === "ltr"
    ? node.props._flow
    : (context.language === "fa" ? "rtl" : "ltr")
  const persian = flow === "rtl"
  const hasChildren = Boolean(node.children?.length && textOf(node).trim() !== "")
  const label = hasChildren
    ? context.children(node)
    : (p.title ? String(p.title) : referenceLabel(target, targetId, context.numbers, persian))
  const hrefId = target?.props?.id ? String(target.props.id) : (target ? slugOf(targetId) : targetId)

  return (
    <a className="fx-ref" href={`#${hrefId}`}>
      {label}
    </a>
  )
}
