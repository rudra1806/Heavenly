# Heavenly Kubernetes Troubleshooting

## Pod Stuck Pending

Check capacity and PVCs:

```bash
kubectl describe pod -n heavenly <pod>
kubectl get pvc -n heavenly
```

Minikube should be started with `make k8s-start` so the cluster has 6 CPUs and 10GB RAM.

## ImagePullBackOff

The manifests use local images with `imagePullPolicy: IfNotPresent`. Rebuild into Minikube's Docker daemon:

```bash
eval "$(minikube docker-env)"
make k8s-deploy
```

If Docker fails while pulling `node:20-alpine`, rerun `make k8s-deploy`. The deploy script pre-pulls the base image and retries builds, but Docker Hub timeouts can still happen on slow networks.

## CreateContainerConfigError

Usually a missing ConfigMap or Secret:

```bash
kubectl get configmap heavenly-config -n heavenly
kubectl get secret heavenly-secrets -n heavenly
scripts/create-secret.sh .env
```

## CrashLoopBackOff

Read logs and events:

```bash
kubectl logs -n heavenly deploy/auth-service --previous
kubectl describe pod -n heavenly <pod>
```

Common causes are invalid credentials, MongoDB/RabbitMQ still starting, or missing third-party keys.

## Ingress Not Working

Check the addon, ingress object, and hosts entry:

```bash
minikube addons list | grep ingress
kubectl get ingress -n heavenly
minikube ip
```

`/etc/hosts` usually needs `<minikube-ip> heavenly.local`.

On Docker Desktop for Mac, if Minikube says to run a tunnel:

```bash
minikube tunnel
```

Then use:

```text
127.0.0.1 heavenly.local
```

## HPA Shows Unknown

The metrics-server may still be starting:

```bash
kubectl top pods -n heavenly
kubectl get apiservice v1beta1.metrics.k8s.io
```

Run `minikube addons enable metrics-server` if metrics are unavailable.

## Prometheus or Loki Missing Data

Check pod annotations and monitoring pods:

```bash
kubectl get pods -n heavenly -o jsonpath="{range .items[*]}{.metadata.name}{' '}{.metadata.annotations}{'\n'}{end}"
kubectl get pods -n monitoring
```

Application pods expose `/metrics`; Promtail collects container stdout/stderr from the `heavenly` namespace.

Direct Loki check:

```bash
kubectl -n monitoring exec loki-0 -- wget -qO- 'http://localhost:3100/loki/api/v1/label/namespace/values'
kubectl -n monitoring exec loki-0 -- wget -qO- 'http://localhost:3100/loki/api/v1/query_range?query=%7Bnamespace%3D%22heavenly%22%7D&limit=5'
```

## Grafana CrashLoopBackOff

Check Grafana logs:

```bash
kubectl -n monitoring logs deploy/kube-prometheus-stack-grafana -c grafana --tail=120
```

Known local causes:

- More than one datasource marked as default.
- Old Grafana SQLite state conflicting with corrected datasource provisioning.
- `init-chown-data` permission issues on the Grafana PVC.

The current values disable `grafana.initChownData` and provision Prometheus as default plus Loki as non-default UID `loki`.

If Grafana's persisted local state is broken, reset only Grafana:

```bash
kubectl -n monitoring scale deploy/kube-prometheus-stack-grafana --replicas=0
kubectl -n monitoring delete pvc kube-prometheus-stack-grafana
helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace \
  -f k8s/monitoring/prometheus-values.yaml
```

## Loki CrashLoopBackOff

Check Loki logs:

```bash
kubectl -n monitoring logs loki-0 --tail=120
```

If you see `invalid schema version`, the Loki chart version and schema config do not match. The current `k8s/monitoring/loki-values.yaml` uses `schema: v11` and `store: boltdb-shipper` because `grafana/loki-stack` installs Loki `2.6.1`.

Apply the current values:

```bash
helm upgrade --install loki grafana/loki-stack \
  --namespace monitoring --create-namespace \
  -f k8s/monitoring/loki-values.yaml
kubectl -n monitoring rollout restart statefulset/loki
```

## Dashboard Logs Panel Shows No Data

First verify Loki really has logs:

```bash
kubectl -n monitoring exec loki-0 -- wget -qO- 'http://localhost:3100/loki/api/v1/query_range?query=%7Bnamespace%3D%22heavenly%22%7D&limit=5'
```

If direct Loki query returns logs, refresh Grafana and check:

```text
Explore -> Loki -> {namespace="heavenly"}
```

If Explore works but the dashboard panel does not, reload the dashboard ConfigMap and restart Grafana:

```bash
kubectl apply -f k8s/monitoring/grafana-dashboards.yaml
kubectl -n monitoring rollout restart deploy/kube-prometheus-stack-grafana
```
