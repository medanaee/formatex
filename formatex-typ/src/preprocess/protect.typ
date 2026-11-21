#import "/src/preprocess/common.typ": blank, fence-match
#import "/src/preprocess/comments.typ": blank-comments

#let inline-code-re = regex("`[^`\\n]*`")
#let inline-math-re = regex("\\$[^$\\n]+\\$")

// Mask non-executable regions while preserving original byte offsets.
#let markup-only(src) = {
  let text = blank-comments(src)
  let fence = none
  let lines = ()
  for line in text.split("\n") {
    let f = fence-match(line)
    if f != none {
      let mark = f.captures.first().first()
      if fence == none { fence = mark } else if mark == fence { fence = none }
      lines.push(blank(line))
    } else if fence != none {
      lines.push(blank(line))
    } else {
      let code = if line.contains("`") { line.replace(inline-code-re, m => blank(m.text)) } else { line }
      lines.push(if code.contains("$") { code.replace(inline-math-re, m => blank(m.text)) } else { code })
    }
  }
  lines.join("\n")
}

