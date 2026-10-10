import "server-only"
import type { OAuth2ConsentRequest } from "@ory/client-fetch"
import { decideConsent, type ConsentDecision } from "./consent-policy"
import { groupsOf } from "./groups"
import { identities, oauth2 } from "./ory"

export interface PendingConsent {
  request: OAuth2ConsentRequest
  decision: ConsentDecision & { kind: "accept" }
}

/** Builds the decision from Hydra's request, the Kratos identity and the Keto groups. Nothing comes from the browser. */
async function decide(request: OAuth2ConsentRequest): Promise<ConsentDecision> {
  const subject = request.subject
  if (!subject) return { kind: "reject", error: "access_denied", description: "No subject." }
  const identity = await identities().getIdentity({ id: subject })
  const groups = await groupsOf(subject)
  return decideConsent({
    client: {
      client_id: request.client?.client_id,
      audience: request.client?.audience,
      metadata: (request.client?.metadata ?? {}) as Record<string, unknown>,
    },
    requestedScopes: request.requested_scope ?? [],
    amr: request.amr ?? [],
    identity: {
      id: identity.id,
      traits: identity.traits as { username?: string; email?: string; name?: string },
      emailVerified: (identity.verifiable_addresses ?? []).some((address) => address.verified),
    },
    groups,
  })
}

async function accept(challenge: string, decision: ConsentDecision & { kind: "accept" }, remember: boolean) {
  const { redirect_to } = await oauth2().acceptOAuth2ConsentRequest({
    consentChallenge: challenge,
    acceptOAuth2ConsentRequest: {
      grant_scope: decision.grantScope,
      grant_access_token_audience: decision.grantAudience,
      remember,
      // Remembered consent still re-runs this route only when the client asks again; one year at most.
      remember_for: remember ? 365 * 24 * 3600 : undefined,
      session: { id_token: decision.idToken, access_token: decision.accessToken },
    },
  })
  return redirect_to
}

async function reject(challenge: string, decision: ConsentDecision & { kind: "reject" }) {
  const { redirect_to } = await oauth2().rejectOAuth2ConsentRequest({
    consentChallenge: challenge,
    rejectOAuth2Request: { error: decision.error, error_description: decision.description, status_code: 403 },
  })
  return redirect_to
}

/**
 * First stop of the consent step. Our own clients (skip_consent) and remembered decisions are answered at once;
 * otherwise the page asks the person. Returns where to send the browser, or what to show.
 */
export async function beginConsent(challenge: string): Promise<{ redirectTo: string } | PendingConsent> {
  const request = await oauth2().getOAuth2ConsentRequest({ consentChallenge: challenge })
  const decision = await decide(request)
  if (decision.kind === "reject") return { redirectTo: await reject(challenge, decision) }
  if (request.skip || request.client?.skip_consent) return { redirectTo: await accept(challenge, decision, false) }
  return { request, decision }
}

/** The person's answer on the consent page. The decision is rebuilt, never taken from the form. */
export async function answerConsent(challenge: string, allow: boolean, remember: boolean): Promise<string> {
  const request = await oauth2().getOAuth2ConsentRequest({ consentChallenge: challenge })
  if (!allow) {
    return reject(challenge, { kind: "reject", error: "access_denied", description: "The person declined." })
  }
  const decision = await decide(request)
  if (decision.kind === "reject") return reject(challenge, decision)
  return accept(challenge, decision, remember)
}
