# Heavenly Kubernetes Guide

This Kubernetes setup runs Heavenly locally on Minikube with application workloads in the `heavenly` namespace and observability workloads in `monitoring`.

## Overview

The Heavenly platform consists of:
- **9 Stateless Services**: auth-service, listing-service, review-service, booking-service, media-service, search-service, admin-service, gateway, bff
- **3 Stateful Services**: MongoDB, Redis, RabbitMQ
- **Monitoring Stack**: Prometheus, Grafana, Loki, Promtail

## Architecture Diagrams

### High-Level Architecture

> **Legend** — Solid lines: application traffic &nbsp;|&nbsp; Dashed lines: observability pipeline (metrics scrape / log shipping)

```mermaid
%%{init: {'theme': 'dark'}}%%
graph TB
    BROWSER(["🌐 Browser\nheavenly.local"]):::client
    HOSTS["📝 /etc/hosts\nDNS mapping"]:::config
    
    subgraph CLUSTER["MINIKUBE CLUSTER"]
        INGRESS["NGINX Ingress Controller\nPathPrefix: /"]:::ingress

        subgraph NS_APP["namespace: heavenly"]
            subgraph EDGE_K["Edge Tier"]
                direction LR
                K_BFF["BFF\nDeployment\n:8080 · ClusterIP"]:::edgeK
                K_GW["Gateway\nDeployment\n:3000 · ClusterIP"]:::edgeK
            end

            subgraph BACKEND_K["Backend Tier — Deployments · ClusterIP"]
                direction LR
                K_AUTH["Auth\n:3001"]:::svcK
                K_LST["Listing\n:3002"]:::svcK
                K_REV["Review\n:3003"]:::svcK
                K_BKG["Booking\n:3004"]:::svcK
                K_MDA["Media\n:3005"]:::svcK
                K_SRC["Search\n:3006"]:::svcK
                K_ADM["Admin\n:3007"]:::svcK
            end

            subgraph INFRA_K["Infrastructure Tier — StatefulSets · PVC"]
                direction LR
                K_MDB[("MongoDB\n10Gi PVC")]:::dbK
                K_RDS[("Redis\n1Gi PVC")]:::dbK
                K_RMQ{{"RabbitMQ\n5Gi PVC"}}:::mqK
            end

            subgraph PLATFORM_K["Platform Resources"]
                direction LR
                K_CM["ConfigMap\nheavenly-config"]:::cfgK
                K_SEC["Secret\nheavenly-secrets"]:::cfgK
                K_HPA["HPA\nCPU 70% · max 3‑5"]:::cfgK
                K_NP["NetworkPolicy\ndefault-deny + allow"]:::cfgK
            end
        end

        subgraph NS_MON["namespace: monitoring"]
            subgraph METRICS_K["Metrics Pipeline"]
                direction LR
                K_PROM["Prometheus\nkube-prometheus-stack"]:::monK
                K_GRAF["Grafana\nDashboards · 2Gi PVC"]:::monK
                K_AM["Alertmanager"]:::monK
            end
            subgraph LOGS_K["Logging Pipeline"]
                direction LR
                K_LOKI["Loki\nLog Aggregation · 5Gi PVC"]:::monK
                K_PT["Promtail\nDaemonSet"]:::monK
            end
        end
    end

    %% ── Application Traffic ──
    BROWSER --> HOSTS
    HOSTS --> INGRESS
    INGRESS --> K_BFF
    K_BFF --> K_GW
    K_GW --> K_AUTH
    K_GW --> K_LST
    K_GW --> K_REV
    K_GW --> K_BKG
    K_GW --> K_MDA
    K_GW --> K_SRC
    K_GW --> K_ADM

    %% ── Infrastructure Connections ──
    K_AUTH & K_LST & K_REV & K_BKG -.-> K_MDB
    K_AUTH & K_GW & K_SRC -.-> K_RDS
    K_AUTH & K_LST & K_REV & K_BKG & K_SRC -.-> K_RMQ

    %% ── Observability Pipeline ──
    K_PROM -.->|"scrapes /metrics\nall annotated pods"| K_BFF
    K_PROM -.->|"scrapes /metrics"| K_GW
    K_PROM -.->|"scrapes /metrics"| K_AUTH
    K_PT -.->|"ships pod stdout/stderr"| K_LOKI
    K_GRAF --> K_PROM
    K_GRAF --> K_LOKI
    K_PROM --> K_AM

    %% ── Platform Config ──
    K_CM -.-> K_BFF
    K_SEC -.-> K_BFF
    K_HPA -.-> K_BFF
    K_HPA -.-> K_GW

    %% ── Styles ──
    classDef client fill:#1e3a5f,stroke:#3b82f6,color:#dbeafe,stroke-width:2px
    classDef config fill:#1f2937,stroke:#6b7280,color:#d1d5db,stroke-width:1px
    classDef ingress fill:#1e3a5f,stroke:#60a5fa,color:#dbeafe,stroke-width:2px
    classDef edgeK fill:#312e81,stroke:#818cf8,color:#e0e7ff,stroke-width:2px
    classDef svcK fill:#4c1d95,stroke:#a78bfa,color:#ede9fe,stroke-width:2px
    classDef dbK fill:#064e3b,stroke:#34d399,color:#d1fae5,stroke-width:2px
    classDef mqK fill:#451a03,stroke:#fbbf24,color:#fef3c7,stroke-width:2px
    classDef cfgK fill:#1f2937,stroke:#6b7280,color:#d1d5db,stroke-width:1px
    classDef monK fill:#4c0519,stroke:#fb7185,color:#ffe4e6,stroke-width:2px

    style CLUSTER fill:#0f172a,stroke:#334155,color:#94a3b8,stroke-width:3px
    style NS_APP fill:#1e1b4b,stroke:#4338ca,color:#c7d2fe,stroke-width:2px
    style NS_MON fill:#2c0a1a,stroke:#be123c,color:#fecdd3,stroke-width:2px
    style EDGE_K fill:#1e1b4b,stroke:#6366f1,color:#c7d2fe,stroke-width:1px
    style BACKEND_K fill:#2e1065,stroke:#7c3aed,color:#ddd6fe,stroke-width:1px
    style INFRA_K fill:#0c1f17,stroke:#059669,color:#a7f3d0,stroke-width:1px
    style PLATFORM_K fill:#111827,stroke:#374151,color:#9ca3af,stroke-width:1px
    style METRICS_K fill:#3b0a1a,stroke:#e11d48,color:#fecdd3,stroke-width:1px
    style LOGS_K fill:#3b0a1a,stroke:#e11d48,color:#fecdd3,stroke-width:1px
```

