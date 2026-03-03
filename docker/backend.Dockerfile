# Stage 1: Install dependencies
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/types/package.json ./packages/types/

RUN pnpm install --frozen-lockfile

# Stage 2: Build
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=deps /app/packages/types/node_modules ./packages/types/node_modules

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json ./
COPY packages/types/ ./packages/types/
COPY apps/backend/ ./apps/backend/

RUN pnpm --filter @objetiva/types build
RUN pnpm --filter @objetiva/backend build

# Prune dev dependencies
RUN pnpm --filter @objetiva/backend deploy --prod /app/pruned

# Stage 3: Production runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/pruned/dist ./dist
COPY --from=builder /app/pruned/node_modules ./node_modules

EXPOSE 3001
ENV PORT=3001

CMD ["node", "dist/main.js"]
