#!/bin/bash
set -e

# --- Usage Check ---
if [ -z "$1" ]; then
    echo "❌ Usage: ./scripts/restore-prod.sh <path-to-backup-file.tar.gz>"
    exit 1
fi

BACKUP_FILE="$1"
FILENAME=$(basename "$BACKUP_FILE")

# 1. LOAD ENV VARS
if [ -f .env ]; then
  # Robust loader that handles spaces, strips quotes, and removes comments
  while IFS='=' read -r key value || [ -n "$key" ]; do
    [[ "$key" =~ ^[[:space:]]*# ]] && continue
    [[ -z "$key" ]] && continue
    
    clean_value=$(echo "$value" | sed 's/[[:space:]]*#.*//' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
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

REMOTE_TMP_DIR="/tmp"

echo "🚀 Starting production restore for \"$APP_NAME\"..."
echo "📍 Target: $VPS_USER@$VPS_HOST (Port $VPS_PORT)"
echo "📂 Backup file: $BACKUP_FILE"

# 3. Clean Previous Attempts on VPS
echo "🧹 Cleaning up any existing temporary file on VPS..."
ssh -p "$VPS_PORT" "$VPS_USER@$VPS_HOST" "rm -f $REMOTE_TMP_DIR/$FILENAME"

# 4. Upload Backup to VPS
echo "⬆️  Uploading backup to VPS ($REMOTE_TMP_DIR)..."
scp -P "$VPS_PORT" "$BACKUP_FILE" "$VPS_USER@$VPS_HOST:$REMOTE_TMP_DIR/$FILENAME"

if [ $? -ne 0 ]; then
    echo "❌ Upload failed."
    exit 1
fi

# 5. Remote Restore Process
echo "🔄 Connecting to remote to run Strapi import..."
ssh -p "$VPS_PORT" -t "$VPS_USER@$VPS_HOST" "
    set -e

    # A. Detect Running Container (Blue or Green)
    echo '   🔍 Detecting active backend container...'
    SEARCH_PATTERN=\"${APP_NAME// /.*}-backend-(blue|green)\"
    CONTAINER_NAME=\$(docker ps --format '{{.Names}}' | grep -Ei \"\$SEARCH_PATTERN\" | head -n 1 | tr -d '\r\n')

    if [ -z \"\$CONTAINER_NAME\" ]; then
        echo \"   ❌ Error: No running backend container found matching '\$SEARCH_PATTERN'.\"
        exit 1
    fi
    echo \"   📦 Found active container: \$CONTAINER_NAME\"

    # B. Stream file into the container
    # Using 'cat' and 'tee' to bypass 'docker cp' limitations with read_only/tmpfs volumes
    echo '   >> 📂 Streaming backup into container /tmp...'
    cat $REMOTE_TMP_DIR/$FILENAME | docker exec -i \"\$CONTAINER_NAME\" tee /tmp/$FILENAME > /dev/null

    # C. Run Strapi Import
    echo \"   >> 🐳 Running import inside \$CONTAINER_NAME...\"
    # Strapi 5 import using --force to bypass confirmation
    docker exec \"\$CONTAINER_NAME\" npm run strapi -- import --force --file /tmp/$FILENAME

    # D. Cleanup
    echo '   >> 🧹 Cleaning up container file...'
    docker exec \"\$CONTAINER_NAME\" rm /tmp/$FILENAME

    echo '   >> 🧹 Cleaning up host file...'
    rm $REMOTE_TMP_DIR/$FILENAME
"

echo "✅ Restore complete!"