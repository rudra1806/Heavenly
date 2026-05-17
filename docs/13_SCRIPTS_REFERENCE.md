## Section 13 — Scripts Reference

### 13.1 — Package Scripts

| Script | Full Command | Purpose | When to Use | Requires |
|---|---|---|---|---|
| `gateway:start` | `cd gateway && npm run start` → `node src/index.js` | Starts the API Gateway. | Run Gateway without Docker. | Gateway dependencies installed; backend service URLs/env defaults available. |
| `gateway:dev` | `cd gateway && npm run dev` → `nodemon src/index.js` | Starts Gateway with Nodemon reload. | Local Gateway development. | `nodemon` dependency from `gateway/package.json`. |
| `bff:start` | `cd bff && npm run start` → `node src/index.js` | Starts the Express/EJS BFF. | Run BFF without Docker. | BFF dependencies installed; Gateway reachable. |
| `bff:dev` | `cd bff && npm run dev` → `nodemon src/index.js` | Starts BFF with Nodemon reload. | Local BFF development. | `nodemon` dependency from `bff/package.json`. |
| `scripts:migrate` | `cd scripts && npm run migrate` → `node migrate.js` | Runs monolith-to-microservices migration. | Migrating existing monolith MongoDB data. | MongoDB running; source/target DB URLs from `scripts/migrate.js`. |
| `scripts:migrate:dry` | `cd scripts && npm run migrate:dry` → `node migrate.js --dry-run` | Runs migration in dry-run mode. | Preview migration before writing target data. | MongoDB running; same config as `migrate`. |
| `scripts:smoke-test` | `cd scripts && npm run smoke-test` → `node smoke-test.js` | Checks service health, Gateway routing, BFF rendering, and basic auth flow. | After starting the stack. | Gateway on `3000`, BFF on `8080`, services on `3001-3007`. |
| `admin-service:start` | `cd services/admin-service && npm run start` → `node src/index.js` | Starts Admin Service. | Non-Docker service run. | Dependencies installed; upstream services reachable. |
| `admin-service:dev` | `cd services/admin-service && npm run dev` → `nodemon src/index.js` | Starts Admin Service with Nodemon reload. | Admin Service development. | `nodemon` dependency from service package. |
| `auth-service:start` | `cd services/auth-service && npm run start` → `node src/index.js` | Starts Auth Service. | Non-Docker service run. | MongoDB; optional Redis/RabbitMQ envs. |
| `auth-service:dev` | `cd services/auth-service && npm run dev` → `nodemon src/index.js` | Starts Auth Service with Nodemon reload. | Auth Service development. | `nodemon` dependency from service package. |
| `booking-service:start` | `cd services/booking-service && npm run start` → `node src/index.js` | Starts Booking Service. | Non-Docker service run. | MongoDB; optional RabbitMQ/Razorpay envs. |
| `booking-service:dev` | `cd services/booking-service && npm run dev` → `nodemon src/index.js` | Starts Booking Service with Nodemon reload. | Booking Service development. | `nodemon` dependency from service package. |
| `listing-service:start` | `cd services/listing-service && npm run start` → `node src/index.js` | Starts Listing Service. | Non-Docker service run. | MongoDB; optional RabbitMQ/media/search service URLs. |
| `listing-service:dev` | `cd services/listing-service && npm run dev` → `nodemon src/index.js` | Starts Listing Service with Nodemon reload. | Listing Service development. | `nodemon` dependency from service package. |
| `media-service:start` | `cd services/media-service && npm run start` → `node src/index.js` | Starts Media Service. | Non-Docker service run. | Cloudinary env vars for real uploads. |
| `media-service:dev` | `cd services/media-service && npm run dev` → `nodemon src/index.js` | Starts Media Service with Nodemon reload. | Media Service development. | `nodemon` dependency from service package. |
| `review-service:start` | `cd services/review-service && npm run start` → `node src/index.js` | Starts Review Service. | Non-Docker service run. | MongoDB; optional RabbitMQ env. |
| `review-service:dev` | `cd services/review-service && npm run dev` → `nodemon src/index.js` | Starts Review Service with Nodemon reload. | Review Service development. | `nodemon` dependency from service package. |
| `search-service:start` | `cd services/search-service && npm run start` → `node src/index.js` | Starts Search Service. | Non-Docker service run. | Optional Redis/RabbitMQ; Listing Service URL. |
| `search-service:dev` | `cd services/search-service && npm run dev` → `nodemon src/index.js` | Starts Search Service with Nodemon reload. | Search Service development. | `nodemon` dependency from service package. |

`shared/package.json` exists, but no `scripts` block was found.

Evidence: `gateway/package.json:7-10`, `bff/package.json:7-10`, `scripts/package.json:5-9`, `services/*/package.json:7-10`.


### 13.2 — Makefile Targets

