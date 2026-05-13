SECTION: Setup Guide
FILE: 12_SETUP_GUIDE.md
COVERS:
- Prerequisites for the confirmed Node.js, Docker Compose, MongoDB, Redis, RabbitMQ, and npm-based service setup.
- Local setup with Docker Compose using `docker-compose.yml`.
- Local setup without Docker using per-package `npm install` and service `npm start` scripts.
- Environment setup from `.env.example`.
- Real migration, seed, and smoke-test commands from `scripts/package.json`, `Makefile`, and script files.
- Actual service ports from `docker-compose.yml`.
SKIPS:
- Kubernetes setup skipped because Phase 0 found no `k8s/`, `helm/`, or manifest folder.
- CI setup skipped because Phase 0 found no CI/CD config.
- Frontend SPA build steps skipped because the frontend is an Express/EJS BFF, not a separate SPA package.
- Formal test-running steps skipped because Phase 0 found no formal test suite.

## Section 12 — Setup Guide

### 12.1 — Prerequisites

| Tool | Minimum Version | Why Needed | Evidence | Install Link |
|---|---:|---|---|---|
| Node.js | 20.x | Dockerfiles use `node:20-alpine`; non-Docker setup runs service `npm start` scripts. | `gateway/Dockerfile:5`, `bff/Dockerfile:1`, `services/auth-service/Dockerfile:4` | `https://nodejs.org/` |
| npm | bundled with Node.js | Installs per-package dependencies and runs `scripts/package.json` commands. | `gateway/package.json`, `bff/package.json`, `services/*/package.json`, `scripts/package.json` | `https://nodejs.org/` |
| Docker | Current Docker Engine / Docker Desktop | Builds and runs the confirmed Dockerfiles. | `gateway/Dockerfile`, `bff/Dockerfile`, `services/*/Dockerfile` | `https://docs.docker.com/get-docker/` |
| Docker Compose | Compose plugin or compatible `docker-compose` command | Runs `docker-compose.yml` and `docker-compose.prod.yml`. | `docker-compose.yml`, `docker-compose.prod.yml`, `Makefile` commands use `docker-compose` | `https://docs.docker.com/compose/` |
| MongoDB | 7.x for Docker path | Required database service. Docker Compose uses `mongo:7`. | `docker-compose.yml:5-18` | `https://www.mongodb.com/docs/manual/installation/` |
| Redis | 7.x for Docker path | Cache/supporting service. Docker Compose uses `redis:7-alpine`. | `docker-compose.yml:20-33` | `https://redis.io/docs/latest/operate/oss_and_stack/install/` |
| RabbitMQ | 3.x for Docker path | Message broker. Docker Compose uses `rabbitmq:3-management`. | `docker-compose.yml:35-52` | `https://www.rabbitmq.com/docs/download` |
| Make | Optional | Convenience wrapper for Docker, seed, logs, backup, restore, and status commands. | `Makefile` | `https://www.gnu.org/software/make/` |

Confirmed local ports:

| Component | Port | Evidence |
|---|---:|---|
| Gateway | `3000` | `docker-compose.yml:304-305` |
| Auth Service | `3001` | `docker-compose.yml:62-63` |
| Listing Service | `3002` | `docker-compose.yml:98-99` |
| Review Service | `3003` | `docker-compose.yml:132-133` |
| Booking Service | `3004` | `docker-compose.yml:164-165` |
| Media Service | `3005` | `docker-compose.yml:199-200` |
| Search Service | `3006` | `docker-compose.yml:228-229` |
| Admin Service | `3007` | `docker-compose.yml:263-264` |
| BFF | `8080` | `docker-compose.yml:358-359` |
| MongoDB | `27017` | `docker-compose.yml:8-9` |
| Redis | `6379` | `docker-compose.yml:23-24` |
| RabbitMQ AMQP | `5672` | `docker-compose.yml:38-39` |
| RabbitMQ Management UI | `15672` | `docker-compose.yml:39-40` |

✅ CHECKPOINT: 12.1 — Prerequisites complete. Proceeding to 12.2 — Local Setup Without Docker.

### 12.2 — Local Setup Without Docker

This path uses the service `npm start` scripts directly. It requires MongoDB, Redis, and RabbitMQ to be available locally on the ports used by the source defaults and seed scripts.

1. Create the local environment file:

```bash
cp .env.example .env
```

2. Install dependencies for every package that has a `package.json`:

```bash
cd shared && npm install
cd ../gateway && npm install
cd ../bff && npm install
cd ../scripts && npm install
cd ../services/auth-service && npm install
cd ../listing-service && npm install
cd ../review-service && npm install
cd ../booking-service && npm install
cd ../media-service && npm install
cd ../search-service && npm install
cd ../admin-service && npm install
cd ../../
```

3. Start local infrastructure outside this repository:

| Service | Expected Local URL / Port | Evidence |
|---|---|---|
| MongoDB | `mongodb://localhost:27017` / `27017` | Service defaults such as `services/auth-service/src/index.js:37`; seed defaults in `scripts/seed-microservices.js:21-24` |
| Redis | `redis://localhost:6379` if configured | Docker path uses `6379`; Auth/Search connect only when `REDIS_URL` is present |
| RabbitMQ | `amqp://heavenly:heavenly123@localhost:5672` for seed defaults | `scripts/seed-microservices.js:235-238` |

4. Start services in separate terminals:

```bash
cd services/auth-service && npm start
```

```bash
cd services/listing-service && npm start
```

```bash
cd services/review-service && npm start
```

```bash
cd services/booking-service && npm start
```

```bash
cd services/media-service && npm start
```

```bash
cd services/search-service && npm start
```

```bash
cd services/admin-service && npm start
```

