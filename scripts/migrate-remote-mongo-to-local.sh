#!/usr/bin/env bash
set -euo pipefail
set +x
umask 077

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
readonly DOCKER_ENV_FILE="${ROOT_DIR}/.env.docker"
readonly MIGRATION_ENV_FILE="${ROOT_DIR}/.env.migration"
readonly BACKUP_ROOT="${ROOT_DIR}/.mongo-backups"
readonly COMPOSE_FILE="${ROOT_DIR}/compose.yaml"
readonly COUNT_SCRIPT="${SCRIPT_DIR}/mongo-remote-counts.js"
readonly STALL_SECONDS=300
readonly POLL_SECONDS=30
readonly MODE="${1:-backup}"
readonly EXISTING_BACKUP_ARG="${2:-}"

ACTIVE_CONTAINER=''
SECRET_DIR=''
LAST_DUMP_LOG=''

die() {
  printf 'ERROR: %s\n' "$1" >&2
  exit 1
}

cleanup() {
  if [[ -n "${ACTIVE_CONTAINER}" ]]; then
    docker stop --time 10 "${ACTIVE_CONTAINER}" >/dev/null 2>&1 || true
  fi
  if [[ -n "${SECRET_DIR}" && -d "${SECRET_DIR}" ]]; then
    rm -rf "${SECRET_DIR}"
  fi
}
trap cleanup EXIT INT TERM HUP

require_file() {
  [[ -f "$1" ]] || die "Required file not found: $1"
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
}

directory_size_bytes() {
  local directory="$1"
  local kilobytes
  kilobytes="$(du -sk "${directory}" | awk '{print $1}')"
  printf '%s' "$((kilobytes * 1024))"
}

format_megabytes() {
  awk -v bytes="$1" 'BEGIN { printf "%.2f", bytes / 1048576 }'
}

stop_active_dump() {
  if [[ -n "${ACTIVE_CONTAINER}" ]]; then
    docker stop --time 10 "${ACTIVE_CONTAINER}" >/dev/null 2>&1 || true
  fi
}

run_monitored_dump() {
  local label="$1"
  shift
  local container_name="linkup-mongo-backup-$RANDOM-$$"
  local log_path="${SECRET_DIR}/${container_name}.log"
  local start_seconds="${SECONDS}"
  local last_change_seconds="${SECONDS}"
  local previous_size
  local current_size
  local elapsed
  local client_pid
  local exit_code

  previous_size="$(directory_size_bytes "${BACKUP_DIR}")"
  LAST_DUMP_LOG="${log_path}"
  ACTIVE_CONTAINER="${container_name}"
  docker run --rm \
    --name "${container_name}" \
    --mount "type=bind,src=${SOURCE_CONFIG},dst=/run/secrets/source.yml,readonly" \
    --mount "type=bind,src=${BACKUP_DIR},dst=/backup" \
    --entrypoint mongodump \
    "${MONGO_IMAGE}" \
    --config=/run/secrets/source.yml \
    --db="${SOURCE_MONGO_DB}" \
    --out=/backup \
    --gzip \
    --numParallelCollections=1 \
    "$@" >"${log_path}" 2>&1 &
  client_pid=$!

  while kill -0 "${client_pid}" 2>/dev/null; do
    sleep "${POLL_SECONDS}"
    current_size="$(directory_size_bytes "${BACKUP_DIR}")"
    elapsed=$((SECONDS - start_seconds))
    if [[ "${current_size}" != "${previous_size}" ]]; then
      previous_size="${current_size}"
      last_change_seconds="${SECONDS}"
    fi
    printf '%s RUNNING %s MB elapsed=%ss\n' "${label}" "$(format_megabytes "${current_size}")" "${elapsed}"
    if ! kill -0 "${client_pid}" 2>/dev/null; then
      break
    fi
    if (( SECONDS - last_change_seconds >= STALL_SECONDS )); then
      printf '%s STALLED no-output-growth=%ss\n' "${label}" "${STALL_SECONDS}"
      stop_active_dump
      wait "${client_pid}" 2>/dev/null || true
      ACTIVE_CONTAINER=''
      return 124
    fi
  done

  if wait "${client_pid}"; then
    exit_code=0
  else
    exit_code=$?
  fi
  ACTIVE_CONTAINER=''
  current_size="$(directory_size_bytes "${BACKUP_DIR}")"
  elapsed=$((SECONDS - start_seconds))
  if (( exit_code == 0 )); then
    printf '%s PASS %s MB elapsed=%ss\n' "${label}" "$(format_megabytes "${current_size}")" "${elapsed}"
    return 0
  fi
  printf '%s FAIL elapsed=%ss\n' "${label}" "${elapsed}"
  return "${exit_code}"
}

