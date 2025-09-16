#!/bin/bash

# Brand Guard Project Restore Script
# Restores the project from a backup

BACKUP_DIR="/home/aastro/brand-guard-backups"
RESTORE_DIR="/home/aastro"

# Show available backups
echo "📦 Available backups:"
echo "====================="
ls -lt "$BACKUP_DIR"/brand-guard_backup_*.tar.gz | head -10

echo ""
echo "💡 Usage examples:"
echo "   ./restore-project.sh                    # Restore from latest backup"
echo "   ./restore-project.sh backup_file.tar.gz # Restore from specific backup"
echo ""

# Determine which backup to restore
if [ -z "$1" ]; then
    BACKUP_FILE="$BACKUP_DIR/brand-guard_latest.tar.gz"
    echo "🔄 Using latest backup: $(readlink "$BACKUP_FILE")"
else
    if [[ "$1" == *".tar.gz" ]]; then
        BACKUP_FILE="$BACKUP_DIR/$1"
    else
        BACKUP_FILE="$BACKUP_DIR/brand-guard_backup_$1.tar.gz"
    fi
    
    if [ ! -f "$BACKUP_FILE" ]; then
        echo "❌ Backup file not found: $BACKUP_FILE"
        exit 1
    fi
    
    echo "🔄 Using backup: $(basename "$BACKUP_FILE")"
fi

# Safety confirmation
echo ""
read -p "⚠️  This will overwrite the current project. Continue? (y/N): " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "❌ Restore cancelled"
    exit 0
fi

# Create timestamp for current project backup
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
CURRENT_BACKUP="/home/aastro/brand-guard-current-backup_$TIMESTAMP.tar.gz"

# Backup current project before restore
if [ -d "/home/aastro/brand-guard" ]; then
    echo "💾 Backing up current project to: $CURRENT_BACKUP"
    cd /home/aastro && tar -czf "$CURRENT_BACKUP" brand-guard/
fi

# Remove current project
rm -rf /home/aastro/brand-guard

# Extract backup
echo "📦 Restoring from backup..."
cd "$RESTORE_DIR" && tar -xzf "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Project restored successfully!"
    echo "📁 Project location: /home/aastro/brand-guard"
    echo "💾 Previous version saved as: $CURRENT_BACKUP"
    echo ""
    echo "🔧 Next steps:"
    echo "   1. cd /home/aastro/brand-guard"
    echo "   2. npm install (if needed)"
    echo "   3. npm run dev"
else
    echo "❌ Restore failed!"
    if [ -f "$CURRENT_BACKUP" ]; then
        echo "🔄 Restoring previous version..."
        cd "$RESTORE_DIR" && tar -xzf "$CURRENT_BACKUP"
    fi
    exit 1
fi