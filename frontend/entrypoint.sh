#!/bin/sh
set -e  # Stop script immediately if any command fails

echo "🔍 [Frontend] Waiting for Backend (Strapi) to be ready..."

# Loop until we get a response from the Strapi API
until [ "$(curl -s -o /dev/null -w "%{http_code}" http://backend:1337/_health)" = "204" ] || [ "$(curl -s -o /dev/null -w "%{http_code}" http://backend:1337/admin)" = "200" ]; do
  echo "⏳ [Frontend] Backend unavailable. Sleeping for 5s..."
  sleep 5
done

echo "✅ [Frontend] Backend is up! Starting Next.js Build..."

# Run the build. If this fails, the script will exit here due to 'set -e'
npm run build

echo "🚀 [Frontend] Build complete. Starting server..."
npm run start