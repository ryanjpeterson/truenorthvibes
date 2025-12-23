#!/bin/bash
set -e

# 1. LOAD ENV VARS
if [ -f .env ]; then
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
    echo "❌ Error: Required variables missing from .env."
    exit 1
fi

LOCAL_BACKUP_DIR="./backend/backups"
REMOTE_TMP_DIR="/tmp"
mkdir -p "$LOCAL_BACKUP_DIR"

echo "🚀 Starting production backup for \"$APP_NAME\"..."

# 3. Detect Running Container
SEARCH_PATTERN="${APP_NAME// /.*}-backend-(blue|green)"
CONTAINER_NAME=$(ssh -p "$VPS_PORT" "$VPS_USER@$VPS_HOST" "docker ps --format '{{.Names}}' | grep -Ei '$SEARCH_PATTERN' | head -n 1" | tr -d '\r\n')

if [ -z "$CONTAINER_NAME" ]; then
    echo "❌ Error: No running backend container found."
    exit 1
fi
echo "📦 Found active container: $CONTAINER_NAME"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
EXPORT_FILENAME="strapi-export-$TIMESTAMP.tar.gz"

# 4. Generate and Stream
ssh -p "$VPS_PORT" -t "$VPS_USER@$VPS_HOST" "
    set -e 
    docker exec \"$CONTAINER_NAME\" npm run strapi -- export --no-encrypt --file /tmp/backup
    docker exec \"$CONTAINER_NAME\" cat /tmp/backup.tar.gz > $REMOTE_TMP_DIR/$EXPORT_FILENAME
    docker exec \"$CONTAINER_NAME\" rm /tmp/backup.tar.gz
"

# 5. Download and Cleanup
scp -P "$VPS_PORT" "$VPS_USER@$VPS_HOST:$REMOTE_TMP_DIR/$EXPORT_FILENAME" "$LOCAL_BACKUP_DIR/$EXPORT_FILENAME"
ssh -p "$VPS_PORT" "$VPS_USER@$VPS_HOST" "rm $REMOTE_TMP_DIR/$EXPORT_FILENAME"

echo "✅ Backup complete: $LOCAL_BACKUP_DIR/$EXPORT_FILENAME"