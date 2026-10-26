#import "/src/prelude.typ": *
#import "/src/lib/basics.typ": *

#let space-tags = (
    // <v size="1.5em" />: vertical space.
    v: ("void", attrs => v(
      parse-length(attrs.at("size", default: "1em")),
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
