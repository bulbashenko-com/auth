import type { Metadata, Viewport } from "next"
import type { ReactNode } from "react"
import "@fontsource/ibm-plex-mono/400.css"
import "@fontsource/ibm-plex-mono/600.css"
import "@fontsource/tiny5/400.css"
import "./globals.css"
import { getLocale } from "@/lib/locale"

export const metadata: Metadata = {
  title: "BULBASHENKO.COM — SSO",
  description: "Single sign-on for bulbashenko.com",
  robots: { index: false, follow: false },
}

export const viewport: Viewport = { themeColor: "#030603", colorScheme: "dark" }

// Every page depends on cookies and on the per-request CSP nonce.
export const dynamic = "force-dynamic"

export default async function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang={await getLocale()}>
      <body>{children}</body>
    </html>
  )
}
