# Project Wiki — Index

Status definitions:

- Complete — section is fully documented.
- Partial — section is documented where repository evidence exists; unavailable areas are noted.
- Skipped — section is not applicable to this project.

| # | Section | File | Status | Notes |
|---|---------|------|--------|-------|
| 0 | Reconnaissance | [00_PHASE0_RECONNAISSANCE.md](00_PHASE0_RECONNAISSANCE.md) | Complete | — |
| 1 | Project Overview | [01_PROJECT_OVERVIEW.md](01_PROJECT_OVERVIEW.md) | Complete | — |
| 2 | Architecture | [02_ARCHITECTURE.md](02_ARCHITECTURE.md) | Partial | GraphQL, WebSocket, gRPC, and CI/CD flows are not present; Kubernetes is documented separately. |
| 3 | Folder Structure | [03_FOLDER_STRUCTURE.md](03_FOLDER_STRUCTURE.md) | Partial | Root folders such as `src/`, `frontend/`, `tests/`, and CI/CD directories are not present. |
| 4a | Backend Routes | [04a_BACKEND_ROUTES.md](04a_BACKEND_ROUTES.md) | Partial | Section 4 was split because the backend exceeded the route threshold; GraphQL, gRPC, WebSocket, and email routes are not present. |
| 4b | Backend Services | [04b_BACKEND_SERVICES.md](04b_BACKEND_SERVICES.md) | Partial | Separate service-class and DI documentation was omitted where no framework/service-layer evidence existed. |
| 5 | Frontend | [05_FRONTEND.md](05_FRONTEND.md) | Partial | The BFF frontend was documented; separate SPA routing, Redux/Zustand/Context, Tailwind, and CSS Modules are not present. |
| 6 | Database | [06_DATABASE.md](06_DATABASE.md) | Partial | MongoDB/Mongoose were documented; relational database, ER diagram, and Redis schema coverage are not applicable to the current repository. |
| 7 | DevOps Infrastructure | [07_DEVOPS_INFRASTRUCTURE.md](07_DEVOPS_INFRASTRUCTURE.md) | Partial | Docker, Docker Compose, Minikube Kubernetes, and Helm-based monitoring are documented; CI/CD and cloud IaC are not present. |
| 8 | Environment Variables | [08_ENVIRONMENT_VARIABLES.md](08_ENVIRONMENT_VARIABLES.md) | Complete | — |
| 9 | Security | [09_SECURITY.md](09_SECURITY.md) | Partial | Authentication, validation, CORS, and secrets were documented; absent headers, rate limiting, OAuth/API keys, and HTTPS enforcement were marked not present. |
| 10 | Observability | [10_OBSERVABILITY.md](10_OBSERVABILITY.md) | Partial | Logging, health checks, Prometheus metrics, Grafana, Loki, and Promtail are documented; distributed tracing and external error tracking are not present. |
| 11 | Dependencies | [11_DEPENDENCIES.md](11_DEPENDENCIES.md) | Complete | — |
| 12 | Setup Guide | [12_SETUP_GUIDE.md](12_SETUP_GUIDE.md) | Partial | Confirmed local and Docker setup were documented; Kubernetes setup is documented in dedicated Kubernetes docs. |
| 13 | Scripts Reference | [13_SCRIPTS_REFERENCE.md](13_SCRIPTS_REFERENCE.md) | Complete | — |
| 14 | Troubleshooting | [14_TROUBLESHOOTING.md](14_TROUBLESHOOTING.md) | Partial | Docker stack troubleshooting is documented here; Kubernetes troubleshooting is documented separately. |
| 15 | Improvement Recommendations | [15_IMPROVEMENTS.md](15_IMPROVEMENTS.md) | Complete | — |
| K8s | Kubernetes Guide | [KUBERNETES_GUIDE.md](KUBERNETES_GUIDE.md) | Complete | Minikube resource layout, Kubernetes concepts, metrics, and logs. |
| K8s | Kubernetes Runbook | [KUBERNETES_RUNBOOK.md](KUBERNETES_RUNBOOK.md) | Complete | Start, deploy, verify, access Grafana, restart, and cleanup procedures. |
| K8s | Kubernetes Troubleshooting | [KUBERNETES_TROUBLESHOOTING.md](KUBERNETES_TROUBLESHOOTING.md) | Complete | Common pod, ingress, HPA, Helm, Grafana, Loki, and dashboard issues. |
