#import "/src/prelude.typ": *


// Child tags (<caption>, <item>) mark their content so the parent tag can collect them.
#let tag(kind, attrs, body) = [#metadata((component-tag: kind, attrs: attrs))#body]

#let untag(body, kind) = {
  let is-tag(c) = (
    type(c) == content
      and c.func() == [].func()
      and c.has("children")
      and c.children.len() == 2
      and c.children.at(0).func() == metadata
      and type(c.children.at(0).value) == dictionary
      and c.children.at(0).value.at("component-tag", default: none) == kind
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
      tagged.push((attrs: c.children.at(0).value.attrs, body: c.children.at(1)))
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

// User paths are written relative to the project root, but Typst resolves a path
// relative to the file that calls image()/read(), so component code roots them first.
#let root-path(p) = if type(p) == str and not p.starts-with("/") and not p.contains("://") { "/" + p } else { p }
