import { NextResponse, type NextRequest } from "next/server"
import { isLocale } from "@/lib/i18n"

/** Sets the language cookie and goes back to the page the person was on (same origin only). */
export function GET(request: NextRequest) {
  const lang = request.nextUrl.searchParams.get("l")
  const referer = request.headers.get("referer")
  const host = request.headers.get("host")
  let back = "/"
  if (referer) {
    try {
      const url = new URL(referer)
      if (url.host === host) back = url.pathname + url.search
    } catch {
      // Ignore malformed referers.
    }
  }
  const response = new NextResponse(null, { status: 303, headers: { location: back } })
  if (isLocale(lang)) {
    response.cookies.set("lang", lang, { path: "/", maxAge: 365 * 24 * 3600, sameSite: "lax", secure: true, httpOnly: true })
  }
  return response
}
