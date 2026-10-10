import { NextResponse, type NextRequest } from "next/server"

/**
 * Every request: a fresh CSP nonce (Next.js and Kratos' webauthn.js scripts carry it), and host separation:
 * the admin pages answer only on ADMIN_HOST (users.int, mesh-only), everything else only on the public host.
 */
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64")
  const dev = process.env.NODE_ENV !== "production"
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    // Inline style attributes are used by the components; no inline scripts are.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
    // Kratos answers form posts with redirects to Hydra and on to the apps, loopback included (Thunderbird).
    "form-action 'self' https: http://127.0.0.1:* http://localhost:*",
  ].join("; ")

  // Only Host: Traefik routes on it (users.int is mesh-only there). X-Forwarded-Host could be forged by a client.
  const host = (request.headers.get("host") ?? "").split(":")[0]
  const adminHost = process.env.ADMIN_HOST ?? ""
  const path = request.nextUrl.pathname
  const isAdminHost = adminHost !== "" && host === adminHost
  const isAdminPath = path === "/admin" || path.startsWith("/admin/")
  const isShared = path.startsWith("/_next/") || path === "/api/health" || path === "/lang" || path === "/favicon.ico"

  if (isAdminPath && !isAdminHost) return new NextResponse(null, { status: 404 })
  if (isAdminHost && !isAdminPath && !isShared) {
    if (path === "/") return NextResponse.redirect(`https://${adminHost}/admin`)
    return new NextResponse(null, { status: 404 })
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-nonce", nonce)
  requestHeaders.set("content-security-policy", csp)
  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set("content-security-policy", csp)
  response.headers.set("x-content-type-options", "nosniff")
  response.headers.set("x-frame-options", "DENY")
  response.headers.set("referrer-policy", "strict-origin-when-cross-origin")
  response.headers.set("cache-control", "no-store")
  return response
}

export const config = {
  matcher: [{ source: "/((?!_next/static|_next/image).*)" }],
}
