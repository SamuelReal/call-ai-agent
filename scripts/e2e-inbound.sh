#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
CALL_ID="${1:-zd_e2e_1}"

post() {
  local payload="$1"
  curl -s -X POST "$BASE_URL/api/v1/telephony/zadarma/webhook" \
    -H "Content-Type: application/json" \
    -d "$payload"
  echo
}

echo "[1/4] call.started"
post "{\"event\":\"call.started\",\"callId\":\"$CALL_ID\",\"direction\":\"inbound\",\"from\":\"+34111111111\",\"to\":\"+34000000000\"}"

echo "[2/4] speech.final (solicitud inicial)"
post "{\"event\":\"speech.final\",\"callId\":\"$CALL_ID\",\"text\":\"quiero una cita manana por la manana\"}"

echo "[3/4] speech.final (seleccion de horario)"
post "{\"event\":\"speech.final\",\"callId\":\"$CALL_ID\",\"text\":\"me quedo con las 11:00\"}"

echo "[4/4] estado de llamada"
curl -s -X GET "$BASE_URL/api/v1/calls/$CALL_ID"
echo
