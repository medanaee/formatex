#import "/src/kit.typ": *

// <p>: a paragraph (or several) with its own look: font, size, weight, color, alignment, spacing and direction. Every attribute is
// optional; what it leaves out comes from the document ([paragraph] in config.toml for the spacing).
#let paragraph-weights = ("thin", "extralight", "light", "regular", "medium", "semibold", "bold", "extrabold", "black")

// A percent as a number: "120" or "120%"
#let paragraph-percent(attrs, key) = {
  let raw = attrs.at(key, default: none)
  if raw == none or raw == "" { return none }
  let m = str(raw).trim().match(regex("^(-?[0-9]*\\.?[0-9]+)\\s*%?$"))
  assert(m != none, message: at-of(attrs) + "<p> " + key + " must be a number (a percent), got " + repr(raw))
  float(m.captures.at(0))
}

#let paragraph-tags = (
    p: (attrs, body) => {
      let above = parse-length(attrs.at("above", default: none), attrs: attrs)
      let below = parse-length(attrs.at("below", default: none), attrs: attrs)
      let indent = parse-length(attrs.at("indent", default: none), attrs: attrs)
      let size = parse-length(attrs.at("size", default: none), attrs: attrs)
      let weight = flag-attr(attrs, "weight", "regular", paragraph-weights, "p")
      let hue = if "color" in attrs { pick-hue(attrs.color, "p", none, attrs: attrs) }
      let align-key = attrs.at("align", default: none)
      assert(align-key == none or align-key in align-names, message: at-of(attrs) + "<p> align must be one of " + align-names.keys().join(", ") + ", got " + repr(align-key))
      let justified = if "justify" in attrs { flag-attr(attrs, "justify", "false", ("true", "false"), "p") == "true" }
      let line = paragraph-percent(attrs, "line-spacing")
      let letters = paragraph-percent(attrs, "letter-spacing")
      let words = paragraph-percent(attrs, "word-spacing")
      let to = attrs.at("dir", default: "auto")
      assert(to in ("auto", "rtl", "ltr"), message: at-of(attrs) + "<p> dir must be auto, rtl or ltr, got " + repr(to))
      let family = attrs.at("font", default: none)

      context {
        // A size in percent is of the size the text has here
        let resolved-size = if size == none { none } else if type(size) == ratio { text.size * size } else { size }
        let fonts = text.font
        show: it => {
          set text(font: (family,) + (if type(fonts) == array { fonts } else { (fonts,) })) if family != none and family != ""
          set text(size: resolved-size) if resolved-size != none
          set text(weight: weight) if "weight" in attrs
          set text(fill: hue) if hue != none
          set text(tracking: letters / 100 * 1em) if letters != none
          set text(spacing: words * 1%) if words != none
          set text(dir: if to == "rtl" { rtl } else { ltr }) if to != "auto"
          set par(leading: line / 100 * 0.65em) if line != none
          set par(justify: justified) if justified != none
          set par(first-line-indent: indent) if indent != none
          it
        }
        let inner = if align-key != none { align(align-names.at(align-key), body) } else { body }
        block(width: 100%, above: if above != none { above } else { auto }, below: if below != none { below } else { auto }, inner)
      }
    },
)

