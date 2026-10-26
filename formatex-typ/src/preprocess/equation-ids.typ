#import "/src/prelude.typ": *
#import "/src/preprocess/common.typ": fence-match, option-token

// Compiled once here: `regex(...)` inside a per-line loop would build the pattern again on every line.
#let equation-ids-re-1 = regex("^(.*\$\$)[ \t]*\{#([\p{L}\p{N}_\-.:]+)\}[ \t]*\r?$")
#let equation-ids-re-2 = regex("^[ \t]*\{#([\p{L}\p{N}_\-.:]+)\}[ \t]*\r?$")

// `$$ ... $$ {#id}` -> the equation gets a number and becomes a <ref> target.
// A marker before the opening `$$` tells the equation rule (src/conf.typ) to number it;
// a labelled metadata after it is what <ref> finds.
#let equation-ids(src) = {
  let fence = none
  let out = ()
  for line in src.split("\n") {
    let f = fence-match(line)
    if f != none {
      let mark = f.captures.first().first()
      if fence == none { fence = mark } else if mark == fence { fence = none }
      out.push(line)
      continue
    }
    let m = if fence == none and line.contains("{#") { line.match(equation-ids-re-1) }
    // `{#id}` alone on the line right after the closing `$$`.
    let alone = if fence == none and m == none and line.contains("{#") and out.len() > 0 and out.last().trim().ends-with("$$") {
      line.match(equation-ids-re-2)
    }
    if m == none and alone == none {
      out.push(line)
      continue
    }
    let (math-line, id) = if m != none { m.captures } else { (out.pop().trim(at: end), alone.captures.first()) }
    // One-line `$$...$$` opens on this line; otherwise the opening `$$` is on an earlier line.
    let open = out.len()
    if math-line.matches("$$").len() < 2 {
      let back = range(out.len()).rev().find(i => out.at(i).contains("$$"))
      assert(back != none, message: "{#" + id + "} follows a `$$` that has no opening `$$`")
      open = back
    }
    out.insert(open, "<!--raw-typst #state(\"equation-next\").update(\"" + id + "\") -->")
    out.push(math-line)
    out.push("<!--raw-typst #metadata((equation-id: \"" + id + "\"))<" + id + "> #state(\"equation-next\").update(none) -->")
  }
  out.join("\n")
}
