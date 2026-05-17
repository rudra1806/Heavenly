#!/usr/bin/env bash
set -euo pipefail

SERVICE="${1:-}"

if [[ -z "$SERVICE" ]]; then
  kubectl -n heavenly rollout restart deployment
else
  kubectl -n heavenly rollout restart "deployment/$SERVICE"
fi
