import React from "react"
import { resolveDir, textDir, textOf } from "formatex"

const WORDS = {
  fa: { number: "شماره", date: "تاریخ", attachment: "پیوست", to: "به", from: "از", subject: "موضوع", cc: "رونوشت" },
  en: { number: "No.", date: "Date", attachment: "Attachments", to: "To", from: "From", subject: "Subject", cc: "CC" },
}

export default function Component({ node, context }) {
  const p = context.props(node)
  const get = key => {
    const val = p[key]
    if (val === undefined || val === null) return ""
    return String(val).trim()
  }

  const dir = resolveDir(p.dir, `${get("subject")} ${textOf(node)}`, context.language)
  const rtl = dir === "rtl"
  const words = rtl ? WORDS.fa : WORDS.en
  const ownDir = value => textDir(value) ?? dir

  const logo = get("logo")
  const org = get("org")
  const heading = get("heading")
  const metaKeys = ["number", "date", "attachment"].filter(key => get(key) !== "")
  const addressKeys = ["to", "from", "subject"].filter(key => get(key) !== "")

  const hasGreeting = node.props?.greeting !== undefined || p.greeting !== undefined
  const greeting = hasGreeting ? get("greeting") : (rtl ? "با سلام و احترام،" : "")

  const closing = get("closing")
  const signature = get("signature")
  const signer = get("signer")
  const signerTitle = get("signer-title")
  const hasSignature = !!(closing || signature || signer || signerTitle)

  const ccRaw = get("cc")
  const ccItems = ccRaw ? ccRaw.split(/[;؛]/).map(item => item.trim()).filter(Boolean) : []

  const logoSrc = logo ? context.asset(logo) : ""
  const sigSrc = signature ? context.asset(signature) : ""

  return (
    <article id={p.id ? String(p.id) : undefined} dir={dir} className="fx-letter fx-tint">
      {heading && (
        <div className="fx-letter-heading">
          <span dir={ownDir(heading)}>{heading}</span>
        </div>
      )}
      {(logoSrc || org || metaKeys.length > 0) && (
        <header className="fx-letter-header">
          <div className="fx-letter-org">
            {logoSrc && <img className="fx-letter-logo" src={logoSrc} alt="" />}
            {org && <div className="fx-letter-org-name" dir={ownDir(org)}>{org}</div>}
          </div>
          <div className="fx-letter-meta-wrap">
            {metaKeys.length > 0 && (
              <div className="fx-letter-meta">
                <dl className="fx-letter-meta-grid">
                  {metaKeys.map(key => {
                    const val = get(key)
                    return (
                      <React.Fragment key={key}>
                        <dt className="fx-letter-label">{words[key]}:</dt>
                        <dd><span dir={ownDir(val)}>{val}</span></dd>
                      </React.Fragment>
                    )
                  })}
                </dl>
              </div>
            )}
          </div>
        </header>
      )}

      <hr className="fx-letter-rule" />

      {addressKeys.length > 0 && (
        <dl className="fx-letter-address">
          {addressKeys.map(key => {
            const val = get(key)
            return (
              <React.Fragment key={key}>
                <dt className="fx-letter-label">{words[key]}:</dt>
                <dd className={key === "subject" ? "fx-letter-subject" : undefined}><span dir={ownDir(val)}>{val}</span></dd>
              </React.Fragment>
            )
          })}
        </dl>
      )}

      {greeting && <p className="fx-letter-greeting" dir={ownDir(greeting)}>{greeting}</p>}

      <div className="fx-letter-body">{context.children(node)}</div>

      {hasSignature && (
        <footer className="fx-letter-signature">
          {closing && <div dir={ownDir(closing)}>{closing}</div>}
          {sigSrc ? <img className="fx-letter-sig-img" src={sigSrc} alt="" /> : signer ? <div className="fx-letter-sig-gap" aria-hidden="true" /> : null}
          {signer && <strong dir={ownDir(signer)}>{signer}</strong>}
          {signerTitle && <span className="fx-letter-signer-title" dir={ownDir(signerTitle)}>{signerTitle}</span>}
        </footer>
      )}

      {ccItems.length > 0 && (
        <div className="fx-letter-cc">
          <div className="fx-letter-label">{words.cc}:</div>
          <ul className="fx-letter-cc-list">
            {ccItems.map((item, index) => (
              <li key={index}>
                <span className="fx-letter-cc-dash" aria-hidden="true">–</span>
                <span dir={ownDir(item)}>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  )
}
