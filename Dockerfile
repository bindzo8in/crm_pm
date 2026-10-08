# syntax=docker/dockerfile:1

# ============================================================
# 1. Dependencies
# ============================================================

FROM node:20-alpine AS deps

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

RUN corepack enable && \
    corepack prepare pnpm@12.5.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./

RUN pnpm config set ignore-scripts false && \
    pnpm install --frozen-lockfile


# ============================================================
# 2. Builder
# ============================================================

FROM node:20-alpine AS builder

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable && \
    corepack prepare pnpm@12.5.1 --activate

# Reuse installed dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy application
COPY . .

# ------------------------------------------------------------
# Prisma Client
# ------------------------------------------------------------

RUN pnpm prisma generate

ENV NEXT_TELEMETRY_DISABLED=1

# ------------------------------------------------------------
# Next.js Build
#
# All env.ts variables are mounted only for this RUN command.
# They are NOT stored in the Docker image.
# ------------------------------------------------------------

RUN \
    --mount=type=secret,id=DATABASE_URL,env=DATABASE_URL \
    --mount=type=secret,id=BETTER_AUTH_SECRET,env=BETTER_AUTH_SECRET \
    --mount=type=secret,id=BETTER_AUTH_URL,env=BETTER_AUTH_URL \
    --mount=type=secret,id=RESEND_API_KEY,env=RESEND_API_KEY \
    --mount=type=secret,id=MAIL_FROM,env=MAIL_FROM \
    --mount=type=secret,id=GOOGLE_CLIENT_ID,env=GOOGLE_CLIENT_ID \
    --mount=type=secret,id=GOOGLE_CLIENT_SECRET,env=GOOGLE_CLIENT_SECRET \
    --mount=type=secret,id=CHROMIUM_REMOTE_EXEC_PATH,env=CHROMIUM_REMOTE_EXEC_PATH \
    --mount=type=secret,id=EXCHANGE_RATE_API_KEY,env=EXCHANGE_RATE_API_KEY \
    --mount=type=secret,id=NEXT_PUBLIC_APP_NAME,env=NEXT_PUBLIC_APP_NAME \
    --mount=type=secret,id=NEXT_PUBLIC_SITE_URL,env=NEXT_PUBLIC_SITE_URL \
    --mount=type=secret,id=NEXT_PUBLIC_SUPPORT_EMAIL,env=NEXT_PUBLIC_SUPPORT_EMAIL \
    --mount=type=secret,id=NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,env=NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME \
    --mount=type=secret,id=NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,env=NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET \
    --mount=type=secret,id=NEXT_PUBLIC_APP_SCHEME,env=NEXT_PUBLIC_APP_SCHEME \
    pnpm run build


# ============================================================
# 3. Production Runner
# ============================================================

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PATH="/app/node_modules/.bin:$PATH"

RUN apk add --no-cache \
    chromium \
    nss \
    nspr \
    expat \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    openssl \
    libc6-compat

# Tell Puppeteer/Chromium where to find the Alpine-installed Chromium binary
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs


# ============================================================
# Next.js Standalone
# ============================================================

COPY --from=builder \
    /app/public ./public

COPY --from=builder \
    --chown=nextjs:nodejs \
    /app/.next/standalone ./

COPY --from=builder \
    --chown=nextjs:nodejs \
    /app/.next/static ./.next/static


# ============================================================
# Application Runtime Files
# ============================================================

COPY --from=builder \
    --chown=nextjs:nodejs \
    /app/lib ./lib


# ============================================================
# Prisma
# ============================================================

COPY --from=builder \
    --chown=nextjs:nodejs \
    /app/prisma ./prisma

COPY --from=builder \
    --chown=nextjs:nodejs \
    /app/prisma.config.ts ./prisma.config.ts


# ============================================================
# Node Modules
# ============================================================

COPY --from=builder \
    --chown=nextjs:nodejs \
    /app/node_modules ./node_modules


# ============================================================
# Runtime
# ============================================================

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]