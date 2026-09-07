#!/usr/bin/env bash
# Ejecutar con el mismo usuario y PATH de Node/PM2 que la aplicación.
set -Eeuo pipefail
umask 077

APP_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
LOCAL_DIR="$APP_DIR/backups"
SHARE_MOUNT=/mnt/oftecnica
REMOTE_DIR="$SHARE_MOUNT/remolques-backups"
APP_NAME=remolques-tgm
restart_needed=0
local_tmp=
remote_tmp=

log() { printf '[%s] %s\n' "$(date --iso-8601=seconds)" "$*"; }
cleanup() {
  local result=$?
  trap - EXIT
  if (( restart_needed )); then
    if ! pm2 restart "$APP_NAME"; then
      log "ERROR: no se pudo reanudar $APP_NAME; revisar PM2."
      result=1
    fi
  fi
  [[ -z "$local_tmp" ]] || rm -f -- "$local_tmp"
  [[ -z "$remote_tmp" ]] || rm -f -- "$remote_tmp"
  if (( result != 0 )); then log "ERROR: copia incompleta (código $result)."; fi
  exit "$result"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

cd -- "$APP_DIR"
for tool in node pm2 tar flock mountpoint cmp; do
  command -v "$tool" >/dev/null || { log "ERROR: falta $tool en PATH."; exit 1; }
done

# Next.js admite varios .env; cargar su mismo orden, sin mostrar secretos.
node <<'NODE'
const fs = require('node:fs');
const { parseEnv } = require('node:util');
const env = { ...process.env };
for (const file of ['.env.production.local', '.env.local', '.env.production', '.env']) {
  if (!fs.existsSync(file)) continue;
  for (const [key, value] of Object.entries(parseEnv(fs.readFileSync(file, 'utf8')))) {
    if (env[key] === undefined) env[key] = value;
  }
}
if (env.DATASOURCE !== 'file') {
  console.error('Este respaldo requiere DATASOURCE=file; SQL Server necesita su propia copia.');
  process.exit(1);
}
NODE

mkdir -p -- "$LOCAL_DIR"
exec 9> "$LOCAL_DIR/.backup.lock"
flock -n 9 || { log 'OMITIDA: ya hay otra copia en curso.'; exit 0; }

shopt -s nullglob
files=(data/*.json)
if (( ${#files[@]} == 0 )); then
  log 'SIN DATOS: todavía no hay JSON guardados; no se ha creado ninguna copia.'
  exit 0
fi

# No reactivar una aplicación que ya estaba parada por mantenimiento.
status=$(pm2 jlist | node -e '
  let text = "";
  process.stdin.on("data", chunk => text += chunk);
  process.stdin.on("end", () => {
    const apps = JSON.parse(text).filter(app => app.name === "remolques-tgm");
    if (apps.length !== 1) throw new Error("Se esperaba un proceso remolques-tgm en PM2");
    if (apps[0].pm2_env.DATASOURCE && apps[0].pm2_env.DATASOURCE !== "file") {
      throw new Error("PM2 tiene DATASOURCE distinto de file");
    }
    process.stdout.write(apps[0].pm2_env.status);
  });
')
case "$status" in
  online)
    log 'Pausa breve de Remolques TGM para obtener una copia consistente.'
    restart_needed=1
    pm2 stop "$APP_NAME"
    ;;
  stopped) ;;
  *) log "ERROR: estado PM2 inesperado: $status"; exit 1 ;;
esac

# Releer tras la pausa por si se ha guardado otro fichero entre medias.
files=(data/*.json)
node - "${files[@]}" <<'NODE'
const fs = require('node:fs');
for (const file of process.argv.slice(2)) JSON.parse(fs.readFileSync(file, 'utf8'));
NODE

local_tmp=$(mktemp "$LOCAL_DIR/.remolques-tgm-XXXXXXXX.tar.gz")
tar -czf "$local_tmp" -- "${files[@]}"
tar -tzf "$local_tmp" >/dev/null

# Reanudar antes de acceder a la red. El trap también reanuda si falla la copia.
if (( restart_needed )); then
  pm2 restart "$APP_NAME"
  restart_needed=0
fi

filename="remolques-tgm-$(date -u +%Y%m%dT%H%M%S%NZ).tar.gz"
mv -- "$local_tmp" "$LOCAL_DIR/$filename"
local_tmp=
log "Copia local: $LOCAL_DIR/$filename"

# No guardar en un directorio local que sustituya accidentalmente al montaje.
mountpoint -q "$SHARE_MOUNT" || { log "ERROR: $SHARE_MOUNT no está montado; se conserva la copia local."; exit 1; }
mkdir -p -- "$REMOTE_DIR"
remote_tmp=$(mktemp "$REMOTE_DIR/.remolques-tgm-XXXXXXXX.tar.gz")
cp -- "$LOCAL_DIR/$filename" "$remote_tmp"
cmp -- "$LOCAL_DIR/$filename" "$remote_tmp"
mv -- "$remote_tmp" "$REMOTE_DIR/$filename"
remote_tmp=
log "Copia remota verificada: $REMOTE_DIR/$filename"

# Rotar solo nuestras copias completas y solo después de verificar la nueva.
find "$LOCAL_DIR" "$REMOTE_DIR" -maxdepth 1 -type f \
  -name 'remolques-tgm-*.tar.gz' -mmin +43200 -delete
log 'OK: copia terminada; retención de 30 días.'
