# The e2e suite as an image, for staging (deploy/staging/e2e.yaml): Playwright with Chromium, tests and config.
# Built by .github/workflows/image.yml next to auth-ui, same tag (the commit SHA).
FROM mcr.microsoft.com/playwright:v1.64.0-noble
WORKDIR /e2e
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY playwright.config.ts ./
COPY tests ./tests
ENV CI=1 HOME=/tmp E2E_OUTPUT_DIR=/tmp/results
USER pwuser
CMD ["npx", "playwright", "test"]
