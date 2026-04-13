#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-3000}"
LOG_FILE="${HARDENING_LOCAL_LOG_FILE:-.tmp-hardening-local.log}"
TIMEOUT_SEC="${HARDENING_LOCAL_TIMEOUT_SEC:-30}"
INTERNAL_KEY="${INTERNAL_API_KEY:-test_hardening_key}"
WS_TOKEN="${REALTIME_WS_TOKEN:-test_ws_token}"
BASE_URL=""

port_in_use() {
  local p="$1"
  if command -v lsof >/dev/null 2>&1; then
    lsof -ti ":${p}" >/dev/null 2>&1
    return $?
  fi
  return 1
}

pick_available_port() {
  local start="$1"
  local max_tries=30
  local candidate="$start"
  local i

  for i in $(seq 1 "$max_tries"); do
    if ! port_in_use "$candidate"; then
      echo "$candidate"
      return 0
    fi
    candidate=$((candidate + 1))
  done

  return 1
}

cleanup() {
  if [[ -n "${SERVER_PID:-}" ]] && kill -0 "$SERVER_PID" >/dev/null 2>&1; then
    kill "$SERVER_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

if port_in_use "$PORT"; then
  NEW_PORT="$(pick_available_port "$PORT")" || {
    echo "Could not find an available port starting from ${PORT}" >&2
    exit 1
  }
  PORT="$NEW_PORT"
  echo "Port in use, switching to ${PORT}" >&2
fi

BASE_URL="http://localhost:${PORT}"

: > "$LOG_FILE"
PORT="$PORT" INTERNAL_API_KEY="$INTERNAL_KEY" REALTIME_WS_TOKEN="$WS_TOKEN" STT_PROVIDER="mock" TTS_PROVIDER="mock" npm run start > "$LOG_FILE" 2>&1 &
SERVER_PID=$!

for i in $(seq 1 "$TIMEOUT_SEC"); do
  if curl -fsS "${BASE_URL}/health" >/dev/null 2>&1; then
    break
  fi

  if ! kill -0 "$SERVER_PID" >/dev/null 2>&1; then
    echo "Server exited before becoming healthy" >&2
    cat "$LOG_FILE" >&2 || true
    exit 1
  fi

  if [[ "$i" -eq "$TIMEOUT_SEC" ]]; then
    echo "Server did not become healthy in ${TIMEOUT_SEC}s" >&2
    cat "$LOG_FILE" >&2 || true
    exit 1
  fi

  sleep 1
done

echo "[1/5] checking /ready"
READY_PAYLOAD="$(curl -fsS "${BASE_URL}/ready")"
if ! echo "$READY_PAYLOAD" | grep -q '"status":"ready"'; then
  echo "Readiness check failed: ${READY_PAYLOAD}" >&2
  exit 1
fi

echo "[2/5] checking internal API key protection"
UNAUTH_PAYLOAD="$(curl -sS "${BASE_URL}/api/v1/realtime/stats")"
if ! echo "$UNAUTH_PAYLOAD" | grep -q '"error":"unauthorized"'; then
  echo "Expected unauthorized response, got: ${UNAUTH_PAYLOAD}" >&2
  exit 1
fi

AUTH_PAYLOAD="$(curl -fsS -H "x-internal-api-key: ${INTERNAL_KEY}" "${BASE_URL}/api/v1/realtime/stats")"
if ! echo "$AUTH_PAYLOAD" | grep -q '"wsPath"'; then
  echo "Expected realtime stats payload, got: ${AUTH_PAYLOAD}" >&2
  exit 1
fi

echo "[3/5] checking websocket token rejection"
WS_UNAUTH_OUTPUT="$(BASE_WS_URL="ws://localhost:${PORT}" npm run e2e:realtime -- hardening_ws_fail_1 2>&1 || true)"
if ! echo "$WS_UNAUTH_OUTPUT" | grep -q "unauthorized"; then
  echo "Expected websocket unauthorized output, got: ${WS_UNAUTH_OUTPUT}" >&2
  exit 1
fi

echo "[4/5] checking websocket token success"
REALTIME_WS_TOKEN="$WS_TOKEN" BASE_WS_URL="ws://localhost:${PORT}" npm run e2e:realtime:strict -- hardening_ws_ok_1 >/tmp/hardening_ws_ok.log

echo "[5/5] checking webhook idempotency"
BODY='{"event":"call.started","callId":"hardening_dup_1","direction":"inbound","from":"+34111111111"}'
FIRST="$(curl -fsS -X POST "${BASE_URL}/api/v1/telephony/zadarma/webhook" -H "Content-Type: application/json" -d "$BODY")"
SECOND="$(curl -fsS -X POST "${BASE_URL}/api/v1/telephony/zadarma/webhook" -H "Content-Type: application/json" -d "$BODY")"

if ! echo "$FIRST" | grep -q '"duplicate":false'; then
  echo "Expected first webhook duplicate=false, got: ${FIRST}" >&2
  exit 1
fi

if ! echo "$SECOND" | grep -q '"duplicate":true'; then
  echo "Expected second webhook duplicate=true, got: ${SECOND}" >&2
  exit 1
fi

echo "Hardening local E2E passed"
