import { expect, test } from "@playwright/test"

// Last on purpose: it fills this client's bucket for a minute.
test("password submissions are rate-limited per client", async ({ browser }) => {
  // A client of its own, so the rest of the suite is not affected.
  const context = await browser.newContext({ extraHTTPHeaders: { "CF-Connecting-IP": "203.0.113.77" } })
  const page = await context.newPage()
  await page.goto("/login")
  const action = await page.locator("form").first().getAttribute("action")
  const statuses = await page.evaluate(async (url) => {
    const out: number[] = []
    for (let i = 0; i < 80; i++) {
      const r = await fetch(url!, { method: "POST", body: new URLSearchParams({ method: "password" }), redirect: "manual" })
      out.push(r.status)
    }
    return out
  }, action)
  expect(statuses).toContain(429)
  await context.close()
})
