import { expect, test } from "@playwright/test"
import { AUTH, DOMAIN, DOMAIN_RE, USERS } from "./env"
import { signIn, twoFactorPerson } from "./fixtures"


test("the admin page is not served on the public host", async ({ page }) => {
  const response = await page.goto(`${AUTH}/admin`)
  expect(response?.status()).toBe(404)
})

test("only infra admins reach the admin page", async ({ page }) => {
  test.setTimeout(120_000)
  const person = await twoFactorPerson(page, ["mail-users"])
  await page.goto(USERS)
  await signIn(page, person)
  expect((await page.reload())?.status()).toBe(403)
})

test("an infra admin creates a person and gets a one-time recovery link", async ({ page }) => {
  test.setTimeout(120_000)
  const admin = await twoFactorPerson(page, ["infra-admins"])
  await page.goto(USERS)
  await signIn(page, admin)
  await expect(page).toHaveURL(new RegExp(`users\\.int\\.${DOMAIN_RE}/admin`))
  await expect(page.getByRole("heading", { name: "Пользователи" })).toBeVisible()
  await expect(page.getByRole("link", { name: admin.username })).toBeVisible()

  const username = `new${Date.now().toString(36)}`
  await page.locator("#a-username").fill(username)
  await page.locator("#a-email").fill(`${username}@${DOMAIN}`)
  await page.getByRole("button", { name: /СОЗДАТЬ/ }).click()
  await expect(page.getByText(/\/recovery\?flow=/)).toBeVisible()

  await page.reload()
  const row = page.getByRole("row", { name: new RegExp(username) })
  await expect(row).toContainText("mail-users")
})