```bash
cd gateway && npm start
```

```bash
cd bff && npm start
```

5. Seed data after services and local infrastructure are running:

```bash
make seed
```

Equivalent direct command:

```bash
cd scripts && node seed-microservices.js
```

6. Optional migration commands, only if migrating existing monolith data:

```bash
cd scripts && npm run migrate:dry
```

```bash
cd scripts && npm run migrate
```

The migration script expects MongoDB to be running and is described as idempotent in `scripts/migrate.js:20-22`.

7. Optional booking platform-fee migration:

```bash
node services/booking-service/scripts/migrate-platform-fee.js
```

This script uses `MONGODB_URI` or defaults to `mongodb://localhost:27017/heavenly_bookings` in `services/booking-service/scripts/migrate-platform-fee.js:17`.

8. Verify the running stack with the smoke script:

```bash
cd scripts && npm run smoke-test
```

The smoke script defaults to Gateway `http://localhost:3000` and BFF `http://localhost:8080` in `scripts/smoke-test.js:18-20`.

✅ CHECKPOINT: 12.2 — Local Setup Without Docker complete. Proceeding to 12.3 — Local Setup With Docker.

### 12.3 — Local Setup With Docker

Docker and Docker Compose are present, so this is the primary setup path for the repository.

1. Create the local environment file:

```bash
cp .env.example .env
```

2. Start the full stack:

```bash
docker-compose up --build
```

Equivalent Makefile command:

```bash
make up-build
```

3. Detached mode:

```bash
docker-compose up -d
```

Equivalent Makefile command:

```bash
make up-d
```

4. Check container status:

```bash
docker-compose ps
```

Equivalent Makefile command:

```bash
make status
```

5. Seed initial data:

```bash
make seed
```

This runs `cd scripts && node seed-microservices.js` from `Makefile`.

6. Run migration dry-run and migration from the scripts package if migrating existing monolith data:

```bash
cd scripts && npm run migrate:dry
```

```bash
cd scripts && npm run migrate
```

7. Run the smoke check:

```bash
cd scripts && npm run smoke-test
```

8. Useful Docker commands from the Makefile:

| Command | What It Does | Evidence |
|---|---|---|
| `make up` | Starts all services with persisted data. | `Makefile` `up` target |
| `make up-build` | Rebuilds and starts all services. | `Makefile` `up-build` target |
| `make up-d` | Starts all services detached. | `Makefile` `up-d` target |
| `make logs` | Follows logs for all services. | `Makefile` `logs` target |
| `make logs-bff` | Follows BFF logs. | `Makefile` `logs-bff` target |
| `make logs-booking` | Follows Booking Service logs. | `Makefile` `logs-booking` target |
| `make ps` | Shows running containers. | `Makefile` `ps` target |
| `make mongo` | Opens `mongosh` in `heavenly-mongodb`. | `Makefile` `mongo` target |
| `make redis` | Opens `redis-cli` in `heavenly-redis`. | `Makefile` `redis` target |

✅ CHECKPOINT: 12.3 — Local Setup With Docker complete. Proceeding to 12.4 — Running Tests.

### 12.4 — Running Tests

> ⬜ NOT PRESENT — Running Tests
> Evidence: No `*.spec.*`, `*.test.*`, `tests/`, or framework test config found in repository.
> This section is skipped. If this feature is added later, document it here.

✅ CHECKPOINT: 12.4 — Running Tests complete. Proceeding to 12.5 — Common First-Run Problems.

### 12.5 — Common First-Run Problems

| Problem | Why It Happens In This Repo | Fix | Verify |
|---|---|---|---|
| `JWT_SECRET` or auth requests fail | Auth and Gateway JWT code reads `JWT_SECRET`; Compose passes it from `.env`. | `cp .env.example .env`, then set `JWT_SECRET` and `JWT_REFRESH_SECRET` in `.env`. | `curl http://localhost:3000/health` and then run `cd scripts && npm run smoke-test`. |
| MongoDB healthcheck fails | Compose waits for `mongodb` healthcheck before dependent services start. | `docker-compose logs mongodb` then restart with `docker-compose restart mongodb`. | `docker-compose ps` shows `heavenly-mongodb` healthy. |
| RabbitMQ-dependent seed fails | Seed script connects to RabbitMQ at `amqp://heavenly:heavenly123@localhost:5672` unless `RABBITMQ_URL` is set. | With Docker running, execute `make seed` from repo root so `.env` and local port `5672` are available. | `docker-compose ps rabbitmq` and `make seed`. |
| BFF is unavailable at `8080` | BFF depends on healthy Gateway in Compose and maps `8080:8080`. | Check `docker-compose logs gateway` and `docker-compose logs bff`; restart with `docker-compose restart gateway bff`. | Open `http://localhost:8080/health`. |
| Smoke test fails on a service health URL | `scripts/smoke-test.js` checks Gateway, services `3001-3007`, and BFF `8080`. | Run `docker-compose ps` and inspect the failing service logs. | `cd scripts && npm run smoke-test`. |
| Port already in use | Compose maps fixed ports `3000-3007`, `8080`, `27017`, `6379`, `5672`, and `15672`. | Stop the process using the conflicting port or change the Compose mapping. | `docker-compose up -d` completes and `docker-compose ps` shows ports bound. |
| Platform-fee migration connects to wrong DB | The script defaults to `mongodb://localhost:27017/heavenly_bookings` unless `MONGODB_URI` is set. | Set `MONGODB_URI` before running the script if your booking DB URL differs. | Script logs `Connected successfully.` and migration summary. |

✅ CHECKPOINT: 12.5 — Common First-Run Problems complete. Proceeding to stop as instructed.
