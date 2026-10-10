import type { ReactNode } from "react"
import { AsciiBackground, Eye, type EyeMode } from "./visual/Visuals"
import { getT } from "@/lib/locale"
import { LOCALES } from "@/lib/i18n"

/** Header, footer, background and the eye: the frame of every page (design screen 1b). */
export async function Shell({
  children,
  eye = "idle",
  wide = false,
}: {
  children: ReactNode
  eye?: EyeMode
  /** Admin pages: no eye, the panel takes the full width. */
  wide?: boolean
}) {
  const { locale, t } = await getT()
  return (
    <div className="page">
      <div className="bg" aria-hidden="true">
        <AsciiBackground />
      </div>
      <header className="bar top">
        <div className="brand">
          <span className="prompt" aria-hidden="true">&gt;_</span>
          <span className="name">BULBASHENKO.COM</span>
          <span className="sep" aria-hidden="true" />
          <span className="section">{t("brand.section")}</span>
        </div>
        <nav className="langs" aria-label="Language">
          {LOCALES.map((code) => (
            <a key={code} href={`/lang?l=${code}`} aria-current={code === locale} rel="nofollow">
              [ {code.toUpperCase()} ]
            </a>
          ))}
        </nav>
      </header>
      <div className="main">
        <section className={wide ? "left wide" : "left"}>
          {children}
        </section>
        {!wide && (
          <div className="right" aria-hidden="true">
            <Eye initial={eye} />
          </div>
        )}
      </div>
      <footer className="bar bottom">
        <div className="status">
          <span className="dot" aria-hidden="true" />
          <span className="on">{t("footer.online")}</span>
          <span className="off">{t("footer.encrypted")}</span>
        </div>
        <span>© {new Date().getFullYear()} BULBASHENKO.COM</span>
      </footer>
      <div className="scanlines" aria-hidden="true" />
    </div>
  )
}

/** The left panel's content: path line, step label, big heading, description, then the form. */
export async function Panel({
  path,
  step,
  title,
  desc,
  rd,
  children,
}: {
  path: string
  step: string
  title: string
  desc?: string
  rd?: string
  children?: ReactNode
}) {
  const { t } = await getT()
  return (
    <>
      <div className="path-row">
        <span className="path">{path}</span>
        {rd && <span className="rd">rd={rd}</span>}
      </div>
      <div className="content">
        <div className="heading">
          <div className="step">
            <span className="dot" aria-hidden="true" />
            <span>{step}</span>
          </div>
          <h1 className="title">{title}</h1>
          {desc && <p className="desc">{desc}</p>}
        </div>
        {children}
      </div>
      <div className="foot-row">
        <span>{t("footer.secure")}</span>
        <span className="rule" aria-hidden="true" />
        <span>{t("footer.stack")}</span>
      </div>
    </>
  )
}
