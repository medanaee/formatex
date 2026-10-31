import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react"
import { CircleAlert, File, Folder, FolderOpen, Info, TriangleAlert } from "lucide-react"
import type { ComponentKey, Copy } from "@/content"

const ORDER: ComponentKey[] = ["alert", "grid", "chart", "tree", "table", "steps", "code"]

/**
 * The eight themes of the app, with the colors of `formatex-typ/src/themes.typ`. Alerts and boxes tint their hue from the page,
 * the way `tinted()` in the engine does: 10% / 35% of the hue on light pages, 16% / 45% on dark ones.
 */
const THEMES = [
  { id: "paper", dark: false, bg: "#ffffff", fg: "#24292f", heading: "#1f3a5f", muted: "#6a737d", accent: "#2f6db5", secondary: "#2f6db5", rule: "#c4ccd4", codeBg: "#f6f8fa", codeStroke: "#d8dee4" },
  { id: "sepia", dark: false, bg: "#f4ecd8", fg: "#433422", heading: "#5b3a1a", muted: "#8a7356", accent: "#b08d57", secondary: "#b08d57", rule: "#5b4636", codeBg: "#ebe0c6", codeStroke: "#b8a382" },
  { id: "ocean", dark: false, bg: "#f5f9fc", fg: "#1d2b3a", heading: "#0b4f7c", muted: "#5d7489", accent: "#2b8cc4", secondary: "#2b8cc4", rule: "#0b4f7c", codeBg: "#e6f0f7", codeStroke: "#9cbcd6" },
  { id: "sage", dark: false, bg: "#f6faf6", fg: "#1f2e24", heading: "#14532d", muted: "#4f6957", accent: "#1b7d4a", secondary: "#1b7d4a", rule: "#8db599", codeBg: "#e8f2ea", codeStroke: "#b5d0bc" },
  { id: "midnight", dark: true, bg: "#0f1419", fg: "#d8dee4", heading: "#ffffff", muted: "#8b949e", accent: "#58a6ff", secondary: "#58a6ff", rule: "#6e7681", codeBg: "#161b22", codeStroke: "#30363d" },
  { id: "nord", dark: true, bg: "#2e3440", fg: "#e5e9f0", heading: "#88c0d0", muted: "#a3adc2", accent: "#81a1c1", secondary: "#81a1c1", rule: "#7b88a1", codeBg: "#3b4252", codeStroke: "#4c566a" },
  { id: "zinc", dark: true, bg: "#0e0d0d", fg: "#d4d4d8", heading: "#dbe6f5", muted: "#a1a1aa", accent: "#519fff", secondary: "#a1a1aa", rule: "#52525b", codeBg: "#1b1b1b", codeStroke: "#27272a" },
  { id: "dracula", dark: true, bg: "#282a36", fg: "#f8f8f2", heading: "#bd93f9", muted: "#a4a9c8", accent: "#ff79c6", secondary: "#ff79c6", rule: "#6272a4", codeBg: "#21222c", codeStroke: "#44475a" },
]
const STEP = 360 / THEMES.length

/** Tailwind 500 hues of the alert types (`box-types` in components/alert.typ). */
const HUES = { info: "#3b82f6", warn: "#eab308", green: "#22c55e", purple: "#a855f7", teal: "#14b8a6" }

function Alert({ kind, text }: { kind: "info" | "warn"; text: string }) {
  const Icon = kind === "info" ? Info : TriangleAlert
  return (
    <div className="c-alert" style={{ "--h": HUES[kind] } as CSSProperties}>
      <Icon className="size-[1.15em] shrink-0" />
      <span>{text}</span>
    </div>
  )
}

