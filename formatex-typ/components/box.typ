#import "/src/kit.typ": *

#let box-tags = (
    box: (attrs, body) => {
      let given = attrs.at("color", default: none)
      let colors = if given != none { resolve-color(given, attrs: attrs) }
      let is-preset = given != none and given in color-presets
      // Presets come with a thin border in their own hue; hex colors keep the old borderless default.
      let border = parse-length(attrs.at("border", default: if is-preset { "0.6" } else { "0" }), attrs: attrs)
      let border-color = if "border-color" in attrs { resolve-color(attrs.at("border-color"), attrs: attrs).border }
        else if is-preset { colors.border } else { theme.rule }
      panel((
        fill: if colors != none { colors.fill },
        stroke: if border != 0pt { border + border-color },
        radius: if "radius" in attrs { parse-length(attrs.radius, attrs: attrs) } else { feel.box },
        inset: parse-length(attrs.at("padding", default: "8pt"), attrs: attrs),
      ), body)
    },
)

// The HTML form (optional, used by the HTML export): a `.fx-panel` (its CSS is the page's)
#let box-html = (
    box: (attrs, body) => {
      let given = attrs.at("color", default: none)
      let colors = if given != none { resolve-color(given, attrs: attrs) }
      let is-preset = given != none and given in color-presets
      let border = parse-length(attrs.at("border", default: if is-preset { "0.6" } else { "0" }), attrs: attrs)
      let border-color = if "border-color" in attrs { resolve-color(attrs.at("border-color"), attrs: attrs).border } else if is-preset { colors.border } else { theme.rule }
      let r = if "radius" in attrs { parse-length(attrs.radius, attrs: attrs) } else { feel.box }
      html.elem("div", attrs: (class: "fx-panel", style: style-of((
        "border-radius: " + css-len(r),
        "padding: " + css-len(parse-length(attrs.at("padding", default: "8pt"), attrs: attrs)),
        if colors != none { panel-style(colors) },
        if border != 0pt { "border: " + css-len(border) + " solid " + (if "border-color" in attrs { css-color(border-color) } else if is-preset { "var(--panel-border)" } else { "var(--rule)" }) },
      ))), body)
    },
)

#let box-schema = (
  "box": (
    kind: "block",
    description: (en: "styled container", fa: "ظرف قالب‌دار"),
    attrs: (
      "color": (type: "color", doc: (en: "A color preset name or a hex color. Default: transparent.", fa: "نام یک رنگ آماده یا یک رنگ hex. پیش‌فرض: شفاف.")),
      "border": (type: "length", doc: (en: "`0.6` with a preset, otherwise `0` (no border)", fa: "با رنگ آماده `0.6`، وگرنه `0` (بدون حاشیه)")),
      "border-color": (type: "color", doc: (en: "A preset name or hex. Default: the preset's hue, otherwise the theme's rule color.", fa: "نام رنگ آماده یا hex. پیش‌فرض: رنگ همان رنگ آماده، وگرنه رنگ خط تم.")),
      "radius": (type: "length", doc: (en: "The feel's value", fa: "مقدار حالت")),
      "padding": (type: "length", default: "8pt", doc: (en: "`8pt`", fa: "`8pt`")),
    ),
  ),
)

// ---- docs: read by the skill generator of the app and exported with the schema (see docs/doc_en.md, Extending the template)
#let box-docs = (
  en: (
    about: `````md
A styled container for any content, tinted from the theme. `color` sets the background (a preset name or hex); `border`, `border-color`, `radius` and `padding` fine-tune it. Boxes nest and can stand in a `<grid>`.

- `color`: a preset (`blue`, `green`, ... the whole Tailwind palette; a shade like `blue-200` also works) or hex. The background is the hue mixed into the page color (about 10%, 16% on dark themes), so the same box fits every theme. An unknown name is a compile error.
- `border` (width), `border-color`, `radius` (points, a plain number) and `padding` fine-tune it. Without `color` the box is transparent.
- A box fills the available width and grows with its content; leave blank lines inside the tag.
`````.text,
  ),
  fa: (
    about: `````md
ظرف قالب‌دار برای هر محتوا، با ته‌رنگ از تم. `color` پس‌زمینه را تعیین می‌کند (نام رنگ آماده یا hex) و `border`، `border-color`، `radius` و `padding` آن را تنظیم می‌کنند. جعبه‌ها تودرتو می‌شوند و داخل `<grid>` می‌نشینند.

- `color`: یک رنگ آماده (`blue`، `green` و ... همهٔ پالت Tailwind؛ سایه‌ای مثل `blue-200` هم کار می‌کند) یا hex. پس‌زمینه همان رنگ است که با رنگ صفحه ترکیب شده (حدود ۱۰٪، روی تم تیره ۱۶٪)، پس یک جعبه با هر تم می‌خواند. نام ناشناخته خطای ساخت است.
- `border` (ضخامت)، `border-color`، `radius` (پوینت، فقط عدد) و `padding` آن را تنظیم می‌کنند. بدون `color` جعبه شفاف است.
- جعبه تمام عرض را می‌گیرد و با محتوا بلند می‌شود؛ داخل تگ خط خالی بگذارید.
`````.text,
  ),
  example: (
    en: `````md
<box color="blue">

Content in a blue box that matches the theme.

</box>

<box color="#e0efff" border="1" border-color="#2b8cc4" radius="6" padding="10pt">

Exact colors.

</box>
`````.text,
    fa: `````md
<box color="blue">

محتوا در یک باکس آبی که با تم جور است.

</box>

<box color="#e0efff" border="1" border-color="#2b8cc4" radius="6" padding="10pt">

رنگ‌های دقیق.

</box>
`````.text,
  ),
)
