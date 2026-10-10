#!/usr/bin/env node
// Creates the first person with every group and prints a one-time recovery link and code (valid 1 hour).
// After that, people are managed on the admin page (users.int). Run inside the `ui` container:
//
//   docker exec -it <ui container> node scripts/bootstrap-admin.mjs <username> <email> [<name>]

const kratos = (process.env.KRATOS_ADMIN_URL ?? "http://kratos:4434").replace(/\/$/, "")
const keto = (process.env.KETO_WRITE_URL ?? "http://keto:4467").replace(/\/$/, "")
const GROUPS = ["infra-admins", "site-admins", "mail-users", "vpn-users"]

const [username, email, name] = process.argv.slice(2)
if (!username || !email) {
  console.error("usage: bootstrap-admin.mjs <username> <email> [<name>]")
  process.exit(2)
}

async function call(url, method, body) {
  const response = await fetch(url, {
    method,
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`${method} ${url}: ${response.status} ${await response.text()}`)
  return response.status === 204 ? null : response.json()
}

const identity = await call(`${kratos}/admin/identities`, "POST", {
  schema_id: "person",
  state: "active",
  traits: { username, email, ...(name ? { name } : {}) },
  verifiable_addresses: [{ value: email, via: "email", verified: true, status: "completed" }],
  recovery_addresses: [{ value: email, via: "email" }],
})
for (const group of GROUPS) {
  await call(`${keto}/admin/relation-tuples`, "PUT", {
    namespace: "Group",
    object: group,
    relation: "members",
    subject_set: { namespace: "User", object: identity.id, relation: "" },
  })
}
const recovery = await call(`${kratos}/admin/recovery/code`, "POST", { identity_id: identity.id, expires_in: "1h" })

console.log(`identity: ${identity.id} (${username}, ${GROUPS.join(", ")})`)
console.log(`open:     ${recovery.recovery_link}`)
console.log(`code:     ${recovery.recovery_code}`)
console.log("Then set a password, add a passkey, link an authenticator app and save the recovery codes.")
