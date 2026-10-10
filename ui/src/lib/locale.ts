import "server-only"
import { cookies, headers } from "next/headers"
import { isLocale, translator, type Locale } from "./i18n"

/** Locale from the `lang` cookie, else Russian unless the browser prefers English. */
export async function getLocale(): Promise<Locale> {
  const chosen = (await cookies()).get("lang")?.value
  if (isLocale(chosen)) return chosen
  const accept = (await headers()).get("accept-language") ?? ""
  return /^en\b/i.test(accept.trim()) ? "en" : "ru"
}

export async function getT() {
  const locale = await getLocale()
  return { locale, t: translator(locale) }
}
