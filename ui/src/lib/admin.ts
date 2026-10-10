import "server-only"
import type { Session } from "@ory/client-fetch"
import { redirect } from "next/navigation"
import { env } from "./env"
import { currentSession } from "./flows"
import { isMember } from "./groups"

/** Admin actions need a sign-in this recent (matches Kratos' privileged_session_max_age). */
const FRESH_MS = 15 * 60 * 1000

const adminUrl = (path = "/admin") => `https://${env.adminHost}${path}`

const loginUrl = (returnTo: string, refresh: boolean) =>
  `${env.publicUrl}/login?${new URLSearchParams({ return_to: returnTo, ...(refresh ? { refresh: "true" } : {}) })}`

export class Forbidden extends Error {}

/**
 * The signed-in admin: a two-factor Kratos session (whoami enforces it) whose identity is in infra-admins.
 * Called by every admin page and, again, by every admin action.
 */
export async function requireAdmin(returnPath = "/admin"): Promise<Session> {
  const session = await currentSession()
  if (!session?.identity) redirect(loginUrl(adminUrl(returnPath), false))
  if (!(await isMember(session.identity.id, "infra-admins"))) throw new Forbidden("Not an infra admin")
  return session
}

/** Like requireAdmin, and the sign-in must be recent; otherwise Kratos asks to sign in again first. */
export async function requireFreshAdmin(returnPath = "/admin"): Promise<Session> {
  const session = await requireAdmin(returnPath)
  const at = session.authenticated_at ? new Date(session.authenticated_at).getTime() : 0
  if (Date.now() - at > FRESH_MS) redirect(loginUrl(adminUrl(returnPath), true))
  return session
}