collection_complete_in_full_dump() {
  local collection="$1"
  local bson_path="${BACKUP_DIR}/${SOURCE_MONGO_DB}/${collection}.bson.gz"
  local metadata_path="${BACKUP_DIR}/${SOURCE_MONGO_DB}/${collection}.metadata.json.gz"
  [[ -s "${bson_path}" && -s "${metadata_path}" ]] || return 1
  grep -Fq "done dumping ${SOURCE_MONGO_DB}.${collection} (" "${FULL_DUMP_LOG}"
}

require_file "${DOCKER_ENV_FILE}"
require_file "${MIGRATION_ENV_FILE}"
require_file "${COMPOSE_FILE}"
require_file "${COUNT_SCRIPT}"

if [[ "${MODE}" != 'backup' && "${MODE}" != '--verify-existing' ]]; then
  die 'Usage: migrate-remote-mongo-to-local.sh [--verify-existing BACKUP_DIRECTORY]'
fi
if [[ "${MODE}" == '--verify-existing' && -z "${EXISTING_BACKUP_ARG}" ]]; then
  die '--verify-existing requires a backup directory'
fi

load_env_var "${MIGRATION_ENV_FILE}" SOURCE_MONGODB_URI
load_env_var "${MIGRATION_ENV_FILE}" SOURCE_MONGO_DB
load_env_var "${MIGRATION_ENV_FILE}" TARGET_MONGO_DB
load_env_var "${DOCKER_ENV_FILE}" MONGO_APP_USERNAME
load_env_var "${DOCKER_ENV_FILE}" MONGO_APP_PASSWORD
load_env_var "${DOCKER_ENV_FILE}" MONGO_DB

