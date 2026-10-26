# syntax=docker/dockerfile:1
# Build context: the monorepo root (needs packages/shared). Example:
#   docker build -f apps/api/Dockerfile --build-arg APP_VERSION=$(git rev-parse --short HEAD) -t calories-diary-api .

ARG NODE_VERSION=24

# --- base: Node + pnpm ---------------------------------------------------------
FROM node:${NODE_VERSION}-slim AS base
ARG PNPM_VERSION=12.15.0
RUN npm install -g pnpm@${PNPM_VERSION}
WORKDIR /repo

# --- deps: install from the lockfile (cached until manifests change) -----------
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts --filter "@calories-diary/api..."

# --- build: compile shared and api, then keep only production deps -----------
FROM deps AS build
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @calories-diary/shared build \
 && pnpm --filter @calories-diary/api build \
 && pnpm --filter @calories-diary/api deploy --prod --legacy /out

# --- runtime -------------------------------------------------------------------
FROM node:${NODE_VERSION}-slim AS runtime
ARG APP_VERSION=dev
ENV NODE_ENV=production \
    PORT=3001 \
    APP_VERSION=${APP_VERSION}
WORKDIR /app
COPY --from=build --chown=node:node /out ./
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "dist/src/server.js"]
