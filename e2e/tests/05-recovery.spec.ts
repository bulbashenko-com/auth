import { expect, test } from "@playwright/test"
import { createPerson, mailedCode } from "./helpers"

test("recovery by emailed code leads to settings", async ({ page }) => {
  const person = await createPerson(["mail-users"])
  await page.goto("/login")
  await page.getByRole("link", { name: /Сбросить пароль/ }).click()
  await expect(page.getByRole("heading", { name: "Сброс пароля" })).toBeVisible()
  await page.getByLabel("Почта").fill(person.email)
  await page.getByRole("button", { name: /ОТПРАВИТЬ КОД/ }).click()
  await expect(page.getByRole("heading", { name: "Проверьте почту" })).toBeVisible()

  await page.getByLabel("Код из письма").fill(await mailedCode(person.email))
  await page.getByRole("button", { name: /ПОДТВЕРДИТЬ/ }).click()
  await expect(page).toHaveURL(/\/settings/)
  await expect(page.getByRole("heading", { name: "Аккаунт" })).toBeVisible()
})

test("recovery does not reveal whether an account exists", async ({ page }) => {
  await page.goto("/recovery")
  await page.getByLabel("Почта").fill("nobody@bulbashenko.test")
  await page.getByRole("button", { name: /ОТПРАВИТЬ КОД/ }).click()
  await expect(page.getByRole("heading", { name: "Проверьте почту" })).toBeVisible()
})
