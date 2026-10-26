import { defineConfig, devices } from "@playwright/test"
import { AUTH, DOMAIN, EDGE, SPKI } from "./tests/env"

// The test stack (e2e/run.sh up) serves *.bulbashenko.test on 127.0.0.1:443 with a self-made certificate; staging
// (deploy/staging/e2e.yaml) serves *.bulbashenko.dev through Traefik's in-cluster address with a public one.

export default defineConfig({
  testDir: "./tests",
  // One stack, shared state (rate limits, people): run in order.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 60_000,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  // Writable scratch for results in the read-only staging container.
  outputDir: process.env.E2E_OUTPUT_DIR || "test-results",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: AUTH,
    locale: "ru-RU",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // Production sits behind Cloudflare, which sets this header; the rate limiter keys on it.
    extraHTTPHeaders: { "CF-Connecting-IP": `198.51.100.${1 + Math.floor(Math.random() * 250)}` },
    launchOptions: {
      args: [
        `--host-resolver-rules=MAP *.${DOMAIN} ${EDGE}`,
        ...(SPKI ? [`--ignore-certificate-errors-spki-list=${SPKI}`] : []),
      ],
    },
  },
})