function Part({ kind, parts }: { kind: ComponentKey; parts: Copy["library"]["parts"] }) {
  switch (kind) {
    case "alert":
      return (
        <div className="grid gap-2.5">
          <Alert kind="info" text={parts.info} />
          <Alert kind="warn" text={parts.warn} />
        </div>
      )
    case "grid":
      return (
        <div className="c-grid">
          {parts.grid.map((box, i) => (
            <div key={box.title} className="c-box" style={{ "--h": [HUES.green, HUES.info, HUES.purple][i] } as CSSProperties}>
              <b>{box.title}</b>
              <span>{box.text}</span>
            </div>
          ))}
        </div>
      )
    case "chart": {
      const values = parts.chart.values.map((value) => Number(value.replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))))
      const top = Math.max(...values)
      return (
        <figure className="c-chart">
          <div className="plot">
            {values.map((value, i) => (
              <div key={parts.chart.labels[i]} className="col">
                <span className="val">{parts.chart.values[i]}</span>
                <i style={{ height: `${(value / top) * 100}%` }} />
              </div>
            ))}
          </div>
          <div className="labels">
            {parts.chart.labels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
          <figcaption>{parts.chart.caption}</figcaption>
        </figure>
      )
    }
    case "tree":
      return (
        <div className="c-tree" dir="ltr">
          <ul>
            <li>
              <FolderOpen className="size-[1em]" />
              project
              <ul>
                <li>
                  <File className="size-[1em]" />
                  main.md
                </li>
                <li>
                  <File className="size-[1em]" />
                  config.toml
                </li>
                <li>
                  <Folder className="size-[1em]" />
                  img
                </li>
              </ul>
            </li>
          </ul>
        </div>
      )
    case "table":
      return (
        <figure className="c-table">
          <table>
            <thead>
              <tr>
                <th>{parts.table.head[0]}</th>
                <th>{parts.table.head[1]}</th>
              </tr>
            </thead>
            <tbody>
              {parts.table.rows.map(([a, b]) => (
                <tr key={a}>
                  <td>{a}</td>
                  <td>{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <figcaption>{parts.table.caption}</figcaption>
        </figure>
      )
    case "steps":
      return (
        <ol className="c-steps">
          {parts.steps.map((step) => (
            <li key={step}>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      )
    case "code":
      return (
        <pre className="c-code" dir="ltr">
          <span className="lang">python</span>
          <span className="k">def</span> total(rows):{"\n"}
          {"    "}
          <span className="k">return</span> <span className="f">sum</span>(r.sales <span className="k">for</span> r <span className="k">in</span> rows)
        </pre>
      )
  }
}

/** The component library as a toy: switch tags on, turn the dial through the app's real themes, and the sheet is set live. */
export function Library({ t }: { t: Copy["library"] }) {
  const [on, setOn] = useState<ComponentKey[]>([])
  const [theme, setTheme] = useState(0)
  const [angle, setAngle] = useState<number | null>(null)
  const section = useRef<HTMLElement>(null)
  const dial = useRef<HTMLDivElement>(null)
  const played = useRef(false)
  const dragging = useRef(false)

  // Once, when it comes into view, the demo plays by itself so it is clearly alive
  useEffect(() => {
    const node = section.current
    if (!node) return
    const timers: ReturnType<typeof setTimeout>[] = []
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || played.current) return
        played.current = true
        const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches
        const toggle = (key: ComponentKey) => setOn((list) => (list.includes(key) ? list : [...list, key]))
        ;(["alert", "grid", "chart", "table"] as const).forEach((key, i) => timers.push(setTimeout(() => toggle(key), reduced ? 0 : 500 + i * 420)))
        ;[4, 2].forEach((index, i) => timers.push(setTimeout(() => !dragging.current && setTheme(index), reduced ? 0 : 2600 + i * 1200)))
      },
      { threshold: 0.35 },
    )
    observer.observe(node)
    return () => {
      observer.disconnect()
      timers.forEach(clearTimeout)
    }
  }, [])

  const flip = (key: ComponentKey) => setOn((list) => (list.includes(key) ? list.filter((k) => k !== key) : [...list, key]))
  const angleOf = (event: ReactPointerEvent) => {
    const rect = dial.current!.getBoundingClientRect()
    return ((Math.atan2(event.clientY - (rect.top + rect.height / 2), event.clientX - (rect.left + rect.width / 2)) * 180) / Math.PI + 90 + 360) % 360
  }
  const onMove = (event: ReactPointerEvent) => {
    if (!dragging.current) return
    const a = angleOf(event)
    setAngle(a)
    setTheme(Math.round(a / STEP) % THEMES.length)
  }
  const th = THEMES[theme]
  const sheetStyle = {
    "--bg": th.bg,
    "--fg": th.fg,
    "--hd": th.heading,
    "--mu": th.muted,
    "--ac": th.accent,
    "--sec": th.secondary,
    "--rule": th.rule,
    "--cbg": th.codeBg,
    "--cst": th.codeStroke,
    "--tf": th.dark ? "16%" : "10%",
    "--tb": th.dark ? "45%" : "35%",
    "--ti": th.dark ? "white 30%" : "black 15%",
  } as CSSProperties

  return (
    <section id="try" ref={section} className="mx-auto max-w-6xl px-[clamp(20px,5vw,48px)] py-28">
      <span className="eyebrow">{t.eyebrow}</span>
      <h2 className="h2">{t.title}</h2>
      <p className="lead">{t.text}</p>

      <div className="kitchen">
        <div className="panel">
          <h3>
            <span dir="ltr">
              {on.length} / {ORDER.length}
            </span>
            <span>{t.count}</span>
          </h3>
          <div className="tags">
            {ORDER.map((key) => (
              <button key={key} type="button" className="tag mono" aria-pressed={on.includes(key)} onClick={() => flip(key)}>
                &lt;{key}&gt;
              </button>
            ))}
          </div>

          <div className="dialwrap">
            <div
              ref={dial}
              className="dial"
              data-drag={angle !== null}
              onPointerDown={(event) => {
                dragging.current = true
                event.currentTarget.setPointerCapture(event.pointerId)
                setAngle(angleOf(event))
              }}
              onPointerMove={onMove}
              onPointerUp={() => {
                dragging.current = false
                setAngle(null)
              }}
            >
              <svg viewBox="0 0 132 132" aria-hidden="true">
                {THEMES.map((item, i) => {
                  const a = ((i * STEP - 90) * Math.PI) / 180
                  return <circle key={item.id} cx={66 + Math.cos(a) * 62} cy={66 + Math.sin(a) * 62} r={5} fill={item.bg} stroke={item.accent} strokeWidth={2.5} />
                })}
              </svg>
              <div className="knob" style={{ transform: `rotate(${angle ?? theme * STEP}deg)` }} />
            </div>
            <div className="themes">
              {t.themes.map((name, i) => (
                <button key={name} type="button" style={{ "--c": THEMES[i].bg, "--r": THEMES[i].accent } as CSSProperties} aria-pressed={theme === i} onClick={() => setTheme(i)}>
                  <i />
                  {name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="paper" style={sheetStyle}>
          <span className="stamp mono">{th.id.toUpperCase()}</span>
          <h2>{t.sheet.title}</h2>
          <p className="body">{t.sheet.body}</p>
          {ORDER.filter((key) => on.includes(key)).map((key) => (
            <div className="cmp" key={key}>
              <Part kind={key} parts={t.parts} />
            </div>
          ))}
          {on.length === 0 && (
            <div className="empty">
              <CircleAlert className="mx-auto mb-2 size-5" />
              {t.pick}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
