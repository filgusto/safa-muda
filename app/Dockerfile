# ─── Stage 1: deps ────────────────────────────────────────────────────────────
FROM node:26-alpine AS deps
WORKDIR /app

# Install libc compat for native modules
RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps

# ─── Stage: migrator (applies Drizzle migrations) ─────────────────────────────
# Precisa do código-fonte e do node_modules para rodar `tsx db/migrate.ts`.
# O script cria a extensão PostGIS antes de aplicar as migrations.
FROM node:26-alpine AS migrator
WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

CMD ["npm", "run", "db:migrate"]

# ─── Stage: dev (used by docker-compose for local development) ────────────────
FROM node:26-alpine AS dev
WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

EXPOSE 3000

CMD ["npm", "run", "dev"]

# ─── Stage 2: builder (for production builds) ─────────────────────────────────
FROM node:26-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Enable standalone output
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Variáveis NEXT_PUBLIC_* lidas por componentes de cliente são embutidas no
# bundle aqui, no build — defini-las só no ambiente do contêiner não tem
# efeito. Opcionais: sem elas o mapa usa só o OpenStreetMap (lib/tiles.ts).
ARG NEXT_PUBLIC_SATELLITE_TILE_URL
ARG NEXT_PUBLIC_SATELLITE_ATTRIBUTION
ARG NEXT_PUBLIC_SATELLITE_MAX_ZOOM
ENV NEXT_PUBLIC_SATELLITE_TILE_URL=$NEXT_PUBLIC_SATELLITE_TILE_URL
ENV NEXT_PUBLIC_SATELLITE_ATTRIBUTION=$NEXT_PUBLIC_SATELLITE_ATTRIBUTION
ENV NEXT_PUBLIC_SATELLITE_MAX_ZOOM=$NEXT_PUBLIC_SATELLITE_MAX_ZOOM

RUN npm run build

# ─── Stage 3: runner (production) ─────────────────────────────────────────────
FROM node:26-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Copy only what Next.js standalone output needs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
