#!/usr/bin/env bash
set -euo pipefail

PASS=0
FAIL=0

check() {
  local name="$1"
  shift
  if "$@" >/dev/null 2>&1; then
    printf "\033[32mPASS\033[0m %s\n" "$name"
    PASS=$((PASS + 1))
  else
    printf "\033[31mFAIL\033[0m %s\n" "$name"
    FAIL=$((FAIL + 1))
  fi
}

check "heavenly namespace" kubectl get namespace heavenly
check "monitoring namespace" kubectl get namespace monitoring
check "ConfigMap" kubectl -n heavenly get configmap heavenly-config
check "Secret" kubectl -n heavenly get secret heavenly-secrets

for sts in mongodb redis rabbitmq; do
  check "StatefulSet $sts" kubectl -n heavenly rollout status "statefulset/$sts" --timeout=5s
done

for deploy in auth-service listing-service review-service booking-service media-service search-service admin-service gateway bff; do
  check "Deployment $deploy" kubectl -n heavenly rollout status "deployment/$deploy" --timeout=5s
done

check "Ingress heavenly-ingress" kubectl -n heavenly get ingress heavenly-ingress
check "HPA resources" kubectl -n heavenly get hpa
check "Prometheus stack" kubectl -n monitoring get pods -l app.kubernetes.io/name=prometheus
check "Grafana" kubectl -n monitoring get pods -l app.kubernetes.io/name=grafana
check "Loki" kubectl -n monitoring get service loki

echo ""
echo "Checks passed: $PASS"
echo "Checks failed: $FAIL"
test "$FAIL" -eq 0
