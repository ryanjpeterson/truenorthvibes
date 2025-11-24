#!/bin/sh
set -e

echo "🚀 Container Started. Target Backend: $STRAPI_INTERNAL_URL"

# 1. Wait for Strapi Backend to be Healthy
# We check the Strapi _health endpoint (returns 204 or 200 when ready)
echo "⏳ Waiting for Strapi Backend to be ready..."
until curl -s -f "$STRAPI_INTERNAL_URL/_health" > /dev/null; do
  echo "   ... Backend not reachable yet. Sleeping 3s..."
  sleep 3
done
echo "✅ Backend is ONLINE!"

# 2. Build the Next.js App (SSG)
# Now that backend is up, we can fetch data during build
echo "🏗️ Starting Next.js Build..."
npm run build

# 3. Start the Server
echo "⚡ Build Complete. Starting Next.js Server..."
exec npm start