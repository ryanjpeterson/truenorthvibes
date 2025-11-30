#!/bin/bash

# --- Configuration ---
VPS_USER="${VPS_USER:-debian}"
VPS_HOST="${VPS_HOST:-vibes.ryanjpeterson.dev}"
REMOTE_TMP_DIR="/tmp"

if [ -z "$1" ]; then
  echo "❌ Error: Please provide the backup file path."
  echo "Usage: $0 <path-to-backup-file>"
  exit 1
fi

BACKUP_FILE="$1"

# Verify local file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Error: File not found locally: $BACKUP_FILE"
    exit 1
fi

# Generate a unique remote filename to avoid 'Permission denied' conflicts
# if a file with the same name already exists on the server owned by root.
UNIQUE_ID=$(date +%s)
REMOTE_FILENAME="restore-upload-${UNIQUE_ID}.tar.gz"

echo "⚠️  WARNING: This will OVERWRITE your PRODUCTION database at $VPS_HOST."
read -p "Are you sure? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    exit 1
fi

# --- 1. Detect Running Container ---
echo "🔍 Detecting running backend container on remote..."
# We use SSH to check which container is actually running (blue or green)
CONTAINER_NAME=$(ssh "$VPS_USER@$VPS_HOST" "sudo docker ps --format '{{.Names}}' | grep 'backend-' | head -n 1")

if [ -z "$CONTAINER_NAME" ]; then
    echo "❌ Error: No running container found matching 'backend-' on remote host."
    exit 1
fi
echo "📦 Found active container: $CONTAINER_NAME"

# --- 2. Upload Backup ---
echo "⬆️  Uploading backup to VPS as $REMOTE_FILENAME..."
# This uploads from your LOCAL machine to the REMOTE VPS
if ! scp "$BACKUP_FILE" "$VPS_USER@$VPS_HOST:$REMOTE_TMP_DIR/$REMOTE_FILENAME"; then
    echo "❌ Upload failed. Check SSH connection or permissions."
    exit 1
fi

# --- 3. Restore on Remote ---
echo "🔄 Connecting to remote to run Strapi import..."
ssh -t "$VPS_USER@$VPS_HOST" "
    set -e
    
    echo '   >> 🔧 Fixing permissions...'
    # 1. Ensure the public folder is writable by the container user
    # This PREVENTS the '[FATAL] backup folder... could not be created' error
    sudo docker exec $CONTAINER_NAME chown -R root:root /opt/app/public
    sudo docker exec $CONTAINER_NAME chmod -R 777 /opt/app/public

    echo '   >> 📂 Copying file into container...'
    sudo docker cp $REMOTE_TMP_DIR/$REMOTE_FILENAME $CONTAINER_NAME:/opt/app/$REMOTE_FILENAME
    
    echo '   >> 📦 Importing data...'
    # Run the import command inside the container
    if ! sudo docker exec $CONTAINER_NAME npm run strapi -- import --file /opt/app/$REMOTE_FILENAME --force; then
        echo '   ❌ STRAPI IMPORT FAILED'
        exit 1
    fi

    echo '   >> 🧹 Cleaning up container file...'
    sudo docker exec $CONTAINER_NAME rm /opt/app/$REMOTE_FILENAME

    echo '   >> 🧹 Cleaning up host file...'
    rm $REMOTE_TMP_DIR/$REMOTE_FILENAME
"

# Check if the SSH command above succeeded
if [ $? -eq 0 ]; then
    echo "✅ Restore complete! You may need to restart the container to see all changes."
else
    echo "❌ RESTORE FAILED. Please check the logs above."
    exit 1
fi