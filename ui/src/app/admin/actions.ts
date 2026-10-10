"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireFreshAdmin } from "@/lib/admin"
import { isGroup, removeFromAllGroups, setGroups, type Group } from "@/lib/groups"
import { identities, oauth2 } from "@/lib/ory"

export type ActionState = { ok?: string; error?: string; recovery?: { link: string; code: string; expires?: string } }

const USERNAME = /^[a-z][a-z0-9._-]{1,31}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const groupsFrom = (form: FormData): Group[] => form.getAll("groups").map(String).filter(isGroup)

/** Ends every Kratos session and every Hydra login/consent session (which revokes issued tokens) of a person. */
async function endEverything(id: string) {
  await identities().deleteIdentitySessions({ id }).catch(ignore404)
  await oauth2().revokeOAuth2LoginSessions({ subject: id })
  await oauth2().revokeOAuth2ConsentSessions({ subject: id, all: true })
}

async function recoveryFor(id: string): Promise<ActionState["recovery"]> {
  const r = await identities().createRecoveryCodeForIdentity({
    createRecoveryCodeForIdentityBody: { identity_id: id, expires_in: "1h" },
  })
  return { link: r.recovery_link, code: r.recovery_code, expires: r.expires_at?.toISOString() }
}

export async function createUser(_: ActionState, form: FormData): Promise<ActionState> {
  await requireFreshAdmin()
  const username = String(form.get("username") ?? "").trim().toLowerCase()
  const email = String(form.get("email") ?? "").trim().toLowerCase()
  const name = String(form.get("name") ?? "").trim()
  if (!USERNAME.test(username)) return { error: "username: a-z 0-9 . _ -, 2–32, starts with a letter" }
  if (!EMAIL.test(email)) return { error: "email" }
  const identity = await identities().createIdentity({
    createIdentityBody: {
      schema_id: "person",
      state: "active",
      traits: { username, email, ...(name ? { name } : {}) },
      // The admin vouches for the address.
      verifiable_addresses: [{ value: email, via: "email", verified: true, status: "completed" }],
      recovery_addresses: [{ value: email, via: "email" }],
    },
  })
  await setGroups(identity.id, groupsFrom(form))
  revalidatePath("/admin")
  return { ok: username, recovery: await recoveryFor(identity.id) }
}

export async function saveGroups(_: ActionState, form: FormData): Promise<ActionState> {
  const id = String(form.get("id"))
  await requireFreshAdmin(`/admin/users/${id}`)
  await setGroups(id, groupsFrom(form))
  // Tokens carry groups from consent time: revoke them so the next sign-in gets the new set.
  await oauth2().revokeOAuth2ConsentSessions({ subject: id, all: true })
  revalidatePath(`/admin/users/${id}`)
  return { ok: "groups" }
}

export async function revokeSessions(_: ActionState, form: FormData): Promise<ActionState> {
  const id = String(form.get("id"))
  await requireFreshAdmin(`/admin/users/${id}`)
  await endEverything(id)
  revalidatePath(`/admin/users/${id}`)
  return { ok: "sessions" }
}

export async function sendRecovery(_: ActionState, form: FormData): Promise<ActionState> {
  const id = String(form.get("id"))
  await requireFreshAdmin(`/admin/users/${id}`)
  return { ok: "recovery", recovery: await recoveryFor(id) }
}

export async function setActive(_: ActionState, form: FormData): Promise<ActionState> {
  const id = String(form.get("id"))
  const session = await requireFreshAdmin(`/admin/users/${id}`)
  const active = form.get("active") === "true"
  if (!active && session.identity?.id === id) return { error: "You cannot disable yourself." }
  await identities().patchIdentity({
    id,
    jsonPatch: [{ op: "replace", path: "/state", value: active ? "active" : "inactive" }],
  })
  if (!active) await endEverything(id)
  revalidatePath(`/admin/users/${id}`)
  return { ok: active ? "enabled" : "disabled" }
}

export async function deleteUser(_: ActionState, form: FormData): Promise<ActionState> {
  const id = String(form.get("id"))
  const session = await requireFreshAdmin(`/admin/users/${id}`)
  if (session.identity?.id === id) return { error: "You cannot delete yourself." }
  if (form.get("confirm") !== id) return { error: "Type the id to confirm." }
  await endEverything(id)
  await removeFromAllGroups(id)
  await identities().deleteIdentity({ id })
  revalidatePath("/admin")
  redirect("/admin")
}

function ignore404(error: unknown) {
  if ((error as { response?: { status?: number } }).response?.status === 404) return
  throw error
}
