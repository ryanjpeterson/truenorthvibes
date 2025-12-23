#!/bin/bash
set -e

if [ -z "$1" ]; then
    echo "❌ Usage: ./scripts/restore-prod.sh <path-to-backup-file.tar.gz>"
    exit 1
fi

BACKUP_FILE="$1"
FILENAME=$(basename "$BACKUP_FILE")

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

REMOTE_TMP_DIR="/tmp"
echo "🚀 Starting production restore for \"$APP_NAME\"..."

# 2. Upload
scp -P "$VPS_PORT" "$BACKUP_FILE" "$VPS_USER@$VPS_HOST:$REMOTE_TMP_DIR/$FILENAME"

# 3. Remote Restore
ssh -p "$VPS_PORT" -t "$VPS_USER@$VPS_HOST" "
    set -e
    SEARCH_PATTERN=\"${APP_NAME// /.*}-backend-(blue|green)\"
    CONTAINER_NAME=\$(docker ps --format '{{.Names}}' | grep -Ei \"\$SEARCH_PATTERN\" | head -n 1 | tr -d '\r\n')

    echo \"   >> 📂 Streaming backup into container...\"
    cat $REMOTE_TMP_DIR/$FILENAME | docker exec -i \"\$CONTAINER_NAME\" tee /tmp/$FILENAME > /dev/null

    echo \"   >> 🐳 Running import as root...\"
    docker exec -u root \"\$CONTAINER_NAME\" npm run strapi -- import --force --file /tmp/$FILENAME

    rm $REMOTE_TMP_DIR/$FILENAME
"

echo "✅ Restore complete!"