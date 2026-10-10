import { expect, test } from "@playwright/test"
import { twoFactorPerson, signIn } from "./fixtures"
import { freshTotp, totpStep } from "./helpers"

test("register a passkey, then sign in with it (and TOTP)", async ({ page }) => {
  // Three TOTP windows (enrol, sign in, sign in again).
  test.setTimeout(150_000)
  const person = await twoFactorPerson(page, ["mail-users"])

  // A platform authenticator that verifies the user, like Touch ID or Windows Hello.
  const cdp = await page.context().newCDPSession(page)
  await cdp.send("WebAuthn.enable")
  const { authenticatorId } = await cdp.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  })

  await page.goto("/login")
  await signIn(page, person)
  await page.goto("/settings")
  await page.locator('section[aria-labelledby="s-passkey"] button').first().click()
  await expect(page.locator(".msg.success, .msg.info").first()).toBeVisible()
  const { credentials } = await cdp.send("WebAuthn.getCredentials", { authenticatorId })
  expect(credentials).toHaveLength(1)

  await page.context().clearCookies()
  await page.goto("/login")
  // Passkey autofill (conditional UI) usually signs in on its own; otherwise press the button (a DOM click, as
  // webauthn.js submits the form itself and Playwright cannot wait for that).
  const otp = page.locator(".otp")
  try {
    await otp.waitFor({ timeout: 5_000 })
  } catch {
    await page.getByRole("button", { name: /ПАСКЛЮЧОМ/ }).evaluate((b: HTMLButtonElement) => b.click())
  }
  // Kratos counts a passkey as one factor; with TOTP set up, the second step follows.
  await totpStep(page, await freshTotp(person.totpSecret!))
  await expect(page.getByRole("heading", { name: "Готово" })).toBeVisible()
})
