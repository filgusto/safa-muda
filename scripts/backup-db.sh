#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Safa Muda — backup do banco e das fotos
# ─────────────────────────────────────────────────────────────────────────────
# 1. Dump do Postgres (formato custom, comprimido), com retenção de KEEP_DAYS.
# 2. Espelho do bucket de fotos do Garage em $BACKUP_DIR/media.
# 3. Opcional: cópia para fora do servidor, SEMPRE criptografada.
#
# Cron recomendado (usuário do deploy, que precisa estar no grupo docker):
#   0 2 * * * /opt/safa-muda/scripts/backup-db.sh >> /var/log/safa-muda-backup.log 2>&1
#
# Cópia externa (recomendada — backup no mesmo disco não sobrevive ao disco):
#   RCLONE_REMOTE           destino, no formato do rclone (ex.: "b2:bucket/safa-muda")
#   RCLONE_CONFIG_FILE      rclone.conf com as credenciais desse destino
#                           (padrão: ~/.config/rclone/rclone.conf)
#   BACKUP_PASSPHRASE_FILE  arquivo com a senha da criptografia (chmod 600).
#                           Sem ela o script recusa enviar: o dump tem e-mails,
#                           hashes de senha e projetos privados. GUARDE A SENHA
#                           FORA DO SERVIDOR — sem ela o backup externo é inútil.
#
# LGPD: a Política de Privacidade (/privacidade, item 6) promete que o que a
# pessoa apaga sai das cópias de segurança em até 30 dias. Por isso:
#   - KEEP_DAYS padrão 30 (não aumente sem atualizar a política);
#   - o espelho das fotos usa `sync`: foto apagada sai no backup seguinte;
#   - a cópia externa também é `sync` do diretório local, então herda os dois.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
umask 077   # dumps e fotos legíveis só pelo dono

# ── Config ───────────────────────────────────────────────────────────────────
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$REPO_DIR/.env.prod"
COMPOSE_FILE="$REPO_DIR/docker-compose.prod.yml"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
FILENAME="safa_muda_${TIMESTAMP}.dump"
RCLONE_IMAGE="rclone/rclone:1.75"

