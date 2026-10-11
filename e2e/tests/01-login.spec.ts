import { expect, test } from "@playwright/test"
import { createPerson, enrolTotp, freshTotp, passwordStep, totpStep } from "./helpers"

test("the login page has the design's structure and no third-party requests", async ({ page }) => {
  const foreign: string[] = []
  page.on("request", (r) => {
    const host = new URL(r.url()).hostname
    if (!host.endsWith("bulbashenko.test") && !r.url().startsWith("data:")) foreign.push(r.url())
  })
  await page.goto("/login")
  await expect(page).toHaveURL(/\/login\?flow=/)
  await expect(page.getByRole("heading", { name: "Вход" })).toBeVisible()
  await expect(page.getByRole("button", { name: /ПАСКЛЮЧОМ/ })).toBeVisible()
  await expect(page.getByLabel("Имя пользователя")).toHaveAttribute("autocomplete", "username webauthn")
  await page.waitForLoadState("networkidle")
  expect(foreign).toEqual([])
})

test("wrong password shows an error", async ({ page }) => {
  const person = await createPerson(["mail-users"])
  await page.goto("/login")
  await passwordStep(page, { ...person, password: "wrong-password-123" })
  await expect(page.locator(".msg.error")).toContainText("Неверное имя пользователя или пароль")
})

test("password, TOTP enrolment, then every sign-in needs the second factor", async ({ page }) => {
  const person = await createPerson(["mail-users"])
  await page.goto("/login")
  await passwordStep(page, person)
  // No second factor yet: the home page says so, settings asks to add one.
  await expect(page.getByRole("heading", { name: "Готово" })).toBeVisible()
  const secret = await enrolTotp(page)

  // Sign out, sign in again: password, then TOTP.
  await page.getByRole("link", { name: /Выйти/ }).first().click()
  await page.goto("/login")
  await passwordStep(page, person)
  await expect(page.getByRole("heading", { name: new RegExp(`Привет, ${person.username}|Ещё шаг`) })).toBeVisible()

  await totpStep(page, "000000")
  await expect(page.locator(".msg.error")).toContainText(/Код не подошёл|invalid/)

  await totpStep(page, await freshTotp(secret))
  await expect(page.getByRole("heading", { name: "Готово" })).toBeVisible()
})
