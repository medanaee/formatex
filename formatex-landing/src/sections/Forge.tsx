import { useEffect, useMemo, useState, type CSSProperties } from "react"
import { Info, Pencil } from "lucide-react"
import type { Copy } from "@/content"

/** HSL to a hex color, so the tokens can be shown the way a theme file would hold them. */
function hex(h: number, s: number, l: number) {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const c = l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(255 * c)
      .toString(16)
      .padStart(2, "0")
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

/** The nine tokens of a dark theme, from one hue. */
function tokens(h: number) {
  return [hex(h, 22, 9), hex(h, 15, 85), hex(h, 40, 96), hex(h, 10, 62), hex(h, 85, 68), hex(h, 85, 68), hex(h, 10, 40), hex(h, 22, 12), hex(h, 18, 20)]
}

/** Theme and component of your own, side by side with the page they change. */
export function Forge({ t }: { t: Copy["forge"] }) {
  const [hue, setHue] = useState(262)
  const [touched, setTouched] = useState(false)
  const [stamp, setStamp] = useState(t.stamp)
  const [seed, setSeed] = useState(0)
  // The sample text follows the language, until the visitor types their own
  useEffect(() => setStamp(t.stamp), [t.stamp])
  const [bg, fg, heading, muted, accent, secondary, rule, codeBg, codeStroke] = useMemo(() => tokens(hue), [hue])
  const style = {
    "--bg": bg,
    "--fg": fg,
    "--hd": heading,
    "--mu": muted,
    "--ac": accent,
    "--sec": secondary,
    "--rule": rule,
    "--cbg": codeBg,
    "--cst": codeStroke,
    "--tf": "16%",
    "--tb": "45%",
    "--ti": "white 30%",
  } as CSSProperties
  const list = [bg, fg, heading, muted, accent, secondary, rule, codeBg, codeStroke]

  return (
    <section id="forge" className="mx-auto max-w-[1320px] px-[clamp(30px,4vw,48px)] py-28">
      <span className="eyebrow">{t.eyebrow}</span>
      <h2 className="h2 max-w-3xl">{t.title}</h2>
      <p className="lead">{t.text}</p>

      <div className="forge">
        <div className="panel">
          <h3>
            <span>{t.themeTitle}</span>
            <span dir="ltr">{hex(hue, 60, 45)}</span>
          </h3>
          <p className="forge-note">{t.themeText}</p>
          <div className="swatches" dir="ltr">
            {list.map((color, i) => (
              <div key={t.tokens[i]} className="sw">
                <i style={{ background: color }} />
                <span className="mono">{t.tokens[i]}</span>
                <span className="mono dim">{color}</span>
              </div>
            ))}
          </div>
          <label className="slider">
            <span>{t.hue}</span>
            <input type="range" min={0} max={359} value={hue} onChange={(event) => setHue(Number(event.target.value))} aria-label={t.hue} />
          </label>
        </div>

        <div className="paper forge-sheet" style={style}>
          <h2>{t.sample.title}</h2>
          <p className="body">{t.sample.body}</p>
          <div className="cmp !animate-none">
            <div className="c-alert" style={{ "--h": "#3b82f6" } as CSSProperties}>
              <Info className="size-[1.15em] shrink-0" />
              <span>{t.componentText}</span>
            </div>
          </div>
          <div className="cmp !animate-none">
            <pre className="c-code" dir="ltr">
              <span className="lang">typ</span>
              <span className="k">#let</span> <span className="f">theme</span> = (accent: <span className="k">rgb</span>(<span className="s">"{accent}"</span>))
            </pre>
          </div>
          <span key={seed + stamp} className="stampc" style={{ borderColor: accent, color: accent }}>
            {stamp || "…"}
          </span>
        </div>

        <div className="panel">
          <h3>
            <span>{t.componentTitle}</span>
            <span dir="ltr">stamp.typ</span>
          </h3>
          <p className="forge-note">{t.componentText}</p>
          <pre className="c-code forge-code" dir="ltr">
            <span className="k">#let</span> stamp-tags = ({"\n"}
            {"  "}stamp: (attrs, body) =&gt;{"\n"}
            {"    "}<span className="f">rotate</span>(-8deg, <span className="f">box</span>({"\n"}
            {"      "}stroke: 1.5pt + theme.accent,{"\n"}
            {"      "}inset: 6pt, radius: 4pt,{"\n"}
            {"      "}<span className="f">text</span>(fill: theme.accent, body){"\n"}
            {"    "})),{"\n"}
            )
          </pre>
          <div className="stamp-wrap">
            <span className="stamp-hint">
              <Pencil className="size-3.5" />
              {t.type}
            </span>
            <label className="stamp-field" data-pulse={!touched} dir="ltr">
              <span className="mono k">&lt;stamp&gt;</span>
              <input
                value={stamp}
                maxLength={16}
                onChange={(event) => {
                  setTouched(true)
                  setStamp(event.target.value)
                  setSeed((n) => n + 1)
                }}
                aria-label={t.label}
                dir="auto"
                spellCheck={false}
                placeholder="…"
              />
              <span className="mono k">&lt;/stamp&gt;</span>
            </label>
          </div>
        </div>
      </div>
    </section>
  )
}
