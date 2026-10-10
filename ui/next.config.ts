import type { NextConfig } from "next"

const config: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // Pages depend on cookies and per-request nonces; nothing is prerendered.
  reactStrictMode: true,
}

export default config
