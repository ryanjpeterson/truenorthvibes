#!/bin/bash
set -e

# 1. Load Environment Variables
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
else
  echo "❌ Error: .env file not found. Copy .env.template to .env first."
  exit 1
fi

echo "🚀 Setting up server for: $DOMAIN_NAME"

# 2. Generate Nginx Config from Template
# (This is the command you asked about)
echo "⚙️  Generating Nginx configuration..."
envsubst '${DOMAIN_NAME}' < nginx.config.template > nginx.config

# 3. Install Nginx Config to System Directory
# We use the DOMAIN_NAME var to name the file in /etc/nginx/sites-available/
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

echo "✅ Setup complete! You can now run ./deploy.sh"