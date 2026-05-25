# ─────────────────────────────────────────────────────────────
# Homelab Hub — Production Dockerfile
# ─────────────────────────────────────────────────────────────

# 1) Build stage: compile the app using Bun
FROM oven/bun:1-alpine AS builder
WORKDIR /app

# Copy dependency manifests and install
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source code and build
COPY . .
RUN bun run build

# 2) Production stage: lightweight Node.js image to serve
FROM node:22-alpine
WORKDIR /app

# Node 22+ ships with native fetch, ReadableStream, etc.
ENV NODE_ENV=production
ENV PORT=3001

# Copy built assets + server script
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/docker-server.mjs ./docker-server.mjs

EXPOSE 3000

CMD ["node", "docker-server.mjs"]
