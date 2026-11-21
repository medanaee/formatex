#import "/src/kit.typ": *

#let box-types = (
  note: (color: "purple", icon: "note-sticky"),
  info: (color: "blue", icon: "circle-info"),
  tip: (color: "teal", icon: "lightbulb"),
  success: (color: "green", icon: "circle-check"),
  warning: (color: "yellow", icon: "triangle-exclamation"),
  danger: (color: "red", icon: "circle-xmark"),
  important: (color: "pink", icon: "circle-exclamation"),
)

#let alert-tags = (
    alert: (attrs, body) => {
      let kind = attrs.at("type", default: none)
      assert(kind == none or kind in box-types, message: at-of(attrs) + "Unknown alert type " + repr(kind) + "; available: " + box-types.keys().join(", "))
      let preset = if kind != none { box-types.at(kind) } else { (color: none, icon: none) }

      let given = attrs.at("color", default: preset.color)
      let colors = if given != none { resolve-color(given, attrs: attrs) } else { tinted(theme.muted) }
      let r = if "radius" in attrs { float(attrs.radius) * 1pt * zoom } else { feel.alert }
      let icon-name = attrs.at("icon", default: preset.icon)

      let inside(shrink) = if icon-name != none { context {
          set text(dir: if content-dir(body) != ltr { rtl } else { ltr })
          let icon = text(size: 1.2em, fill: colors.icon, top-edge: "bounds", bottom-edge: "bounds", fa-icon(icon-name))
          // The icon is centered on the first line: a leading heading as a whole, otherwise
          // the inline run before the first paragraph break laid out as one line.
          let icon-cell = context {
            let kids = if body.has("children") { body.children } else { (body,) }
            let skip = (parbreak, [ ].func(), linebreak)
            let i = 0
            while i < kids.len() and kids.at(i).func() in skip { i += 1 }
            let line = if i < kids.len() and kids.at(i).func() == heading { kids.at(i) } else {
              let run = ()
              while i < kids.len() and kids.at(i).func() not in (parbreak, heading) {
                run.push(kids.at(i))
                i += 1
              }
              if run.len() == 0 { [H] } else { run.join() }
            }
            box(height: measure(line).height, align(horizon, icon))
          }
          grid(
            columns: (auto, if shrink { auto } else { 1fr }),
            column-gutter: 1.2em,
            icon-cell, if shrink { body } else { block(width: 100%, body) }
          )
        } } else {
          body
        }
      panel((
        fill: colors.fill,
        stroke: 0.6pt * zoom + colors.border,
        radius: r,
        inset: 12pt * zoom,
      ), inside(false), narrow: if icon-name != none { inside(true) })
    },
)

// The HTML form (optional, used by the HTML export): a tinted panel, the icon as a small picture and the content beside it
