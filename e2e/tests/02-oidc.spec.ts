import { expect, test } from "@playwright/test"
import { signIn, twoFactorPerson } from "./fixtures"
import {
  APP_CALLBACK,
  authorize,
  createPerson,
  decodeJwt,
  passwordStep,
  pkce,
  tokenRequest,
} from "./helpers"

test("a mail user gets an ID token with groups and a JWT access token Stalwart can read", async ({ page }) => {
  const person = await twoFactorPerson(page, ["mail-users", "vpn-users"])
  const { verifier, challenge } = pkce()
  const { callback } = await authorize(page, "e2e", "openid profile email groups offline_access", challenge)
  await signIn(page, person)
  const url = await callback
  const code = url.searchParams.get("code")
  expect(code, url.toString()).toBeTruthy()

  const { status, body } = await tokenRequest(
    { grant_type: "authorization_code", code: code!, redirect_uri: APP_CALLBACK, code_verifier: verifier },
    ["e2e", "e2e-secret"],
  )
  expect(status, JSON.stringify(body)).toBe(200)
  expect(body.refresh_token).toBeTruthy()

  const id = decodeJwt(body.id_token)
  expect(id.iss).toBe("https://auth.bulbashenko.test")
  expect(id.sub).toBe(person.id)
  expect(id.preferred_username).toBe(person.username)
  expect(id.email).toBe(person.email)
  expect(id.email_verified).toBe(true)
  expect(id.groups).toEqual(["mail-users", "vpn-users"])
  expect(id.amr).toEqual(expect.arrayContaining(["password", "totp"]))

  const access = decodeJwt(body.access_token)
  expect(access.aud).toContain("stalwart")
  expect(access.scope).toBe("openid profile email groups offline_access")
  expect(access.preferred_username).toBe(person.username)
  expect(access.email).toBe(person.email)
  expect(access.ext).toBeUndefined()
})

test("a client refuses people outside its group", async ({ page }) => {
  const person = await twoFactorPerson(page, ["mail-users"])
  const { challenge } = pkce()
  const { callback } = await authorize(page, "e2e-admins", "openid profile", challenge)
  await signIn(page, person)
  const url = await callback
  expect(url.searchParams.get("code")).toBeNull()
  expect(url.searchParams.get("error")).toBe("access_denied")
})

test("an account without a second factor gets no tokens", async ({ page }) => {
  const person = await createPerson(["mail-users"])
  const { challenge } = pkce()
  const { callback } = await authorize(page, "e2e", "openid profile", challenge)
  await passwordStep(page, person)
  const url = await callback
  expect(url.searchParams.get("code")).toBeNull()
  expect(url.searchParams.get("error")).toBe("login_required")
})

test("a third-party client shows the consent page", async ({ page }) => {
  const person = await twoFactorPerson(page, ["mail-users"])
  const { challenge } = pkce()
  const { callback } = await authorize(page, "e2e-consent", "openid email", challenge)
  await signIn(page, person)
  await expect(page.getByRole("heading", { name: "Доступ" })).toBeVisible()
  await expect(page.getByText("Адрес почты")).toBeVisible()
  await page.getByRole("button", { name: /РАЗРЕШИТЬ/ }).click()
  const url = await callback
  expect(url.searchParams.get("code")).toBeTruthy()
})
