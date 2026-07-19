#!/usr/bin/env bash
# init-ollama.sh — Verify (NOT pull) that required models exist locally.
# This runs before the AI service starts to give a clear error instead of
# a mysterious failure on the first LLM request.
#
# Usage:
#   bash scripts/init-ollama.sh
#   bash scripts/init-ollama.sh --ollama-url http://localhost:11434
#
# To auto-pull (only if you have internet and explicitly want it):
#   ALLOW_PULL=true bash scripts/init-ollama.sh

set -euo pipefail

OLLAMA_URL="${OLLAMA_URL:-http://localhost:11434}"
ALLOW_PULL="${ALLOW_PULL:-false}"
REQUIRED_MODELS=("gemma4:e4b" "nomic-embed-text")

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --ollama-url) OLLAMA_URL="$2"; shift 2 ;;
    --allow-pull) ALLOW_PULL="true"; shift ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

echo "Checking Ollama at: ${OLLAMA_URL}"

# Wait for Ollama to be reachable (up to 30s for Docker startup race)
for i in $(seq 1 30); do
  if curl -sf "${OLLAMA_URL}/api/tags" > /dev/null 2>&1; then
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "ERROR: Ollama is not reachable at ${OLLAMA_URL} after 30 seconds."
    echo "Make sure the ollama service is running."
    exit 1
  fi
  sleep 1
done

# Get list of locally available models
AVAILABLE=$(curl -sf "${OLLAMA_URL}/api/tags" | python3 -c "
import sys, json
data = json.load(sys.stdin)
names = [m['name'] for m in data.get('models', [])]
print('\n'.join(names))
" 2>/dev/null || echo "")

echo "Available models:"
echo "${AVAILABLE:-  (none)}"
echo ""

MISSING=()
for model in "${REQUIRED_MODELS[@]}"; do
  # Match by name prefix (gemma4:e4b matches gemma4:e4b, gemma4 matches gemma4:latest etc.)
  base="${model%%:*}"
  if echo "${AVAILABLE}" | grep -qE "^${model}$|^${base}:"; then
    echo "  ✓ ${model}"
  else
    MISSING+=("${model}")
    echo "  ✗ ${model} — MISSING"
  fi
done

echo ""

if [ ${#MISSING[@]} -eq 0 ]; then
  echo "All required models present locally. Ready to run offline."
  exit 0
fi

echo "Missing models: ${MISSING[*]}"
echo ""

if [ "${ALLOW_PULL}" = "true" ]; then
  echo "ALLOW_PULL=true — pulling missing models now..."
  for model in "${MISSING[@]}"; do
    echo "Pulling ${model}..."
    ollama pull "${model}"
  done
  echo "Pull complete. All models now available."
  exit 0
fi

echo "This project runs OFFLINE and will NOT auto-pull models."
echo ""
echo "While you have internet access, run:"
for model in "${MISSING[@]}"; do
  echo "  ollama pull ${model}"
done
echo ""
echo "Then restart the service."
exit 1
