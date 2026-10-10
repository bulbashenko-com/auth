/**
 * What a token may carry: the decision behind the consent step, as a pure function so it can be tested alone.
 * Fails closed: a client without a required group, a person outside that group, or a sign-in without a second
 * factor gets a rejection.
 */

/** Second factors Kratos reports in the session's `amr` (authentication methods). */
const SECOND_FACTORS = ["totp", "lookup_secret"]

export interface ConsentInput {
  client: {
    client_id?: string
    audience?: string[]
    metadata?: Record<string, unknown>
  }
  requestedScopes: string[]
  /** Authentication methods of the login session, as Hydra hands them over from Kratos. */
  amr: string[]
  /** The person, from Kratos. */
  identity: {
    id: string
    traits: { username?: string; email?: string; name?: string }
    emailVerified: boolean
  }
  /** Their groups, from Keto. */
  groups: string[]
}

export type ConsentDecision =
  | {
      kind: "accept"
      grantScope: string[]
      grantAudience: string[]
      idToken: Record<string, unknown>
      accessToken: Record<string, unknown>
    }
  | { kind: "reject"; error: "access_denied" | "login_required"; description: string }

export function decideConsent(input: ConsentInput): ConsentDecision {
  const { client, identity, groups } = input
  const metadata = client.metadata ?? {}

  const required = metadata.required_group
  if (typeof required !== "string" || required === "") {
    return { kind: "reject", error: "access_denied", description: "The client declares no required group." }
  }
  if (!groups.includes(required)) {
    return { kind: "reject", error: "access_denied", description: "The account is not allowed to use this client." }
  }
  if (!input.amr.some((method) => SECOND_FACTORS.includes(method))) {
    return { kind: "reject", error: "login_required", description: "A second factor is required." }
  }

  const scopes = input.requestedScopes
  const has = (scope: string) => scopes.includes(scope)
  const { username, email, name } = identity.traits

  const idToken: Record<string, unknown> = {}
  if (has("profile")) {
    if (username) idToken.preferred_username = username
    if (name) idToken.name = name
  }
  if (has("email") && email) {
    idToken.email = email
    idToken.email_verified = identity.emailVerified
  }
  if (has("groups")) idToken.groups = groups

  // Mail clients: Stalwart reads the person from the JWT access token, offline.
  const accessToken: Record<string, unknown> = {}
  if (metadata.access_token_identity === true) {
    if (username) accessToken.preferred_username = username
    if (email) accessToken.email = email
    if (name) accessToken.name = name
  }

  return {
    kind: "accept",
    grantScope: scopes,
    // The client's configured audience is always granted (Stalwart needs `stalwart` without asking for it).
    grantAudience: client.audience ?? [],
    idToken,
    accessToken,
  }
}
