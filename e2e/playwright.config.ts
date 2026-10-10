import { readFileSync } from "node:fs"
import { defineConfig, devices } from "@playwright/test"

// The test stack (e2e/run.sh up) serves *.bulbashenko.test on 127.0.0.1:443 with a self-made certificate.
const spki = readFileSync(new URL("./certs/spki.txt", import.meta.url), "utf8").trim()

export default defineConfig({
  testDir: "./tests",
  // One stack, shared state (rate limits, people): run in order.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 60_000,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "https://auth.bulbashenko.test",
    locale: "ru-RU",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // Production sits behind Cloudflare, which sets this header; the rate limiter keys on it.
    extraHTTPHeaders: { "CF-Connecting-IP": `198.51.100.${1 + Math.floor(Math.random() * 250)}` },
    launchOptions: {
      args: [
        "--host-resolver-rules=MAP *.bulbashenko.test 127.0.0.1",
        `--ignore-certificate-errors-spki-list=${spki}`,
      ],
    },
  },
})
