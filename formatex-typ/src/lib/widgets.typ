#import "/src/prelude.typ": *
#import "/src/lib/basics.typ": *

// caption / id on <tree> and <chart>: a numbered figure like <fig> («شکل ۱» / "Figure 1", listed in <lof>).
#let caption-figure(attrs, tag-name, it) = {
  let caption = attrs.at("caption", default: none)
  let id = attrs.at("id", default: none)
  span-columns(attrs, tag-name, if caption == none and id == none { it } else {
    context {
      let detected = if caption != none { content-dir(caption) }
      let d = if detected == none { last-dir.get() } else { detected }
      set text(dir: d)
      let fig = figure(
        it,
        kind: image,
        caption: caption,
        supplement: if d == rtl [شکل] else [Figure],
        numbering: n => numbering(if d == rtl { "۱" } else { "1" }, n),
      )
      if id != none [#fig#label(id)] else { fig }
    }
  })
}

// "۱٬۲۵۰٫۵", "1,250.5", "35%" -> float; an empty cell is a missing value.
#let chart-number(s, where, attrs: none) = {
  let t = s.trim()
  for (i, d) in "۰۱۲۳۴۵۶۷۸۹".clusters().enumerate() { t = t.replace(d, str(i)) }
  for (i, d) in "٠١٢٣٤٥٦٧٨٩".clusters().enumerate() { t = t.replace(d, str(i)) }
  t = t.replace("٫", ".").replace("−", "-").replace(regex("[,٬\s%٪]"), "")
  if t == "" { return none }
  assert(t.match(regex("^-?[0-9]*\.?[0-9]+$")) != none, message: at-of(attrs) + "<chart>: " + repr(s.trim()) + " in " + where + " is not a number")
  float(t)
}

#let chart-label(v, unit, rtl-digits) = {
  let s = if v == calc.round(v) { str(int(calc.round(v))) } else { str(calc.round(v, digits: 3)) }
  if rtl-digits {
    for (i, d) in "۰۱۲۳۴۵۶۷۸۹".clusters().enumerate() { s = s.replace(str(i), d) }
    s = s.replace(".", "٫")
  }
  s = s.replace("-", "−")
  if unit == none { s } else { s + if rtl-digits and unit == "%" { "٪" } else { unit } }
}

// The first element made by `f` (list, enum, ...) inside a tag body.
#let find-first(it, f) = {
  if type(it) == array {
    for c in it {
      let found = find-first(c, f)
      if found != none { return found }
    }
    return none
  }
  if type(it) != content { return none }
  if it.func() == f { return it }
  if it.has("children") { return find-first(it.children, f) }
  if it.has("body") { return find-first(it.body, f) }
  if it.has("child") { return find-first(it.child, f) }
  none
}

// A preset name, "accent" or a hex colour -> a hue; `fallback` when not given.
#let pick-hue(given, tag-name, fallback, attrs: none) = {
  if given == none or given == "" { return fallback }
  if given == "accent" { return theme.accent }
  if given in color-presets { return color-presets.at(given) }
  assert(given.starts-with("#"), message: at-of(attrs) + "<" + tag-name + "> color: unknown color " + repr(given) + "; use accent, a hex color or one of: " + color-names.join(", ") + " (optionally with a shade, like blue-200)")
  rgb(given)
}

#let flag-attr(attrs, key, default, allowed, tag-name) = {
  let v = attrs.at(key, default: default)
  assert(v in allowed, message: at-of(attrs) + "<" + tag-name + "> " + key + " must be one of " + allowed.join(", ") + ", got " + repr(v))
  v
}