#let paragraph-schema = (
  "p": (
    kind: "block",
    description: (en: "A paragraph with its own font, size, spacing and alignment", fa: "یک پاراگراف با فونت، اندازه، فاصله‌گذاری و تراز خودش"),
    attrs: (
      "font": (type: "string", doc: (en: "A font for this paragraph (any installed or imported font); the document's fonts stay as fallbacks.", fa: "فونت این پاراگراف (هر فونت نصب‌شده یا واردشده)؛ فونت‌های سند به‌عنوان جایگزین می‌مانند.")),
      "size": (type: "length", doc: (en: "Text size: `14pt`, `1.2em`, `120%` (of the size around it).", fa: "اندازهٔ متن: `14pt`، `1.2em`، `120%` (از اندازهٔ اطراف).")),
      "weight": (type: "enum", values: paragraph-weights, default: "regular", doc: (en: "How bold the text is.", fa: "ضخامت متن.")),
      "color": (type: "color", doc: (en: "Text color: a preset (`blue`, `red`...), `accent` or a hex color.", fa: "رنگ متن: یک رنگ آماده (`blue`، `red`...)، `accent` یا رنگ hex.")),
      "align": (type: "enum", values: ("center", "left", "right", "start", "end"), doc: (en: "Where the lines sit: `start`, `end`, `center`, `left` or `right`.", fa: "جای خط‌ها: `start`، `end`، `center`، `left` یا `right`.")),
      "justify": (type: "bool", doc: (en: "`true`: both edges of every line flush with the margins. Default: `[paragraph] justify`.", fa: "`true`: هر دو لبهٔ هر خط هم‌تراز حاشیه‌ها. پیش‌فرض: `[paragraph] justify`.")),
      "line-spacing": (type: "number", default: "100", doc: (en: "Gap between lines in percent of the normal gap: 100 normal, 150 airier, 80 tighter. Default: `[paragraph] line-spacing`.", fa: "فاصلهٔ خط‌ها به درصد فاصلهٔ عادی: ۱۰۰ عادی، ۱۵۰ بازتر، ۸۰ فشرده‌تر. پیش‌فرض: `[paragraph] line-spacing`.")),
      "letter-spacing": (type: "number", default: "0", doc: (en: "Extra space between letters in percent of the font size: 0 normal, 2 looser, -2 tighter. Default: `[paragraph] letter-spacing`.", fa: "فاصلهٔ اضافهٔ حروف به درصد اندازهٔ فونت: ۰ عادی، ۲ بازتر، ۲- فشرده‌تر. پیش‌فرض: `[paragraph] letter-spacing`.")),
      "word-spacing": (type: "number", default: "100", doc: (en: "Space between words in percent of the font's normal space. Default: `[paragraph] word-spacing`.", fa: "فاصلهٔ کلمات به درصد فاصلهٔ عادی فونت. پیش‌فرض: `[paragraph] word-spacing`.")),
      "indent": (type: "length", doc: (en: "Indent of the first line of each paragraph: `1.5em`, `10mm`.", fa: "تورفتگی خط اول هر پاراگراف: `1.5em`، `10mm`.")),
      "above": (type: "length", doc: (en: "Space above the paragraph.", fa: "فاصلهٔ بالای پاراگراف.")),
      "below": (type: "length", doc: (en: "Space below the paragraph.", fa: "فاصلهٔ پایین پاراگراف.")),
      "dir": (type: "enum", values: ("auto", "rtl", "ltr"), default: "auto", doc: (en: "Text direction: `auto` (from the text), `rtl` or `ltr`.", fa: "جهت متن: `auto` (از خود متن)، `rtl` یا `ltr`.")),
    ),
  ),
)

// ---- docs: read by the skill generator of the app and exported with the schema (see docs/doc_en.md, Extending the template)
#let paragraph-docs = (
  en: (
    about: `````md
A paragraph with a look of its own: `<p size="14pt" align="center" line-spacing="150">`. Put a blank line after the opening tag and before the closing one; one tag can hold several paragraphs.

- Text: `font`, `size` (`14pt`, `1.2em`, `120%`), `weight`, `color` (a preset, `accent` or hex) and `dir`.
- Layout: `align`, `justify`, `indent` (first line), `above` and `below` (space around it).
- Spacing: `line-spacing`, `letter-spacing` and `word-spacing`, in percent, like `[paragraph]` in `config.toml` (which they override for this paragraph).
- Everything left out comes from the document.
`````.text,
  ),
  fa: (
    about: `````md
پاراگرافی با ظاهر خودش: `<p size="14pt" align="center" line-spacing="150">`. بعد از تگ باز و قبل از تگ بسته یک خط خالی بگذارید؛ یک تگ می‌تواند چند پاراگراف داشته باشد.

- متن: `font`، `size` (`14pt`، `1.2em`، `120%`)، `weight`، `color` (رنگ آماده، `accent` یا hex) و `dir`.
- چیدمان: `align`، `justify`، `indent` (خط اول)، `above` و `below` (فاصله اطراف).
- فاصله‌گذاری: `line-spacing`، `letter-spacing` و `word-spacing` به درصد، مثل `[paragraph]` در `config.toml` (که برای این پاراگراف بازنویسی‌شان می‌کنند).
- هر چه ننویسید از سند می‌آید.
`````.text,
  ),
  example: (
    en: `````md
<p size="14pt" align="center" weight="bold" color="accent">

A centered, larger, bold line in the accent color.

</p>

<p line-spacing="170" indent="1.5em" justify="true">

A paragraph with airy lines and an indented first line. It goes on for a while so that it wraps over several lines and the spacing shows.

</p>
`````.text,
    fa: `````md
<p size="14pt" align="center" weight="bold" color="accent">

یک خط وسط‌چین، درشت‌تر و پررنگ به رنگ تأکید.

</p>

<p line-spacing="170" indent="1.5em" justify="true">

پاراگرافی با خط‌های باز و تورفتگی در خط اول. آن‌قدر ادامه دارد که چند خط شود و فاصله‌گذاری دیده شود.

</p>
`````.text,
  ),
)
