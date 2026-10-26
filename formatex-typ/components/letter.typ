#import "/src/prelude.typ": *
#import "/src/lib/basics.typ": *
#import "/src/lib/colors.typ": *

// <letter>: an official letter (Persian or English) — header with number / date / attachments,
// addressee, subject, body, closing and signature, copies.
#let letter-block(attrs, body) = {
  let get(k) = { let v = attrs.at(k, default: none); if v == none or v.trim() == "" { none } else { v } }
  context {
    let d = resolve-dir(attrs.at("dir", default: "auto"), [#get("subject") #body])
    let r = d == rtl
    set text(dir: d)
    let words = if r {
      (number: "شماره", date: "تاریخ", attachment: "پیوست", to: "به", from: "از", subject: "موضوع", cc: "رونوشت")
    } else {
      (number: "No.", date: "Date", attachment: "Attachments", to: "To", from: "From", subject: "Subject", cc: "CC")
    }
    let hue = if feel-name == "formal" { theme.heading } else { theme.accent }
    let tint = tinted(hue)
    let label-of(k) = text(weight: "bold", fill: if feel-name == "formal" { theme.fg } else { tint.icon }, words.at(k) + ":")
    let own-dir(s) = { let t = text-dir(s); text(dir: if t == none { d } else { t }, s) }

    let meta = ("number", "date", "attachment").filter(k => get(k) != none)
    let meta-block = if meta.len() > 0 {
      let rows = grid(columns: 2, column-gutter: 0.6em, row-gutter: 0.55em, align: start, ..meta.map(k => (label-of(k), own-dir(get(k)))).flatten())
      if feel-name == "formal" { rows }
      else if feel-name == "friendly" { block(fill: tint.fill, radius: feel.box, inset: (x: 10pt * zoom, y: 8pt * zoom), rows) }
      else { block(stroke: 0.6pt * zoom + tint.border, radius: feel.box, inset: (x: 10pt * zoom, y: 8pt * zoom), rows) }
    }
    let logo = get("logo")
    let org = get("org")
    let start-cell = if logo != none or org != none {
      align(center, stack(spacing: 0.5em, ..if logo != none { (image(root-path(logo), height: 1.6cm),) }, ..if org != none { (text(weight: "bold", size: 0.95em, fill: theme.heading, own-dir(org)),) }))
    }
    let heading-line = get("heading")
    grid(
      columns: (1fr, auto, 1fr),
      align: (start + horizon, center + top, end + horizon),
      start-cell,
      if heading-line != none { text(weight: "bold", own-dir(heading-line)) },
      meta-block,
    )
    v(0.6em)
    if feel-name == "friendly" {
      line(length: 100%, stroke: (thickness: 1.6pt * zoom, paint: tint.border, cap: "round"))
    } else {
      line(length: 100%, stroke: (if feel-name == "formal" { 0.8pt } else { 0.6pt }) * zoom + if feel-name == "formal" { theme.rule } else { tint.border })
    }
    v(0.4em)
    let address = ("to", "from", "subject").filter(k => get(k) != none)
    if address.len() > 0 {
      block(below: 1.2em, grid(
        columns: 2, column-gutter: 0.6em, row-gutter: 0.7em,
        ..address.map(k => (label-of(k), if k == "subject" { text(weight: "bold", own-dir(get(k))) } else { own-dir(get(k)) })).flatten(),
      ))
    }
    let greeting = attrs.at("greeting", default: if r { "با سلام و احترام،" } else { none })
    if greeting != none and greeting.trim() != "" { block(below: 0.9em, own-dir(greeting)) }
    block(width: 100%, body)
    let closing = get("closing")
    let signature = get("signature")
    let signer = get("signer")
    let signer-title = get("signer-title")
    if closing != none or signature != none or signer != none or signer-title != none {
      v(1em)
      align(end, block(breakable: false, align(center, stack(
        spacing: 0.55em,
        ..if closing != none { (own-dir(closing),) },
        ..if signature != none { (image(root-path(signature), height: 1.4cm),) } else if signer != none { (v(1.2em),) },
        ..if signer != none { (text(weight: "bold", own-dir(signer)),) },
        ..if signer-title != none { (text(fill: theme.muted, own-dir(signer-title)),) },
      ))))
    }
    let cc = get("cc")
    if cc != none {
      v(1.2em)
      block(width: 100%, {
        label-of("cc")
        set list(marker: text(fill: theme.muted, "–"))
        list(..cc.split(regex("[;؛]")).map(c => c.trim()).filter(c => c != "").map(own-dir))
      })
    }
  }
}

#let letter-tags = (
    letter: (attrs, body) => letter-block(attrs, body),
)

