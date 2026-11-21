import {
  arabicScript,
  captionPosition,
  digits,
  formatNumber,
  lengthCss,
  parseNumeric,
  presetHex,
  resolveDir,
  textOf,
} from "formatex"

const CHART_TYPES = new Set(["bar", "line", "pie", "donut"])

function parseCsv(text) {
  const rows = []
  let row = []
  let cell = ""
  let inQuotes = false
  const src = String(text ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i]
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        cell += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ",") {
      row.push(cell.trim())
      cell = ""
    } else if (ch === "\n") {
      row.push(cell.trim())
      if (row.some(c => c !== "")) rows.push(row)
      row = []
      cell = ""
    } else {
      cell += ch
    }
  }
  row.push(cell.trim())
  if (row.some(c => c !== "")) rows.push(row)
  return rows
}

function findTableNode(nodes) {
  for (const n of nodes ?? []) {
    if (n.type === "table") return n
    if (n.children) {
      const found = findTableNode(n.children)
      if (found) return found
    }
  }
  return null
}

function extractChartData(node, context, p) {
  let rawRows
  if (p.src) {
    const csvText = context.asset(String(p.src), true)
    rawRows = parseCsv(csvText)
  } else {
    const table = findTableNode(node.children)
    if (!table) {
      throw new Error('<chart> needs a Markdown table inside it, or src="data.csv"')
    }
    rawRows = (table.children ?? [])
      .filter(r => r.type === "tableRow")
      .map(r => (r.children ?? []).map(cell => textOf(cell).trim()))
  }
  if (!rawRows || rawRows.length < 2 || (rawRows[0]?.length ?? 0) < 2) {
    throw new Error("<chart> needs a header row, at least one data row, a label column and at least one value column")
  }
  const header = rawRows[0]
  const dataRows = rawRows.slice(1)
  const labels = dataRows.map(r => String(r[0] ?? ""))
  const series = header.slice(1).map((seriesName, sIdx) => {
    const colIndex = sIdx + 1
    const values = dataRows.map(row => {
      const cellText = String(row[colIndex] ?? "").trim()
      if (!cellText) return null
      const num = parseNumeric(cellText)
      if (num === undefined) {
        throw new Error(`<chart> column "${seriesName}" expects a number, got "${cellText}"`)
      }
      return num
    })
    return { name: String(seriesName ?? ""), values }
  })
  return { labels, series }
}

function chartScale(lo, hi) {
  const topValue = hi === lo ? lo + 1 : hi
  const raw = (topValue - lo) / 5
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const norm = raw / mag
  const step = mag * (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10)
  return {
    bottom: Math.floor(lo / step + 1e-9) * step,
    top: Math.ceil(topValue / step - 1e-9) * step,
    step,
  }
}

function parsePt(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback
  const m = /^\s*([0-9]*\.?[0-9]+)\s*(pt|px|em|rem|mm|cm|in)?\s*$/.exec(String(value))
  if (!m) return fallback
  const n = Number(m[1])
  const u = m[2] ?? "pt"
  if (u === "pt") return n
  if (u === "px") return n * 0.75
  if (u === "em" || u === "rem") return n * 10
  if (u === "mm") return n * 2.83465
  if (u === "cm") return n * 28.3465
  if (u === "in") return n * 72
  return fallback
}

