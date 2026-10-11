# auth

Single sign-on for a small group of people: one account, a passkey or password plus an authenticator app, every service.

- **[Ory Kratos](https://www.ory.com/docs/kratos/ory-kratos-intro)** holds the people and runs sign-in. It handles passkeys, passwords, TOTP, one-time recovery codes, email recovery and sessions.
- **[Ory Hydra](https://www.ory.com/docs/hydra/)** is the OpenID Connect provider that apps sign in with.
- **[Ory Keto](https://www.ory.com/docs/keto/)** stores group membership, and nothing else does.
- **[Ory Oathkeeper](https://www.ory.com/docs/oathkeeper/)** is Traefik's forward-auth for apps that have no login of their own.
- **`ui/`** is a Next.js app with the look of bulbashenko.com. It renders the sign-in, settings, recovery and consent pages and the admin page. It is a thin layer: Kratos drives every form (fields, CSRF, redirects, passkey script), and the UI only draws it. The consent step and the admin page are the only code here that touches admin APIs.

Altogether it runs in about 250 MB of RAM. The stack is a Docker Compose file deployed by [Coolify](https://coolify.io) straight from this repository. It runs anywhere Compose runs if you fill in the variables yourself.

It powers `auth.bulbashenko.com`.

## Layout

| Path | What it is |
|---|---|
| `compose.yml` | The services, their Traefik routes and every variable they read. |
| `ory/kratos/` | Kratos config, the identity schema (`username`, `email`, `name`) and the email templates. |
| `ory/hydra/hydra.yml`, `ory/hydra/clients/` | Hydra config, and one JSON file per OIDC client. |
| `ory/keto/` | Keto config and the permission model (`Group#members`). |
| `ory/oathkeeper/` | Forward-auth config and the rules: which host needs which group. |
| `dbproxy/` | Gives the Ory services a path to the shared Postgres (see Security). |
| `ui/` | The Next.js app, plus the admin scripts (`ui/scripts/`). |
| `e2e/` | Test stack (`compose.test.yml`) and Playwright tests. |
| `design/` | The design mockup exported from Claude Design. |
| `thunderbird-addon/` | Add-on that makes Thunderbird sign in to `@bulbashenko.com` through this provider. |
| `scripts/` | Secret generator. |

## Sign-in

- **Every sign-in takes two factors.** The first is a passkey or the password. The second is a code from the authenticator app, or a one-time recovery code. Kratos counts a passkey as one factor (`aal1`), so it is followed by TOTP like the password is (`required_aal: highest_available`).
- **The consent step checks again.** It rejects any sign-in whose methods (`amr`) include no second factor, so an account without TOTP gets no tokens at all.
- **No self-registration.** An admin creates people on the admin page and gives them a one-time recovery link and code in person. With those they set a password, add a passkey, link an authenticator app and save their recovery codes.
- **Sessions last 7 days.** They extend while in use. Changing credentials or using the admin page needs a sign-in from the last 15 minutes.
- **Users cannot edit their own profile.** The username and email feed the tokens and Stalwart's mailbox mapping, so only admins can change them.

Groups decide access. Each OIDC client names one group in `metadata.required_group`, and the consent step refuses everyone outside it. A client without a group refuses everyone.

| Group | Grants |
|---|---|
| `infra-admins` | Mesh admin UIs (forward-auth), Coolify, the admin page |
| `site-admins` | The bulbashenko.com admin panel |
| `mail-users` | Mail clients and the Stalwart web UI |
| `vpn-users` | Joining the VPN mesh (Headscale) |

## Deploy on Kubernetes

`kustomization.yaml` at the root is a Kustomize base built from the same `ory/` files that `compose.yml` mounts: Deployments for Kratos, Hydra and Keto (each runs its migration as an init container), Oathkeeper and the UI, the `hydra-clients` Job, and Traefik routes (`auth-public` on the `web` entrypoint, `auth-admin` for `users.int` behind the mesh and Oathkeeper). Service names match the compose stack, so the configs' internal URLs work unchanged.

The deploying side provides the namespace, the image tag and a Secret `auth` with `KRATOS_DSN`, `HYDRA_DSN`, `KETO_DSN`, `KRATOS_SECRETS_{COOKIE,DEFAULT,CIPHER,PAGINATION}`, `HYDRA_SECRETS_{SYSTEM,COOKIE,PAGINATION}`, `SMTP_CONNECTION_URI`, `SMTP_SENDER` and `OIDC_{SITE,COOLIFY,HEADSCALE}_CLIENT_SECRET`. bulbashenko.com deploys it from [bulbashenko-com/infra](https://github.com/bulbashenko-com/infra), pinned to one commit of this repo; `.github/workflows/image.yml` builds `ghcr.io/bulbashenko-com/auth-ui:<commit>` for that commit.

## Deploy on Coolify

1. **Databases.** In the shared Postgres, create three databases, each with its own role:
   ```sql
   CREATE ROLE kratos LOGIN PASSWORD '...'; CREATE DATABASE kratos OWNER kratos;
   CREATE ROLE hydra  LOGIN PASSWORD '...'; CREATE DATABASE hydra  OWNER hydra;
   CREATE ROLE keto   LOGIN PASSWORD '...'; CREATE DATABASE keto   OWNER keto;
   ```
2. **Application.** + New → Public repository → this repo → Build strategy **Compose**, compose file `compose.yml`. Then:
   - **General → Build pipeline:** turn on **Preserve repository during deployment**. Configs are bind-mounted from the checkout.
   - **Advanced:** turn **Connect to predefined network** **off**. Only `dbproxy` joins the `coolify` network (see Security).
   - **Domains:** `sso-ui` → `https://auth.bulbashenko.com`. Kratos and Hydra take their paths on that host through the labels in `compose.yml`, and the longer rules win.
3. **Environment variables.** Coolify generates every `SERVICE_PASSWORD_*`. Fill in the rest:

   | Variable | Example / how to get it |
   |---|---|
   | `POSTGRES_HOST` | container name of the Postgres resource |
   | `KRATOS_DB_PASSWORD`, `HYDRA_DB_PASSWORD`, `KETO_DB_PASSWORD` | passwords of the three roles |
   | `KRATOS_CIPHER_SECRET` | exactly 32 characters: `openssl rand -hex 16` |
   | `SMTP_CONNECTION_URI` | `smtps://noreply%40example.com:<url-encoded password>@host.docker.internal:465/?server_name=mail.example.com` |
   | `SMTP_SENDER` | `noreply@example.com` |
   | `OIDC_SITE_CLIENT_SECRET`, `OIDC_COOLIFY_CLIENT_SECRET`, `OIDC_HEADSCALE_CLIENT_SECRET` | `scripts/new-client-secret.sh`; the app gets the same value |

   Optional: `AUTH_LOG_LEVEL` (`info`), `AUTH_RATE_LIMIT_PER_CLIENT` (10 per minute), `AUTH_RATE_LIMIT_TOTAL` (120 per minute).
   For another domain, change the domains in `ory/*/*.yml`, `ory/hydra/clients/` and the defaults of `AUTH_HOST`, `AUTH_PUBLIC_URL` and `AUTH_ADMIN_HOST`.
4. **Traefik files.** These are hand-made, in Coolify → Servers → Proxy → Dynamic Configurations.
   - Forward-auth middleware for the mesh admin UIs:
     ```yaml
     http:
       middlewares:
         sso-forward-auth:
           forwardAuth:
             address: http://oathkeeper:4456/decisions
             trustForwardHeader: true
             authResponseHeaders: [Remote-User, Remote-Email, Remote-Name]
     ```
   - The admin page is a router for `users.int.bulbashenko.com` with the mesh-only middleware and `sso-forward-auth`, pointing at `http://sso-ui:3000`.
5. **Deploy.** Then create the first person inside the `sso-ui` container:
   ```sh
   docker exec -it <sso-ui container> node scripts/bootstrap-admin.mjs admin admin@example.com "Your Name"
   ```
   It puts the person in every group and prints a recovery link and code, valid for one hour. Open the link, then on the settings page set a password, add a passkey, link an authenticator app and save the recovery codes.

## Add a service

**App that supports OpenID Connect.**
1. Add `ory/hydra/clients/<id>.json` (copy one). Set `metadata.required_group`, the redirect URIs and `skip_consent: true` for your own apps. A confidential client takes `"client_secret": "${OIDC_<NAME>_CLIENT_SECRET}"`.
2. Add the variable to the `hydra-clients` service in `compose.yml` and set it in Coolify. The app gets the same value.
3. Push and redeploy. The one-shot `hydra-clients` service makes Hydra's clients exactly the files: it creates new ones, replaces changed ones and deletes the rest.

The app needs these settings:
- issuer `https://auth.example.com`
- client id and secret
- scopes `openid profile email groups`

For an app that reads the person from the access token (like Stalwart), give the client an `audience` and `"metadata": { "access_token_identity": true }`. Access tokens are JWTs. They carry `scope` as a string and `scp` as a list, plus `preferred_username`, `email` and `name` at the top level.

**App without any login.** Put it behind the `sso-forward-auth` middleware and add or extend a rule in `ory/oathkeeper/rules.yml`. Each rule names the group. Without a session, browsers are sent to sign in; with the wrong group, they get 403.

**People and groups:** use the admin page at `https://users.int.bulbashenko.com`. It needs `infra-admins` and a recent sign-in. On it you can:
- create a person;
- change their groups (this revokes their tokens, so new claims apply);
- end their sessions;
- issue a recovery link;
- disable or delete them.

## Updates

Renovate opens pull requests for the Ory images (all four together), npm packages and the other images. The `test` workflow starts the whole stack and runs the Playwright suite against it. The suite covers:
- passkey sign-in;
- password plus TOTP;
- recovery codes;
- email recovery;
- tokens and their claims;
- group refusals;
- forward-auth;
- the admin page;
- rate limits.

Merge when it is green, then redeploy.

Ory's open-source releases come one or two times a year, without backports; security fixes reach the paid OEL builds first. Watch the security advisories of ory/kratos, ory/hydra, ory/keto and ory/oathkeeper and upgrade as soon as an OSS release appears.

Run the tests locally:

```sh
e2e/run.sh up        # builds and starts the test stack on 127.0.0.1:443 (*.bulbashenko.test)
cd e2e && npm ci && npx playwright install chromium && npx playwright test
e2e/run.sh down
```

## Security

- **The admin APIs of Kratos, Hydra and Keto have no authentication.** They are not routed. The stack runs on its own network ("Connect to predefined network" off), so other containers on the server, such as the website and the mail server, cannot reach them. Only `dbproxy` joins the shared network, and only to forward Postgres.
- **Brute force:** Kratos has no lockout. Traefik limits secret-taking POSTs (sign-in, recovery, settings, token endpoint) per client, keyed on `CF-Connecting-IP`, and for everyone together.
- **The UI sends a strict CSP with a per-request nonce.** It loads no third-party resources: fonts and three.js are bundled. It also blocks framing. The admin page answers only on `users.int`, and its actions check the session, the group and freshness again on every call.
- **Credential data is encrypted at rest** (`ciphers: xchacha20-poly1305`). Anonymous usage statistics to Ory are off (`SQA_OPT_OUT`).

## Thunderbird

Thunderbird 155+ supports OAuth for any mail server, but it has to be told the provider. The add-on does exactly that for `@bulbashenko.com`.

1. Build it with `thunderbird-addon/build.sh`.
2. Install it: Add-ons and Themes → ⚙ → Install Add-on From File.
3. Add the account, or switch an existing one to OAuth2 for both IMAP and SMTP. Thunderbird opens the sign-in page in its own window.

Passkeys don't work in that window; use the password and the authenticator app. To use the system browser instead, set `useExternalBrowser` to `true`.

To sign in again (another account, a changed password): Add-ons and Themes → the add-on → Options → **Remove OAuth tokens**. It clears the saved refresh token, the access token in memory and open connections, and optionally the sign-in cookies.

Phones (Thunderbird for Android, Apple Mail, FairEmail) cannot use custom OAuth yet. For them, create an app password in the mail server's account settings.

## Notes

- The issuer is `https://auth.bulbashenko.com`. Apps that use discovery find every endpoint there.
- Group changes reach tokens at the next sign-in. Saving groups on the admin page revokes existing tokens for that reason.
- Fonts: IBM Plex Mono and Tiny5, both under the SIL Open Font License 1.1.

## License

MIT.
