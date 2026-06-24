#!/bin/sh
# Build script used by `npm run build` (Vercel runs this).
# On PRODUCTION deploys it applies DB migrations and seeds the Super Admin so
# the database is ready with zero manual steps. On preview/CI builds it only
# builds — migrations there are handled separately (CI) or skipped (previews
# shouldn't mutate the production database).
set -e

# Prisma's migration engine needs a NON-pooled connection (schema `directUrl`).
# The Neon Vercel integration provisions a direct URL automatically — fall back
# to it (or, last resort, to DATABASE_URL) so builds don't fail just because
# DIRECT_URL wasn't set by hand. Prefer the most specific direct var available.
if [ -z "$DIRECT_URL" ]; then
  export DIRECT_URL="${DATABASE_URL_UNPOOLED:-${POSTGRES_URL_NON_POOLING:-$DATABASE_URL}}"
fi

prisma generate

if [ "$VERCEL_ENV" = "production" ]; then
  if [ -n "$DATABASE_URL" ]; then
    echo "▶ Production build: applying migrations and seeding…"
    prisma migrate deploy
    npm run db:seed || echo "⚠ seed skipped"
  else
    echo "⚠ DATABASE_URL not set — skipping migrate & seed."
  fi
fi

next build
