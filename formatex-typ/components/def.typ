#import "/src/prelude.typ": *
#import "/src/lib/basics.typ": *
#import "/src/lib/colors.typ": *
#import "/src/lib/mitex.typ": *
#import "/src/lib/refs.typ": *

// Colors for <def>: title and icon color, plus tinted background and border for inline badge mode.
#let resolve-def-colors(c, attrs: none) = {
  let c-str = if c == none { "" } else { str(c) }
  if c-str in ("", "accent") {
    let t = tinted(theme.accent)
    (text: theme.accent, bg: t.fill, border: t.border)
  } else if c-str == "secondary" {
    let t = tinted(theme.secondary)
    (text: theme.secondary, bg: t.fill, border: t.border)
  } else if c-str == "primary" {
    (text: theme.fg, bg: theme.code-bg, border: theme.rule)
  } else if c-str == "muted" {
    let t = tinted(theme.muted)
    (text: theme.muted, bg: t.fill, border: t.border)
  } else if c-str == "heading" {
    let t = tinted(theme.heading)
    (text: theme.heading, bg: t.fill, border: t.border)
  } else if c-str in color-presets {
    let hue = color-presets.at(c-str)
    let t = tinted(hue)
    (text: if theme.dark { hue.lighten(30%) } else { hue.darken(10%) }, bg: t.fill, border: t.border)
  } else {
    assert(c-str.starts-with("#"), message: at-of(attrs) + "<def> color must be a hex color (#...) or one of: accent, secondary, heading, muted, " + color-names.join(", ") + " (optionally with a shade, like blue-200)" + ", got " + repr(c))
    let hue = rgb(c-str)
    let t = if theme.dark {
      (bg: color.mix((hue, 20%), (theme.bg, 80%)), border: hue.transparentize(50%), text: hue.lighten(25%))
    } else {
      (bg: color.mix((hue, 10%), (theme.bg, 90%)), border: color.mix((hue, 35%), (theme.bg, 65%)), text: hue.darken(10%))
    }
    t
  }
}

#let def-tags = (
    // <def id="..." mode="inline|block" color="..." title="..." icon="...">definition</def>
    // Defines an element (figure, heading, equation, theorem, table, or paragraph span)
    // with an optional custom title, color, and inline (badge) or block presentation.
    def: (attrs, body) => context {
      let id = attrs.at("id", default: attrs.at("to", default: none))
      assert(id != none, message: at-of(attrs) + "<def> requires an id attribute: <def id=\"...\">")
      let mode = attrs.at("mode", default: "inline")
      assert(mode in ("inline", "block"), message: at-of(attrs) + "<def> mode must be 'inline' or 'block', got " + repr(mode))
      let color-attr = attrs.at("color", default: "accent")
      let colors = resolve-def-colors(color-attr, attrs: attrs)
      let icon-name = attrs.at("icon", default: "circle-question")

      let slug = lower(id.trim()).replace(regex("[^\p{L}\p{M}\p{N}_\- ]"), "").replace(" ", "-")
      let found = query(label(id))
      if found.len() == 0 { found = query(label(slug)) }
      assert(found.len() > 0, message: at-of(attrs) + "<def>: no element with id " + repr(id))
      let el = found.first()
      if el.func() == metadata and type(el.value) == dictionary and "heading-id" in el.value {
        el = query(selector(heading).before(el.location())).last()
      }
      if el.func() == metadata and type(el.value) == dictionary and "equation-id" in el.value {
        el = query(selector(math.equation).before(el.location())).last()
      }

      let given-dir = attrs.at("dir", default: "auto")
      let d = if given-dir != "auto" {
        named-dir(given-dir)
      } else if mode == "inline" {
        if last-dir.get() != none { last-dir.get() } else { doc-dir }
      } else {
        content-dir(body)
      }
      let r = d == rtl

      let custom-title = attrs.at("title", default: none)
      let target-text = reference-text(el, r)
      let title-content = if custom-title != none and custom-title.trim() != "" {
        if custom-title.contains("*") or custom-title.contains("$") or custom-title.contains("`") {
          cmarker.render(custom-title, math: mitex)
        } else {
          custom-title
        }
      } else if target-text != none {
        target-text
      } else {
        [#id]
      }

      if mode == "inline" {
        let icon-item = text(fill: colors.text, size: 0.85em, fa-icon(icon-name))
        let title-item = link(el.location(), text(fill: colors.text, weight: "bold", title-content))
        let has-body = plain-text(body).trim() != ""
        let colon-item = if has-body { text(fill: colors.text, weight: "bold")[:#h(3pt * zoom)] } else { none }
        let body-item = if has-body { text(fill: theme.fg, body) } else { none }

        box(
          fill: colors.bg,
          stroke: 0.5pt * zoom + colors.border,
          radius: feel.badge,
          inset: (x: 5pt * zoom, y: 2.5pt * zoom),
          {
            set text(dir: d, size: 0.88em, top-edge: "ascender", bottom-edge: "descender")
            icon-item
            h(3pt * zoom)
            title-item
            colon-item
            body-item
          }
        )
      } else {
        let icon-item = text(fill: colors.text, size: 0.95em, fa-icon(icon-name))
        let title-item = link(el.location(), text(fill: colors.text, weight: "bold", size: 1.05em, title-content))
        block(
          width: 100%,
          above: 1.2em * zoom,
          below: 1.2em * zoom,
          {
            set text(dir: d, fill: theme.fg)
            block(width: 100%, below: 0.45em * zoom, [#icon-item#h(0.45em * zoom)#title-item])
            body
          }
        )
      }
    },
)

#let def-schema = (
  "def": (
    kind: "mixed",
    description: (en: "Reference to a defined element, as an inline badge or a block", fa: "ارجاع به یک عنصر تعریف‌شده، به‌صورت نشان درون‌خطی یا بلوک"),
    attrs: (
      "id": (type: "string", doc: (en: "Id of the element to refer to", fa: "شناسهٔ عنصری که به آن ارجاع می‌شود")),
      "to": (type: "string", doc: (en: "Same as `id`", fa: "مثل `id`")),
      "mode": (type: "enum", values: ("inline", "block"), default: "inline", doc: (en: "`inline` badge (default) or `block`", fa: "نشان `inline` (پیش‌فرض) یا `block`")),
      "title": (type: "string", doc: (en: "Custom title instead of the target's name", fa: "عنوان دلخواه به‌جای نام هدف")),
      "color": (type: "color", default: "accent", doc: (en: "Color preset, `accent`, `secondary`, `heading`, `muted` or hex", fa: "نام رنگ آماده، `accent`، `secondary`، `heading`، `muted` یا hex")),
      "icon": (type: "string", doc: (en: "Font Awesome icon name", fa: "نام آیکن Font Awesome")),
      "dir": (type: "enum", values: ("auto", "rtl", "ltr"), default: "auto", doc: (en: "Text direction: `rtl`, `ltr`, or `auto` (decided by the content)", fa: "جهت متن: `rtl`، `ltr` یا `auto` (از روی محتوا)")),
    ),
  ),
)



