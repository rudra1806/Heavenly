#!/usr/bin/env bash
set -euo pipefail

DELETE_PVCS="${DELETE_PVCS:-false}"

if [[ "$DELETE_PVCS" == "true" ]]; then
  kubectl delete pvc -n heavenly --all --ignore-not-found
fi

kubectl delete -k k8s/hpa --ignore-not-found
kubectl delete -k k8s/edge --ignore-not-found
kubectl delete -k k8s/apps --ignore-not-found
kubectl delete -k k8s/infra --ignore-not-found
kubectl delete -f k8s/monitoring/grafana-dashboards.yaml --ignore-not-found

echo "Application resources removed. Set DELETE_PVCS=true to delete app PVCs."