| Script | Full Command | Purpose | When to Use | Requires |
|---|---|---|---|---|
| `make help` | Prints available Makefile commands. | Discover Makefile commands. | Any time. | `make`; `grep`; `awk`. |
| `make up` | `docker-compose up` | Starts all services with persisted data. | Foreground Docker Compose run. | Docker Compose and `.env`. |
| `make up-build` | `docker-compose up --build` | Rebuilds images and starts all services. | After Dockerfile/package/source changes. | Docker Compose and `.env`. |
| `make up-d` | `docker-compose up -d` | Starts all services detached. | Background local stack. | Docker Compose and `.env`. |
| `make down` | `docker-compose down` | Stops all services while keeping volumes. | Stop local stack without deleting data. | Docker Compose. |
| `make restart` | `docker-compose restart` | Restarts all Compose services. | Full stack restart. | Running Compose stack. |
| `make restart-bff` | `docker-compose restart bff` | Restarts only BFF. | BFF-only reload. | Running Compose stack. |
| `make restart-booking` | `docker-compose restart booking-service` | Restarts only Booking Service. | Booking Service reload. | Running Compose stack. |
| `make restart-listing` | `docker-compose restart listing-service` | Restarts only Listing Service. | Listing Service reload. | Running Compose stack. |
| `make restart-auth` | `docker-compose restart auth-service` | Restarts only Auth Service. | Auth Service reload. | Running Compose stack. |
| `make logs` | `docker-compose logs -f` | Follows logs from all services. | Observe full stack logs. | Running Compose stack. |
| `make logs-bff` | `docker-compose logs -f bff` | Follows BFF logs. | Debug BFF. | Running Compose stack. |
| `make logs-booking` | `docker-compose logs -f booking-service` | Follows Booking Service logs. | Debug booking/payment flows. | Running Compose stack. |
| `make backup` | `chmod +x scripts/backup-data.sh && ./scripts/backup-data.sh` | Backs up MongoDB data from `heavenly-mongodb`. | Before destructive changes or data migrations. | Running `heavenly-mongodb` container; Docker CLI. |
| `make restore BACKUP=...` | `chmod +x scripts/restore-data.sh && ./scripts/restore-data.sh $(BACKUP)` | Restores MongoDB backup. | Restore a backup directory. | Running `heavenly-mongodb` container; `BACKUP` argument. |
| `make seed` | `cd scripts && node seed-microservices.js` | Seeds microservice data. | Initial local data load. | Node; script dependencies; MongoDB; RabbitMQ. |
| `make clean` | `docker-compose down -v` after confirmation prompt | Stops services and deletes volumes. | Reset all local Docker data. | Docker Compose; user confirmation. |
| `make rebuild SERVICE=...` | `docker-compose up --build $(SERVICE)` | Rebuilds a specific service. | Rebuild one Docker service. | `SERVICE` argument. |
| `make ps` | `docker-compose ps` | Shows running containers. | Check stack status. | Docker Compose. |
| `make volumes` | `docker volume ls | grep heavenly` | Lists Heavenly Docker volumes. | Inspect persistent Docker volumes. | Docker CLI. |
| `make mongo` | `docker exec -it heavenly-mongodb mongosh` | Opens MongoDB shell inside the MongoDB container. | Inspect local MongoDB. | Running `heavenly-mongodb` container. |
| `make redis` | `docker exec -it heavenly-redis redis-cli` | Opens Redis CLI inside the Redis container. | Inspect local Redis. | Running `heavenly-redis` container. |
| `make status` | `docker-compose ps` plus Heavenly volume listing | Shows service status and data volumes. | Local stack status check. | Docker Compose and Docker CLI. |
| `make k8s-start` | `minikube start --cpus=$(K8S_CPUS) --memory=$(K8S_MEMORY)` plus addons | Starts Minikube and enables ingress plus metrics-server. | Start local Kubernetes. | Docker Desktop, Minikube, kubectl. |
| `make k8s-reset` | `minikube delete` then `minikube start ...` plus addons | Recreates Minikube with requested CPU/RAM. | Fix existing profile resource mismatch. | Docker Desktop, Minikube, kubectl. |
| `make k8s-deploy` | `./scripts/k8s-deploy.sh` | Applies Kubernetes manifests, builds local images, installs monitoring. | Deploy Heavenly to Minikube. | Docker, Minikube, kubectl, Helm for monitoring. |
| `make k8s-status` | `kubectl get all -n heavenly` plus ingress/HPA | Shows Kubernetes app resources. | Check app deployment. | kubectl configured for Minikube. |
| `make k8s-logs SERVICE=...` | `kubectl logs -n heavenly -l app=$(SERVICE) --tail=100 -f` | Tails Kubernetes logs. | Debug app services in Kubernetes. | Running app pods. |
| `make k8s-cleanup` | `./scripts/k8s-cleanup.sh` | Removes Kubernetes app resources while keeping PVCs by default. | Clean app resources. | kubectl. |
| `make k8s-restart SERVICE=...` | `./scripts/k8s-restart.sh $(SERVICE)` | Restarts all or one Kubernetes Deployment. | Pick up ConfigMap/Secret/image changes. | Running app deployments. |
| `make k8s-grafana` | `kubectl -n monitoring port-forward svc/kube-prometheus-stack-grafana 3000:80` | Opens Grafana locally. | View metrics and logs. | Monitoring stack running. |
| `make k8s-verify` | `./scripts/verify-deployment.sh` | Checks app and monitoring resource health. | Validate deployment. | kubectl; monitoring checks require Helm-installed stack. |

