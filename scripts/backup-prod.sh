#!/bin/bash

# --- Configuration ---
VPS_USER="${VPS_USER:-debian}"
VPS_HOST="${VPS_HOST:-vibes.ryanjpeterson.dev}"
CONTAINER_NAME="blog_backend"

# Directories
LOCAL_BACKUP_DIR="./backups"
REMOTE_TMP_DIR="/tmp"

# Ensure local backup directory exists
mkdir -p "$LOCAL_BACKUP_DIR"

# --- Filename Handling ---
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
# 1. The name we pass to Strapi (NO extension, Strapi adds .tar.gz automatically)
EXPORT_BASENAME="strapi-export-$TIMESTAMP"
# 2. The actual filename we look for and copy (WITH extension)
EXPORT_FILENAME="${EXPORT_BASENAME}.tar.gz"

echo "🚀 Starting production backup..."
echo "📍 Target: $VPS_USER@$VPS_HOST"
echo "📦 Container: $CONTAINER_NAME"
echo "📄 Export Name: $EXPORT_FILENAME"

# 1. SSH into Server to Generate Export
echo "🔄 Connecting to remote to run Strapi export..."
ssh -t "$VPS_USER@$VPS_HOST" "
    # Stop script on first error
    set -e 

    echo '   >> 🐳 Running export inside container...'
    # Pass the BASENAME (no extension) to the --file argument
    sudo docker exec $CONTAINER_NAME npm run strapi -- export --no-encrypt --file $EXPORT_BASENAME

    echo '   >> 🔍 Verifying file creation...'
    # Check for the file with the extension added
    if ! sudo docker exec $CONTAINER_NAME test -f /opt/app/$EXPORT_FILENAME; then
        echo '❌ Error: Export file not found in container!'
        echo '   >> 📂 Listing files in /opt/app for debugging:'
        sudo docker exec $CONTAINER_NAME ls -la /opt/app
        exit 1
    fi

    echo '   >> 📂 Copying file from container to host...'
    sudo docker cp $CONTAINER_NAME:/opt/app/$EXPORT_FILENAME $REMOTE_TMP_DIR/$EXPORT_FILENAME

    echo '   >> 🧹 Cleaning up inside container...'
    sudo docker exec $CONTAINER_NAME rm /opt/app/$EXPORT_FILENAME
"

# Check if SSH command succeeded
if [ $? -ne 0 ]; then
    echo "❌ Remote backup process failed. Aborting download."
    exit 1
fi

# 2. Download the file from VPS Host to Local
echo "⬇️  Downloading backup to $LOCAL_BACKUP_DIR..."
scp "$VPS_USER@$VPS_HOST:$REMOTE_TMP_DIR/$EXPORT_FILENAME" "$LOCAL_BACKUP_DIR/$EXPORT_FILENAME"

# 3. Cleanup on VPS Host
echo "🧹 Cleaning up temporary file on remote host..."
ssh -t "$VPS_USER@$VPS_HOST" "rm $REMOTE_TMP_DIR/$EXPORT_FILENAME"

echo "✅ Backup complete!"
echo "📄 Saved to: $LOCAL_BACKUP_DIR/$EXPORT_FILENAME"