[[ -n "${SOURCE_MONGODB_URI}" ]] || die 'SOURCE_MONGODB_URI is required'
[[ "${SOURCE_MONGODB_URI}" == mongodb://* || "${SOURCE_MONGODB_URI}" == mongodb+srv://* ]] \
  || die 'SOURCE_MONGODB_URI must use mongodb:// or mongodb+srv://'
[[ "${SOURCE_MONGODB_URI}" != *$'\n'* && "${SOURCE_MONGODB_URI}" != *$'\r'* ]] \
  || die 'SOURCE_MONGODB_URI must be a single line'
[[ "${SOURCE_MONGODB_URI}" != *"'"* ]] \
  || die 'A literal apostrophe in SOURCE_MONGODB_URI must be URI-encoded'
[[ "${SOURCE_MONGO_DB}" =~ ^[A-Za-z0-9_-]+$ ]] || die 'SOURCE_MONGO_DB contains unsupported characters'
[[ "${TARGET_MONGO_DB}" =~ ^[A-Za-z0-9_-]+$ ]] || die 'TARGET_MONGO_DB contains unsupported characters'
[[ "${SOURCE_MONGO_DB}" == 'test' ]] || die 'This checkpoint is restricted to remote database test'
[[ "${TARGET_MONGO_DB}" == 'linkup_cms' ]] || die 'This checkpoint is restricted to local database linkup_cms'
[[ "${TARGET_MONGO_DB}" == "${MONGO_DB}" ]] || die 'TARGET_MONGO_DB must match MONGO_DB from .env.docker'
[[ "${MONGO_APP_USERNAME}" =~ ^[A-Za-z0-9._~-]+$ ]] || die 'Local Mongo username must be URI-safe'
[[ "${MONGO_APP_PASSWORD}" =~ ^[A-Za-z0-9._~-]+$ ]] || die 'Local Mongo password must be URI-safe'

command -v docker >/dev/null 2>&1 || die 'Docker CLI is not installed'
command -v shasum >/dev/null 2>&1 || die 'shasum is required'
docker info >/dev/null 2>&1 || die 'Docker is not running or is not accessible'

readonly -a COMPOSE=(docker compose --project-directory "${ROOT_DIR}" --env-file "${DOCKER_ENV_FILE}" -f "${COMPOSE_FILE}")
"${COMPOSE[@]}" config --quiet

MONGO_CONTAINER_ID="$("${COMPOSE[@]}" ps --quiet mongo)"
BACKEND_CONTAINER_ID="$("${COMPOSE[@]}" ps --quiet backend)"
[[ -n "${MONGO_CONTAINER_ID}" ]] || die 'Local Mongo container is not running; no local state was changed'
[[ -n "${BACKEND_CONTAINER_ID}" ]] || die 'Backend container is not running; no local state was changed'
MONGO_IMAGE="$(docker inspect --format '{{.Config.Image}}' "${MONGO_CONTAINER_ID}")"
BACKEND_IMAGE="$(docker inspect --format '{{.Config.Image}}' "${BACKEND_CONTAINER_ID}")"
[[ -n "${MONGO_IMAGE}" && -n "${BACKEND_IMAGE}" ]] || die 'Could not resolve required container images'

SECRET_DIR="$(mktemp -d "${TMPDIR:-/tmp}/linkup-mongo-backup.XXXXXX")"
chmod 700 "${SECRET_DIR}"
SOURCE_URI_FILE="${SECRET_DIR}/source.uri"
SOURCE_CONFIG="${SECRET_DIR}/source.yml"
LOCAL_CONFIG="${SECRET_DIR}/local.yml"
printf '%s' "${SOURCE_MONGODB_URI}" >"${SOURCE_URI_FILE}"
printf "uri: '%s'\n" "${SOURCE_MONGODB_URI}" >"${SOURCE_CONFIG}"
printf "uri: 'mongodb://%s:%s@mongo:27017/%s?authSource=%s'\n" \
  "${MONGO_APP_USERNAME}" "${MONGO_APP_PASSWORD}" "${TARGET_MONGO_DB}" "${TARGET_MONGO_DB}" >"${LOCAL_CONFIG}"
chmod 600 "${SOURCE_URI_FILE}" "${SOURCE_CONFIG}" "${LOCAL_CONFIG}"

mkdir -p "${BACKUP_ROOT}"
chmod 700 "${BACKUP_ROOT}"
if [[ "${MODE}" == '--verify-existing' ]]; then
  BACKUP_DIR="$(cd "$(dirname "${EXISTING_BACKUP_ARG}")" && pwd -P)/$(basename "${EXISTING_BACKUP_ARG}")"
  [[ -d "${BACKUP_DIR}" ]] || die 'Existing backup directory was not found'
  [[ "${BACKUP_DIR}" == "${BACKUP_ROOT}/remote-${SOURCE_MONGO_DB}-"* ]] \
    || die 'Existing backup must be a timestamped source-database directory under .mongo-backups'
  REMOTE_COUNTS_PATH="${BACKUP_DIR}/REMOTE_COUNTS.tsv"
  require_file "${REMOTE_COUNTS_PATH}"
  printf 'Reusing completed dump for verification: %s\n' "${BACKUP_DIR}"
else
  TIMESTAMP="$(date -u '+%Y%m%d-%H%M%S')"
  BACKUP_DIR="${BACKUP_ROOT}/remote-${SOURCE_MONGO_DB}-${TIMESTAMP}"
  mkdir "${BACKUP_DIR}"
  chmod 700 "${BACKUP_DIR}"
  REMOTE_COUNTS_PATH="${BACKUP_DIR}/REMOTE_COUNTS.tsv"

  printf 'Collecting read-only remote collection counts...\n'
  if ! docker run --rm \
    --user 0:0 \
    --env "COUNT_DB=${SOURCE_MONGO_DB}" \
    --mount "type=bind,src=${SOURCE_URI_FILE},dst=/run/secrets/source.uri,readonly" \
    --mount "type=bind,src=${COUNT_SCRIPT},dst=/app/remote-counts.js,readonly" \
    --entrypoint node \
    "${BACKEND_IMAGE}" /app/remote-counts.js >"${REMOTE_COUNTS_PATH}" 2>/dev/null; then
    die 'Remote count discovery failed; local Mongo data was not changed'
  fi
fi
[[ -s "${REMOTE_COUNTS_PATH}" ]] || die 'Remote counts manifest is empty'

COLLECTIONS=()
while IFS=$'\t' read -r collection count extra; do
  [[ -z "${extra:-}" ]] || die 'Unexpected remote count output'
  [[ "${collection}" =~ ^[A-Za-z0-9_.-]+$ ]] || die 'A remote collection name is unsafe for this migration workflow'
  [[ "${count}" =~ ^[0-9]+$ ]] || die "Invalid document count for collection ${collection}"
  COLLECTIONS+=("${collection}")
done <"${REMOTE_COUNTS_PATH}"
(( ${#COLLECTIONS[@]} > 0 )) || die 'No remote collections were discovered'

if [[ "${MODE}" == 'backup' ]]; then
  printf 'Remote connection: PASS\n'
fi
printf 'Remote database: %s\n' "${SOURCE_MONGO_DB}"
printf 'Remote collection counts:\n'
sed 's/^/  /' "${REMOTE_COUNTS_PATH}"

if [[ "${MODE}" == 'backup' ]]; then
  printf 'Starting directory-format gzip backup with one collection at a time...\n'
  FULL_DUMP_LOG="${SECRET_DIR}/full-dump.log"
  if run_monitored_dump 'database'; then
    FULL_DUMP_PASSED='true'
  else
    FULL_DUMP_PASSED='false'
    printf 'Full dump did not complete; switching to collection-level fallback.\n'
  fi
  FULL_DUMP_LOG="${LAST_DUMP_LOG}"

  if [[ "${FULL_DUMP_PASSED}" != 'true' ]]; then
    for collection in "${COLLECTIONS[@]}"; do
      if collection_complete_in_full_dump "${collection}"; then
        size="$(stat -f '%z' "${BACKUP_DIR}/${SOURCE_MONGO_DB}/${collection}.bson.gz")"
        printf '%s ALREADY_COMPLETE %s MB\n' "${collection}" "$(format_megabytes "${size}")"
        continue
      fi
      rm -f \
        "${BACKUP_DIR}/${SOURCE_MONGO_DB}/${collection}.bson.gz" \
        "${BACKUP_DIR}/${SOURCE_MONGO_DB}/${collection}.metadata.json.gz"
      run_monitored_dump "${collection}" --collection="${collection}" \
        || die "Collection backup failed or stalled: ${collection}; local Mongo data was not changed"
    done
  fi
fi

printf 'Verifying expected BSON and metadata files...\n'
for collection in "${COLLECTIONS[@]}"; do
  [[ -s "${BACKUP_DIR}/${SOURCE_MONGO_DB}/${collection}.bson.gz" ]] \
    || die "Missing or empty BSON dump for ${collection}"
  [[ -s "${BACKUP_DIR}/${SOURCE_MONGO_DB}/${collection}.metadata.json.gz" ]] \
    || die "Missing or empty metadata for ${collection}"
  gzip -t "${BACKUP_DIR}/${SOURCE_MONGO_DB}/${collection}.bson.gz" \
    || die "Unreadable BSON gzip for ${collection}"
  gzip -t "${BACKUP_DIR}/${SOURCE_MONGO_DB}/${collection}.metadata.json.gz" \
    || die "Unreadable metadata gzip for ${collection}"
  docker run --rm \
    --mount "type=bind,src=${BACKUP_DIR},dst=/backup,readonly" \
    --entrypoint sh \
    "${MONGO_IMAGE}" \
    -eu -c 'gzip -dc "$1" | bsondump --quiet --objcheck --type=debug --outFile=/dev/null' \
    sh "/backup/${SOURCE_MONGO_DB}/${collection}.bson.gz" \
    || die "MongoDB bsondump could not parse collection ${collection}"
done

READABILITY_LOG="${SECRET_DIR}/mongorestore-dry-run.log"
DB_NETWORK='linkup-crm_db'
docker network inspect "${DB_NETWORK}" >/dev/null 2>&1 || die "Expected local Docker network not found: ${DB_NETWORK}"
if ! docker run --rm \
  --network "${DB_NETWORK}" \
  --mount "type=bind,src=${LOCAL_CONFIG},dst=/run/secrets/local.yml,readonly" \
  --mount "type=bind,src=${BACKUP_DIR},dst=/backup,readonly" \
  --entrypoint mongorestore \
  "${MONGO_IMAGE}" \
  --config=/run/secrets/local.yml \
  --dir="/backup/${SOURCE_MONGO_DB}" \
  --gzip \
  --dryRun \
  --verbose=2 >"${READABILITY_LOG}" 2>&1; then
  die 'Backup readability dry-run failed; local Mongo data was not changed'
fi
for collection in "${COLLECTIONS[@]}"; do
  if ! grep -Fq "${collection}" "${READABILITY_LOG}"; then
    printf 'Dry-run log bytes: %s\n' "$(wc -c <"${READABILITY_LOG}" | tr -d ' ')" >&2
    printf 'Safe namespaces observed in dry-run log:\n' >&2
    grep -Eo '(test|linkup_cms)\.[A-Za-z0-9_.-]+' "${READABILITY_LOG}" | LC_ALL=C sort -u >&2 || true
    die "Dry-run did not enumerate collection ${collection}"
  fi
done

CHECKSUM_PATH="${BACKUP_DIR}/SHA256SUMS"
(
  cd "${BACKUP_DIR}"
  find . -type f ! -name SHA256SUMS -print | LC_ALL=C sort | while IFS= read -r file; do
    shasum -a 256 "${file}"
  done >SHA256SUMS
  shasum -a 256 -c SHA256SUMS >/dev/null
)
[[ -s "${CHECKSUM_PATH}" ]] || die 'SHA-256 manifest was not created'

BACKUP_SIZE_BYTES="$(directory_size_bytes "${BACKUP_DIR}")"
TOTAL_DOCUMENTS="$(awk -F '\t' '{ total += $2 } END { print total + 0 }' "${REMOTE_COUNTS_PATH}")"
printf '\nRemote backup verification: PASS\n'
printf 'Remote database: %s\n' "${SOURCE_MONGO_DB}"
printf 'Target local database: %s\n' "${TARGET_MONGO_DB}"
printf 'Collections backed up: %s\n' "${#COLLECTIONS[@]}"
printf 'Remote documents: %s\n' "${TOTAL_DOCUMENTS}"
printf 'Remote document counts:\n'
sed 's/^/  /' "${REMOTE_COUNTS_PATH}"
printf 'Backup directory: %s\n' "${BACKUP_DIR}"
printf 'Backup total size: %s bytes (%s MB)\n' "${BACKUP_SIZE_BYTES}" "$(format_megabytes "${BACKUP_SIZE_BYTES}")"
printf 'SHA-256 manifest: PASS (%s)\n' "${CHECKSUM_PATH}"
printf 'Backup readability: PASS\n'
printf 'Local Mongo data changed: NO\n'
printf '\nWARNING:\n'
printf 'The next step permanently deletes the LOCAL Docker Mongo volume linkup-crm_mongo_data.\n'
printf 'Remote MongoDB will not be modified.\n'
printf 'Type exactly: DELETE LOCAL MONGO\n'
