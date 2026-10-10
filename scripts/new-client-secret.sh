#!/usr/bin/env bash
# Generates an OIDC client secret: give it to the application and put the same value in the auth app's
# OIDC_*_CLIENT_SECRET variable. Hydra stores only a hash of it. Never commit it.
set -euo pipefail
openssl rand -base64 48 | tr -d '\n=' | tr '+/' '-_'
echo
