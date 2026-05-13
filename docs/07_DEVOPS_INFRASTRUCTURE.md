## Section 7 — DevOps and Infrastructure

### 7.1 — Docker Setup

Dockerfiles found:

| Dockerfile | Base Image | Build Stages | Exposed Port | Start Command |
|---|---|---:|---:|---|
| `gateway/Dockerfile` | `node:20-alpine` | 1 | `3000` | `node gateway/src/index.js` |
| `bff/Dockerfile` | `node:20-alpine` | 1 | `8080` | `node bff/src/index.js` |
| `services/auth-service/Dockerfile` | `node:20-alpine` | 1 | `3001` | `node services/auth-service/src/index.js` |
| `services/listing-service/Dockerfile` | `node:20-alpine` | 1 | `3002` | `node services/listing-service/src/index.js` |
| `services/review-service/Dockerfile` | `node:20-alpine` | 1 | `3003` | `node services/review-service/src/index.js` |
| `services/booking-service/Dockerfile` | `node:20-alpine` | 1 | `3004` | `node services/booking-service/src/index.js` |
| `services/media-service/Dockerfile` | `node:20-alpine` | 1 | `3005` | `node services/media-service/src/index.js` |
| `services/search-service/Dockerfile` | `node:20-alpine` | 1 | `3006` | `node services/search-service/src/index.js` |
| `services/admin-service/Dockerfile` | `node:20-alpine` | 1 | `3007` | `node services/admin-service/src/index.js` |

Evidence:

| Evidence | Location |
|---|---|
| Gateway uses `FROM node:20-alpine`, installs `shared` and `gateway` packages, exposes `3000`, and starts `gateway/src/index.js`. | `gateway/Dockerfile:5`, `gateway/Dockerfile:10-15`, `gateway/Dockerfile:22-25` |
| BFF uses `FROM node:20-alpine`, installs `shared` and `bff` packages, exposes `8080`, and starts `bff/src/index.js`. | `bff/Dockerfile:1-10` |
| Service Dockerfiles follow the same pattern: copy `shared/package.json`, install shared production dependencies, copy service package, install service production dependencies, copy source, expose service port, run `src/index.js`. | `services/auth-service/Dockerfile:4-22`, `services/listing-service/Dockerfile:1-10`, `services/review-service/Dockerfile:1-10`, `services/booking-service/Dockerfile:1-10`, `services/media-service/Dockerfile:1-10`, `services/search-service/Dockerfile:1-10`, `services/admin-service/Dockerfile:1-10` |
| `.dockerignore` excludes all `node_modules`, Git files, IDE files, OS files, Compose files, `.dockerignore`, and `scripts/`. | `.dockerignore:5-28` |

Notable optimizations found:

| Optimization | Evidence |
|---|---|
| Dependency manifests are copied before source code, allowing Docker layer reuse when source changes but package manifests do not. | `gateway/Dockerfile:10-19`, `bff/Dockerfile:3-8`, `services/auth-service/Dockerfile:9-18` |
| `npm install --production` is used in Dockerfiles. | `gateway/Dockerfile:11`, `gateway/Dockerfile:15`, `bff/Dockerfile:4`, `bff/Dockerfile:6`, `services/auth-service/Dockerfile:10`, `services/auth-service/Dockerfile:14` |
| Host `node_modules` are excluded from Docker build context. | `.dockerignore:5-7` |

Issues found:

| Issue | Evidence | Impact |
|---|---|---|
| Dockerfiles are single-stage builds. The gateway Dockerfile comment says "Multi-stage build", but the file contains only one `FROM`. | `gateway/Dockerfile:4-5`; other Dockerfiles also contain one `FROM` each | Larger final images are possible because dependency install and runtime happen in the same stage. |
| No non-root user is configured in any Dockerfile. | No `USER` instruction in `gateway/Dockerfile`, `bff/Dockerfile`, or `services/*/Dockerfile` | Containers run with the base image default user. |
| Healthchecks are not in Dockerfiles. | No `HEALTHCHECK` instruction in Dockerfiles; Compose healthchecks are defined instead in `docker-compose.yml` | Health monitoring depends on Compose configuration rather than image metadata. |


### 7.2 — Docker Compose

Compose files found:

| File | Purpose | Evidence |
|---|---|---|
| `docker-compose.yml` | Local multi-service stack | Defines infrastructure, app services, volumes, and `heavenly-network` |
| `docker-compose.prod.yml` | Production override | Sets `NODE_ENV=production`, restart policies, empty volume lists, resource limits, and removes RabbitMQ management UI port exposure |

Services in `docker-compose.yml`:

