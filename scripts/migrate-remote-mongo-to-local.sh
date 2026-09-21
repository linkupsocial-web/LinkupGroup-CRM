#!/usr/bin/env bash
set -euo pipefail
set +x
umask 077

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
readonly DOCKER_ENV_FILE="${ROOT_DIR}/.env.docker"
readonly MIGRATION_ENV_FILE="${ROOT_DIR}/.env.migration"
readonly BACKUP_DIR="${ROOT_DIR}/.mongo-backups"
readonly COMPOSE_FILE="${ROOT_DIR}/compose.yaml"
readonly BACKUP_ONLY="${1:-}"
readonly -a COMPOSE=(docker compose --project-directory "${ROOT_DIR}" --env-file "${DOCKER_ENV_FILE}" -f "${COMPOSE_FILE}")

die() {
  printf 'ERROR: %s\n' "$1" >&2
  exit 1
}

require_file() {
  [[ -f "$1" ]] || die "Required file not found: $1"
}

require_var() {
  local name="$1"
  [[ -n "${!name:-}" ]] || die "${name} is required"
}

load_env_var() {
  local file="$1"
  local name="$2"
  local line=''
  local value=''
  local found='false'
  local value_length

  while IFS= read -r line || [[ -n "${line}" ]]; do
    line="${line%$'\r'}"
    if [[ "${line}" =~ ^[[:space:]]*(export[[:space:]]+)?${name}[[:space:]]*=(.*)$ ]]; then
      value="${BASH_REMATCH[2]}"
      found='true'
    fi
  done <"${file}"

  [[ "${found}" == 'true' ]] || die "${name} is missing from ${file}"

  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  value_length="${#value}"
  if (( value_length >= 2 )); then
    if [[ "${value:0:1}" == '"' && "${value:value_length-1:1}" == '"' ]]; then
      value="${value:1:value_length-2}"
    elif [[ "${value:0:1}" == "'" && "${value:value_length-1:1}" == "'" ]]; then
      value="${value:1:value_length-2}"
    fi
  fi

  printf -v "${name}" '%s' "${value}"
  export "${name}"
}

wait_for_health() {
  local service="$1"
  local timeout_seconds="${2:-180}"
  local deadline=$((SECONDS + timeout_seconds))
  local container_id=''
  local health=''

  while (( SECONDS < deadline )); do
    container_id="$("${COMPOSE[@]}" ps --quiet "${service}" 2>/dev/null || true)"
    if [[ -n "${container_id}" ]]; then
      health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "${container_id}" 2>/dev/null || true)"
      if [[ "${health}" == 'healthy' ]]; then
        printf '%s is healthy.\n' "${service}"
        return 0
      fi
      if [[ "${health}" == 'unhealthy' || "${health}" == 'exited' || "${health}" == 'dead' ]]; then
        die "${service} entered state: ${health}"
      fi
    fi
    sleep 2
  done

  die "Timed out waiting for ${service} to become healthy"
}

resolve_local_volume() {
  local volume_names
  local volume_count
  local labels

  volume_names="$(docker volume ls \
    --filter "label=com.docker.compose.project=${COMPOSE_PROJECT}" \
    --filter 'label=com.docker.compose.volume=mongo_data' \
    --format '{{.Name}}')"
  volume_count="$(printf '%s\n' "${volume_names}" | sed '/^$/d' | wc -l | tr -d ' ')"
  [[ "${volume_count}" == '1' ]] || die "Expected exactly one labeled local mongo_data volume; found ${volume_count}"

  LOCAL_MONGO_VOLUME="$(printf '%s\n' "${volume_names}" | sed -n '1p')"
  labels="$(docker volume inspect --format '{{index .Labels "com.docker.compose.project"}}|{{index .Labels "com.docker.compose.volume"}}' "${LOCAL_MONGO_VOLUME}")"
  [[ "${labels}" == "${COMPOSE_PROJECT}|mongo_data" ]] || die 'Local Mongo volume labels do not match this Compose project'
  export LOCAL_MONGO_VOLUME
}