#let letter-schema = (
  "letter": (
    kind: "block",
    description: (en: "official letter", fa: "نامهٔ اداری"),
    attrs: (
      "heading": (type: "string", doc: (en: "A line centered at the top, e.g. «بسمه تعالی».", fa: "خطی در وسط بالای نامه، مثلاً «بسمه تعالی».")),
      "logo": (type: "path", doc: (en: "Image path (relative to the project root), 1.6 cm high, on the start side.", fa: "مسیر تصویر آرم (نسبت به پوشهٔ ریشهٔ پروژه)، با ارتفاع ۱٫۶ سانتی‌متر، در سمت شروع.")),
      "org": (type: "string", doc: (en: "Organisation name, on the start side (under the logo).", fa: "نام سازمان، در سمت شروع (زیر آرم).")),
      "number": (type: "string", doc: (en: "On the end side, labelled «شماره / تاریخ / پیوست» or \"No. / Date / Attachments\".", fa: "در سمت پایان، با برچسب‌های «شماره / تاریخ / پیوست» یا \"No. / Date / Attachments\".")),
      "date": (type: "string", doc: (en: "On the end side, labelled «شماره / تاریخ / پیوست» or \"No. / Date / Attachments\".", fa: "در سمت پایان، با برچسب‌های «شماره / تاریخ / پیوست» یا \"No. / Date / Attachments\".")),
      "attachment": (type: "string", doc: (en: "On the end side, labelled «شماره / تاریخ / پیوست» or \"No. / Date / Attachments\".", fa: "در سمت پایان، با برچسب‌های «شماره / تاریخ / پیوست» یا \"No. / Date / Attachments\".")),
      "to": (type: "string", doc: (en: "Below the rule, labelled «به / از / موضوع» or \"To / From / Subject\". The subject is bold.", fa: "زیر خط، با برچسب‌های «به / از / موضوع» یا \"To / From / Subject\". موضوع پررنگ است.")),
      "from": (type: "string", doc: (en: "Below the rule, labelled «به / از / موضوع» or \"To / From / Subject\". The subject is bold.", fa: "زیر خط، با برچسب‌های «به / از / موضوع» یا \"To / From / Subject\". موضوع پررنگ است.")),
      "subject": (type: "string", doc: (en: "Below the rule, labelled «به / از / موضوع» or \"To / From / Subject\". The subject is bold.", fa: "زیر خط، با برچسب‌های «به / از / موضوع» یا \"To / From / Subject\". موضوع پررنگ است.")),
      "greeting": (type: "string", doc: (en: "A line before the body. Default «با سلام و احترام،» in a Persian letter, none in an English one; `greeting=\"\"` removes it.", fa: "خطی پیش از متن. پیش‌فرض در نامهٔ فارسی «با سلام و احترام،» و در نامهٔ انگلیسی هیچ؛ `greeting=\"\"` آن را حذف می‌کند.")),
      "closing": (type: "string", doc: (en: "After the body on the end side, e.g. «با تشکر» or \"Sincerely,\".", fa: "بعد از متن در سمت پایان، مثلاً «با تشکر» یا \"Sincerely,\".")),
      "signature": (type: "path", doc: (en: "Image path of the signature, 1.4 cm high.", fa: "مسیر تصویر امضا، با ارتفاع ۱٫۴ سانتی‌متر.")),
      "signer": (type: "string", doc: (en: "The signer's name (bold) and position.", fa: "نام امضاکننده (پررنگ) و سمت او.")),
      "signer-title": (type: "string", doc: (en: "The signer's name (bold) and position.", fa: "نام امضاکننده (پررنگ) و سمت او.")),
      "cc": (type: "string", doc: (en: "Copies, separated by `;` or `؛`, listed under «رونوشت» / \"CC\" with dashes.", fa: "رونوشت‌ها، جداشده با `؛` یا `;`، که زیر «رونوشت» / \"CC\" با خط تیره فهرست می‌شوند.")),
      "dir": (type: "enum", values: ("auto", "rtl", "ltr"), default: "auto", doc: (en: "`auto` (default: from the subject and the body), `rtl`, `ltr`.", fa: "جهت: `auto` (پیش‌فرض: از روی موضوع و متن)، `rtl`، `ltr`.")),
    ),
  ),
)