Evidence: `Makefile`.


### 13.3 — Scripts Folder Files

| Script | Full Command | Purpose | When to Use | Requires |
|---|---|---|---|---|
| `scripts/backup-data.sh` | `./scripts/backup-data.sh` | Creates a timestamped MongoDB backup under `./backups/` using `mongodump` inside `heavenly-mongodb`. | Back up local Docker MongoDB data. | Running `heavenly-mongodb`; Docker CLI. |
| `scripts/restore-data.sh` | `./scripts/restore-data.sh <backup-directory>` | Restores MongoDB data using `mongorestore --drop` inside `heavenly-mongodb`. | Restore a previous backup. | Running `heavenly-mongodb`; backup directory containing `mongodb/`. |
| `scripts/seed-data.sh` | `cd scripts && ./seed-data.sh` | Shell wrapper that runs `node seed-microservices.js`. | Seed data through shell wrapper. | Node; script dependencies; executable permission if run directly. |
| `scripts/seed-microservices.js` | `cd scripts && node seed-microservices.js` | Seeds Auth, Listing, Review, Booking, and Search data; publishes RabbitMQ events. | Initial local data setup. | MongoDB URLs; RabbitMQ URL/default; `scripts` dependencies. |
| `scripts/migrate.js` | `cd scripts && node migrate.js` | Migrates monolith MongoDB data into service databases. | Monolith-to-microservices migration. | MongoDB source and target URLs; script dependencies. |
| `scripts/migrate.js --dry-run` | `cd scripts && node migrate.js --dry-run` | Runs migration logic in dry-run mode. | Validate migration plan before writing. | Same as `migrate.js`. |
| `scripts/smoke-test.js` | `cd scripts && node smoke-test.js` | Checks service health endpoints, Gateway routing, BFF rendering, and basic auth registration. | Verify local stack after startup. | Gateway `3000`, services `3001-3007`, BFF `8080`. |
| `scripts/smoke-test.js --gateway-url ...` | `cd scripts && node smoke-test.js --gateway-url http://localhost:3000` | Overrides Gateway URL for smoke checks. | Smoke test a non-default Gateway URL. | Running target Gateway. |
| `scripts/smoke-test.js --bff-url ...` | `cd scripts && node smoke-test.js --bff-url http://localhost:8080` | Overrides BFF URL for smoke checks. | Smoke test a non-default BFF URL. | Running target BFF. |
| `scripts/update-booking-emails.js` | `cd scripts && node update-booking-emails.js` | Populates `guestEmail` on existing bookings by looking up users in Auth DB. | Repair/migrate existing booking records missing guest email. | Booking DB and Auth DB; `BOOKING_DB_URL`/`AUTH_DB_URL` optional. |
| `scripts/create-secret.sh` | `./scripts/create-secret.sh .env` | Creates/updates `heavenly-secrets` in the `heavenly` namespace from `.env`. | Before deploying Kubernetes resources that reference secrets. | kubectl and `.env`. |
| `scripts/k8s-deploy.sh` | `./scripts/k8s-deploy.sh` | Applies base resources, creates Secret, builds local images into Minikube, deploys app resources, HPA, and monitoring. | Full Kubernetes deployment. | Docker, Minikube, kubectl, Helm for monitoring. |
| `scripts/k8s-cleanup.sh` | `./scripts/k8s-cleanup.sh` | Deletes app Kubernetes resources; deletes PVCs only when `DELETE_PVCS=true`. | Cleanup local Kubernetes app resources. | kubectl. |
| `scripts/k8s-restart.sh` | `./scripts/k8s-restart.sh [deployment]` | Restarts all app Deployments or one named Deployment. | Pick up config/image changes. | kubectl. |
| `scripts/verify-deployment.sh` | `./scripts/verify-deployment.sh` | Runs pass/fail checks for namespaces, ConfigMap, Secret, app workloads, HPA, Ingress, and monitoring. | Deployment verification. | kubectl. |
| `scripts/data.js` | Imported by `scripts/seed-microservices.js` | Provides sample listing seed data. | Not intended as a direct command; used by seed script. | `scripts/seed-microservices.js`. |
| `scripts/package.json` | `cd scripts && npm run <script>` | Defines `migrate`, `migrate:dry`, and `smoke-test`. | npm entry point for script package commands. | npm. |
| `scripts/package-lock.json` | Not executable | Locks dependencies for the scripts package. | Dependency reproducibility. | npm. |

Evidence: `scripts/backup-data.sh:1-21`, `scripts/restore-data.sh:1-30`, `scripts/seed-data.sh:1-8`, `scripts/seed-microservices.js:1-18`, `scripts/migrate.js:20-38`, `scripts/smoke-test.js:12-20`, `scripts/update-booking-emails.js:1-17`, `scripts/data.js:1-17`.
