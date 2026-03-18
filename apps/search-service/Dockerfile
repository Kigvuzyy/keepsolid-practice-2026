# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=25.5.0
ARG PNPM_VERSION=10.30.2
ARG PROJECT=search-service

FROM node:${NODE_VERSION}-alpine AS alpine

FROM alpine AS base

ENV PNPM_HOME="/pnpm" \
    PNPM_STORE_DIR="/pnpm-store" \
    TURBO_TELEMETRY_DISABLED="1"
ENV PATH="$PNPM_HOME:$PATH"

WORKDIR /app

RUN npm i -g pnpm@${PNPM_VERSION} \
    && pnpm -v \
    && pnpm config set store-dir ${PNPM_STORE_DIR}

FROM base AS deps

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY packages/ packages/
COPY apps/     apps/

RUN --mount=type=cache,id=pnpm-store,target=/pnpm-store \
    pnpm fetch

FROM base AS builder
ARG PROJECT
    
COPY . .

RUN --mount=type=cache,id=pnpm-store,target=/pnpm-store pnpm -r install --frozen-lockfile --prefer-offline

RUN pnpm exec turbo run build --filter="${PROJECT}"

FROM builder AS pruned
ARG PROJECT

WORKDIR /app
RUN pnpm --filter "${PROJECT}" --prod deploy /app/pruned

FROM alpine AS runner
ENV NODE_ENV=production

WORKDIR /app

USER node

COPY --chown=node:node --from=pruned /app/pruned .

CMD ["node", "--import", "@kigvuzyy/observability/otel/preload", "./build/main.mjs"]