### Network Architecture

> **Legend** — Solid lines: HTTP traffic flow &nbsp;|&nbsp; Dashed lines: protocol-specific connections

```mermaid
%%{init: {'theme': 'dark'}}%%
graph LR
    subgraph EXT["External"]
        Client(["👤 Client Browser"]):::client
    end
    
    subgraph ING["Ingress Layer"]
        Ingress["NGINX Ingress\nPort 80"]:::ingress
    end
    
    subgraph MESH["Service Mesh — ClusterIP"]
        direction TB
        BFF_Svc["bff-service\n:8080"]:::svc
        GW_Svc["gateway-service\n:3000"]:::svc
        Auth_Svc["auth-service\n:3001"]:::svc
        Listing_Svc["listing-service\n:3002"]:::svc
        Mongo_Svc["mongodb-service\n:27017"]:::db
        Redis_Svc["redis-service\n:6379"]:::cache
        RMQ_Svc["rabbitmq-service\n:5672"]:::mq
    end
    
    subgraph PODS["Pods"]
        direction TB
        BFF_Pod["BFF Pods"]:::pod
        GW_Pod["Gateway Pods"]:::pod
        Auth_Pod["Auth Pods"]:::pod
        Listing_Pod["Listing Pods"]:::pod
        Mongo_Pod["MongoDB Pod"]:::stateful
        Redis_Pod["Redis Pod"]:::stateful
        RMQ_Pod["RabbitMQ Pod"]:::stateful
    end
    
    Client -->|"heavenly.local"| Ingress
    Ingress --> BFF_Svc
    BFF_Svc --> BFF_Pod
    BFF_Pod -->|HTTP| GW_Svc
    GW_Svc --> GW_Pod
    GW_Pod -->|HTTP| Auth_Svc
    GW_Pod -->|HTTP| Listing_Svc
    Auth_Svc --> Auth_Pod
    Listing_Svc --> Listing_Pod
    Auth_Pod -.->|"MongoDB Protocol"| Mongo_Svc
    Auth_Pod -.->|"Redis Protocol"| Redis_Svc
    Auth_Pod -.->|AMQP| RMQ_Svc
    Mongo_Svc --> Mongo_Pod
    Redis_Svc --> Redis_Pod
    RMQ_Svc --> RMQ_Pod

    classDef client fill:#1e3a5f,stroke:#3b82f6,color:#dbeafe,stroke-width:2px
    classDef ingress fill:#312e81,stroke:#818cf8,color:#e0e7ff,stroke-width:2px
    classDef svc fill:#4c1d95,stroke:#a78bfa,color:#ede9fe,stroke-width:2px
    classDef db fill:#064e3b,stroke:#34d399,color:#d1fae5,stroke-width:2px
    classDef cache fill:#451a03,stroke:#fbbf24,color:#fef3c7,stroke-width:2px
    classDef mq fill:#7c2d12,stroke:#fb923c,color:#fed7aa,stroke-width:2px
    classDef pod fill:#134e4a,stroke:#2dd4bf,color:#ccfbf1,stroke-width:2px
    classDef stateful fill:#0f3b3b,stroke:#0d9488,color:#ccfbf1,stroke-width:2px

    style EXT fill:#1e1b4b,stroke:#4338ca,color:#c7d2fe,stroke-width:2px
    style ING fill:#2e1065,stroke:#7c3aed,color:#ddd6fe,stroke-width:2px
    style MESH fill:#0c1f17,stroke:#059669,color:#a7f3d0,stroke-width:2px
    style PODS fill:#1f2937,stroke:#6b7280,color:#d1d5db,stroke-width:2px
```

