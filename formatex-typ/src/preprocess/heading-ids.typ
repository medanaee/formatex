#import "/src/prelude.typ": *
#import "/src/preprocess/common.typ": fence-match, option-token

// Compiled once here: `regex(...)` inside a per-line loop would build the pattern again on every line.
#let heading-ids-re-1 = regex("^\s*#+[ \t]+")
#let heading-ids-re-2 = regex("!?\[[^\]]*\]\([^)]*\)")
#let heading-ids-re-3 = regex("[^\p{L}\p{M}\p{N}_\- ]")
#let heading-ids-re-4 = regex("^(\s{0,3}#{1,6}[ \t].*?)[ \t]+\{([^{}]*)\}[ \t]*\r?$")
#let heading-ids-re-5 = regex("^\s{0,3}#{1,6}[ \t]")

// `## Title {#id fill=true numbering=false}` -> the heading plus an invisible metadata labelled
// `id` right after it (cmarker has no heading attributes). Other keys override [heading] for
// this heading only: the heading is wrapped in `#[ ... ]` so its `set heading(numbering: ...)`
// stays local (so does `toc=false` = `set heading(outlined: false)`), and the look keys go through `heading-options` (src/conf.typ). A `{...}` that
// isn't made only of `#id` / `key=value` tokens is left in the title. Fenced code is skipped.
#let heading-ids(src) = {
  let fence = none
  let out = ()
  let token = option-token
  // cmarker's slug keeps the text of links in the title; `#slug` links usually leave them
  // out ("## Tool ([site](url))" -> #tool), so such headings get that second id too.
  let link-free-id(title) = {
    if not title.contains("](") { return none }
    let slug = lower(title.replace(heading-ids-re-1, "").replace(heading-ids-re-2, ""))
    let slug = slug.replace(heading-ids-re-3, "").trim().replace(" ", "-")
    if slug != "" { "<!--raw-typst #metadata((heading-id: \"" + slug + "\"))#label(\"" + slug + "\") -->" }
  }
  for line in src.split("\n") {
    let f = fence-match(line)
    if f != none {
      let mark = f.captures.first().first()
      if fence == none { fence = mark } else if mark == fence { fence = none }
      out.push(line)
      continue
    }
    let m = if fence == none and line.contains("{") { line.match(heading-ids-re-4) }
    let attrs = if m == none { "" } else { m.captures.last() }
    if m == none or attrs.trim() == "" or attrs.replace(token, "").trim() != "" {
      out.push(line)
      if fence == none and line.contains("#") and line.match(heading-ids-re-5) != none {
        let alt = link-free-id(line.trim(at: end))
        if alt != none { out.push(alt) }
      }
      continue
    }
    let id = none
    let opts = (:)
    // `md-at` is where the line is (src/preprocess/mark-lines.typ): not an option, but every problem here says it
    let at-found = attrs.match(regex("md-at=\"([^\"]*)\""))
    let where = if at-found == none { "" } else { at-prefix(at-found.captures.first()) }
    for t in attrs.matches(token) {
      let (tid, key, quoted, bare) = t.captures
      if tid != none { id = tid; continue }
      if key == "md-at" { continue }
      assert(key in heading-option-keys, message: where + "Unknown heading option " + repr(key) + "; available: " + heading-option-keys.join(", "))
      let v = if quoted != none { quoted } else { bare }
      if key in ("numbering", "toc", "underline", "fill") {
        assert(v in ("true", "false"), message: where + "Heading " + key + " must be true or false, got " + repr(v))
        v = v == "true"
      }
      opts.insert(key, v)
    }
    let numbering = "numbering" in opts or "number-suffix" in opts or "number-prefix" in opts
    let look = opts.keys().filter(k => k not in ("numbering", "number-prefix", "number-suffix", "toc")).map(k => (k, opts.at(k))).to-dict()
    let local = numbering or "toc" in opts
    if local or look.len() > 0 {
      let setup = ""
      // toc=false: not outlined, so it leaves <toc> and the header's {section} too.
      if "toc" in opts { setup += "#set heading(outlined: " + repr(opts.toc) + ");" }
      if numbering {
        let on = opts.at("numbering", default: heading-numbered)
        let suffix = opts.at("number-suffix", default: heading-suffix)
        let prefix = opts.at("number-prefix", default: heading-prefix)
        setup += "#set heading(numbering: " + if on { "make-heading-numbering(" + repr(suffix) + ", prefix: " + repr(prefix) + ")" } else { "none" } + ");"
      }
      if look.len() > 0 { setup += "#state(\"heading-options\").update(" + repr(look) + ");" }
      out.push("<!--raw-typst #[" + setup + " -->")
    }
    out.push(m.captures.first())
    if id != none { out.push("<!--raw-typst #metadata((heading-id: \"" + id + "\"))<" + id + "> -->") } else {
      let alt = link-free-id(m.captures.first())
      if alt != none { out.push(alt) }
    }
    if look.len() > 0 { out.push("<!--raw-typst #state(\"heading-options\").update((:)) -->") }
    if local or look.len() > 0 { out.push("<!--raw-typst ] -->") }
  }
  out.join("\n")
}
