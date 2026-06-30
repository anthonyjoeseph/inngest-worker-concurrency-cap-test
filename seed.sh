#!/usr/bin/env bash
set -e

echo "Waiting for Inngest dev server at localhost:8388..."
until curl -sf http://localhost:8388 > /dev/null 2>&1; do
  sleep 1
done
echo "Ready."

for i in $(seq 1 12); do
  curl -s -X POST "http://localhost:8388/e/test" \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"light/start\", \"data\": {\"index\": $i}}" \
    > /dev/null
  echo "Sent event $i"
done

echo "All 30 events sent."