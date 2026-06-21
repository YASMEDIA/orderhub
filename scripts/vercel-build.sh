#!/bin/sh
# Build script used by `npm run build` (Vercel runs this).
# On PRODUCTION deploys it applies DB migrations and seeds the Super Admin so
# the database is ready with zero manual steps. On preview/CI builds it only
# builds — migrations there are handled separately (CI) or skipped (previews
# shouldn't mutate the production database).
set -e

prisma generate

if [ "$VERCEL_ENV" = "production" ]; then
  echo "▶ Production build: applying migrations and seeding…"
  prisma migrate deploy
  npm run db:seed || echo "⚠ seed skipped"
fi

next build
