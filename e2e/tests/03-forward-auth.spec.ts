import { expect, test } from "@playwright/test"
import { signIn, twoFactorPerson } from "./fixtures"
import { setGroups } from "./helpers"

const GARAGE = "https://garage.int.bulbashenko.test/"

test("mesh admin UIs need a two-factor session in infra-admins", async ({ page }) => {
  test.setTimeout(120_000)
  const person = await twoFactorPerson(page, ["mail-users"])

  // Anonymous: sent to the login page with a way back.
  await page.goto(GARAGE)
  await expect(page).toHaveURL(/auth\.bulbashenko\.test\/login/)

  // Signed in, but not an infra admin: back at the app, which is forbidden.
  await signIn(page, person)
  await expect(page).toHaveURL(GARAGE)
  expect((await page.reload())?.status()).toBe(403)

  // Joining the group opens it, and the app learns who it is (whoami echoes the request headers).
  await setGroups(person.id, ["mail-users", "infra-admins"])
  const allowed = await page.reload()
  expect(allowed?.status()).toBe(200)
  await expect(page.locator("body")).toContainText(`Remote-User: ${person.username}`)
})

test("a forged identity header does not get past forward-auth", async ({ browser }) => {
  const context = await browser.newContext({ extraHTTPHeaders: { "Remote-User": "admin" } })
  const page = await context.newPage()
  await page.goto(GARAGE)
  await expect(page).toHaveURL(/auth\.bulbashenko\.test\/login/)
  await context.close()
})
