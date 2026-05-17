## Section 10 — Observability

### 10.1 — Logging

Structured logging library: Morgan request logging is present. Application and domain events use direct `console.log`, `console.warn`, and `console.error`.

| Component | Request Logging | Evidence |
|---|---|---|
| Gateway | `[:date[iso]] :method :url :status :res[content-length] - :response-time ms` | `gateway/src/index.js:15`, `gateway/src/index.js:27-28` |
| BFF | `[:date[iso]] :method :url :status :response-time ms` | `bff/src/index.js:24`, `bff/src/index.js:43-44` |
| Auth Service | `[:date[iso]] :method :url :status :response-time ms` | `services/auth-service/src/index.js:17`, `services/auth-service/src/index.js:39-40` |
| Listing Service | `[:date[iso]] :method :url :status :response-time ms` | `services/listing-service/src/index.js:18`, `services/listing-service/src/index.js:38-39` |
| Review Service | `[:date[iso]] :method :url :status :response-time ms` | `services/review-service/src/index.js:16`, `services/review-service/src/index.js:34-35` |
| Booking Service | `[:date[iso]] :method :url :status :response-time ms` | `services/booking-service/src/index.js:17`, `services/booking-service/src/index.js:36-37` |
| Media Service | `[:date[iso]] :method :url :status :response-time ms` | `services/media-service/src/index.js:15`, `services/media-service/src/index.js:24-25` |
| Search Service | `[:date[iso]] :method :url :status :response-time ms` | `services/search-service/src/index.js:14`, `services/search-service/src/index.js:34-35` |
| Admin Service | `[:date[iso]] :method :url :status :response-time ms` | `services/admin-service/src/index.js:18`, `services/admin-service/src/index.js:35-36` |

Console logging found:

| Area | What Is Logged | Evidence |
|---|---|---|
| Startup | Service port, environment, gateway URL, and dependency connection status. | `gateway/src/index.js:70-72`, `bff/src/index.js:123-125`, `services/auth-service/src/index.js:80-113` |
| Gateway proxy | Proxy route setup, proxied requests, and proxy errors. | `gateway/src/proxy.js:114-138` |
| Gateway rate limits | Rate-limit exceedances with key/method/path. | `gateway/src/middleware/rateLimiter.js:37-43` |
| Service errors | Per-service error middleware logs method, URL, and error message. | `gateway/src/middleware/errorHandler.js:9`, `services/auth-service/src/index.js:67`, `services/booking-service/src/index.js:64` |
| RabbitMQ | Connection attempts, reconnects, publishes, receives, handler errors, and shutdown. | `shared/events/broker.js:59-305` |
| Redis | Redis client errors in Auth and Search services. | `services/auth-service/src/index.js:87`, `services/search-service/src/index.js:77` |
| Domain operations | Examples include auth login/register, booking payment/refund, listing CRUD, review CRUD, media upload/delete, and search cache hits/misses. | `services/auth-service/src/controllers/auth.js:68-149`, `services/booking-service/src/controllers/booking.js:223-528`, `services/search-service/src/controllers/search.js:49-102` |

Log destination in Docker Compose: logs go to standard output/error through Morgan and `console.*`.

Log destination in Kubernetes: Promtail runs in the `monitoring` namespace and ships container stdout/stderr logs from the `heavenly` namespace to Loki. Grafana can query them with LogQL.

No explicit field redaction or structured JSON log format was found.


### 10.2 — Metrics

Prometheus metrics are implemented with `prom-client`.

| Metric Area | Detail |
|---|---|
| Default Node.js/process metrics | Collected with prefix `heavenly_` |
| HTTP request count | `heavenly_http_requests_total` |
| HTTP request latency | `heavenly_http_request_duration_seconds` |
| Export endpoint | `/metrics` on each app service |

The shared helper lives at `shared/src/metrics.js` and is wired into the BFF, Gateway, and all backend services.

In Kubernetes, app pod annotations enable Prometheus scraping:

```yaml
prometheus.io/scrape: "true"
prometheus.io/path: /metrics
prometheus.io/port: "<service-port>"
```

Useful queries:

