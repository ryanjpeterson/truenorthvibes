#!/bin/sh
set -e

echo "🔍 [Frontend] Waiting for Backend (Strapi) to be ready..."

# Loop until we get a response from the Strapi API health endpoint
# We use the internal hostname 'backend' and port 1337
until [ "$(curl -s -o /dev/null -w "%{http_code}" http://backend:1337/_health)" = "204" ] || [ "$(curl -s -o /dev/null -w "%{http_code}" http://backend:1337/admin)" = "200" ]; do
  echo "⏳ [Frontend] Backend unavailable. Sleeping for 2s..."
  sleep 2
done

echo "✅ [Frontend] Backend is up! Starting Next.js Server..."

# Exec the passed command (npm start)
exec "$@"