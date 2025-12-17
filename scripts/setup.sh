#!/bin/bash
set -e

# 1. Load Environment Variables
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
else
  echo "❌ Error: .env file not found. Copy .env.template to .env first."
  exit 1
fi

echo "🚀 Setting up server for: $DOMAIN_NAME ($APP_NAME)"

# 2. Generate Nginx Config from Template
echo "⚙️  Generating Nginx configuration..."
# CRITICAL FIX: Explicitly list all variables for envsubst to replace.
# This prevents Nginx from seeing ${BACKEND_PORT_BLUE} as an internal Nginx variable.
envsubst '${DOMAIN_NAME} ${BACKEND_PORT_BLUE} ${FRONTEND_PORT_BLUE}' < nginx.config.template > nginx.config

# 3. Install Nginx Config to System Directory
DEST_PATH="/etc/nginx/sites-available/${DOMAIN_NAME}"

echo "📋 Copying config to $DEST_PATH..."
sudo cp nginx.config "$DEST_PATH"

# 4. Enable the Site (Symlink)
if [ ! -f "/etc/nginx/sites-enabled/${DOMAIN_NAME}" ]; then
    echo "🔗 Linking site to sites-enabled..."
    sudo ln -s "$DEST_PATH" "/etc/nginx/sites-enabled/${DOMAIN_NAME}"
else
    echo "🔗 Site already linked."
fi

# 5. Test and Reload Nginx
echo "✨ Testing Nginx configuration..."
sudo nginx -t
sudo systemctl reload nginx

echo "✅ Setup complete! You can now run ./scripts/deploy.sh"