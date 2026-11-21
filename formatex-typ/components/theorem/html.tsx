import { digits, flowDir } from "formatex"

const KINDS = {
  definition: { fa: "تعریف", en: "Definition", numbered: true, style: "boxed", tone: "accent" },
  theorem: { fa: "قضیه", en: "Theorem", numbered: true, style: "boxed", tone: "heading" },
  lemma: { fa: "لم", en: "Lemma", numbered: true, style: "boxed", tone: "heading" },
  corollary: { fa: "نتیجه", en: "Corollary", numbered: true, style: "boxed", tone: "accent" },
  example: { fa: "مثال", en: "Example", numbered: true, style: "plain", tone: "accent" },
  remark: { fa: "نکته", en: "Remark", numbered: true, style: "plain", tone: "accent" },
  proof: { fa: "اثبات", en: "Proof", numbered: false, style: "proof", tone: "muted" },
}

export default function Component({ node, context }) {
  const p = context.props(node)
  const spec = KINDS[node.name] ?? KINDS.theorem
  const dir = flowDir(p.dir)
  const rtl = dir === "rtl" || (dir !== "ltr" && context.language === "fa")
  const number = context.numbers.get(node.key)
  const title = p.title ? String(p.title) : ""
  return (
    <section id={p.id ? String(p.id) : undefined} dir={dir} className={`fx-theorem fx-theorem-${spec.style} fx-theorem-${node.name} fx-theorem-${spec.tone}`}>
      <span className="fx-theorem-bar" aria-hidden="true" />
      <div className="fx-theorem-main">
        <header>
          {rtl ? spec.fa : spec.en}
          {spec.numbered && number !== undefined ? ` ${digits(number, rtl)}` : ""}
          {title ? ` (${title})` : ""}.
        </header>
        <div className="fx-theorem-body">
          {context.children(node)}
          {spec.style === "proof" && <span className="fx-qed">∎</span>}
        </div>
      </div>
    </section>
  )
}
