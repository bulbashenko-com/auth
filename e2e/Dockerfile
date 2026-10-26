# The e2e suite as an image, for staging (deploy/staging/e2e.yaml): Playwright with Chromium, tests and config.
# Built by .github/workflows/image.yml next to auth-ui, same tag (the commit SHA).
FROM mcr.microsoft.com/playwright:v1.64.0-noble
WORKDIR /e2e
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY playwright.config.ts ./
COPY tests ./tests
# Plain `list` output into the Job log (CI=1 would also write an HTML report into the read-only image).
ENV HOME=/tmp E2E_OUTPUT_DIR=/tmp/results
USER pwuser
CMD ["/e2e/node_modules/.bin/playwright", "test"]
