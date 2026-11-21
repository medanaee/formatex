#import "/src/prelude.typ": *


#let mitex-fixes = ("\\dashrightarrow": "⇢", "\\dashleftarrow": "⇠")

#let mitex(it, ..args) = {
  let src = if type(it) == str { it } else { it.text }
  for (command, char) in mitex-fixes { src = src.replace(command, char + " ") }
  mitex-base(src, ..args)
}
