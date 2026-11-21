#import "/src/kit.typ": *

// <chat>: an AI conversation of <user> and <ai> messages. [chat] in config.toml / front matter,
// overridden by the tag's attributes. The look follows the feel unless `style` is set:
// formal "transcript" (named turns with a bar), standard "assistant" (user bubble at the end
// side, AI answer full width beside its avatar), friendly "bubbles" (messenger: both in bubbles).
#let chat-config = config.at("chat", default: (:))

#let chat-styles = ("auto", "transcript", "assistant", "bubbles")

#let chat-option-keys = ("style", "user-name", "ai-name", "user-icon", "ai-icon", "user-color", "ai-color", "frame", "title", "width", "dir")

#let chat-block(attrs, body) = {
  for key in attrs.keys().filter(key => key != "_at") {
    assert(key in chat-option-keys, message: at-of(attrs) + "Unknown <chat> option " + repr(key) + "; available: " + chat-option-keys.join(", "))
  }
  let setting(key, default) = {
    let v = attrs.at(key, default: chat-config.at(key, default: none))
    if v == none or v == "" { default } else { v }
  }
  let style = setting("style", "auto")
  assert(style in chat-styles, message: at-of(attrs) + "<chat> style must be one of " + chat-styles.join(", ") + ", got " + repr(style))
  if style == "auto" { style = if feel-name == "formal" { "transcript" } else if feel-name == "friendly" { "bubbles" } else { "assistant" } }
  let hue(key, fallback) = {
    let g = setting(key, none)
    if g == none { return fallback }
    if g in color-presets { return color-presets.at(g) }
    assert(g.starts-with("#"), message: at-of(attrs) + "Unknown <chat> " + key + " " + repr(g) + "; use a hex color or one of: " + color-names.join(", ") + " (optionally with a shade, like blue-200)")
    rgb(g)
  }
  let hues = (user: hue("user-color", theme.accent), ai: hue("ai-color", theme.secondary))
  let frame = repr(setting("frame", true)) in ("true", "\"true\"")
  let title = setting("title", none)
  let max-width = parse-length(str(setting("width", "80%")), attrs: attrs)
  let messages = untag(body, "chat-msg").tagged
  assert(messages.len() > 0, message: at-of(attrs) + "<chat> needs <user> and <ai> messages inside it")

  context {
    let d = resolve-dir(setting("dir", "auto"), messages.first().body)
    set text(dir: d)
    let fa = d == rtl
    let start-side = if fa { "right" } else { "left" }
    let end-side = if fa { "left" } else { "right" }
    let role(m) = m.attrs.role
    let tint(m) = tinted(hues.at(role(m)))
    let name(m) = m.attrs.at("name", default: setting(role(m) + "-name",
      if role(m) == "user" { if fa { "شما" } else { "You" } } else { if fa { "هوش مصنوعی" } else { "AI" } }))
    let icon(m) = m.attrs.at("icon", default: setting(role(m) + "-icon", if role(m) == "user" { "user" } else { "robot" }))
    let avatar(m) = box(
      width: 2em, height: 2em,
      radius: if style == "transcript" { feel.badge } else { 50% },
      fill: tint(m).fill, stroke: 0.6pt * zoom + tint(m).border,
      align(center + horizon, text(size: 0.9em, fill: tint(m).icon, fa-icon(icon(m)))),
    )
    let label(m) = text(size: 0.85em, weight: "bold", fill: tint(m).icon, name(m))
    // A bubble as wide as its text, up to `width` of the line.
    let bubble(args, side, it) = block(width: 100%, layout(size => {
      let most = if type(max-width) == ratio { max-width * size.width } else { calc.min(max-width.to-absolute(), size.width) }
      align(side, block(width: measure(box(..args, it), width: most).width, ..args, it))
    }))
    let bubble-args(m, near) = (
      fill: tint(m).fill,
      stroke: 0.6pt * zoom + tint(m).border,
      // The corner next to the avatar stays tighter, like a speech bubble's tail.
      radius: if near == none { feel.alert } else { (("top-" + near): calc.min(feel.alert, 3pt * zoom), rest: feel.alert) },
      inset: (x: 0.9em, y: 0.65em),
    )

    let turn(m) = if style == "transcript" {
      let content = [#block(sticky: true, below: 0.5em, [#text(size: 0.85em, fill: tint(m).icon, fa-icon(icon(m)))#h(0.45em)#label(m)])#m.body]
      let fill = if role(m) == "user" { tint(m).fill }
      if feel.alert == 0pt {
        block(width: 100%, fill: fill, stroke: ((start-side): 1.5pt * zoom + tint(m).icon), inset: (x: 0.9em, y: 0.6em), content)
      } else {
        // A one-sided stroke bends into rounded corners, so the bar is a grid column set in
        // from the edge; unlike a measured bar it still breaks across pages with the text.
        block(
          width: 100%, fill: fill, radius: feel.alert, inset: (x: 0.8em, y: 0.7em),
          grid(columns: (2pt * zoom, 1fr), column-gutter: 0.75em, fill: (x, _) => if x == 0 { tint(m).icon }, [], content),
        )
      }
    } else if style == "assistant" {
      if role(m) == "user" { bubble(bubble-args(m, none), end, m.body) } else {
        grid(columns: (auto, 1fr), column-gutter: 0.8em, avatar(m), [#block(sticky: true, below: 0.45em, label(m))#m.body])
      }
    } else {
      if role(m) == "user" {
        grid(columns: (1fr, auto), column-gutter: 0.6em, bubble(bubble-args(m, end-side), end, m.body), avatar(m))
      } else {
        grid(columns: (auto, 1fr), column-gutter: 0.6em, avatar(m), bubble(bubble-args(m, start-side), start, m.body))
      }
    }

    let header = if title != none {
      block(below: 1em, [#text(fill: theme.accent, fa-icon("comments"))#h(0.5em)#text(weight: "bold", title)])
    }
    let turns = [#header#messages.map(m => block(above: 1.1em, below: 1.1em, turn(m))).join()]
    if not frame { turns } else if feel-name == "formal" {
      block(width: 100%, stroke: (top: 1pt * zoom + theme.rule, bottom: 1pt * zoom + theme.rule), inset: (y: 0.9em), turns)
    } else {
      block(width: 100%, fill: theme.code-bg, stroke: 0.5pt * zoom + theme.code-stroke, radius: feel.box, inset: 1.1em, turns)
    }
  }
}

#let chat-tags = (
    user: (attrs, body) => tag("chat-msg", attrs + (role: "user"), body),
    ai: (attrs, body) => tag("chat-msg", attrs + (role: "ai"), body),
    chat: chat-block,
)
