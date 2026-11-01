#import "/src/kit.typ": *

#let space-tags = (
    // <v size="1.5em" />: vertical space.
    v: ("void", attrs => v(
      parse-length(attrs.at("size", default: "1em"), attrs: attrs),
      weak: attrs.at("weak", default: "false") == "true",
    )),
    // <pagebreak /> starts a new page.
    pagebreak: ("void", attrs => pagebreak(
      weak: attrs.at("weak", default: "false") == "true",
      ..if "to" in attrs and attrs.to != "" { (to: attrs.to) },
    )),
)

#let space-break-attrs = (
  "weak": (type: "bool", default: "false", doc: (en: "`true`: no break when the page is already empty (the break is skipped at the top of a page)", fa: "`true`: اگر صفحه همین حالا خالی است شکستی انجام نمی‌شود (بالای صفحه نادیده گرفته می‌شود)")),
  "to": (type: "enum", values: ("even", "odd"), doc: (en: "Continue on the next `even` or `odd` page (may leave a blank page)", fa: "ادامه در صفحهٔ بعدیِ زوج (`even`) یا فرد (`odd`)؛ ممکن است یک صفحهٔ خالی بماند")),
)

#let space-schema = (
  "v": (
    kind: "void",
    description: (en: "Vertical space", fa: "فاصلهٔ عمودی"),
    attrs: (
      "size": (type: "length", default: "1em", doc: (en: "Height of the gap: `1em`, `2cm`, `12pt`", fa: "ارتفاع فاصله: `1em`، `2cm`، `12pt`")),
      "weak": (type: "bool", default: "false", doc: (en: "`true`: the gap disappears at the top or bottom of a page and next to other spacing", fa: "`true`: فاصله بالا و پایین صفحه و کنار فاصله‌های دیگر حذف می‌شود")),
    ),
  ),
  "pagebreak": (
    kind: "void",
    description: (en: "Start a new page", fa: "شروع صفحهٔ جدید"),
    attrs: space-break-attrs,
  ),
)

// ---- docs: read by the skill generator of the app and exported with the schema (see docs/doc_en.md, Extending the template)
#let space-docs = (
  en: (
    about: `````md
Vertical space and page breaks: `<v size="2cm" />` and `<pagebreak />`.

- `<v size="2cm" />` leaves a vertical gap on its own line (`size` defaults to `1em`; `weak="true"` drops it at the top or bottom of a page).
- `<pagebreak />` starts a new page; `to="odd"` / `to="even"` continues on the next odd or even page; `weak="true"` skips the break when the page is already empty.
`````.text,
  ),
  fa: (
    about: `````md
فاصلهٔ عمودی و شکستن صفحه: `<v size="2cm" />` و `<pagebreak />`.

- `<v size="2cm" />` در یک خط فاصلهٔ عمودی می‌گذارد (`size` پیش‌فرض `1em`؛ `weak="true"` آن را بالا یا پایین صفحه حذف می‌کند).
- `<pagebreak />` صفحهٔ جدید شروع می‌کند؛ `to="odd"` / `to="even"` در صفحهٔ فرد یا زوج بعدی ادامه می‌دهد؛ `weak="true"` اگر صفحه از قبل خالی است شکست نمی‌دهد.
`````.text,
  ),
  example: (
    en: `````md
<v size="2cm" />

<pagebreak />
<pagebreak to="odd" />
`````.text,
    fa: `````md
<v size="2cm" />

<pagebreak />
<pagebreak to="odd" />
`````.text,
  ),
)
