#import "/src/prelude.typ": *

// Drawing code is Typst, but authors write LaTeX in its `$...$` (`$B_r \times B_c$`). Before
// the code runs, math containing `\` or `{` becomes a `latex-math("...")` call; other math
// (`$x^2$`, `$a times b$`) is left alone. The scanner tracks code vs. markup (`[...]`), strings
// and comments so the call is written in the form that is valid at that spot. In labels it also
// accepts Markdown habits: `**bold**` becomes `*bold*`, and a `#` not starting code (`#۰۳`) is literal.
#let latex-in-code(src) = {
  let cs = src.clusters()
  let n = cs.len()
  let out = ()
  let stack = ((markup: false, close: none),)
  let i = 0
  while i < n {
    let c = cs.at(i)
    let next = if i + 1 < n { cs.at(i + 1) } else { "" }
    let top = stack.last()
    if c == "$" {
      let j = i + 1
      while j < n and not (cs.at(j) == "$" and cs.at(j - 1) != "\\") { j += 1 }
      let math = cs.slice(i + 1, calc.min(j, n)).join()
      if j < n and (math.contains("\\") or math.contains("{")) {
        let call = "latex-math(" + repr(math.trim()) + ")"
        out.push(if top.markup { "#{" + call + "}" } else { call })
      } else {
        out.push(cs.slice(i, calc.min(j + 1, n)).join())
      }
      i = j + 1
      continue
    }
    if top.markup {
      if c == "\\" { out.push(c + next); i += 2; continue }
      if c == "`" {
        let j = i + 1
        while j < n and cs.at(j) != "`" { j += 1 }
        out.push(cs.slice(i, calc.min(j + 1, n)).join()); i = j + 1; continue
      }
      if c == "*" and next == "*" { out.push("*"); i += 2; continue }
      if c == "#" and next.match(regex("^[A-Za-z_({\[]$")) == none { out.push("\\#"); i += 1; continue }
      if c == "[" { stack.push((markup: true, close: "]")) }
      else if c == "]" and top.close == "]" { let _ = stack.pop() }
      else if c == "#" and next in ("(", "{") {
        stack.push((markup: false, close: if next == "(" { ")" } else { "}" }))
        out.push(c + next); i += 2; continue
      } else if c == "#" {
        // `#name(...)` / `#name.field(...)`: the argument list is code again.
        let j = i + 1
        while j < n and cs.at(j).match(regex("[\p{L}\p{N}_.\-]")) != none { j += 1 }
        if j < n and cs.at(j) == "(" {
          stack.push((markup: false, close: ")"))
          out.push(cs.slice(i, j + 1).join()); i = j + 1; continue
        }
      }
    } else {
      if c == "\"" {
        let j = i + 1
        while j < n and cs.at(j) != "\"" { j += if cs.at(j) == "\\" { 2 } else { 1 } }
        out.push(cs.slice(i, calc.min(j + 1, n)).join()); i = j + 1; continue
      }
      if c == "/" and next == "/" {
        let j = i
        while j < n and cs.at(j) != "\n" { j += 1 }
        out.push(cs.slice(i, j).join()); i = j; continue
      }
      if c == "/" and next == "*" {
        let j = i + 2
        while j + 1 < n and not (cs.at(j) == "*" and cs.at(j + 1) == "/") { j += 1 }
        out.push(cs.slice(i, calc.min(j + 2, n)).join()); i = j + 2; continue
      }
      if c == "[" { stack.push((markup: true, close: "]")) }
      else if c == "(" { stack.push((markup: false, close: ")")) }
      else if c == "{" { stack.push((markup: false, close: "}")) }
      else if c in (")", "}", "]") and top.close == c and stack.len() > 1 { let _ = stack.pop() }
    }
    out.push(c)
    i += 1
  }
  out.join()
}
