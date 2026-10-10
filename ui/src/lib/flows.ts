import "server-only"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { ResponseError } from "@ory/client-fetch"
import { env } from "./env"
import { frontend } from "./ory"

export type FlowKind = "login" | "recovery" | "settings" | "verification"
export type SearchParams = Record<string, string | string[] | undefined>

/** Query parameters Kratos accepts when a browser flow is created. Anything else is dropped. */
const START_PARAMS: Record<FlowKind, string[]> = {
  login: ["login_challenge", "return_to", "refresh", "aal", "via"],
  recovery: ["return_to"],
  settings: ["return_to"],
  verification: ["return_to"],
}

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

/** Sends the browser to Kratos to create a new flow; Kratos redirects back with ?flow=<id>. */
export function startFlow(kind: FlowKind, params: SearchParams): never {
  const query = new URLSearchParams()
  for (const name of START_PARAMS[kind]) {
    const value = first(params[name])
    if (value) query.set(name, value)
  }
  redirect(`${env.publicUrl}/self-service/${kind}/browser${query.size ? `?${query}` : ""}`)
}

async function cookieHeader() {
  return (await headers()).get("cookie") ?? undefined
}

/**
 * Loads the flow named in ?flow=, or starts a new one. Expired, foreign (CSRF) or unknown flows are restarted;
 * Kratos' "go elsewhere" answers (already signed in, needs another flow) are followed.
 */
export async function loadFlow<T>(kind: FlowKind, params: SearchParams): Promise<T> {
  const id = first(params.flow)
  if (!id) startFlow(kind, params)
  const cookie = await cookieHeader()
  const api = frontend()
  try {
    switch (kind) {
      case "login":
        return (await api.getLoginFlow({ id, cookie })) as T
      case "recovery":
        return (await api.getRecoveryFlow({ id, cookie })) as T
      case "settings":
        return (await api.getSettingsFlow({ id, cookie })) as T
      case "verification":
        return (await api.getVerificationFlow({ id, cookie })) as T
    }
  } catch (error) {
    await handleFlowError(error, kind, params)
  }
  throw new Error("unreachable")
}

async function handleFlowError(error: unknown, kind: FlowKind, params: SearchParams): Promise<never> {
  if (!(error instanceof ResponseError)) throw error
  const status = error.response.status
  let body: { redirect_browser_to?: string; error?: { id?: string; details?: { redirect_to?: string } } } = {}
  try {
    body = await error.response.json()
  } catch {
    // Not JSON: fall through to a restart.
  }
  const target = body.redirect_browser_to ?? body.error?.details?.redirect_to
  if (target && isOwnUrl(target)) redirect(target)
  if (status === 401 && kind === "settings") redirect(`/login?return_to=${encodeURIComponent(`${env.publicUrl}/settings`)}`)
  // 403 (CSRF / another browser), 404 (unknown), 410 (expired): a fresh flow.
  if ([403, 404, 410].includes(status)) {
    const { flow: _drop, ...rest } = params
    startFlow(kind, rest)
  }
  throw error
}

/** Kratos only ever sends us to our own host or the allowed return URLs it checked; still refuse anything else. */
function isOwnUrl(target: string) {
  try {
    const url = new URL(target, env.publicUrl)
    return url.protocol === "https:" || url.hostname === "localhost"
  } catch {
    return false
  }
}

/** The signed-in session, or null. Kratos enforces the required AAL here (403 when a second factor is missing). */
export async function currentSession() {
  try {
    return await frontend().toSession({ cookie: await cookieHeader() })
  } catch (error) {
    if (error instanceof ResponseError && [401, 403].includes(error.response.status)) return null
    throw error
  }
}

/** A logout URL for the current session (Kratos creates it), or null when nobody is signed in. */
export async function logoutUrl(returnTo?: string) {
  try {
    const flow = await frontend().createBrowserLogoutFlow({ cookie: await cookieHeader(), returnTo })
    return flow.logout_url
  } catch (error) {
    if (error instanceof ResponseError && [401, 403].includes(error.response.status)) return null
    throw error
  }
}