```promql
sum by (service) (rate(heavenly_http_requests_total[5m]))
histogram_quantile(0.95, sum by (service, le) (rate(heavenly_http_request_duration_seconds_bucket[5m])))
sum by (pod) (rate(container_cpu_usage_seconds_total{namespace="heavenly"}[5m]))
sum by (pod) (container_memory_working_set_bytes{namespace="heavenly"})
```


### 10.3 — Distributed Tracing

> **Not present:** Distributed Tracing
> Evidence: No OpenTelemetry, Jaeger, Zipkin, Datadog tracing, New Relic tracing, or trace middleware found in repository.


### 10.4 — Error Tracking

> **Not present:** Error Tracking
> Evidence: No Sentry, Bugsnag, Rollbar, or equivalent error tracking service found in repository.


### 10.5 — Health Checks

Health endpoints are present in the Gateway, BFF, and services.

| Component | Path | What It Checks / Reports | Response Shape Evidence |
|---|---|---|---|
| Gateway | `/health` | Static service status and timestamp. | `gateway/src/index.js:44-51` |
| BFF | `/health` | Static service status, timestamp, and BFF type. | `bff/src/index.js:78-85` |
| Auth Service | `/health` | Service status, timestamp, and MongoDB connection state. | `services/auth-service/src/index.js:44-51` |
| Listing Service | `/health` | Service status, timestamp, and MongoDB connection state. | `services/listing-service/src/index.js:43-50` |
| Review Service | `/health` | Service status, timestamp, and MongoDB connection state. | `services/review-service/src/index.js:39-46` |
| Booking Service | `/health` | Service status, timestamp, and MongoDB connection state. | `services/booking-service/src/index.js:41-48` |
| Media Service | `/health` | Service status, timestamp, and Cloudinary configured/not configured state. | `services/media-service/src/index.js:29-36` |
| Search Service | `/health` | Service status, timestamp, and in-memory search index size. | `services/search-service/src/index.js:39-46` |
| Admin Service | `/health` | Service status, timestamp, and aggregator type. | `services/admin-service/src/index.js:40-47` |

Docker Compose healthchecks:

| Compose Service | Healthcheck | Evidence |
|---|---|---|
| `mongodb` | `mongosh --eval db.adminCommand('ping')` | `docker-compose.yml:14-18` |
| `redis` | `redis-cli ping` | `docker-compose.yml:29-33` |
| `rabbitmq` | `rabbitmq-diagnostics -q ping` | `docker-compose.yml:48-52` |
| `auth-service` | `wget -q --spider http://localhost:3001/health` | `docker-compose.yml:81-86` |
| `listing-service` | `wget -q --spider http://localhost:3002/health` | `docker-compose.yml:115-120` |
| `review-service` | `wget -q --spider http://localhost:3003/health` | `docker-compose.yml:147-152` |
| `booking-service` | `wget -q --spider http://localhost:3004/health` | `docker-compose.yml:182-187` |
| `media-service` | `wget -q --spider http://localhost:3005/health` | `docker-compose.yml:211-216` |
| `search-service` | `wget -q --spider http://localhost:3006/health` | `docker-compose.yml:246-251` |
| `admin-service` | `wget -q --spider http://localhost:3007/health` | `docker-compose.yml:284-289` |
| `gateway` | `wget -q --spider http://localhost:3000/health` | `docker-compose.yml:338-343` |

No Docker Compose healthcheck is defined for the BFF service in `docker-compose.yml`.

### 10.6 — Kubernetes Observability Stack

| Component | Purpose |
|---|---|
| Prometheus | Scrapes app `/metrics`, kubelet/cAdvisor, kube-state-metrics, and HPA metrics |
| Grafana | Visualizes metrics and logs; includes `Heavenly Services Overview` |
| Loki | Stores Kubernetes pod logs |
| Promtail | Ships pod stdout/stderr logs to Loki |
| Alertmanager | Installed by kube-prometheus-stack for alert routing experiments |

Operational commands:

```bash
kubectl get pods -n monitoring
make k8s-grafana
```

Grafana access:

```bash
kubectl -n monitoring get secret kube-prometheus-stack-grafana -o jsonpath="{.data.admin-password}" | base64 -d ; echo
```

LogQL examples:

```logql
{namespace="heavenly"}
{namespace="heavenly", service="bff"}
```
