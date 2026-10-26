#import "/src/prelude.typ": *
#import "/src/lib/basics.typ": *

// Shared look of everything that points somewhere else: <ref> and citations.
#let reference-style(body, offset: 2.5pt * zoom) = underline(
  stroke: 0.6pt * zoom + theme.accent,
  offset: offset,
  text(fill: theme.accent, body),
)

// style: "boxed" (tinted block with a bar on the start side), "plain" (dashed bar), "proof" (ends with ∎)
#let theorem-kinds = (
  definition: (fa: "تعریف", en: "Definition", numbered: true, style: "boxed"),
  theorem: (fa: "قضیه", en: "Theorem", numbered: true, style: "boxed"),
  lemma: (fa: "لم", en: "Lemma", numbered: true, style: "boxed"),
  corollary: (fa: "نتیجه", en: "Corollary", numbered: true, style: "boxed"),
  example: (fa: "مثال", en: "Example", numbered: true, style: "plain"),
  remark: (fa: "نکته", en: "Remark", numbered: true, style: "plain"),
  proof: (fa: "اثبات", en: "Proof", numbered: false, style: "proof"),
)

// Text for <ref>: kind word + number in the language of the sentence it appears in.
#let reference-text(el, r) = {
  if el.func() == heading {
    if el.numbering != none {
      [#if r [بخش] else [Section] #heading-number(counter(heading).at(el.location()), r)]
    } else {
      el.body
    }
  } else if el.func() == figure {
    let n = counter(figure.where(kind: el.kind)).at(el.location()).first()
    let word = if el.kind == table { if r [جدول] else [Table] }
      else if el.kind == raw { if r [کد] else [Listing] }
      else if el.kind == "list" { if r [فهرست] else [List] }
      else if el.kind == "diff" { if r [تغییرات] else [Diff] }
      else { if r [شکل] else [Figure] }
    [#word #digits(n, r)]
  } else if el.func() == math.equation {
    let n = counter(math.equation).at(el.location()).first()
    [#if r [رابطهٔ] else [Equation] #equation-number(n, r)]
  } else if el.func() == metadata and type(el.value) == dictionary and "theorem-kind" in el.value {
    let kind = el.value.theorem-kind
    let spec = theorem-kinds.at(kind)
    let n = counter("theorem-" + kind).at(el.location()).first()
    [#if r { spec.fa } else { spec.en } #digits(n, r)]
  } else if el.func() == metadata and type(el.value) == dictionary and "exercise-name" in el.value {
    let n = counter("exercise").at(el.location()).first()
    let word = el.value.exercise-name
    [#if word != none { word } else if r [تمرین] else [Exercise] #digits(n, r)]
  } else if el.func() == metadata and type(el.value) == dictionary and "span-text" in el.value {
    el.value.span-text
  } else {
    none
  }
}

// `break` on <toc> / <lof> / <lot> / <lol>: "true" (page break before and after), "before", "after", "false".
#let page-breaks(attrs) = {
  let b = attrs.at("break", default: "false")
  assert(b in ("true", "false", "before", "after"), message: "break must be true, false, before or after, got " + repr(b))
  (b in ("true", "before"), b in ("true", "after"))
}

// `pages` on <toc> / <lof> / <lot> / <lol>: "false" drops the dot leaders and page numbers.
#let list-pages-on(attrs, tag-name) = {
  let p = attrs.at("pages", default: "true")
  assert(p in ("true", "false"), message: "<" + tag-name + "> pages must be true or false, got " + repr(p))
  p == "true"
}

// `numbers` on the lists: "rtl" Persian, "ltr" Latin, "auto" each entry like its own title.
#let list-numbers(attrs, tag-name, default) = {
  let nums = attrs.at("numbers", default: default)
  assert(nums in ("rtl", "ltr", "auto"), message: "<" + tag-name + "> numbers must be rtl, ltr or auto, got " + repr(nums))
  nums
}

// Page number of `el` with Persian or Latin digits. Must be called inside `context`.
#let page-digits(el, fa) = numbering(if fa { "۱" } else { "1" }, counter(page).at(el.location()).first())
