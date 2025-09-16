#!/bin/bash

# Brand Guard Project Backup Script
# Backs up the entire project with timestamp

PROJECT_DIR="/home/aastro/brand-guard"
BACKUP_DIR="/home/aastro/brand-guard-backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="brand-guard_backup_$TIMESTAMP"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Log file for backup operations
LOG_FILE="$BACKUP_DIR/backup.log"

echo "=== Brand Guard Backup Started at $(date) ===" >> "$LOG_FILE"

# Create the backup archive (exclude node_modules and other large directories)
cd "$(dirname "$PROJECT_DIR")" || exit 1

tar -czf "$BACKUP_DIR/$BACKUP_NAME.tar.gz" \
    --exclude="node_modules" \
    --exclude=".next" \
    --exclude="*.log" \
    --exclude="*.tmp" \
    --exclude=".git/objects" \
    --exclude="dist" \
    --exclude="build" \
    "$(basename "$PROJECT_DIR")" 2>> "$LOG_FILE"

if [ $? -eq 0 ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_NAME.tar.gz" | cut -f1)
    echo "✅ Backup successful: $BACKUP_NAME.tar.gz ($BACKUP_SIZE)" >> "$LOG_FILE"
    echo "✅ Backup created: $BACKUP_NAME.tar.gz ($BACKUP_SIZE)"
    
    # Keep only the last 24 backups (24 hours worth)
    cd "$BACKUP_DIR" && ls -t brand-guard_backup_*.tar.gz | tail -n +25 | xargs rm -f 2>/dev/null
    
    # Also create a "latest" symbolic link
    ln -sf "$BACKUP_NAME.tar.gz" "$BACKUP_DIR/brand-guard_latest.tar.gz"
    
else
    echo "❌ Backup failed at $(date)" >> "$LOG_FILE"
    echo "❌ Backup failed - check $LOG_FILE for details"
    exit 1
fi

echo "=== Brand Guard Backup Completed at $(date) ===" >> "$LOG_FILE"
echo ""

# Show backup status
echo "📁 Backup location: $BACKUP_DIR/$BACKUP_NAME.tar.gz"
echo "📊 Available backups:"
ls -lh "$BACKUP_DIR"/brand-guard_backup_*.tar.gz | tail -5