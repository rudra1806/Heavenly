#!/bin/bash

if [ -z "$1" ]; then
    echo "❌ Error: Please provide backup directory"
    echo "Usage: ./scripts/restore-data.sh <backup-directory>"
    echo ""
    echo "Available backups:"
    ls -1 ./backups/ 2>/dev/null || echo "  No backups found"
    exit 1
fi

BACKUP_DIR="$1"

if [ ! -d "$BACKUP_DIR/mongodb" ]; then
    echo "❌ Error: Backup directory not found: $BACKUP_DIR/mongodb"
    exit 1
fi

echo "🔄 Restoring MongoDB data from $BACKUP_DIR..."

# Copy backup to container
docker cp "$BACKUP_DIR/mongodb" heavenly-mongodb:/tmp/backup

# Restore all databases
docker exec heavenly-mongodb mongorestore --drop /tmp/backup

# Clean up
docker exec heavenly-mongodb rm -rf /tmp/backup

echo "✅ Data restored successfully!"
