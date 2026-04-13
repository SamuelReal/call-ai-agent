#!/usr/bin/env bash
set -euo pipefail

CALL_ID="${1:-local_rt_strict_1}"
PORT="${PORT:-3000}"
LOG_FILE="${REALTIME_LOCAL_LOG_FILE:-.tmp-realtime-local.log}"
TIMEOUT_SEC="${REALTIME_LOCAL_TIMEOUT_SEC:-30}"
ZADARMA_SECRET_VALUE="${ZADARMA_SECRET:-local_zadarma_secret}"

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

: > "$LOG_FILE"
PORT="$PORT" ZADARMA_SECRET="$ZADARMA_SECRET_VALUE" npm run start > "$LOG_FILE" 2>&1 &
SERVER_PID=$!

for i in $(seq 1 "$TIMEOUT_SEC"); do
  if curl -fsS "http://localhost:${PORT}/health" >/dev/null 2>&1; then
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

BASE_WS_URL="ws://localhost:${PORT}" npm run e2e:realtime:strict -- "$CALL_ID"
