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

#let digit-schema = (
  "digit": (
    kind: "inline",
    description: (en: "Digits in one kind: English, Persian or Arabic", fa: "ارقام به یک نوع: انگلیسی، فارسی یا عربی"),
    attrs: (
      "type": (type: "enum", values: ("fa", "ar", "en"), default: "fa", doc: (en: "The kind of digits to show: `fa` Persian ۰۱۲۳, `ar` Arabic ٠١٢٣, `en` English 0123.", fa: "نوع ارقامی که نشان داده می‌شود: `fa` فارسی ۰۱۲۳، `ar` عربی ٠١٢٣، `en` انگلیسی 0123.")),
    ),
  ),
)

// ---- docs: read by the skill generator of the app and exported with the schema (see docs/doc_en.md, Extending the template)
#let digit-docs = (
  en: (
    about: `````md
Shows every digit inside in one kind, whichever kind it was written in: `<digit type="fa">Room 12, ۳۴ and ٥٦</digit>` gives Persian digits for all of them.

- `type`: `fa` Persian ۰۱۲۳ (default), `ar` Arabic ٠١٢٣ or `en` English 0123.
- It works on all the text inside: paragraphs, lists, tables and other tags. Digits in math and in code blocks are left as they are.
`````.text,
  ),
  fa: (
    about: `````md
همهٔ ارقام داخلش را با یک نوع نشان می‌دهد، هر نوعی که نوشته شده باشند: `<digit type="fa">اتاق 12، ۳۴ و ٥٦</digit>` همه را فارسی می‌کند.

- `type`: `fa` فارسی ۰۱۲۳ (پیش‌فرض)، `ar` عربی ٠١٢٣ یا `en` انگلیسی 0123.
- روی همهٔ متن داخل کار می‌کند: پاراگراف، فهرست، جدول و تگ‌های دیگر. ارقام فرمول و بلوک کد دست نمی‌خورند.
`````.text,
  ),
  example: (
    en: `````md
<digit type="fa">Room 12, ۳۴ and ٥٦ — also 2026.</digit>

<digit type="en">اتاق ۱۲ و ٣٤</digit>
`````.text,
    fa: `````md
<digit type="fa">اتاق 12، ۳۴ و ٥٦ — و 1405.</digit>

<digit type="ar">اتاق 12 و ۳۴</digit>
`````.text,
  ),
)
