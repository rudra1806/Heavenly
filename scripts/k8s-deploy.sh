#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WITH_MONITORING="${WITH_MONITORING:-true}"

cd "$ROOT_DIR"

retry() {
  local attempts="$1"
  shift
  local delay=5
  local n=1

  until "$@"; do
    if [[ "$n" -ge "$attempts" ]]; then
      echo "Command failed after $attempts attempts: $*"
      return 1
    fi

    echo "Attempt $n failed. Retrying in ${delay}s..."
    sleep "$delay"
    n=$((n + 1))
    delay=$((delay * 2))
  done
}

echo "Applying base namespaces/configuration..."
kubectl apply -k k8s/base

echo "Creating secrets from .env..."
scripts/create-secret.sh .env

echo "Building local Docker images..."
eval "$(minikube docker-env)"
echo "Pre-pulling app base image into Minikube Docker daemon..."
retry 4 docker pull node:20-alpine

retry 3 docker build -t heavenly/auth-service:latest -f services/auth-service/Dockerfile .
retry 3 docker build -t heavenly/listing-service:latest -f services/listing-service/Dockerfile .
retry 3 docker build -t heavenly/review-service:latest -f services/review-service/Dockerfile .
retry 3 docker build -t heavenly/booking-service:latest -f services/booking-service/Dockerfile .
retry 3 docker build -t heavenly/media-service:latest -f services/media-service/Dockerfile .
retry 3 docker build -t heavenly/search-service:latest -f services/search-service/Dockerfile .
retry 3 docker build -t heavenly/admin-service:latest -f services/admin-service/Dockerfile .
retry 3 docker build -t heavenly/gateway:latest -f gateway/Dockerfile .
retry 3 docker build -t heavenly/bff:latest -f bff/Dockerfile .

echo "Applying infrastructure and application manifests..."
kubectl apply -k k8s/infra
kubectl rollout status statefulset/mongodb -n heavenly --timeout=180s
kubectl rollout status statefulset/redis -n heavenly --timeout=120s
kubectl rollout status statefulset/rabbitmq -n heavenly --timeout=180s
kubectl apply -k k8s/apps
kubectl apply -k k8s/edge
kubectl apply -k k8s/hpa

if [[ "$WITH_MONITORING" == "true" && ! -x "$(command -v helm)" ]]; then
  echo ""
  echo "Helm is not installed, so the application was deployed but monitoring was skipped."
  echo "Install Helm and rerun WITH_MONITORING=true make k8s-deploy to add Prometheus, Grafana, Loki, and Promtail."
  WITH_MONITORING=false
fi

if [[ "$WITH_MONITORING" == "true" ]]; then
  echo "Installing monitoring stack with Helm..."
  helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
  helm repo add grafana https://grafana.github.io/helm-charts
  helm repo update
  helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
    --namespace monitoring --create-namespace \
    -f k8s/monitoring/prometheus-values.yaml
  helm upgrade --install loki grafana/loki-stack \
    --namespace monitoring --create-namespace \
    -f k8s/monitoring/loki-values.yaml
  kubectl apply -f k8s/monitoring/grafana-dashboards.yaml
fi

MINIKUBE_IP="$(minikube ip)"
echo ""
echo "Deployment submitted."
echo "Add this hosts entry if needed: $MINIKUBE_IP heavenly.local"
echo "Then open: http://heavenly.local"
