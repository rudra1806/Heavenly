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

## Resource Layout

- `k8s/base`: namespaces, ConfigMap, NetworkPolicies
- `k8s/infra`: MongoDB, Redis, RabbitMQ StatefulSets and Services
- `k8s/apps`: backend microservice Deployments and Services
- `k8s/edge`: gateway, bff, and Ingress
- `k8s/hpa`: HorizontalPodAutoscalers
- `k8s/monitoring`: Helm values and Grafana dashboard ConfigMaps

## Local Image Pattern

`scripts/k8s-deploy.sh` runs `eval "$(minikube docker-env)"` and builds images directly inside Minikube's Docker daemon. This avoids pushing images to an external registry.
