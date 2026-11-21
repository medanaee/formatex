#import "/src/kit.typ": *

// <digit type="fa">: every digit inside, whichever kind it was written in (English 0-9, Persian ۰-۹, Arabic ٠-٩), is set in the kind
// the tag names. It works on the text of the whole content: a paragraph, a list, a table, nested tags.
#let digit-bases = (fa: 1776, ar: 1632, en: 48)
#let digit-re = regex("[0-9\u{6F0}-\u{6F9}\u{660}-\u{669}]")

#let convert-digits(s, kind) = {
  let target = digit-bases.at(kind)
  s.replace(digit-re, m => {
    let code = str.to-unicode(m.text)
    let base = if code >= 1776 { 1776 } else if code >= 1632 { 1632 } else { 48 }
    str.from-unicode(target + code - base)
  })
}

#let digit-tags = (
    digit: (attrs, body) => {
      let kind = attrs.at("type", default: "fa")
      show regex("[0-9\u{6F0}-\u{6F9}\u{660}-\u{669}]+"): it => convert-digits(it.text, kind)
      body
    },
)
