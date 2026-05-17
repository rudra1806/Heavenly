# Heavenly Kubernetes Runbook

## Start Cluster

```bash
make k8s-start
```

This starts Minikube with 6 CPUs and 10GB RAM, then enables `ingress` and `metrics-server`.

If Minikube already exists with different CPU or memory settings, recreate it:

```bash
make k8s-reset
```

## Deploy

```bash
make k8s-deploy
```

The deploy script applies manifests, creates the Kubernetes Secret from `.env`, builds local images, deploys apps, installs monitoring with Helm, and prints the hosts entry for `heavenly.local`.

Add the printed entry to `/etc/hosts`:

```text
<minikube-ip> heavenly.local
```

On Docker Desktop for Mac, Minikube may require a tunnel for ingress:

```bash
minikube tunnel
```

Keep the tunnel running in a separate terminal and use this hosts entry:

```text
127.0.0.1 heavenly.local
```

## Check Status

```bash
make k8s-status
make k8s-verify
kubectl get pods -n heavenly
kubectl get hpa -n heavenly
```

Monitoring status:

```bash
kubectl get pods -n monitoring
```

## Logs

```bash
make k8s-logs SERVICE=bff
kubectl logs -n heavenly deploy/auth-service -f
```

## Restart

```bash
make k8s-restart
make k8s-restart SERVICE=auth-service
```

## Grafana

```bash
make k8s-grafana
```

Open `http://localhost:3000`. The default kube-prometheus-stack username is usually `admin`; get the password with:

```bash
kubectl -n monitoring get secret kube-prometheus-stack-grafana -o jsonpath="{.data.admin-password}" | base64 -d
```

Open the preloaded dashboard:

```text
Dashboards -> Heavenly Services Overview
```

Useful Explore queries:

```promql
sum by (service) (rate(heavenly_http_requests_total[5m]))
sum by (pod) (container_memory_working_set_bytes{namespace="heavenly"})
```

```logql
{namespace="heavenly"}
```

## HPA Test

Watch HPA:

```bash
kubectl get hpa -n heavenly -w
```

Generate CPU pressure in a BFF pod from another terminal:

```bash
POD=$(kubectl -n heavenly get pod -l app=bff -o jsonpath='{.items[0].metadata.name}')
kubectl -n heavenly exec "$POD" -- sh -c 'node -e "let x = 0; while (true) { x += Math.sqrt(Math.random()) }"'
```

Stop with `Ctrl+C`, then watch HPA scale down after the stabilization period.

## Monitoring Repair

If Grafana datasource state becomes inconsistent during local experimentation, reset only Grafana's UI state:

```bash
kubectl -n monitoring scale deploy/kube-prometheus-stack-grafana --replicas=0
kubectl -n monitoring delete pvc kube-prometheus-stack-grafana
helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace \
  -f k8s/monitoring/prometheus-values.yaml
```

This does not delete application data, Prometheus data, or Loki logs.

## Cleanup

```bash
make k8s-cleanup
DELETE_PVCS=true make k8s-cleanup
```

The default cleanup keeps PVCs. Set `DELETE_PVCS=true` when you intentionally want local app data removed.
