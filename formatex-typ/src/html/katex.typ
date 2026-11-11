#import "katex-bundle.typ": katex-boot-script
#import "/src/core.typ": config, doc-dir, html-lang
#import "/src/lib/basics.typ": digits
#let katex-math(src, block: false) = {
  let tex = if type(src) == str { src } else if src.has("text") { src.text } else { str(src) }
  let attrs = (
    class: if block { "fx-katex-display" } else { "fx-katex-inline" },
    "data-tex": tex,
    dir: "ltr",
    style: if block {
      "direction: ltr !important; unicode-bidi: isolate !important; text-align: center !important;"
    } else {
      "direction: ltr !important; unicode-bidi: isolate !important;"
    }
  )
  metadata("fx-katex")
  if block {
    context {
      let id = state("equation-next", none).get()
      let mode = config.at("equation", default: (:)).at("numbering", default: "labelled")
      let numbered = mode == "all" or (mode == "labelled" and id != none)
      if numbered { counter(math.equation).step() }
      html.elem("div", attrs: (class: "fx-katex-equation"), {
        html.elem("div", attrs: attrs, "")
        if numbered { html.elem("span", attrs: (class: "fx-equation-number", dir: "ltr"), context { "(" + digits(counter(math.equation).get().first(), doc-dir == "rtl" or (doc-dir == "auto" and html-lang == "fa")) + ")" }) }
      })
    }
  } else {
    html.elem("span", attrs: attrs, "")
  }
}
