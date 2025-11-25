#!/bin/bash

# Usage: ./scripts/restore-local.sh ./backups/strapi-export-20231124_120000.tar.gz

if [ -z "$1" ]; then
  echo "❌ Error: Please provide the backup file path."
  echo "Usage: ./scripts/restore-local.sh <path-to-backup-file>"
  exit 1
fi

BACKUP_FILE="$1"

# Verify file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Error: File not found: $BACKUP_FILE"
    exit 1
fi

echo "⚠️  WARNING: This will OVERWRITE your local database."
read -p "Are you sure? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    exit 1
fi

echo "📦 Importing data into local Strapi..."

# If running backend locally (without Docker):
# cd backend && npm run strapi import -- --file "../$BACKUP_FILE" --force

# If running backend in Docker locally:
# We need to copy the file into the container first if not mounted, or use a mounted path.
# Assuming the root is mounted or accessible:
docker compose cp "$BACKUP_FILE" blog_backend:/opt/app/import.tar.gz
docker compose exec backend npm run strapi import -- --file /opt/app/import.tar.gz --force

echo "✅ Import complete! Restart your backend to see changes."