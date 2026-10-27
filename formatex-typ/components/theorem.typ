#import "/src/kit.typ": *

#let theorem-block(kind, attrs, body) = {
  let spec = theorem-kinds.at(kind)
  let c = counter("theorem-" + kind)
  let title = attrs.at("title", default: none)
  let id = attrs.at("id", default: none)

  if spec.numbered { c.step() }
  // <ref> finds theorems through this labelled marker.
  if id != none [#metadata((theorem-kind: kind))#label(id)]

  context {
    let d = resolve-dir(attrs.at("dir", default: "auto"), if title != none { title } else { body })
    let r = d == rtl
    let accent-color = if kind in ("theorem", "lemma") { theme.heading } else { theme.accent }
    let head = {
      set text(weight: "bold", fill: if spec.style == "proof" { theme.muted } else { accent-color })
      if r { spec.fa } else { spec.en }
      if spec.numbered [ #digits(c.get().first(), r)]
      if title != none [ (#title)]
      [.]
    }
    let side = if r { "right" } else { "left" }

    set text(dir: d)
    if spec.style == "boxed" {
      // A one-sided stroke on a strongly rounded block bends into the corners and stops
      // abruptly, so rounded feels get a pill-shaped bar set in from the edge instead.
      // Grid columns mirror in RTL, which keeps the bar on the start side.
      let fill = color.mix((theme.bg, 92%), (accent-color, 8%))
      if feel.theorem > 3pt * zoom {
        // Relative heights resolve against the page, not the auto-height row,
        // so the bar's height comes from measuring the content.
        let outer = 7pt * zoom
        let bar-width = 3pt * zoom
        let gap-y = 9pt * zoom
        layout(size => {
          let inner = pad(x: 10pt * zoom, y: 10pt * zoom, stack(spacing: 0.7em, head, block(width: 100%, body)))
          let h = measure(block(width: size.width - outer - bar-width, inner)).height
          let bar = pad(
            left: if r { 0pt } else { outer },
            right: if r { outer } else { 0pt },
            top: gap-y,
            block(width: bar-width, height: h - 2 * gap-y, radius: bar-width / 2, fill: accent-color),
          )
          block(
            width: 100%,
            fill: fill,
            radius: feel.theorem,
            breakable: false,
            grid(columns: (outer + bar-width, 1fr), bar, inner),
          )
        })
      } else {
        block(
          width: 100%,
          fill: fill,
          stroke: ((side): 2.5pt * zoom + accent-color),
          radius: feel.theorem,
          inset: (x: 12pt * zoom, y: 10pt * zoom),
          breakable: false,
          stack(spacing: 0.7em, head, block(width: 100%, body)),
        )
      }
    } else if spec.style == "plain" {
      block(
        width: 100%,
        stroke: ((side): (thickness: 1pt * zoom, paint: accent-color, dash: "dashed")),
        inset: (x: 12pt * zoom, y: 6pt * zoom),
        stack(spacing: 0.7em, head, block(width: 100%, body)),
      )
    } else {
      // Drop trailing breaks so ∎ lands at the end of the last line, not on a line of its own.
      let parts = if body.has("children") { body.children } else { (body,) }
      while parts.len() > 0 and parts.last().func() in (parbreak, linebreak, [ ].func()) {
        parts = parts.slice(0, -1)
      }
      block(width: 100%, stack(spacing: 0.7em, head, block(width: 100%, {
        parts.join()
        h(1fr)
        text(fill: theme.muted, "∎")
      })))
    }
  }
}

#let theorem-kind-tags = theorem-kinds.keys().map(k => (k, (attrs, body) => theorem-block(k, attrs, body))).to-dict()

#let theorem-tags = (:
    ..theorem-kind-tags,
)

#let theorem-schema = (
  "theorem": (
    kind: "block",
    description: (en: "Theorem block", fa: "بلوک قضیه"),
    attrs: (
      "title": (type: "string", doc: (en: "Optional title shown after the number", fa: "عنوان اختیاری بعد از شماره")),
      "id": (type: "string", doc: (en: "Target for <ref>", fa: "هدف برای <ref>")),
      "dir": (type: "enum", values: ("auto", "rtl", "ltr"), default: "auto", doc: (en: "Text direction: `rtl`, `ltr`, or `auto` (decided by the content)", fa: "جهت متن: `rtl`، `ltr` یا `auto` (از روی محتوا)")),
    ),
  ),
  "lemma": (
    kind: "block",
    description: (en: "Lemma block", fa: "بلوک لم"),
    attrs: (
      "title": (type: "string", doc: (en: "Optional title shown after the number", fa: "عنوان اختیاری بعد از شماره")),
      "id": (type: "string", doc: (en: "Target for <ref>", fa: "هدف برای <ref>")),
      "dir": (type: "enum", values: ("auto", "rtl", "ltr"), default: "auto", doc: (en: "Text direction: `rtl`, `ltr`, or `auto` (decided by the content)", fa: "جهت متن: `rtl`، `ltr` یا `auto` (از روی محتوا)")),
    ),
  ),
  "definition": (
    kind: "block",
    description: (en: "Definition block", fa: "بلوک تعریف"),
    attrs: (
      "title": (type: "string", doc: (en: "Optional title shown after the number", fa: "عنوان اختیاری بعد از شماره")),
      "id": (type: "string", doc: (en: "Target for <ref>", fa: "هدف برای <ref>")),
      "dir": (type: "enum", values: ("auto", "rtl", "ltr"), default: "auto", doc: (en: "Text direction: `rtl`, `ltr`, or `auto` (decided by the content)", fa: "جهت متن: `rtl`، `ltr` یا `auto` (از روی محتوا)")),
    ),
  ),
  "corollary": (
    kind: "block",
    description: (en: "Corollary block", fa: "بلوک نتیجه"),
    attrs: (
      "title": (type: "string", doc: (en: "Optional title shown after the number", fa: "عنوان اختیاری بعد از شماره")),
      "id": (type: "string", doc: (en: "Target for <ref>", fa: "هدف برای <ref>")),
      "dir": (type: "enum", values: ("auto", "rtl", "ltr"), default: "auto", doc: (en: "Text direction: `rtl`, `ltr`, or `auto` (decided by the content)", fa: "جهت متن: `rtl`، `ltr` یا `auto` (از روی محتوا)")),
    ),
  ),
  "example": (
    kind: "block",
    description: (en: "Example block", fa: "بلوک مثال"),
    attrs: (
      "title": (type: "string", doc: (en: "Optional title shown after the number", fa: "عنوان اختیاری بعد از شماره")),
      "id": (type: "string", doc: (en: "Target for <ref>", fa: "هدف برای <ref>")),
      "dir": (type: "enum", values: ("auto", "rtl", "ltr"), default: "auto", doc: (en: "Text direction: `rtl`, `ltr`, or `auto` (decided by the content)", fa: "جهت متن: `rtl`، `ltr` یا `auto` (از روی محتوا)")),
    ),
  ),
  "remark": (
    kind: "block",
    description: (en: "Remark block", fa: "بلوک نکته"),
    attrs: (
      "title": (type: "string", doc: (en: "Optional title shown after the number", fa: "عنوان اختیاری بعد از شماره")),
      "id": (type: "string", doc: (en: "Target for <ref>", fa: "هدف برای <ref>")),
      "dir": (type: "enum", values: ("auto", "rtl", "ltr"), default: "auto", doc: (en: "Text direction: `rtl`, `ltr`, or `auto` (decided by the content)", fa: "جهت متن: `rtl`، `ltr` یا `auto` (از روی محتوا)")),
    ),
  ),
  "proof": (
    kind: "block",
    description: (en: "Proof block", fa: "بلوک اثبات"),
    attrs: (
      "title": (type: "string", doc: (en: "Optional title shown after the number", fa: "عنوان اختیاری بعد از شماره")),
      "id": (type: "string", doc: (en: "Target for <ref>", fa: "هدف برای <ref>")),
      "dir": (type: "enum", values: ("auto", "rtl", "ltr"), default: "auto", doc: (en: "Text direction: `rtl`, `ltr`, or `auto` (decided by the content)", fa: "جهت متن: `rtl`، `ltr` یا `auto` (از روی محتوا)")),
    ),
  ),
)



