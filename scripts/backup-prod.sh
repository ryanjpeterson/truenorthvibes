#!/bin/bash

# Configuration
# Use the environment variable VPS_USER if set, otherwise default to "debian"
VPS_USER="${VPS_USER}"   
VPS_HOST="${VPS_HOST}"          # Change to your VPS IP or hostname (e.g., vibes.ryanjpeterson.dev or IP)
REMOTE_DIR="~/truenorthvibes"    # Path to your project on VPS
LOCAL_BACKUP_DIR="./backups"     # Local folder to save backups

# Ensure local backup dir exists
mkdir -p "$LOCAL_BACKUP_DIR"

# Timestamp for unique filename
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILENAME="strapi-export-$TIMESTAMP.tar.gz"

echo "🚀 Starting production backup..."

# 1. Run Export on VPS (inside Docker)
echo "📦 Exporting data on VPS..."
ssh $VPS_USER@$VPS_HOST "cd $REMOTE_DIR && sudo docker compose exec -T backend npm run strapi export -- --no-encrypt --file $BACKUP_FILENAME"

# 2. Download the file
echo "⬇️ Downloading backup to $LOCAL_BACKUP_DIR..."
scp $VPS_USER@$VPS_HOST:$REMOTE_DIR/$BACKUP_FILENAME "$LOCAL_BACKUP_DIR/$BACKUP_FILENAME"

# 3. Cleanup on VPS (Optional but recommended)
echo "🧹 Cleaning up remote backup file..."
ssh $VPS_USER@$VPS_HOST "rm $REMOTE_DIR/$BACKUP_FILENAME"

echo "✅ Backup complete! Saved to: $LOCAL_BACKUP_DIR/$BACKUP_FILENAME"