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

#let counter-schema = (
  "counter": (
    kind: "void",
    needs: (keys: ("of",), message: "<counter> needs of=\"name\": the name of the counter"),
    description: (en: "A counter of your own: each use steps it and prints its number (exercise 1, 2, 3 ...), with levels, labels and number formats", fa: "شمارندهٔ دلخواه: هر بار نوشتن آن یکی اضافه می‌شود و عدد چاپ می‌شود (تمرین ۱، ۲، ۳ ...)، با سطح، برچسب و قالب عدد"),
    attrs: (
      "of": (type: "string", required: true, doc: (en: "The name of the counter: every name is a counter of its own. Its shape (levels, separator, default label and format) is set in `[counters.<name>]`.", fa: "نام شمارنده: هر نام یک شمارندهٔ جداست. شکلش (سطح‌ها، جداکننده، برچسب و قالب پیش‌فرض) در `[counters.<name>]` تنظیم می‌شود.")),
      "label": (type: "string", doc: (en: "The printed text; `%1` is the number of the first level, `%2` of the second, and so on: `label=\"Exercise %1.\"`. Default: the numbers joined by the separator. `label=\"\"` counts without printing.", fa: "متن چاپی؛ `%1` عدد سطح اول، `%2` سطح دوم و ...: `label=\"تمرین %1.\"`. پیش‌فرض: عددها با جداکننده. `label=\"\"` می‌شمارد ولی چیزی چاپ نمی‌کند.")),
      "format": (type: "string", values: list-number-kinds, doc: (en: "How the numbers are written, as in numbered lists: auto (by the text's language), fa ۱ ۲ ۳, en 1 2 3, fatxt یک دو سه, rome I II III, abc a b c, abjad الف ب ج د, alefba الف ب پ ت. A comma-separated list gives one kind per level: `format=\"en,abc\"`.", fa: "قالب نوشتن عددها، مثل لیست‌های شماره‌دار: auto (از زبان متن)، fa ۱ ۲ ۳، en 1 2 3، fatxt یک دو سه، rome I II III، abc a b c، abjad الف ب ج د، alefba الف ب پ ت. فهرست جداشده با ویرگول برای هر سطح یک قالب می‌دهد: `format=\"en,abc\"`.")),
      "step": (type: "int", default: "1", doc: (en: "How much this use adds to its level. `step=\"0\"` prints the number without adding.", fa: "این بار چقدر به سطحش اضافه شود. `step=\"0\"` بدون اضافه کردن، عدد را چاپ می‌کند.")),
      "set": (type: "int", doc: (en: "Makes this use that number (and the next one the one after it). The other levels stay as they are.", fa: "این بار را همین عدد می‌کند (و بعدی عدد بعد از آن می‌شود). سطح‌های دیگر دست نمی‌خورند.")),
      "level": (type: "int", default: "1", doc: (en: "Which level this use steps. The levels below it go back to zero.", fa: "این بار کدام سطح اضافه شود. سطح‌های پایین‌تر به صفر برمی‌گردند.")),
      "hide": (type: "bool", default: "false", doc: (en: "Counts without printing anything.", fa: "می‌شمارد ولی چیزی چاپ نمی‌کند.")),
    ),
  ),
)

// ---- docs: read by the skill generator of the app and exported with the schema (see docs/doc_en.md, Extending the template)
#let counter-docs = (
  en: (
    about: `````md
A counter of your own. `<counter of="ex" />` prints the next number of the counter called `ex` (1, 2, 3 ...); every `of` name is a counter of its own.

- `label="Exercise %1."` is the printed text: `%1` is the number of the first level, `%2` of the second. `label=""` or `hide` counts without printing.
- `format` writes the numbers like numbered lists do: `auto`, `fa`, `en`, `fatxt`, `rome`, `abc`, `abjad`, `alefba`.
- `step="2"` adds 2; `step="0"` shows the number without adding. `set="10"` makes this use 10, and the next one 11.
- Several levels (`1.1`, `1.2`, `2.1`): give the counter `levels = 2` in `[counters.ex]` of config.toml or in `counters:` of the front matter, and say which level a use steps with `level="2"` (default 1). Stepping a level sets the levels below it back to zero. Between the numbers the default label puts `separator` (default `.`); `label="%1-%2"` writes it yourself.
- In config.toml or the front matter: `label`, `format` (one kind, or a list with one per level), `levels` and `separator` of a counter are written once, and a use can override `label` and `format`.
`````.text,
  ),
  fa: (
    about: `````md
شمارندهٔ دلخواه. `<counter of="ex" />` عدد بعدی شمارنده‌ای به نام `ex` را چاپ می‌کند (۱، ۲، ۳ ...)؛ هر نام `of` یک شمارندهٔ جداست.

- `label="تمرین %1."` متن چاپی است: `%1` عدد سطح اول و `%2` سطح دوم. `label=""` یا `hide` می‌شمارد ولی چیزی چاپ نمی‌کند.
- `format` عددها را مثل لیست‌های شماره‌دار می‌نویسد: `auto`، `fa`، `en`، `fatxt`، `rome`، `abc`، `abjad`، `alefba`.
- `step="2"` دو تا اضافه می‌کند؛ `step="0"` بدون اضافه کردن عدد را نشان می‌دهد. `set="10"` این بار را ۱۰ و بعدی را ۱۱ می‌کند.
- چند سطح (`۱.۱`، `۱.۲`، `۲.۱`): در `[counters.ex]` فایل config.toml یا در `counters:` در front matter برای شمارنده `levels = 2` بدهید و با `level="2"` بگویید این بار کدام سطح اضافه شود (پیش‌فرض ۱). با اضافه شدن یک سطح، سطح‌های پایین‌تر به صفر برمی‌گردند. برچسب پیش‌فرض بین عددها `separator` (پیش‌فرض `.`) می‌گذارد؛ با `label="%1-%2"` خودتان می‌نویسید.
- در config.toml یا front matter: `label`، `format` (یک قالب، یا فهرستی با یکی برای هر سطح)، `levels` و `separator` یک شمارنده یک بار نوشته می‌شود و هر بار استفاده می‌تواند `label` و `format` را بازنویسی کند.
`````.text,
  ),
  example: (
    en: `````md
<counter of="ex" label="Exercise %1." /> Solve the equation.

<counter of="ex" label="Exercise %1." /> Prove it.

<counter of="sec" /> then <counter of="sec" /> then <counter of="sec" format="rome" />
`````.text,
    fa: `````md
<counter of="ex" label="تمرین %1." /> معادله را حل کنید.

<counter of="ex" label="تمرین %1." /> آن را ثابت کنید.

<counter of="sec" /> بعد <counter of="sec" /> بعد <counter of="sec" format="rome" />
`````.text,
  ),
)