run_remote_counts() {
  local destination="$1"

  if ! docker run --rm \
    --env SOURCE_MONGODB_URI \
    --env COUNT_DB="${SOURCE_MONGO_DB}" \
    --env COUNT_JS \
    --entrypoint sh \
    "${MONGO_IMAGE}" \
    -eu -c 'exec mongosh --quiet "$SOURCE_MONGODB_URI" --eval "$COUNT_JS"' \
    >"${destination}" 2>/dev/null; then
    rm -f "${destination}"
    die 'Remote MongoDB ping/count operation failed; verify the read-only URI and source database'
  fi
}

run_local_counts() {
  local destination="$1"

  docker run --rm \
    --network "${DB_NETWORK}" \
    --env MONGO_APP_USERNAME \
    --env MONGO_APP_PASSWORD \
    --env COUNT_DB="${TARGET_MONGO_DB}" \
    --env COUNT_JS \
    --entrypoint sh \
    "${MONGO_IMAGE}" \
    -eu -c 'exec mongosh --quiet --host mongo --port 27017 --username "$MONGO_APP_USERNAME" --password "$MONGO_APP_PASSWORD" --authenticationDatabase "$COUNT_DB" "$COUNT_DB" --eval "$COUNT_JS"' \
    >"${destination}"
}

run_restore() {
  local mode="$1"

  docker run --rm \
    --network "${DB_NETWORK}" \
    --env MONGO_APP_USERNAME \
    --env MONGO_APP_PASSWORD \
    --env SOURCE_MONGO_DB \
    --env TARGET_MONGO_DB \
    --env ARCHIVE_BASENAME \
    --env RESTORE_MODE="${mode}" \
    --volume "${BACKUP_DIR}:/backup:ro" \
    --entrypoint sh \
    "${MONGO_IMAGE}" \
    -eu -c '
      set -- mongorestore
      set -- "$@" --quiet
      set -- "$@" --host mongo --port 27017
      set -- "$@" --username "$MONGO_APP_USERNAME" --password "$MONGO_APP_PASSWORD"
      set -- "$@" --authenticationDatabase "$TARGET_MONGO_DB"
      set -- "$@" --archive="/backup/$ARCHIVE_BASENAME" --gzip
      set -- "$@" --nsInclude="$SOURCE_MONGO_DB.*"
      if [ "$SOURCE_MONGO_DB" != "$TARGET_MONGO_DB" ]; then
        set -- "$@" --nsFrom="$SOURCE_MONGO_DB.*" --nsTo="$TARGET_MONGO_DB.*"
      fi
      if [ "$RESTORE_MODE" = "dry-run" ]; then
        set -- "$@" --dryRun
      fi
      exec "$@"
    '
}

if [[ -n "${BACKUP_ONLY}" && "${BACKUP_ONLY}" != '--backup-only' ]]; then
  die 'Supported optional argument: --backup-only'
fi

require_file "${DOCKER_ENV_FILE}"
require_file "${MIGRATION_ENV_FILE}"
require_file "${COMPOSE_FILE}"

load_env_var "${MIGRATION_ENV_FILE}" SOURCE_MONGODB_URI
load_env_var "${MIGRATION_ENV_FILE}" SOURCE_MONGO_DB
load_env_var "${MIGRATION_ENV_FILE}" TARGET_MONGO_DB
load_env_var "${DOCKER_ENV_FILE}" MONGO_APP_USERNAME
load_env_var "${DOCKER_ENV_FILE}" MONGO_APP_PASSWORD
load_env_var "${DOCKER_ENV_FILE}" MONGO_DB

require_var SOURCE_MONGODB_URI
require_var SOURCE_MONGO_DB
require_var TARGET_MONGO_DB
require_var MONGO_APP_USERNAME
require_var MONGO_APP_PASSWORD
require_var MONGO_DB

