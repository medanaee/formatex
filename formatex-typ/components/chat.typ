#import "/src/prelude.typ": *
#import "/src/lib/basics.typ": *
#import "/src/lib/colors.typ": *

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

#let chat-schema = (
  "chat": (
    kind: "block",
    description: (en: "chat with an AI", fa: "گفتگو با هوش مصنوعی"),
    attrs: (
      "style": (type: "enum", values: ("auto", "transcript", "assistant", "bubbles"), default: "auto", doc: (en: "`auto` (default) follows the feel: `formal` → `transcript`, `standard` → `assistant`, `friendly` → `bubbles`. `transcript`: named turns with a colored bar on the start side, your turns tinted. `assistant`: your message in a bubble on the end side, the answer full width beside its avatar. `bubbles`: a messenger, both sides in bubbles with avatars, yours at the end side.", fa: "مقدار `auto` (پیش‌فرض) از حالت پیروی می‌کند: `formal` ← `transcript`، `standard` ← `assistant`، `friendly` ← `bubbles`. ظاهر `transcript`: نوبت‌های نام‌دار با نواری رنگی در سمت شروع متن، و نوبت‌های شما ته‌رنگ. ظاهر `assistant`: پیام شما در حبابی در سمت پایان متن، و پاسخ با تمام پهنا کنار آواتارش. ظاهر `bubbles`: مثل پیام‌رسان‌ها، هر دو طرف در حباب با آواتار، و پیام‌های شما در سمت پایان.")),
      "user-name": (type: "string", doc: (en: "Names over the messages. Default: «شما» / \"You\" and «هوش مصنوعی» / \"AI\", by the chat's language.", fa: "نام‌های بالای پیام‌ها. پیش‌فرض: «شما» / \"You\" و «هوش مصنوعی» / \"AI\"، بسته به زبان گفتگو.")),
      "ai-name": (type: "string", doc: (en: "Names over the messages. Default: «شما» / \"You\" and «هوش مصنوعی» / \"AI\", by the chat's language.", fa: "نام‌های بالای پیام‌ها. پیش‌فرض: «شما» / \"You\" و «هوش مصنوعی» / \"AI\"، بسته به زبان گفتگو.")),
      "user-icon": (type: "string", doc: (en: "Font Awesome icon names for the avatars. Default: `user` and `robot`.", fa: "نام آیکون‌های Font Awesome برای آواتارها. پیش‌فرض: `user` و `robot`.")),
      "ai-icon": (type: "string", doc: (en: "Font Awesome icon names for the avatars. Default: `user` and `robot`.", fa: "نام آیکون‌های Font Awesome برای آواتارها. پیش‌فرض: `user` و `robot`.")),
      "user-color": (type: "color", doc: (en: "A color preset or a hex color. Default: the theme's accent and secondary colors.", fa: "یک رنگ آماده یا رنگ hex. پیش‌فرض: رنگ تأکید و رنگ دوم تم.")),
      "ai-color": (type: "color", doc: (en: "A color preset or a hex color. Default: the theme's accent and secondary colors.", fa: "یک رنگ آماده یا رنگ hex. پیش‌فرض: رنگ تأکید و رنگ دوم تم.")),
      "frame": (type: "bool", default: "true", doc: (en: "`true` (default): a frame around the whole chat, rules above and below in `formal`, a rounded panel otherwise. `false`: no frame.", fa: "مقدار `true` (پیش‌فرض): قابی دور کل گفتگو؛ در `formal` خط‌هایی بالا و پایین، در بقیهٔ حالت‌ها یک قاب گوشه‌گرد. مقدار `false`: بدون قاب.")),
      "title": (type: "string", doc: (en: "A heading with a chat icon at the top of the chat. Default: none.", fa: "عنوانی با آیکون گفتگو در بالای آن. پیش‌فرض: بدون عنوان.")),
      "width": (type: "length", default: "80%", doc: (en: "Widest a bubble gets: a percentage of the line (`\"80%\"`, the default) or a length (`\"12cm\"`). Bubbles shrink to short messages.", fa: "بیشترین پهنای یک حباب: درصدی از خط (`\"80%\"`، پیش‌فرض) یا یک طول (`\"12cm\"`). حباب پیام‌های کوتاه کوچک‌تر می‌شود.")),
      "dir": (type: "enum", values: ("auto", "rtl", "ltr"), default: "auto", doc: (en: "`rtl`, `ltr` or `auto` (default: from the first message).", fa: "`rtl`، `ltr` یا `auto` (پیش‌فرض: از روی پیام اول).")),
    ),
    children: ("user", "ai"),
  ),
  "user": (
    kind: "block",
    scoped: true,
    description: (en: "A message by the user in a <chat>", fa: "پیام کاربر در <chat>"),
    attrs: (
      "name": (type: "string", doc: (en: "Name shown over this message", fa: "نامی که بالای این پیام نشان داده می‌شود")),
      "icon": (type: "string", doc: (en: "Font Awesome avatar icon for this message", fa: "آیکن Font Awesome برای این پیام")),
    ),
  ),
  "ai": (
    kind: "block",
    scoped: true,
    description: (en: "A message by the AI in a <chat>", fa: "پیام هوش مصنوعی در <chat>"),
    attrs: (
      "name": (type: "string", doc: (en: "Name shown over this message", fa: "نامی که بالای این پیام نشان داده می‌شود")),
      "icon": (type: "string", doc: (en: "Font Awesome avatar icon for this message", fa: "آیکن Font Awesome برای این پیام")),
    ),
  ),
)