**Key Networking Concepts**:

- **ClusterIP Services**: Provide stable internal DNS names (e.g., `mongodb-service.heavenly.svc.cluster.local`)
- **Service Discovery**: Kubernetes DNS automatically resolves service names
- **Load Balancing**: Services distribute traffic across healthy pods using round-robin
- **Health-Based Routing**: Only pods passing readiness probes receive traffic

### Monitoring Architecture

> **Legend** — Solid lines: query/visualization flow &nbsp;|&nbsp; Dashed lines: metrics scraping / log collection

```mermaid
%%{init: {'theme': 'dark'}}%%
graph TB
    subgraph APP["Application Pods"]
        direction LR
        Pod1["Auth Pod\n/health\n/metrics"]:::pod
        Pod2["Listing Pod\n/health\n/metrics"]:::pod
        Pod3["Gateway Pod\n/health\n/metrics"]:::pod
    end
    
    subgraph LOG["Log Collection"]
        Promtail["Promtail DaemonSet\nRuns on every node"]:::collector
    end
    
    subgraph METRICS["Metrics Collection"]
        Prometheus["Prometheus\nScrapes every 15s"]:::collector
    end
    
    subgraph STORAGE["Storage"]
        direction LR
        Loki["Loki\nLog Storage\n7-day retention"]:::storage
        PromStorage["Prometheus Storage\n15-day retention"]:::storage
    end
    
    subgraph VIZ["Visualization"]
        Grafana["Grafana\nDashboards & Queries"]:::viz
    end
    
    Pod1 -.->|stdout/stderr| Promtail
    Pod2 -.->|stdout/stderr| Promtail
    Pod3 -.->|stdout/stderr| Promtail
    
    Promtail -.->|ships logs| Loki
    
    Pod1 -.->|"HTTP GET /metrics"| Prometheus
    Pod2 -.->|"HTTP GET /metrics"| Prometheus
    Pod3 -.->|"HTTP GET /metrics"| Prometheus
    
    Prometheus --> PromStorage
    
    Grafana -->|PromQL queries| Prometheus
    Grafana -->|LogQL queries| Loki

    classDef pod fill:#4c1d95,stroke:#a78bfa,color:#ede9fe,stroke-width:2px
    classDef collector fill:#134e4a,stroke:#2dd4bf,color:#ccfbf1,stroke-width:2px
    classDef storage fill:#064e3b,stroke:#34d399,color:#d1fae5,stroke-width:2px
    classDef viz fill:#4c0519,stroke:#fb7185,color:#ffe4e6,stroke-width:2px

    style APP fill:#2e1065,stroke:#7c3aed,color:#ddd6fe,stroke-width:2px
    style LOG fill:#0f3b3b,stroke:#0d9488,color:#ccfbf1,stroke-width:2px
    style METRICS fill:#0f3b3b,stroke:#0d9488,color:#ccfbf1,stroke-width:2px
    style STORAGE fill:#0c1f17,stroke:#059669,color:#a7f3d0,stroke-width:2px
    style VIZ fill:#2c0a1a,stroke:#be123c,color:#fecdd3,stroke-width:2px
```

**Monitoring Data Flow**:

1. **Metrics Path**: Pods expose `/metrics` → Prometheus scrapes → Stores in TSDB → Grafana queries with PromQL
2. **Logs Path**: Pods write to stdout/stderr → Promtail collects → Ships to Loki → Grafana queries with LogQL
3. **Health Checks**: Kubernetes probes `/health` → Determines pod readiness/liveness

## Kubernetes Concepts Used

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

## Directory Structure

The Kubernetes manifests are organized in a `k8s/` directory at the project root:

