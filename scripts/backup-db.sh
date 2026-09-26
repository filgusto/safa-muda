#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Safa Muda — PostgreSQL Backup Script
# ─────────────────────────────────────────────────────────────────────────────
# Dumps the app database from the running postgres container,
# compresses it, and retains the last KEEP_DAYS days of backups.
#
# Recommended cron (run as the deploy user, from the repo root):
#   0 2 * * * /opt/safa-muda/scripts/backup-db.sh >> /var/log/safa-muda-backup.log 2>&1
#
# Optional offsite sync (requires rclone configured):
#   Set RCLONE_REMOTE below (e.g. "b2:my-bucket/app-backups")
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Config ───────────────────────────────────────────────────────────────────
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/safa-muda}"
KEEP_DAYS="${KEEP_DAYS:-30}"
RCLONE_REMOTE="${RCLONE_REMOTE:-}"          # Leave empty to skip offsite sync
COMPOSE_FILE="$REPO_DIR/docker-compose.prod.yml"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
FILENAME="safa_muda_${TIMESTAMP}.dump"

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

# Formato custom (-Fc): já comprimido e restaurável com pg_restore.
# Grava em arquivo temporário e só promove se o dump terminou bem.
TMP="$BACKUP_DIR/.$FILENAME.partial"
trap 'rm -f "$TMP"' EXIT

docker compose -f "$COMPOSE_FILE" exec -T postgres \
    pg_dump -U safa_muda -d safa_muda --no-password -Fc > "$TMP"

if [[ ! -s "$TMP" ]] || [[ "$(wc -c < "$TMP")" -lt 1024 ]]; then
    log "ERROR: dump vazio ou suspeito. Abortando sem podar backups antigos."
    exit 1
fi
mv "$TMP" "$BACKUP_DIR/$FILENAME"

SIZE=$(du -sh "$BACKUP_DIR/$FILENAME" | cut -f1)
log "Backup complete — size: $SIZE"

# ── Retention: delete backups older than KEEP_DAYS ───────────────────────────
find "$BACKUP_DIR" -name "safa_muda_*.dump" -mtime +"$KEEP_DAYS" -delete
log "Pruned backups older than $KEEP_DAYS days"

# ── Espelho das fotos (MinIO) ────────────────────────────────────────────────
# As fotos vivem só no volume do MinIO: copie o bucket para o mesmo diretório.
# O `mc mirror` roda num contêiner descartável, na rede do compose.
MEDIA_DIR="$BACKUP_DIR/media"
mkdir -p "$MEDIA_DIR"
log "Espelhando o bucket safa-muda-media → $MEDIA_DIR"
set -a; source "$REPO_DIR/.env.prod"; set +a
docker run --rm --network safa-muda-net \
    -v "$MEDIA_DIR:/backup" \
    -e MC_HOST_minio="http://${MINIO_ROOT_USER}:${MINIO_ROOT_PASSWORD}@minio:9000" \
    --entrypoint mc minio/minio:latest \
    mirror --overwrite --quiet minio/safa-muda-media /backup
log "Espelho das fotos concluído"

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
