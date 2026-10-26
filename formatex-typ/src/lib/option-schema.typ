// The `{...}` option lines of Markdown (not HTML tags): what each kind accepts and where it may stand.
// Same entry shape as a component's `<name>-schema` attrs (type, values?, default?, required?, doc: (en, fa)),
// plus per group:
//   where: (en, fa)   the places the `{...}` may stand
//   syntax            an example
// `#id` inside the braces is the attribute `id` (it has `shorthand: "#"`).
// The code reads its allowed keys from here (`option-keys`) and tools/export-schema.mjs writes it under
// `options` in dist/tags.json for editor autocomplete. Imports nothing, so any file can use it.
#let align-values = ("center", "left", "right", "start", "end")

#let id-attr(what) = (type: "id", shorthand: "#", doc: (
  en: "Target for `<ref>`" + what + ". Written `#id` inside the braces.",
  fa: "هدف برای `<ref>`" + what + ". داخل آکولاد به شکل `#id` نوشته می‌شود.",
))

#let option-schemas = (
  table: (
    where: (en: "A `{...}` line directly above a table (a blank line in between is fine)", fa: "یک خط `{...}` درست بالای جدول (فاصلهٔ خالی بینشان اشکالی ندارد)"),
    syntax: "{width=full caption=\"...\" #tbl-id}",
    attrs: (
      "width": (type: "enum", values: ("auto", "full"), default: "auto", doc: (en: "`auto`: as wide as the content. `full`: the full text width.", fa: "`auto`: به پهنای محتوا. `full`: تمام پهنای متن.")),
      "align": (type: "enum", values: align-values, doc: (en: "Where an `auto`-width table sits", fa: "جای جدولی که پهنایش `auto` است")),
      "caption": (type: "string", doc: (en: "Text shown above the table; quote it if it has spaces. A caption or an id makes the table numbered.", fa: "متن بالای جدول؛ اگر فاصله دارد در گیومه بگذارید. کپشن یا شناسه جدول را شماره‌دار می‌کند.")),
      "id": id-attr(" and the table's number"),
      "span": (type: "enum", values: ("column", "all"), default: "column", doc: (en: "`all`: in a multi-column document the table spans every column", fa: "`all`: در سند چندستونه جدول روی همهٔ ستون‌ها می‌افتد")),
      "head-align": (type: "enum", values: align-values, doc: (en: "Text alignment of the header row; overrides the column colons", fa: "تراز متن ردیف سرستون؛ بر دونقطه‌های ستون برتری دارد")),
      "body-align": (type: "enum", values: align-values, doc: (en: "The same for all other rows", fa: "همان برای بقیهٔ ردیف‌ها")),
    ),
  ),
  heading: (
    where: (en: "At the end of a heading line", fa: "آخر خط یک تیتر"),
    syntax: "## Summary {#sec-summary fill=true color=purple}",
    attrs: (
      "id": id-attr(""),
      "numbering": (type: "bool", doc: (en: "Number this heading or not; an unnumbered heading doesn't use up a number", fa: "این تیتر شماره بخورد یا نه؛ تیتر بی‌شماره یک شماره مصرف نمی‌کند")),
      "number-prefix": (type: "string", doc: (en: "Text before the number, quoted if it has spaces: `number-prefix=\"(\"` with `number-suffix=\")\"` gives «(۱)»", fa: "متن قبل از شماره؛ اگر فاصله دارد در گیومه: `number-prefix=\"(\"` همراه `number-suffix=\")\"` می‌شود «(۱)»")),
      "number-suffix": (type: "string", doc: (en: "Text after the number, quoted if it has spaces", fa: "متن بعد از شماره؛ اگر فاصله دارد در گیومه")),
      "toc": (type: "bool", doc: (en: "`false` leaves this heading out of `<toc>` and the header's `{section}`", fa: "`false` این تیتر را از `<toc>` و `{section}` سربرگ حذف می‌کند")),
      "underline": (type: "bool", doc: (en: "A rule below the heading", fa: "خط زیر تیتر")),
      "fill": (type: "bool", doc: (en: "A light tint behind the heading", fa: "ته‌رنگ پشت تیتر")),
      "color": (type: "color", doc: (en: "Base color of the text, rule and tint: a preset or hex", fa: "رنگ پایهٔ متن، خط و ته‌رنگ: رنگ آماده یا hex")),
    ),
  ),
  list: (
    where: (en: "A `{...}` line directly above a list", fa: "یک خط `{...}` درست بالای لیست"),
    syntax: "{numbers=abjad prefix=\"(\" suffix=\")\" marker=dash caption=\"...\" #lst-id}",
    attrs: (
      "numbers": (type: "enum", values: ("auto", "fa", "en", "fatxt", "rome", "abc", "abjad", "alefba"), default: "auto", doc: (en: "Numbering of an ordered list", fa: "شمارهٔ لیست مرتب")),
      "prefix": (type: "string", default: "", doc: (en: "Text right before the number: `\"(\"` with suffix `\")\"` gives «(۱)»", fa: "متن بلافاصله قبل از شماره: `\"(\"` با پسوند `\")\"` می‌شود «(۱)»")),
      "suffix": (type: "string", default: ".", doc: (en: "Text right after the number", fa: "متن بلافاصله بعد از شماره")),
      "marker": (type: "string", doc: (en: "Bullet of unnumbered lists: a character or a name (`disc`, `circle`, `square`, `dash`, `triangle`, `arrow`, `check`, `star`, `none`); comma-separated for one per level", fa: "نشانهٔ لیست بی‌شماره: یک نویسه یا نام (`disc`، `circle`، `square`، `dash`، `triangle`، `arrow`، `check`، `star`، `none`)؛ با ویرگول برای هر سطح یکی")),
      "indent": (type: "length", doc: (en: "Extra indent of this list", fa: "تورفتگی اضافهٔ این لیست")),
      "start": (type: "int", doc: (en: "First number of an ordered list", fa: "شمارهٔ نخست لیست مرتب")),
      "caption": (type: "string", doc: (en: "Makes the list a numbered «فهرست ۱» / \"List 1\"", fa: "لیست را «فهرست ۱» / \"List 1\" شماره‌دار می‌کند")),
      "id": id-attr(" and the list's number"),
    ),
  ),
  equation: (
    where: (en: "After the closing `$$` of a display equation, on the same line or alone on the next", fa: "بعد از `$$` پایانی معادلهٔ نمایشی، در همان خط یا تنها در خط بعد"),
    syntax: "$$ e^{i\\pi} + 1 = 0 $$ {#eq-euler}",
    attrs: (
      "id": (..id-attr(" and the equation's number"), required: true),
    ),
  ),
  span: (
    where: (en: "Right after a `[text]` in a line (an `id`, a `highlight`, or both)", fa: "درست بعد از `[متن]` در یک خط"),
    syntax: "[text]{#some-term highlight=green}",
    attrs: (
      "id": id-attr(" (the text becomes a reference target)"),
      "highlight": (type: "color", doc: (en: "Highlighter band behind the text: `true` (yellow), a color preset, Tailwind name or hex", fa: "نوار هایلایت پشت متن: `true` (زرد)، رنگ آماده، نام Tailwind یا hex")),
    ),
  ),
)

// The attribute names of one group (the `{...}` keys), minus the ones that are handled elsewhere.
#let option-keys(group, without: ()) = option-schemas.at(group).attrs.keys().filter(k => k not in without)
