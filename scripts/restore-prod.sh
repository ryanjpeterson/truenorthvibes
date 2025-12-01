#!/bin/bash

# --- Usage Check ---
if [ -z "$1" ]; then
    echo "❌ Usage: ./scripts/restore-prod.sh <path-to-backup-file.tar.gz>"
    exit 1
fi

BACKUP_FILE="$1"
FILENAME=$(basename "$BACKUP_FILE")

# --- Configuration ---
VPS_USER="${VPS_USER}"
VPS_HOST="${VPS_HOST}"
REMOTE_TMP_DIR="/tmp"

echo "🚀 Starting production restore..."
echo "📍 Target: $VPS_USER@$VPS_HOST"
echo "📂 Backup file: $BACKUP_FILE"

# --- 1. Clean Previous Attempts (Fixes 'Permission denied') ---
echo "🧹 Cleaning up any existing temporary file on VPS..."
ssh "$VPS_USER@$VPS_HOST" "sudo rm -f $REMOTE_TMP_DIR/$FILENAME"

# --- 2. Upload Backup to VPS ---
echo "⬆️  Uploading backup to VPS ($REMOTE_TMP_DIR)..."
scp "$BACKUP_FILE" "$VPS_USER@$VPS_HOST:$REMOTE_TMP_DIR/$FILENAME"

if [ $? -ne 0 ]; then
    echo "❌ Upload failed."
    exit 1
fi

# --- 3. Remote Restore Process ---
echo "🔄 Connecting to remote to run Strapi import..."
ssh -t "$VPS_USER@$VPS_HOST" "
    set -e

    # A. Detect Running Container (Blue or Green)
    echo '   🔍 Detecting running backend container...'
    CONTAINER_NAME=\$(sudo docker ps --format '{{.Names}}' | grep 'backend-' | head -n 1)

    if [ -z \"\$CONTAINER_NAME\" ]; then
        echo '   ❌ Error: No running container found matching backend-.'
        exit 1
    fi
    echo \"   📦 Found active container: \$CONTAINER_NAME\"

    # B. Copy file into the container
    echo '   >> 📂 Copying backup into container...'
    sudo docker cp $REMOTE_TMP_DIR/$FILENAME \$CONTAINER_NAME:/opt/app/$FILENAME

    # C. Run Strapi Import
    echo '   >> 🐳 Running import inside \$CONTAINER_NAME...'
    # Using --force to bypass the confirmation prompt
    sudo docker exec \$CONTAINER_NAME npm run strapi -- import --force --file $FILENAME

    # D. Cleanup
    echo '   >> 🧹 Cleaning up container file...'
    sudo docker exec \$CONTAINER_NAME rm /opt/app/$FILENAME

    echo '   >> 🧹 Cleaning up host file...'
    sudo rm $REMOTE_TMP_DIR/$FILENAME
"

echo "✅ Restore complete!"