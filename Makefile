.PHONY: help up down restart rebuild logs backup restore seed clean

help: ## Show this help message
	@echo "🏠 Heavenly Microservices - Development Commands"
	@echo ""
	@echo "Usage: make [command]"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

up: ## Start all services (data persists)
	docker-compose up

up-build: ## Rebuild and start (data persists)
	docker-compose up --build

up-d: ## Start in background (detached mode)
	docker-compose up -d

down: ## Stop all services (keeps data)
	docker-compose down

restart: ## Restart all services
	docker-compose restart

restart-bff: ## Restart BFF only
	docker-compose restart bff

restart-booking: ## Restart booking service only
	docker-compose restart booking-service

restart-listing: ## Restart listing service only
	docker-compose restart listing-service

restart-auth: ## Restart auth service only
	docker-compose restart auth-service

logs: ## View logs from all services
	docker-compose logs -f

logs-bff: ## View BFF logs
	docker-compose logs -f bff

logs-booking: ## View booking service logs
	docker-compose logs -f booking-service

backup: ## Backup MongoDB data
	@chmod +x scripts/backup-data.sh
	@./scripts/backup-data.sh

restore: ## Restore MongoDB data (usage: make restore BACKUP=./backups/20260511_143000)
	@chmod +x scripts/restore-data.sh
	@if [ -z "$(BACKUP)" ]; then \
		echo "❌ Error: Please specify BACKUP directory"; \
		echo "Usage: make restore BACKUP=./backups/YYYYMMDD_HHMMSS"; \
		echo ""; \
		echo "Available backups:"; \
		ls -1 ./backups/ 2>/dev/null || echo "  No backups found"; \
		exit 1; \
	fi
	@./scripts/restore-data.sh $(BACKUP)

seed: ## Seed initial data
	@echo "🌱 Seeding microservices data..."
	@cd scripts && node seed-microservices.js

clean: ## ⚠️  DANGER: Remove all containers and volumes (deletes data!)
	@echo "⚠️  WARNING: This will delete all your data!"
	@echo "Press Ctrl+C to cancel, or Enter to continue..."
	@read confirm
	docker-compose down -v

rebuild: ## Rebuild specific service (usage: make rebuild SERVICE=bff)
	@if [ -z "$(SERVICE)" ]; then \
		echo "❌ Error: Please specify SERVICE"; \
		echo "Usage: make rebuild SERVICE=bff"; \
		exit 1; \
	fi
	docker-compose up --build $(SERVICE)

ps: ## Show running containers
	docker-compose ps

volumes: ## List Docker volumes
	@docker volume ls | grep heavenly || echo "No Heavenly volumes found"

mongo: ## Connect to MongoDB shell
	docker exec -it heavenly-mongodb mongosh

redis: ## Connect to Redis CLI
	docker exec -it heavenly-redis redis-cli

status: ## Show service status and volumes
	@echo "📊 Service Status:"
	@docker-compose ps
	@echo ""
	@echo "💾 Data Volumes:"
	@docker volume ls | grep heavenly || echo "No volumes found"