[[ "${SOURCE_MONGODB_URI}" == mongodb://* || "${SOURCE_MONGODB_URI}" == mongodb+srv://* ]] \
  || die 'SOURCE_MONGODB_URI must use mongodb:// or mongodb+srv://'
[[ "${SOURCE_MONGO_DB}" =~ ^[A-Za-z0-9_-]+$ ]] || die 'SOURCE_MONGO_DB contains unsupported characters'
[[ "${TARGET_MONGO_DB}" =~ ^[A-Za-z0-9_-]+$ ]] || die 'TARGET_MONGO_DB contains unsupported characters'
[[ "${TARGET_MONGO_DB}" == "${MONGO_DB}" ]] \
  || die 'TARGET_MONGO_DB must match MONGO_DB from .env.docker'

command -v docker >/dev/null 2>&1 || die 'Docker CLI is not installed'
command -v shasum >/dev/null 2>&1 || die 'shasum is required'
docker info >/dev/null 2>&1 || die 'Docker is not running or is not accessible'
"${COMPOSE[@]}" config --quiet

COMPOSE_PROJECT="$(sed -n -E 's/^name:[[:space:]]*([^[:space:]#]+).*/\1/p' "${COMPOSE_FILE}" | sed -n '1p')"
[[ -n "${COMPOSE_PROJECT}" ]] || die 'compose.yaml must define a fixed project name'
DB_NETWORK="${COMPOSE_PROJECT}_db"
export COMPOSE_PROJECT DB_NETWORK SOURCE_MONGO_DB TARGET_MONGO_DB

"${COMPOSE[@]}" up -d mongo >/dev/null
wait_for_health mongo

MONGO_CONTAINER_ID="$("${COMPOSE[@]}" ps --quiet mongo)"
MONGO_IMAGE="$(docker inspect --format '{{.Config.Image}}' "${MONGO_CONTAINER_ID}")"
[[ -n "${MONGO_IMAGE}" ]] || die 'Could not resolve the Mongo image'
docker network inspect "${DB_NETWORK}" >/dev/null 2>&1 || die "Expected database network not found: ${DB_NETWORK}"
resolve_local_volume

docker run --rm --entrypoint sh "${MONGO_IMAGE}" -eu -c \
  'command -v mongosh >/dev/null; command -v mongodump >/dev/null; command -v mongorestore >/dev/null; mongorestore --help | grep -q -- --dryRun'

mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}"

COUNT_JS='const sourceDb = db.getSiblingDB(process.env.COUNT_DB); const ping = sourceDb.runCommand({ ping: 1 }); if (ping.ok !== 1) throw new Error("Mongo ping failed"); const names = sourceDb.getCollectionNames().filter((name) => !name.startsWith("system.")).sort(); for (const name of names) print(name + "\t" + sourceDb.getCollection(name).countDocuments({}));'
export COUNT_JS

TIMESTAMP="$(date -u '+%Y%m%d-%H%M%S')"
SAFE_SOURCE_DB="$(printf '%s' "${SOURCE_MONGO_DB}" | tr -cd 'A-Za-z0-9_-')"
ARCHIVE_BASENAME="remote-${SAFE_SOURCE_DB}-${TIMESTAMP}.archive.gz"
ARCHIVE_PATH="${BACKUP_DIR}/${ARCHIVE_BASENAME}"
REMOTE_COUNTS_PATH="${BACKUP_DIR}/${ARCHIVE_BASENAME}.remote-counts.tsv"
LOCAL_COUNTS_PATH="${BACKUP_DIR}/${ARCHIVE_BASENAME}.local-counts.tsv"
CHECKSUM_PATH="${ARCHIVE_PATH}.sha256"
export ARCHIVE_BASENAME

printf 'Testing read-only remote connection and collecting counts...\n'
run_remote_counts "${REMOTE_COUNTS_PATH}"
[[ -s "${REMOTE_COUNTS_PATH}" ]] || die 'Remote database has no discoverable application collections'
printf 'Remote connection: PASS\n'
printf 'Remote collection counts:\n'
sed 's/^/  /' "${REMOTE_COUNTS_PATH}"

printf 'Creating compressed remote database archive...\n'
if ! docker run --rm \
  --env SOURCE_MONGODB_URI \
  --env SOURCE_MONGO_DB \
  --env ARCHIVE_BASENAME \
  --volume "${BACKUP_DIR}:/backup" \
  --entrypoint sh \
  "${MONGO_IMAGE}" \
  -eu -c 'exec mongodump --quiet --uri="$SOURCE_MONGODB_URI" --db="$SOURCE_MONGO_DB" --archive="/backup/$ARCHIVE_BASENAME" --gzip' \
  2>/dev/null; then
  rm -f "${ARCHIVE_PATH}"
  die 'Remote mongodump failed; local Mongo data was not changed'
fi

[[ -f "${ARCHIVE_PATH}" ]] || die 'Backup archive was not created'
ARCHIVE_SIZE_BYTES="$(wc -c <"${ARCHIVE_PATH}" | tr -d ' ')"
[[ "${ARCHIVE_SIZE_BYTES}" =~ ^[0-9]+$ && "${ARCHIVE_SIZE_BYTES}" -gt 0 ]] || die 'Backup archive is empty'

(
  cd "${BACKUP_DIR}"
  shasum -a 256 "${ARCHIVE_BASENAME}" >"${ARCHIVE_BASENAME}.sha256"
  shasum -a 256 -c "${ARCHIVE_BASENAME}.sha256" >/dev/null
)
ARCHIVE_SHA256="$(awk '{print $1}' "${CHECKSUM_PATH}")"

printf 'Validating that mongorestore can read the archive without writing data...\n'
run_restore dry-run >/dev/null

printf 'Backup verification: PASS\n'
printf 'Backup file: %s\n' "${ARCHIVE_BASENAME}"
printf 'Backup size: %s bytes\n' "${ARCHIVE_SIZE_BYTES}"
printf 'Backup SHA-256: %s\n' "${ARCHIVE_SHA256}"
printf 'Exact local Mongo volume: %s\n' "${LOCAL_MONGO_VOLUME}"

if [[ "${BACKUP_ONLY}" == '--backup-only' ]]; then
  printf 'Backup-only mode complete. Local Mongo data was not changed.\n'
  exit 0
fi

printf '\nWARNING:\n'
printf 'This will permanently delete the LOCAL Docker MongoDB volume: %s\n' "${LOCAL_MONGO_VOLUME}"
printf 'The REMOTE MongoDB will NOT be modified.\n'
printf 'Type DELETE LOCAL MONGO to continue: '
if [[ ! -t 0 ]]; then
  printf '\n'
  die 'Destructive phase requires an interactive terminal'
fi
read -r confirmation
[[ "${confirmation}" == 'DELETE LOCAL MONGO' ]] || die 'Confirmation phrase did not match; local data was not deleted'

printf 'Stopping only the %s Compose project...\n' "${COMPOSE_PROJECT}"
"${COMPOSE[@]}" down

labels="$(docker volume inspect --format '{{index .Labels "com.docker.compose.project"}}|{{index .Labels "com.docker.compose.volume"}}' "${LOCAL_MONGO_VOLUME}")"
[[ "${labels}" == "${COMPOSE_PROJECT}|mongo_data" ]] || die 'Refusing to delete a volume whose labels no longer match'
printf 'Deleting confirmed local volume: %s\n' "${LOCAL_MONGO_VOLUME}"
docker volume rm "${LOCAL_MONGO_VOLUME}" >/dev/null

printf 'Creating a fresh local Mongo volume and accounts...\n'
"${COMPOSE[@]}" up -d mongo >/dev/null
wait_for_health mongo
MONGO_CONTAINER_ID="$("${COMPOSE[@]}" ps --quiet mongo)"
DB_NETWORK="${COMPOSE_PROJECT}_db"
export DB_NETWORK

printf 'Restoring remote application data into local %s...\n' "${TARGET_MONGO_DB}"
run_restore restore

run_local_counts "${LOCAL_COUNTS_PATH}"
printf 'Local restored collection counts:\n'
sed 's/^/  /' "${LOCAL_COUNTS_PATH}"
if ! diff -u "${REMOTE_COUNTS_PATH}" "${LOCAL_COUNTS_PATH}"; then
  die 'Remote and local document counts differ; backup remains available for diagnosis'
fi
printf 'Remote/local count comparison: PASS\n'

printf 'Starting the complete local application...\n'
"${COMPOSE[@]}" up -d
wait_for_health mongo
wait_for_health backend
wait_for_health frontend
wait_for_health nginx

curl --fail --silent --show-error --output /dev/null http://localhost:8080/api/health
curl --fail --silent --show-error --output /dev/null http://localhost:8080/api/companies
(cd "${ROOT_DIR}" && bash scripts/docker-smoke-test.sh)

printf 'Migration completed successfully.\n'
printf 'Backup retained at: %s\n' "${ARCHIVE_PATH}"
printf 'Do not run the seed command against restored server data.\n'
