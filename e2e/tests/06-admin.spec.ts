import { expect, test } from "@playwright/test"
import { signIn, twoFactorPerson } from "./fixtures"

const USERS = "https://users.int.bulbashenko.test/"

test("the admin page is not served on the public host", async ({ page }) => {
  const response = await page.goto("https://auth.bulbashenko.test/admin")
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
  await expect(page).toHaveURL(/users\.int\.bulbashenko\.test\/admin/)
  await expect(page.getByRole("heading", { name: "Пользователи" })).toBeVisible()
  await expect(page.getByRole("link", { name: admin.username })).toBeVisible()

  const username = `new${Date.now().toString(36)}`
  await page.locator("#a-username").fill(username)
  await page.locator("#a-email").fill(`${username}@bulbashenko.test`)
  await page.getByRole("button", { name: /СОЗДАТЬ/ }).click()
  await expect(page.getByText(/\/recovery\?flow=/)).toBeVisible()

  await page.reload()
  const row = page.getByRole("row", { name: new RegExp(username) })
  await expect(row).toContainText("mail-users")
})
