import "server-only"
import {
  Configuration,
  FrontendApi,
  IdentityApi,
  OAuth2Api,
  PermissionApi,
  RelationshipApi,
} from "@ory/client-fetch"
import { env } from "./env"

const json = { Accept: "application/json" }

/** Kratos public API over the stack network; the browser's cookies are passed per call. */
export const frontend = () => new FrontendApi(new Configuration({ basePath: env.kratosPublic, headers: json }))

/** Kratos admin API: identities, sessions, recovery codes. */
export const identities = () => new IdentityApi(new Configuration({ basePath: env.kratosAdmin, headers: json }))

/** Hydra admin API: login, consent and logout requests, clients. */
export const oauth2 = () => new OAuth2Api(new Configuration({ basePath: env.hydraAdmin, headers: json }))

/** Keto read API: membership checks and listings. */
export const permissions = () => new PermissionApi(new Configuration({ basePath: env.ketoRead, headers: json }))
export const relationshipsRead = () => new RelationshipApi(new Configuration({ basePath: env.ketoRead, headers: json }))

/** Keto write API: only the admin page changes memberships. */
export const relationshipsWrite = () => new RelationshipApi(new Configuration({ basePath: env.ketoWrite, headers: json }))
