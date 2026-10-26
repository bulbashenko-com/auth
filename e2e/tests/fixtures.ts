import type { Page } from "@playwright/test"
import { AUTH } from "./env"
import { createPerson, enrolTotp, freshTotp, passwordStep, totpStep, type Person } from "./helpers"

/** A person with password + TOTP in the given groups; the browser ends signed out. */
export async function twoFactorPerson(page: Page, groups: string[]): Promise<Person> {
  const person = await createPerson(groups)
  await page.goto("/login")
  await passwordStep(page, person)
  person.totpSecret = await enrolTotp(page)
  await page.context().clearCookies()
  return person
}

/** Password then TOTP on the login page the browser is on. */
export async function signIn(page: Page, person: Person) {
  await passwordStep(page, person)
  await totpStep(page, await freshTotp(person.totpSecret!))
  // The code input submits itself; wait until the browser has left the login page.
  await page.waitForURL((url) => !(url.origin === AUTH && url.pathname === "/login"))
}
