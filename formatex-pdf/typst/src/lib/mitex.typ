#import "/src/prelude.typ": *
#import "@preview/mitex:0.2.7": mitex-convert, mitex-scope


#let mitex-fixes = ("\\dashrightarrow": "⇢", "\\dashleftarrow": "⇠")

// mitex's `array` uses a fixed 0.5em row gap, so labels of `\xrightarrow{..}`
// overlap the previous row. Use a larger gap when such arrows are present.
#let _array-with-gap(gap) = {
  let base = mitex-scope.at("mitexarray")
  (..args) => {
    let pos = args.pos()
    if pos.len() == 0 { return }
    let arg0 = args.named().at("arg0", default: ("l",))
    if type(arg0) != str {
      if arg0.has("children") {
        arg0 = arg0.children.filter(it => it != [ ] and it != [#math.zws])
          .map(it => it.text)
          .filter(it => it == "l" or it == "c" or it == "r")
      } else {
        arg0 = (arg0.text,)
      }
    }
    let matrix = pos.map(row => if type(row) == array { row } else { (row,) })
    let m = calc.max(..matrix.map(row => row.len()))
    matrix = matrix.map(row => row + (m - row.len()) * (none,))
    let align-map = ("l": left, "c": center, "r": right)
    set align(align-map.at(arg0.at(0)))
    pad(y: 0.2em, grid(
      columns: m,
      column-gutter: 0.5em,
      row-gutter: gap,
      ..matrix.flatten().map(it => $it$),
    ))
  }
}

// Author Typst math (`%...%` / `%%...%%`). `bare` is the HTML graphic: the page draws the number.
#let typst-math(it, block: true, bare: false) = {
  let src = if type(it) == str { it } else { it.text }
  let body = eval(src, mode: "math")
  if bare { math.equation(body, block: block, numbering: none) }
  else { math.equation(body, block: block) }
}

#let mitex(it, block: true, ..args) = {
  let src = if type(it) == str { it } else { it.text }
  for (command, char) in mitex-fixes { src = src.replace(command, char + " ") }
  if src.contains("\\xrightarrow") or src.contains("\\xleftarrow") {
    let res = mitex-convert(src)
    let scope = mitex-scope + (mitexarray: _array-with-gap(1.4em))
    math.equation(block: block, eval("$" + res + "$", scope: scope), ..args)
  } else {
    mitex-base(src, block: block, ..args)
  }
}
