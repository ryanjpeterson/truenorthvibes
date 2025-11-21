#!/bin/sh

echo "🔍 [Frontend] Waiting for Backend (Strapi) to be ready..."

# Loop until we get a response from the Strapi API (using the internal Docker hostname 'backend')
# We check the /api/posts endpoint (or just root) to ensure the API is responding.
# -s = silent, -o /dev/null = discard output, -w "%{http_code}" = print status code
until [ "$(curl -s -o /dev/null -w "%{http_code}" http://backend:1337/_health)" = "204" ] || [ "$(curl -s -o /dev/null -w "%{http_code}" http://backend:1337/admin)" = "200" ]; do
  echo "⏳ [Frontend] Backend unavailable. Sleeping for 5s..."
  sleep 5
done

echo "✅ [Frontend] Backend is up! Starting Next.js Build..."

# Run the build now that the backend is reachable
npm run build

echo "🚀 [Frontend] Build complete. Starting server..."
npm run start