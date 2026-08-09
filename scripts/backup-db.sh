#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# App — PostgreSQL Backup Script
# ─────────────────────────────────────────────────────────────────────────────
# Dumps the app database from the running postgres container,
# compresses it, and retains the last KEEP_DAYS days of backups.
#
# Recommended cron (run as the deploy user, from the repo root):
#   0 2 * * * /opt/app/scripts/backup-db.sh >> /var/log/app-backup.log 2>&1
#
# Optional offsite sync (requires rclone configured):
#   Set RCLONE_REMOTE below (e.g. "b2:my-bucket/app-backups")
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Config ───────────────────────────────────────────────────────────────────
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/app}"
KEEP_DAYS="${KEEP_DAYS:-30}"
RCLONE_REMOTE="${RCLONE_REMOTE:-}"          # Leave empty to skip offsite sync
COMPOSE_FILE="$REPO_DIR/docker-compose.prod.yml"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
FILENAME="app_${TIMESTAMP}.sql.gz"

# ── Helpers ───────────────────────────────────────────────────────────────────
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

# ── Pre-flight ────────────────────────────────────────────────────────────────
mkdir -p "$BACKUP_DIR"

if ! docker compose -f "$COMPOSE_FILE" ps postgres | grep -q "running"; then
    log "ERROR: postgres container is not running. Aborting."
    exit 1
fi

# ── Dump ─────────────────────────────────────────────────────────────────────
log "Starting backup → $BACKUP_DIR/$FILENAME"

docker compose -f "$COMPOSE_FILE" exec -T postgres \
    pg_dump -U app -d app --no-password \
    | gzip > "$BACKUP_DIR/$FILENAME"

SIZE=$(du -sh "$BACKUP_DIR/$FILENAME" | cut -f1)
log "Backup complete — size: $SIZE"

# ── Retention: delete backups older than KEEP_DAYS ───────────────────────────
find "$BACKUP_DIR" -name "app_*.sql.gz" -mtime +"$KEEP_DAYS" -delete
log "Pruned backups older than $KEEP_DAYS days"

# ── Optional offsite sync via rclone ─────────────────────────────────────────
if [[ -n "$RCLONE_REMOTE" ]]; then
    if command -v rclone &>/dev/null; then
        log "Syncing to $RCLONE_REMOTE …"
        rclone sync "$BACKUP_DIR" "$RCLONE_REMOTE" \
            --min-age 0 \
            --log-level INFO
        log "Offsite sync complete"
    else
        log "WARNING: RCLONE_REMOTE is set but rclone is not installed. Skipping."
    fi
fi

log "Done."
