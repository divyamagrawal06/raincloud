FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/mobile/package.json apps/mobile/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/domain/package.json packages/domain/package.json

RUN npm ci --omit=dev --workspace @raincloud/worker --include-workspace-root=false

COPY apps/worker apps/worker

USER node

CMD ["node", "apps/worker/src/worker.mjs"]
