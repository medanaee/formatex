#import "/src/kit.typ": *

// <exercise>: numbered question; <choices> lays out a list as lettered options; <answer> is
// shown, hidden or collected under <answers> by `answers` (config / --input).
#let answers-mode = sys.inputs.at("answers", default: str(config.at("answers", default: "show")))
#assert(answers-mode in ("show", "hide", "end"), message: setting-prefix("answers") + "answers must be show, hide or end, got " + repr(answers-mode))

#let exercise-answers = state("exercise-answers", ())

// The exercise being laid out, so <choices> can file its correct option under it.
#let exercise-head = state("exercise-head", none)

#let answer-frame(word, body, r) = {
  let tint = tinted(color-presets.green)
  let head = text(weight: "bold", fill: if feel-name == "formal" { theme.muted } else { tint.icon }, word)
  if feel-name == "formal" {
    block(width: 100%, above: 0.9em, stroke: (top: (thickness: 0.6pt * zoom, paint: theme.rule, dash: "dashed")), inset: (top: 0.7em), [#head#h(0.5em)#body])
  } else {
    block(width: 100%, above: 0.9em, fill: tint.fill, stroke: 0.6pt * zoom + tint.border, radius: calc.min(feel.box, 8pt * zoom), inset: (x: 10pt * zoom, y: 8pt * zoom), {
      grid(columns: (auto, 1fr), column-gutter: 0.6em, text(fill: tint.icon, fa-icon("circle-check")), block(width: 100%, [#head#h(0.5em)#body]))
    })
  }
}

#let exercise-block(attrs, body) = {
  let c = counter("exercise")
  c.step()
  let id = attrs.at("id", default: none)
  if id != none [#metadata((exercise-name: attrs.at("name", default: none)))#label(id)]
  let parts = untag(body, "answer")
  let question = parts.rest.join()
  let title = attrs.at("title", default: none)
  context {
    let d = resolve-dir(attrs.at("dir", default: "auto"), if title != none { title } else { question })
    let r = d == rtl
    set text(dir: d)
    let n = c.get().first()
    let word = attrs.at("name", default: if r { "تمرین" } else { "Exercise" })
    let points = attrs.at("points", default: none)
    let points-text = if points != none {
      let p = chart-number(points, "points", attrs: attrs)
      text(size: 0.85em, fill: theme.muted, if r [#chart-label(p, none, r) نمره] else [#chart-label(p, none, r) #if p == 1 [point] else [points]])
    }
    let number = digits(n, r)
    let head-color = if feel-name == "formal" { theme.heading } else { theme.accent }
    let head = block(below: 0.75em, sticky: true, {
      text(weight: "bold", fill: head-color, [#word #number#if title != none [ (#title)]#if feel-name == "formal" [.]])
      if points-text != none { h(1fr) + points-text }
    })
    let answers = parts.tagged
    let answer-word = if r { "پاسخ" } else { "Answer" }
    let inner = {
      head
      block(width: 100%, question)
      if answers-mode == "show" {
        for a in answers { answer-frame(answer-word, a.body, r) }
      }
    }
    exercise-head.update((word: word, number: number, r: r))
    if answers-mode == "end" and answers.len() > 0 {
      exercise-answers.update(all => all + ((word: word, number: number, body: answers.map(a => a.body).join(parbreak()), r: r),))
    }
    if feel-name == "formal" {
      block(width: 100%, above: 1.2em, below: 1.2em, inner)
    } else {
      block(width: 100%, above: 1.2em, below: 1.2em, fill: tinted(theme.accent).fill, radius: feel.box, inset: (x: 12pt * zoom, y: 10pt * zoom), inner)
    }
    exercise-head.update(none)
  }
}

#let choices-block(attrs, body) = {
  let found = find-first(body, list)
  if found == none { found = find-first(body, enum) }
  assert(found != none, message: at-of(attrs) + "<choices> needs a Markdown list, one option per item")
  let items = found.children.map(it => it.body)
  let style = flag-attr(attrs, "numbers", "letters", ("letters", "numbers"), "choices")
  let correct = if "correct" in attrs {
    attrs.correct.split(",").map(s => int(chart-number(s, "correct", attrs: attrs)))
  } else { () }
  let given-cols = if "cols" in attrs { int(attrs.cols) }
  context {
    let d = resolve-dir(attrs.at("dir", default: "auto"), body)
    let r = d == rtl
    set text(dir: d)
    let green = tinted(color-presets.green)
    let accent = tinted(theme.accent)
    let mark(i) = {
      let is-correct = answers-mode == "show" and (i + 1) in correct
      let name = if style == "numbers" { digits(i + 1, r) } else if r { abjad-letters.at(calc.rem(i, abjad-letters.len())) } else { "abcdefghijklmnopqrstuvwxyz".at(calc.rem(i, 26)) }
      if feel-name == "formal" {
        text(weight: if is-correct { "bold" } else { "regular" }, fill: if is-correct { green.icon } else { theme.fg }, [#name)])
      } else {
        let s = 1.45em
        box(
          width: if feel-name == "friendly" { s } else { auto }, height: s,
          inset: (x: if feel-name == "friendly" { 0pt } else { 0.4em }),
          radius: if feel-name == "friendly" { s / 2 } else { calc.min(feel.badge, 4pt * zoom) },
          fill: if is-correct { green.icon } else { accent.fill },
          stroke: 0.6pt * zoom + if is-correct { green.icon } else { accent.border },
          align(center + horizon, text(size: 0.85em, weight: "bold", fill: if is-correct { theme.bg } else { accent.icon }, top-edge: "cap-height", bottom-edge: "baseline", name)),
        )
      }
    }
    let head = exercise-head.get()
    if answers-mode == "end" and correct.len() > 0 and head != none {
      let names = correct.map(k => if style == "numbers" { digits(k, head.r) } else if head.r { abjad-letters.at(calc.rem(k - 1, abjad-letters.len())) } else { "abcdefghijklmnopqrstuvwxyz".at(calc.rem(k - 1, 26)) })
      let note = if head.r [گزینهٔ #names.join("، ")] else [#if names.len() > 1 [Options] else [Option] #names.join(", ")]
      exercise-answers.update(all => all + ((word: head.word, number: head.number, body: note, r: head.r),))
    }
    let option(i, it) = {
      let is-correct = answers-mode == "show" and (i + 1) in correct
      grid(columns: (auto, 1fr), column-gutter: 0.55em, align: start + horizon, mark(i), if is-correct { strong(it) } else { it })
    }
    layout(size => {
      let gap = 1.2em.to-absolute()
      let widest = calc.max(..items.enumerate().map(((i, it)) => measure(grid(columns: 2, column-gutter: 0.55em, mark(i), it)).width))
      let cols = if given-cols != none { given-cols } else {
        let fits(k) = widest <= (size.width - gap * (k - 1)) / k
        if items.len() >= 4 and fits(4) { 4 } else if fits(2) { 2 } else { 1 }
      }
      block(width: 100%, above: 0.9em, grid(columns: (1fr,) * cols, column-gutter: gap, row-gutter: 0.8em, ..items.enumerate().map(((i, it)) => option(i, it))))
    })
  }
}

#let answers-list(attrs) = {
  if answers-mode != "end" { return [] }
  context {
    let all = exercise-answers.final()
    let title = attrs.at("title", default: none)
    let d = resolve-dir(attrs.at("dir", default: "auto"), if title != none { title } else if all.len() > 0 { all.first().word } else { [] })
    let r = d == rtl
    set text(dir: d)
    block(below: 1.2em, text(size: 1.25em, weight: "bold", fill: theme.heading, if title != none { title } else if r { "پاسخ‌ها" } else { "Answers" }))
    // An exercise with both <choices> and <answer> gets one entry.
    let groups = ()
    for a in all {
      if groups.len() > 0 and groups.last().word == a.word and groups.last().number == a.number {
        groups.last().body = groups.last().body + parbreak() + a.body
      } else { groups.push(a) }
    }
    for a in groups {
      block(width: 100%, below: 1em, [#text(weight: "bold", fill: if feel-name == "formal" { theme.heading } else { theme.accent }, [#a.word #a.number.])#h(0.5em)#a.body])
    }
  }
}

#let exercise-tags = (
    exercise: (attrs, body) => exercise-block(attrs, body),
    answer: (attrs, body) => tag("answer", attrs, body),
    choices: (attrs, body) => choices-block(attrs, body),
    answers: (attrs, body) => answers-list(attrs),
)

#let exercise-schema = (
  "exercise": (
    kind: "block",
    description: (en: "exercises and quizzes", fa: "تمرین و آزمون"),
    attrs: (
      "title": (type: "string", doc: (en: "Shown in parentheses after the number.", fa: "در پرانتز بعد از شماره می‌آید.")),
      "points": (type: "number", doc: (en: "Score on the end side of the head: \"2 points\", \"1 point\" («۲ نمره» in Persian).", fa: "نمره در سمت پایان سرعنوان: «۲ نمره» / \"2 points\" (\"1 point\").")),
      "name": (type: "string", doc: (en: "Replaces the word «تمرین» / \"Exercise\", e.g. `name=\"سؤال\"`. The number still comes from the same counter.", fa: "جایگزین کلمهٔ «تمرین» / \"Exercise\"، مثلاً `name=\"سؤال\"`. شماره همچنان از همان شمارنده می‌آید.")),
      "id": (type: "string", doc: (en: "Target for `<ref>`: «تمرین ۱» / \"Exercise 1\" (or the `name` word).", fa: "هدف `<ref>`: «تمرین ۱» / \"Exercise 1\" (یا کلمهٔ `name`).")),
      "dir": (type: "enum", values: ("auto", "rtl", "ltr"), default: "auto", doc: (en: "`auto` (default: from the title or the content), `rtl`, `ltr`.", fa: "جهت: `auto` (پیش‌فرض: از روی عنوان یا محتوا)، `rtl`، `ltr`.")),
    ),
    children: ("choices", "answer"),
  ),
  "choices": (
    kind: "block",
    description: (en: "exercises and quizzes", fa: "تمرین و آزمون"),
    attrs: (
      "correct": (type: "string", doc: (en: "Number of the right option, counted from 1; several separated by commas (`\"1,3\"`). Persian digits work.", fa: "شمارهٔ گزینهٔ درست از ۱؛ چند گزینه با ویرگول (`\"1,3\"`). رقم فارسی هم پذیرفته می‌شود.")),
      "numbers": (type: "enum", values: ("letters", "numbers"), default: "letters", doc: (en: "`letters` (default: «الف ب ج د» in RTL, a b c d in LTR) or `numbers` (۱ ۲ / 1 2).", fa: "نشانگر گزینه‌ها: `letters` (پیش‌فرض: «الف ب ج د» در راست‌به‌چپ، a b c d در چپ‌به‌راست) یا `numbers` (۱ ۲ / 1 2).")),
      "cols": (type: "int", doc: (en: "Number of columns. Default automatic: 4 when there are at least 4 options and they fit, else 2 if they fit, else 1, so options adapt to the `mobile` page.", fa: "تعداد ستون‌ها. پیش‌فرض خودکار: اگر دست‌کم ۴ گزینه باشد و جا شوند ۴ ستون، وگرنه اگر جا شوند ۲، وگرنه ۱؛ پس گزینه‌ها با صفحهٔ `mobile` هم جور می‌شوند.")),
      "dir": (type: "enum", values: ("auto", "rtl", "ltr"), default: "auto", doc: (en: "`auto` (default: from the title or the content), `rtl`, `ltr`.", fa: "جهت: `auto` (پیش‌فرض: از روی عنوان یا محتوا)، `rtl`، `ltr`.")),
    ),
  ),
  "answer": (
    kind: "block",
    description: (en: "Answer of an <exercise>, shown or hidden by the `answers` setting", fa: "پاسخ یک <exercise> که با تنظیم `answers` نشان داده یا پنهان می‌شود"),
    attrs: (:),
  ),
  "answers": (
    kind: "block",
    description: (en: "exercises and quizzes", fa: "تمرین و آزمون"),
    attrs: (
      "title": (type: "string", doc: (en: "Title of the list. Default «پاسخ‌ها» / \"Answers\".", fa: "عنوان فهرست. پیش‌فرض «پاسخ‌ها» / \"Answers\".")),
      "dir": (type: "enum", values: ("auto", "rtl", "ltr"), default: "auto", doc: (en: "`auto` (default: from the title or the content), `rtl`, `ltr`.", fa: "جهت: `auto` (پیش‌فرض: از روی عنوان یا محتوا)، `rtl`، `ltr`.")),
    ),
  ),
)



