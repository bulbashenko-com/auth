#!/usr/bin/env bash
# Local and CI test stack. Usage: e2e/run.sh up | test | down | logs [service]
set -euo pipefail
cd "$(dirname "$0")/.."
# `exclude_from_hc` is a Coolify key that plain Compose rejects; Coolify strips it, so do the same here.
grep -v 'exclude_from_hc' compose.yml > .compose.e2e.yml
compose=(docker compose --env-file e2e/test.env -f .compose.e2e.yml -f e2e/compose.test.yml)

case "${1:-}" in
  up)
    # The test rules are the production rules on the test domain.
    sed 's/bulbashenko\.com/bulbashenko.test/g' ory/oathkeeper/rules.yml > e2e/ory/rules.test.yml
    # A certificate for *.bulbashenko.test. Chromium trusts exactly this key (--ignore-certificate-errors-spki-list,
    # see playwright.config.ts), so pages are secure contexts and WebAuthn works.
    if [ ! -f e2e/certs/tls.crt ]; then
      mkdir -p e2e/certs
      openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:P-256 -nodes -days 3650 \
        -keyout e2e/certs/tls.key -out e2e/certs/tls.crt -subj "/CN=bulbashenko.test" \
        -addext "subjectAltName=DNS:bulbashenko.test,DNS:*.bulbashenko.test,DNS:*.int.bulbashenko.test" 2>/dev/null
      openssl x509 -in e2e/certs/tls.crt -pubkey -noout | openssl pkey -pubin -outform der \
        | openssl dgst -sha256 -binary | base64 > e2e/certs/spki.txt
    fi
    "${compose[@]}" up -d --build --wait --wait-timeout 300 "${@:2}"
    ;;
  test)
    (cd e2e && npx playwright test "${@:2}")
    ;;
  down)
    "${compose[@]}" down -v --remove-orphans
    ;;
  logs)
    "${compose[@]}" logs "${@:2}"
    ;;
  *)
    "${compose[@]}" "$@"
    ;;
esac
