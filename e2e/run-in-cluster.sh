#!/bin/sh
# Entry point of the e2e image (staging, deploy/staging/e2e.yaml). The pod and its /tmp vanish after a run, so on
# failure the page snapshot Playwright saves next to each failed test goes into the log.
/e2e/node_modules/.bin/playwright test "$@"
rc=$?
if [ "$rc" -ne 0 ]; then
  for f in "${E2E_OUTPUT_DIR:-test-results}"/*/error-context.md; do
    [ -f "$f" ] || continue
    printf '\n===== %s =====\n' "$f"
    cat "$f"
  done
fi
exit "$rc"
