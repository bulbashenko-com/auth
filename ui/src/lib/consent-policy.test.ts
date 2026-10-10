import { test } from "node:test"
import assert from "node:assert/strict"
import { decideConsent, type ConsentInput } from "./consent-policy.ts"

const base: ConsentInput = {
  client: { client_id: "thunderbird", audience: ["stalwart"], metadata: { required_group: "mail-users", access_token_identity: true } },
  requestedScopes: ["openid", "profile", "email", "offline_access"],
  amr: ["password", "totp"],
  identity: { id: "id-1", traits: { username: "admin", email: "admin@bulbashenko.com", name: "Admin" }, emailVerified: true },
  groups: ["infra-admins", "mail-users"],
}

test("accepts a member who used a second factor, with mail identity in the access token", () => {
  const decision = decideConsent(base)
  assert.equal(decision.kind, "accept")
  if (decision.kind !== "accept") return
  assert.deepEqual(decision.grantAudience, ["stalwart"])
  assert.deepEqual(decision.accessToken, { preferred_username: "admin", email: "admin@bulbashenko.com", name: "Admin" })
  assert.equal(decision.idToken.preferred_username, "admin")
  assert.equal(decision.idToken.email_verified, true)
  assert.equal(decision.idToken.groups, undefined, "groups only with the groups scope")
})

test("puts groups in the ID token only when the groups scope is granted", () => {
  const decision = decideConsent({ ...base, requestedScopes: ["openid", "groups"] })
  assert.equal(decision.kind, "accept")
  if (decision.kind !== "accept") return
  assert.deepEqual(decision.idToken, { groups: ["infra-admins", "mail-users"] })
})

test("leaves the access token empty for clients that do not ask for identity in it", () => {
  const decision = decideConsent({ ...base, client: { audience: [], metadata: { required_group: "mail-users" } } })
  assert.equal(decision.kind, "accept")
  if (decision.kind !== "accept") return
  assert.deepEqual(decision.accessToken, {})
  assert.deepEqual(decision.grantAudience, [])
})

test("rejects a person outside the client's group", () => {
  const decision = decideConsent({ ...base, groups: ["vpn-users"] })
  assert.equal(decision.kind, "reject")
  if (decision.kind === "reject") assert.equal(decision.error, "access_denied")
})

test("rejects a client that declares no group (fails closed)", () => {
  for (const metadata of [undefined, {}, { required_group: "" }, { required_group: 42 }]) {
    const decision = decideConsent({ ...base, client: { ...base.client, metadata } })
    assert.equal(decision.kind, "reject")
  }
})

test("rejects a sign-in without a second factor", () => {
  for (const amr of [[], ["password"], ["passkey"], ["code"]]) {
    const decision = decideConsent({ ...base, amr })
    assert.equal(decision.kind, "reject", `amr ${JSON.stringify(amr)}`)
    if (decision.kind === "reject") assert.equal(decision.error, "login_required")
  }
})

test("accepts passkey plus TOTP and password plus a recovery code", () => {
  assert.equal(decideConsent({ ...base, amr: ["passkey", "totp"] }).kind, "accept")
  assert.equal(decideConsent({ ...base, amr: ["password", "lookup_secret"] }).kind, "accept")
})