```
k8s/
├── base/
│   ├── namespace.yaml              # Namespace definitions
│   ├── configmap.yaml              # Non-sensitive configuration
│   ├── secret.yaml                 # Sensitive credentials (base64 encoded)
│   └── network-policies.yaml       # Network access controls
├── infra/
│   ├── mongodb-statefulset.yaml    # MongoDB with PVC
│   ├── mongodb-service.yaml        # MongoDB ClusterIP service
│   ├── redis-statefulset.yaml      # Redis with PVC
│   ├── redis-service.yaml          # Redis ClusterIP service
│   ├── rabbitmq-statefulset.yaml   # RabbitMQ with PVC
│   └── rabbitmq-service.yaml       # RabbitMQ ClusterIP service
├── apps/
│   ├── auth-deployment.yaml        # Auth service deployment
│   ├── auth-service.yaml           # Auth ClusterIP service
│   ├── listing-deployment.yaml     # Listing service deployment
│   ├── listing-service.yaml        # Listing ClusterIP service
│   ├── review-deployment.yaml      # Review service deployment
│   ├── review-service.yaml         # Review ClusterIP service
│   ├── booking-deployment.yaml     # Booking service deployment
│   ├── booking-service.yaml        # Booking ClusterIP service
│   ├── media-deployment.yaml       # Media service deployment
│   ├── media-service.yaml          # Media ClusterIP service
│   ├── search-deployment.yaml      # Search service deployment
│   ├── search-service.yaml         # Search ClusterIP service
│   ├── admin-deployment.yaml       # Admin service deployment
│   └── admin-service.yaml          # Admin ClusterIP service
├── edge/
│   ├── gateway-deployment.yaml     # Gateway deployment
│   ├── gateway-service.yaml        # Gateway ClusterIP service
│   ├── bff-deployment.yaml         # BFF deployment
│   ├── bff-service.yaml            # BFF ClusterIP service
│   └── ingress.yaml                # NGINX Ingress for external access
├── hpa/
│   └── hpa.yaml                    # HPA configuration for all stateless services
└── monitoring/
    ├── prometheus-values.yaml      # Helm values for kube-prometheus-stack
    ├── loki-values.yaml            # Helm values for loki-stack and Promtail
    └── grafana-dashboards.yaml     # Dashboard ConfigMap for Grafana sidecar
```

## Local Image Build Pattern

`scripts/k8s-deploy.sh` runs `eval "$(minikube docker-env)"` and builds images directly inside Minikube's Docker daemon. This avoids pushing images to an external registry.

The script pre-pulls `node:20-alpine` and retries image builds because local Docker Hub pulls can intermittently time out.

All Deployments use `imagePullPolicy: Never` to use local images.

## Monitoring Stack

### Prometheus

- Installed through `kube-prometheus-stack` Helm chart
- Scrapes metrics every 15 seconds from annotated pods
- 15-day retention period
- Stores metrics in persistent volume (20Gi)
- Includes Alertmanager, node-exporter, and kube-state-metrics

### Grafana

- Installed with kube-prometheus-stack
- Persistent volume for dashboard storage (10Gi)
- Pre-configured with Prometheus and Loki data sources
- Includes preloaded `Heavenly Services Overview` dashboard
- Access via `make k8s-grafana` (port-forward to localhost:3000)

### Loki

- Installed through `grafana/loki-stack` Helm chart
- Version 2.6.1 with `schema: v11` and `boltdb-shipper` for compatibility
- 7-day log retention period
- Persistent volume for log storage (20Gi)
- Grafana datasource provisioned with UID `loki`

### Promtail

- Runs as DaemonSet (one pod per node)
- Collects stdout/stderr logs from all pods
- Adds metadata labels (pod, namespace, container, service)
- Ships logs to Loki in real-time

## Useful Queries

### PromQL (Prometheus Metrics)

```promql
# HTTP request rate per service
sum by (service) (rate(heavenly_http_requests_total[5m]))

# CPU usage per pod
sum by (pod) (rate(container_cpu_usage_seconds_total{namespace="heavenly"}[5m]))

# Memory usage per pod
sum by (pod) (container_memory_working_set_bytes{namespace="heavenly"})

# Pod restart count
kube_pod_container_status_restarts_total{namespace="heavenly"}

# HPA current replicas
kube_horizontalpodautoscaler_status_current_replicas{namespace="heavenly"}
```

### LogQL (Loki Logs)

```logql
# All logs from heavenly namespace
{namespace="heavenly"}

# Logs from specific service
{namespace="heavenly", service="bff"}

# Error logs from all services
{namespace="heavenly"} |= "error" or "ERROR"

# Rate of error logs
rate({namespace="heavenly"} |= "error" [5m])

# Logs with JSON parsing
{namespace="heavenly"} | json | level="error"
```
