// `<code>` followed at once by a fenced code block (and `</code>` right after it) has no blank lines around the fence. In Markdown
// a lone tag line starts an HTML block that runs on until a blank line, so the fence would be swallowed as plain text and
// `<code>` would not find its code. Blank lines are added there, so both spellings work. Fenced code is left as it is.
#import "/src/preprocess/common.typ": fence-match

#let open-code = regex("^\s*<code(\s[^>]*)?>\s*$")
#let close-code = regex("^\s*</code>\s*$")

#let code-tag-spacing(src) = {
  if not src.contains("<code") { return src }
  let lines = src.split("\n")
  let out = ()
  let fence = none
  for (i, line) in lines.enumerate() {
    let mark = fence-match(line)
    if fence != none {
      out.push(line)
      // The closing fence: same character, at least as long
      if mark != none {
        let m = mark.captures.first()
        if m.first() == fence.first() and m.len() >= fence.len() { fence = none }
      }
      continue
    }
    if mark != none {
      // `</code>` straight after a fence that has just ended is handled below; here a fence starts
      fence = mark.captures.first()
      out.push(line)
      continue
    }
    if line.match(close-code) != none and out.len() > 0 and out.last().trim() != "" and fence-match(out.last()) != none { out.push("") }
    out.push(line)
    if line.match(open-code) != none and i + 1 < lines.len() and fence-match(lines.at(i + 1)) != none { out.push("") }
  }
  out.join("\n")
}
