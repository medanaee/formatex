#import "/src/prelude.typ": *
#import "/src/lib/remote.typ": *
#import "/src/lib/vars.typ": rooted-path


// Child tags (<caption>, <item>) mark their content so the parent tag can collect them.
#let tag(kind, attrs, body) = metadata((component-tag: kind, attrs: attrs, body: body))

#let untag(body, kind) = {
  let is-tag(c) = (
    type(c) == content
      and c.func() == metadata
      and type(c.value) == dictionary
      and c.value.at("component-tag", default: none) == kind
  )
  let children = if type(body) == array {
    body
  } else if is-tag(body) {
    (body,)
  } else if type(body) == content and body.func() == [].func() and body.has("children") {
    body.children
  } else {
    (body,)
  }
  let tagged = ()
  let rest = ()
  for c in children {
    if is-tag(c) {
      tagged.push((attrs: c.value.attrs, body: c.value.body))
    } else {
      rest.push(c)
    }
  }
  (tagged: tagged, rest: rest)
}

// <img> renders as a clipping box around the image; returns the image and that box's radius.
// span="all" in a multi-column document: the element floats across all columns,
// to the top or bottom of a page (like wide tables). One column: no effect.
#let span-columns(attrs, tag-name, it) = {
  let span = attrs.at("span", default: "column")
  assert(span in ("column", "all"), message: at-of(attrs) + "<" + tag-name + "> span must be column or all, got " + repr(span))
  if span == "all" and column-count > 1 { place(auto, scope: "parent", float: true, clearance: 1.5em, it) } else { it }
}

// The first `raw` element (fenced code block) inside a tag body.
#let find-raw(it) = {
  if type(it) == array {
    for c in it {
      let found = find-raw(c)
      if found != none { return found }
    }
    return none
  }
  if type(it) != content { return none }
  if it.func() == raw { return it }
  if it.has("children") { return find-raw(it.children) }
  if it.has("body") { return find-raw(it.body) }
  if it.has("child") { return find-raw(it.child) }
  none
}

// Text of short inline content such as `<kbd>Ctrl+C</kbd>`.
#let plain-text(it) = {
  if type(it) == str { return it }
  if type(it) != content { return "" }
  if it.func() == [ ].func() { return " " }
  if it.has("text") { return it.text }
  if it.has("children") { return it.children.map(plain-text).sum(default: "") }
  if it.has("body") { return plain-text(it.body) }
  ""
}

// "200" (pt), "5cm", "40mm", "2in", "3em", "50%"
#let parse-length(s, attrs: none) = {
  if s == none { return none }
  let m = s.trim().match(regex("^([0-9]*\.?[0-9]+)\s*(pt|mm|cm|in|em|%)?$"))
  assert(m != none, message: at-of(attrs) + "Invalid length " + repr(s))
  let v = float(m.captures.at(0))
  let unit = m.captures.at(1)
  if unit == "%" { v * 1% }
  else if unit == "mm" { v * 1mm }
  else if unit == "cm" { v * 1cm }
  else if unit == "in" { v * 1in }
  else if unit == "em" { v * 1em }
  else { v * 1pt * zoom }
}

// Must be called inside `context`.
#let resolve-dir(d, body) = {
  if d == "rtl" { rtl } else if d == "ltr" { ltr } else {
    let detected = content-dir(body)
    if detected == none { last-dir.get() } else { detected }
  }
}

#let digits(n, rtl-digits) = numbering(if rtl-digits { "۱" } else { "1" }, n)

// User paths in a Markdown file are resolved relative to that Markdown file (from `attrs._at`
// when given, otherwise `source-path`), while paths starting with `/` stay anchored to the project root.
#let file-of-attrs(attrs) = {
  if type(attrs) != dictionary { return none }
  let at = attrs.at("_at", default: attrs.at("md-at", default: none))
  if type(at) != str or at == "" { return none }
  let parts = at.split(":")
  if parts.len() > 1 { parts.slice(0, -1).join(":") } else { at }
}
#let root-path(p, attrs: none, from: none) = {
  let base = if from != none { from } else {
    let f = file-of-attrs(attrs)
    if f != none { f } else { source-path }
  }
  rooted-path(p, from: base)
}
