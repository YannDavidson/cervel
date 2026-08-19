FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY tsconfig.json ./
COPY apps ./apps
COPY packages ./packages
COPY scripts ./scripts
COPY workers ./workers
COPY db ./db
RUN npm run build
RUN npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN groupadd --system cervel && useradd --system --gid cervel --uid 10001 cervel
COPY --from=build --chown=cervel:cervel /app/node_modules ./node_modules
COPY --from=build --chown=cervel:cervel /app/dist ./dist
COPY --from=build --chown=cervel:cervel /app/db ./db
COPY --from=build --chown=cervel:cervel /app/package.json ./package.json
USER cervel
EXPOSE 8080
ENV PORT=8080
CMD ["node","dist/apps/api/src/server.js"]
