# syntax=docker/dockerfile:1

ARG NODE_VERSION=26
ARG PNPM_VERSION=12.9.1


# Build stage

FROM node:${NODE_VERSION}-alpine AS build
ARG PNPM_VERSION

# Node 25 and later no longer ship corepack.
RUN npm install --global "pnpm@${PNPM_VERSION}"

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm exec vite build \
 && pnpm prune --prod --ignore-scripts


# Runtime stage

FROM node:${NODE_VERSION}-alpine

LABEL org.opencontainers.image.title="OpenSim web portal" \
      org.opencontainers.image.description="Account portal for an OpenSim standalone grid"

ENV NODE_ENV=production \
    PORT=3000

WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/build build
# Run once per deploy, as root on the database, by the web-setup service.
COPY --from=build /app/scripts/setup-db.ts scripts/setup-db.ts

# The node image's own unprivileged user.
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"

CMD ["node", "build/index.js"]