# ── Helpers ───────────────────────────────────────────────────────────────────
log()  { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
fail() { log "ERROR: $*"; exit 1; }

# ── Ambiente ──────────────────────────────────────────────────────────────────
# Carregado ANTES de qualquer `docker compose`: o compose de produção exige as
# variáveis (${VAR:?}) até para um simples `ps`, e o cron não as tem.
[[ -f "$ENV_FILE" ]] || fail "$ENV_FILE não encontrado."
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

# Variáveis do .env.prod podem configurar o backup; as do ambiente do cron
# (definidas antes) não são sobrescritas por padrões abaixo.
BACKUP_DIR="${BACKUP_DIR:-/var/backups/safa-muda}"
KEEP_DAYS="${KEEP_DAYS:-30}"
RCLONE_REMOTE="${RCLONE_REMOTE:-}"
RCLONE_CONFIG_FILE="${RCLONE_CONFIG_FILE:-$HOME/.config/rclone/rclone.conf}"
BACKUP_PASSPHRASE_FILE="${BACKUP_PASSPHRASE_FILE:-}"
MEDIA_DIR="$BACKUP_DIR/media"

compose() { docker compose -f "$COMPOSE_FILE" "$@"; }

# rclone em contêiner descartável: o servidor não precisa ter rclone instalado.
# Roda com o uid de quem chama, para os arquivos não ficarem do root.
rclone_docker() {
    docker run --rm --user "$(id -u):$(id -g)" -e HOME=/tmp "$@"
}

# ── Pre-flight ────────────────────────────────────────────────────────────────
mkdir -p "$BACKUP_DIR" "$MEDIA_DIR"
chmod 700 "$BACKUP_DIR"

# `--status running -q` em vez de procurar "running" no texto: o Compose atual
# mostra "Up 3 hours (healthy)", e o grep antigo abortava sempre.
if [[ -z "$(compose ps --status running -q postgres)" ]]; then
    fail "o contêiner do postgres não está rodando."
fi

if [[ -n "$RCLONE_REMOTE" ]]; then
    [[ -n "$BACKUP_PASSPHRASE_FILE" && -s "$BACKUP_PASSPHRASE_FILE" ]] \
        || fail "RCLONE_REMOTE definido sem BACKUP_PASSPHRASE_FILE: a cópia externa precisa ser criptografada."
    [[ -f "$RCLONE_CONFIG_FILE" ]] \
        || fail "RCLONE_CONFIG_FILE ($RCLONE_CONFIG_FILE) não encontrado."
fi

# ── 1. Dump ──────────────────────────────────────────────────────────────────
log "Dump do banco → $BACKUP_DIR/$FILENAME"

# Grava em arquivo temporário e só promove se o dump terminou bem.
TMP="$BACKUP_DIR/.$FILENAME.partial"
trap 'rm -f "$TMP"' EXIT

compose exec -T postgres \
    pg_dump -U safa_muda -d safa_muda --no-password -Fc > "$TMP"

if [[ ! -s "$TMP" ]] || [[ "$(wc -c < "$TMP")" -lt 1024 ]]; then
    fail "dump vazio ou suspeito. Abortando sem podar backups antigos."
fi
mv "$TMP" "$BACKUP_DIR/$FILENAME"
log "Dump concluído — $(du -sh "$BACKUP_DIR/$FILENAME" | cut -f1)"

find "$BACKUP_DIR" -maxdepth 1 -name "safa_muda_*.dump" -mtime +"$KEEP_DAYS" -delete
log "Dumps com mais de $KEEP_DAYS dias removidos."

# ── 2. Espelho das fotos (Garage) ────────────────────────────────────────────
# `sync`, não `copy`: foto apagada no site (conta excluída, diário removido)
# também sai daqui. O preço é que o espelho não protege contra exclusão por
# engano — para isso, os dumps antigos não ajudam (não têm as fotos).
log "Espelhando o bucket safa-muda-media → $MEDIA_DIR"
rclone_docker --network safa-muda-net \
    -v "$MEDIA_DIR:/backup" \
    -e RCLONE_CONFIG_GARAGE_TYPE=s3 \
    -e RCLONE_CONFIG_GARAGE_PROVIDER=Other \
    -e RCLONE_CONFIG_GARAGE_ENDPOINT=http://garage:3900 \
    -e RCLONE_CONFIG_GARAGE_REGION=us-east-1 \
    -e RCLONE_CONFIG_GARAGE_FORCE_PATH_STYLE=true \
    -e RCLONE_CONFIG_GARAGE_ACCESS_KEY_ID="$GARAGE_APP_KEY_ID" \
    -e RCLONE_CONFIG_GARAGE_SECRET_ACCESS_KEY="$GARAGE_APP_SECRET_KEY" \
    "$RCLONE_IMAGE" \
    sync --quiet garage:safa-muda-media /backup
log "Espelho das fotos concluído."

# ── 3. Cópia externa, criptografada ──────────────────────────────────────────
# O destino é embrulhado num remote `crypt` do rclone, montado na hora:
# conteúdo e nomes de arquivo saem criptografados, e quem tem acesso ao
# provedor não lê nada. `sync` faz o destino seguir a retenção local.
#
# Restaurar (mesmas variáveis do .env.prod e a mesma senha):
#   SENHA=$(docker run --rm -i rclone/rclone:1.75 obscure - < "$BACKUP_PASSPHRASE_FILE")
#   mkdir -p /tmp/restauro
#   docker run --rm --user "$(id -u):$(id -g)" -e HOME=/tmp \
#     -v "$RCLONE_CONFIG_FILE:/tmp/rclone.conf:ro" -e RCLONE_CONFIG=/tmp/rclone.conf \
#     -v /tmp/restauro:/restauro \
#     -e RCLONE_CONFIG_OFFSITE_TYPE=crypt -e RCLONE_CONFIG_OFFSITE_REMOTE="$RCLONE_REMOTE" \
#     -e RCLONE_CONFIG_OFFSITE_PASSWORD="$SENHA" \
#     rclone/rclone:1.75 copy offsite: /restauro
if [[ -n "$RCLONE_REMOTE" ]]; then
    log "Enviando para $RCLONE_REMOTE (criptografado) …"
    SENHA_OBSCURECIDA="$(docker run --rm -i "$RCLONE_IMAGE" obscure - < "$BACKUP_PASSPHRASE_FILE")"
    rclone_docker \
        -v "$BACKUP_DIR:/backup:ro" \
        -v "$RCLONE_CONFIG_FILE:/tmp/rclone.conf:ro" \
        -e RCLONE_CONFIG=/tmp/rclone.conf \
        -e RCLONE_CONFIG_OFFSITE_TYPE=crypt \
        -e RCLONE_CONFIG_OFFSITE_REMOTE="$RCLONE_REMOTE" \
        -e RCLONE_CONFIG_OFFSITE_PASSWORD="$SENHA_OBSCURECIDA" \
        "$RCLONE_IMAGE" \
        sync /backup offsite: --exclude ".*.partial" --log-level NOTICE
    log "Cópia externa concluída."
else
    log "AVISO: RCLONE_REMOTE não definido — o backup está só neste servidor."
fi

log "Pronto."
