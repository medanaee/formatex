#import "/src/kit.typ": *

#let steps-tags = (
    step: (attrs, body) => tag("step", attrs, body),
    // Numbered steps on a vertical rail; the marker shape follows the feel (`feel.steps`).
    steps: (attrs, body) => {
      let items = untag(body, "step").tagged
      assert(items.len() > 0, message: at-of(attrs) + "<steps> needs <step> items inside it")
      let first = int(attrs.at("start", default: "1"))
      let given = attrs.at("color", default: none)
      let hue = if given == none { theme.accent } else if given in color-presets { color-presets.at(given) } else {
        assert(given.starts-with("#"), message: at-of(attrs) + "Unknown color " + repr(given) + "; use a hex color or one of: " + color-names.join(", ") + " (optionally with a shade, like blue-200)")
        rgb(given)
      }
      let tint = tinted(hue)
      let style = feel.steps
      let line-color = if given == none { theme.heading } else { tint.icon }
      let (marker-fill, marker-stroke, number-fill, rail) = if style == "square" {
        (none, 0.8pt * zoom + line-color, line-color, 0.6pt * zoom + theme.rule)
      } else {
        // "soft" and "solid" share colours and strokes; only the marker's corners differ.
        (tint.fill, 0.8pt * zoom + tint.border, tint.icon, 1pt * zoom + tint.border)
      }

      context {
        let d = resolve-dir(attrs.at("dir", default: "auto"), body)
        set text(dir: d)
        let m = 1.7em.to-absolute()
        let gutter = 0.9em.to-absolute()
        let gap = 1.1em.to-absolute()
        let marker(n) = box(
          width: m,
          height: m,
          radius: if style == "solid" { 50% } else { feel.box },
          fill: marker-fill,
          stroke: marker-stroke,
          align(center + horizon, text(
            weight: "bold",
            size: 0.9em,
            fill: number-fill,
            top-edge: "cap-height",
            bottom-edge: "baseline",
            digits(n, d == rtl),
          )),
        )
        // Relative heights don't resolve in auto rows, so each rail is as long as its
        // measured step, which keeps the rail continuous from one marker to the next.
        layout(region => {
          let body-w = region.width - m - gutter
          let cells = ()
          for (i, it) in items.enumerate() {
            let title = it.attrs.at("title", default: none)
            let head = if title != none { text(weight: "bold", fill: theme.heading, title) }
            // The title (or the first line of text) is centered on the marker.
            let head-h = measure(block(width: body-w, if head != none { head } else [H])).height
            let content = block(width: body-w, inset: (top: calc.max(0pt, (m - head-h) / 2)), {
              if head != none { block(below: 0.6em, head) }
              it.body
            })
            let h = measure(content).height
            let last = i == items.len() - 1
            cells.push(align(center, stack(
              marker(first + i),
              if last { [] } else { line(angle: 90deg, length: calc.max(0pt, h + gap - m), stroke: rail) },
            )))
            cells.push(pad(bottom: if last { 0pt } else { gap }, content))
          }
          grid(columns: (m, 1fr), column-gutter: gutter, ..cells)
        })
      }
    },
)

#let steps-schema = (
  "steps": (
    kind: "block",
    description: (en: "numbered steps", fa: "مراحل شماره‌دار"),
    attrs: (
      "start": (type: "int", default: "1", doc: (en: "First number, default `1`.", fa: "شمارهٔ اول، پیش‌فرض `1`.")),
      "color": (type: "color", doc: (en: "Preset or hex; default the theme's accent (heading color in `formal`).", fa: "رنگ آماده یا hex؛ پیش‌فرض رنگ تأکید تم (در `formal` رنگ تیترها).")),
      "dir": (type: "enum", values: ("auto", "rtl", "ltr"), default: "auto", doc: (en: "`rtl`, `ltr`, `auto` (default: from the content).", fa: "`rtl`، `ltr`، `auto` (پیش‌فرض: از روی محتوا).")),
    ),
    children: ("step",),
  ),
  "step": (
    kind: "block",
    scoped: true,
    description: (en: "One step of <steps>", fa: "یک گام از <steps>"),
    attrs: (
      "title": (type: "string", doc: (en: "Bold title next to the marker", fa: "عنوان پررنگ کنار نشانگر")),
    ),
  ),
)

// ---- docs: read by the skill generator of the app and exported with the schema (see docs/doc_en.md, Extending the template)
#let steps-docs = (
  en: (
    about: `````md
Numbered steps hanging on a vertical line: `<steps>` holds `<step title="...">` items; a step may hold text, lists or code.

- Each `<step title="...">` is a numbered marker on a vertical line; the body may hold text, lists or code (leave blank lines inside `<step>`). `start` sets the first number; `color` the hue (default: the theme's accent).
- Markers sit on the start side (right in Persian). The look follows the feel: outlined squares in `formal`, tinted rounded squares in `standard`, round markers in `friendly`.
`````.text,
  ),
  fa: (
    about: `````md
مراحل شماره‌دار روی یک خط عمودی: `<steps>` چند `<step title="...">` دارد و هر مرحله می‌تواند متن، فهرست یا کد داشته باشد.

- هر `<step title="...">` یک نشانهٔ شماره‌دار روی یک خط عمودی است؛ بدنه می‌تواند متن، فهرست یا کد باشد (داخل `<step>` خط خالی بگذارید). `start` شمارهٔ اول را تعیین می‌کند و `color` رنگ را (پیش‌فرض: رنگ تأکید تم).
- نشانه‌ها سمت شروع‌اند (در فارسی راست). ظاهر از حالت (feel) پیروی می‌کند: مربع‌های توخالی در `formal`، مربع‌های گرد ته‌رنگ در `standard`، نشانهٔ گرد در `friendly`.
`````.text,
  ),
  example: (
    en: `````md
<steps>
<step title="Collect the data">

Body text, lists or code.

</step>
<step title="Clean it">

Another step.

</step>
</steps>
`````.text,
    fa: `````md
<steps>
<step title="جمع‌آوری داده">

متن، فهرست یا کد.

</step>
<step title="پاک‌سازی">

مرحلهٔ بعد.

</step>
</steps>
`````.text,
  ),
)
