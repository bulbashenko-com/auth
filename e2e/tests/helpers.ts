import { createHash, randomBytes } from "node:crypto"
import { request as httpsRequest } from "node:https"
import { expect, type Page } from "@playwright/test"
import { authenticator } from "otplib"

import { APP_CALLBACK, AUTH, CA, DOMAIN, EDGE, KETO_WRITE, KRATOS_ADMIN, MAILPIT } from "./env"

export { APP_CALLBACK, AUTH }

export interface Person {
  id: string
  username: string
  email: string
  password: string
  totpSecret?: string
}

async function json(url: string, method: string, body?: unknown) {
  const response = await fetch(url, {
    method,
    headers: { "content-type": "application/json", accept: "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`${method} ${url}: ${response.status} ${await response.text()}`)
  return response.status === 204 ? null : response.json()
}

/** A person with a password (no second factor yet) and the given groups. */
export async function createPerson(groups: string[], prefix = "u"): Promise<Person> {
  const username = `${prefix}${Date.now().toString(36)}${randomBytes(2).toString("hex")}`
  const email = `${username}@${DOMAIN}`
  const password = `Pw-${randomBytes(12).toString("hex")}`
  const identity = await json(`${KRATOS_ADMIN}/admin/identities`, "POST", {
    schema_id: "person",
    traits: { username, email, name: `Test ${username}` },
    verifiable_addresses: [{ value: email, via: "email", verified: true, status: "completed" }],
    recovery_addresses: [{ value: email, via: "email" }],
    credentials: { password: { config: { password } } },
  })
  await setGroups(identity.id, groups)
  return { id: identity.id, username, email, password }
}

export async function setGroups(id: string, groups: string[]) {
  await fetch(`${KETO_WRITE}/admin/relation-tuples?namespace=Group&relation=members&subject_set.namespace=User&subject_set.object=${id}&subject_set.relation=`, { method: "DELETE" })
  for (const group of groups) {
    await json(`${KETO_WRITE}/admin/relation-tuples`, "PUT", {
      namespace: "Group",
      object: group,
      relation: "members",
      subject_set: { namespace: "User", object: id, relation: "" },
    })
  }
}

export const totp = (secret: string) => authenticator.generate(secret)

/** Waits for the next 30-second TOTP window, so a code is never reused (Kratos rejects replays). */
export async function freshTotp(secret: string) {
  const remaining = authenticator.timeRemaining()
  await new Promise((r) => setTimeout(r, (remaining + 1) * 1000))
  return totp(secret)
}

/** Signs in with username and password on the login page (first factor only). */
export async function passwordStep(page: Page, person: Person) {
  await page.getByLabel(/Имя пользователя|Username/).fill(person.username)
  await page.getByLabel(/^Пароль$|^Password$/).fill(person.password)
  await page.getByRole("button", { name: /\[ ВОЙТИ \]|\[ SIGN IN \]/ }).click()
}

/** Types a TOTP code into the six-cell input (it submits itself). */
export async function totpStep(page: Page, code: string) {
  await expect(page.locator(".otp")).toBeVisible()
  await page.locator(".otp input").fill(code)
}

/** Enrols TOTP on the settings page and returns the secret. */
export async function enrolTotp(page: Page): Promise<string> {
  await page.goto("/settings")
  const secret = (await page.locator("code.secret").first().innerText()).trim()
  await page.locator("#f-totp_code").fill(totp(secret))
  await page.locator('form:has(#f-totp_code) button[type=submit][name=method]').click()
  await expect(page.locator(".msg.success, .msg.info").first()).toBeVisible()
  return secret
}

/** The latest code mailed to an address (mailpit). */
export async function mailedCode(email: string): Promise<string> {
  for (let i = 0; i < 40; i++) {
    const list = await json(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`, "GET")
    const latest = list.messages?.[0]
    if (latest) {
      const message = await json(`${MAILPIT}/api/v1/message/${latest.ID}`, "GET")
      const code = /\b(\d{6})\b/.exec(message.Text ?? "")?.[1]
      if (code) return code
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error(`no code mailed to ${email}`)
}

/** PKCE pair. */
export function pkce() {
  const verifier = randomBytes(32).toString("base64url")
  const challenge = createHash("sha256").update(verifier).digest("base64url")
  return { verifier, challenge }
}

/**
 * Runs an authorization-code request in the browser and returns the redirect back to the app (code or error).
 * The app is a stand-in (traefik/whoami on app.DOMAIN).
 */
export async function authorize(page: Page, clientId: string, scope: string, challenge: string) {
  const query = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    scope,
    redirect_uri: APP_CALLBACK,
    state: randomBytes(12).toString("hex"),
    code_challenge: challenge,
    code_challenge_method: "S256",
  })
  await page.goto(`${AUTH}/oauth2/auth?${query}`)
  // Hydra redirects to the app (a stand-in answers there); redirects cannot be intercepted, so wait for the URL.
  const callback = page
    .waitForURL((url) => url.href.startsWith(APP_CALLBACK), { timeout: 45_000 })
    .then(() => new URL(page.url()))
  return { callback }
}

/** Calls the public token endpoint like an app would (HTTPS to EDGE, with the test certificate on the test stack). */
export function tokenRequest(form: Record<string, string>, basic?: [string, string]): Promise<{ status: number; body: any }> {
  const body = new URLSearchParams(form).toString()
  return new Promise((resolve, reject) => {
    const req = httpsRequest(
      {
        host: EDGE,
        port: 443,
        path: "/oauth2/token",
        method: "POST",
        servername: `auth.${DOMAIN}`,
        ca: CA,
        headers: {
          host: `auth.${DOMAIN}`,
          "content-type": "application/x-www-form-urlencoded",
          "content-length": Buffer.byteLength(body),
          ...(basic ? { authorization: `Basic ${Buffer.from(`${basic[0]}:${basic[1]}`).toString("base64")}` } : {}),
        },
      },
      (res) => {
        let data = ""
        res.on("data", (c) => (data += c))
        res.on("end", () => resolve({ status: res.statusCode ?? 0, body: data ? JSON.parse(data) : null }))
      },
    )
    req.on("error", reject)
    req.end(body)
  })
}

export const decodeJwt = (token: string) => JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString())
