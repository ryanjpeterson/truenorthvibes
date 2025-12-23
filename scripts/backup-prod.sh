#!/bin/bash
set -e

# 1. LOAD ENV VARS
if [ -f .env ]; then
  # Robust loader that handles spaces, strips quotes, and removes comments
  while IFS='=' read -r key value || [ -n "$key" ]; do
    [[ "$key" =~ ^[[:space:]]*# ]] && continue
    [[ -z "$key" ]] && continue
    
    # Strip trailing comments and whitespace
    clean_value=$(echo "$value" | sed 's/[[:space:]]*#.*//' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    
    # Remove leading/trailing quotes
    clean_value="${clean_value%\"}"
    clean_value="${clean_value#\"}"
    clean_value="${clean_value%\'}"
    clean_value="${clean_value#\'}"
    
    export "$key=$clean_value"
  done < .env
else
  echo "❌ Error: .env file not found."
  exit 1
fi

# 2. Strict Variable Validation
if [ -z "$VPS_USER" ] || [ -z "$VPS_HOST" ] || [ -z "$VPS_PORT" ] || [ -z "$APP_NAME" ]; then
    echo "❌ Error: Required variables (VPS_USER, VPS_HOST, VPS_PORT, APP_NAME) are missing from .env."
    exit 1
fi

LOCAL_BACKUP_DIR="./backend/backups"
REMOTE_TMP_DIR="/tmp"
mkdir -p "$LOCAL_BACKUP_DIR"

echo "🚀 Starting production backup for \"$APP_NAME\"..."
echo "📍 Target: $VPS_USER@$VPS_HOST (Port $VPS_PORT)"

# 3. Detect Running Container (Blue or Green)
echo "🔍 Detecting active backend container..."
# Case-insensitive match for the container name pattern
SEARCH_PATTERN="${APP_NAME// /.*}-backend-(blue|green)"
CONTAINER_NAME=$(ssh -p "$VPS_PORT" "$VPS_USER@$VPS_HOST" "docker ps --format '{{.Names}}' | grep -Ei '$SEARCH_PATTERN' | head -n 1" | tr -d '\r\n')

if [ -z "$CONTAINER_NAME" ]; then
    echo "❌ Error: No running backend container found matching '$SEARCH_PATTERN'."
    exit 1
fi
echo "📦 Found active container: $CONTAINER_NAME"

# 4. Filename Handling
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
EXPORT_BASENAME="strapi-export-$TIMESTAMP"
EXPORT_FILENAME="${EXPORT_BASENAME}.tar.gz"

# 5. Generate Export on VPS
echo "🔄 Connecting to remote to run Strapi export..."
# Use -t for the initial connection, but ensure data transfer commands remain clean
ssh -p "$VPS_PORT" -t "$VPS_USER@$VPS_HOST" "
    set -e 
    echo \"   >> 🐳 Running export inside '$CONTAINER_NAME'...\"
    # Explicitly use /tmp which is a writable tmpfs mount in your setup
    docker exec \"$CONTAINER_NAME\" npm run strapi -- export --no-encrypt --file /tmp/$EXPORT_BASENAME
    
    echo \"   >> 📂 Streaming file from container to VPS host...\"
    # Use 'cat' to stream binary data instead of 'docker cp' to bypass tmpfs/read_only limitations
    docker exec \"$CONTAINER_NAME\" cat /tmp/$EXPORT_FILENAME > $REMOTE_TMP_DIR/$EXPORT_FILENAME
    
    echo \"   >> 🧹 Cleaning up inside container...\"
    docker exec \"$CONTAINER_NAME\" rm /tmp/$EXPORT_FILENAME
"

# 6. Download to Local
echo "⬇️  Downloading backup to $LOCAL_BACKUP_DIR..."
scp -P "$VPS_PORT" "$VPS_USER@$VPS_HOST:$REMOTE_TMP_DIR/$EXPORT_FILENAME" "$LOCAL_BACKUP_DIR/$EXPORT_FILENAME"

# 7. Cleanup on VPS
echo "🧹 Cleaning up temporary file on remote host..."
ssh -p "$VPS_PORT" "$VPS_USER@$VPS_HOST" "rm $REMOTE_TMP_DIR/$EXPORT_FILENAME"

echo "✅ Backup complete!"
echo "📄 Saved to: $LOCAL_BACKUP_DIR/$EXPORT_FILENAME"

echo ""
echo "💡 Tip: To avoid repeated passphrase prompts, run 'ssh-add ~/.ssh/id_ed25519' before starting the script."