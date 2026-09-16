FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/web/package.json apps/web/
COPY apps/ingest/package.json apps/ingest/
COPY packages/shared/package.json packages/shared/
RUN npm install --workspace=apps/web --workspace=apps/ingest --workspace=packages/shared

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build -w apps/web

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV ENABLE_INGEST=true
ENV PORT=3000
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
RUN mkdir -p ./data
COPY --from=builder /app/data ./data
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
