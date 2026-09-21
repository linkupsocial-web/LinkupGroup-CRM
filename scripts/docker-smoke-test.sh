#!/usr/bin/env bash
set -euo pipefail

readonly COMPOSE=(docker compose --env-file .env.docker)
readonly BASE_URL="${BASE_URL:-http://localhost:8080}"
TEMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TEMP_DIR}"' EXIT

pass() {
  printf 'PASS: %s\n' "$1"
}

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

assert_http() {
  local label="$1"
  local path="$2"
  local expected="$3"
  local code

  code="$(curl --silent --show-error --output "${TEMP_DIR}/response" --write-out '%{http_code}' "${BASE_URL}${path}")"
  [[ "${code}" == "${expected}" ]] || fail "${label} returned HTTP ${code}; expected ${expected}"
  pass "${label} returned HTTP ${expected}"
}

assert_healthy() {
  local service="$1"
  local container_id
  local status

  container_id="$(${COMPOSE[@]} ps --quiet "${service}")"
  [[ -n "${container_id}" ]] || fail "${service} container is not running"
  status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' "${container_id}")"
  [[ "${status}" == "healthy" ]] || fail "${service} health is ${status}"
  pass "${service} is healthy"
}

assert_not_published() {
  local service="$1"
  local container_port="$2"
  local container_id
  local binding

  container_id="$(${COMPOSE[@]} ps --quiet "${service}")"
  binding="$(docker inspect --format "{{with index .NetworkSettings.Ports \"${container_port}/tcp\"}}{{json .}}{{end}}" "${container_id}")"
  [[ -z "${binding}" || "${binding}" == "null" ]] || fail "${service}:${container_port} is published on the host"
  pass "${service}:${container_port} is not host-published"
}

assert_http "Nginx health" "/healthz" "200"
assert_http "Backend health through Nginx" "/api/health" "200"
assert_http "Frontend admin login" "/admin/login" "200"
assert_http "Companies API through Nginx" "/api/companies" "200"

for service in mongo backend frontend nginx; do
  assert_healthy "${service}"
done

${COMPOSE[@]} exec -T backend node -e \
  "require('mongoose').connect(process.env.MONGODB_URI,{serverSelectionTimeoutMS:5000}).then(async m=>{await m.disconnect();process.exit(0)}).catch(()=>process.exit(1))" \
  >/dev/null 2>&1 \
  || fail "MongoDB is not reachable from the backend"
pass "MongoDB is reachable from the backend over the private network"

assert_not_published backend 5000
assert_not_published frontend 4029
assert_not_published mongo 27017

nginx_id="$(${COMPOSE[@]} ps --quiet nginx)"
nginx_binding="$(docker inspect --format '{{(index (index .NetworkSettings.Ports "8080/tcp") 0).HostIp}}:{{(index (index .NetworkSettings.Ports "8080/tcp") 0).HostPort}}' "${nginx_id}")"
[[ "${nginx_binding}" == "127.0.0.1:8080" ]] || fail "Nginx binding is ${nginx_binding}; expected 127.0.0.1:8080"
pass "Nginx is the only host-facing service at 127.0.0.1:8080"

headers="$(curl --silent --show-error --dump-header - --output /dev/null "${BASE_URL}/healthz" | tr -d '\r')"
grep -qi '^X-Content-Type-Options: nosniff$' <<<"${headers}" || fail "X-Content-Type-Options header is missing"
grep -qi '^X-Frame-Options: SAMEORIGIN$' <<<"${headers}" || fail "X-Frame-Options header is missing"
grep -qi '^Referrer-Policy: strict-origin-when-cross-origin$' <<<"${headers}" || fail "Referrer-Policy header is missing"
pass "Nginx security headers are present"

printf 'All Docker smoke tests passed.\n'
