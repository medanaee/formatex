import { digits, flowDir, Icon, paintOf } from "formatex"

const ABJAD = ["الف", "ب", "ج", "د", "ه", "و", "ز", "ح", "ط", "ی", "ک", "ل", "م", "ن", "س", "ع", "ف", "ص", "ق", "ر", "ش", "ت", "ث", "خ", "ذ", "ض", "ظ", "غ"]

function rtlOf(dir, language) {
  return dir === "rtl" || (dir !== "ltr" && language === "fa")
}

function modeOf(value, settings) {
  const own = value ?? settings.answers ?? "show"
  return own === "hide" || own === "end" ? own : "show"
}

export default function Component({ node, context }) {
  const p = context.props(node)
  const dir = flowDir(p.dir)
  const rtl = rtlOf(dir, context.language)
  if (node.name === "answer") return null
  if (node.name === "choices") return <Choices node={node} context={context} dir={dir} rtl={rtl} />
  if (node.name === "answers") return <Answers node={node} context={context} dir={dir} rtl={rtl} title={p.title ? String(p.title) : ""} />
  const feel = String(context.document.settings.feel ?? "formal")
  const mode = modeOf(p.answers, context.document.settings)
  const number = context.numbers.get(node.key)
  const title = p.title ? String(p.title) : ""
  const word = p.name ? String(p.name) : rtl ? "تمرین" : "Exercise"
  const points = p.points
  const answers = (node.children ?? []).filter(child => child.name === "answer")
  const question = (node.children ?? []).filter(child => child.name !== "answer")
  const green = paintOf("green")
  return (
    <section id={p.id ? String(p.id) : undefined} dir={dir} className={`fx-exercise fx-exercise-${feel}`}>
      <header className="fx-exercise-head">
        <span>{word}{number !== undefined ? ` ${digits(number, rtl)}` : ""}{title ? ` (${title})` : ""}{feel === "formal" ? "." : ""}</span>
        {points !== undefined && points !== null && points !== "" && <span className="fx-exercise-points">{rtl ? digits(Number(points), true) : String(points)} {rtl ? "نمره" : Number(points) === 1 ? "point" : "points"}</span>}
      </header>
      <div className="fx-exercise-question">{question.map(child => context.render(child))}</div>
      {mode === "show" && answers.map((answer, index) => (
        <div key={answer.key} className={`fx-exercise-answer${index === answers.length - 1 ? " fx-exercise-answer-last" : ""}${feel === "formal" ? "" : ` ${green.className}`}`} style={feel === "formal" ? undefined : green.style}>
          <div className="fx-exercise-answer-label">{feel !== "formal" && <Icon name="circle-check" />}{rtl ? "پاسخ" : "Answer"}</div>
          <div className="fx-exercise-answer-body">{context.children(answer)}</div>
        </div>
      ))}
    </section>
  )
}

function Choices({ node, context, dir, rtl }) {
  const p = context.props(node)
  const list = node.children?.find(child => child.type === "list")
  const items = list?.children ?? []
  const letters = p.numbers === "number" || p.numbers === "numbers"
  const correct = String(p.correct ?? "").split(/[,;\s]+/).filter(Boolean)
  const show = modeOf(undefined, context.document.settings) === "show"
  const cols = Math.max(1, Number(p.cols ?? 1))
  return (
    <ol dir={dir} className="fx-choices" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {items.map((item, index) => {
        const hit = show && correct.includes(String(index + 1))
        const mark = letters ? (rtl ? digits(index + 1, true) : String(index + 1)) : rtl ? ABJAD[index] ?? String(index + 1) : String.fromCharCode(97 + (index % 26))
        return (
          <li key={item.key} className={`fx-choice${hit ? " fx-choice-correct" : ""}`}>
            <span className="fx-choice-mark">{mark}</span>
            <div>{context.children(item)}</div>
          </li>
        )
      })}
    </ol>
  )
}

function Answers({ node, context, dir, rtl, title }) {
  const found = []
  const walk = nodes => {
    for (const child of nodes ?? []) {
      if (child.name === "exercise" && modeOf(child.props?.answers, context.document.settings) === "end") found.push(child)
      if (child.children) walk(child.children)
    }
  }
  walk(context.document.children)
  return (
    <section id={node.props?.id ? String(node.props.id) : undefined} dir={dir} className="fx-answers">
      <h2>{title || (rtl ? "پاسخ‌ها" : "Answers")}</h2>
      {found.map(exercise => {
        const word = exercise.props?.name ? String(exercise.props.name) : rtl ? "تمرین" : "Exercise"
        const number = context.numbers.get(exercise.key)
        const answers = (exercise.children ?? []).filter(child => child.name === "answer")
        return (
          <p key={exercise.key}><strong>{word}{number !== undefined ? ` ${digits(number, rtl)}` : ""}.</strong> {answers.map(answer => context.children(answer))}</p>
        )
      })}
    </section>
  )
}
