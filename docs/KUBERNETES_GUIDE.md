# Heavenly Kubernetes Guide

This Kubernetes setup runs Heavenly locally on Minikube with application workloads in the `heavenly` namespace and observability workloads in `monitoring`.

## Concepts Used

- **Namespace**: isolates app resources (`heavenly`) from monitoring resources (`monitoring`).
- **ConfigMap**: stores non-secret runtime config such as service URLs, ports, Mongo URLs, and Redis URL.
- **Secret**: stores JWT, session, Cloudinary, RabbitMQ, and Razorpay credentials generated from `.env` by `scripts/create-secret.sh`.
- **Deployment**: runs stateless services: auth, listing, review, booking, media, search, admin, gateway, and bff.
- **StatefulSet**: runs MongoDB, Redis, and RabbitMQ with stable pod names and persistent volume claims.
- **Service**: gives each workload a stable DNS name such as `auth-service.heavenly.svc.cluster.local`.
- **Ingress**: routes `http://heavenly.local` to `bff-service:8080` through NGINX.
- **Health probes**: `/health` readiness and liveness checks keep traffic on healthy pods and restart stuck containers.
- **HPA**: scales stateless Deployments based on 70% average CPU utilization.
- **PersistentVolumeClaim**: keeps MongoDB, Redis, and RabbitMQ data across pod restarts.
- **Prometheus/Grafana**: collects and displays container and application `/metrics` data.
- **Loki/Promtail**: collects stdout/stderr logs from pods and exposes them in Grafana.
- **NetworkPolicy**: starts with restricted ingress, then allows internal app traffic, ingress traffic, and monitoring scrapes.

## Runtime Flow

```text
Browser
  -> heavenly.local
  -> NGINX Ingress
  -> bff-service:8080
  -> gateway-service:3000
  -> backend services
  -> MongoDB / Redis / RabbitMQ
```

Prometheus scrapes annotated pods in `heavenly`; Promtail reads container logs from the node and sends them to Loki; Grafana queries Prometheus and Loki.

## Resource Layout

- `k8s/base`: namespaces, ConfigMap, NetworkPolicies
- `k8s/infra`: MongoDB, Redis, RabbitMQ StatefulSets and Services
- `k8s/apps`: backend microservice Deployments and Services
- `k8s/edge`: gateway, bff, and Ingress
- `k8s/hpa`: HorizontalPodAutoscalers
- `k8s/monitoring`: Helm values and Grafana dashboard ConfigMaps

## Local Image Pattern

`scripts/k8s-deploy.sh` runs `eval "$(minikube docker-env)"` and builds images directly inside Minikube's Docker daemon. This avoids pushing images to an external registry.

The script pre-pulls `node:20-alpine` and retries image builds because local Docker Hub pulls can intermittently time out.

## Monitoring Notes

- Prometheus is installed through `kube-prometheus-stack`.
- Grafana is installed with a persistent volume and a preloaded `Heavenly Services Overview` dashboard.
- Loki is installed through `grafana/loki-stack`.
- The `loki-stack` chart currently installs Loki `2.6.1`, so the local values use `schema: v11` with `boltdb-shipper` for compatibility.
- Grafana's Loki datasource is provisioned with UID `loki`; dashboard log panels should use that UID.

Useful Grafana queries:

```promql
sum by (service) (rate(heavenly_http_requests_total[5m]))
sum by (pod) (rate(container_cpu_usage_seconds_total{namespace="heavenly"}[5m]))
sum by (pod) (container_memory_working_set_bytes{namespace="heavenly"})
```

```logql
{namespace="heavenly"}
{namespace="heavenly", service="bff"}
```
