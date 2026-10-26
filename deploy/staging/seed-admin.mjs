// Staging's own admin account (staging has no production people): username `admin`, every group. On the first run
// it prints a recovery link (valid 24 hours) to the Job log; with it, set a password, a passkey and TOTP on
// auth.bulbashenko.dev. Later runs see the account and do nothing.
const kratos = process.env.KRATOS_ADMIN_URL
const keto = process.env.KETO_WRITE_URL
const GROUPS = ["infra-admins", "site-admins", "mail-users", "vpn-users"]

async function call(url, method, body) {
  const response = await fetch(url, {
    method,
    headers: { "content-type": "application/json", accept: "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`${method} ${url}: ${response.status} ${await response.text()}`)
  return response.status === 204 ? null : response.json()
}

const existing = await call(`${kratos}/admin/identities?credentials_identifier=admin`, "GET")
if (existing.length > 0) {
  console.log(`admin exists (${existing[0].id}); nothing to do`)
  process.exit(0)
}
const identity = await call(`${kratos}/admin/identities`, "POST", {
  schema_id: "person",
  state: "active",
  traits: { username: "admin", email: "admin@bulbashenko.dev", name: "Staging admin" },
  verifiable_addresses: [{ value: "admin@bulbashenko.dev", via: "email", verified: true, status: "completed" }],
  recovery_addresses: [{ value: "admin@bulbashenko.dev", via: "email" }],
})
for (const group of GROUPS) {
  await call(`${keto}/admin/relation-tuples`, "PUT", {
    namespace: "Group",
    object: group,
    relation: "members",
    subject_set: { namespace: "User", object: identity.id, relation: "" },
  })
}
const link = await call(`${kratos}/admin/recovery/code`, "POST", { identity_id: identity.id, expires_in: "24h" })
console.log(`admin created (${identity.id}) in ${GROUPS.join(", ")}`)
console.log(`recovery link: ${link.recovery_link}`)
console.log(`recovery code: ${link.recovery_code}`)
