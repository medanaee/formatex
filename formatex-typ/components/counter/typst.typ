#import "/src/kit.typ": *

// <counter of="ex" />: a counter of your own. `of` names it (every name is its own counter), each use steps it and prints its number.
// A counter can have several levels (1, 1.1, 1.2, 2): stepping a level sets the levels below it back to zero, like headings.
// The shape of a counter is written once, in `[counters.<name>]` of config.toml or `counters:` of the front matter:
//   label       the text printed, with %1 (the number of the first level), %2 ... in it; default: the numbers joined by `separator`
//   format      how the numbers are written: one of the kinds of numbered lists (auto, fa, en, fatxt, rome, abc, abjad, alefba),
//               or a list with one kind per level
//   levels      how many levels (default 1)
//   separator   between the numbers of the default label (default ".")
// A use can override `label` and `format`.
#let counter-config = config.at("counters", default: (:))

#let counter-list(value) = {
  if value == none { () }
  else if type(value) == array { value.map(v => str(v).trim()) }
  else { str(value).split(",").map(s => s.trim()).filter(s => s != "") }
}

// An integer from a setting or an attribute, or a problem said with its line
#let counter-int(value, what, at, min: none, max: none) = {
  let text-value = str(value).trim()
  assert(text-value.match(regex("^-?[0-9]+$")) != none, message: at + "<counter> " + what + " must be a whole number, got " + repr(value))
  let n = int(text-value)
  if min != none { assert(n >= min, message: at + "<counter> " + what + " must be at least " + str(min) + ", got " + str(n)) }
  if max != none { assert(n <= max, message: at + "<counter> " + what + " must be at most " + str(max) + ", got " + str(n)) }
  n
}

#let counter-tags = (
    counter: ("void", attrs => {
      let at = at-of(attrs)
      let of = attrs.at("of", default: "").trim()
      assert(of != "", message: at + "<counter> needs of=\"name\": the name of the counter")
      let own = counter-config.at(of, default: (:))
      assert(type(own) == dictionary, message: at + "<counter> the settings of counter " + repr(of) + " must be a table (label, format, levels, separator)")

      let levels = counter-int(own.at("levels", default: 1), "levels", at, min: 1, max: 9)
      let separator = str(own.at("separator", default: "."))
      let formats = counter-list(attrs.at("format", default: own.at("format", default: none)))
      for kind in formats {
        assert(kind in list-number-kinds, message: at + "<counter> format must be one of " + list-number-kinds.join(", ") + ", got " + repr(kind))
      }
      assert(formats.len() <= levels, message: at + "<counter> " + repr(of) + " has " + str(levels) + " level(s), but " + str(formats.len()) + " formats are given")
      let format-of(i) = if formats.len() == 0 { "auto" } else { formats.at(i, default: formats.last()) }

      let level = counter-int(attrs.at("level", default: 1), "level", at, min: 1)
      assert(level <= levels, message: at + "<counter> level " + str(level) + " does not exist: " + repr(of) + " has " + str(levels) + " level(s); give it `levels` in [counters." + of + "]")
      let step = counter-int(attrs.at("step", default: 1), "step", at, min: 0)
      let set-to = if "set" in attrs { counter-int(attrs.at("set"), "set", at) } else { none }
      let hidden = attrs.at("hide", default: "false") not in ("false", "no", "0")

      let default-label = range(1, levels + 1).map(i => "%" + str(i)).join(separator)
      let label = str(attrs.at("label", default: own.at("label", default: default-label)))
      let silent = hidden or label == ""

      let key = "formatex-counter-" + of
      let move = (..nums) => {
        let values = nums.pos()
        while values.len() < levels { values.push(0) }
        if set-to != none { values.at(level - 1) = set-to }
        else {
          values.at(level - 1) += step
          for i in range(level, values.len()) { values.at(i) = 0 }
        }
        values
      }
      let update = if set-to != none or step > 0 { counter(key).update(move) }

      if silent { return update }
      [#update#context {
        let nums = counter(key).get()
        let written = range(levels).map(i => format-number(format-of(i), nums.at(i, default: 0)))
        label.replace(regex("%([0-9])"), m => {
          let i = int(m.captures.first())
          assert(i >= 1 and i <= levels, message: at + "<counter> label uses %" + str(i) + ", but " + repr(of) + " has " + str(levels) + " level(s)")
          written.at(i - 1)
        })
      }]
    }),
)
