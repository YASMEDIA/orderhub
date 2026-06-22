#!/bin/sh
set -e

echo "⏳ Waiting for database & applying migrations..."

# Retry migrate deploy until Postgres is reachable (handles cold container starts).
ATTEMPTS=0
until npx prisma migrate deploy; do
  ATTEMPTS=$((ATTEMPTS + 1))
  if [ "$ATTEMPTS" -ge 15 ]; then
    echo "❌ Database not reachable after $ATTEMPTS attempts. Exiting."
    exit 1
  fi
  echo "   Database not ready yet (attempt $ATTEMPTS), retrying in 3s..."
  sleep 3
done

# Seed only when SEED_ON_START=true (idempotent — uses upserts).
if [ "$SEED_ON_START" = "true" ]; then
  echo "🌱 Seeding database..."
  npm run db:seed || echo "⚠️  Seed step failed (continuing)."
fi

echo "🚀 Starting Mahalatly..."
exec "$@"
