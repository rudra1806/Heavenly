#!/bin/bash

# Backup MongoDB data
echo "🔄 Backing up MongoDB data..."

BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup all databases
docker exec heavenly-mongodb mongodump --out=/tmp/backup

# Copy backup from container to host
docker cp heavenly-mongodb:/tmp/backup "$BACKUP_DIR/mongodb"

# Clean up container backup
docker exec heavenly-mongodb rm -rf /tmp/backup

echo "✅ Backup completed: $BACKUP_DIR"
echo ""
echo "To restore this backup later, run:"
echo "  ./scripts/restore-data.sh $BACKUP_DIR"
