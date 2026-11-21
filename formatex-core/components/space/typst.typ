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

// The HTML form (optional, used by the HTML export): a page and a gap between lines mean nothing on a page that scrolls
#let space-break-attrs = (
  "weak": (type: "bool", default: "false", doc: (en: "`true`: no break when the page is already empty (the break is skipped at the top of a page)", fa: "`true`: اگر صفحه همین حالا خالی است شکستی انجام نمی‌شود (بالای صفحه نادیده گرفته می‌شود)")),
  "to": (type: "enum", values: ("even", "odd"), doc: (en: "Continue on the next `even` or `odd` page (may leave a blank page)", fa: "ادامه در صفحهٔ بعدیِ زوج (`even`) یا فرد (`odd`)؛ ممکن است یک صفحهٔ خالی بماند")),
)
