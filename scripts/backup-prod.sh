#!/bin/bash

# 1. LOAD ENV VARS (Essential for VPS_USER, VPS_HOST, VPS_PORT)
if [ -f .env ]; then
  # Automatically export variables from .env
  export $(grep -v '^#' .env | xargs)
else
  echo "⚠️  Warning: .env file not found. Ensure VPS variables are set manually."
fi

# --- Configuration ---
VPS_USER="${VPS_USER}"
VPS_HOST="${VPS_HOST}"
VPS_PORT="${VPS_PORT}"

# Local directory where files will be saved
LOCAL_BACKUP_DIR="./backend/backups"
REMOTE_TMP_DIR="/tmp"

mkdir -p "$LOCAL_BACKUP_DIR"

echo "🚀 Starting production backup..."
echo "📍 Target: $VPS_USER@$VPS_HOST (Port $VPS_PORT)"

# --- 1. Detect Running Container ---
echo "🔍 Detecting running backend container..."
CONTAINER_NAME=$(ssh -p "$VPS_PORT" "$VPS_USER@$VPS_HOST" "sudo docker ps --format '{{.Names}}' | grep 'backend-' | head -n 1")

if [ -z "$CONTAINER_NAME" ]; then
    echo "❌ Error: No running container found matching 'backend-'."
    exit 1
fi
echo "📦 Found active container: $CONTAINER_NAME"

# --- Filename Handling ---
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
EXPORT_BASENAME="strapi-export-$TIMESTAMP"
EXPORT_FILENAME="${EXPORT_BASENAME}.tar.gz"

# --- 2. Generate Export on VPS ---
echo "🔄 Connecting to remote to run Strapi export..."
ssh -p "$VPS_PORT" -t "$VPS_USER@$VPS_HOST" "
    set -e 

    echo '   >> 🐳 Running export inside $CONTAINER_NAME...'
    sudo docker exec $CONTAINER_NAME npm run strapi -- export --no-encrypt --file $EXPORT_BASENAME

    echo '   >> 📂 Copying file from container to host...'
    sudo docker cp $CONTAINER_NAME:/opt/app/$EXPORT_FILENAME $REMOTE_TMP_DIR/$EXPORT_FILENAME

    echo '   >> 🧹 Cleaning up inside container...'
    sudo docker exec $CONTAINER_NAME rm /opt/app/$EXPORT_FILENAME
    
    # Change ownership of the temp file on host so user can download and delete it
    sudo chown $VPS_USER:$VPS_USER $REMOTE_TMP_DIR/$EXPORT_FILENAME
"

if [ $? -ne 0 ]; then
    echo "❌ Remote backup process failed."
    exit 1
fi

# --- 3. Download to Local ---
echo "⬇️  Downloading backup to $LOCAL_BACKUP_DIR..."
scp -P "$VPS_PORT" "$VPS_USER@$VPS_HOST:$REMOTE_TMP_DIR/$EXPORT_FILENAME" "$LOCAL_BACKUP_DIR/$EXPORT_FILENAME"

# --- 4. Cleanup on VPS ---
echo "🧹 Cleaning up temporary file on remote host..."
ssh -p "$VPS_PORT" -t "$VPS_USER@$VPS_HOST" "rm $REMOTE_TMP_DIR/$EXPORT_FILENAME"

echo "✅ Backup complete!"
echo "📄 Saved to: $LOCAL_BACKUP_DIR/$EXPORT_FILENAME"