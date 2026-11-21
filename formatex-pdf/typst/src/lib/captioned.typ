// Figures, tables, code listings and lists that carry a number and / or a caption. One place decides how they look, so the four agree:
//
//   numbering on, no caption     «شکل ۱»
//   caption, no numbering        «توضیح»
//   both                         «شکل ۱: توضیح»
//
// `numbering` comes from the item (`numbering="true"`) and, when it says nothing, from the settings of its kind: `[figure] numbering`
// (on by default: every figure is numbered) and `[table]`, `[code]`, `[list]` (off by default: with it on, an item gets a number as soon
// as it has a caption; with it off it gets the caption only, until the item turns `numbering` on). `caption-position` ("above" /
// "below") is read the same way. A figure that is not listed (`lof="false"`, `lot`, `lol`) stays out of the list of its kind.
//
// Imports only the core, so the document rule (src/conf.typ) can use it for tables as well as the components.
#import "/src/core.typ": *

#let caption-defaults = (
  figure: (numbering: true, position: "below"),
  table: (numbering: false, position: "above"),
  code: (numbering: false, position: "above"),
  list: (numbering: false, position: "below"),
)

// One setting of a kind from config.toml / the front matter, or its default
#let caption-setting(group, key) = {
  let table = config.at(group, default: none)
  if table == none { return caption-defaults.at(group).at(key) }
  assert(type(table) == dictionary, message: setting-prefix(group) + "[" + group + "] must be a table of settings, got " + repr(table))
  let name = if key == "position" { "caption-position" } else { "numbering" }
  let value = table.at(name, default: none)
  if value == none { return caption-defaults.at(group).at(key) }
  if key == "numbering" {
    assert(type(value) == bool, message: setting-prefix(group, name) + "[" + group + "] numbering must be true or false, got " + repr(value))
  } else {
    assert(value in ("above", "below"), message: setting-prefix(group, name) + "[" + group + "] caption-position must be above or below, got " + repr(value))
  }
  value
}

// An option an item writes as text ("true" / "false"), or none when it does not write it
#let caption-flag(opts, key) = {
  let v = opts.at(key, default: none)
  if v == none or v == "" { none } else if type(v) == bool { v } else { v == "true" }
}

// `body` as a figure of `kind`, when it is numbered, has a caption or an id; otherwise `body` itself.
//   group        "figure", "table", "code" or "list": the settings it reads
//   implicit     a figure is numbered without a caption; the others only with one
//   numbering    the item's own `numbering` (true / false / none), `position` its own `caption-position`, `listed` its `lof` / `lot` / `lol`
#let captioned(group, kind, supplement-fa, supplement-en, body, caption: none, id: none, numbering: none, position: none, listed: true, implicit: false) = {
  let global = caption-setting(group, "numbering")
  let numbered = if numbering != none {
    numbering
  } else if group == "figure" and implicit {
    global
  } else if group == "figure" {
    global and (caption != none or id != none)
  } else {
    global and caption != none
  }
  if not (numbered or caption != none or id != none) { return body }
  context {
    let detected = if caption != none { content-dir(caption) }
    let d = if detected == none { last-dir.get() } else { detected }
    set text(dir: d)
    let place = if (if position != none { position } else { caption-setting(group, "position") }) == "above" { top } else { bottom }
    let fig = figure(
      body,
      kind: kind,
      // A figure with a number and no caption has a caption with nothing in it, so the number stands alone
      caption: if caption == none { figure.caption(position: place, separator: [], []) } else { figure.caption(position: place, caption) },
      supplement: if d == rtl [#supplement-fa] else [#supplement-en],
      numbering: if numbered { n => std.numbering(if d == rtl { "۱" } else { "1" }, n) } else { none },
      outlined: listed,
    )
    if id != none [#fig#label(id)] else { fig }
  }
}