| Service | Image / Build | Ports | Volumes | Purpose |
|---|---|---|---|---|
| `mongodb` | `mongo:7` | `27017:27017` | `mongodb_data:/data/db` | MongoDB database |
| `redis` | `redis:7-alpine` | `6379:6379` | `redis_data:/data` | Redis cache/supporting infrastructure |
| `rabbitmq` | `rabbitmq:3-management` | `5672:5672`, `15672:15672` | `rabbitmq_data:/var/lib/rabbitmq` | RabbitMQ broker and management UI |
| `auth-service` | build `services/auth-service/Dockerfile` | `3001:3001` | service bind mount, `shared` bind mount, anonymous `node_modules` mounts | Auth API service |
| `listing-service` | build `services/listing-service/Dockerfile` | `3002:3002` | service bind mount, `shared` bind mount, anonymous `node_modules` mounts | Listing API service |
| `review-service` | build `services/review-service/Dockerfile` | `3003:3003` | service bind mount, `shared` bind mount, anonymous `node_modules` mounts | Review API service |
| `booking-service` | build `services/booking-service/Dockerfile` | `3004:3004` | service bind mount, `shared` bind mount, anonymous `node_modules` mounts | Booking and payment API service |
| `media-service` | build `services/media-service/Dockerfile` | `3005:3005` | service bind mount, `shared` bind mount, anonymous `node_modules` mounts | Media upload service |
| `search-service` | build `services/search-service/Dockerfile` | `3006:3006` | service bind mount, `shared` bind mount, anonymous `node_modules` mounts | Search/geocode service |
| `admin-service` | build `services/admin-service/Dockerfile` | `3007:3007` | service bind mount, `shared` bind mount, anonymous `node_modules` mounts | Admin aggregation service |
| `gateway` | build `gateway/Dockerfile` | `3000:3000` | gateway bind mount, `shared` bind mount, anonymous `node_modules` mounts | API gateway |
| `bff` | build `bff/Dockerfile` | `8080:8080` | BFF bind mount, `shared` bind mount, anonymous `node_modules` mounts | Server-rendered frontend/BFF |

Healthchecks:

| Service | Healthcheck |
|---|---|
| `mongodb` | `mongosh --eval db.adminCommand('ping')` |
| `redis` | `redis-cli ping` |
| `rabbitmq` | `rabbitmq-diagnostics -q ping` |
| `auth-service` | `wget -q --spider http://localhost:3001/health` |
| `listing-service` | `wget -q --spider http://localhost:3002/health` |
| `review-service` | `wget -q --spider http://localhost:3003/health` |
| `booking-service` | `wget -q --spider http://localhost:3004/health` |
| `media-service` | `wget -q --spider http://localhost:3005/health` |
| `search-service` | `wget -q --spider http://localhost:3006/health` |
| `admin-service` | `wget -q --spider http://localhost:3007/health` |
| `gateway` | `wget -q --spider http://localhost:3000/health` |

Notes:

| Topic | Detail | Evidence |
|---|---|---|
| Dependency startup ordering | App services use `depends_on` with `condition: service_healthy` for infrastructure and upstream services. | `docker-compose.yml:72-78`, `docker-compose.yml:108-112`, `docker-compose.yml:237-243`, `docker-compose.yml:319-335`, `docker-compose.yml:365-367` |
| Network | All services use `heavenly-network`, defined as a bridge network. | `docker-compose.yml:12-13`, `docker-compose.yml:381-383` |
| Named volumes | `mongodb_data`, `redis_data`, and `rabbitmq_data` are defined. | `docker-compose.yml:376-379` |
| Production override | `docker-compose.prod.yml` sets restart policies and resource limits for all services listed there. | `docker-compose.prod.yml:20-150` |
| Production RabbitMQ ports | RabbitMQ exposes only `5672:5672` in the production override; the file comments that management UI port `15672` is not exposed in production. | `docker-compose.prod.yml:36-40` |
| Production bind mounts | Production override sets app service `volumes: []`. | `docker-compose.prod.yml:50-150` |


### 7.3 — CI/CD Pipeline

> **Not present:** CI/CD Pipeline
> Evidence: No `.github/workflows/`, `.gitlab-ci.yml`, Jenkinsfile, `.circleci/`, or `bitbucket-pipelines.yml` found in repository.


### 7.4 — Kubernetes / Helm

> **Not present:** Kubernetes / Helm
> Evidence: No `k8s/`, `helm/`, or `manifests/` folder found in repository.


### 7.5 — Cloud Infrastructure

> **Not present:** Cloud Infrastructure
> Evidence: No Terraform, CDK, Pulumi, SAM, or `serverless.yml` config found in repository.


### 7.6 — Environment Separation

Environment separation found:

| Environment | Evidence | What Changes |
|---|---|---|
| Development | `docker-compose.yml` sets `NODE_ENV=development` for app services and bind-mounts source folders. | Source directories are mounted into containers; ports for all services and infrastructure are exposed locally. |
| Production Compose override | `docker-compose.prod.yml` sets `NODE_ENV=production`, removes app bind mounts with `volumes: []`, adds `restart: unless-stopped`, and sets resource limits. | Containers use copied image contents instead of bind mounts; RabbitMQ management UI port is not exposed by the override. |

No separate `.env.production`, `.env.development`, Kubernetes namespace, cloud account, or CI environment matrix was found in the repository scan or the infrastructure file scan.