function hexLuma(hex) {
  const clean = String(hex ?? "").replace(/^#/, "")
  if (clean.length !== 6) return 0.35
  const r = parseInt(clean.slice(0, 2), 16) / 255
  const g = parseInt(clean.slice(2, 4), 16) / 255
  const b = parseInt(clean.slice(4, 6), 16) / 255
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function lightenHex(hex, amount = 0.12) {
  const clean = String(hex ?? "").replace(/^#/, "")
  if (clean.length !== 6) return hex
  const mix = ch => Math.round(parseInt(ch, 16) * (1 - amount) + 255 * amount)
  const r = mix(clean.slice(0, 2)).toString(16).padStart(2, "0")
  const g = mix(clean.slice(2, 4)).toString(16).padStart(2, "0")
  const b = mix(clean.slice(4, 6)).toString(16).padStart(2, "0")
  return `#${r}${g}${b}`
}

const STD_PALETTE_HEX = ["accent", "#14b8a6", "#ec4899", "#eab308", "#a855f7", "#22c55e", "#ef4444", "#3b82f6"]

function resolveCustomColors(rawColors, accentHex, isDark) {
  if (!rawColors) return null
  const items = String(rawColors).split(",").map(c => c.trim()).filter(Boolean)
  if (!items.length) return null
  return items.map(c => {
    let baseHex = accentHex
    let css = "var(--accent)"
    if (c === "accent") {
      baseHex = accentHex
      css = isDark ? "color-mix(in srgb, var(--accent) 88%, #ffffff 12%)" : "var(--accent)"
    } else if (c.startsWith("#")) {
      baseHex = c
      css = isDark ? `color-mix(in srgb, ${c} 88%, #ffffff 12%)` : c
    } else {
      const hex = presetHex(c)
      if (!hex) {
        throw new Error(`<chart> colors: unknown color "${c}"`)
      }
      baseHex = hex
      css = isDark ? `color-mix(in srgb, ${hex} 88%, #ffffff 12%)` : hex
    }
    const effectiveHex = isDark ? lightenHex(baseHex, 0.12) : baseHex
    const light = hexLuma(effectiveHex) > 0.58
    return { css, ink: light !== isDark ? "var(--fg)" : "var(--bg)" }
  })
}

function pieSlicePath(cx, cy, radius, hole, side, a0Deg, sweepDeg, sliceGap, corner) {
  const a0 = (a0Deg * Math.PI) / 180
  const sweep = (sweepDeg * Math.PI) / 180
  const half = Math.sin(sweep / 2)
  const inner = hole > 0 ? hole : radius
  const t = Math.min(corner, inner * half * 0.35, (radius - hole) / 4)
  const e = t + Math.min(sliceGap, inner * half * 0.3) / 2
  const outerD = Math.max(1, radius - t)
  const da = Math.asin(Math.min(0.98, Math.max(0, e / outerD)))
  const pt = (d, a) => [cx + side * d * Math.cos(a), cy + d * Math.sin(a)]
  const arcPts = (d, from, to) => {
    const steps = Math.max(2, Math.ceil(Math.abs(((to - from) * 180) / Math.PI) / 2))
    const out = []
    for (let j = 0; j <= steps; j += 1) {
      out.push(pt(d, from + ((to - from) * j) / steps))
    }
    return out
  }
  const pts = arcPts(outerD, a0 + da, a0 + sweep - da)
  if (hole > 0) {
    const innerD = hole + t
    const di = Math.asin(Math.min(0.98, Math.max(0, e / innerD)))
    pts.push(...arcPts(innerD, a0 + sweep - di, a0 + di))
  } else {
    pts.push(pt(half > 0.001 ? e / half : 0, a0 + sweep / 2))
  }
  const d = pts
    .map((p, idx) => `${idx === 0 ? "M" : "L"}${p[0].toFixed(2)} ${p[1].toFixed(2)}`)
    .join(" ") + " Z"
  return { d, strokeWidth: t > 0 ? Number((2 * t).toFixed(2)) : 0 }
}

function roundedBarPath(x, y, w, h, r, topRounded) {
  const rad = Math.max(0, Math.min(r, w / 2, h / 2))
  if (rad <= 0.05 || h <= 0.1) {
    return `M${x.toFixed(2)} ${y.toFixed(2)} h${w.toFixed(2)} v${h.toFixed(2)} h${(-w).toFixed(2)} Z`
  }
  if (topRounded) {
    return [
      `M${x.toFixed(2)} ${(y + h).toFixed(2)}`,
      `V${(y + rad).toFixed(2)}`,
      `Q${x.toFixed(2)} ${y.toFixed(2)} ${(x + rad).toFixed(2)} ${y.toFixed(2)}`,
      `H${(x + w - rad).toFixed(2)}`,
      `Q${(x + w).toFixed(2)} ${y.toFixed(2)} ${(x + w).toFixed(2)} ${(y + rad).toFixed(2)}`,
      `V${(y + h).toFixed(2)}`,
      "Z",
    ].join(" ")
  }
  return [
    `M${x.toFixed(2)} ${y.toFixed(2)}`,
    `V${(y + h - rad).toFixed(2)}`,
    `Q${x.toFixed(2)} ${(y + h).toFixed(2)} ${(x + rad).toFixed(2)} ${(y + h).toFixed(2)}`,
    `H${(x + w - rad).toFixed(2)}`,
    `Q${(x + w).toFixed(2)} ${(y + h).toFixed(2)} ${(x + w).toFixed(2)} ${(y + h - rad).toFixed(2)}`,
    `V${y.toFixed(2)}`,
    "Z",
  ].join(" ")
}

export default function Component({ node, context }) {
  const p = context.props(node)
  const kind = String(p.type ?? "bar")
  if (!CHART_TYPES.has(kind)) {
    throw new Error(`<chart> type must be one of bar, line, pie, donut, got "${kind}"`)
  }
  const valuesAttr = String(p.values ?? "false")
  if (valuesAttr !== "true" && valuesAttr !== "false") {
    throw new Error(`<chart> values must be one of true, false, got "${valuesAttr}"`)
  }
  const legendAttr = String(p.legend ?? "auto")
  if (legendAttr !== "auto" && legendAttr !== "true" && legendAttr !== "false") {
    throw new Error(`<chart> legend must be one of auto, true, false, got "${legendAttr}"`)
  }
  const dirAttr = String(p.dir ?? "auto")
  if (dirAttr !== "auto" && dirAttr !== "rtl" && dirAttr !== "ltr") {
    throw new Error(`<chart> dir must be rtl, ltr or auto, got "${dirAttr}"`)
  }

  const data = extractChartData(node, context, p)
  const round = kind === "pie" || kind === "donut"
  if (round && data.series.length !== 1) {
    throw new Error(`<chart type="${kind}"> takes one value column, got ${data.series.length}`)
  }

  const showValues = valuesAttr === "true"
  const showLegend = legendAttr === "auto" ? (round || data.series.length > 1) : legendAttr === "true"
  const unit = p.unit !== undefined && p.unit !== null && String(p.unit) !== "" ? String(p.unit) : undefined
  const caption = p.caption ? String(p.caption) : ""
  const sample = caption || data.labels.join(" ")
  const inheritedDir = node.props?._dir === "rtl" || node.props?._dir === "ltr" ? node.props._dir : undefined
  const dir = dirAttr === "rtl" || dirAttr === "ltr"
    ? dirAttr
    : (sample && /\p{L}/u.test(sample) ? resolveDir("auto", sample, context.language) : (inheritedDir ?? (context.document.settings.dir === "rtl" || context.language === "fa" ? "rtl" : "ltr")))
  const rtl = dir === "rtl"

  const accentHex = String(context.document.tokens?.accent ?? "#2563eb")
  const isDark = Boolean(context.document.tokens?.dark)
  const feelName = String(context.document.settings?.feel ?? context.document.tokens?.["feel-name"] ?? "formal")
  const customColors = resolveCustomColors(p.colors, accentHex, isDark)
  const paletteMod = feelName === "formal" ? 6 : 8
  const colorVar = idx => customColors
    ? customColors[idx % customColors.length].css
    : `var(--fx-chart-${idx % paletteMod})`
  const sliceInkVar = idx => {
    if (customColors) {
      return customColors[idx % customColors.length].ink
    }
    if (feelName === "formal") {
      return `var(--fx-chart-ink-${idx % 6})`
    }
    const rawHex = STD_PALETTE_HEX[idx % 8] === "accent" ? accentHex : STD_PALETTE_HEX[idx % 8]
    const effectiveHex = isDark ? lightenHex(rawHex, 0.12) : rawHex
    const light = hexLuma(effectiveHex) > 0.58
    return light !== isDark ? "var(--fg)" : "var(--bg)"
  }

  const fullH = parsePt(p.height, round ? 150 : 170)
  const heightCss = lengthCss(p.height ?? (round ? "150pt" : "170pt")) ?? (round ? "15em" : "17em")
  const widthRaw = String(p.width ?? "100%").trim()
  const widthCss = lengthCss(widthRaw) ?? "100%"

  let plotSvg
  if (round) {
    const rawValues = data.series[0].values.map(v => v ?? 0)
    if (rawValues.some(v => v < 0)) {
      throw new Error(`<chart type="${kind}"> values must not be negative`)
    }
    const total = rawValues.reduce((acc, v) => acc + v, 0)
    if (total <= 0) {
      throw new Error(`<chart type="${kind}"> needs at least one value above zero`)
    }
    const fullW = fullH
    const radius = fullH / 2 - 2
    const cx = fullW / 2
    const cy = fullH / 2
    const side = rtl ? -1 : 1

    const feelProfiles = [
      { name: "formal", gap: 0.8, corner: 0, holeRatio: 0.5 },
      { name: "standard", gap: 1.6, corner: 2, holeRatio: 0.54 },
      { name: "friendly", gap: 3, corner: 4.5, holeRatio: 0.58 },
    ]

    const labelNodes = []
    let startAngle = -90
    rawValues.forEach((v, i) => {
      if (v <= 0) return
      const sweep = (v / total) * 360
      if (sweep >= 22) {
        const midRad = ((startAngle + sweep / 2) * Math.PI) / 180
        const labelR = kind === "donut" ? (radius + radius * 0.54) / 2 : radius * 0.62
        const lx = cx + side * labelR * Math.cos(midRad)
        const ly = cy + labelR * Math.sin(midRad)
        const pct = Math.round((v / total) * 1000) / 10
        labelNodes.push(
          <text
            key={`lbl-${i}`}
            x={lx.toFixed(2)}
            y={ly.toFixed(2)}
            textAnchor="middle"
            dominantBaseline="central"
            className={`fx-chart-slice-label${kind === "donut" ? " fx-chart-slice-label-donut" : ""}`}
            style={{ fill: sliceInkVar(i) }}
          >
            {formatNumber(pct, rtl, "%")}
          </text>
        )
      }
      startAngle += sweep
    })

    plotSvg = (
      <svg
        className="fx-chart-svg fx-chart-svg-round"
        dir="ltr"
        viewBox={`0 0 ${fullW} ${fullH}`}
        style={{ height: heightCss, width: "auto", maxWidth: "100%" }}
      >
        {feelProfiles.map(prof => {
          let ang = -90
          const hole = kind === "donut" ? radius * prof.holeRatio : 0
          return (
            <g key={prof.name} className={`fx-chart-feel-${prof.name}`}>
              {rawValues.map((v, i) => {
                if (v <= 0) return null
                const sweep = (v / total) * 360
                const { d, strokeWidth } = pieSlicePath(cx, cy, radius, hole, side, ang, sweep, prof.gap, prof.corner)
                ang += sweep
                const c = colorVar(i)
                return (
                  <path
                    key={i}
                    d={d}
                    fill={c}
                    stroke={strokeWidth > 0 ? c : "none"}
                    strokeWidth={strokeWidth > 0 ? strokeWidth : undefined}
                    strokeLinejoin={strokeWidth > 0 ? "round" : undefined}
                  />
                )
              })}
            </g>
          )
        })}
        {labelNodes}
        {kind === "donut" && showValues && (
          <text
            x={cx}
            y={cy}
            textAnchor="middle"
            dominantBaseline="central"
            className="fx-chart-donut-total"
          >
            {formatNumber(total, rtl, unit)}
          </text>
        )}
      </svg>
    )
  } else {
    const allValues = data.series.flatMap(s => s.values).filter(v => v !== null)
    if (!allValues.length) {
      throw new Error("<chart> has no values")
    }
    const minGiven = p.min !== undefined && p.min !== null && String(p.min) !== "" ? parseNumeric(p.min) : undefined
    const maxGiven = p.max !== undefined && p.max !== null && String(p.max) !== "" ? parseNumeric(p.max) : undefined
    const lo = minGiven !== undefined ? minGiven : kind === "bar" ? Math.min(0, ...allValues) : Math.min(...allValues)
    const hi = maxGiven !== undefined ? maxGiven : kind === "bar" ? Math.max(0, ...allValues) : Math.max(...allValues)
    const scaleLo = kind === "line" && showValues && minGiven === undefined ? lo - (hi - lo) * 0.12 : lo
    const axis = chartScale(scaleLo, hi)
    const axisMin = minGiven !== undefined ? lo : axis.bottom
    const axisMax = maxGiven !== undefined ? hi : axis.top
    if (!(axisMax > axisMin)) {
      throw new Error("<chart> max must be greater than min")
    }

    const ticks = []
    const kStart = Math.ceil(axisMin / axis.step - 1e-9)
    const kEnd = Math.floor(axisMax / axis.step + 1e-9)
    for (let k = kStart; k <= kEnd; k += 1) {
      const val = Number((k * axis.step).toFixed(8))
      ticks.push({ value: val, label: formatNumber(val, rtl, unit) })
    }

    const fullW = widthRaw.endsWith("%")
      ? 515 * (Math.min(100, Math.max(25, parseFloat(widthRaw) || 100)) / 100)
      : parsePt(widthRaw, 515)
    const xTitle = p["x-title"] ? String(p["x-title"]) : ""
    const yTitle = p["y-title"] ? String(p["y-title"]) : ""
    const gap = 4.8
    const maxTickChars = Math.max(2, ...ticks.map(t => t.label.length))
    const tickW = maxTickChars * 4.7 + gap + 2
    const yTitleW = yTitle ? 12 + gap : 0
    const plotLeft = yTitleW + tickW
    const n = data.labels.length
    const slot = (fullW - plotLeft) / n
    const categoryH = 11
    const xTitleH = xTitle ? 11 + gap : 0
    const plotTop = showValues ? 11.5 : 5.5
    const plotBottom = fullH - categoryH - gap - xTitleH
    if (plotBottom - plotTop <= 20) {
      throw new Error("<chart> is too small for its labels; give it a larger height")
    }

    const fx = (x, w = 0) => (rtl ? fullW - x - w : x)
    const yv = v => plotBottom - ((v - axisMin) / (axisMax - axisMin)) * (plotBottom - plotTop)

    const gridWidth = fullW - plotLeft
    const gridX = fx(plotLeft, gridWidth)
    const yAxisX = fx(plotLeft, 0)
    const tickLabelX = fx(plotLeft - gap, 0)

    let dataMarks
    if (kind === "bar") {
      const count = data.series.length
      const group = slot * 0.72
      const barW = group / count
      const base = Math.max(axisMin, Math.min(0, axisMax))
      const baseY = yv(base)
      const feelCorners = [
        { name: "formal", corner: 0 },
        { name: "standard", corner: Math.min(3.2, barW / 2.5) },
        { name: "friendly", corner: Math.min(7.2, barW / 2.5) },
      ]
      const valueLabels = []
      data.series.forEach((s, k) => {
        s.values.forEach((v, i) => {
          if (v === null) return
          const w = count === 1 ? barW : barW * 0.88
          const x = plotLeft + slot * i + (slot - group) / 2 + barW * k + (barW - w) / 2
          const clamped = Math.max(axisMin, Math.min(v, axisMax))
          const y = yv(clamped)
          if (showValues) {
            const lx = fx(x + w / 2, 0)
            const above = v >= base
            valueLabels.push(
              <text
                key={`val-${k}-${i}`}
                x={lx.toFixed(2)}
                y={(above ? y - 2.5 : y + 8.5).toFixed(2)}
                textAnchor="middle"
                className="fx-chart-val"
              >
                {formatNumber(v, rtl, unit)}
              </text>
            )
          }
        })
      })

      dataMarks = (
        <>
          {feelCorners.map(fc => (
            <g key={fc.name} className={`fx-chart-feel-${fc.name}`}>
              {data.series.map((s, k) =>
                s.values.map((v, i) => {
                  if (v === null) return null
                  const w = count === 1 ? barW : barW * 0.88
                  const x = plotLeft + slot * i + (slot - group) / 2 + barW * k + (barW - w) / 2
                  const clamped = Math.max(axisMin, Math.min(v, axisMax))
                  const y = yv(clamped)
                  const topY = Math.min(y, baseY)
                  const barH = Math.abs(baseY - y)
                  const d = roundedBarPath(fx(x, w), topY, w, barH, fc.corner, v >= base)
                  return <path key={`${k}-${i}`} d={d} fill={colorVar(k)} />
                })
              )}
            </g>
          ))}
          {valueLabels}
        </>
      )
    } else {
      dataMarks = data.series.map((s, k) => {
        const c = colorVar(k)
        const pts = []
        for (let i = 0; i < n; i += 1) {
          const v = s.values[i]
          if (v !== null && v !== undefined) {
            pts.push({ x: fx(plotLeft + slot * (i + 0.5), 0), y: yv(v), v, i })
          }
        }
        const pathD = pts.length > 1
          ? pts.map((pt, idx) => `${idx === 0 ? "M" : "L"}${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`).join(" ")
          : ""
        return (
          <g key={k} style={{ ["--fx-s-color"]: c }}>
            {pathD && <path d={pathD} className="fx-chart-line" style={{ stroke: c }} />}
            {pts.map(pt => {
              const others = data.series.map(o => o.values[pt.i]).filter(o => o !== null && o !== undefined)
              const minAtPoint = Math.min(...others)
              const firstMinSeries = data.series.findIndex(o => o.values[pt.i] === minAtPoint)
              const below = others.length > 1 && pt.v === minAtPoint && k === firstMinSeries
              return (
                <g key={pt.i}>
                  <rect
                    x={(pt.x - 2.3).toFixed(2)}
                    y={(pt.y - 2.3).toFixed(2)}
                    width="4.6"
                    height="4.6"
                    className="fx-chart-dot"
                  />
                  {showValues && (
                    <text
                      x={pt.x.toFixed(2)}
                      y={(below ? pt.y + 10.2 : pt.y - 4.8).toFixed(2)}
                      textAnchor="middle"
                      className="fx-chart-val"
                    >
                      {formatNumber(pt.v, rtl, unit)}
                    </text>
                  )}
                </g>
              )
            })}
          </g>
        )
      })
    }

    const yTitleX = fx(0, yTitleW - gap) + (yTitleW - gap) / 2
    const yTitleY = (plotTop + plotBottom) / 2

    plotSvg = (
      <svg
        className="fx-chart-svg fx-chart-svg-cartesian"
        dir="ltr"
        viewBox={`0 0 ${fullW} ${fullH}`}
        style={{ width: widthCss, maxWidth: "100%", height: "auto" }}
      >
        {ticks.map((t, idx) => {
          const y = yv(t.value)
          const isZero = Math.abs(t.value) < 1e-9
          return (
            <g key={idx}>
              <line
                x1={gridX.toFixed(2)}
                y1={y.toFixed(2)}
                x2={(gridX + gridWidth).toFixed(2)}
                y2={y.toFixed(2)}
                className={isZero ? "fx-chart-grid-zero" : "fx-chart-grid"}
              />
              <text
                x={tickLabelX.toFixed(2)}
                y={y.toFixed(2)}
                textAnchor={rtl ? "start" : "end"}
                dominantBaseline="central"
                className="fx-chart-tick"
              >
                {t.label}
              </text>
            </g>
          )
        })}
        <line
          x1={yAxisX.toFixed(2)}
          y1={plotTop.toFixed(2)}
          x2={yAxisX.toFixed(2)}
          y2={plotBottom.toFixed(2)}
          className="fx-chart-yaxis"
        />
        {data.labels.map((lbl, i) => {
          const cx = fx(plotLeft + slot * (i + 0.5), 0)
          const lDir = /\p{L}/u.test(lbl) ? (arabicScript(lbl) ? "rtl" : "ltr") : dir
          return (
            <text
              key={i}
              x={cx.toFixed(2)}
              y={(plotBottom + gap + 8).toFixed(2)}
              textAnchor="middle"
              direction={lDir}
              className="fx-chart-cat"
            >
              {lbl}
            </text>
          )
        })}
        {xTitle && (
          <text
            x={fx(plotLeft + gridWidth / 2, 0).toFixed(2)}
            y={(fullH - 1.5).toFixed(2)}
            textAnchor="middle"
            direction={/\p{L}/u.test(xTitle) ? (arabicScript(xTitle) ? "rtl" : "ltr") : dir}
            className="fx-chart-axis-title"
          >
            {xTitle}
          </text>
        )}
        {yTitle && (
          <text
            x={yTitleX.toFixed(2)}
            y={yTitleY.toFixed(2)}
            textAnchor="middle"
            dominantBaseline="central"
            transform={`rotate(-90 ${yTitleX.toFixed(2)} ${yTitleY.toFixed(2)})`}
            direction={/\p{L}/u.test(yTitle) ? (arabicScript(yTitle) ? "rtl" : "ltr") : dir}
            className="fx-chart-axis-title"
          >
            {yTitle}
          </text>
        )}
        {dataMarks}
      </svg>
    )
  }

  const legendEntries = round
    ? data.labels.map((lbl, i) => {
        const v = data.series[0].values[i] ?? 0
        const text = showValues ? `${lbl}: ${formatNumber(v, rtl, unit)}` : lbl
        return { color: colorVar(i), text }
      })
    : data.series.map((s, k) => ({ color: colorVar(k), text: s.name }))

  const chartBody = (
    <div className="fx-chart-body" dir={dir}>
      <div className="fx-chart-plot">{plotSvg}</div>
      {showLegend && (
        <div className="fx-chart-legend" dir={dir}>
          {legendEntries.map((entry, idx) => (
            <span key={idx} className="fx-chart-legend-item">
              <span className="fx-chart-swatch" style={{ background: entry.color }} />
              <span dir={/\p{L}/u.test(entry.text) ? (arabicScript(entry.text) ? "rtl" : "ltr") : dir}>{entry.text}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )

  const numbered = p.numbering !== false && p.numbering !== "false" && context.numbers.has(node.key)
  const id = p.id ? String(p.id) : undefined
  const spanAll = p.span === "all"
  if (!numbered && !caption) {
    return (
      <div id={id} dir={dir} className={`fx-chart${spanAll ? " fx-chart-span-all" : ""}`}>
        {chartBody}
      </div>
    )
  }

  const position = captionPosition(context.document.settings, "figure", p, "below")
  const capRtl = dir === "rtl" || (dirAttr === "auto" && (caption ? arabicScript(caption) : context.language === "fa"))
  const number = context.numbers.get(node.key)
  const figcaption = (
    <figcaption className="fx-fig-caption">
      {numbered && <span className="fx-fig-number">{capRtl ? "شکل" : "Figure"} {digits(number ?? 0, capRtl)}</span>}
      {numbered && caption ? ": " : ""}
      {caption}
    </figcaption>
  )

  return (
    <figure id={id} dir={dir} className={`fx-fig fx-chart-figure${spanAll ? " fx-chart-span-all" : ""}`}>
      {position === "above" && figcaption}
      {chartBody}
      {position !== "above" && figcaption}
    </figure>
  )
}
