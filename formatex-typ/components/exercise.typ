#import "/src/kit.typ": *

// <exercise>: numbered question; <choices> lays out a list as lettered options; <answer> is
// shown, hidden or collected under <answers> by `answers` (config / --input), which `answers="..."` on one <exercise> overrides
// for that question. The title of a question is bigger than the text, and `toc` (an attribute, or `exercise-toc` for every
// question) lists it in the table of contents like a heading.
#let answers-mode = sys.inputs.at("answers", default: str(config.at("answers", default: "show")))
#assert(answers-mode in ("show", "hide", "end"), message: setting-prefix("answers") + "answers must be show, hide or end, got " + repr(answers-mode))
#let exercise-toc-given = sys.inputs.at("exercise-toc", default: config.at("exercise-toc", default: false))
#let exercise-toc-default = exercise-toc-given == true or exercise-toc-given == "true"

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
    // The title is in the heading color in every feel: on the page in formal, on the tinted box of the title in the others
    let head-color = theme.heading
    // The answers of this question: its own `answers`, else the setting of the document
    let mode = attrs.at("answers", default: answers-mode)
    // The title of a question is bigger than the text around it
    let title-text = [#word #number#if title != none [ (#title)]#if feel-name == "formal" [.]]
    // 1.2 times the body text, worked out here: the heading style of the document (which a listed title is drawn inside) does not change it
    // In a box, the space above and below the title is measured from the ink of its letters, so the two are the same whatever the title says
    // (Persian letters go below the line, capitals do not)
    let boxed = feel-name != "formal"
    let title-line = text(size: text.size * 1.2, weight: "bold", fill: head-color, top-edge: if boxed { "bounds" } else { "cap-height" }, bottom-edge: if boxed { "bounds" } else { "baseline" }, title-text)
    // In the table of contents, as a heading of the document's top level, like the other first-level headings (an unnumbered one, whose
    // text the list shows as it is): drawn as the title line above by a show rule inside this block, so only the list sees it
    let toc-given = attrs.at("toc", default: none)
    let listed = if toc-given == none { exercise-toc-default } else { toc-given == "true" }
    let title-item = if listed {
      let others = query(heading.where(outlined: true)).filter(h => h.at("label", default: none) != <exercise-title>)
      let level = if others.len() > 0 { calc.min(..others.map(h => h.level)) } else { 1 }
      [#show heading: it => title-line
        #heading(level: level, numbering: none, outlined: true, title-text)<exercise-title>]
    } else { title-line }
    let head-content = {
      title-item
      if points-text != none { h(1fr) + points-text }
    }
    // The colors of an exercise are the theme's secondary color (the soft tint of tables and highlights), not the accent
    let tone = tinted(theme.secondary)
    // The box of the title: only a little deeper than the card (the card has 10% of the secondary color, 16% on dark themes)
    let title-fill = color.mix((theme.secondary, if theme.dark { 25% } else { 17% }), (theme.bg, if theme.dark { 75% } else { 83% }))
    let card-radius = feel.box
    let pad-x = 12pt * zoom
    // Friendly: the little room around the title box inside the card
    let gap = 3pt * zoom
    // The title:
    //  formal: a rule under it like the one under a heading (1pt, in the heading color), with room between the title and it, and under it;
    //  standard: a band in a deeper tint the width of the card, touching its top and both sides, with the card's own radius at the top;
    //  friendly: a box with very little room around it, its top corners concentric with the card's and its bottom ones a little round.
    let head = if feel-name == "formal" {
      block(width: 100%, sticky: true, below: 1em, inset: (bottom: 0.65em), stroke: (bottom: 1pt * zoom + theme.heading), head-content)
    } else if feel-name == "standard" {
      block(
        width: 100%, sticky: true, below: 0pt, fill: title-fill, inset: (x: pad-x, y: 8pt * zoom),
        radius: (top-left: card-radius, top-right: card-radius, bottom-left: 0pt, bottom-right: 0pt),
        head-content,
      )
    } else {
      let top = calc.max(card-radius - gap, 0pt)
      block(
        width: 100%, sticky: true, below: 0pt, fill: title-fill, inset: (x: pad-x - gap, y: 8pt * zoom),
        radius: (top-left: top, top-right: top, bottom-left: 5pt * zoom, bottom-right: 5pt * zoom),
        head-content,
      )
    }
    let answers = parts.tagged
    let answer-word = if r { "پاسخ" } else { "Answer" }
    let showing = mode == "show" and answers.len() > 0
    // Formal: the question, and under it each answer in a dashed rule frame
    let formal-content = {
      block(width: 100%, question)
      if mode == "show" {
        for a in answers { answer-frame(answer-word, a.body, r) }
      }
    }
    // Standard and friendly: the answer goes on in the same card, in green, joined to the question (no box of its own inside the card):
    //  standard: a green area the width of the card: a deeper band like the title's, with the word and an icon, and the answer on the lighter green
    //            under it; the last one takes the card's own radius at the bottom;
    //  friendly: a green box with the same little room around it as the title's, round in every corner (concentric with the card's).
    let green = tinted(color-presets.green)
    let green-deep = color.mix((color-presets.green, if theme.dark { 25% } else { 17% }), (theme.bg, if theme.dark { 75% } else { 83% }))
    let answer-label = text(size: text.size * 1.2, weight: "bold", fill: green.icon, top-edge: "bounds", bottom-edge: "bounds", [#fa-icon("circle-check")#h(0.5em)#answer-word])
    let answer-area(a, last) = if feel-name == "standard" {
      let bottom = if last { card-radius } else { 0pt }
      block(width: 100%, above: 0pt, below: 0pt, fill: green.fill, inset: 0pt, radius: (top-left: 0pt, top-right: 0pt, bottom-left: bottom, bottom-right: bottom), {
        block(width: 100%, above: 0pt, below: 0pt, fill: green-deep, inset: (x: pad-x, y: 8pt * zoom), answer-label)
        block(width: 100%, above: 0pt, below: 0pt, inset: (x: pad-x, y: 10pt * zoom), a.body)
      })
    } else {
      block(width: 100%, above: 0pt, below: if last { 0pt } else { gap }, fill: green-deep, radius: calc.max(card-radius - gap, 0pt), inset: (x: pad-x - gap, y: 8pt * zoom), {
        block(width: 100%, above: 0pt, below: 0.55em, answer-label)
        a.body
      })
    }
    let answer-areas = for (i, a) in answers.enumerate() { answer-area(a, i == answers.len() - 1) }
    exercise-head.update((word: word, number: number, r: r, mode: mode))
    if mode == "end" and answers.len() > 0 {
      exercise-answers.update(all => all + ((word: word, number: number, body: answers.map(a => a.body).join(parbreak()), r: r),))
    }
    if feel-name == "formal" {
      // Formal has no card: a thin rule under the question (and its answer), and a little more room below it
      block(width: 100%, above: 1.2em, below: 1.7em, inset: (bottom: 0.7em), stroke: (bottom: 0.6pt * zoom + theme.rule), { head; formal-content })
    } else if feel-name == "standard" {
      block(width: 100%, above: 1.2em, below: 1.2em, fill: tone.fill, radius: card-radius, inset: 0pt, {
        head
        block(width: 100%, above: 0pt, below: 0pt, inset: (x: pad-x, top: 9pt * zoom, bottom: 10pt * zoom), block(width: 100%, question))
        if showing { answer-areas }
      })
    } else {
      block(width: 100%, above: 1.2em, below: 1.2em, fill: tone.fill, radius: card-radius, inset: (top: gap, x: gap, bottom: if showing { gap } else { 0pt }), {
        head
        block(width: 100%, above: 0pt, below: 0pt, inset: (x: pad-x - gap, top: 9pt * zoom, bottom: if showing { 8pt * zoom } else { 10pt * zoom }), block(width: 100%, question))
        if showing { answer-areas }
      })
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
    let accent = tinted(theme.secondary)
    // The question these options belong to says whether the right one shows; a <choices> outside any <exercise> follows the document
    let head = exercise-head.get()
    let mode = if head != none { head.mode } else { answers-mode }
    let mark(i) = {
      let is-correct = mode == "show" and (i + 1) in correct
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
    if mode == "end" and correct.len() > 0 and head != none {
      let names = correct.map(k => if style == "numbers" { digits(k, head.r) } else if head.r { abjad-letters.at(calc.rem(k - 1, abjad-letters.len())) } else { "abcdefghijklmnopqrstuvwxyz".at(calc.rem(k - 1, 26)) })
      let note = if head.r [گزینهٔ #names.join("، ")] else [#if names.len() > 1 [Options] else [Option] #names.join(", ")]
      exercise-answers.update(all => all + ((word: head.word, number: head.number, body: note, r: head.r),))
    }
    let option(i, it) = {
      let is-correct = mode == "show" and (i + 1) in correct
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
  context {
    // Only the questions whose answers go to the end are in it (the document's `answers`, or the `answers="end"` of a question)
    let all = exercise-answers.final()
    if all.len() == 0 { return }
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
      block(width: 100%, below: 1em, [#text(weight: "bold", fill: if feel-name == "formal" { theme.heading } else { theme.secondary }, [#a.word #a.number.])#h(0.5em)#a.body])
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
      "answers": (type: "enum", values: ("show", "hide", "end"), doc: (en: "What happens to the answers of this question, instead of the document's `answers` setting: `show` (under the question, the right option highlighted), `hide` (left out) or `end` (collected where `<answers></answers>` stands).", fa: "پاسخ‌های همین سؤال چه شوند، به‌جای تنظیم `answers` سند: `show` (زیر سؤال، با گزینهٔ درست برجسته)، `hide` (نمایش داده نشوند) یا `end` (جایی جمع شوند که `<answers></answers>` نوشته شده).")),
      "toc": (type: "bool", doc: (en: "`true`: the title of this question («تمرین ۱») is listed in the table of contents like a first-level heading; `false`: not. Default: the document's `exercise-toc` setting (`false`).", fa: "`true`: عنوان همین سؤال («تمرین ۱») مثل یک تیتر سطح اول در فهرست مطالب بیاید؛ `false`: نیاید. پیش‌فرض: تنظیم `exercise-toc` سند (`false`).")),
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

// ---- docs: read by the skill generator of the app and exported with the schema (see docs/doc_en.md, Extending the template)
#let exercise-docs = (
  en: (
    about: `````md
A numbered exercise or quiz question: `<exercise>` holds the question, `<choices>` makes lettered options (`correct="3"` marks the right one), `<answer>` holds the solution, `<answers>` gathers them. Whether answers show is set by the `answers` setting.

- All exercises share one counter in document order. `points` shows the score; `title` names the exercise; `id` makes it a `<ref>` target.
- `<choices>` turns a Markdown list (bulleted or numbered) into lettered options; `correct="3"` marks the right option by number. A `<choices>` without a list is a compile error.
- Answers depend on the `answers` setting: `show` (default) puts each `<answer>` under its question and highlights the right option; `hide` makes a question sheet; `end` collects them where `<answers></answers>` stands. `answers="..."` on one `<exercise>` overrides the setting for that question: one answer can be shown, another hidden and a third sent to the end; `<answers></answers>` lists the ones that went to the end.
- The title of a question («تمرین ۱») is set bigger than the text. `toc="true"` on an `<exercise>` lists that title in the table of contents like a first-level heading (without a number); the `exercise-toc` setting does it for every question, and `toc="false"` leaves one out.
- Leave blank lines inside `<exercise>`, `<choices>` and `<answer>`.
`````.text,
  ),
  fa: (
    about: `````md
تمرین یا سؤال آزمون شماره‌دار: `<exercise>` سؤال را نگه می‌دارد، `<choices>` گزینه‌های حرف‌دار می‌سازد (`correct="3"` گزینهٔ درست را نشان می‌دهد)، `<answer>` پاسخ را و `<answers>` همهٔ پاسخ‌ها را یک‌جا جمع می‌کند. نمایش پاسخ‌ها را تنظیم `answers` تعیین می‌کند.

- همهٔ تمرین‌ها یک شمارنده دارند، به ترتیب سند. `points` نمره را نشان می‌دهد، `title` نام تمرین است و `id` آن را هدف `<ref>` می‌کند.
- `<choices>` یک فهرست Markdown (گلوله‌ای یا شماره‌دار) را به گزینه‌های حرف‌دار تبدیل می‌کند؛ `correct="3"` گزینهٔ درست را با شماره نشان می‌دهد. `<choices>` بدون فهرست خطای ساخت است.
- پاسخ‌ها به تنظیم `answers` بستگی دارند: `show` (پیش‌فرض) هر `<answer>` را زیر سؤال می‌گذارد و گزینهٔ درست را برجسته می‌کند؛ `hide` برگهٔ سؤال می‌سازد؛ `end` همه را جایی جمع می‌کند که `<answers></answers>` نوشته شده. `answers="..."` روی یک `<exercise>` تنظیم را برای همان سؤال بازنویسی می‌کند: پاسخ یکی نشان داده شود، دیگری پنهان و سومی به انتها برود؛ `<answers></answers>` همان‌هایی را فهرست می‌کند که به انتها رفته‌اند.
- عنوان سؤال («تمرین ۱») از متن بزرگ‌تر است. `toc="true"` روی `<exercise>` آن عنوان را مثل یک تیتر سطح اول (بدون شماره) در فهرست مطالب می‌آورد؛ تنظیم `exercise-toc` همین را برای همهٔ سؤال‌ها می‌کند و `toc="false"` یکی را کنار می‌گذارد.
- داخل `<exercise>`، `<choices>` و `<answer>` خط خالی بگذارید.
`````.text,
  ),
  example: (
    en: `````md
<exercise points="2" id="ex-limit">

Compute $\lim_{x \to 0} \frac{\sin x}{x}$.

<answer>

By L'Hôpital's rule, the limit is $1$.

</answer>

</exercise>

<exercise title="Multiple choice" points="1">

Which language was made for typesetting scientific documents?

<choices correct="3">

- Python
- JavaScript
- Typst
- SQL

</choices>

</exercise>
`````.text,
    fa: `````md
<exercise points="2" id="ex-limit">

حد زیر را محاسبه کنید: $\lim_{x \to 0} \frac{\sin x}{x}$

<answer>

با قاعدهٔ هوپیتال، حد برابر $1$ است.

</answer>

</exercise>

<exercise title="چندگزینه‌ای" points="1">

کدام زبان برای حروف‌چینی اسناد علمی ساخته شده است؟

<choices correct="3">

- Python
- JavaScript
- Typst
- SQL

</choices>

</exercise>
`````.text,
  ),
)
